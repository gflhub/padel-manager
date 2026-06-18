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
│   │   └── feedback/          # Recebe feedback/bugs do client e cria card na API do Linear
│   │
│   ├── auth/
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
│   ├── db/
│   │   └── prisma.ts          # Cliente Prisma (MySQL/MariaDB)
│   └── auth/
│       ├── session.ts         # getCurrentUser, requireUser, requireClubContext, refreshSession
│       ├── authorization.ts   # requireStaffRole, canManageClubResource, requireGlobalAdmin
│       ├── tokens.ts           # geração/verificação de access e refresh tokens
│       ├── jwt.ts              # helpers de assinatura/verificação JWT
│       └── middleware.ts      # updateSession() — renovação de cookies de sessão
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
  └── Busca dados via Server Actions (Prisma)
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
export async function minhaAction(formData: FormData) {
  try {
    // 1. Verificar sessão e contexto do clube
    const user = await requireUser()
    const ctx = await requireClubContext(user.id)

    // 2. Validar input com Zod
    const parsed = schema.safeParse({ ... })
    if (!parsed.success) return { error: parsed.error.issues[0].message, data: null }

    // 3. Executar operação via Prisma, sempre filtrando por clubId
    const data = await prisma.tabela.create({ data: { ...parsed.data, clubId: ctx.clubId } })

    // 4. Revalidar cache
    revalidatePath('/caminho')

    // 5. Retornar { data, error }
    return { data, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    return { data: null, error: message }
  }
}
```

## Autenticação e autorização

```
Middleware (todo request)
  └── updateSession() → renova cookies de sessão JWT (accessToken/refreshToken)
  └── Se não autenticado → redirect /login
  └── Se /login e já autenticado → signOut + permite acesso à tela

Admin Layout (admin routes)
  └── Verifica club_staff ativo
  └── Se não staff → redirect /

Server Actions
  └── requireUser() + requireClubContext(user.id) em toda action admin
  └── Todas queries filtram por clubId do contexto
```

## Sessão e acesso a dados

| Helper | Uso | Local |
|--------|-----|-------|
| `getCurrentUser()` / `requireUser()` | Usuário autenticado via JWT (cookies) | `lib/auth/session.ts` |
| `requireClubContext(userId)` | `{ clubId, role, userId }` do staff logado | `lib/auth/session.ts` |
| `prisma` | Todas as operações de dados (server-only) | `lib/db/prisma.ts` |
