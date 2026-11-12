-- Migration: 20261108120000_mvsr_strict_database_restrictions.sql
-- Enforces strict Engineering College-only database restrictions, RLS policies,
-- parent-to-student authorization, and separation of student vs employee attendance.

-- 1. Helper function: Can an authenticated user read a specific student profile?
create or replace function public.can_read_intellibus_profile(p_target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.intellibus_profiles as target
    where target.user_id = p_target_user_id
      and (
        -- A: Direct self-access (student, driver, parent, employee, admin)
        target.user_id = (select auth.uid())

        -- B: MVSR Parent accessing their linked MVSR Engineering Student
        or (
          public.is_mvsr_test_parent((select auth.uid()))
          and public.is_mvsr_engineering_student(target.user_id)
          and exists (
            select 1
            from public.parent_student_links as link
            where link.parent_user_id = (select auth.uid())
              and link.student_user_id = target.user_id
          )
        )

        -- C: Non-MVSR Parent accessing their linked non-MVSR student
        or (
          not public.is_mvsr_test_parent((select auth.uid()))
          and not public.is_mvsr_engineering_student(target.user_id)
          and target.role = 'student'
          and target.institution is distinct from 'MVSR Engineering College'
          and exists (
            select 1
            from public.parent_student_links as link
            where link.parent_user_id = (select auth.uid())
              and link.student_user_id = target.user_id
          )
        )

        -- D: MVSR Driver accessing assigned MVSR Engineering Students
        or (
          public.is_mvsr_test_driver((select auth.uid()))
          and public.is_mvsr_engineering_student(target.user_id)
          and target.route_id = 'MVSR-ROUTE-01'
        )

        -- E: Administrator access
        or exists (
          select 1
          from public.intellibus_profiles as admin_p
          where admin_p.user_id = (select auth.uid())
            and admin_p.role = 'admin'
        )
      )
  );
$$;

revoke all on function public.can_read_intellibus_profile(uuid) from public, anon;
grant execute on function public.can_read_intellibus_profile(uuid) to authenticated, service_role;

-- 2. Update RLS policies on public.intellibus_profiles
drop policy if exists intellibus_profiles_read_self on public.intellibus_profiles;
drop policy if exists intellibus_profiles_read_authorized on public.intellibus_profiles;
create policy intellibus_profiles_read_authorized
  on public.intellibus_profiles for select to authenticated
  using (public.can_read_intellibus_profile(user_id));

-- 3. Update RLS policies on public.parent_student_links
drop policy if exists parent_student_links_read_related on public.parent_student_links;
create policy parent_student_links_read_related
  on public.parent_student_links for select to authenticated
  using (
    -- Parent reading their link
    (
      parent_user_id = (select auth.uid())
      and (
        (
          public.is_mvsr_test_parent((select auth.uid()))
          and public.is_mvsr_engineering_student(student_user_id)
        )
        or (
          not public.is_mvsr_test_parent((select auth.uid()))
          and not public.is_mvsr_engineering_student(student_user_id)
        )
      )
    )
    -- Student reading their link
    or (
      student_user_id = (select auth.uid())
      and (
        (
          public.is_mvsr_engineering_student((select auth.uid()))
          and public.is_mvsr_test_parent(parent_user_id)
        )
        or (
          not public.is_mvsr_engineering_student((select auth.uid()))
          and not public.is_mvsr_test_parent(parent_user_id)
        )
      )
    )
    -- Admin access
    or exists (
      select 1
      from public.intellibus_profiles as admin_p
      where admin_p.user_id = (select auth.uid())
        and admin_p.role = 'admin'
    )
  );

-- 4. Attendance Separation & Data Integrity Trigger
-- Ensure that only student accounts are ever stored in transport_attendance.
-- Employee records must never be mixed with student attendance.
create or replace function public.validate_transport_attendance_student()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_profile public.intellibus_profiles%rowtype;
  target_route public.intellibus_routes%rowtype;
  target_trip public.transport_trips%rowtype;
begin
  select * into target_profile
  from public.intellibus_profiles
  where user_id = new.student_user_id;

  if target_profile.user_id is null then
    raise exception 'Target student profile does not exist.';
  end if;

  -- Strictly prohibit employees or non-student roles from student attendance
  if target_profile.role <> 'student' then
    raise exception 'Attendance violation: only student accounts can be recorded in student transport attendance. Attempted role: %', target_profile.role;
  end if;

  select * into target_trip
  from public.transport_trips
  where trip_id = new.trip_id;

  if target_trip.trip_id is not null then
    select * into target_route
    from public.intellibus_routes
    where route_id = target_trip.route_id;

    -- If this is the MVSR Engineering route, ensure the student is an MVSR Engineering student
    if target_route.dataset_code = 'mvsr_engineering_test' or target_route.route_id = 'MVSR-ROUTE-01' then
      if not public.is_mvsr_engineering_student(target_profile.user_id) then
        raise exception 'Cross-organization access violation: only MVSR Engineering College students can be marked on MVSR-ROUTE-01.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_transport_attendance_student() from public, anon, authenticated;
grant execute on function public.validate_transport_attendance_student() to service_role;

drop trigger if exists trg_validate_transport_attendance_student on public.transport_attendance;
create trigger trg_validate_transport_attendance_student
  before insert or update on public.transport_attendance
  for each row execute function public.validate_transport_attendance_student();

-- 5. Additional Safeguard on Parent-Student Links
-- Prevent linking an MVSR parent to a non-MVSR student, or a non-MVSR parent to an MVSR student
create or replace function public.validate_mvsr_parent_student_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_mvsr_test_parent(new.parent_user_id) then
    if not public.is_mvsr_engineering_student(new.student_user_id) then
      raise exception 'MVSR test parents may only be linked to verified MVSR Engineering College students.';
    end if;
  end if;

  if public.is_mvsr_engineering_student(new.student_user_id) then
    if not public.is_mvsr_test_parent(new.parent_user_id) then
      raise exception 'MVSR Engineering College students may only be linked to authorized MVSR test parents.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_mvsr_parent_student_link() from public, anon, authenticated;
grant execute on function public.validate_mvsr_parent_student_link() to service_role;

drop trigger if exists trg_validate_mvsr_parent_student_link on public.parent_student_links;
create trigger trg_validate_mvsr_parent_student_link
  before insert or update on public.parent_student_links
  for each row execute function public.validate_mvsr_parent_student_link();
