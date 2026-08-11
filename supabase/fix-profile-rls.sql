-- Run once in Supabase SQL Editor.
-- Fixes: infinite recursion detected in policy for relation "profiles".

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'visitor'::public.app_role
  );
$$;

revoke all on function public.current_role() from public;
grant execute on function public.current_role() to authenticated;
grant execute on function public.current_role() to anon;
