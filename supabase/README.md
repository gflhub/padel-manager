# Supabase Migrations

This directory contains versioned database migrations for the Padel Manager application. Migrations are the source of truth for the database schema and are applied through the Supabase MCP (Model Context Protocol), not through the Supabase CLI.

## Migration Files

Migrations are named with timestamps and descriptive names:
- `20260604010301_baseline.sql` - Initial schema snapshot (clubs, profiles, users, club_staff, courts, products, reservations, comandas, comanda_items, settings, club_members)
- `20260604020401_add_profiles_trigger.sql` - Auto-create profiles on auth signup
- `20260604020402_add_payments_table.sql` - Payments table and RLS policies
- `20260604020403_add_tournaments_tables.sql` - Club tournaments and registrations tables

## Applying Migrations

### Prerequisites

Ensure you have access to the Supabase project via MCP tools and the service role key is available in environment variables.

### Using the Supabase MCP

1. **Inspect the current schema:**
   ```
   mcp list_tables --project-id <project-id>
   mcp list_migrations --project-id <project-id>
   ```

2. **Apply a migration:**
   ```
   mcp apply_migration --project-id <project-id> --migration-file migrations/20260604010301_baseline.sql
   ```

3. **Verify the migration was recorded:**
   ```
   mcp list_migrations --project-id <project-id>
   ```

4. **Regenerate TypeScript types:**
   ```
   mcp generate_typescript_types --project-id <project-id> --output-file lib/database.types.ts
   ```

5. **Check security and performance advisors:**
   ```
   mcp get_advisors --project-id <project-id>
   ```

## Setting Up a New Environment

To set up a new Supabase project from scratch:

1. Create a new Supabase project
2. Retrieve the project ID and service role key
3. Apply all migrations in order:
   ```bash
   for file in migrations/*.sql; do
     mcp apply_migration --project-id <project-id> --migration-file "$file"
   done
   ```
4. Regenerate types: `mcp generate_typescript_types --project-id <project-id>`
5. Verify with advisors: `mcp get_advisors --project-id <project-id>`

## Important Rules

- **Forward-only**: Migrations are immutable once merged. If a correction is needed, add a new migration rather than editing an existing one.
- **No CLI**: Do not use `supabase` CLI commands for applying migrations. Use the MCP tools only.
- **RLS is enforced**: All tables have Row Level Security enabled. Service role actions work regardless of RLS policies.
- **Baseline first**: The baseline migration must be applied before any incremental migrations.

## Row Level Security (RLS)

All tables have RLS enabled. Key policy patterns:

- **Service role**: Can perform all operations (unrestricted)
- **Authenticated users**: Can view/modify their own data
- **Staff**: Can view/modify club-scoped data via `club_staff` table
- **Public reads**: Tournaments and other public features allow all authenticated reads

## Rollback Strategy

Rollbacks are handled by adding corrective migrations (no manual SQL execution). For example, if a column addition has an issue:

1. Add a new migration that fixes the issue (drops the bad column, adds a corrected one, etc.)
2. Apply the corrective migration through MCP
3. Update code if needed
4. The previous migration's changes remain in the history

## Types Generation

After applying new migrations, regenerate TypeScript types:

```bash
mcp generate_typescript_types --project-id <project-id> --output-file lib/database.types.ts
```

This ensures your client-side code stays in sync with the schema.
