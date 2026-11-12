-- Migration: 20261109120000_intermediate_college_test_dataset.sql
-- Intermediate College test dataset (123 students, 1 driver, 123 parents, 1 route, 5 stops)

-- 1. Insert Intermediate College Route
insert into public.intellibus_routes (route_id, route_name, assigned_driver_id, vehicle_id, route_status, dataset_code)
values ('INT-ROUTE-01', 'Intermediate College Test Route', 'JC-DRV-001', 'TEST-JC-BUS-001', 'TEST_ONLY', 'intermediate_college_test')
on conflict (route_id) do update set
  route_name = excluded.route_name,
  assigned_driver_id = excluded.assigned_driver_id,
  vehicle_id = excluded.vehicle_id,
  route_status = excluded.route_status,
  dataset_code = excluded.dataset_code;

-- 2. Insert 5 Stops for INT-ROUTE-01
insert into public.intellibus_route_stops (stop_id, route_id, stop_order, stop_name)
values ('INT-STOP-01', 'INT-ROUTE-01', 1, 'Intermediate Test Stop 01')
on conflict (stop_id) do update set
  route_id = excluded.route_id,
  stop_order = excluded.stop_order,
  stop_name = excluded.stop_name;
insert into public.intellibus_route_stops (stop_id, route_id, stop_order, stop_name)
values ('INT-STOP-02', 'INT-ROUTE-01', 2, 'Intermediate Test Stop 02')
on conflict (stop_id) do update set
  route_id = excluded.route_id,
  stop_order = excluded.stop_order,
  stop_name = excluded.stop_name;
insert into public.intellibus_route_stops (stop_id, route_id, stop_order, stop_name)
values ('INT-STOP-03', 'INT-ROUTE-01', 3, 'Intermediate Test Stop 03')
on conflict (stop_id) do update set
  route_id = excluded.route_id,
  stop_order = excluded.stop_order,
  stop_name = excluded.stop_name;
insert into public.intellibus_route_stops (stop_id, route_id, stop_order, stop_name)
values ('INT-STOP-04', 'INT-ROUTE-01', 4, 'Intermediate Test Stop 04')
on conflict (stop_id) do update set
  route_id = excluded.route_id,
  stop_order = excluded.stop_order,
  stop_name = excluded.stop_name;
insert into public.intellibus_route_stops (stop_id, route_id, stop_order, stop_name)
values ('INT-STOP-05', 'INT-ROUTE-01', 5, 'Intermediate Test Stop 05')
on conflict (stop_id) do update set
  route_id = excluded.route_id,
  stop_order = excluded.stop_order,
  stop_name = excluded.stop_name;

-- 3. Insert Driver Profile for JC-DRV-001
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, driver_id, route_id, assigned_bus)
values ('00000000-0000-0000-0000-000000000d02', 'driver', 'Test Intermediate College Driver 001', 'jcdrv001@example.test', 'Junior College', 'Junior College', 'JC-DRV-001', 'INT-ROUTE-01', 'TEST-JC-BUS-001')
on conflict (user_id) do update set
  role = excluded.role,
  full_name = excluded.full_name,
  driver_id = excluded.driver_id,
  route_id = excluded.route_id,
  assigned_bus = excluded.assigned_bus,
  institution = excluded.institution;

-- 4. Helper functions for Intermediate College role checking
create or replace function public.is_intermediate_college_student(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.intellibus_profiles
    where user_id = p_user_id
      and role = 'student'
      and student_id ~ '^INT-2026-\d{3}$'
      and institution = 'Junior College'
  );
$$;

create or replace function public.is_intermediate_college_driver(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.intellibus_profiles
    where user_id = p_user_id
      and role = 'driver'
      and driver_id = 'JC-DRV-001'
      and route_id = 'INT-ROUTE-01'
  );
$$;

create or replace function public.is_intermediate_college_parent(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.intellibus_profiles
    where user_id = p_user_id
      and role = 'parent'
      and parent_id ~ '^INT-PARENT-\d{3}$'
  );
$$;

revoke all on function public.is_intermediate_college_student(uuid) from public, anon;
grant execute on function public.is_intermediate_college_student(uuid) to authenticated, service_role;
revoke all on function public.is_intermediate_college_driver(uuid) from public, anon;
grant execute on function public.is_intermediate_college_driver(uuid) to authenticated, service_role;
revoke all on function public.is_intermediate_college_parent(uuid) from public, anon;
grant execute on function public.is_intermediate_college_parent(uuid) to authenticated, service_role;

