# Guia de Desenvolvimento

## Setup do ambiente

### Pré-requisitos
- Node.js 20+
- Conta no Supabase com projeto criado

### Variáveis de ambiente

Crie um arquivo `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5...
```

⚠️ `SUPABASE_SERVICE_ROLE_KEY` **nunca** deve ser exposta no cliente.

### Instalação e execução

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

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

// 1. Sempre assertStaffContext() primeiro
async function assertStaffContext() { ... }

// 2. Schema Zod para input
const schema = z.object({ ... })

// 3. Action exportada
export async function myAction(formData: FormData) {
    const { ctx, error } = await assertStaffContext()
    if (error || !ctx) return { error }
    
    const parsed = schema.safeParse(...)
    if (!parsed.success) return { error: parsed.error.issues[0].message }
    
    const service = createServiceClient()
    const { data, error: dbError } = await service.from('tabela')...
    if (dbError) return { error: dbError.message }
    
    revalidatePath('/caminho')
    return { data, error: null }
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

- `createServiceClient()` retorna `SupabaseClient` sem tipos gerados — usar `any` com supressão de ESLint quando necessário
- Supabase retorna joins como arrays em alguns casos — normalizar com: `Array.isArray(m.profile) ? m.profile[0] : m.profile`
- Preferir `z.coerce.number()` para campos numéricos vindos de FormData

---

## Problemas conhecidos / débito técnico

- `window.location.reload()` em alguns handlers de clientes — idealmente substituir por `router.refresh()` do Next.js
- `comandas-new.ts` é uma versão paralela de `comandas.ts` — consolidar
- Tipos TypeScript gerados do Supabase não estão configurados — considerar `supabase gen types`
- Sidebar admin não tem estado ativo para destacar a rota atual
