'use server';

import { prisma } from '@/lib/db/prisma';

/**
 * Comanda Repository
 *
 * Handles all data access and business logic for orders and tabs (comandas).
 * Manages comanda creation, item management, status transitions, and payments.
 */

export interface Comanda {
  id: string;
  customer_name: string;
  club_id: string;
  status: 'open' | 'closed' | 'cancelled';
  total: number;
  notes?: string;
  opened_by: string;
  opened_at: string;
  closed_by?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ComandaItem {
  id: string;
  comanda_id: string;
  product_id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface ComandaWithItems extends Comanda {
  items: ComandaItem[];
  items_count: number;
  total_amount: number;
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

    const normalized = comandas.map((c) => ({
      ...c,
      items_count: c.items.length,
      total_amount: Number(c.total),
    }));

    return { data: normalized as Comanda[], error: null };
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
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!comanda || comanda.clubId !== clubId) {
      return { data: null, error: 'Comanda não encontrada' };
    }

    const result: ComandaWithItems = {
      ...comanda,
      total_amount: Number(comanda.total),
      items: comanda.items as any,
      items_count: comanda.items.length,
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
  notes?: string
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
        total: 0,
      },
    });

    return { data: comanda as Comanda, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar comanda';
    return { data: null, error: message };
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
        quantity,
        unitPrice,
        subtotal,
      },
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

    return { data: item as ComandaItem, error: null };
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
 * Close/finalize a comanda with payment.
 * @param comandaId - Comanda ID
 * @param clubId - Club ID (for authorization)
 * @param paymentMethod - Payment method
 * @param userId - User ID (closed_by)
 * @returns Error or null
 */
export async function closeComanda(
  comandaId: string,
  clubId: string,
  paymentMethod: string,
  userId: string
): Promise<{ error: string | null }> {
  try {
    if (!paymentMethod?.trim()) {
      return { error: 'Método de pagamento é obrigatório' };
    }

    const comanda = await prisma.comanda.findUnique({
      where: { id: comandaId },
    });

    if (!comanda || comanda.clubId !== clubId) {
      return { error: 'Comanda não encontrada' };
    }

    // Create payment record and close comanda in transaction
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          comandaId: comandaId,
          method: paymentMethod.trim() as any,
          amount: comanda.total,
          paidAt: new Date(),
        },
      }),
      prisma.comanda.update({
        where: { id: comandaId },
        data: {
          status: 'CLOSED',
          updatedAt: new Date(),
        },
      }),
    ]);

    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao fechar comanda';
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