-- 5. Insert 123 Students, Parents, and Links
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002001', 'student', 'Test Intermediate Student 001', 'int-2026-001@example.test', 'Junior College', 'Junior College', 'INT-2026-001', 'junior-student', 'MPC', '1st Year', 'A', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-001')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003001', 'parent', 'Parent of Test Intermediate Student 001', 'parent001@example.test', 'Junior College', 'Junior College', 'INT-PARENT-001')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000002001', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002002', 'student', 'Test Intermediate Student 002', 'int-2026-002@example.test', 'Junior College', 'Junior College', 'INT-2026-002', 'junior-student', 'BiPC', '1st Year', 'B', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-002')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003002', 'parent', 'Parent of Test Intermediate Student 002', 'parent002@example.test', 'Junior College', 'Junior College', 'INT-PARENT-002')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003002', '00000000-0000-0000-0000-000000002002', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002003', 'student', 'Test Intermediate Student 003', 'int-2026-003@example.test', 'Junior College', 'Junior College', 'INT-2026-003', 'junior-student', 'CEC', '1st Year', 'C', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-003')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003003', 'parent', 'Parent of Test Intermediate Student 003', 'parent003@example.test', 'Junior College', 'Junior College', 'INT-PARENT-003')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003003', '00000000-0000-0000-0000-000000002003', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002004', 'student', 'Test Intermediate Student 004', 'int-2026-004@example.test', 'Junior College', 'Junior College', 'INT-2026-004', 'junior-student', 'MEC', '1st Year', 'A', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-004')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003004', 'parent', 'Parent of Test Intermediate Student 004', 'parent004@example.test', 'Junior College', 'Junior College', 'INT-PARENT-004')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000002004', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002005', 'student', 'Test Intermediate Student 005', 'int-2026-005@example.test', 'Junior College', 'Junior College', 'INT-2026-005', 'junior-student', 'MPC', '1st Year', 'B', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-005')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003005', 'parent', 'Parent of Test Intermediate Student 005', 'parent005@example.test', 'Junior College', 'Junior College', 'INT-PARENT-005')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003005', '00000000-0000-0000-0000-000000002005', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002006', 'student', 'Test Intermediate Student 006', 'int-2026-006@example.test', 'Junior College', 'Junior College', 'INT-2026-006', 'junior-student', 'BiPC', '1st Year', 'C', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-006')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003006', 'parent', 'Parent of Test Intermediate Student 006', 'parent006@example.test', 'Junior College', 'Junior College', 'INT-PARENT-006')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003006', '00000000-0000-0000-0000-000000002006', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002007', 'student', 'Test Intermediate Student 007', 'int-2026-007@example.test', 'Junior College', 'Junior College', 'INT-2026-007', 'junior-student', 'CEC', '1st Year', 'A', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-007')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003007', 'parent', 'Parent of Test Intermediate Student 007', 'parent007@example.test', 'Junior College', 'Junior College', 'INT-PARENT-007')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003007', '00000000-0000-0000-0000-000000002007', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002008', 'student', 'Test Intermediate Student 008', 'int-2026-008@example.test', 'Junior College', 'Junior College', 'INT-2026-008', 'junior-student', 'MEC', '1st Year', 'B', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-008')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003008', 'parent', 'Parent of Test Intermediate Student 008', 'parent008@example.test', 'Junior College', 'Junior College', 'INT-PARENT-008')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003008', '00000000-0000-0000-0000-000000002008', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002009', 'student', 'Test Intermediate Student 009', 'int-2026-009@example.test', 'Junior College', 'Junior College', 'INT-2026-009', 'junior-student', 'MPC', '1st Year', 'C', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-009')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003009', 'parent', 'Parent of Test Intermediate Student 009', 'parent009@example.test', 'Junior College', 'Junior College', 'INT-PARENT-009')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003009', '00000000-0000-0000-0000-000000002009', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002010', 'student', 'Test Intermediate Student 010', 'int-2026-010@example.test', 'Junior College', 'Junior College', 'INT-2026-010', 'junior-student', 'BiPC', '1st Year', 'A', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-010')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003010', 'parent', 'Parent of Test Intermediate Student 010', 'parent010@example.test', 'Junior College', 'Junior College', 'INT-PARENT-010')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003010', '00000000-0000-0000-0000-000000002010', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002011', 'student', 'Test Intermediate Student 011', 'int-2026-011@example.test', 'Junior College', 'Junior College', 'INT-2026-011', 'junior-student', 'CEC', '1st Year', 'B', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-011')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003011', 'parent', 'Parent of Test Intermediate Student 011', 'parent011@example.test', 'Junior College', 'Junior College', 'INT-PARENT-011')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003011', '00000000-0000-0000-0000-000000002011', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002012', 'student', 'Test Intermediate Student 012', 'int-2026-012@example.test', 'Junior College', 'Junior College', 'INT-2026-012', 'junior-student', 'MEC', '1st Year', 'C', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-012')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003012', 'parent', 'Parent of Test Intermediate Student 012', 'parent012@example.test', 'Junior College', 'Junior College', 'INT-PARENT-012')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003012', '00000000-0000-0000-0000-000000002012', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002013', 'student', 'Test Intermediate Student 013', 'int-2026-013@example.test', 'Junior College', 'Junior College', 'INT-2026-013', 'junior-student', 'MPC', '1st Year', 'A', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-013')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003013', 'parent', 'Parent of Test Intermediate Student 013', 'parent013@example.test', 'Junior College', 'Junior College', 'INT-PARENT-013')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003013', '00000000-0000-0000-0000-000000002013', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002014', 'student', 'Test Intermediate Student 014', 'int-2026-014@example.test', 'Junior College', 'Junior College', 'INT-2026-014', 'junior-student', 'BiPC', '1st Year', 'B', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-014')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003014', 'parent', 'Parent of Test Intermediate Student 014', 'parent014@example.test', 'Junior College', 'Junior College', 'INT-PARENT-014')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003014', '00000000-0000-0000-0000-000000002014', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002015', 'student', 'Test Intermediate Student 015', 'int-2026-015@example.test', 'Junior College', 'Junior College', 'INT-2026-015', 'junior-student', 'CEC', '1st Year', 'C', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-015')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003015', 'parent', 'Parent of Test Intermediate Student 015', 'parent015@example.test', 'Junior College', 'Junior College', 'INT-PARENT-015')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003015', '00000000-0000-0000-0000-000000002015', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002016', 'student', 'Test Intermediate Student 016', 'int-2026-016@example.test', 'Junior College', 'Junior College', 'INT-2026-016', 'junior-student', 'MEC', '1st Year', 'A', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-016')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003016', 'parent', 'Parent of Test Intermediate Student 016', 'parent016@example.test', 'Junior College', 'Junior College', 'INT-PARENT-016')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003016', '00000000-0000-0000-0000-000000002016', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002017', 'student', 'Test Intermediate Student 017', 'int-2026-017@example.test', 'Junior College', 'Junior College', 'INT-2026-017', 'junior-student', 'MPC', '1st Year', 'B', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-017')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003017', 'parent', 'Parent of Test Intermediate Student 017', 'parent017@example.test', 'Junior College', 'Junior College', 'INT-PARENT-017')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003017', '00000000-0000-0000-0000-000000002017', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002018', 'student', 'Test Intermediate Student 018', 'int-2026-018@example.test', 'Junior College', 'Junior College', 'INT-2026-018', 'junior-student', 'BiPC', '1st Year', 'C', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-018')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003018', 'parent', 'Parent of Test Intermediate Student 018', 'parent018@example.test', 'Junior College', 'Junior College', 'INT-PARENT-018')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003018', '00000000-0000-0000-0000-000000002018', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002019', 'student', 'Test Intermediate Student 019', 'int-2026-019@example.test', 'Junior College', 'Junior College', 'INT-2026-019', 'junior-student', 'CEC', '1st Year', 'A', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-019')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003019', 'parent', 'Parent of Test Intermediate Student 019', 'parent019@example.test', 'Junior College', 'Junior College', 'INT-PARENT-019')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003019', '00000000-0000-0000-0000-000000002019', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002020', 'student', 'Test Intermediate Student 020', 'int-2026-020@example.test', 'Junior College', 'Junior College', 'INT-2026-020', 'junior-student', 'MEC', '1st Year', 'B', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-020')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003020', 'parent', 'Parent of Test Intermediate Student 020', 'parent020@example.test', 'Junior College', 'Junior College', 'INT-PARENT-020')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003020', '00000000-0000-0000-0000-000000002020', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002021', 'student', 'Test Intermediate Student 021', 'int-2026-021@example.test', 'Junior College', 'Junior College', 'INT-2026-021', 'junior-student', 'MPC', '1st Year', 'C', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-021')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003021', 'parent', 'Parent of Test Intermediate Student 021', 'parent021@example.test', 'Junior College', 'Junior College', 'INT-PARENT-021')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003021', '00000000-0000-0000-0000-000000002021', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002022', 'student', 'Test Intermediate Student 022', 'int-2026-022@example.test', 'Junior College', 'Junior College', 'INT-2026-022', 'junior-student', 'BiPC', '1st Year', 'A', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-022')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003022', 'parent', 'Parent of Test Intermediate Student 022', 'parent022@example.test', 'Junior College', 'Junior College', 'INT-PARENT-022')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003022', '00000000-0000-0000-0000-000000002022', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002023', 'student', 'Test Intermediate Student 023', 'int-2026-023@example.test', 'Junior College', 'Junior College', 'INT-2026-023', 'junior-student', 'CEC', '1st Year', 'B', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-023')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003023', 'parent', 'Parent of Test Intermediate Student 023', 'parent023@example.test', 'Junior College', 'Junior College', 'INT-PARENT-023')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003023', '00000000-0000-0000-0000-000000002023', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002024', 'student', 'Test Intermediate Student 024', 'int-2026-024@example.test', 'Junior College', 'Junior College', 'INT-2026-024', 'junior-student', 'MEC', '1st Year', 'C', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-024')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003024', 'parent', 'Parent of Test Intermediate Student 024', 'parent024@example.test', 'Junior College', 'Junior College', 'INT-PARENT-024')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003024', '00000000-0000-0000-0000-000000002024', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002025', 'student', 'Test Intermediate Student 025', 'int-2026-025@example.test', 'Junior College', 'Junior College', 'INT-2026-025', 'junior-student', 'MPC', '1st Year', 'A', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-025')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003025', 'parent', 'Parent of Test Intermediate Student 025', 'parent025@example.test', 'Junior College', 'Junior College', 'INT-PARENT-025')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003025', '00000000-0000-0000-0000-000000002025', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002026', 'student', 'Test Intermediate Student 026', 'int-2026-026@example.test', 'Junior College', 'Junior College', 'INT-2026-026', 'junior-student', 'BiPC', '1st Year', 'B', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-026')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003026', 'parent', 'Parent of Test Intermediate Student 026', 'parent026@example.test', 'Junior College', 'Junior College', 'INT-PARENT-026')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003026', '00000000-0000-0000-0000-000000002026', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002027', 'student', 'Test Intermediate Student 027', 'int-2026-027@example.test', 'Junior College', 'Junior College', 'INT-2026-027', 'junior-student', 'CEC', '1st Year', 'C', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-027')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003027', 'parent', 'Parent of Test Intermediate Student 027', 'parent027@example.test', 'Junior College', 'Junior College', 'INT-PARENT-027')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003027', '00000000-0000-0000-0000-000000002027', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002028', 'student', 'Test Intermediate Student 028', 'int-2026-028@example.test', 'Junior College', 'Junior College', 'INT-2026-028', 'junior-student', 'MEC', '1st Year', 'A', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-028')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003028', 'parent', 'Parent of Test Intermediate Student 028', 'parent028@example.test', 'Junior College', 'Junior College', 'INT-PARENT-028')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003028', '00000000-0000-0000-0000-000000002028', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002029', 'student', 'Test Intermediate Student 029', 'int-2026-029@example.test', 'Junior College', 'Junior College', 'INT-2026-029', 'junior-student', 'MPC', '1st Year', 'B', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-029')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003029', 'parent', 'Parent of Test Intermediate Student 029', 'parent029@example.test', 'Junior College', 'Junior College', 'INT-PARENT-029')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003029', '00000000-0000-0000-0000-000000002029', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002030', 'student', 'Test Intermediate Student 030', 'int-2026-030@example.test', 'Junior College', 'Junior College', 'INT-2026-030', 'junior-student', 'BiPC', '1st Year', 'C', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-030')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003030', 'parent', 'Parent of Test Intermediate Student 030', 'parent030@example.test', 'Junior College', 'Junior College', 'INT-PARENT-030')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003030', '00000000-0000-0000-0000-000000002030', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002031', 'student', 'Test Intermediate Student 031', 'int-2026-031@example.test', 'Junior College', 'Junior College', 'INT-2026-031', 'junior-student', 'CEC', '1st Year', 'A', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-031')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003031', 'parent', 'Parent of Test Intermediate Student 031', 'parent031@example.test', 'Junior College', 'Junior College', 'INT-PARENT-031')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003031', '00000000-0000-0000-0000-000000002031', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002032', 'student', 'Test Intermediate Student 032', 'int-2026-032@example.test', 'Junior College', 'Junior College', 'INT-2026-032', 'junior-student', 'MEC', '1st Year', 'B', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-032')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003032', 'parent', 'Parent of Test Intermediate Student 032', 'parent032@example.test', 'Junior College', 'Junior College', 'INT-PARENT-032')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003032', '00000000-0000-0000-0000-000000002032', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002033', 'student', 'Test Intermediate Student 033', 'int-2026-033@example.test', 'Junior College', 'Junior College', 'INT-2026-033', 'junior-student', 'MPC', '1st Year', 'C', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-033')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003033', 'parent', 'Parent of Test Intermediate Student 033', 'parent033@example.test', 'Junior College', 'Junior College', 'INT-PARENT-033')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003033', '00000000-0000-0000-0000-000000002033', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002034', 'student', 'Test Intermediate Student 034', 'int-2026-034@example.test', 'Junior College', 'Junior College', 'INT-2026-034', 'junior-student', 'BiPC', '1st Year', 'A', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-034')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003034', 'parent', 'Parent of Test Intermediate Student 034', 'parent034@example.test', 'Junior College', 'Junior College', 'INT-PARENT-034')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003034', '00000000-0000-0000-0000-000000002034', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002035', 'student', 'Test Intermediate Student 035', 'int-2026-035@example.test', 'Junior College', 'Junior College', 'INT-2026-035', 'junior-student', 'CEC', '1st Year', 'B', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-035')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003035', 'parent', 'Parent of Test Intermediate Student 035', 'parent035@example.test', 'Junior College', 'Junior College', 'INT-PARENT-035')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003035', '00000000-0000-0000-0000-000000002035', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002036', 'student', 'Test Intermediate Student 036', 'int-2026-036@example.test', 'Junior College', 'Junior College', 'INT-2026-036', 'junior-student', 'MEC', '1st Year', 'C', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-036')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003036', 'parent', 'Parent of Test Intermediate Student 036', 'parent036@example.test', 'Junior College', 'Junior College', 'INT-PARENT-036')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003036', '00000000-0000-0000-0000-000000002036', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002037', 'student', 'Test Intermediate Student 037', 'int-2026-037@example.test', 'Junior College', 'Junior College', 'INT-2026-037', 'junior-student', 'MPC', '1st Year', 'A', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-037')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003037', 'parent', 'Parent of Test Intermediate Student 037', 'parent037@example.test', 'Junior College', 'Junior College', 'INT-PARENT-037')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003037', '00000000-0000-0000-0000-000000002037', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002038', 'student', 'Test Intermediate Student 038', 'int-2026-038@example.test', 'Junior College', 'Junior College', 'INT-2026-038', 'junior-student', 'BiPC', '1st Year', 'B', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-038')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003038', 'parent', 'Parent of Test Intermediate Student 038', 'parent038@example.test', 'Junior College', 'Junior College', 'INT-PARENT-038')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003038', '00000000-0000-0000-0000-000000002038', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002039', 'student', 'Test Intermediate Student 039', 'int-2026-039@example.test', 'Junior College', 'Junior College', 'INT-2026-039', 'junior-student', 'CEC', '1st Year', 'C', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-039')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003039', 'parent', 'Parent of Test Intermediate Student 039', 'parent039@example.test', 'Junior College', 'Junior College', 'INT-PARENT-039')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003039', '00000000-0000-0000-0000-000000002039', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002040', 'student', 'Test Intermediate Student 040', 'int-2026-040@example.test', 'Junior College', 'Junior College', 'INT-2026-040', 'junior-student', 'MEC', '1st Year', 'A', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-040')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003040', 'parent', 'Parent of Test Intermediate Student 040', 'parent040@example.test', 'Junior College', 'Junior College', 'INT-PARENT-040')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003040', '00000000-0000-0000-0000-000000002040', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002041', 'student', 'Test Intermediate Student 041', 'int-2026-041@example.test', 'Junior College', 'Junior College', 'INT-2026-041', 'junior-student', 'MPC', '1st Year', 'B', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-041')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003041', 'parent', 'Parent of Test Intermediate Student 041', 'parent041@example.test', 'Junior College', 'Junior College', 'INT-PARENT-041')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003041', '00000000-0000-0000-0000-000000002041', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002042', 'student', 'Test Intermediate Student 042', 'int-2026-042@example.test', 'Junior College', 'Junior College', 'INT-2026-042', 'junior-student', 'BiPC', '1st Year', 'C', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-042')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003042', 'parent', 'Parent of Test Intermediate Student 042', 'parent042@example.test', 'Junior College', 'Junior College', 'INT-PARENT-042')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003042', '00000000-0000-0000-0000-000000002042', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002043', 'student', 'Test Intermediate Student 043', 'int-2026-043@example.test', 'Junior College', 'Junior College', 'INT-2026-043', 'junior-student', 'CEC', '1st Year', 'A', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-043')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003043', 'parent', 'Parent of Test Intermediate Student 043', 'parent043@example.test', 'Junior College', 'Junior College', 'INT-PARENT-043')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003043', '00000000-0000-0000-0000-000000002043', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002044', 'student', 'Test Intermediate Student 044', 'int-2026-044@example.test', 'Junior College', 'Junior College', 'INT-2026-044', 'junior-student', 'MEC', '1st Year', 'B', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-044')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003044', 'parent', 'Parent of Test Intermediate Student 044', 'parent044@example.test', 'Junior College', 'Junior College', 'INT-PARENT-044')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003044', '00000000-0000-0000-0000-000000002044', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002045', 'student', 'Test Intermediate Student 045', 'int-2026-045@example.test', 'Junior College', 'Junior College', 'INT-2026-045', 'junior-student', 'MPC', '1st Year', 'C', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-045')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003045', 'parent', 'Parent of Test Intermediate Student 045', 'parent045@example.test', 'Junior College', 'Junior College', 'INT-PARENT-045')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003045', '00000000-0000-0000-0000-000000002045', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002046', 'student', 'Test Intermediate Student 046', 'int-2026-046@example.test', 'Junior College', 'Junior College', 'INT-2026-046', 'junior-student', 'BiPC', '1st Year', 'A', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-046')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003046', 'parent', 'Parent of Test Intermediate Student 046', 'parent046@example.test', 'Junior College', 'Junior College', 'INT-PARENT-046')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003046', '00000000-0000-0000-0000-000000002046', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002047', 'student', 'Test Intermediate Student 047', 'int-2026-047@example.test', 'Junior College', 'Junior College', 'INT-2026-047', 'junior-student', 'CEC', '1st Year', 'B', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-047')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003047', 'parent', 'Parent of Test Intermediate Student 047', 'parent047@example.test', 'Junior College', 'Junior College', 'INT-PARENT-047')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003047', '00000000-0000-0000-0000-000000002047', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002048', 'student', 'Test Intermediate Student 048', 'int-2026-048@example.test', 'Junior College', 'Junior College', 'INT-2026-048', 'junior-student', 'MEC', '1st Year', 'C', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-048')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003048', 'parent', 'Parent of Test Intermediate Student 048', 'parent048@example.test', 'Junior College', 'Junior College', 'INT-PARENT-048')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003048', '00000000-0000-0000-0000-000000002048', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002049', 'student', 'Test Intermediate Student 049', 'int-2026-049@example.test', 'Junior College', 'Junior College', 'INT-2026-049', 'junior-student', 'MPC', '1st Year', 'A', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-049')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003049', 'parent', 'Parent of Test Intermediate Student 049', 'parent049@example.test', 'Junior College', 'Junior College', 'INT-PARENT-049')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003049', '00000000-0000-0000-0000-000000002049', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002050', 'student', 'Test Intermediate Student 050', 'int-2026-050@example.test', 'Junior College', 'Junior College', 'INT-2026-050', 'junior-student', 'BiPC', '1st Year', 'B', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-050')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003050', 'parent', 'Parent of Test Intermediate Student 050', 'parent050@example.test', 'Junior College', 'Junior College', 'INT-PARENT-050')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003050', '00000000-0000-0000-0000-000000002050', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002051', 'student', 'Test Intermediate Student 051', 'int-2026-051@example.test', 'Junior College', 'Junior College', 'INT-2026-051', 'junior-student', 'CEC', '1st Year', 'C', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-051')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003051', 'parent', 'Parent of Test Intermediate Student 051', 'parent051@example.test', 'Junior College', 'Junior College', 'INT-PARENT-051')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003051', '00000000-0000-0000-0000-000000002051', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002052', 'student', 'Test Intermediate Student 052', 'int-2026-052@example.test', 'Junior College', 'Junior College', 'INT-2026-052', 'junior-student', 'MEC', '1st Year', 'A', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-052')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003052', 'parent', 'Parent of Test Intermediate Student 052', 'parent052@example.test', 'Junior College', 'Junior College', 'INT-PARENT-052')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003052', '00000000-0000-0000-0000-000000002052', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002053', 'student', 'Test Intermediate Student 053', 'int-2026-053@example.test', 'Junior College', 'Junior College', 'INT-2026-053', 'junior-student', 'MPC', '1st Year', 'B', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-053')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003053', 'parent', 'Parent of Test Intermediate Student 053', 'parent053@example.test', 'Junior College', 'Junior College', 'INT-PARENT-053')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003053', '00000000-0000-0000-0000-000000002053', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002054', 'student', 'Test Intermediate Student 054', 'int-2026-054@example.test', 'Junior College', 'Junior College', 'INT-2026-054', 'junior-student', 'BiPC', '1st Year', 'C', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-054')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003054', 'parent', 'Parent of Test Intermediate Student 054', 'parent054@example.test', 'Junior College', 'Junior College', 'INT-PARENT-054')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003054', '00000000-0000-0000-0000-000000002054', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002055', 'student', 'Test Intermediate Student 055', 'int-2026-055@example.test', 'Junior College', 'Junior College', 'INT-2026-055', 'junior-student', 'CEC', '1st Year', 'A', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-055')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003055', 'parent', 'Parent of Test Intermediate Student 055', 'parent055@example.test', 'Junior College', 'Junior College', 'INT-PARENT-055')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003055', '00000000-0000-0000-0000-000000002055', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002056', 'student', 'Test Intermediate Student 056', 'int-2026-056@example.test', 'Junior College', 'Junior College', 'INT-2026-056', 'junior-student', 'MEC', '1st Year', 'B', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-056')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003056', 'parent', 'Parent of Test Intermediate Student 056', 'parent056@example.test', 'Junior College', 'Junior College', 'INT-PARENT-056')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003056', '00000000-0000-0000-0000-000000002056', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002057', 'student', 'Test Intermediate Student 057', 'int-2026-057@example.test', 'Junior College', 'Junior College', 'INT-2026-057', 'junior-student', 'MPC', '1st Year', 'C', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-057')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003057', 'parent', 'Parent of Test Intermediate Student 057', 'parent057@example.test', 'Junior College', 'Junior College', 'INT-PARENT-057')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003057', '00000000-0000-0000-0000-000000002057', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002058', 'student', 'Test Intermediate Student 058', 'int-2026-058@example.test', 'Junior College', 'Junior College', 'INT-2026-058', 'junior-student', 'BiPC', '1st Year', 'A', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-058')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003058', 'parent', 'Parent of Test Intermediate Student 058', 'parent058@example.test', 'Junior College', 'Junior College', 'INT-PARENT-058')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003058', '00000000-0000-0000-0000-000000002058', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002059', 'student', 'Test Intermediate Student 059', 'int-2026-059@example.test', 'Junior College', 'Junior College', 'INT-2026-059', 'junior-student', 'CEC', '1st Year', 'B', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-059')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003059', 'parent', 'Parent of Test Intermediate Student 059', 'parent059@example.test', 'Junior College', 'Junior College', 'INT-PARENT-059')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003059', '00000000-0000-0000-0000-000000002059', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002060', 'student', 'Test Intermediate Student 060', 'int-2026-060@example.test', 'Junior College', 'Junior College', 'INT-2026-060', 'junior-student', 'MEC', '1st Year', 'C', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-060')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003060', 'parent', 'Parent of Test Intermediate Student 060', 'parent060@example.test', 'Junior College', 'Junior College', 'INT-PARENT-060')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003060', '00000000-0000-0000-0000-000000002060', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002061', 'student', 'Test Intermediate Student 061', 'int-2026-061@example.test', 'Junior College', 'Junior College', 'INT-2026-061', 'junior-student', 'MPC', '1st Year', 'A', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-061')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003061', 'parent', 'Parent of Test Intermediate Student 061', 'parent061@example.test', 'Junior College', 'Junior College', 'INT-PARENT-061')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003061', '00000000-0000-0000-0000-000000002061', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002062', 'student', 'Test Intermediate Student 062', 'int-2026-062@example.test', 'Junior College', 'Junior College', 'INT-2026-062', 'junior-student', 'BiPC', '1st Year', 'B', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-062')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003062', 'parent', 'Parent of Test Intermediate Student 062', 'parent062@example.test', 'Junior College', 'Junior College', 'INT-PARENT-062')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003062', '00000000-0000-0000-0000-000000002062', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002063', 'student', 'Test Intermediate Student 063', 'int-2026-063@example.test', 'Junior College', 'Junior College', 'INT-2026-063', 'junior-student', 'CEC', '2nd Year', 'C', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-063')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003063', 'parent', 'Parent of Test Intermediate Student 063', 'parent063@example.test', 'Junior College', 'Junior College', 'INT-PARENT-063')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003063', '00000000-0000-0000-0000-000000002063', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002064', 'student', 'Test Intermediate Student 064', 'int-2026-064@example.test', 'Junior College', 'Junior College', 'INT-2026-064', 'junior-student', 'MEC', '2nd Year', 'A', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-064')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003064', 'parent', 'Parent of Test Intermediate Student 064', 'parent064@example.test', 'Junior College', 'Junior College', 'INT-PARENT-064')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003064', '00000000-0000-0000-0000-000000002064', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002065', 'student', 'Test Intermediate Student 065', 'int-2026-065@example.test', 'Junior College', 'Junior College', 'INT-2026-065', 'junior-student', 'MPC', '2nd Year', 'B', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-065')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003065', 'parent', 'Parent of Test Intermediate Student 065', 'parent065@example.test', 'Junior College', 'Junior College', 'INT-PARENT-065')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003065', '00000000-0000-0000-0000-000000002065', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002066', 'student', 'Test Intermediate Student 066', 'int-2026-066@example.test', 'Junior College', 'Junior College', 'INT-2026-066', 'junior-student', 'BiPC', '2nd Year', 'C', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-066')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003066', 'parent', 'Parent of Test Intermediate Student 066', 'parent066@example.test', 'Junior College', 'Junior College', 'INT-PARENT-066')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003066', '00000000-0000-0000-0000-000000002066', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002067', 'student', 'Test Intermediate Student 067', 'int-2026-067@example.test', 'Junior College', 'Junior College', 'INT-2026-067', 'junior-student', 'CEC', '2nd Year', 'A', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-067')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003067', 'parent', 'Parent of Test Intermediate Student 067', 'parent067@example.test', 'Junior College', 'Junior College', 'INT-PARENT-067')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003067', '00000000-0000-0000-0000-000000002067', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002068', 'student', 'Test Intermediate Student 068', 'int-2026-068@example.test', 'Junior College', 'Junior College', 'INT-2026-068', 'junior-student', 'MEC', '2nd Year', 'B', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-068')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003068', 'parent', 'Parent of Test Intermediate Student 068', 'parent068@example.test', 'Junior College', 'Junior College', 'INT-PARENT-068')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003068', '00000000-0000-0000-0000-000000002068', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002069', 'student', 'Test Intermediate Student 069', 'int-2026-069@example.test', 'Junior College', 'Junior College', 'INT-2026-069', 'junior-student', 'MPC', '2nd Year', 'C', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-069')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003069', 'parent', 'Parent of Test Intermediate Student 069', 'parent069@example.test', 'Junior College', 'Junior College', 'INT-PARENT-069')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003069', '00000000-0000-0000-0000-000000002069', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002070', 'student', 'Test Intermediate Student 070', 'int-2026-070@example.test', 'Junior College', 'Junior College', 'INT-2026-070', 'junior-student', 'BiPC', '2nd Year', 'A', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-070')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003070', 'parent', 'Parent of Test Intermediate Student 070', 'parent070@example.test', 'Junior College', 'Junior College', 'INT-PARENT-070')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003070', '00000000-0000-0000-0000-000000002070', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002071', 'student', 'Test Intermediate Student 071', 'int-2026-071@example.test', 'Junior College', 'Junior College', 'INT-2026-071', 'junior-student', 'CEC', '2nd Year', 'B', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-071')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003071', 'parent', 'Parent of Test Intermediate Student 071', 'parent071@example.test', 'Junior College', 'Junior College', 'INT-PARENT-071')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003071', '00000000-0000-0000-0000-000000002071', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002072', 'student', 'Test Intermediate Student 072', 'int-2026-072@example.test', 'Junior College', 'Junior College', 'INT-2026-072', 'junior-student', 'MEC', '2nd Year', 'C', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-072')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003072', 'parent', 'Parent of Test Intermediate Student 072', 'parent072@example.test', 'Junior College', 'Junior College', 'INT-PARENT-072')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003072', '00000000-0000-0000-0000-000000002072', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002073', 'student', 'Test Intermediate Student 073', 'int-2026-073@example.test', 'Junior College', 'Junior College', 'INT-2026-073', 'junior-student', 'MPC', '2nd Year', 'A', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-073')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003073', 'parent', 'Parent of Test Intermediate Student 073', 'parent073@example.test', 'Junior College', 'Junior College', 'INT-PARENT-073')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003073', '00000000-0000-0000-0000-000000002073', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002074', 'student', 'Test Intermediate Student 074', 'int-2026-074@example.test', 'Junior College', 'Junior College', 'INT-2026-074', 'junior-student', 'BiPC', '2nd Year', 'B', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-074')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003074', 'parent', 'Parent of Test Intermediate Student 074', 'parent074@example.test', 'Junior College', 'Junior College', 'INT-PARENT-074')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003074', '00000000-0000-0000-0000-000000002074', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002075', 'student', 'Test Intermediate Student 075', 'int-2026-075@example.test', 'Junior College', 'Junior College', 'INT-2026-075', 'junior-student', 'CEC', '2nd Year', 'C', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-075')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003075', 'parent', 'Parent of Test Intermediate Student 075', 'parent075@example.test', 'Junior College', 'Junior College', 'INT-PARENT-075')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003075', '00000000-0000-0000-0000-000000002075', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002076', 'student', 'Test Intermediate Student 076', 'int-2026-076@example.test', 'Junior College', 'Junior College', 'INT-2026-076', 'junior-student', 'MEC', '2nd Year', 'A', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-076')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003076', 'parent', 'Parent of Test Intermediate Student 076', 'parent076@example.test', 'Junior College', 'Junior College', 'INT-PARENT-076')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003076', '00000000-0000-0000-0000-000000002076', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002077', 'student', 'Test Intermediate Student 077', 'int-2026-077@example.test', 'Junior College', 'Junior College', 'INT-2026-077', 'junior-student', 'MPC', '2nd Year', 'B', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-077')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003077', 'parent', 'Parent of Test Intermediate Student 077', 'parent077@example.test', 'Junior College', 'Junior College', 'INT-PARENT-077')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003077', '00000000-0000-0000-0000-000000002077', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002078', 'student', 'Test Intermediate Student 078', 'int-2026-078@example.test', 'Junior College', 'Junior College', 'INT-2026-078', 'junior-student', 'BiPC', '2nd Year', 'C', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-078')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003078', 'parent', 'Parent of Test Intermediate Student 078', 'parent078@example.test', 'Junior College', 'Junior College', 'INT-PARENT-078')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003078', '00000000-0000-0000-0000-000000002078', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002079', 'student', 'Test Intermediate Student 079', 'int-2026-079@example.test', 'Junior College', 'Junior College', 'INT-2026-079', 'junior-student', 'CEC', '2nd Year', 'A', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-079')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003079', 'parent', 'Parent of Test Intermediate Student 079', 'parent079@example.test', 'Junior College', 'Junior College', 'INT-PARENT-079')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003079', '00000000-0000-0000-0000-000000002079', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002080', 'student', 'Test Intermediate Student 080', 'int-2026-080@example.test', 'Junior College', 'Junior College', 'INT-2026-080', 'junior-student', 'MEC', '2nd Year', 'B', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-080')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003080', 'parent', 'Parent of Test Intermediate Student 080', 'parent080@example.test', 'Junior College', 'Junior College', 'INT-PARENT-080')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003080', '00000000-0000-0000-0000-000000002080', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002081', 'student', 'Test Intermediate Student 081', 'int-2026-081@example.test', 'Junior College', 'Junior College', 'INT-2026-081', 'junior-student', 'MPC', '2nd Year', 'C', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-081')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003081', 'parent', 'Parent of Test Intermediate Student 081', 'parent081@example.test', 'Junior College', 'Junior College', 'INT-PARENT-081')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003081', '00000000-0000-0000-0000-000000002081', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002082', 'student', 'Test Intermediate Student 082', 'int-2026-082@example.test', 'Junior College', 'Junior College', 'INT-2026-082', 'junior-student', 'BiPC', '2nd Year', 'A', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-082')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003082', 'parent', 'Parent of Test Intermediate Student 082', 'parent082@example.test', 'Junior College', 'Junior College', 'INT-PARENT-082')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003082', '00000000-0000-0000-0000-000000002082', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002083', 'student', 'Test Intermediate Student 083', 'int-2026-083@example.test', 'Junior College', 'Junior College', 'INT-2026-083', 'junior-student', 'CEC', '2nd Year', 'B', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-083')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003083', 'parent', 'Parent of Test Intermediate Student 083', 'parent083@example.test', 'Junior College', 'Junior College', 'INT-PARENT-083')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003083', '00000000-0000-0000-0000-000000002083', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002084', 'student', 'Test Intermediate Student 084', 'int-2026-084@example.test', 'Junior College', 'Junior College', 'INT-2026-084', 'junior-student', 'MEC', '2nd Year', 'C', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-084')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003084', 'parent', 'Parent of Test Intermediate Student 084', 'parent084@example.test', 'Junior College', 'Junior College', 'INT-PARENT-084')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003084', '00000000-0000-0000-0000-000000002084', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002085', 'student', 'Test Intermediate Student 085', 'int-2026-085@example.test', 'Junior College', 'Junior College', 'INT-2026-085', 'junior-student', 'MPC', '2nd Year', 'A', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-085')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003085', 'parent', 'Parent of Test Intermediate Student 085', 'parent085@example.test', 'Junior College', 'Junior College', 'INT-PARENT-085')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003085', '00000000-0000-0000-0000-000000002085', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002086', 'student', 'Test Intermediate Student 086', 'int-2026-086@example.test', 'Junior College', 'Junior College', 'INT-2026-086', 'junior-student', 'BiPC', '2nd Year', 'B', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-086')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003086', 'parent', 'Parent of Test Intermediate Student 086', 'parent086@example.test', 'Junior College', 'Junior College', 'INT-PARENT-086')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003086', '00000000-0000-0000-0000-000000002086', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002087', 'student', 'Test Intermediate Student 087', 'int-2026-087@example.test', 'Junior College', 'Junior College', 'INT-2026-087', 'junior-student', 'CEC', '2nd Year', 'C', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-087')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003087', 'parent', 'Parent of Test Intermediate Student 087', 'parent087@example.test', 'Junior College', 'Junior College', 'INT-PARENT-087')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003087', '00000000-0000-0000-0000-000000002087', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002088', 'student', 'Test Intermediate Student 088', 'int-2026-088@example.test', 'Junior College', 'Junior College', 'INT-2026-088', 'junior-student', 'MEC', '2nd Year', 'A', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-088')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003088', 'parent', 'Parent of Test Intermediate Student 088', 'parent088@example.test', 'Junior College', 'Junior College', 'INT-PARENT-088')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003088', '00000000-0000-0000-0000-000000002088', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002089', 'student', 'Test Intermediate Student 089', 'int-2026-089@example.test', 'Junior College', 'Junior College', 'INT-2026-089', 'junior-student', 'MPC', '2nd Year', 'B', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-089')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003089', 'parent', 'Parent of Test Intermediate Student 089', 'parent089@example.test', 'Junior College', 'Junior College', 'INT-PARENT-089')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003089', '00000000-0000-0000-0000-000000002089', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002090', 'student', 'Test Intermediate Student 090', 'int-2026-090@example.test', 'Junior College', 'Junior College', 'INT-2026-090', 'junior-student', 'BiPC', '2nd Year', 'C', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-090')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003090', 'parent', 'Parent of Test Intermediate Student 090', 'parent090@example.test', 'Junior College', 'Junior College', 'INT-PARENT-090')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003090', '00000000-0000-0000-0000-000000002090', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002091', 'student', 'Test Intermediate Student 091', 'int-2026-091@example.test', 'Junior College', 'Junior College', 'INT-2026-091', 'junior-student', 'CEC', '2nd Year', 'A', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-091')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003091', 'parent', 'Parent of Test Intermediate Student 091', 'parent091@example.test', 'Junior College', 'Junior College', 'INT-PARENT-091')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003091', '00000000-0000-0000-0000-000000002091', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002092', 'student', 'Test Intermediate Student 092', 'int-2026-092@example.test', 'Junior College', 'Junior College', 'INT-2026-092', 'junior-student', 'MEC', '2nd Year', 'B', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-092')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003092', 'parent', 'Parent of Test Intermediate Student 092', 'parent092@example.test', 'Junior College', 'Junior College', 'INT-PARENT-092')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003092', '00000000-0000-0000-0000-000000002092', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002093', 'student', 'Test Intermediate Student 093', 'int-2026-093@example.test', 'Junior College', 'Junior College', 'INT-2026-093', 'junior-student', 'MPC', '2nd Year', 'C', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-093')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003093', 'parent', 'Parent of Test Intermediate Student 093', 'parent093@example.test', 'Junior College', 'Junior College', 'INT-PARENT-093')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003093', '00000000-0000-0000-0000-000000002093', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002094', 'student', 'Test Intermediate Student 094', 'int-2026-094@example.test', 'Junior College', 'Junior College', 'INT-2026-094', 'junior-student', 'BiPC', '2nd Year', 'A', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-094')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003094', 'parent', 'Parent of Test Intermediate Student 094', 'parent094@example.test', 'Junior College', 'Junior College', 'INT-PARENT-094')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003094', '00000000-0000-0000-0000-000000002094', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002095', 'student', 'Test Intermediate Student 095', 'int-2026-095@example.test', 'Junior College', 'Junior College', 'INT-2026-095', 'junior-student', 'CEC', '2nd Year', 'B', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-095')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003095', 'parent', 'Parent of Test Intermediate Student 095', 'parent095@example.test', 'Junior College', 'Junior College', 'INT-PARENT-095')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003095', '00000000-0000-0000-0000-000000002095', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002096', 'student', 'Test Intermediate Student 096', 'int-2026-096@example.test', 'Junior College', 'Junior College', 'INT-2026-096', 'junior-student', 'MEC', '2nd Year', 'C', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-096')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003096', 'parent', 'Parent of Test Intermediate Student 096', 'parent096@example.test', 'Junior College', 'Junior College', 'INT-PARENT-096')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003096', '00000000-0000-0000-0000-000000002096', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002097', 'student', 'Test Intermediate Student 097', 'int-2026-097@example.test', 'Junior College', 'Junior College', 'INT-2026-097', 'junior-student', 'MPC', '2nd Year', 'A', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-097')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003097', 'parent', 'Parent of Test Intermediate Student 097', 'parent097@example.test', 'Junior College', 'Junior College', 'INT-PARENT-097')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003097', '00000000-0000-0000-0000-000000002097', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002098', 'student', 'Test Intermediate Student 098', 'int-2026-098@example.test', 'Junior College', 'Junior College', 'INT-2026-098', 'junior-student', 'BiPC', '2nd Year', 'B', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-098')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003098', 'parent', 'Parent of Test Intermediate Student 098', 'parent098@example.test', 'Junior College', 'Junior College', 'INT-PARENT-098')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003098', '00000000-0000-0000-0000-000000002098', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002099', 'student', 'Test Intermediate Student 099', 'int-2026-099@example.test', 'Junior College', 'Junior College', 'INT-2026-099', 'junior-student', 'CEC', '2nd Year', 'C', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-099')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003099', 'parent', 'Parent of Test Intermediate Student 099', 'parent099@example.test', 'Junior College', 'Junior College', 'INT-PARENT-099')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003099', '00000000-0000-0000-0000-000000002099', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002100', 'student', 'Test Intermediate Student 100', 'int-2026-100@example.test', 'Junior College', 'Junior College', 'INT-2026-100', 'junior-student', 'MEC', '2nd Year', 'A', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-100')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003100', 'parent', 'Parent of Test Intermediate Student 100', 'parent100@example.test', 'Junior College', 'Junior College', 'INT-PARENT-100')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003100', '00000000-0000-0000-0000-000000002100', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002101', 'student', 'Test Intermediate Student 101', 'int-2026-101@example.test', 'Junior College', 'Junior College', 'INT-2026-101', 'junior-student', 'MPC', '2nd Year', 'B', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-101')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003101', 'parent', 'Parent of Test Intermediate Student 101', 'parent101@example.test', 'Junior College', 'Junior College', 'INT-PARENT-101')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003101', '00000000-0000-0000-0000-000000002101', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002102', 'student', 'Test Intermediate Student 102', 'int-2026-102@example.test', 'Junior College', 'Junior College', 'INT-2026-102', 'junior-student', 'BiPC', '2nd Year', 'C', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-102')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003102', 'parent', 'Parent of Test Intermediate Student 102', 'parent102@example.test', 'Junior College', 'Junior College', 'INT-PARENT-102')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003102', '00000000-0000-0000-0000-000000002102', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002103', 'student', 'Test Intermediate Student 103', 'int-2026-103@example.test', 'Junior College', 'Junior College', 'INT-2026-103', 'junior-student', 'CEC', '2nd Year', 'A', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-103')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003103', 'parent', 'Parent of Test Intermediate Student 103', 'parent103@example.test', 'Junior College', 'Junior College', 'INT-PARENT-103')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003103', '00000000-0000-0000-0000-000000002103', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002104', 'student', 'Test Intermediate Student 104', 'int-2026-104@example.test', 'Junior College', 'Junior College', 'INT-2026-104', 'junior-student', 'MEC', '2nd Year', 'B', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-104')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003104', 'parent', 'Parent of Test Intermediate Student 104', 'parent104@example.test', 'Junior College', 'Junior College', 'INT-PARENT-104')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003104', '00000000-0000-0000-0000-000000002104', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002105', 'student', 'Test Intermediate Student 105', 'int-2026-105@example.test', 'Junior College', 'Junior College', 'INT-2026-105', 'junior-student', 'MPC', '2nd Year', 'C', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-105')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003105', 'parent', 'Parent of Test Intermediate Student 105', 'parent105@example.test', 'Junior College', 'Junior College', 'INT-PARENT-105')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003105', '00000000-0000-0000-0000-000000002105', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002106', 'student', 'Test Intermediate Student 106', 'int-2026-106@example.test', 'Junior College', 'Junior College', 'INT-2026-106', 'junior-student', 'BiPC', '2nd Year', 'A', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-106')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003106', 'parent', 'Parent of Test Intermediate Student 106', 'parent106@example.test', 'Junior College', 'Junior College', 'INT-PARENT-106')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003106', '00000000-0000-0000-0000-000000002106', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002107', 'student', 'Test Intermediate Student 107', 'int-2026-107@example.test', 'Junior College', 'Junior College', 'INT-2026-107', 'junior-student', 'CEC', '2nd Year', 'B', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-107')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003107', 'parent', 'Parent of Test Intermediate Student 107', 'parent107@example.test', 'Junior College', 'Junior College', 'INT-PARENT-107')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003107', '00000000-0000-0000-0000-000000002107', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002108', 'student', 'Test Intermediate Student 108', 'int-2026-108@example.test', 'Junior College', 'Junior College', 'INT-2026-108', 'junior-student', 'MEC', '2nd Year', 'C', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-108')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003108', 'parent', 'Parent of Test Intermediate Student 108', 'parent108@example.test', 'Junior College', 'Junior College', 'INT-PARENT-108')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003108', '00000000-0000-0000-0000-000000002108', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002109', 'student', 'Test Intermediate Student 109', 'int-2026-109@example.test', 'Junior College', 'Junior College', 'INT-2026-109', 'junior-student', 'MPC', '2nd Year', 'A', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-109')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003109', 'parent', 'Parent of Test Intermediate Student 109', 'parent109@example.test', 'Junior College', 'Junior College', 'INT-PARENT-109')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003109', '00000000-0000-0000-0000-000000002109', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002110', 'student', 'Test Intermediate Student 110', 'int-2026-110@example.test', 'Junior College', 'Junior College', 'INT-2026-110', 'junior-student', 'BiPC', '2nd Year', 'B', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-110')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003110', 'parent', 'Parent of Test Intermediate Student 110', 'parent110@example.test', 'Junior College', 'Junior College', 'INT-PARENT-110')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003110', '00000000-0000-0000-0000-000000002110', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002111', 'student', 'Test Intermediate Student 111', 'int-2026-111@example.test', 'Junior College', 'Junior College', 'INT-2026-111', 'junior-student', 'CEC', '2nd Year', 'C', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-111')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003111', 'parent', 'Parent of Test Intermediate Student 111', 'parent111@example.test', 'Junior College', 'Junior College', 'INT-PARENT-111')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003111', '00000000-0000-0000-0000-000000002111', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002112', 'student', 'Test Intermediate Student 112', 'int-2026-112@example.test', 'Junior College', 'Junior College', 'INT-2026-112', 'junior-student', 'MEC', '2nd Year', 'A', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-112')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003112', 'parent', 'Parent of Test Intermediate Student 112', 'parent112@example.test', 'Junior College', 'Junior College', 'INT-PARENT-112')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003112', '00000000-0000-0000-0000-000000002112', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002113', 'student', 'Test Intermediate Student 113', 'int-2026-113@example.test', 'Junior College', 'Junior College', 'INT-2026-113', 'junior-student', 'MPC', '2nd Year', 'B', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-113')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003113', 'parent', 'Parent of Test Intermediate Student 113', 'parent113@example.test', 'Junior College', 'Junior College', 'INT-PARENT-113')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003113', '00000000-0000-0000-0000-000000002113', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002114', 'student', 'Test Intermediate Student 114', 'int-2026-114@example.test', 'Junior College', 'Junior College', 'INT-2026-114', 'junior-student', 'BiPC', '2nd Year', 'C', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-114')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003114', 'parent', 'Parent of Test Intermediate Student 114', 'parent114@example.test', 'Junior College', 'Junior College', 'INT-PARENT-114')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003114', '00000000-0000-0000-0000-000000002114', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002115', 'student', 'Test Intermediate Student 115', 'int-2026-115@example.test', 'Junior College', 'Junior College', 'INT-2026-115', 'junior-student', 'CEC', '2nd Year', 'A', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-115')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003115', 'parent', 'Parent of Test Intermediate Student 115', 'parent115@example.test', 'Junior College', 'Junior College', 'INT-PARENT-115')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003115', '00000000-0000-0000-0000-000000002115', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002116', 'student', 'Test Intermediate Student 116', 'int-2026-116@example.test', 'Junior College', 'Junior College', 'INT-2026-116', 'junior-student', 'MEC', '2nd Year', 'B', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-116')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003116', 'parent', 'Parent of Test Intermediate Student 116', 'parent116@example.test', 'Junior College', 'Junior College', 'INT-PARENT-116')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003116', '00000000-0000-0000-0000-000000002116', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002117', 'student', 'Test Intermediate Student 117', 'int-2026-117@example.test', 'Junior College', 'Junior College', 'INT-2026-117', 'junior-student', 'MPC', '2nd Year', 'C', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-117')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003117', 'parent', 'Parent of Test Intermediate Student 117', 'parent117@example.test', 'Junior College', 'Junior College', 'INT-PARENT-117')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003117', '00000000-0000-0000-0000-000000002117', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002118', 'student', 'Test Intermediate Student 118', 'int-2026-118@example.test', 'Junior College', 'Junior College', 'INT-2026-118', 'junior-student', 'BiPC', '2nd Year', 'A', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-118')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003118', 'parent', 'Parent of Test Intermediate Student 118', 'parent118@example.test', 'Junior College', 'Junior College', 'INT-PARENT-118')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003118', '00000000-0000-0000-0000-000000002118', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002119', 'student', 'Test Intermediate Student 119', 'int-2026-119@example.test', 'Junior College', 'Junior College', 'INT-2026-119', 'junior-student', 'CEC', '2nd Year', 'B', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-119')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003119', 'parent', 'Parent of Test Intermediate Student 119', 'parent119@example.test', 'Junior College', 'Junior College', 'INT-PARENT-119')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003119', '00000000-0000-0000-0000-000000002119', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002120', 'student', 'Test Intermediate Student 120', 'int-2026-120@example.test', 'Junior College', 'Junior College', 'INT-2026-120', 'junior-student', 'MEC', '2nd Year', 'C', 'INT-ROUTE-01', 'INT-STOP-04', 'INT-STOP-05', 'INT-2026-120')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003120', 'parent', 'Parent of Test Intermediate Student 120', 'parent120@example.test', 'Junior College', 'Junior College', 'INT-PARENT-120')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003120', '00000000-0000-0000-0000-000000002120', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002121', 'student', 'Test Intermediate Student 121', 'int-2026-121@example.test', 'Junior College', 'Junior College', 'INT-2026-121', 'junior-student', 'MPC', '2nd Year', 'A', 'INT-ROUTE-01', 'INT-STOP-01', 'INT-STOP-05', 'INT-2026-121')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003121', 'parent', 'Parent of Test Intermediate Student 121', 'parent121@example.test', 'Junior College', 'Junior College', 'INT-PARENT-121')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003121', '00000000-0000-0000-0000-000000002121', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002122', 'student', 'Test Intermediate Student 122', 'int-2026-122@example.test', 'Junior College', 'Junior College', 'INT-2026-122', 'junior-student', 'BiPC', '2nd Year', 'B', 'INT-ROUTE-01', 'INT-STOP-02', 'INT-STOP-05', 'INT-2026-122')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003122', 'parent', 'Parent of Test Intermediate Student 122', 'parent122@example.test', 'Junior College', 'Junior College', 'INT-PARENT-122')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003122', '00000000-0000-0000-0000-000000002122', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('00000000-0000-0000-0000-000000002123', 'student', 'Test Intermediate Student 123', 'int-2026-123@example.test', 'Junior College', 'Junior College', 'INT-2026-123', 'junior-student', 'CEC', '2nd Year', 'C', 'INT-ROUTE-01', 'INT-STOP-03', 'INT-STOP-05', 'INT-2026-123')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  student_id = excluded.student_id,
  student_level = excluded.student_level,
  department = excluded.department,
  academic_year = excluded.academic_year,
  section = excluded.section,
  route_id = excluded.route_id,
  pickup_stop_id = excluded.pickup_stop_id,
  drop_stop_id = excluded.drop_stop_id,
  institution = excluded.institution;
insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('00000000-0000-0000-0000-000000003123', 'parent', 'Parent of Test Intermediate Student 123', 'parent123@example.test', 'Junior College', 'Junior College', 'INT-PARENT-123')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;
insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('00000000-0000-0000-0000-000000003123', '00000000-0000-0000-0000-000000002123', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;