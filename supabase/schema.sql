-- Game of Deals — قاعدة بيانات الحسابات وسجل اللعب
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run

-- سجل المباريات: صف لكل مباراة لكل لاعب مسجّل
create table if not exists public.game_results (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  played_at  timestamptz not null default now(),
  players    smallint not null check (players between 2 and 6),
  won        boolean  not null,
  sets       smallint not null check (sets between 0 and 30),
  rounds     integer  not null check (rounds between 0 and 100000),
  minutes    integer  not null check (minutes between 0 and 1440)
);
create index if not exists game_results_user_idx on public.game_results (user_id, played_at desc);

-- الخصوصية: كل لاعب يقرأ ويضيف سجله هو فقط، ولا يقدر أحد يعدّل أو يحذف سجل غيره
alter table public.game_results enable row level security;
drop policy if exists "read own results"   on public.game_results;
drop policy if exists "insert own results" on public.game_results;
create policy "read own results"   on public.game_results for select to authenticated using (user_id = (select auth.uid()));
create policy "insert own results" on public.game_results for insert to authenticated with check (user_id = (select auth.uid()));
revoke all on public.game_results from anon;
grant select, insert on public.game_results to authenticated;

-- حذف الحساب: يحذف الحساب وكل سجله نهائياً (يستدعيه صاحب الحساب فقط)
create or replace function public.delete_me() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;
