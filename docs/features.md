# Features e Fluxos de Negócio

## 1. Autenticação

**Fluxo:**
1. Qualquer rota não-pública redireciona para `/login` via middleware
2. Login via email/senha ou OAuth (Supabase Auth)
3. Callback em `/auth/callback` — processa o code do OAuth
4. Após login, root page (`/`) detecta se o usuário é staff e redireciona:
   - Staff → `/dashboard`
   - Cliente → `/home`

**Logout automático:** acessar `/login` estando logado faz signOut automático.

---

## 2. Área Admin

Acessível a usuários com vínculo ativo em `club_staff`. O layout admin exibe sidebar com navegação completa.

### 2.1 Dashboard (`/dashboard`)
Métricas do clube: reservas do dia, receita, comandas abertas, etc.

### 2.2 Gestão de Quadras (`/admin/courts`)

**Operações:** Criar, editar, ativar/desativar, deletar quadras.

**Campos:** nome, tipo, preço por slot, duração do slot, ativo.

**Tipos suportados:** padel, tênis, beach tennis, vôlei, futsal, squash, outros.

### 2.3 Gestão de Reservas (`/admin/reservations`)

**Visualizações:**
- **Calendário**: grade por quadra × hora para os próximos 3 dias. Células coloridas por status.
- **Lista**: tabela separada por Hoje / Próximas / Passadas / Todas.

**Ações por reserva:**
- `confirmed` → Check-in ou Cancelar
- `checked_in` → Marcar como Concluída

**Status e cores:**
| Status | Cor |
|--------|-----|
| pending | Amarelo |
| confirmed | Verde |
| checked_in | Azul |
| completed | Cinza |
| cancelled | Vermelho |
| no_show | Laranja |

### 2.4 Comandas (`/admin/comandas`)

Sistema de comanda digital para o bar.

**Fluxo:**
1. Staff abre comanda com nome do cliente (+ telefone opcional)
2. Adiciona produtos do catálogo à comanda
3. Fecha a comanda com forma de pagamento (PIX, Cartão, Dinheiro)

**Funcionalidades especiais:**
- Seleção múltipla de comandas abertas para fechamento em lote
- Visualização detalhada dos itens de cada comanda
- Abas: Abertas / Fechadas

### 2.5 Produtos (`/admin/products`)

Catálogo de produtos do bar/loja.

**Campos:** nome, categoria (bebidas/lanches/doces/outros), preço, estoque, ativo.

**Operações:** Criar, editar, ativar/desativar, deletar.

### 2.6 Clientes (`/admin/customers`)

Gestão dos clientes vinculados ao clube.

**Fluxo de criação (via CPF):**
1. Staff digita CPF do cliente
2. Sistema verifica o CPF em `profiles`:
   - **Já é membro do clube** → Erro, já vinculado
   - **Existe na plataforma** → Mostra dados, confirma vínculo (`club_members`)
   - **Não existe** → Cria pré-cadastro (cria auth user + profile com `status: 'pre_registered'`, depois cria vínculo)
3. Se `pre_registered`, staff pode editar nome/email/telefone (CPF nunca editável)
4. Se conta ativa (`active`), apenas notas internas são editáveis pelo clube

**Campos exibidos:** nome, email, telefone, CPF, tipo de conta (pré-cadastro / com conta), status (ativo/inativo), data de vínculo.

### 2.7 Usuários/Staff (`/admin/users`)
Gestão da equipe do clube.

### 2.8 Configurações (`/admin/settings`)
Configurações gerais do clube.

---

## 3. Área do Cliente

### 3.1 Home (`/home`)
Painel do cliente com reservas próximas e atalhos.

### 3.2 Reservas (`/reservations`)

**Listar reservas:** histórico de reservas do cliente logado.

**Criar reserva (`/reservations/new`):**
1. Selecionar quadra disponível
2. Escolher data e horário
3. Definir duração
4. Informar jogadores (nomes)
5. Confirmar preço e criar

**Cálculo automático:**
- `end_time` calculado a partir de `start_time + duration`
- `price_per_player = total_price / nº_jogadores`
- Ao criar reserva, o cliente é automaticamente vinculado ao clube via `club_members` (upsert idempotente)

### 3.3 Perfil (`/profile`)
Dados pessoais do cliente.

### 3.4 Torneios (`/tournaments`)
Em desenvolvimento / placeholder.

---

## 4. Regras de negócio críticas

### Isolamento multi-tenant
- Todo dado lido/escrito no admin é filtrado por `club_id`
- `club_id` vem do contexto do staff logado (`club_staff.club_id`)
- Nunca expor dados de outro clube

### CPF como chave universal
- CPF é único em `profiles` e nunca pode ser alterado
- Serve para deduplicar clientes que usam o app em múltiplos clubes
- Um cliente pode ser `pre_registered` em um clube e ter conta ativa em outro

### Service role vs anon key
- Operações de dados em server actions usam `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS)
- A autorização é feita no código da action (verificar `club_staff`)
- Nunca usar service role no cliente/browser

### Revalidação de cache
- Toda mutação chama `revalidatePath()` para invalidar o cache do Next.js
- Algumas páginas fazem `window.location.reload()` para forçar re-fetch após mutações complexas (clientes)
