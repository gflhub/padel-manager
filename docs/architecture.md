# Arquitetura do Projeto

## Estrutura de pastas

```
padel-manager/
├── app/
│   ├── (admin)/               # Route group: layout com sidebar admin
│   │   ├── layout.tsx         # Sidebar + header admin, verifica club_staff
│   │   ├── (admin)/dashboard/ # Dashboard com métricas
│   │   └── admin/
│   │       ├── courts/        # CRUD de quadras
│   │       ├── reservations/  # Gestão de reservas (calendário + lista)
│   │       ├── comandas/      # Sistema de comandas de bar
│   │       ├── products/      # Catálogo de produtos
│   │       ├── customers/     # Gestão de clientes/membros
│   │       ├── users/         # Gestão de usuários/staff
│   │       └── settings/      # Configurações do clube
│   │
│   ├── (client)/              # Route group: layout com header do cliente
│   │   ├── layout.tsx         # Header mobile-first para clientes
│   │   ├── home/              # Página inicial do cliente
│   │   ├── reservations/      # Ver e criar reservas
│   │   │   └── new/           # Formulário de nova reserva
│   │   ├── profile/           # Perfil do cliente
│   │   └── tournaments/       # Torneios (placeholder)
│   │
│   ├── actions/               # Server Actions (toda lógica de negócio)
│   │   ├── auth.ts            # signOut
│   │   ├── courts.ts          # getCourts, createCourt, updateCourt, deleteCourt
│   │   ├── reservations.ts    # getReservations, createReservation, updateReservationStatus
│   │   ├── comandas.ts        # getComandas, createComanda, addComandaItem, closeComanda
│   │   ├── comandas-new.ts    # Versão alternativa das actions de comanda
│   │   ├── products.ts        # getProducts, createProduct, updateProduct, deleteProduct
│   │   └── customers.ts       # getCustomers, createCustomer, updateCustomer, toggleCustomerActive, checkCpfStatus
│   │
│   ├── api/
│   │   ├── admin-setup/       # Rota de setup inicial do admin
│   │   └── feedback/          # Rota de feedback
│   │
│   ├── auth/
│   │   ├── callback/          # OAuth callback do Supabase
│   │   └── auth-code-error/   # Página de erro de auth
│   │
│   ├── login/                 # Página de login
│   ├── dashboard/             # Redirect/loading do dashboard
│   ├── layout.tsx             # Root layout (Toaster, fonts)
│   ├── page.tsx               # Root page (redirect baseado em role)
│   └── globals.css            # Estilos globais + tokens CSS
│
├── components/
│   ├── ui/                    # Componentes shadcn/ui (gerados)
│   │   ├── button, input, label, card, badge
│   │   ├── dialog, alert-dialog, sheet
│   │   ├── table, tabs, select, switch
│   │   ├── calendar, avatar, skeleton
│   │   ├── dropdown-menu, scroll-area, separator, textarea
│   └── logout-menu-item.tsx   # Client component para item de logout
│
├── lib/
│   ├── utils.ts               # cn() helper
│   ├── get-user-role.ts       # (legado) getClubRole, getClubId
│   ├── get-club-role.ts       # getClubContext (club_id + role)
│   └── supabase/
│       ├── client.ts          # createClient() — browser
│       ├── server.ts          # createClient() + createServiceClient() — server
│       └── middleware.ts      # updateSession() — cookies SSR
│
├── middleware.ts              # Auth gate global (redireciona para /login)
├── components.json            # Configuração do shadcn/ui
├── next.config.ts             # Configuração do Next.js
├── tsconfig.json              # TypeScript config
└── netlify.toml               # Deploy config Netlify
```

## Padrão de componentes: Server + Client

Cada página de admin segue o padrão:

```
page.tsx (Server Component)
  └── Busca dados via Server Actions ou Supabase diretamente
  └── Passa dados como props para o *-client.tsx
      └── *-client.tsx (Client Component)
            └── Gerencia estado local (useState)
            └── Chama Server Actions para mutações
            └── Exibe toasts com sonner
```

**Exemplos:**
- `reservations/page.tsx` → `reservations-client.tsx`
- `courts/page.tsx` → `courts-client.tsx`
- `products/page.tsx` → `products-client.tsx`
- `customers/page.tsx` → `customers-client.tsx`
- `comandas/page.tsx` → `comandas-wrapper.tsx` → `comandas-client.tsx` / `comandas-cards.tsx`

## Server Actions

Todas as mutações passam por Server Actions (`'use server'`). O padrão é:

```typescript
// 1. Verificar sessão e contexto do clube
async function assertStaffContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ctx: null, error: 'Não autorizado' }
  const ctx = await getClubContext(user.id)
  if (!ctx) return { ctx: null, error: 'Sem permissão' }
  return { ctx: { ...ctx, userId: user.id }, error: null }
}

// 2. Validar input com Zod
const schema = z.object({ ... })

// 3. Executar operação com service client (bypass RLS)
const service = createServiceClient()
const { data, error } = await service.from('tabela').insert(...)

// 4. Revalidar cache
revalidatePath('/caminho')

// 5. Retornar { data, error }
```

## Autenticação e autorização

```
Middleware (todo request)
  └── updateSession() → renova cookies Supabase SSR
  └── Se não autenticado → redirect /login
  └── Se /login e já autenticado → signOut + permite acesso à tela

Admin Layout (admin routes)
  └── Verifica club_staff ativo
  └── Se não staff → redirect /

Server Actions
  └── assertStaffContext() em toda action admin
  └── Todas queries filtram por club_id do contexto
```

## Clientes Supabase

| Cliente | Uso | Acesso |
|---------|-----|--------|
| `createClient()` (server) | Leitura autenticada, auth.getUser() | Respeita RLS |
| `createServiceClient()` | Todas as operações de dados no admin | Bypass RLS via service_role_key |
| `createClient()` (browser) | Auth no lado do cliente | Respeita RLS |
