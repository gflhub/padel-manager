# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## O projeto

Next.js 16 (App Router) + Supabase para gerenciamento de complexos esportivos. Multi-tenant: cada **clube** tem quadras, reservas, comandas de bar, produtos e clientes.

Documentação completa em `docs/`:
- `docs/overview.md` — visão geral e tech stack
- `docs/architecture.md` — estrutura de pastas e padrões
- `docs/database-schema.md` — schema do banco com todas as tabelas
- `docs/features.md` — features implementadas e fluxos de negócio
- `docs/development-guide.md` — guia de desenvolvimento e convenções

## Comandos essenciais

```bash
npm run dev      # desenvolvimento local (porta 3000)
npm run build    # build de produção
npm run start    # executa versão built (após npm run build)
npm run lint     # ESLint — sem fix
```

## Stack

- **Next.js 16** com App Router e React 19
- **Supabase** (PostgreSQL + Auth) via `@supabase/ssr`
- **shadcn/ui** (Radix UI + Tailwind CSS v4) para todos os componentes UI
- **Zod** para validação em Server Actions
- **date-fns** para datas, **recharts** para gráficos, **sonner** para toasts

## Estrutura de pastas

| Pasta | Propósito |
|-------|-----------|
| `app/` | Next.js App Router — rotas e layouts |
| `app/(admin)/` | Rotas admin — requer `staff` role |
| `app/(client)/` | Rotas do cliente — usuários normais |
| `app/(staff)/` | Rotas internas de equipe |
| `app/actions/` | Server Actions — CRUD e operações com `assertStaffContext()` |
| `app/api/` | API routes |
| `lib/supabase/` | Clientes Supabase: `server.ts` (createClient, createServiceClient), `middleware.ts`, `client.ts` |
| `lib/` | Utilitários: `get-club-role.ts`, `get-user-role.ts`, `get-club-context()` |
| `components/` | Componentes reutilizáveis + shadcn/ui components em `components/ui/` |

## Utilidades principais

### `lib/supabase/server.ts`
```typescript
export async function createClient()      // Cliente Supabase com auth do usuário logado
export function createServiceClient()     // Cliente com service role — admin only
```

### `lib/get-club-role.ts`
```typescript
export async function getClubContext(profileId)  // Retorna { clubId, role } do usuário staff
export async function getClubRole(profileId)     // Retorna apenas o role
export async function getClubId(profileId)       // Retorna apenas o club_id
```

### Pattern `assertStaffContext()` — definido em cada action file
Valida que o usuário é staff de um clube. Retorna `{ ctx: { clubId, role, userId }, error: null }` ou `{ ctx: null, error: 'mensagem' }`.

## Estrutura de rotas

```
/               → root page (redirect por role)
/login          → autenticação
/home           → área do cliente
/reservations   → reservas do cliente
/dashboard      → dashboard admin
/admin/*        → área admin (courts, reservations, comandas, products, customers, users, settings)
```

## Padrões que SEMPRE devem ser seguidos

### Server Actions (`app/actions/*.ts`)
1. Começar com `'use server'`
2. Chamar `assertStaffContext()` antes de qualquer operação admin
3. Validar input com Zod schema
4. Usar `createServiceClient()` (service role) para operações de banco
5. Filtrar sempre por `club_id` do contexto
6. Retornar `{ data, error }` — exatamente um é `null`
7. Chamar `revalidatePath()` após mutações

### Componentes de página admin
- `page.tsx` = Server Component — busca dados, passa props
- `*-client.tsx` = Client Component — estado local, chama actions, exibe toasts
- Padrão: `getReservations()`, `createReservation()`, `updateReservation()`, `deleteReservation()` em `app/actions/`

### Padrão de formulários
- Usar `react-hook-form` com `Zod` para validação client-side e schema validation em Server Action
- Actions retornam sempre `{ data, error }` onde exatamente um é `null`
- Client component captura resposta e exibe `toast.success()` ou `toast.error()` do `sonner`

### Nunca
- Usar `SUPABASE_SERVICE_ROLE_KEY` em código do browser/cliente
- Hardcodar `club_id` — sempre derivar do contexto do usuário logado
- Importar componentes Radix UI diretamente — usar sempre `@/components/ui/`
- Editar CPF de um profile — é imutável

## Tabelas principais do banco

| Tabela | Propósito |
|--------|-----------|
| `clubs` | Tenants — complexos esportivos |
| `profiles` | Identidade de usuários (Single Source of Truth) |
| `club_staff` | Vínculo equipe ↔ clube (roles: owner/admin/staff) |
| `club_members` | Vínculo clientes ↔ clube |
| `courts` | Quadras do complexo |
| `reservations` | Reservas de quadras |
| `products` | Catálogo de produtos do bar |
| `comandas` | Comandas de consumo |
| `comanda_items` | Itens de uma comanda |

## Variáveis de ambiente necessárias

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## Débito técnico e issues conhecidas

- **Duplicação de actions**: `app/actions/comandas.ts` e `comandas-new.ts` — consolidar em um único arquivo
- **`window.location.reload()` em alguns handlers** — substituir por `router.refresh()` do Next.js
- **TypeScript types não gerados do Supabase** — considerar `supabase gen types typescript` para type-safety
- **Sidebar admin sem ativo state** — não destaca a rota atual
- **`assertStaffContext()` duplicado em cada action file** — considerar extrair para `lib/` como utility reutilizável

## Contexto de negócio

- Mercado: gestão de complexos esportivos no Brasil
- Idioma do UI: português (pt-BR)
- Moeda: BRL (sempre formatar com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`)
- Horário de funcionamento típico de quadras: 8h às 22h
