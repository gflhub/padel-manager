-- Create payments table
create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references public.clubs on delete cascade,
  comanda_id uuid references public.comandas on delete set null,
  reservation_id uuid references public.reservations on delete set null,
  amount numeric not null,
  method text not null,
  created_by uuid references public.profiles on delete set null,
  created_at timestamp with time zone default now()
);

-- Create indexes
create index if not exists idx_payments_club_id on public.payments(club_id);
create index if not exists idx_payments_comanda_id on public.payments(comanda_id);
create index if not exists idx_payments_reservation_id on public.payments(reservation_id);
create index if not exists idx_payments_created_at on public.payments(created_at);

-- Enable RLS
alter table public.payments enable row level security;

-- RLS Policies
create policy "Staff can view club payments" on public.payments
  for select using (
    auth.uid() in (
      select profile_id from public.club_staff where club_id = payments.club_id and active = true
    )
  );

create policy "Service role can manage payments" on public.payments
  for all using (auth.role() = 'service_role');

-- Allow users to view their own reservation payments
create policy "Users can view their reservation payments" on public.payments
  for select using (
    exists (
      select 1 from public.reservations
      where reservations.id = payments.reservation_id
        and reservations.profile_id = auth.uid()
    )
  );
