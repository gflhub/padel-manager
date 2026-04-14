'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const memberSchema = z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
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
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

    if (!staff) return { context: null, error: 'Sem permissão: usuário não é staff de nenhum clube' }
    return { context: { userId: user.id, clubId: staff.club_id, role: staff.role }, error: null }
}

// ─────────────────────────────────────────────────────────────
// Listar membros do clube
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
            name,
            email,
            phone,
            cpf,
            notes,
            active,
            joined_at,
            profile:profiles(id, name, email, phone, cpf, avatar_url)
        `)
        .eq('club_id', context.clubId)
        .order('name', { ascending: true })

    if (dbError) return { error: dbError.message, data: null }
    // Supabase retorna joins como array; normaliza profile para objeto único
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalized = (data || []).map((m: any) => ({
        ...m,
        profile: Array.isArray(m.profile) ? (m.profile[0] ?? null) : m.profile,
    }))
    return { data: normalized, error: null }
}

// ─────────────────────────────────────────────────────────────
// Criar membro (vínculo clube ↔ cliente)
// Fluxo:
//   1. CPF informado → busca profile existente (usuário do sistema)
//   2. Email informado → busca profile existente
//   3. Se encontrou profile → cria vínculo apontando para ele
//   4. Se não encontrou → cria membro manual (sem profile_id)
// ─────────────────────────────────────────────────────────────
export async function createCustomer(formData: FormData) {
    const { context, error: permError } = await assertStaffContext()
    if (permError || !context) return { error: permError ?? 'Erro desconhecido' }

    const raw = {
        name: (formData.get('name') as string)?.trim(),
        email: (formData.get('email') as string)?.toLowerCase().trim() || undefined,
        phone: (formData.get('phone') as string) || null,
        cpf: (formData.get('cpf') as string)?.replace(/\D/g, '') || null,
        notes: (formData.get('notes') as string) || null,
    }

    const parsed = memberSchema.safeParse(raw)
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const service = createServiceClient()

    // 1. Verificar membro duplicado no mesmo clube por CPF
    if (parsed.data.cpf) {
        const { data: dupCpf } = await service
            .from('club_members')
            .select('id, name')
            .eq('club_id', context.clubId)
            .eq('cpf', parsed.data.cpf)
            .maybeSingle()

        if (dupCpf) {
            return { error: `CPF já vinculado a "${dupCpf.name}" neste clube.`, existingId: dupCpf.id }
        }
    }

    // 2. Verificar membro duplicado no mesmo clube por email
    if (parsed.data.email) {
        const { data: dupEmail } = await service
            .from('club_members')
            .select('id, name')
            .eq('club_id', context.clubId)
            .eq('email', parsed.data.email)
            .maybeSingle()

        if (dupEmail) {
            return { error: `Email já vinculado a "${dupEmail.name}" neste clube.`, existingId: dupEmail.id }
        }
    }

    // 3. Descobrir se existe um profile no sistema com esse CPF ou email
    let linkedProfileId: string | null = null

    if (parsed.data.cpf) {
        const { data: profileByCpf } = await service
            .from('profiles')
            .select('id')
            .eq('cpf', parsed.data.cpf)
            .maybeSingle()
        if (profileByCpf) linkedProfileId = profileByCpf.id
    }

    if (!linkedProfileId && parsed.data.email) {
        const { data: profileByEmail } = await service
            .from('profiles')
            .select('id')
            .eq('email', parsed.data.email)
            .maybeSingle()
        if (profileByEmail) {
            // Verificar se esse profile já não está vinculado a este clube
            const { data: alreadyMember } = await service
                .from('club_members')
                .select('id, name')
                .eq('club_id', context.clubId)
                .eq('profile_id', profileByEmail.id)
                .maybeSingle()

            if (alreadyMember) {
                return { error: `Este usuário (${parsed.data.email}) já é membro deste clube como "${alreadyMember.name}".`, existingId: alreadyMember.id }
            }
            linkedProfileId = profileByEmail.id
        }
    }

    // 4. Inserir vínculo
    const { data, error } = await service
        .from('club_members')
        .insert({
            club_id: context.clubId,
            profile_id: linkedProfileId, // null se for manual
            name: parsed.data.name,
            email: parsed.data.email || null,
            phone: parsed.data.phone,
            cpf: parsed.data.cpf,
            notes: parsed.data.notes,
            active: true,
        })
        .select()
        .single()

    if (error) return { error: error.message }

    const isLinked = !!linkedProfileId
    revalidatePath('/admin/customers')
    return {
        data,
        error: null,
        linked: isLinked,
        message: isLinked
            ? 'Cliente vinculado com sucesso! Usuário já possui conta no sistema.'
            : 'Cliente cadastrado manualmente.',
    }
}

// ─────────────────────────────────────────────────────────────
// Atualizar dados do vínculo (apenas dados do clube, não do profile)
// ─────────────────────────────────────────────────────────────
export async function updateCustomer(id: string, formData: FormData) {
    const { context, error: permError } = await assertStaffContext()
    if (permError || !context) return { error: permError ?? 'Erro desconhecido' }

    const service = createServiceClient()

    // Verificar que o membro pertence ao clube do usuário
    const { data: member } = await service
        .from('club_members')
        .select('id, club_id, profile_id, cpf, email')
        .eq('id', id)
        .single()

    if (!member) return { error: 'Membro não encontrado' }
    if (member.club_id !== context.clubId) return { error: 'Sem permissão sobre este membro' }

    const raw = {
        name: (formData.get('name') as string)?.trim(),
        phone: (formData.get('phone') as string) || null,
        notes: (formData.get('notes') as string) || null,
        // CPF e email só editáveis se cadastro manual (sem profile_id)
        cpf: !member.profile_id
            ? (formData.get('cpf') as string)?.replace(/\D/g, '') || null
            : member.cpf,
        email: !member.profile_id
            ? (formData.get('email') as string)?.toLowerCase().trim() || null
            : member.email,
    }

    // Verificar CPF duplicado no clube (excluindo o próprio)
    if (raw.cpf && raw.cpf !== member.cpf) {
        const { data: dupCpf } = await service
            .from('club_members')
            .select('id, name')
            .eq('club_id', context.clubId)
            .eq('cpf', raw.cpf)
            .neq('id', id)
            .maybeSingle()
        if (dupCpf) return { error: `CPF já vinculado a "${dupCpf.name}" neste clube.` }
    }

    // Verificar email duplicado no clube (excluindo o próprio)
    if (raw.email && raw.email !== member.email) {
        const { data: dupEmail } = await service
            .from('club_members')
            .select('id, name')
            .eq('club_id', context.clubId)
            .eq('email', raw.email)
            .neq('id', id)
            .maybeSingle()
        if (dupEmail) return { error: `Email já vinculado a "${dupEmail.name}" neste clube.` }
    }

    const { data, error } = await service
        .from('club_members')
        .update({
            name: raw.name,
            phone: raw.phone,
            notes: raw.notes,
            ...(member.profile_id ? {} : { cpf: raw.cpf, email: raw.email }),
        })
        .eq('id', id)
        .select()
        .single()

    if (error) return { error: error.message }
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
