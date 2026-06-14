'use server';

import { prisma } from '@/lib/db/prisma';
import { SubscriptionStatus } from '@/lib/generated/prisma/enums';

/**
 * Subscription (Monthly Member) Repository
 *
 * Handles all data access for monthly-member subscriptions: registration,
 * listing (active/overdue), and payment confirmation.
 */

export interface Subscription {
  id: string;
  user_id: string;
  club_id: string;
  plan_name: string;
  price: number;
  due_day: number;
  status: 'ACTIVE' | 'OVERDUE' | 'CANCELLED';
  next_due_date: string;
  member_name: string;
  member_email: string;
  created_at: string;
  updated_at: string;
}

type PrismaSubscription = {
  id: string;
  userId: string;
  clubId: string;
  planName: string;
  price: { toNumber: () => number } | number;
  dueDay: number;
  status: SubscriptionStatus;
  nextDueDate: Date;
  createdAt: Date;
  updatedAt: Date;
  user: { profile: { name: string; email: string } | null };
};

function mapSubscription(subscription: PrismaSubscription): Subscription {
  const price = typeof subscription.price === 'number' ? subscription.price : Number(subscription.price);

  return {
    id: subscription.id,
    user_id: subscription.userId,
    club_id: subscription.clubId,
    plan_name: subscription.planName,
    price,
    due_day: subscription.dueDay,
    status: subscription.status,
    next_due_date: subscription.nextDueDate.toISOString().split('T')[0],
    member_name: subscription.user.profile?.name ?? '',
    member_email: subscription.user.profile?.email ?? '',
    created_at: subscription.createdAt.toISOString(),
    updated_at: subscription.updatedAt.toISOString(),
  };
}

const include = {
  user: { include: { profile: { select: { name: true, email: true } } } },
} as const;

/**
 * Create a new monthly-member subscription for a user at a club.
 * @param clubId - Club ID
 * @param userId - Member's user ID
 * @param planName - Plan name/label
 * @param price - Monthly price
 * @param dueDay - Day of month payment is due (1-28)
 * @param nextDueDate - Next due date
 * @returns Created subscription or error
 */
export async function createSubscription(
  clubId: string,
  userId: string,
  planName: string,
  price: number,
  dueDay: number,
  nextDueDate: string
): Promise<{ data: Subscription | null; error: string | null }> {
  try {
    const subscription = await prisma.subscription.create({
      data: {
        clubId,
        userId,
        planName,
        price,
        dueDay,
        nextDueDate: new Date(nextDueDate),
        status: 'ACTIVE',
      },
      include,
    });

    return { data: mapSubscription(subscription), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao cadastrar mensalista';
    return { data: null, error: message };
  }
}

/**
 * List all subscriptions for a club.
 * @param clubId - Club ID
 * @returns Subscriptions list or error
 */
export async function getSubscriptionsByClub(
  clubId: string
): Promise<{ data: Subscription[] | null; error: string | null }> {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { clubId },
      include,
      orderBy: { nextDueDate: 'asc' },
    });

    return { data: subscriptions.map(mapSubscription), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar mensalistas';
    return { data: null, error: message };
  }
}

/**
 * List active (non-cancelled, not overdue) subscriptions for a club.
 * @param clubId - Club ID
 * @returns Subscriptions list or error
 */
export async function getActiveSubscriptions(
  clubId: string
): Promise<{ data: Subscription[] | null; error: string | null }> {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { clubId, status: 'ACTIVE' },
      include,
      orderBy: { nextDueDate: 'asc' },
    });

    return { data: subscriptions.map(mapSubscription), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar mensalistas ativos';
    return { data: null, error: message };
  }
}

/**
 * List overdue subscriptions for a club (status OVERDUE, or ACTIVE past due date).
 * @param clubId - Club ID
 * @returns Subscriptions list or error
 */
export async function getOverdueSubscriptions(
  clubId: string
): Promise<{ data: Subscription[] | null; error: string | null }> {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: {
        clubId,
        OR: [
          { status: 'OVERDUE' },
          { status: 'ACTIVE', nextDueDate: { lt: new Date() } },
        ],
      },
      include,
      orderBy: { nextDueDate: 'asc' },
    });

    return { data: subscriptions.map(mapSubscription), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar mensalistas em atraso';
    return { data: null, error: message };
  }
}

/**
 * Update a subscription's plan details.
 * @param subscriptionId - Subscription ID
 * @param clubId - Club ID (for authorization)
 * @param updates - Fields to update
 * @returns Error or null
 */
export async function updateSubscription(
  subscriptionId: string,
  clubId: string,
  updates: { planName?: string; price?: number; dueDay?: number; status?: 'ACTIVE' | 'OVERDUE' | 'CANCELLED' }
): Promise<{ error: string | null }> {
  try {
    const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });

    if (!subscription || subscription.clubId !== clubId) {
      return { error: 'Mensalista não encontrado' };
    }

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        ...(updates.planName !== undefined && { planName: updates.planName }),
        ...(updates.price !== undefined && { price: updates.price }),
        ...(updates.dueDay !== undefined && { dueDay: updates.dueDay }),
        ...(updates.status !== undefined && { status: updates.status }),
      },
    });

    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar mensalista';
    return { error: message };
  }
}

/**
 * Mark a subscription payment as received: sets status to ACTIVE and
 * advances nextDueDate by one month (anchored to dueDay).
 * @param subscriptionId - Subscription ID
 * @param clubId - Club ID (for authorization)
 * @returns Error or null
 */
export async function markSubscriptionPaid(
  subscriptionId: string,
  clubId: string
): Promise<{ error: string | null }> {
  try {
    const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });

    if (!subscription || subscription.clubId !== clubId) {
      return { error: 'Mensalista não encontrado' };
    }

    const base = subscription.nextDueDate < new Date() ? new Date() : subscription.nextDueDate;
    const nextDueDate = new Date(base.getFullYear(), base.getMonth() + 1, subscription.dueDay);

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'ACTIVE',
        nextDueDate,
      },
    });

    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao registrar pagamento';
    return { error: message };
  }
}

/**
 * Cancel a subscription.
 * @param subscriptionId - Subscription ID
 * @param clubId - Club ID (for authorization)
 * @returns Error or null
 */
export async function cancelSubscription(
  subscriptionId: string,
  clubId: string
): Promise<{ error: string | null }> {
  try {
    const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });

    if (!subscription || subscription.clubId !== clubId) {
      return { error: 'Mensalista não encontrado' };
    }

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'CANCELLED' },
    });

    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao cancelar mensalista';
    return { error: message };
  }
}

/**
 * Flag overdue ACTIVE subscriptions whose nextDueDate has passed.
 * Intended to run via a scheduled job alongside due-date warning emails.
 * @returns Number of subscriptions flagged
 */
export async function flagOverdueSubscriptions(): Promise<number> {
  const result = await prisma.subscription.updateMany({
    where: { status: 'ACTIVE', nextDueDate: { lt: new Date() } },
    data: { status: 'OVERDUE' },
  });

  return result.count;
}
