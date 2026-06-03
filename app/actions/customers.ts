'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const memberSchema = z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('Email obrigatório e deve ser válido'),
    phone: z.string().optional().nullable(),
    cpf: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
})

// ─────────────────────────────────────────────────────────────
// Auxiliar: verifica sessão e retorna club_id + role do usuário
// ─────────────────────────────────────────────────────────────
async function assertStaffContext() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { context: null, error: 'Não autorizado' }

    const service = createServiceClient()
    const { data: staff } = await service
        .from('club_staff')
        .select('club_id, role')
        .eq('profile_id', user.id)
        .eq('active', true)
        .single()

    if (!staff) return { context: null, error: 'Sem permissão: usuário não é staff de nenhum clube' }
    return { context: { userId: user.id, clubId: staff.club_id, role: staff.role }, error: null }
}

// ─────────────────────────────────────────────────────────────
// Verificar status de um CPF na plataforma
// Busca em profiles (global). Retorna profile encontrado e se
// já é membro do clube atual.
// ─────────────────────────────────────────────────────────────
export async function checkCpfStatus(cpfRaw: string) {
    const { context, error } = await assertStaffContext()
    if (error || !context) return { error: error ?? 'Erro desconhecido', data: null, isMember: false }

    const cpf = cpfRaw.replace(/\D/g, '')
    if (!cpf || cpf.length !== 11) return { error: 'CPF inválido', data: null, isMember: false }

    const service = createServiceClient()
    const { data: profile } = await service
        .from('profiles')
        .select('id, name, email, status')
        .eq('cpf', cpf)
        .maybeSingle()

    if (!profile) return { data: null, error: null, isMember: false }

    // Verificar se esse profile já é membro do clube atual
    const { data: memberCheck } = await service
        .from('club_members')
        .select('id')
        .eq('club_id', context.clubId)
        .eq('profile_id', profile.id)
        .maybeSingle()

    return { data: profile, error: null, isMember: !!memberCheck }
}

// ─────────────────────────────────────────────────────────────
// Listar membros do clube
// Dados de identidade exclusivamente via JOIN com profiles.
// club_members armazena apenas: profile_id, notes, active, joined_at
// ─────────────────────────────────────────────────────────────
export async function getCustomers() {
    const { context, error } = await assertStaffContext()
    if (error || !context) return { error: error ?? 'Erro desconhecido', data: null }

    const service = createServiceClient()
    const { data, error: dbError } = await service
        .from('club_members')
        .select(`
            id,
            profile_id,
            notes,
            active,
            joined_at,
            profile:profiles(id, name, email, phone, cpf, avatar_url, status)
        `)
        .eq('club_id', context.clubId)
        .order('joined_at', { ascending: false })

    if (dbError) return { error: dbError.message, data: null }
    // Normaliza profile (Supabase retorna joins como array)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalized = (data || []).map((m: any) => ({
        ...m,
        profile: Array.isArray(m.profile) ? (m.profile[0] ?? null) : m.profile,
    }))
    return { data: normalized, error: null }
}

