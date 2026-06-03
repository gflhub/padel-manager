# Padel Manager — Visão Geral do Projeto

## O que é

Padel Manager é uma plataforma SaaS multi-tenant para **gerenciamento de complexos esportivos** (padel, tênis, beach tennis, futsal, etc.). Cada tenant é um **clube** com suas próprias quadras, equipe, clientes e produtos de bar/loja.

## Problema que resolve

Gestores de complexos esportivos precisam centralizar:
- Reserva de quadras (fluxo do cliente e do admin)
- Controle de frequência e status das reservas (check-in, conclusão, cancelamento)
- Comandas de bar — abertura, adição de consumo, fechamento com pagamento
- Cadastro e vínculo de clientes ao clube
- Catálogo de produtos e estoque básico

## Público-alvo

- **Administradores/donos de complexos**: acessam o painel admin para gerir tudo
- **Clientes (jogadores)**: acessam a área do cliente para criar e ver suas reservas

## Tecnologias principais

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| Auth + DB | Supabase (PostgreSQL + Auth) |
| UI Components | shadcn/ui (Radix UI + Tailwind CSS v4) |
| Forms | react-hook-form + Zod |
| Date handling | date-fns |
| Charts | recharts |
| Toasts | sonner |
| Deploy | Netlify |

## Arquitetura geral

```
┌─────────────────────────────────────────────────┐
│                   Next.js App                    │
│                                                  │
│  ┌──────────────┐      ┌─────────────────────┐  │
│  │ Route Group  │      │   Route Group       │  │
│  │  (admin)     │      │   (client)          │  │
│  │              │      │                     │  │
│  │ /dashboard   │      │ /home               │  │
│  │ /admin/*     │      │ /reservations       │  │
│  └──────────────┘      │ /profile            │  │
│                        │ /tournaments        │  │
│  ┌──────────────┐      └─────────────────────┘  │
│  │ Server       │                                │
│  │ Actions      │  ← validação Zod, acesso DB   │
│  │ /app/actions │                                │
│  └──────────────┘                                │
│                                                  │
│  ┌──────────────┐      ┌─────────────────────┐  │
│  │  Middleware  │      │   Supabase SSR      │  │
│  │  (auth gate) │      │   (cookies/session) │  │
│  └──────────────┘      └─────────────────────┘  │
└─────────────────────────────────────────────────┘
              │
              ▼
        Supabase (Postgres + Auth)
```

## Multi-tenancy

Cada clube (`clubs`) é uma unidade isolada. Todo dado sensível (quadras, reservas, comandas, produtos, clientes) é escopo de `club_id`. A autorização é feita via `club_staff` — o usuário deve ser staff ativo do clube para acessar os dados dele.

## Status do projeto

Em desenvolvimento ativo. Funcionalidades core implementadas: quadras, reservas, comandas, clientes, produtos. Features planejadas: dashboard com métricas, torneios, área do cliente mobile-first.
