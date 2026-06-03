# Comando: Consultar banco de dados

Gera uma query Supabase para o contexto do projeto.

## Uso

```
/db-query [descrição do que precisa]
```

Exemplos:
- `/db-query listar reservas de hoje com dados da quadra`
- `/db-query contar comandas abertas por clube`
- `/db-query buscar produtos com estoque baixo`

## Contexto do banco

Ver `docs/database-schema.md` para schema completo.

## Padrões de query no projeto

```typescript
// Sempre usar createServiceClient() em server actions
const service = createServiceClient()

// Sempre filtrar por club_id
const { data, error } = await service
    .from('tabela')
    .select('*, relacao:outra_tabela(campo1, campo2)')
    .eq('club_id', ctx.clubId)
    .order('created_at', { ascending: false })

// JOIN com profiles (normalizar resultado)
const normalized = (data || []).map((m: any) => ({
    ...m,
    profile: Array.isArray(m.profile) ? (m.profile[0] ?? null) : m.profile,
}))

// Upsert idempotente
await service
    .from('tabela')
    .upsert(dados, { onConflict: 'col1,col2', ignoreDuplicates: true })
```
