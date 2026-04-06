-- ============================================================
--  FinFlow v2 – Paywall
--  Execute no SQL Editor do Supabase (apenas as partes novas)
-- ============================================================

-- 1. Adiciona coluna is_pro na tabela de usuários (profiles)
--    Se você não tem a tabela profiles, ela será criada aqui.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  is_pro     boolean default false,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Usuário acessa próprio perfil"
  on public.profiles for all
  using (auth.uid() = id);

-- Cria perfil automaticamente quando usuário se cadastra
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Tabela de assinaturas
create table if not exists public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade not null,
  stripe_customer_id  text,
  stripe_subscription_id text,
  plan                text check (plan in ('monthly', 'yearly')),
  status              text check (status in ('active', 'canceled', 'past_due', 'trialing')),
  current_period_end  timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.subscriptions enable row level security;

create policy "Usuário acessa própria assinatura"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Apenas o service_role (webhook) pode inserir/atualizar assinaturas
-- (isso é feito pelo backend via service key, não pelo frontend)
