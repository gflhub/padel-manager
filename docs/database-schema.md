# Schema do Banco de Dados (Prisma / MySQL)

Schema inferido a partir das Server Actions e componentes. As tabelas abaixo representam o modelo de dados atual.

## Entidades principais

### `clubs`
Representa um complexo esportivo (tenant).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | Identificador único |
| name | text | Nome do clube |
| created_at | timestamptz | Data de criação |

---

### `profiles`
Dados de identidade de todos os usuários da plataforma (ligado ao model `User` via `userId`).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK FK→User | Mesmo ID do model `User` |
| name | text | Nome completo |
| email | text UNIQUE | Email |
| phone | text | Telefone |
| cpf | text UNIQUE | CPF (identificador permanente, nunca editável via staff) |
| avatar_url | text | URL do avatar |
| status | text | `'active'` ou `'pre_registered'` |
| created_at | timestamptz | |

**Regras importantes:**
- CPF é imutável após criado — serve como chave de deduplicação
- `pre_registered`: cliente cadastrado pelo staff do clube, sem conta ativa. Pode ser "ativado" quando o usuário se registra no app com o mesmo email/CPF
- Dados de identidade vivem **apenas** em `profiles` (Single Source of Truth)

---

### `club_staff`
Vínculo de usuários como equipe de um clube.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| club_id | uuid FK→clubs | |
| profile_id | uuid FK→profiles | |
| role | text | `'owner'`, `'admin'` ou `'staff'` |
| active | boolean | Se o vínculo está ativo |
| created_at | timestamptz | |

**Roles:**
- `owner`: Proprietário do clube
- `admin`: Administrador com quase todos os poderes
- `staff`: Equipe operacional (acesso mais restrito)

---

### `club_members`
Vínculo de clientes a um clube. Armazena **apenas** dados relacionais ao clube — nunca dados de identidade.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| club_id | uuid FK→clubs | |
| profile_id | uuid FK→profiles | |
| notes | text | Anotações internas do clube (visíveis só para staff) |
| active | boolean | Se o cliente está ativo no clube |
| joined_at | timestamptz | Data de vínculo |

**Constraint:** `UNIQUE(club_id, profile_id)`

---

### `courts`
Quadras do complexo.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| club_id | uuid FK→clubs | |
| name | text | Nome da quadra (ex: "Quadra 1", "Court A") |
| court_type | text enum | `'padel'`, `'tennis'`, `'beach_tennis'`, `'volleyball'`, `'futsal'`, `'squash'`, `'other'` |
| price_per_slot | numeric | Preço por slot/reserva |
| duration_slot | integer | Duração do slot em minutos (mínimo 30) |
| active | boolean | Se a quadra está disponível para reservas |
| created_at | timestamptz | |

---

### `reservations`
Reservas de quadras.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| club_id | uuid FK→clubs | |
| court_id | uuid FK→courts | |
| profile_id | uuid FK→profiles | Cliente que fez a reserva |
| date | date | Data da reserva (YYYY-MM-DD) |
| start_time | time | Hora de início (HH:MM) |
| end_time | time | Hora de término calculada |
| duration | integer | Duração em minutos |
| players | jsonb | Array de `{ name: string }` |
| total_price | numeric | Preço total da reserva |
| price_per_player | numeric | Preço dividido pelo número de jogadores |
| status | text enum | `'pending'`, `'confirmed'`, `'checked_in'`, `'completed'`, `'cancelled'`, `'no_show'` |
| created_by | uuid FK→profiles | Quem criou (pode ser staff) |
| checked_in_at | timestamptz | Quando foi feito check-in |
| completed_at | timestamptz | Quando foi marcada como concluída |
| cancelled_at | timestamptz | Quando foi cancelada |
| created_at | timestamptz | |

**Fluxo de status:**
```
pending → confirmed → checked_in → completed
                   ↘ cancelled
                   ↘ no_show
```

---

### `products`
Catálogo de produtos do bar/loja do clube.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| club_id | uuid FK→clubs | |
| name | text | Nome do produto |
| category | text enum | `'bebidas'`, `'lanches'`, `'doces'`, `'outros'` |
| price | numeric | Preço unitário |
| stock | integer | Quantidade em estoque |
| active | boolean | Se está disponível para venda |
| created_at | timestamptz | |

---

### `comandas`
Comandas de consumo do bar.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| club_id | uuid FK→clubs | |
| customer_name | text | Nome do cliente (livre, não necessariamente vinculado a um profile) |
| status | text enum | `'open'`, `'closed'`, `'cancelled'` |
| total | numeric | Total acumulado (calculado) |
| notes | text | Notas (armazena telefone e forma de pagamento) |
| opened_by | uuid FK→profiles | Quem abriu |
| closed_by | uuid FK→profiles | Quem fechou |
| opened_at | timestamptz | |
| closed_at | timestamptz | |

---

### `comanda_items`
Itens consumidos em uma comanda.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| comanda_id | uuid FK→comandas | |
| product_id | uuid FK→products nullable | Produto do catálogo (opcional) |
| name | text | Nome do item (pode ser avulso) |
| unit_price | numeric | Preço unitário |
| quantity | integer | Quantidade |
| total_price | numeric | `unit_price * quantity` |
| created_at | timestamptz | |

## Diagrama ER simplificado

```
clubs
  ├── club_staff (profile_id → profiles)
  ├── club_members (profile_id → profiles)
  ├── courts
  │     └── reservations (profile_id → profiles)
  ├── products
  └── comandas
        └── comanda_items (product_id → products)

profiles ← User (Prisma, autenticação via JWT)
```

## Notas de design

- **Isolamento por club_id**: toda query admin filtra por `club_id` derivado do contexto do staff logado.
- **Acesso via Prisma**: todas as operações de leitura/escrita usam `prisma` (`lib/db/prisma.ts`) em server actions, que controlam as permissões via `requireClubContext()`.
- **CPF como chave global**: o CPF em `profiles.cpf` serve para deduplicar clientes entre clubes. Um mesmo cliente com CPF pode ser vinculado a múltiplos clubes via `club_members`.
