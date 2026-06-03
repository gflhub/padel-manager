# Comando: Criar Server Action

Cria uma Server Action seguindo o padrão do projeto.

## Uso

```
/new-server-action [arquivo] [nome-da-action] [descrição]
```

Exemplo: `/new-server-action tournaments createTournament "Criar novo torneio no clube"`

## Padrão obrigatório

```typescript
'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getClubContext } from '@/lib/get-club-role'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

async function assertStaffContext() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ctx: null, error: 'Não autorizado' as const }
    const ctx = await getClubContext(user.id)
    if (!ctx) return { ctx: null, error: 'Sem permissão' as const }
    return { ctx: { ...ctx, userId: user.id }, error: null }
}

const schema = z.object({
    // campos com validação
})

export async function [nomeAction](formData: FormData) {
    const { ctx, error: permError } = await assertStaffContext()
    if (permError || !ctx) return { error: permError ?? 'Erro' }

    const parsed = schema.safeParse({ /* extrair de formData */ })
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const service = createServiceClient()
    const { data, error } = await service
        .from('[tabela]')
        .insert({ ...parsed.data, club_id: ctx.clubId })
        .select()
        .single()

    if (error) return { error: error.message }
    revalidatePath('/admin/[modulo]')
    return { data, error: null }
}
```

## Regras

- Sempre filtrar por `club_id: ctx.clubId` em todas as queries
- Retorno sempre `{ data, error }` — exatamente um é null
- Zod para validação — retornar `parsed.error.issues[0].message` no erro
- `revalidatePath` após toda mutação
