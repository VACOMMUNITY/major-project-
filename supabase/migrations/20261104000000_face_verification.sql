create table if not exists public.intellibus_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('parent', 'student')),
  student_id text unique,
  student_level text check (student_level in ('engineering-student', 'junior-student')),
  is_minor boolean not null default true,
  created_at timestamptz not null default now(),
  constraint intellibus_profile_role_fields check (
    (role = 'parent' and student_id is null and student_level is null)
    or (role = 'student' and student_id is not null and student_level is not null)
  )
);

comment on table public.intellibus_profiles is
  'Trusted role mapping for IntelliBus face verification. Provision from Supabase Auth app_metadata using an administrator/service role only.';
comment on column public.intellibus_profiles.is_minor is
  'Admin-managed consent safeguard; defaults to minor so student enrollment requires linked guardian consent until explicitly marked adult.';

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
begin
  if app_role is null or app_role not in ('parent', 'student') then
    return new;
  end if;

  insert into public.intellibus_profiles (user_id, role, student_id, student_level, is_minor)
  values (
    new.id,
    app_role,
    case when app_role = 'student' then assigned_student_id else null end,
    case when app_role = 'student' then assigned_student_level else null end,
    coalesce((new.raw_app_meta_data ->> 'is_minor')::boolean, true)
  )
  on conflict (user_id) do update
  set role = excluded.role,
      student_id = excluded.student_id,
      student_level = excluded.student_level,
      is_minor = excluded.is_minor;

  return new;
end;
$$;

revoke all on function public.sync_intellibus_auth_profile() from public, anon, authenticated;

drop trigger if exists sync_intellibus_auth_profile on auth.users;
create trigger sync_intellibus_auth_profile
  after insert on auth.users
  for each row execute function public.sync_intellibus_auth_profile();

drop trigger if exists sync_intellibus_auth_profile_metadata on auth.users;
create trigger sync_intellibus_auth_profile_metadata
  after update of raw_app_meta_data on auth.users
  for each row execute function public.sync_intellibus_auth_profile();

insert into public.intellibus_profiles (user_id, role, student_id, student_level, is_minor)
select
  id,
  raw_app_meta_data ->> 'intellibus_role',
  case when raw_app_meta_data ->> 'intellibus_role' = 'student'
    then raw_app_meta_data ->> 'student_id' else null end,
  case when raw_app_meta_data ->> 'intellibus_role' = 'student'
    then raw_app_meta_data ->> 'student_level' else null end,
  case
    when lower(coalesce(raw_app_meta_data ->> 'is_minor', '')) in ('true', 'false')
      then (raw_app_meta_data ->> 'is_minor')::boolean
    else true
  end
from auth.users
where raw_app_meta_data ->> 'intellibus_role' = 'parent'
   or (
     raw_app_meta_data ->> 'intellibus_role' = 'student'
     and nullif(raw_app_meta_data ->> 'student_id', '') is not null
     and raw_app_meta_data ->> 'student_level' in ('engineering-student', 'junior-student')
   )
on conflict (user_id) do nothing;

create table if not exists public.parent_student_links (
  parent_user_id uuid not null references public.intellibus_profiles (user_id) on delete cascade,
  student_user_id uuid not null references public.intellibus_profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (parent_user_id, student_user_id),
  constraint parent_student_distinct check (parent_user_id <> student_user_id)
);

create or replace function public.validate_parent_student_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_role text;
  student_role text;
begin
  select role into parent_role
  from public.intellibus_profiles
  where user_id = new.parent_user_id;

  select role into student_role
  from public.intellibus_profiles
  where user_id = new.student_user_id;

  if parent_role is distinct from 'parent' or student_role is distinct from 'student' then
    raise exception 'Parent-student links must join a parent to a student account.';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_parent_student_link() from public, anon, authenticated;

drop trigger if exists validate_parent_student_link on public.parent_student_links;
create trigger validate_parent_student_link
  before insert or update on public.parent_student_links
  for each row execute function public.validate_parent_student_link();

