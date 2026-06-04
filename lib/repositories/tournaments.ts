'use server';

import { Decimal } from '@prisma/client/runtime/library';
import { TournamentStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

/**
 * Tournament Repository
 *
 * Handles all data access and business logic for tournament management.
 * Manages tournament creation, participant registration, scheduling, and results.
 */

export interface Tournament {
  id: string;
  club_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: 'planning' | 'open' | 'in_progress' | 'completed' | 'cancelled';
  max_participants: number;
  entry_fee?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TournamentRegistration {
  id: string;
  tournament_id: string;
  profile_id: string;
  cancelled_at?: string;
  created_at: string;
}

export interface TournamentWithRegistrations extends Tournament {
  registrations: Array<{
    id: string;
    cancelled_at?: string;
  }>;
}

/**
 * Get all public tournaments.
 * @returns Tournaments list or error
 */
export async function getTournaments(): Promise<{ data: Tournament[] | null; error: string | null }> {
  try {
    const tournaments = await prisma.tournament.findMany({
      orderBy: { startDate: 'asc' },
    });

    return {
      data: tournaments.map((t) => ({
        id: t.id,
        club_id: t.clubId,
        name: t.name,
        description: t.description || undefined,
        start_date: t.startDate.toISOString(),
        end_date: t.endDate.toISOString(),
        status: t.status.toLowerCase() as Tournament['status'],
        max_participants: t.maxParticipants,
        entry_fee: t.entryFee ? Number(t.entryFee) : undefined,
        created_by: t.createdBy || '',
        created_at: t.createdAt.toISOString(),
        updated_at: t.updatedAt.toISOString(),
      })),
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar torneios';
    return { data: null, error: message };
  }
}

/**
 * Get tournaments for a club.
 * @param clubId - Club ID
 * @param status - Optional status filter
 * @returns Tournaments list or error
 */
export async function getTournamentsByClub(
  clubId: string,
  status?: string
): Promise<{ data: Tournament[] | null; error: string | null }> {
  try {
    const tournaments = await prisma.tournament.findMany({
      where: {
        clubId,
        ...(status && { status: status as TournamentStatus }),
      },
      orderBy: { startDate: 'asc' },
    });

    return {
      data: tournaments.map((t) => ({
        id: t.id,
        club_id: t.clubId,
        name: t.name,
        description: t.description || undefined,
        start_date: t.startDate.toISOString(),
        end_date: t.endDate.toISOString(),
        status: t.status.toLowerCase() as Tournament['status'],
        max_participants: t.maxParticipants,
        entry_fee: t.entryFee ? Number(t.entryFee) : undefined,
        created_by: t.createdBy || '',
        created_at: t.createdAt.toISOString(),
        updated_at: t.updatedAt.toISOString(),
      })),
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar torneios';
    return { data: null, error: message };
  }
}

/**
 * Get a tournament by ID with registrations.
 * @param tournamentId - Tournament ID
 * @param clubId - Club ID (for authorization, optional)
 * @returns Tournament with registrations or error
 */
export async function getTournamentWithRegistrations(
  tournamentId: string,
  clubId?: string
): Promise<{ data: TournamentWithRegistrations | null; error: string | null }> {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        registrations: {
          select: { id: true, cancelledAt: true },
        },
      },
    });

    if (!tournament || (clubId && tournament.clubId !== clubId)) {
      return { data: null, error: 'Torneio não encontrado' };
    }

    const result: TournamentWithRegistrations = {
      id: tournament.id,
      club_id: tournament.clubId,
      name: tournament.name,
      description: tournament.description || undefined,
      start_date: tournament.startDate.toISOString(),
      end_date: tournament.endDate.toISOString(),
      status: tournament.status.toLowerCase() as Tournament['status'],
      max_participants: tournament.maxParticipants,
      entry_fee: tournament.entryFee ? Number(tournament.entryFee) : undefined,
      created_by: tournament.createdBy || '',
      created_at: tournament.createdAt.toISOString(),
      updated_at: tournament.updatedAt.toISOString(),
      registrations: tournament.registrations.map((r) => ({
        id: r.id,
        cancelled_at: r.cancelledAt?.toISOString(),
      })),
    };

    return { data: result, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar torneio';
    return { data: null, error: message };
  }
}

/**
 * Create a new tournament.
 * @param clubId - Club ID
 * @param name - Tournament name
 * @param startDate - Start date
 * @param endDate - End date
 * @param maxParticipants - Maximum participants
 * @param userId - User ID (created_by)
 * @param description - Description (optional)
 * @param entryFee - Entry fee (optional)
 * @returns Created tournament or error
 */
export async function createTournament(
  clubId: string,
  name: string,
  startDate: string,
  endDate: string,
  maxParticipants: number,
  userId: string,
  description?: string,
  entryFee?: number
): Promise<{ data: Tournament | null; error: string | null }> {
  try {
    if (!name?.trim()) {
      return { data: null, error: 'Nome do torneio é obrigatório' };
    }

    if (maxParticipants < 1) {
      return { data: null, error: 'Número máximo de participantes deve ser pelo menos 1' };
    }

    const tournament = await prisma.tournament.create({
      data: {
        clubId,
        name: name.trim(),
        description: description || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        maxParticipants,
        entryFee: entryFee ? new Decimal(entryFee) : null,
        createdBy: userId,
        status: 'DRAFT',
      },
    });

    return {
      data: {
        id: tournament.id,
        club_id: tournament.clubId,
        name: tournament.name,
        description: tournament.description || undefined,
        start_date: tournament.startDate.toISOString(),
        end_date: tournament.endDate.toISOString(),
        status: tournament.status.toLowerCase() as Tournament['status'],
        max_participants: tournament.maxParticipants,
        entry_fee: tournament.entryFee ? Number(tournament.entryFee) : undefined,
        created_by: tournament.createdBy || '',
        created_at: tournament.createdAt.toISOString(),
        updated_at: tournament.updatedAt.toISOString(),
      },
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar torneio';
    return { data: null, error: message };
  }
}

/**
 * Update a tournament.
 * @param tournamentId - Tournament ID
 * @param clubId - Club ID (for authorization)
 * @param updates - Fields to update
 * @returns Updated tournament or error
 */
export async function updateTournament(
  tournamentId: string,
  clubId: string,
  updates: Partial<Omit<Tournament, 'id' | 'club_id' | 'created_by' | 'created_at'>>
): Promise<{ data: Tournament | null; error: string | null }> {
  try {
    const existing = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!existing || existing.clubId !== clubId) {
      return { data: null, error: 'Torneio não encontrado' };
    }

    type UpdateData = {
      name?: string;
      description?: string | null;
      startDate?: Date;
      endDate?: Date;
      maxParticipants?: number;
      status?: TournamentStatus;
      entryFee?: Decimal | null;
      updatedAt: Date;
    };
    const data: UpdateData = {
      updatedAt: new Date(),
    };
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.description !== undefined) data.description = updates.description || null;
    if (updates.start_date !== undefined) data.startDate = new Date(updates.start_date);
    if (updates.end_date !== undefined) data.endDate = new Date(updates.end_date);
    if (updates.max_participants !== undefined) data.maxParticipants = updates.max_participants;
    if (updates.status !== undefined) data.status = updates.status.toUpperCase() as TournamentStatus;
    if (updates.entry_fee !== undefined) {
      data.entryFee = updates.entry_fee ? new Decimal(updates.entry_fee) : null;
    }

    const tournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data,
    });

    return {
      data: {
        id: tournament.id,
        club_id: tournament.clubId,
        name: tournament.name,
        description: tournament.description || undefined,
        start_date: tournament.startDate.toISOString(),
        end_date: tournament.endDate.toISOString(),
        status: tournament.status.toLowerCase() as Tournament['status'],
        max_participants: tournament.maxParticipants,
        entry_fee: tournament.entryFee ? Number(tournament.entryFee) : undefined,
        created_by: tournament.createdBy || '',
        created_at: tournament.createdAt.toISOString(),
        updated_at: tournament.updatedAt.toISOString(),
      },
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar torneio';
    return { data: null, error: message };
  }
}

