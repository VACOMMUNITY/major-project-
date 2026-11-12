import uuid
from pathlib import Path

OUT_SQL = Path(r"c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\supabase\migrations\20261109120000_intermediate_college_test_dataset.sql")

streams = ["MPC", "BiPC", "CEC", "MEC"]
sections = ["A", "B", "C"]

lines = []
lines.append("-- Migration: 20261109120000_intermediate_college_test_dataset.sql")
lines.append("-- Intermediate College test dataset (123 students, 1 driver, 123 parents, 1 route, 5 stops)")
lines.append("")

# Route
lines.append("-- 1. Insert Intermediate College Route")
lines.append("""insert into public.intellibus_routes (route_id, route_name, assigned_driver_id, vehicle_id, route_status, dataset_code)
values ('INT-ROUTE-01', 'Intermediate College Test Route', 'JC-DRV-001', 'TEST-JC-BUS-001', 'TEST_ONLY', 'intermediate_college_test')
on conflict (route_id) do update set
  route_name = excluded.route_name,
  assigned_driver_id = excluded.assigned_driver_id,
  vehicle_id = excluded.vehicle_id,
  route_status = excluded.route_status,
  dataset_code = excluded.dataset_code;""")
lines.append("")

# Stops
lines.append("-- 2. Insert 5 Stops for INT-ROUTE-01")
for i in range(1, 6):
    stop_id = f"INT-STOP-{i:02d}"
    stop_name = f"Intermediate Test Stop {i:02d}"
    lines.append(f"""insert into public.intellibus_route_stops (stop_id, route_id, stop_order, stop_name)
values ('{stop_id}', 'INT-ROUTE-01', {i}, '{stop_name}')
on conflict (stop_id) do update set
  route_id = excluded.route_id,
  stop_order = excluded.stop_order,
  stop_name = excluded.stop_name;""")
lines.append("")

# Driver Profile
driver_uid = "00000000-0000-0000-0000-000000000d02"
lines.append("-- 3. Insert Driver Profile for JC-DRV-001")
lines.append(f"""insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, driver_id, route_id, assigned_bus)
values ('{driver_uid}', 'driver', 'Test Intermediate College Driver 001', 'jcdrv001@example.test', 'Junior College', 'Junior College', 'JC-DRV-001', 'INT-ROUTE-01', 'TEST-JC-BUS-001')
on conflict (user_id) do update set
  role = excluded.role,
  full_name = excluded.full_name,
  driver_id = excluded.driver_id,
  route_id = excluded.route_id,
  assigned_bus = excluded.assigned_bus,
  institution = excluded.institution;""")
lines.append("")

# Helper functions
lines.append("""-- 4. Helper functions for Intermediate College role checking
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
      and student_id ~ '^INT-2026-\\d{3}$'
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
      and parent_id ~ '^INT-PARENT-\\d{3}$'
  );
$$;

revoke all on function public.is_intermediate_college_student(uuid) from public, anon;
grant execute on function public.is_intermediate_college_student(uuid) to authenticated, service_role;
revoke all on function public.is_intermediate_college_driver(uuid) from public, anon;
grant execute on function public.is_intermediate_college_driver(uuid) to authenticated, service_role;
revoke all on function public.is_intermediate_college_parent(uuid) from public, anon;
grant execute on function public.is_intermediate_college_parent(uuid) to authenticated, service_role;
""")

# 123 Students, Parents, Links
lines.append("-- 5. Insert 123 Students, Parents, and Links")
for i in range(1, 124):
    num_str = f"{i:03d}"
    stu_uid = f"00000000-0000-0000-0000-000000002{num_str}"
    par_uid = f"00000000-0000-0000-0000-000000003{num_str}"
    sid = f"INT-2026-{num_str}"
    sname = f"Test Intermediate Student {num_str}"
    stream = streams[(i - 1) % 4]
    year = "1st Year" if i <= 62 else "2nd Year"
    sec = sections[(i - 1) % 3]
    pid = f"INT-PARENT-{num_str}"
    pemail = f"parent{num_str}@example.test"
    pickup = f"INT-STOP-{((i - 1) % 4) + 1:02d}"
    drop = "INT-STOP-05"

    # Student Profile
    lines.append(f"""insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, student_id, student_level, department, academic_year, section, route_id, pickup_stop_id, drop_stop_id, qr_token)
values ('{stu_uid}', 'student', '{sname}', '{sid.lower()}@example.test', 'Junior College', 'Junior College', '{sid}', 'junior-student', '{stream}', '{year}', '{sec}', 'INT-ROUTE-01', '{pickup}', '{drop}', '{sid}')
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
  institution = excluded.institution;""")

    # Parent Profile
    lines.append(f"""insert into public.intellibus_profiles (user_id, role, full_name, email, organization, institution, parent_id)
values ('{par_uid}', 'parent', 'Parent of {sname}', '{pemail}', 'Junior College', 'Junior College', '{pid}')
on conflict (user_id) do update set
  full_name = excluded.full_name,
  parent_id = excluded.parent_id,
  institution = excluded.institution;""")

    # Parent-Student Link
    lines.append(f"""insert into public.parent_student_links (parent_user_id, student_user_id, relationship, consent_status)
values ('{par_uid}', '{stu_uid}', 'Synthetic parent/guardian', 'NOT_COLLECTED')
on conflict (parent_user_id, student_user_id) do update set
  relationship = excluded.relationship;""")

OUT_SQL.write_text("\n".join(lines), encoding="utf-8")
print(f"SUCCESS: Generated {OUT_SQL} ({len(lines)} lines)")
