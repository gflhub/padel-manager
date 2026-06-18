# Guia de Desenvolvimento

## Setup do ambiente

### Pré-requisitos
- Node.js 20+
- Banco MySQL/MariaDB acessível (local ou remoto)

### Variáveis de ambiente

Crie um arquivo `.env.local` na raiz:

```env
DATABASE_URL=mysql://user:password@localhost:3306/padel_manager
JWT_SECRET=<string longa e aleatória>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

⚠️ `JWT_SECRET` **nunca** deve ser exposto no cliente.

### Instalação e execução

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

---

## Testes

### Unitários (vitest)

```bash
npm run test          # roda a suíte uma vez
npm run test:ui       # UI interativa
npm run test:coverage # com cobertura
```

### E2E (Playwright)

A suíte E2E roda localmente contra o banco apontado por `DATABASE_URL` — o `global.setup` reseta o schema e roda o seed determinístico antes de cada execução, então **não aponte `DATABASE_URL` para um banco que você queira preservar** ao rodar `npm run e2e`. Configure no `.env.local`:

```env
E2E_BASE_URL=http://localhost:3100
```

```bash
npm run e2e          # roda a suíte completa (sobe o app via webServer automaticamente)
npm run e2e:ui        # modo interativo do Playwright
npm run e2e:headed    # com browser visível
npm run e2e:report    # abre o último relatório HTML

# Apenas os testes críticos (auth, RBAC, multi-tenant, reservas, comandas):
npx playwright test --project=chromium --grep @p0
```

A suíte usa um seed determinístico de dois clubes (`prisma/seed-e2e.ts`, contas `*.a@e2e.test` / `*.b@e2e.test`, senha `Test1234!`) e endpoints de teste em `app/api/e2e-only/*` (login direto e probes de autorização), guardados por `E2E_TEST_MODE=1` — inacessíveis fora do ambiente de teste. Note: o gate fica em `E2E_TEST_MODE`, não em `NODE_ENV`, porque `next dev` força `NODE_ENV=development` independente do que é passado.

**Gate de CI**: todo PR roda o workflow `.github/workflows/e2e.yml`. O job `e2e-p0-gate` (testes marcados `@p0`) **bloqueia o merge** se falhar. O job `e2e-full` roda a suíte completa (P1/P2) e reporta falhas sem bloquear.

---

## Convenções de código

### Nomenclatura de arquivos
- Componentes React: `PascalCase.tsx`
- Server Actions: `kebab-case.ts` em `/app/actions/`
- Páginas: `page.tsx`, `loading.tsx`, `layout.tsx`
- Client components de páginas: `[nome]-client.tsx` (ex: `courts-client.tsx`)

### Padrão de Server Actions

```typescript
'use server'

// 1. Schema Zod para input
const schema = z.object({ ... })

// 2. Action exportada
export async function myAction(formData: FormData) {
    try {
        const user = await requireUser()
        const ctx = await requireClubContext(user.id)

        const parsed = schema.safeParse(...)
        if (!parsed.success) return { error: parsed.error.issues[0].message, data: null }

        const data = await prisma.tabela.create({ data: { ...parsed.data, clubId: ctx.clubId } })

        revalidatePath('/caminho')
        return { data, error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro inesperado'
        return { data: null, error: message }
    }
}
```

### Padrão de retorno de actions
Sempre `{ data, error }` onde exatamente um é `null`:
- Sucesso: `{ data: ..., error: null }`
- Erro: `{ data: null, error: 'mensagem' }`

### Componentes UI
Usar exclusivamente componentes de `@/components/ui/` (shadcn). Não importar Radix diretamente.

Para ícones, usar `lucide-react`.

### Toasts
Usar `toast.success()` e `toast.error()` do `sonner`. O `<Toaster>` está no root layout.

### Formatação de moeda
```typescript
new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
```

---

## Adicionando um novo módulo admin

1. Criar pasta `app/(admin)/admin/[modulo]/`
2. Criar `page.tsx` (Server Component):
   - Buscar dados iniciais
   - Renderizar `<ModuloClient data={data} />`
3. Criar `[modulo]-client.tsx` (Client Component):
   - Estado local com useState
   - Chamar Server Actions para mutações
4. Criar `app/actions/[modulo].ts`:
   - `assertStaffContext()`
   - CRUD actions com Zod validation
5. Adicionar entrada no sidebar em `app/(admin)/layout.tsx`
6. Criar `loading.tsx` com skeleton

---

## Adicionando componente shadcn/ui

```bash
npx shadcn@latest add [componente]
```

Componente será criado em `components/ui/`.

---

## Deploy (Netlify)

O projeto está configurado para deploy no Netlify via `netlify.toml`. O build command é `next build`.

Variáveis de ambiente devem ser configuradas no painel do Netlify.

---

## Notas de TypeScript

- O cliente Prisma é tipado automaticamente a partir de `prisma/schema.prisma` (gerado em `lib/generated/prisma`) — rodar `npx prisma generate` após alterar o schema
- Preferir `z.coerce.number()` para campos numéricos vindos de FormData

---

## Problemas conhecidos / débito técnico

- `window.location.reload()` em alguns handlers de clientes — idealmente substituir por `router.refresh()` do Next.js
- `comandas-new.ts` é uma versão paralela de `comandas.ts` — consolidar
- Sidebar admin não tem estado ativo para destacar a rota atual
