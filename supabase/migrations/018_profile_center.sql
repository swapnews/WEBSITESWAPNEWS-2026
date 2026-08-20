-- 018_profile_center.sql
-- Pusat profil Member/Wartawan dan rekening payout privat.

alter table public.profiles
  add column if not exists bio text,
  add column if not exists birth_date date,
  add column if not exists gender text,
  add column if not exists profession text,
  add column if not exists city text,
  add column if not exists province text,
  add column if not exists postal_code text,
  add column if not exists press_card_number text;

create table if not exists public.profile_payout_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  payout_type text not null default 'bank' check (payout_type in ('bank', 'ewallet')),
  provider_name text not null,
  account_number text not null,
  account_holder text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profile_payout_accounts enable row level security;

revoke all on table public.profile_payout_accounts from anon;
grant select, insert, update, delete on table public.profile_payout_accounts to authenticated;

drop policy if exists "Users read own payout account" on public.profile_payout_accounts;
create policy "Users read own payout account"
on public.profile_payout_accounts for select
using (auth.uid() = user_id);

drop policy if exists "Users create own payout account" on public.profile_payout_accounts;
create policy "Users create own payout account"
on public.profile_payout_accounts for insert
with check (auth.uid() = user_id);

drop policy if exists "Users update own payout account" on public.profile_payout_accounts;
create policy "Users update own payout account"
on public.profile_payout_accounts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users delete own payout account" on public.profile_payout_accounts;
create policy "Users delete own payout account"
on public.profile_payout_accounts for delete
using (auth.uid() = user_id);

drop trigger if exists profile_payout_accounts_set_updated_at on public.profile_payout_accounts;
create trigger profile_payout_accounts_set_updated_at
before update on public.profile_payout_accounts
for each row execute function public.set_updated_at();