create table if not exists public.biometric_consents (
  consent_id uuid primary key default gen_random_uuid(),
  subject_user_id uuid not null references public.intellibus_profiles (user_id) on delete cascade,
  consented_by uuid not null references auth.users (id) on delete cascade,
  consent_type text not null check (consent_type in ('subject', 'guardian')),
  consent_version text not null,
  consented_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.face_enrollments (
  user_id uuid primary key references public.intellibus_profiles (user_id) on delete cascade,
  provider_face_id text,
  enrolled_at timestamptz,
  attempts_used smallint not null default 0 check (attempts_used between 0 and 3),
  attempt_window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  verified_at timestamptz,
  verified_session_id uuid,
  updated_at timestamptz not null default now()
);

comment on table public.face_enrollments is
  'Server-only pointer to an AWS Rekognition face vector; camera images and face vectors are never stored in Supabase.';

create table if not exists public.face_email_challenges (
  challenge_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.intellibus_profiles (user_id) on delete cascade,
  delivery_type text not null check (delivery_type in ('email', 'sms')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  consumed_at timestamptz
);

create table if not exists public.face_enrollment_lock (
  lock_id boolean primary key default true check (lock_id),
  claimed_by uuid references auth.users (id) on delete set null,
  claimed_until timestamptz
);
insert into public.face_enrollment_lock (lock_id)
values (true)
on conflict (lock_id) do nothing;

alter table public.intellibus_profiles enable row level security;
alter table public.parent_student_links enable row level security;
alter table public.biometric_consents enable row level security;
alter table public.face_enrollments enable row level security;
alter table public.face_email_challenges enable row level security;
alter table public.face_enrollment_lock enable row level security;

drop policy if exists intellibus_profiles_read_self on public.intellibus_profiles;
create policy intellibus_profiles_read_self
  on public.intellibus_profiles for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists parent_student_links_read_related on public.parent_student_links;
create policy parent_student_links_read_related
  on public.parent_student_links for select to authenticated
  using (parent_user_id = (select auth.uid()));

drop policy if exists biometric_consents_read_related on public.biometric_consents;
create policy biometric_consents_read_related
  on public.biometric_consents for select to authenticated
  using (
    subject_user_id = (select auth.uid())
    or consented_by = (select auth.uid())
  );

revoke all on public.intellibus_profiles from anon, authenticated;
grant select on public.intellibus_profiles to authenticated;
revoke all on public.parent_student_links from anon, authenticated;
grant select on public.parent_student_links to authenticated;
revoke all on public.biometric_consents from anon, authenticated;
grant select on public.biometric_consents to authenticated;
revoke all on public.face_enrollments from anon, authenticated;
revoke all on public.face_email_challenges from anon, authenticated;
revoke all on public.face_enrollment_lock from anon, authenticated;
grant all on public.intellibus_profiles to service_role;
grant all on public.parent_student_links to service_role;
grant all on public.biometric_consents to service_role;
grant all on public.face_enrollments to service_role;
grant all on public.face_email_challenges to service_role;
grant all on public.face_enrollment_lock to service_role;

create or replace function public.claim_face_enrollment(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.face_enrollment_lock
  set claimed_by = p_user_id,
      claimed_until = now() + interval '5 minutes'
  where lock_id = true
    and (claimed_until is null or claimed_until <= now());
  return found;
end;
$$;

create or replace function public.release_face_enrollment(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.face_enrollment_lock
  set claimed_by = null,
      claimed_until = null
  where lock_id = true
    and claimed_by = p_user_id;
$$;

revoke all on function public.claim_face_enrollment(uuid) from public, anon, authenticated;
revoke all on function public.release_face_enrollment(uuid) from public, anon, authenticated;
grant execute on function public.claim_face_enrollment(uuid) to service_role;
grant execute on function public.release_face_enrollment(uuid) to service_role;

create or replace function public.reserve_face_attempt(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.face_enrollments%rowtype;
  next_attempt smallint;
begin
  insert into public.face_enrollments (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into current_record
  from public.face_enrollments
  where user_id = p_user_id
  for update;

  if current_record.locked_until is not null
     and current_record.locked_until > now() then
    return jsonb_build_object(
      'allowed', false,
      'attemptsRemaining', 0,
      'lockedUntil', current_record.locked_until
    );
  end if;

  if current_record.attempt_window_started_at < now() - interval '15 minutes'
     or (current_record.locked_until is not null and current_record.locked_until <= now()) then
    current_record.attempts_used := 0;
  end if;

  if current_record.attempts_used >= 3 then
    update public.face_enrollments
    set locked_until = now() + interval '15 minutes',
        attempt_window_started_at = now(),
        updated_at = now()
    where user_id = p_user_id;
    return jsonb_build_object(
      'allowed', false,
      'attemptsRemaining', 0,
      'lockedUntil', now() + interval '15 minutes'
    );
  end if;

  next_attempt := current_record.attempts_used + 1;
  update public.face_enrollments
  set attempts_used = next_attempt,
      attempt_window_started_at = case
        when current_record.attempts_used = 0 then now()
        else current_record.attempt_window_started_at
      end,
      locked_until = case when next_attempt >= 3 then now() + interval '15 minutes' else null end,
      updated_at = now()
  where user_id = p_user_id;

  return jsonb_build_object(
    'allowed', true,
    'attemptsRemaining', 3 - next_attempt
  );
end;
$$;

create or replace function public.mark_face_verified(p_user_id uuid, p_session_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.face_enrollments
  set attempts_used = 0,
      attempt_window_started_at = now(),
      locked_until = null,
      verified_at = now(),
      verified_session_id = p_session_id,
      updated_at = now()
  where user_id = p_user_id
    and provider_face_id is not null;
$$;

revoke all on function public.reserve_face_attempt(uuid) from public, anon, authenticated;
revoke all on function public.mark_face_verified(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reserve_face_attempt(uuid) to service_role;
grant execute on function public.mark_face_verified(uuid, uuid) to service_role;
