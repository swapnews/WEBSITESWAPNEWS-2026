-- Editorial Quality Engine scan history.
create table if not exists public.editorial_scans(
 id uuid primary key default gen_random_uuid(), article_id uuid references public.articles(id) on delete cascade,
 scanned_by uuid not null references public.profiles(id) on delete cascade,
 provider text not null default 'rules' check(provider in ('rules','gemini')),
 rule_version text not null, score integer not null check(score between 0 and 100), passed boolean not null,
 scores jsonb not null default '{}'::jsonb, stats jsonb not null default '{}'::jsonb,
 issues jsonb not null default '[]'::jsonb, input_hash text not null,
 fixed_content text, created_at timestamptz not null default now()
);
create index if not exists editorial_scans_article_idx on public.editorial_scans(article_id,created_at desc);
create index if not exists editorial_scans_quality_idx on public.editorial_scans(passed,score,created_at desc);
alter table public.editorial_scans enable row level security;
create policy "Editorial team read scans" on public.editorial_scans for select using(public.current_role() in ('wartawan','admin','super_admin'));
create policy "Editorial team create scans" on public.editorial_scans for insert with check(scanned_by=auth.uid() and public.current_role() in ('wartawan','admin','super_admin'));
