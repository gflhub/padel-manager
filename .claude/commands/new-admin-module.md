# Comando: Criar novo módulo admin

Cria um módulo completo de gestão no painel admin com page, client component e server actions.

## Uso

```
/new-admin-module [nome] [descrição]
```

Exemplo: `/new-admin-module tournaments "Gestão de torneios do clube"`

## O que será criado

1. `app/(admin)/admin/[nome]/page.tsx` — Server Component que busca dados e renderiza o client
2. `app/(admin)/admin/[nome]/[nome]-client.tsx` — Client Component com CRUD completo
3. `app/(admin)/admin/[nome]/loading.tsx` — Skeleton de loading
4. `app/actions/[nome].ts` — Server Actions com assertStaffContext, Zod validation e CRUD

## Template de referência

Seguir o padrão de `app/(admin)/admin/courts/` como exemplo canônico de módulo completo.

## Após criar

- Adicionar entrada no sidebar em `app/(admin)/layout.tsx` (array `sidebarItems`)
- Adicionar a tabela no banco de dados se necessário (ver `docs/database-schema.md`)
- Documentar a feature em `docs/features.md`
