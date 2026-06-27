'use server'

import { requireUser, requireClubContext } from '@/lib/auth/session'
import { z } from 'zod'
import * as paymentRepo from '@/lib/repositories/payments'
import * as reservationRepo from '@/lib/repositories/reservations'

const createPaymentSchema = z.object({
  clubId: z.string().min(1),
  comandaId: z.string().optional(),
  reservationId: z.string().optional(),
  amount: z.number().positive(),
  method: z.string().min(1),
})

const registerReservationPaymentSchema = z.object({
  reservationId: z.string().min(1),
  amount: z.number().positive(),
  method: z.string().min(1),
})


export async function createPayment(formData: FormData) {
  try {
    const user = await requireUser()

    const result = createPaymentSchema.safeParse({
      clubId: formData.get('clubId'),
      comandaId: formData.get('comandaId') || undefined,
      reservationId: formData.get('reservationId') || undefined,
      amount: parseFloat(formData.get('amount') as string),
      method: formData.get('method'),
    })

    if (!result.success) {
      return { error: result.error.issues[0].message, data: null }
    }

    const paymentResult = await paymentRepo.recordPayment(
      result.data.clubId,
      result.data.amount,
      result.data.method,
      user.id,
      result.data.comandaId,
      result.data.reservationId
    )

    if (paymentResult.error) {
      return { error: paymentResult.error, data: null }
    }

    return { data: paymentResult.data, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar pagamento'
    return { error: message, data: null }
  }
}

export async function registerReservationPayment(formData: FormData) {
  try {
    const user = await requireUser()

    const result = registerReservationPaymentSchema.safeParse({
      reservationId: formData.get('reservationId'),
      amount: parseFloat(formData.get('amount') as string),
      method: formData.get('method'),
    })

    if (!result.success) {
      return { error: result.error.issues[0].message, data: null }
    }

    const reservationResult = await reservationRepo.getReservationById(result.data.reservationId, user.profileId ?? '')
    if (reservationResult.error || !reservationResult.data) {
      return { error: 'Reserva não encontrada', data: null }
    }

    const reservation = reservationResult.data

    const paymentResult = await paymentRepo.recordPayment(
      reservation.club_id,
      result.data.amount,
      result.data.method,
      user.id,
      undefined,
      result.data.reservationId
    )

    if (paymentResult.error) {
      return { error: paymentResult.error, data: null }
    }

    return { data: paymentResult.data, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao registrar pagamento'
    return { error: message, data: null }
  }
}

export async function getCaixaReport(date: string) {
  try {
    const user = await requireUser()
    const context = await requireClubContext(user.id)

    const reportResult = await paymentRepo.getCaixaReport(context.clubId, date)
    if (reportResult.error) {
      return { error: reportResult.error, data: null }
    }

    return { data: reportResult.data, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao gerar relatório'
    return { error: message, data: null }
  }
}
