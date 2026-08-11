-- Editorial workflow, audit trail, and scheduled publishing.
-- Run after 008_homepage_control.sql.
alter type public.article_status add value if not exists 'archived';
alter table public.articles add column if not exists scheduled_at timestamptz;
alter table public.articles add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;
alter table public.articles add column if not exists reviewed_at timestamptz;

create table if not exists public.editorial_notes (
 id uuid primary key default gen_random_uuid(), article_id uuid not null references public.articles(id) on delete cascade,
 author_id uuid not null references public.profiles(id) on delete cascade,
 note text not null check(char_length(note) between 2 and 2000), created_at timestamptz not null default now()
);
create table if not exists public.article_audit_log (
 id bigint generated always as identity primary key, article_id uuid not null references public.articles(id) on delete cascade,
 actor_id uuid references public.profiles(id) on delete set null, action text not null,
 from_status text, to_status text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists articles_workflow_idx on public.articles(status,scheduled_at,published_at desc);
create index if not exists editorial_notes_article_idx on public.editorial_notes(article_id,created_at desc);
create index if not exists audit_article_idx on public.article_audit_log(article_id,created_at desc);
alter table public.editorial_notes enable row level security;
alter table public.article_audit_log enable row level security;
create policy "Editorial team read notes" on public.editorial_notes for select using (public.current_role() in ('wartawan','admin','super_admin'));
create policy "Editorial team create notes" on public.editorial_notes for insert with check (author_id=auth.uid() and public.current_role() in ('wartawan','admin','super_admin'));
create policy "Admins read audit log" on public.article_audit_log for select using (public.current_role() in ('admin','super_admin'));

create or replace function public.audit_article_status() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.status is distinct from new.status then
  insert into public.article_audit_log(article_id,actor_id,action,from_status,to_status)
  values(new.id,auth.uid(),'status_changed',old.status,new.status);
 end if; return new;
end; $$;
drop trigger if exists articles_audit_status on public.articles;
create trigger articles_audit_status after update on public.articles for each row execute function public.audit_article_status();

create or replace function public.publish_scheduled_articles() returns integer language plpgsql security definer set search_path=public as $$
declare affected integer;
begin
 update public.articles set status='published',published_at=coalesce(scheduled_at,now()),updated_at=now()
 where status='scheduled' and scheduled_at is not null and scheduled_at<=now();
 get diagnostics affected=row_count; return affected;
end; $$;
revoke all on function public.publish_scheduled_articles() from public;
grant execute on function public.publish_scheduled_articles() to service_role;
