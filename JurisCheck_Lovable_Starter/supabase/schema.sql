-- Execute no SQL Editor do Supabase. Revise antes de usar com dados reais.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  trial_started_at timestamptz not null default now(),
  plan text not null default 'trial' check (plan in ('trial','weekly','monthly','annual')),
  subscription_status text not null default 'trialing'
);
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  status text not null default 'queued',
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.reviews enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "reviews_select_own" on public.reviews for select using (auth.uid() = user_id);
create policy "reviews_insert_own" on public.reviews for insert with check (auth.uid() = user_id);
create policy "reviews_delete_own" on public.reviews for delete using (auth.uid() = user_id);
-- Não crie política pública para leitura de documentos. Configure bucket privado e funções server-side.
