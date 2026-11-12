alter table public.intellibus_profiles
  add column if not exists driver_id text;

alter table public.intellibus_profiles
  drop constraint if exists intellibus_profiles_role_check,
  drop constraint if exists intellibus_profile_role_fields,
  drop constraint if exists intellibus_profile_username_format;

alter table public.intellibus_profiles
  add constraint intellibus_profiles_role_check
    check (role in ('parent', 'student', 'school-driver', 'company-driver', 'employee', 'admin')),
  add constraint intellibus_profile_role_fields check (
    (
      role = 'parent'
      and student_id is null
      and student_level is null
      and driver_id is null
    )
    or (
      role = 'student'
      and student_id is not null
      and student_level is not null
      and driver_id is null
      and username is null
    )
    or (
      role in ('school-driver', 'company-driver')
      and nullif(btrim(driver_id), '') is not null
      and student_id is null
      and student_level is null
      and username is null
    )
    or (
      role = 'employee'
      and username is not null
      and username ~ '^[A-Za-z]+$'
      and student_id is null
      and student_level is null
      and driver_id is null
    )
    or (
      role = 'admin'
      and student_id is null
      and student_level is null
      and driver_id is null
      and username is null
    )
  ),
  add constraint intellibus_profile_username_format
    check (username is null or (role in ('parent', 'employee') and username ~ '^[A-Za-z]+$'));

create unique index if not exists intellibus_profiles_driver_id_unique
  on public.intellibus_profiles (driver_id)
  where driver_id is not null;

comment on column public.intellibus_profiles.driver_id is
  'Administrator-managed driver sign-in ID for school/college and company driver accounts.';

create or replace function public.sync_intellibus_auth_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  app_role text := new.raw_app_meta_data ->> 'intellibus_role';
  assigned_student_id text := nullif(btrim(new.raw_app_meta_data ->> 'student_id'), '');
  assigned_student_level text := new.raw_app_meta_data ->> 'student_level';
  assigned_driver_id text := nullif(btrim(new.raw_app_meta_data ->> 'driver_id'), '');
  assigned_username text := nullif(btrim(new.raw_app_meta_data ->> 'username'), '');
begin
  if app_role is null or app_role not in ('parent', 'student', 'school-driver', 'company-driver', 'employee', 'admin') then
    return new;
  end if;

  if app_role = 'student' and (
    assigned_student_id is null
    or assigned_student_level not in ('engineering-student', 'junior-student')
  ) then
    return new;
  end if;
  if app_role in ('school-driver', 'company-driver') and assigned_driver_id is null then
    return new;
  end if;
  if app_role = 'employee' and (
    assigned_username is null or assigned_username !~ '^[A-Za-z]+$'
  ) then
    return new;
  end if;
  if app_role = 'parent' and assigned_username !~ '^[A-Za-z]+$' then
    assigned_username := null;
  end if;

  insert into public.intellibus_profiles (
    user_id, role, student_id, student_level, driver_id, username, is_minor
  )
  values (
    new.id,
    app_role,
    case when app_role = 'student' then assigned_student_id else null end,
    case when app_role = 'student' then assigned_student_level else null end,
    case when app_role in ('school-driver', 'company-driver') then assigned_driver_id else null end,
    case when app_role in ('parent', 'employee') then assigned_username else null end,
    case
      when app_role = 'student'
        and lower(coalesce(new.raw_app_meta_data ->> 'is_minor', '')) in ('true', 'false')
        then (new.raw_app_meta_data ->> 'is_minor')::boolean
      else true
    end
  )
  on conflict (user_id) do update
  set role = excluded.role,
      student_id = excluded.student_id,
      student_level = excluded.student_level,
      driver_id = excluded.driver_id,
      username = excluded.username,
      is_minor = excluded.is_minor;

  return new;
end;
$$;

with account_candidates as (
  select
    id as user_id,
    raw_app_meta_data ->> 'intellibus_role' as role,
    case
      when raw_app_meta_data ->> 'intellibus_role' in ('school-driver', 'company-driver')
        then nullif(btrim(raw_app_meta_data ->> 'driver_id'), '')
      else null
    end as driver_id,
    case
      when raw_app_meta_data ->> 'intellibus_role' = 'employee'
        then nullif(btrim(raw_app_meta_data ->> 'username'), '')
      else null
    end as username,
    row_number() over (
      partition by case
        when raw_app_meta_data ->> 'intellibus_role' = 'employee'
          then 'username:' || lower(raw_app_meta_data ->> 'username')
        when raw_app_meta_data ->> 'intellibus_role' in ('school-driver', 'company-driver')
          then 'driver:' || lower(raw_app_meta_data ->> 'driver_id')
        else 'admin:' || id::text
      end
      order by id
    ) as duplicate_rank
  from auth.users
  where raw_app_meta_data ->> 'intellibus_role' in ('school-driver', 'company-driver', 'employee', 'admin')
    and (
      raw_app_meta_data ->> 'intellibus_role' = 'admin'
      or
      (
        raw_app_meta_data ->> 'intellibus_role' in ('school-driver', 'company-driver')
        and nullif(btrim(raw_app_meta_data ->> 'driver_id'), '') is not null
      )
      or (
        raw_app_meta_data ->> 'intellibus_role' = 'employee'
        and raw_app_meta_data ->> 'username' ~ '^[A-Za-z]+$'
      )
    )
)
insert into public.intellibus_profiles (user_id, role, driver_id, username)
select candidate.user_id, candidate.role, candidate.driver_id, candidate.username
from account_candidates as candidate
where candidate.duplicate_rank = 1
  and (
    candidate.username is null
    or not exists (
      select 1
      from public.intellibus_profiles as existing_profile
      where lower(existing_profile.username) = lower(candidate.username)
    )
  )
on conflict (user_id) do nothing;
