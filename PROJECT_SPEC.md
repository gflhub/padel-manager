# Padel Manager - Documentação Mestra (Single Source of Truth)

> Atualizado em: Abril/2026
> Foco: Arquitetura Multi-Tenant (SaaS), Next.js 16.1+, Supabase (PostgreSQL), Shadcn UI

Este documento deve ser usado como a fonte primária de verdade para todo o desenvolvimento, documentando o estado atual e a especificação alvo do Padel Manager.

---

## 1. Produto e Visão Geral

**Padel Manager** é um sistema SaaS de gestão esportiva focado inicialmente em quadras de padel, desenhado sob uma arquitetura multi-tenant para atender múltiplos clubes sob a mesma base de usuários.

### 1.1 Proposta de Valor
- **B2B (Clubes)**: Gestão de quadras, reservas em tempo real no calendário, PDV/Comandas unificado (tempo de quadra + consumo no bar em uma única conta), pagamentos, controle de clientes (membros) e dashboards.
- **B2C (Jogadores)**: Reserva online self-service via mobile, pagamento compartilhado, histórico de partidas.

---

## 2. Tecnologias e Stack

- **Framework**: Next.js (App Router) v16.1.6
- **UI & Estilização**: React 19.x, Tailwind CSS v4.x, Shadcn UI + Radix UI Primitives, Lucide React (Ícones)
- **Forms & Validação**: React Hook Form + Zod
- **Backend & Database**: Supabase (PostgreSQL 15+)
- **Auth**: Supabase Auth (@supabase/ssr)
- **Feedback/Bug Tracker**: Integração Linear API
- **Charts/Graphs**: Recharts
- **Ferramentas de Datas**: date-fns

---

## 3. Arquitetura de Software e Multi-Tenant (SaaS)

### 3.1 Modelo de Propriedade
A aplicação usa uma arquitetura de **Base Única Compartilhada** para todos os clubes (tenants), com isolamento implementado em nível de banco de dados e regras de negócio:

- `profiles`: Registros globais do sistema. O usuário cria uma conta e pode transitar entre diferentes clubes. Propriedade do Usuário. Acesso read-only pelo staff.
- `clubs`: Identificadores únicos dos tenants (quadras/complexos).
- `club_members`: Vinculo transacional. Conecta o `profile` global ao `club`. O staff do clube gerencia a relação, sem duplicar dados sensíveis.
- `club_staff`: Funcionários que governam aquele `club`. Controla Permissões.

### 3.2 Isolamento de Dados (RLS)
Uso intensivo de RLS (Row Level Security) via funções auxiliares (Security Definer):
- `get_my_club_id()`: Retorna o contexto de clube do staff.
- `is_club_staff()` / `is_club_admin()`: Confirmação de acesso.

---

## 4. Estrutura do Banco de Dados (Supabase/PostgreSQL)

**Tabelas Principais:**
1. `profiles`: `id (PK=auth.users.id)`, `name`, `email`, `phone`, `cpf (unique)`.
2. `clubs`: `id`, `name`, `slug`, `owner_id`.
3. `club_staff`: `id`, `club_id`, `profile_id`, `role (admin|staff)`, `active`.
4. `club_members`: `id`, `club_id`, `profile_id`, `notes`, `active`.
5. `courts`: Quadras com `court_type`, `price_per_slot`, `duration_slot`, config.
6. `reservations`: Reservas conectadas a `profile_id` e `court_id`. Suporta agrupamentos e tracking de status e pagamentos.
7. `comandas` e `comanda_items`: PDV. `customer_name`, cliente vinculado. Status: `open|closed|cancelled`. Items podem ser `court_time`, `product`, ou `tournament`.
8. `products`: Catálogo com `stock`, `active`, categorias.
9. `settings`: JSONB fields para customização flexível de configs multi-tenant.

---

## 5. Roteamento e Estrutura do App

O projeto separa as perspectivas usando Route Groups tradicionais do Next.js App Router.

