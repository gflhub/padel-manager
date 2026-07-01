'use server';

import { prisma } from '@/lib/db/prisma';
import { PaymentMethod } from '@/lib/generated/prisma/enums';

/**
 * Comanda Repository
 *
 * Handles all data access and business logic for orders and tabs (comandas).
 * Manages comanda creation, item management, status transitions, and payments.
 */

export interface Comanda {
  id: string;
  customer_name: string;
  customerProfileId: string | null;
  status: 'open' | 'closed' | 'cancelled';
  items_count: number;
  total_amount: number;
  opened_at: string;
}

export interface ComandaItem {
  id: string;
  item_type: string;
  product_details: { product_id?: string; product_name: string } | null;
  unit_price: number;
  quantity: number;
  subtotal: number;
  total_price: number;
}

export interface ComandaWithItems extends Comanda {
  items: ComandaItem[];
}

/**
 * Get all active comandas for a club.
 * @param clubId - Club ID
 * @param status - Optional status filter
 * @returns Comandas list or error
 */
export async function getComandasByClub(
  clubId: string,
  status?: string
): Promise<{ data: Comanda[] | null; error: string | null }> {
  try {
    const comandas = await prisma.comanda.findMany({
      where: {
        clubId,
        ...(status && { status: status as any }),
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const normalized: Comanda[] = comandas.map((c) => ({
      id: c.id,
      customer_name: c.customerName ?? '',
      customerProfileId: c.customerProfileId,
      status: c.status.toLowerCase() as Comanda['status'],
      items_count: c.items.length,
      total_amount: Number(c.total),
      opened_at: c.createdAt.toISOString(),
    }));

    return { data: normalized, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar comandas';
    return { data: null, error: message };
  }
}

/**
 * Get a comanda by ID with all its items.
 * @param comandaId - Comanda ID
 * @param clubId - Club ID (for authorization)
 * @returns Comanda with items or error
 */
export async function getComandaWithItems(
  comandaId: string,
  clubId: string
): Promise<{ data: ComandaWithItems | null; error: string | null }> {
  try {
    const comanda = await prisma.comanda.findUnique({
      where: { id: comandaId },
      include: {
        items: {
          include: { product: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!comanda || comanda.clubId !== clubId) {
      return { data: null, error: 'Comanda não encontrada' };
    }

    const result: ComandaWithItems = {
      id: comanda.id,
      customer_name: comanda.customerName ?? '',
      customerProfileId: comanda.customerProfileId,
      status: comanda.status.toLowerCase() as Comanda['status'],
      items_count: comanda.items.length,
      total_amount: Number(comanda.total),
      opened_at: comanda.createdAt.toISOString(),
      items: comanda.items.map((item) => ({
        id: item.id,
        item_type: 'product',
        product_details: {
          product_id: item.productId ?? undefined,
          product_name: item.product?.name ?? item.name ?? '',
        },
        unit_price: Number(item.unitPrice),
        quantity: item.quantity,
        subtotal: Number(item.subtotal),
        total_price: Number(item.subtotal),
      })),
    };

    return { data: result, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar comanda com itens';
    return { data: null, error: message };
  }
}

/**
 * Create a new comanda.
 * @param clubId - Club ID
 * @param customerName - Customer name
 * @param userId - User ID (opened_by)
 * @param notes - Optional notes
 * @returns Created comanda or error
 */
export async function createComanda(
  clubId: string,
  customerName: string,
  userId: string,
  notes?: string,
  customerProfileId?: string | null
): Promise<{ data: Comanda | null; error: string | null }> {
  try {
    if (!customerName?.trim()) {
      return { data: null, error: 'Nome do cliente é obrigatório' };
    }

    const lastComanda = await prisma.comanda.findFirst({
      where: { clubId },
      orderBy: { number: 'desc' },
      take: 1,
    });

    const nextNumber = (lastComanda?.number ?? 0) + 1;

    const comanda = await prisma.comanda.create({
      data: {
        clubId,
        number: nextNumber,
        customerName: customerName.trim(),
        customerProfileId: customerProfileId ?? null,
        total: 0,
      },
    });

    return {
      data: {
        id: comanda.id,
        customer_name: comanda.customerName ?? '',
        customerProfileId: comanda.customerProfileId,
        status: comanda.status.toLowerCase() as Comanda['status'],
        items_count: 0,
        total_amount: Number(comanda.total),
        opened_at: comanda.createdAt.toISOString(),
      },
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar comanda';
    return { data: null, error: message };
  }
}

export async function searchClubCustomers(
  clubId: string,
  query: string
): Promise<{ data: { id: string; name: string }[] | null; error: string | null }> {
  if (query.trim().length < 2) return { data: [], error: null };
  try {
    const profiles = await prisma.profile.findMany({
      where: {
        name: { contains: query, mode: 'insensitive' },
      },
      select: { id: true, name: true },
      take: 20,
      orderBy: { name: 'asc' },
    });
    return { data: profiles, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar clientes';
    return { data: null, error: message };
  }
}

export async function associateCustomerToComanda(
  comandaId: string,
  customerProfileId: string,
  clubId: string
): Promise<{ error: string | null }> {
  try {
    const comanda = await prisma.comanda.findFirst({ where: { id: comandaId, clubId } });
    if (!comanda) return { error: 'Comanda não encontrada' };
    if (comanda.customerProfileId !== null) return { error: 'Comanda já vinculada a um cliente' };
    await prisma.comanda.update({
      where: { id: comandaId },
      data: { customerProfileId },
    });
    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao vincular cliente';
    return { error: message };
  }
}

/**
 * Add an item to a comanda.
 * @param comandaId - Comanda ID
 * @param productId - Product ID (optional)
 * @param name - Item name
 * @param quantity - Quantity
 * @param unitPrice - Unit price
 * @returns Created item or error
 */
export async function addComandaItem(
  comandaId: string,
  name: string,
  quantity: number,
  unitPrice: number,
  productId?: string
): Promise<{ data: ComandaItem | null; error: string | null }> {
  try {
    const subtotal = unitPrice * quantity;

    const item = await prisma.comandaItem.create({
      data: {
        comandaId,
        productId: productId || undefined,
        name: productId ? undefined : name,
        quantity,
        unitPrice,
        subtotal,
      },
      include: { product: { select: { name: true } } },
    });

    // Recalculate comanda total
    const items = await prisma.comandaItem.findMany({
      where: { comandaId },
    });

    const newTotal = items.reduce((sum, i) => sum + Number(i.subtotal), 0);

    await prisma.comanda.update({
      where: { id: comandaId },
      data: { total: newTotal },
    });

    return {
      data: {
        id: item.id,
        item_type: 'product',
        product_details: {
          product_id: item.productId ?? undefined,
          product_name: item.product?.name ?? item.name ?? '',
        },
        unit_price: Number(item.unitPrice),
        quantity: item.quantity,
        subtotal: Number(item.subtotal),
        total_price: Number(item.subtotal),
      },
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao adicionar item à comanda';
    return { data: null, error: message };
  }
}

/**
 * Update quantity of a comanda item.
 * @param itemId - Item ID
 * @param newQuantity - New quantity
 * @returns Error or null
 */
export async function updateComandaItemQuantity(itemId: string, newQuantity: number): Promise<{ error: string | null }> {
  try {
    const item = await prisma.comandaItem.findUnique({
      where: { id: itemId },
    });

    if (!item) return { error: 'Item não encontrado' };

    const newSubtotal = Number(item.unitPrice) * newQuantity;

    await prisma.comandaItem.update({
      where: { id: itemId },
      data: {
        quantity: newQuantity,
        subtotal: newSubtotal,
        updatedAt: new Date(),
      },
    });

    // Recalculate comanda total
    const items = await prisma.comandaItem.findMany({
      where: { comandaId: item.comandaId },
    });

    const newTotal = items.reduce((sum, i) => sum + Number(i.subtotal), 0);

    await prisma.comanda.update({
      where: { id: item.comandaId },
      data: { total: newTotal },
    });

    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar quantidade do item';
    return { error: message };
  }
}

/**
 * Close/finalize a comanda.
 * @param comandaId - Comanda ID
 * @param clubId - Club ID (for authorization)
 * @param userId - User ID (closed_by)
 * @param paymentMethod - Payment method (omit to mark as receivable)
 * @returns Error or null
 */
export async function closeComanda(
  comandaId: string,
  clubId: string,
  userId: string,
  paymentMethod?: string
): Promise<{ error: string | null }> {
  try {
    const comanda = await prisma.comanda.findUnique({
      where: { id: comandaId },
    });

    if (!comanda || comanda.clubId !== clubId) {
      return { error: 'Comanda não encontrada' };
    }

    if (comanda.status !== 'OPEN') {
      return { error: 'Comanda já está fechada' };
    }

    if (!paymentMethod) {
      // RECEIVABLE path: requires linked customer
      if (!comanda.customerProfileId) {
        return { error: 'Comanda avulsa não pode ficar como receber — selecione um cliente ou informe o pagamento' };
      }
      await prisma.comanda.update({
        where: { id: comandaId },
        data: { status: 'CLOSED', paymentStatus: 'RECEIVABLE', updatedAt: new Date() },
      });
    } else {
      // PAID path: create Payment + close
      await prisma.$transaction([
        prisma.payment.create({
          data: {
            comandaId,
            method: paymentMethod.trim().toUpperCase() as PaymentMethod,
            amount: comanda.total,
            paidAt: new Date(),
          },
        }),
        prisma.comanda.update({
          where: { id: comandaId },
          data: { status: 'CLOSED', paymentStatus: 'PAID', updatedAt: new Date() },
        }),
      ]);
    }

    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao fechar comanda';
    return { error: message };
  }
}

/**
 * Close multiple comandas in a single atomic transaction.
 * Each item can be paid (paymentMethod present) or receivable (paymentMethod absent).
 * @param clubId - Club ID
 * @param userId - User ID
 * @param items - Array of { comandaId, paymentMethod? }
 * @returns Error or null
 */
export async function closeDayComandas(
  clubId: string,
  _userId: string,
  items: { comandaId: string; paymentMethod?: string }[]
): Promise<{ error: string | null }> {
  try {
    const comandas = await prisma.comanda.findMany({
      where: { id: { in: items.map((i) => i.comandaId) } },
    });

    for (const item of items) {
      const comanda = comandas.find((c) => c.id === item.comandaId);
      if (!comanda || comanda.clubId !== clubId) {
        return { error: 'Comanda não encontrada' };
      }
      if (comanda.status !== 'OPEN') {
        return { error: 'Comanda já está fechada' };
      }
      if (!item.paymentMethod && !comanda.customerProfileId) {
        return { error: 'Comanda avulsa não pode ficar como receber — selecione um cliente ou informe o pagamento' };
      }
    }

    const ops = items.flatMap((item) => {
      const comanda = comandas.find((c) => c.id === item.comandaId)!;
      if (item.paymentMethod) {
        return [
          prisma.payment.create({
            data: {
              comandaId: item.comandaId,
              method: item.paymentMethod.trim().toUpperCase() as PaymentMethod,
              amount: comanda.total,
              paidAt: new Date(),
            },
          }),
          prisma.comanda.update({
            where: { id: item.comandaId },
            data: { status: 'CLOSED', paymentStatus: 'PAID', updatedAt: new Date() },
          }),
        ];
      }
      return [
        prisma.comanda.update({
          where: { id: item.comandaId },
          data: { status: 'CLOSED', paymentStatus: 'RECEIVABLE', updatedAt: new Date() },
        }),
      ];
    });

    await prisma.$transaction(ops);
    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao fechar comandas';
    return { error: message };
  }
}

/**
 * Cancel a comanda.
 * @param comandaId - Comanda ID
 * @param clubId - Club ID (for authorization)
 * @param userId - User ID (closed_by)
 * @returns Error or null
 */
export async function cancelComanda(comandaId: string, clubId: string, userId: string): Promise<{ error: string | null }> {
  try {
    const comanda = await prisma.comanda.findUnique({
      where: { id: comandaId },
    });

    if (!comanda || comanda.clubId !== clubId) {
      return { error: 'Comanda não encontrada' };
    }

    await prisma.comanda.update({
      where: { id: comandaId },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
      },
    });

    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao cancelar comanda';
    return { error: message };
  }
}
