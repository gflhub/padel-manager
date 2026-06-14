'use server';

import { prisma } from '@/lib/db/prisma';

/**
 * Club Settings Repository
 *
 * Handles all data access for club-wide settings (complex info,
 * reservation policies, payment options).
 */

export interface ClubSettings {
  club_id: string;
  complex_name: string;
  complex_address: string;
  complex_phone: string;
  complex_email: string;
  max_advance_days: number;
  default_slot_duration: number;
  allow_pay_later: boolean;
  allow_credits: boolean;
  pix_key: string;
  updated_by: string | null;
}

const DEFAULT_SETTINGS: Omit<ClubSettings, 'club_id'> = {
  complex_name: '',
  complex_address: '',
  complex_phone: '',
  complex_email: '',
  max_advance_days: 30,
  default_slot_duration: 90,
  allow_pay_later: true,
  allow_credits: true,
  pix_key: '',
  updated_by: null,
};

/**
 * Get settings for a club, returning defaults if none have been saved yet.
 * @param clubId - Club ID
 * @returns Club settings or error
 */
export async function getClubSettings(clubId: string): Promise<{ data: ClubSettings | null; error: string | null }> {
  try {
    const settings = await prisma.clubSettings.findUnique({
      where: { clubId },
    });

    if (!settings) {
      return { data: { club_id: clubId, ...DEFAULT_SETTINGS }, error: null };
    }

    return {
      data: {
        club_id: settings.clubId,
        complex_name: settings.complexName ?? '',
        complex_address: settings.complexAddress ?? '',
        complex_phone: settings.complexPhone ?? '',
        complex_email: settings.complexEmail ?? '',
        max_advance_days: settings.maxAdvanceDays,
        default_slot_duration: settings.defaultSlotDuration,
        allow_pay_later: settings.allowPayLater,
        allow_credits: settings.allowCredits,
        pix_key: settings.pixKey ?? '',
        updated_by: settings.updatedBy,
      },
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar configurações';
    return { data: null, error: message };
  }
}

/**
 * Update (or create) the complex info section of a club's settings.
 * @param clubId - Club ID
 * @param updatedBy - User ID performing the update
 * @param complexInfo - Complex info fields
 * @returns Error or null
 */
export async function updateClubComplexInfo(
  clubId: string,
  updatedBy: string,
  complexInfo: { name: string; address: string; phone: string; email: string }
): Promise<{ error: string | null }> {
  try {
    await prisma.clubSettings.upsert({
      where: { clubId },
      create: {
        clubId,
        complexName: complexInfo.name,
        complexAddress: complexInfo.address,
        complexPhone: complexInfo.phone,
        complexEmail: complexInfo.email,
        updatedBy,
      },
      update: {
        complexName: complexInfo.name,
        complexAddress: complexInfo.address,
        complexPhone: complexInfo.phone,
        complexEmail: complexInfo.email,
        updatedBy,
      },
    });

    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar configurações';
    return { error: message };
  }
}

/**
 * Update (or create) the reservation policy section of a club's settings.
 * @param clubId - Club ID
 * @param updatedBy - User ID performing the update
 * @param reservationSettings - Reservation policy fields
 * @returns Error or null
 */
export async function updateClubReservationSettings(
  clubId: string,
  updatedBy: string,
  reservationSettings: { maxAdvanceDays: number; defaultSlotDuration: number }
): Promise<{ error: string | null }> {
  try {
    await prisma.clubSettings.upsert({
      where: { clubId },
      create: {
        clubId,
        maxAdvanceDays: reservationSettings.maxAdvanceDays,
        defaultSlotDuration: reservationSettings.defaultSlotDuration,
        updatedBy,
      },
      update: {
        maxAdvanceDays: reservationSettings.maxAdvanceDays,
        defaultSlotDuration: reservationSettings.defaultSlotDuration,
        updatedBy,
      },
    });

    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar configurações de reserva';
    return { error: message };
  }
}

/**
 * Update (or create) the payment section of a club's settings.
 * @param clubId - Club ID
 * @param updatedBy - User ID performing the update
 * @param paymentSettings - Payment fields (PIX key)
 * @returns Error or null
 */
export async function updateClubPaymentSettings(
  clubId: string,
  updatedBy: string,
  paymentSettings: { pixKey: string }
): Promise<{ error: string | null }> {
  try {
    await prisma.clubSettings.upsert({
      where: { clubId },
      create: {
        clubId,
        pixKey: paymentSettings.pixKey,
        updatedBy,
      },
      update: {
        pixKey: paymentSettings.pixKey,
        updatedBy,
      },
    });

    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar configurações de pagamento';
    return { error: message };
  }
}