- `/login` → Ponto de entrada auth. Após login, roteamento inteligente: Staff vai para `/admin`, Clientes para `/home`.
- `/(client)/*`: Interface Mobile-First.
  - `/home`, `/reservations`, `/reservations/new`, `/tournaments` (Em Breve).
- `/(admin)/*`: Desktop-first.
  - `/dashboard`: KPI cards combinados (receitas, ocupação, comandas correntes).
  - `/admin/courts`, `/admin/reservations`, `/admin/comandas`, `/admin/products`, `/admin/customers`.
- `/api/feedback`: Endpoint server-side para integrar bugs/reports automaticamente no painel do Linear.

---

## 6. Funcionalidades Desenvolvidas e Práticas Específicas

### 6.1 Tratamento e Autenticação de Usuários
- Cadastro preventivo: Fluxo de registro de clientes valida duplicidade por CPF ou E-mail buscando linkar o cliente num `profile` global aos `club_members` sem conflitos.
- Server Actions usam wrapper `assertStaffContext()` em ações administrativas, garantindo obtenção segura do usuário/clube operante.

### 6.2 Comandas 2.0 (Interface de Cards)
- Uma UI responsiva e moderna permitindo toggle entre **Tabela Clássica** e **Visualização em Cards**.
- **Cards**: Exibem cliente, qtd_itens, data, status, badge, formatação colorida.
- **Interatividade Modal**: Click no card abre um Modal complexo com ScrollArea para listar items, editar quantidades diretamente (botões `+ | -`), cancelar, fechar conta com captura de pagamentos (PIX, Cartão, Dinheiro).
- **Adição Ninja**: Produto incluído por search input com `AutoFocus`, pesquisa via real-time. Enter para selecionar primeirou item.

### 6.3 Reservas 
- **Admin**: Views duplas para agenda: Modo Listagem e Modo Calendário robusto (Grade de "Dias x Horas x Quadras"). Check-in e status actions rápidas.
- **Cliente**: Listagem de courts visíveis/ativas via client com seletor mobile amigável e fluxos condicionados no Supabase.

---

## 7. Padrões Técnicos Globais (Strict Guidelines)

1. **Uso de Server Actions**: Nenhuma mutação importante deve usar API routes convencionais. Usar 'use server', tratar e validar JSON/form-data instanciando Zod schemas. Retornar formatado `{ success, data, error }`. Usar `revalidatePath()`.
2. **Setup do Supabase**: Utilizar o pacote SSR oficial `@supabase/ssr`. Ter clientes específicos: Server, Middleware, Client e **Service Role bypass RLS** estrito a operações isoladas sem context propagation manual para o usuário comum.
3. **Shadcn UI Absoluto**: Não inventar componentes CSS puros nativos para UX core do sistema. Botões, inputs, forms, toasts (`sonner`), dropdowns e cards *devem* derivar das subpastas `@/components/ui/`.
4. **Proteção Multitenant em Mutations**: Funções administrativas que injetam, leem ou atualizam entidades B2B *(courts, commands, members)* devem cruzar de forma estrita o `club_id` para não contaminar e expor tabelas para tenants cruzados. Use o interceptor `assertStaffContext()`.

---

## 8. Pendências e Próximos Passos Prioritários

1. **Vincular Reserva à Comanda**: Cliente escolhe "Pagar Depois", o que aciona automaticamente uma comanda vinculando ao seu perfil e inserindo `court_time` como item.
2. **Gestão de Perfil do Cliente**: Rota `/profile` para o usuário editar infos do profile compartilhado (Atualizar CPF, Cel, e afins) com seguridade.
3. **Cancelamento do Cliente**: Política parametrizada de auto-cancelamentos nas reservas do user side com regras de tolerância.
4. **Relatórios e Analytics**: Gráficos complexos `/admin/reports` em Recharts filtráveis por time ranges.
5. **Notificações**: Gatilhar um job assíncrono para enviar confirmações ou alterações usando Resend.
