'use server';

import { prisma } from '@/lib/db/prisma';
import { ReservationStatus } from '@/lib/generated/prisma/enums';

/**
 * Reservation Repository
 *
 * Handles all data access and business logic for court reservations.
 * Manages reservation creation, updates, cancellations, and queries.
 */

export interface Reservation {
  id: string;
  profile_id: string;
  club_id: string;
  court_id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  players: Array<{ name: string }>;
  price_per_hour: number;
  total_price: number;
  price_per_player: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  checked_in_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  court: { id: string; name: string; court_type: string } | null;
}

export interface ReservationFilters {
  date?: string;
  status?: string;
  court_id?: string;
}

export interface ReservationOverlapCheck {
  hasOverlap: boolean;
  error?: string;
}

export interface BookedSlot {
  start_time: string;
  end_time: string;
}

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

type PrismaReservation = {
  id: string;
  profileId: string;
  courtId: string;
  date: Date;
  startTime: string;
  endTime: string;
  players: unknown;
  pricePerHour: { toNumber: () => number } | number | null;
  totalPrice: { toNumber: () => number } | number | null;
  status: ReservationStatus;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
  court?: { id: string; name: string; type: string; clubId: string };
};

function mapReservation(reservation: PrismaReservation): Reservation {
  const players = (Array.isArray(reservation.players) ? reservation.players : []) as Array<{ name: string }>;
  const totalPrice = reservation.totalPrice == null
    ? 0
    : typeof reservation.totalPrice === 'number'
      ? reservation.totalPrice
      : Number(reservation.totalPrice);
  const pricePerHour = reservation.pricePerHour == null
    ? 0
    : typeof reservation.pricePerHour === 'number'
      ? reservation.pricePerHour
      : Number(reservation.pricePerHour);

  return {
    id: reservation.id,
    profile_id: reservation.profileId,
    club_id: reservation.court?.clubId ?? '',
    court_id: reservation.courtId,
    date: reservation.date.toISOString().split('T')[0],
    start_time: reservation.startTime,
    end_time: reservation.endTime,
    duration: timeToMinutes(reservation.endTime) - timeToMinutes(reservation.startTime),
    players,
    price_per_hour: pricePerHour,
    total_price: totalPrice,
    price_per_player: players.length > 0 ? totalPrice / players.length : totalPrice,
    status: reservation.status,
    created_by: reservation.userId ?? reservation.profileId,
    created_at: reservation.createdAt.toISOString(),
    updated_at: reservation.updatedAt.toISOString(),
    court: reservation.court ? { id: reservation.court.id, name: reservation.court.name, court_type: reservation.court.type } : null,
  };
}

/**
 * Get reservations for a club with optional filters.
 * @param clubId - Club ID
 * @param filters - Optional filters (date, status, court_id)
 * @returns Reservations list or error
 */
