'use server'

import { requireUser, requireClubContext } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import * as tournamentRepo from '@/lib/repositories/tournaments'

const tournamentSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  maxParticipants: z.number().positive(),
  entryFee: z.number().nonnegative().optional(),
})

export async function createTournament(formData: FormData) {
  try {
    const user = await requireUser()
    const context = await requireClubContext(user.id)

    const result = tournamentSchema.safeParse({
      name: formData.get('name'),
      description: formData.get('description'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      maxParticipants: parseInt(formData.get('maxParticipants') as string),
      entryFee: formData.get('entryFee') ? parseFloat(formData.get('entryFee') as string) : 0,
    })

    if (!result.success) {
      return { error: result.error.issues[0].message, data: null }
    }

    const tournamentResult = await tournamentRepo.createTournament(
      context.clubId,
      result.data.name,
      result.data.startDate,
      result.data.endDate,
      result.data.maxParticipants,
      user.id,
      result.data.description,
      result.data.entryFee || undefined
    )

    if (tournamentResult.error) {
      return { error: tournamentResult.error, data: null }
    }

    revalidatePath('/admin/tournaments')
    revalidatePath('/tournaments')
    return { data: tournamentResult.data, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar torneio'
    return { error: message, data: null }
  }
}

export async function updateTournament(id: string, formData: FormData) {
  try {
    const user = await requireUser()
    const context = await requireClubContext(user.id)

    const result = tournamentSchema.safeParse({
      name: formData.get('name'),
      description: formData.get('description'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      maxParticipants: parseInt(formData.get('maxParticipants') as string),
      entryFee: formData.get('entryFee') ? parseFloat(formData.get('entryFee') as string) : 0,
    })

    if (!result.success) {
      return { error: result.error.issues[0].message, data: null }
    }

    const tournamentResult = await tournamentRepo.updateTournament(
      id,
      context.clubId,
      {
        name: result.data.name,
        description: result.data.description,
        start_date: result.data.startDate,
        end_date: result.data.endDate,
        max_participants: result.data.maxParticipants,
        entry_fee: result.data.entryFee,
      }
    )

    if (tournamentResult.error) {
      return { error: tournamentResult.error, data: null }
    }

    revalidatePath('/admin/tournaments')
    revalidatePath('/tournaments')
    return { data: tournamentResult.data, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar torneio'
    return { error: message, data: null }
  }
}

export async function deleteTournament(id: string) {
  try {
    const user = await requireUser()
    const context = await requireClubContext(user.id)

    const result = await tournamentRepo.deleteTournament(id, context.clubId)
    if (result.error) {
      return { error: result.error }
    }

    revalidatePath('/admin/tournaments')
    revalidatePath('/tournaments')
    return { error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao deletar torneio'
    return { error: message }
  }
}

export async function registerForTournament(tournamentId: string) {
  try {
    const user = await requireUser()

    const result = await tournamentRepo.registerForTournament(tournamentId, user.id)
    if (result.error) {
      return { error: result.error, data: null }
    }

    revalidatePath('/tournaments')
    return { data: result.data, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao registrar no torneio'
    return { error: message, data: null }
  }
}

export async function cancelTournamentRegistration(tournamentId: string) {
  try {
    const user = await requireUser()

    const result = await tournamentRepo.cancelTournamentRegistration(tournamentId, user.id)
    if (result.error) {
      return { error: result.error }
    }

    revalidatePath('/tournaments')
    return { error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao cancelar inscrição'
    return { error: message }
  }
}

export async function getTournaments() {
  try {
    await requireUser()
    return tournamentRepo.getTournaments()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar torneios'
    return { error: message, data: null }
  }
}
