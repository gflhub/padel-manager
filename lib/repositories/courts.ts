'use server';

import { prisma } from '@/lib/db/prisma';
import { CourtStatus } from '@/lib/generated/prisma/enums';

/**
 * Court Repository
 *
 * Handles all data access and business logic for court management.
 * Manages court creation, updates, availability, pricing, and queries.
 */

export interface Court {
  id: string;
  club_id: string;
  name: string;
  court_type: 'padel' | 'tennis' | 'beach_tennis' | 'volleyball' | 'futsal' | 'squash' | 'other';
  price_per_slot: number;
  duration_slot: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

type PrismaCourt = {
  id: string;
  clubId: string;
  name: string;
  type: string;
  pricePerSlot: { toNumber: () => number } | number;
  durationSlot: number;
  status: CourtStatus;
  createdAt: Date;
  updatedAt: Date;
};

function mapCourt(court: PrismaCourt): Court {
  return {
    id: court.id,
    club_id: court.clubId,
    name: court.name,
    court_type: court.type as Court['court_type'],
    price_per_slot: typeof court.pricePerSlot === 'number' ? court.pricePerSlot : Number(court.pricePerSlot),
    duration_slot: court.durationSlot,
    active: court.status === 'ACTIVE',
    created_at: court.createdAt.toISOString(),
    updated_at: court.updatedAt.toISOString(),
  };
}

/**
 * Get all active courts (public access).
 * @returns Courts list or error
 */
export async function getActiveCourts(): Promise<{ data: Court[] | null; error: string | null }> {
  try {
    const courts = await prisma.court.findMany({
      where: { status: 'ACTIVE' as CourtStatus },
      orderBy: { name: 'asc' },
    });

    return { data: courts.map(mapCourt), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar quadras';
    return { data: null, error: message };
  }
}

/**
 * Get all courts for a club.
 * @param clubId - Club ID
 * @returns Courts list or error
 */
export async function getCourtsByClub(clubId: string): Promise<{ data: Court[] | null; error: string | null }> {
  try {
    const courts = await prisma.court.findMany({
      where: { clubId },
      orderBy: { name: 'asc' },
    });

    return { data: courts.map(mapCourt), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar quadras';
    return { data: null, error: message };
  }
}

/**
 * Get a court by ID.
 * @param courtId - Court ID
 * @param clubId - Club ID (for authorization)
 * @returns Court or error
 */
export async function getCourtById(courtId: string, clubId: string): Promise<{ data: Court | null; error: string | null }> {
  try {
    const court = await prisma.court.findUnique({
      where: { id: courtId },
    });

    if (!court || court.clubId !== clubId) {
      return { data: null, error: 'Quadra não encontrada' };
    }

    return { data: mapCourt(court), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar quadra';
    return { data: null, error: message };
  }
}

/**
 * Get a court by id without club scoping. Used by the client booking flow,
 * which (like `getActiveCourts`) lists/books courts catalog-wide rather than
 * scoped to a club membership.
 */
export async function getCourtByIdUnscoped(courtId: string): Promise<{ data: Court | null; error: string | null }> {
  try {
    const court = await prisma.court.findUnique({
      where: { id: courtId },
    });

    if (!court) {
      return { data: null, error: 'Quadra não encontrada' };
    }

    return { data: mapCourt(court), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar quadra';
    return { data: null, error: message };
  }
}

/**
 * Create a new court.
 * @param clubId - Club ID
 * @param name - Court name
 * @param courtType - Court type
 * @param pricePerSlot - Price per slot
 * @param durationSlot - Duration per slot in minutes
 * @param active - Whether court is active
 * @returns Created court or error
 */
export async function createCourt(
  clubId: string,
  name: string,
  courtType: string,
  pricePerSlot: number,
  durationSlot: number,
  active: boolean = true
): Promise<{ data: Court | null; error: string | null }> {
  try {
    if (!name?.trim()) {
      return { data: null, error: 'Nome da quadra é obrigatório' };
    }

    const court = await prisma.court.create({
      data: {
        clubId,
        name: name.trim(),
        type: courtType,
        pricePerSlot,
        durationSlot,
        status: (active ? 'ACTIVE' : 'INACTIVE') as CourtStatus,
      },
    });

    return { data: mapCourt(court), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar quadra';
    return { data: null, error: message };
  }
}

/**
 * Update a court.
 * @param courtId - Court ID
 * @param clubId - Club ID (for authorization)
 * @param updates - Fields to update
 * @returns Updated court or error
 */
export async function updateCourt(
  courtId: string,
  clubId: string,
  updates: Partial<Omit<Court, 'id' | 'club_id' | 'created_at'>>
): Promise<{ data: Court | null; error: string | null }> {
  try {
    // Verify authorization
    const existing = await prisma.court.findUnique({
      where: { id: courtId },
    });

    if (!existing || existing.clubId !== clubId) {
      return { data: null, error: 'Quadra não encontrada' };
    }

    const court = await prisma.court.update({
      where: { id: courtId },
      data: {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.court_type !== undefined && { type: updates.court_type }),
        ...(updates.price_per_slot !== undefined && { pricePerSlot: updates.price_per_slot }),
        ...(updates.duration_slot !== undefined && { durationSlot: updates.duration_slot }),
        ...(updates.active !== undefined && { status: (updates.active ? 'ACTIVE' : 'INACTIVE') as CourtStatus }),
        updatedAt: new Date(),
      },
    });

    return { data: mapCourt(court), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar quadra';
    return { data: null, error: message };
  }
}

/**
 * Delete a court.
 * @param courtId - Court ID
 * @param clubId - Club ID (for authorization)
 * @returns Error or null
 */
export async function deleteCourt(courtId: string, clubId: string): Promise<{ error: string | null }> {
  try {
    // Verify authorization
    const existing = await prisma.court.findUnique({
      where: { id: courtId },
    });

    if (!existing || existing.clubId !== clubId) {
      return { error: 'Quadra não encontrada' };
    }

    await prisma.court.delete({
      where: { id: courtId },
    });

    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao deletar quadra';
    return { error: message };
  }
}