export async function getReservationsByClub(
  clubId: string,
  filters?: ReservationFilters
): Promise<{ data: Reservation[] | null; error: string | null }> {
  try {
    const where: any = {
      court: { clubId },
    };

    if (filters?.date) {
      const filterDate = new Date(filters.date);
      const nextDate = new Date(filterDate);
      nextDate.setDate(nextDate.getDate() + 1);
      where.date = {
        gte: filterDate,
        lt: nextDate,
      };
    }

    if (filters?.status) {
      where.status = filters.status as ReservationStatus;
    }

    if (filters?.court_id) {
      where.courtId = filters.court_id;
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: { court: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return { data: reservations.map(mapReservation), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar reservas';
    return { data: null, error: message };
  }
}

/**
 * Get total revenue from confirmed reservations for a club within a date range.
 * @param clubId - Club ID
 * @param startDate - Range start (inclusive)
 * @param endDate - Range end (exclusive)
 * @returns Sum of reservation total prices
 */
export async function getReservationRevenueByClub(
  clubId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const result = await prisma.reservation.aggregate({
    _sum: { totalPrice: true },
    where: {
      status: 'CONFIRMED',
      date: { gte: startDate, lt: endDate },
      court: { clubId },
    },
  })

  return result._sum.totalPrice ? Number(result._sum.totalPrice) : 0
}

/**
 * Get user's reservations.
 * @param userId - User ID (profile_id)
 * @returns Reservations list or error
 */
export async function getUserReservations(userId: string): Promise<{ data: Reservation[] | null; error: string | null }> {
  try {
    const reservations = await prisma.reservation.findMany({
      where: { profileId: userId },
      include: { court: true },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    });

    return { data: reservations.map(mapReservation), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar reservas do usuário';
    return { data: null, error: message };
  }
}

/**
 * Check if a reservation time slot overlaps with existing reservations.
 * @param courtId - Court ID
 * @param date - Reservation date
 * @param startTime - Start time (HH:MM)
 * @param endTime - End time (HH:MM)
 * @param excludeId - Optional reservation ID to exclude from check
 * @returns Overlap check result
 */
export async function checkReservationOverlap(
  courtId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: string
): Promise<ReservationOverlapCheck> {
  try {
    const reservationDate = new Date(date);
    const nextDate = new Date(reservationDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const existing = await prisma.reservation.findMany({
      where: {
        courtId,
        date: {
          gte: reservationDate,
          lt: nextDate,
        },
        status: {
          not: 'CANCELLED',
        },
      },
      select: { id: true, startTime: true, endTime: true },
    });

    const timeToMinutes = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const newStart = timeToMinutes(startTime);
    const newEnd = timeToMinutes(endTime);

    const overlap = existing.some((res) => {
      if (excludeId && res.id === excludeId) return false;
      const existStart = timeToMinutes(res.startTime);
      const existEnd = timeToMinutes(res.endTime);
      return !(newEnd <= existStart || newStart >= existEnd);
    });

    return { hasOverlap: !!overlap };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao verificar disponibilidade';
    return { hasOverlap: false, error: message };
  }
}

/**
 * Get booked time slots for a court on a specific date.
 * @param courtId - Court ID
 * @param date - Reservation date
 * @returns Booked slots or error
 */
export async function getBookedSlots(
  courtId: string,
  date: string
): Promise<{ data: BookedSlot[] | null; error: string | null }> {
  try {
    const reservationDate = new Date(date);
    const nextDate = new Date(reservationDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const slots = await prisma.reservation.findMany({
      where: {
        courtId,
        date: {
          gte: reservationDate,
          lt: nextDate,
        },
        status: {
          not: 'CANCELLED',
        },
      },
      select: { startTime: true, endTime: true },
    });

    const bookedSlots: BookedSlot[] = slots.map((s) => ({
      start_time: s.startTime,
      end_time: s.endTime,
    }));

    return { data: bookedSlots, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar horários ocupados';
    return { data: null, error: message };
  }
}

/**
 * Create a new reservation.
 * @param profileId - Profile ID of the user making the reservation
 * @param clubId - Club ID
 * @param courtId - Court ID
 * @param date - Reservation date
 * @param startTime - Start time (HH:MM)
 * @param endTime - End time (HH:MM)
 * @param duration - Duration in minutes
 * @param players - List of players
 * @param totalPrice - Total price
 * @param pricePerPlayer - Price per player
 * @param pricePerHour - Court's price per hour at the time of booking
 * @returns Created reservation or error
 */
export async function createReservation(
  profileId: string,
  clubId: string,
  courtId: string,
  date: string,
  startTime: string,
  endTime: string,
  duration: number,
  players: Array<{ name: string }>,
  totalPrice: number,
  pricePerPlayer: number,
  pricePerHour: number
): Promise<{ data: Reservation | null; error: string | null }> {
  try {
    const reservation = await prisma.reservation.create({
      data: {
        profileId,
        courtId,
        date: new Date(date),
        startTime,
        endTime,
        players,
        pricePerHour,
        totalPrice,
        status: 'CONFIRMED',
      },
      include: { court: true },
    });

    return { data: mapReservation(reservation), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar reserva';
    return { data: null, error: message };
  }
}

/**
 * Update reservation status.
 * @param reservationId - Reservation ID
 * @param clubId - Club ID (for authorization)
 * @param status - New status
 * @returns Error or null
 */
export async function updateReservationStatus(
  reservationId: string,
  clubId: string,
  status: string
): Promise<{ error: string | null }> {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { court: true },
    });

    if (!reservation || reservation.court.clubId !== clubId) {
      return { error: 'Reserva não encontrada' };
    }

    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: status as ReservationStatus,
        updatedAt: new Date(),
      },
    });

    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar status da reserva';
    return { error: message };
  }
}

/**
 * Cancel a user's own reservation.
 * @param reservationId - Reservation ID
 * @param userId - User ID (profile_id)
 * @returns Error or null
 */
export async function cancelUserReservation(
  reservationId: string,
  userId: string
): Promise<{ error: string | null }> {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      return { error: 'Reserva não encontrada' };
    }

    if (reservation.profileId !== userId) {
      return { error: 'Sem permissão para cancelar esta reserva' };
    }

    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: 'CANCELLED' as ReservationStatus,
        updatedAt: new Date(),
      },
    });

    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao cancelar reserva';
    return { error: message };
  }
}

/**
 * Reschedule a user's own reservation.
 * @param reservationId - Reservation ID
 * @param userId - User ID (profile_id)
 * @param newDate - New reservation date
 * @param newStartTime - New start time (HH:MM)
 * @param duration - Duration in minutes
 * @returns Error or null
 */
export async function rescheduleUserReservation(
  reservationId: string,
  userId: string,
  newDate: string,
  newStartTime: string,
  duration: number
): Promise<{ error: string | null }> {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      return { error: 'Reserva não encontrada' };
    }

    if (reservation.profileId !== userId) {
      return { error: 'Sem permissão para reagendar esta reserva' };
    }

    const timeToMinutes = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const minutesToTime = (minutes: number): string => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const newEndTime = minutesToTime(timeToMinutes(newStartTime) + duration);

    // Check for overlaps with the new time
    const overlapCheck = await checkReservationOverlap(
      reservation.courtId,
      newDate,
      newStartTime,
      newEndTime,
      reservationId
    );

    if (overlapCheck.error) return { error: overlapCheck.error };
    if (overlapCheck.hasOverlap) return { error: 'Horário indisponível na nova data/hora' };

    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        date: new Date(newDate),
        startTime: newStartTime,
        endTime: newEndTime,
        updatedAt: new Date(),
      },
    });

    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao reagendar reserva';
    return { error: message };
  }
}
