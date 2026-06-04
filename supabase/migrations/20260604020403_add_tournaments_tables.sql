-- Create club_tournaments table
create table if not exists public.club_tournaments (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references public.clubs on delete cascade,
  name text not null,
  description text,
  start_date date not null,
  end_date date not null,
  max_participants integer not null,
  entry_fee numeric default 0,
  status text default 'planning',
  created_by uuid references public.profiles on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create tournament_registrations table
create table if not exists public.tournament_registrations (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references public.club_tournaments on delete cascade,
  profile_id uuid not null references public.profiles on delete cascade,
  registered_at timestamp with time zone default now(),
  cancelled_at timestamp with time zone,
  unique(tournament_id, profile_id)
);

-- Create indexes
create index if not exists idx_club_tournaments_club_id on public.club_tournaments(club_id);
create index if not exists idx_club_tournaments_status on public.club_tournaments(status);
create index if not exists idx_tournament_registrations_tournament_id on public.tournament_registrations(tournament_id);
create index if not exists idx_tournament_registrations_profile_id on public.tournament_registrations(profile_id);

-- Enable RLS
alter table public.club_tournaments enable row level security;
alter table public.tournament_registrations enable row level security;

-- RLS Policies for club_tournaments
create policy "Everyone can view club tournaments" on public.club_tournaments
  for select using (true);

create policy "Staff can manage club tournaments" on public.club_tournaments
  for all using (
    auth.uid() in (
      select profile_id from public.club_staff where club_id = club_tournaments.club_id and active = true
    )
  );

create policy "Service role can manage tournaments" on public.club_tournaments
  for all using (auth.role() = 'service_role');

-- RLS Policies for tournament_registrations
create policy "Everyone can view tournament registrations" on public.tournament_registrations
  for select using (true);

create policy "Users can register themselves" on public.tournament_registrations
  for insert with check (profile_id = auth.uid());

create policy "Users can cancel their own registration" on public.tournament_registrations
  for update using (profile_id = auth.uid());

create policy "Staff can manage registrations for their club" on public.tournament_registrations
  for all using (
    exists (
      select 1 from public.club_tournaments
      where club_tournaments.id = tournament_registrations.tournament_id
        and auth.uid() in (
          select profile_id from public.club_staff where club_id = club_tournaments.club_id and active = true
        )
    )
  );

create policy "Service role can manage registrations" on public.tournament_registrations
  for all using (auth.role() = 'service_role');