// ─────────────────────────────────────────────────────────────
// Criar membro — vínculo puro (clube ↔ profile)
// Fluxo:
//   A. CPF encontrado em profiles → cria vínculo; se pre_registered,
//      atualiza name/email/phone (nunca cpf)
//   B. CPF não encontrado → pré-cadastra via Supabase Admin Auth,
//      insere profile, cria vínculo
// ─────────────────────────────────────────────────────────────
export async function createCustomer(formData: FormData) {
    const { context, error: permError } = await assertStaffContext()
    if (permError || !context) return { error: permError ?? 'Erro desconhecido' }

    const raw = {
        name: (formData.get('name') as string)?.trim(),
        email: (formData.get('email') as string)?.toLowerCase().trim(),
        phone: (formData.get('phone') as string) || null,
        cpf: (formData.get('cpf') as string)?.replace(/\D/g, '') || null,
        notes: (formData.get('notes') as string) || null,
    }

    const parsed = memberSchema.safeParse(raw)
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const service = createServiceClient()

    // Verificar se já é membro do clube por CPF
    if (parsed.data.cpf) {
        const { data: existingProfile } = await service
            .from('profiles')
            .select('id, name, email, status')
            .eq('cpf', parsed.data.cpf)
            .maybeSingle()

        if (existingProfile) {
            // Verificar se já é membro deste clube
            const { data: alreadyMember } = await service
                .from('club_members')
                .select('id')
                .eq('club_id', context.clubId)
                .eq('profile_id', existingProfile.id)
                .maybeSingle()

            if (alreadyMember) {
                return { error: 'Este cliente já é membro deste clube.', existingId: alreadyMember.id }
            }

            // Cenário A: profile encontrado — cria vínculo puro
            // Se pre_registered, atualiza dados de contato (nunca cpf)
            if (existingProfile.status === 'pre_registered') {
                await service.from('profiles').update({
                    name: parsed.data.name,
                    email: parsed.data.email,
                    phone: parsed.data.phone,
                    // cpf: NUNCA atualizado — identificador permanente
                }).eq('id', existingProfile.id)
            }

            const { data, error } = await service
                .from('club_members')
                .insert({
                    club_id: context.clubId,
                    profile_id: existingProfile.id,
                    notes: parsed.data.notes,
                    active: true,
                })
                .select()
                .single()

            if (error) return { error: error.message }
            revalidatePath('/admin/customers')
            return {
                data,
                error: null,
                linked: true,
                message: existingProfile.status === 'pre_registered'
                    ? 'Pré-cadastro vinculado ao clube com dados atualizados.'
                    : 'Cliente vinculado com sucesso! Já possui conta ativa na plataforma.',
            }
        }
    }

    // Cenário B: CPF não existe — verificar duplicidade por email também
    const { data: profileByEmail } = await service
        .from('profiles')
        .select('id, status')
        .eq('email', parsed.data.email)
        .maybeSingle()

    if (profileByEmail) {
        const { data: alreadyMember } = await service
            .from('club_members')
            .select('id')
            .eq('club_id', context.clubId)
            .eq('profile_id', profileByEmail.id)
            .maybeSingle()

        if (alreadyMember) {
            return { error: 'Já existe um cliente com este email neste clube.', existingId: alreadyMember.id }
        }

        // Mesmo fluxo do Cenário A
        const { data, error } = await service
            .from('club_members')
            .insert({
                club_id: context.clubId,
                profile_id: profileByEmail.id,
                notes: parsed.data.notes,
                active: true,
            })
            .select()
            .single()

        if (error) return { error: error.message }
        revalidatePath('/admin/customers')
        return { data, error: null, linked: true, message: 'Cliente vinculado com sucesso!' }
    }

    // Cenário B puro: nenhum profile existe — pré-cadastrar
    const randomPassword = crypto.randomUUID() + crypto.randomUUID()

    const { data: authData, error: authErr } = await service.auth.admin.createUser({
        email: parsed.data.email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
            name: parsed.data.name,
            cpf: parsed.data.cpf ?? undefined,
            phone: parsed.data.phone ?? undefined,
        },
    })

    if (authErr) return { error: `Erro ao pré-cadastrar cliente: ${authErr.message}` }
    if (!authData.user) return { error: 'Erro ao criar usuário: resposta vazia' }

    // Upsert do profile com status pre_registered
    await service.from('profiles').upsert({
        id: authData.user.id,
        email: parsed.data.email,
        name: parsed.data.name,
        cpf: parsed.data.cpf,
        phone: parsed.data.phone,
        status: 'pre_registered',
    })

    // Vínculo puro — sem dados de identidade em club_members
    const { data, error } = await service
        .from('club_members')
        .insert({
            club_id: context.clubId,
            profile_id: authData.user.id,
            notes: parsed.data.notes,
            active: true,
        })
        .select()
        .single()

    if (error) return { error: error.message }

    revalidatePath('/admin/customers')
    return {
        data,
        error: null,
        linked: false,
        message: 'Pré-cadastro criado! O cliente poderá ativar a conta pelo app.',
    }
}

// ─────────────────────────────────────────────────────────────
// Atualizar dados do vínculo
// - notes: sempre editável (campo exclusivo do clube)
// - name/email/phone: editável em profiles somente se pre_registered
// - cpf: NUNCA editável via staff
// ─────────────────────────────────────────────────────────────
export async function updateCustomer(id: string, formData: FormData) {
    const { context, error: permError } = await assertStaffContext()
    if (permError || !context) return { error: permError ?? 'Erro desconhecido' }

    const service = createServiceClient()

    // Buscar o vínculo com o profile correspondente
    const { data: member } = await service
        .from('club_members')
        .select('id, club_id, profile_id, profile:profiles(id, status)')
        .eq('id', id)
        .single()

    if (!member) return { error: 'Membro não encontrado' }
    if (member.club_id !== context.clubId) return { error: 'Sem permissão sobre este membro' }

    const notes = (formData.get('notes') as string) || null

    // Atualizar notes no vínculo do clube
    const { data, error } = await service
        .from('club_members')
        .update({ notes })
        .eq('id', id)
        .eq('club_id', context.clubId)
        .select()
        .single()

    if (error) return { error: error.message }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = Array.isArray((member as any).profile) ? (member as any).profile[0] : (member as any).profile

    // Atualizar name/email/phone no profile apenas se pre_registered
    // cpf nunca é incluído neste UPDATE
    if (profile?.status === 'pre_registered' && member.profile_id) {
        const name = (formData.get('name') as string)?.trim() || null
        const email = (formData.get('email') as string)?.toLowerCase().trim() || null
        const phone = (formData.get('phone') as string) || null

        if (name || email || phone) {
            await service.from('profiles')
                .update({ name, email, phone })
                .eq('id', member.profile_id)
        }
    }

    revalidatePath('/admin/customers')
    return { data, error: null }
}

// ─────────────────────────────────────────────────────────────
// Ativar / desativar vínculo no clube
// ─────────────────────────────────────────────────────────────
export async function toggleCustomerActive(id: string, active: boolean) {
    const { context, error: permError } = await assertStaffContext()
    if (permError || !context) return { error: permError ?? 'Erro desconhecido' }

    const service = createServiceClient()
    const { error } = await service
        .from('club_members')
        .update({ active })
        .eq('id', id)
        .eq('club_id', context.clubId)

    if (error) return { error: error.message }
    revalidatePath('/admin/customers')
    return { error: null }
}
