'use server';

import { Prisma } from '@/lib/generated/prisma/client';
import { PaymentMethod } from '@/lib/generated/prisma/enums';
import { prisma } from '@/lib/db/prisma';

/**
 * Payment Repository
 *
 * Handles all data access and business logic for payment processing.
 * Manages payment creation, status tracking, refunds, and reconciliation.
 */

export interface Payment {
  id: string;
  club_id: string;
  comanda_id?: string;
  reservation_id?: string;
  amount: number;
  method: string;
  created_at: string;
}

export interface CaixaReport {
  date: string;
  totalAmount: number;
  totalTransactions: number;
  byMethod: Array<{
    method: string;
    total: number;
    count: number;
  }>;
}

/**
 * Record a payment.
 * @param clubId - Club ID
 * @param amount - Payment amount
 * @param method - Payment method
 * @param userId - User ID (created_by)
 * @param comandaId - Comanda ID (optional)
 * @param reservationId - Reservation ID (optional)
 * @returns Created payment or error
 */
export async function recordPayment(
  clubId: string,
  amount: number,
  method: string,
  userId: string,
  comandaId?: string,
  reservationId?: string
): Promise<{ data: Payment | null; error: string | null }> {
  try {
    if (amount <= 0) {
      return { data: null, error: 'Valor do pagamento deve ser maior que zero' };
    }

    if (!method?.trim()) {
      return { data: null, error: 'Método de pagamento é obrigatório' };
    }

    if (!comandaId?.trim()) {
      return { data: null, error: 'ID da comanda é obrigatório' };
    }

    const payment = await prisma.payment.create({
      data: {
        comandaId,
        amount: new Prisma.Decimal(amount),
        method: method.trim().toUpperCase() as PaymentMethod,
        paidAt: new Date(),
      },
    });

    return {
      data: {
        id: payment.id,
        club_id: clubId,
        comanda_id: payment.comandaId,
        reservation_id: reservationId,
        amount: Number(payment.amount),
        method: payment.method,
        created_at: payment.createdAt.toISOString(),
      },
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao registrar pagamento';
    return { data: null, error: message };
  }
}

/**
 * Get payments by comanda.
 * @param comandaId - Comanda ID
 * @returns Payments list or error
 */
export async function getPaymentsByComanda(comandaId: string): Promise<{ data: Payment[] | null; error: string | null }> {
  try {
    const payments = await prisma.payment.findMany({
      where: { comandaId },
      include: { comanda: true },
      orderBy: { paidAt: 'desc' },
    });

    return {
      data: payments.map((p) => ({
        id: p.id,
        club_id: p.comanda.clubId,
        comanda_id: p.comandaId,
        amount: Number(p.amount),
        method: p.method,
        created_at: p.createdAt.toISOString(),
      })),
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar pagamentos da comanda';
    return { data: null, error: message };
  }
}

/**
 * Get payments by club for a specific date.
 * @param clubId - Club ID
 * @param date - Date in YYYY-MM-DD format
 * @returns Caixa report or error
 */
export async function getCaixaReport(
  clubId: string,
  date: string
): Promise<{ data: CaixaReport | null; error: string | null }> {
  try {
    const startDate = new Date(`${date}T00:00:00`);
    const endDate = new Date(`${date}T23:59:59`);

    const payments = await prisma.payment.findMany({
      where: {
        comanda: {
          clubId,
        },
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { paidAt: 'asc' },
    });

    // Aggregate by method
    const byMethod = payments.reduce(
      (acc: Record<string, { total: number; count: number; method: string }>, payment) => {
        const method = payment.method;
        if (!acc[method]) {
          acc[method] = { method, total: 0, count: 0 };
        }
        acc[method].total += Number(payment.amount);
        acc[method].count += 1;
        return acc;
      },
      {}
    );

    const report: CaixaReport = {
      date,
      totalAmount: payments.reduce((sum, p) => sum + Number(p.amount), 0),
      totalTransactions: payments.length,
      byMethod: Object.values(byMethod),
    };

    return { data: report, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao gerar relatório de caixa';
    return { data: null, error: message };
  }
}

/**
 * Get total revenue from paid comandas for a club within a date range.
 * @param clubId - Club ID
 * @param startDate - Range start (inclusive)
 * @param endDate - Range end (exclusive)
 * @returns Sum of payment amounts
 */
export async function getComandaRevenueByClub(
  clubId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const result = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: {
      createdAt: { gte: startDate, lt: endDate },
      comanda: { clubId },
    },
  })

  return result._sum.amount ? Number(result._sum.amount) : 0
}

/**
 * Get payments by club.
 * @param clubId - Club ID
 * @returns Payments list or error
 */
export async function getPaymentsByClub(clubId: string): Promise<{ data: Payment[] | null; error: string | null }> {
  try {
    const payments = await prisma.payment.findMany({
      where: { comanda: { clubId } },
      orderBy: { paidAt: 'desc' },
    });

    return {
      data: payments.map((p) => ({
        id: p.id,
        club_id: clubId,
        comanda_id: p.comandaId,
        amount: Number(p.amount),
        method: p.method,
        created_at: p.createdAt.toISOString(),
      })),
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar pagamentos';
    return { data: null, error: message };
  }
}