/**
 * Delete a tournament.
 * @param tournamentId - Tournament ID
 * @param clubId - Club ID (for authorization)
 * @returns Error or null
 */
export async function deleteTournament(tournamentId: string, clubId: string): Promise<{ error: string | null }> {
  try {
    const existing = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!existing || existing.clubId !== clubId) {
      return { error: 'Torneio não encontrado' };
    }

    await prisma.tournament.delete({
      where: { id: tournamentId },
    });

    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao deletar torneio';
    return { error: message };
  }
}

/**
 * Register a user for a tournament.
 * @param tournamentId - Tournament ID
 * @param userId - User ID (profile_id)
 * @returns Created registration or error
 */
export async function registerForTournament(
  tournamentId: string,
  userId: string
): Promise<{ data: TournamentRegistration | null; error: string | null }> {
  try {
    // Check tournament exists and has capacity
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        registrations: {
          where: { status: 'CONFIRMED' },
        },
      },
    });

    if (!tournament) {
      return { data: null, error: 'Torneio não encontrado' };
    }

    if (tournament.registrations.length >= tournament.maxParticipants) {
      return { data: null, error: 'Torneio cheio' };
    }

    // Check if already registered
    const existing = await prisma.tournamentRegistration.findFirst({
      where: {
        tournamentId,
        userId,
        status: { not: 'CANCELLED' },
      },
    });

    if (existing) {
      return { data: null, error: 'Você já está registrado neste torneio' };
    }

    // Register
    const registration = await prisma.tournamentRegistration.create({
      data: {
        tournamentId,
        userId,
        status: 'CONFIRMED',
      },
    });

    return {
      data: {
        id: registration.id,
        tournament_id: registration.tournamentId,
        profile_id: registration.userId,
        cancelled_at: registration.cancelledAt?.toISOString(),
        created_at: registration.registeredAt.toISOString(),
      },
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao registrar para torneio';
    return { data: null, error: message };
  }
}

/**
 * Cancel a tournament registration.
 * @param tournamentId - Tournament ID
 * @param userId - User ID (profile_id)
 * @returns Error or null
 */
export async function cancelTournamentRegistration(tournamentId: string, userId: string): Promise<{ error: string | null }> {
  try {
    await prisma.tournamentRegistration.updateMany({
      where: {
        tournamentId,
        userId,
      },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao cancelar registro no torneio';
    return { error: message };
  }
}

/**
 * Get user's tournament registrations.
 * @param userId - User ID (profile_id)
 * @returns Registrations list or error
 */
export async function getUserTournamentRegistrations(userId: string): Promise<{ data: TournamentRegistration[] | null; error: string | null }> {
  try {
    const registrations = await prisma.tournamentRegistration.findMany({
      where: {
        userId,
        status: { not: 'CANCELLED' },
      },
      orderBy: { registeredAt: 'desc' },
    });

    return {
      data: registrations.map((r) => ({
        id: r.id,
        tournament_id: r.tournamentId,
        profile_id: r.userId,
        cancelled_at: r.cancelledAt?.toISOString(),
        created_at: r.registeredAt.toISOString(),
      })),
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar registros de torneios';
    return { data: null, error: message };
  }
}
