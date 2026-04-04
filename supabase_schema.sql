-- ============================================================
--  FinFlow – Script SQL para o Supabase
--  Execute no SQL Editor do seu projeto Supabase
-- ============================================================

-- 1. Tabela de Transações
create table public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  description text not null,
  category    text not null,
  value       numeric(12, 2) not null,
  type        text check (type in ('income', 'expense')) not null,
  date        date not null,
  created_at  timestamptz default now()
);

-- 2. Tabela de Metas
create table public.goals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  name       text not null,
  target     numeric(12, 2) not null,
  current    numeric(12, 2) default 0,
  created_at timestamptz default now()
);

-- 3. Row Level Security (RLS) – cada usuário vê só os próprios dados
alter table public.transactions enable row level security;
alter table public.goals enable row level security;

create policy "Usuário acessa próprias transações"
  on public.transactions for all
  using (auth.uid() = user_id);

create policy "Usuário acessa próprias metas"
  on public.goals for all
  using (auth.uid() = user_id);
