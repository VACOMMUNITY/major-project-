alter table public.intellibus_profiles
  add column if not exists username text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.intellibus_profiles'::regclass
      and conname = 'intellibus_profile_username_format'
  ) then
    alter table public.intellibus_profiles
      add constraint intellibus_profile_username_format
      check (username is null or (role = 'parent' and username ~ '^[A-Za-z]+$'));
  end if;
end;
$$;

with username_candidates as (
  select
    id as user_id,
    raw_app_meta_data ->> 'username' as username,
    row_number() over (
      partition by lower(raw_app_meta_data ->> 'username')
      order by id
    ) as duplicate_rank
  from auth.users
  where raw_app_meta_data ->> 'intellibus_role' = 'parent'
    and raw_app_meta_data ->> 'username' ~ '^[A-Za-z]+$'
)
update public.intellibus_profiles as profile
set username = candidate.username
from username_candidates as candidate
where profile.user_id = candidate.user_id
  and profile.role = 'parent'
  and candidate.duplicate_rank = 1;

create unique index if not exists intellibus_profiles_username_unique
  on public.intellibus_profiles (lower(username))
  where username is not null;

comment on column public.intellibus_profiles.username is
  'Administrator-managed, alphabetic sign-in username for parent accounts; mirrored from auth.users app_metadata.username.';

create or replace function public.sync_intellibus_auth_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  app_role text := new.raw_app_meta_data ->> 'intellibus_role';
  assigned_student_id text := new.raw_app_meta_data ->> 'student_id';
  assigned_student_level text := new.raw_app_meta_data ->> 'student_level';
  assigned_username text := new.raw_app_meta_data ->> 'username';
begin
  if app_role is null or app_role not in ('parent', 'student') then
    return new;
  end if;

  insert into public.intellibus_profiles (
    user_id, role, student_id, student_level, username, is_minor
  )
  values (
    new.id,
    app_role,
    case when app_role = 'student' then assigned_student_id else null end,
    case when app_role = 'student' then assigned_student_level else null end,
    case when app_role = 'parent' then nullif(assigned_username, '') else null end,
    coalesce((new.raw_app_meta_data ->> 'is_minor')::boolean, true)
  )
  on conflict (user_id) do update
  set role = excluded.role,
      student_id = excluded.student_id,
      student_level = excluded.student_level,
      username = excluded.username,
      is_minor = excluded.is_minor;

  return new;
end;
$$;
