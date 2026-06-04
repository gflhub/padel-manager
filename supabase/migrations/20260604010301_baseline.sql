-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create clubs table
create table if not exists public.clubs (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zipcode text,
  country text,
  active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  email text,
  phone text,
  cpf text,
  avatar_url text,
  role text default 'client',
  active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create users table for global role management
create table if not exists public.users (
  id uuid primary key references auth.users on delete cascade,
  role text default 'client',
  active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create club_staff table
create table if not exists public.club_staff (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references public.clubs on delete cascade,
  profile_id uuid not null references public.profiles on delete cascade,
  role text not null,
  active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(club_id, profile_id)
);

-- Create courts table
create table if not exists public.courts (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references public.clubs on delete cascade,
  name text not null,
  court_type text,
  price_per_slot numeric,
  available boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create products table
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references public.clubs on delete cascade,
  name text not null,
  description text,
  unit_price numeric not null,
  category text,
  active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create reservations table
create table if not exists public.reservations (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references public.clubs on delete cascade,
  court_id uuid not null references public.courts on delete cascade,
  profile_id uuid not null references public.profiles on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  duration integer,
  players jsonb,
  total_price numeric,
  price_per_player numeric,
  status text default 'confirmed',
  checked_in_at timestamp with time zone,
  completed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  created_by uuid references public.profiles,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create comandas table
create table if not exists public.comandas (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references public.clubs on delete cascade,
  customer_name text not null,
  status text default 'open',
  total numeric default 0,
  notes text,
  opened_by uuid references public.profiles,
  opened_at timestamp with time zone default now(),
  closed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create comanda_items table
create table if not exists public.comanda_items (
  id uuid primary key default uuid_generate_v4(),
  comanda_id uuid not null references public.comandas on delete cascade,
  name text not null,
  quantity integer default 1,
  unit_price numeric not null,
  total_price numeric not null,
  product_id uuid references public.products,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create settings table
create table if not exists public.settings (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references public.clubs on delete cascade,
  key text not null,
  value text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(club_id, key)
);

-- Create club_members table
create table if not exists public.club_members (
  id uuid primary key default uuid_generate_v4(),
  club_id uuid not null references public.clubs on delete cascade,
  profile_id uuid references public.profiles on delete set null,
  name text not null,
  email text,
  phone text,
  cpf text,
  notes text,
  active boolean default true,
  joined_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes for performance
create index if not exists idx_profiles_active on public.profiles(active);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_club_staff_club_id on public.club_staff(club_id);
create index if not exists idx_club_staff_profile_id on public.club_staff(profile_id);
create index if not exists idx_club_staff_active on public.club_staff(active);
create index if not exists idx_courts_club_id on public.courts(club_id);
create index if not exists idx_products_club_id on public.products(club_id);
create index if not exists idx_reservations_club_id on public.reservations(club_id);
create index if not exists idx_reservations_profile_id on public.reservations(profile_id);
create index if not exists idx_reservations_date on public.reservations(date);
create index if not exists idx_comandas_club_id on public.comandas(club_id);
create index if not exists idx_comandas_status on public.comandas(status);
create index if not exists idx_comanda_items_comanda_id on public.comanda_items(comanda_id);
create index if not exists idx_club_members_club_id on public.club_members(club_id);

-- DEPRECATED: Row Level Security policies are no longer enforced.
-- Authorization is now handled by application-level code using Prisma,
-- not by database policies. These policies were used when Supabase Auth was
-- the primary authentication system, but the app now uses JWT token auth.
--
-- RLS is still enabled on tables for backward compatibility and potential future
-- fallback usage, but policies are archived and no longer actively used.
--
-- Previous RLS configuration (archived for reference):
--
-- alter table public.profiles enable row level security;
-- alter table public.users enable row level security;
-- alter table public.club_staff enable row level security;
-- alter table public.courts enable row level security;
-- alter table public.products enable row level security;
-- alter table public.reservations enable row level security;
-- alter table public.comandas enable row level security;
-- alter table public.comanda_items enable row level security;
-- alter table public.settings enable row level security;
-- alter table public.club_members enable row level security;
--
-- Policies (archived):
-- - Users can view and update their own profile
-- - Service role can manage users
-- - Club staff can view their club's staff, reservations, comandas, items, settings, and members
--
-- These have been replaced by explicit authorization checks in:
-- - lib/get-user-role.ts (fetch user's global role)
-- - lib/get-club-role.ts (fetch user's club role and context)
-- - Individual route handlers and actions that validate user permissions
