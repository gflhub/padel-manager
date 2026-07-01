import { prisma } from '@/lib/db/prisma';
import { PaymentMethod } from '@/lib/generated/prisma/enums';

export interface ReceivablesByCustomer {
  customerProfileId: string;
  customerName: string;
  comandaCount: number;
  totalAmount: number;
}

export interface CustomerReceivableItem {
  id: string;
  name: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface CustomerReceivable {
  id: string;
  customerName: string;
  total: number;
  createdAt: string;
  closedAt: string | null;
  items: CustomerReceivableItem[];
}

export interface SettlementResult {
  id: string;
  clubId: string;
  customerProfileId: string;
  totalAmount: number;
  method: PaymentMethod;
  comandasCount: number;
  settledAt: string;
  settledBy: string;
  invoiceIssued: boolean;
  createdAt: string;
}

/**
 * Returns all customers of a club with at least one RECEIVABLE comanda,
 * with the count of open comandas and total amount owed.
 */
export async function getReceivablesByCustomer(
  clubId: string
): Promise<{ data: ReceivablesByCustomer[] | null; error: string | null }> {
  try {
    const groups = await prisma.comanda.groupBy({
      by: ['customerProfileId'],
      where: { clubId, paymentStatus: 'RECEIVABLE', customerProfileId: { not: null } },
      _count: { id: true },
      _sum: { total: true },
    });

    if (groups.length === 0) return { data: [], error: null };

    const profileIds = groups.map((g) => g.customerProfileId as string);
    const profiles = await prisma.profile.findMany({
      where: { id: { in: profileIds } },
      select: { id: true, name: true },
    });
    const profileMap = new Map(profiles.map((p) => [p.id, p.name]));

    const data: ReceivablesByCustomer[] = groups.map((g) => ({
      customerProfileId: g.customerProfileId as string,
      customerName: profileMap.get(g.customerProfileId as string) ?? 'Cliente desconhecido',
      comandaCount: g._count.id,
      totalAmount: Number(g._sum.total ?? 0),
    }));

    return { data, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar recebíveis';
    return { data: null, error: message };
  }
}

/**
 * Returns all RECEIVABLE comandas for a specific customer within a club.
 */
export async function getCustomerReceivables(
  clubId: string,
  customerProfileId: string
): Promise<{ data: CustomerReceivable[] | null; error: string | null }> {
  try {
    const comandas = await prisma.comanda.findMany({
      where: { clubId, customerProfileId, paymentStatus: 'RECEIVABLE' },
      select: {
        id: true, customerName: true, total: true, createdAt: true, updatedAt: true, status: true,
        items: { select: { id: true, name: true, quantity: true, unitPrice: true, subtotal: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data: CustomerReceivable[] = comandas.map((c) => ({
      id: c.id,
      customerName: c.customerName ?? '',
      total: Number(c.total),
      createdAt: c.createdAt.toISOString(),
      // ponytail: no closedAt column — RECEIVABLE comandas are CLOSED, so updatedAt proxies it
      closedAt: c.status === 'CLOSED' ? c.updatedAt.toISOString() : null,
      items: c.items.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
      })),
    }));

    return { data, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar recebíveis do cliente';
    return { data: null, error: message };
  }
}

/**
 * Atomically settles all RECEIVABLE comandas for a customer:
 * creates one Settlement, one Payment per comanda, and flips paymentStatus → PAID.
 * Uses an optimistic WHERE filter to prevent double-payment.
 */
export async function settleCustomerReceivables(
  clubId: string,
  customerProfileId: string,
  method: PaymentMethod,
  staffProfileId: string
): Promise<{ data: SettlementResult | null; error: string | null }> {
  try {
    const settlement = await prisma.$transaction(async (tx) => {
      // Step 1: re-read inside tx to lock the set
      const comandas = await tx.comanda.findMany({
        where: { clubId, customerProfileId, paymentStatus: 'RECEIVABLE' },
        select: { id: true, total: true },
      });

      if (comandas.length === 0) {
        throw new Error('Nenhum recebível encontrado para este cliente');
      }

      // Step 2: compute total
      const totalAmount = comandas.reduce((sum, c) => sum + Number(c.total), 0);

      // ponytail: warn on large backlog — no batching needed for typical club usage
      if (comandas.length > 100) {
        console.warn(`[receivables] large settlement backlog: ${comandas.length} comandas for customer ${customerProfileId}`);
      }

      // Step 3: create Settlement
      const created = await tx.settlement.create({
        data: {
          clubId,
          customerProfileId,
          totalAmount,
          method,
          comandasCount: comandas.length,
          settledBy: staffProfileId,
          settledAt: new Date(),
        },
      });

      // Step 4: create one Payment per comanda
      // ponytail: no batching, add if settlement sets exceed ~500 rows
      await tx.payment.createMany({
        data: comandas.map((c) => ({
          comandaId: c.id,
          method,
          amount: c.total,
          paidAt: new Date(),
        })),
      });

      // Step 5: flip paymentStatus to PAID with optimistic WHERE
      const updated = await tx.comanda.updateMany({
        where: { id: { in: comandas.map((c) => c.id) }, paymentStatus: 'RECEIVABLE' },
        data: { paymentStatus: 'PAID', settlementId: created.id },
      });

      // Step 6: concurrent settlement guard
      if (updated.count !== comandas.length) {
        throw new Error('Comanda já foi quitada');
      }

      return created;
    });

    const result: SettlementResult = {
      id: settlement.id,
      clubId: settlement.clubId,
      customerProfileId: settlement.customerProfileId,
      totalAmount: Number(settlement.totalAmount),
      method: settlement.method,
      comandasCount: settlement.comandasCount,
      settledAt: settlement.settledAt.toISOString(),
      settledBy: settlement.settledBy,
      invoiceIssued: settlement.invoiceIssued,
      createdAt: settlement.createdAt.toISOString(),
    };

    return { data: result, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao quitar recebíveis';
    return { data: null, error: message };
  }
}
