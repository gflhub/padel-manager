'use server';

import { prisma } from '@/lib/db/prisma';
import { getClubTrialStatus, type ClubTrialStatus } from '@/lib/club-trial';

/**
 * Platform-admin Clubs Repository
 *
 * Lists all clubs with their computed trial/subscription status, for the
 * platform-admin "Clubs" overview page.
 */

export interface ClubOverview {
  id: string;
  name: string;
  active: boolean;
  trial_status: ClubTrialStatus;
  trial_days_remaining: number | null;
  trial_ends_at: string | null;
  staff_count: number;
  created_at: string;
}

/**
 * List all clubs with computed trial status, ordered by trial end date.
 * @returns Clubs overview list or error
 */
export async function getAllClubsOverview(): Promise<{ data: ClubOverview[] | null; error: string | null }> {
  try {
    const clubs = await prisma.club.findMany({
      include: { _count: { select: { staff: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const data = clubs.map((club) => {
      const trial = getClubTrialStatus(club);

      return {
        id: club.id,
        name: club.name,
        active: club.active,
        trial_status: trial.status,
        trial_days_remaining: trial.daysRemaining,
        trial_ends_at: club.trialEndsAt ? club.trialEndsAt.toISOString() : null,
        staff_count: club._count.staff,
        created_at: club.createdAt.toISOString(),
      };
    });

    return { data, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar clubes';
    return { data: null, error: message };
  }
}
