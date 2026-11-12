alter table public.intellibus_routes
  add column if not exists dataset_code text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.intellibus_routes'::regclass
      and conname = 'intellibus_routes_mvsr_dataset_scope'
  ) then
    alter table public.intellibus_routes
      add constraint intellibus_routes_mvsr_dataset_scope check (
        dataset_code is null
        or (
          dataset_code = 'mvsr_engineering_test'
          and route_id = 'MVSR-ROUTE-01'
          and assigned_driver_id = 'MVSR-DRV-001'
          and vehicle_id = 'TEST-BUS-001'
        )
      );
  end if;
end;
$$;

create or replace function public.is_mvsr_engineering_student(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.intellibus_profiles as profile
    join auth.users as auth_user on auth_user.id = profile.user_id
    where profile.user_id = p_user_id
      and profile.role = 'student'
      and profile.student_level = 'engineering-student'
      and profile.institution = 'MVSR Engineering College'
      and profile.student_id ~ '^2451-23-737-(00[1-9]|0[1-9][0-9]|1[01][0-9]|12[0-3])$'
      and auth_user.raw_app_meta_data ->> 'intellibus_role' = 'student'
      and auth_user.raw_app_meta_data ->> 'student_id' = profile.student_id
      and auth_user.raw_app_meta_data ->> 'student_level' = 'engineering-student'
      and auth_user.raw_app_meta_data ->> 'mvsr_test_account' = 'true'
  );
$$;

create or replace function public.is_mvsr_test_parent(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.intellibus_profiles as profile
    join auth.users as auth_user on auth_user.id = profile.user_id
    where profile.user_id = p_user_id
      and profile.role = 'parent'
      and profile.parent_id ~ '^MVSR-PARENT-(00[1-9]|0[1-9][0-9]|1[01][0-9]|12[0-3])$'
      and auth_user.raw_app_meta_data ->> 'intellibus_role' = 'parent'
      and auth_user.raw_app_meta_data ->> 'parent_id' = profile.parent_id
      and auth_user.raw_app_meta_data ->> 'mvsr_test_account' = 'true'
  );
$$;

create or replace function public.is_mvsr_test_driver(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.intellibus_profiles as profile
    join auth.users as auth_user on auth_user.id = profile.user_id
    where profile.user_id = p_user_id
      and profile.role = 'school-driver'
      and profile.driver_id = 'MVSR-DRV-001'
      and profile.institution = 'MVSR Engineering College'
      and auth_user.raw_app_meta_data ->> 'intellibus_role' = 'school-driver'
      and auth_user.raw_app_meta_data ->> 'driver_id' = 'MVSR-DRV-001'
      and auth_user.raw_app_meta_data ->> 'mvsr_test_account' = 'true'
  );
$$;

revoke all on function public.is_mvsr_engineering_student(uuid) from public, anon;
revoke all on function public.is_mvsr_test_parent(uuid) from public, anon;
revoke all on function public.is_mvsr_test_driver(uuid) from public, anon;
grant execute on function public.is_mvsr_engineering_student(uuid) to authenticated, service_role;
grant execute on function public.is_mvsr_test_parent(uuid) to authenticated, service_role;
grant execute on function public.is_mvsr_test_driver(uuid) to authenticated, service_role;

create or replace function public.can_access_intellibus_route(p_route_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.intellibus_routes as route
    where route.route_id = p_route_id
      and (
        (
          (
            route.dataset_code = 'mvsr_engineering_test'
            or route.route_id = 'MVSR-ROUTE-01'
          )
          and route.assigned_driver_id = 'MVSR-DRV-001'
          and route.vehicle_id = 'TEST-BUS-001'
          and (
            (
              public.is_mvsr_engineering_student((select auth.uid()))
              and exists (
                select 1
                from public.intellibus_profiles as student
                where student.user_id = (select auth.uid())
                  and student.route_id = route.route_id
              )
            )
            or (
              public.is_mvsr_test_parent((select auth.uid()))
              and exists (
                select 1
                from public.parent_student_links as link
                join public.intellibus_profiles as student
                  on student.user_id = link.student_user_id
                where link.parent_user_id = (select auth.uid())
                  and student.route_id = route.route_id
                  and public.is_mvsr_engineering_student(student.user_id)
              )
            )
            or (
              public.is_mvsr_test_driver((select auth.uid()))
              and route.assigned_driver_id = 'MVSR-DRV-001'
            )
          )
        )
        or (
          route.dataset_code is distinct from 'mvsr_engineering_test'
          and route.route_id is distinct from 'MVSR-ROUTE-01'
          and (
            exists (
              select 1 from public.intellibus_profiles as profile
              where profile.user_id = (select auth.uid())
                and (
                  profile.role = 'admin'
                  or (
                    profile.role in ('school-driver', 'company-driver')
                    and route.assigned_driver_id = profile.driver_id
                  )
                  or (profile.role = 'student' and profile.route_id = route.route_id)
                )
            )
            or exists (
              select 1
              from public.parent_student_links as link
              join public.intellibus_profiles as student
                on student.user_id = link.student_user_id
              where link.parent_user_id = (select auth.uid())
                and student.role = 'student'
                and student.route_id = route.route_id
            )
          )
        )
      )
  );
$$;

revoke all on function public.can_access_intellibus_route(text) from public, anon;
grant execute on function public.can_access_intellibus_route(text) to authenticated, service_role;

drop policy if exists intellibus_routes_read_authenticated on public.intellibus_routes;
create policy intellibus_routes_read_authenticated
  on public.intellibus_routes for select to authenticated
  using (public.can_access_intellibus_route(route_id));

drop policy if exists intellibus_route_stops_read_authenticated on public.intellibus_route_stops;
create policy intellibus_route_stops_read_authenticated
  on public.intellibus_route_stops for select to authenticated
  using (public.can_access_intellibus_route(route_id));

drop policy if exists transport_trips_read_related on public.transport_trips;
create policy transport_trips_read_related
  on public.transport_trips for select to authenticated
  using (
    exists (
      select 1
      from public.intellibus_routes as route
      where route.route_id = transport_trips.route_id
        and public.can_access_intellibus_route(route.route_id)
        and (
          (
            route.dataset_code = 'mvsr_engineering_test'
            or route.route_id = 'MVSR-ROUTE-01'
          )
          or (
            transport_trips.driver_user_id = (select auth.uid())
            or exists (
              select 1
              from public.intellibus_profiles as student
              where student.user_id = (select auth.uid())
                and student.role = 'student'
                and student.route_id = transport_trips.route_id
            )
            or exists (
              select 1
              from public.parent_student_links as link
              join public.intellibus_profiles as student
                on student.user_id = link.student_user_id
              where link.parent_user_id = (select auth.uid())
                and student.route_id = transport_trips.route_id
            )
          )
        )
    )
  );

drop policy if exists transport_trip_stops_read_related on public.transport_trip_stops;
create policy transport_trip_stops_read_related
  on public.transport_trip_stops for select to authenticated
  using (
    exists (
      select 1
      from public.transport_trips as trip
      where trip.trip_id = transport_trip_stops.trip_id
        and public.can_access_intellibus_route(trip.route_id)
    )
  );

drop policy if exists transport_trip_locations_read_related on public.transport_trip_locations;
create policy transport_trip_locations_read_related
  on public.transport_trip_locations for select to authenticated
  using (
    exists (
      select 1
      from public.transport_trips as trip
      where trip.trip_id = transport_trip_locations.trip_id
        and public.can_access_intellibus_route(trip.route_id)
    )
  );

drop policy if exists transport_attendance_read_related on public.transport_attendance;
create policy transport_attendance_read_related
  on public.transport_attendance for select to authenticated
  using (
    exists (
      select 1
      from public.transport_trips as trip
      join public.intellibus_routes as route on route.route_id = trip.route_id
      join public.intellibus_profiles as student
        on student.user_id = transport_attendance.student_user_id
      where trip.trip_id = transport_attendance.trip_id
        and public.can_access_intellibus_route(route.route_id)
        and (
          (
            (
              route.dataset_code = 'mvsr_engineering_test'
              or route.route_id = 'MVSR-ROUTE-01'
            )
            and public.is_mvsr_engineering_student(student.user_id)
            and transport_attendance.student_id = student.student_id
            and (
              (student.user_id = (select auth.uid()))
              or (
                public.is_mvsr_test_parent((select auth.uid()))
                and exists (
                  select 1 from public.parent_student_links as link
                  where link.parent_user_id = (select auth.uid())
                    and link.student_user_id = student.user_id
                )
              )
              or (
                public.is_mvsr_test_driver((select auth.uid()))
                and trip.driver_user_id = (select auth.uid())
              )
            )
          )
          or (
            route.dataset_code is distinct from 'mvsr_engineering_test'
            and route.route_id is distinct from 'MVSR-ROUTE-01'
            and (
              student.user_id = (select auth.uid())
              or exists (
                select 1 from public.parent_student_links as link
                where link.parent_user_id = (select auth.uid())
                  and link.student_user_id = student.user_id
              )
              or trip.driver_user_id = (select auth.uid())
            )
          )
        )
    )
  );

drop policy if exists transport_notifications_read_parent on public.transport_notifications;
create policy transport_notifications_read_parent
  on public.transport_notifications for select to authenticated
  using (
    parent_user_id = (select auth.uid())
    and (
      exists (
        select 1
        from public.intellibus_profiles as student
        where student.user_id = transport_notifications.student_user_id
          and student.role = 'student'
          and student.route_id = 'MVSR-ROUTE-01'
          and public.is_mvsr_engineering_student(student.user_id)
          and public.is_mvsr_test_parent((select auth.uid()))
          and exists (
            select 1 from public.parent_student_links as link
            where link.parent_user_id = (select auth.uid())
              and link.student_user_id = student.user_id
          )
      )
      or (
        not public.is_mvsr_test_parent((select auth.uid()))
        and not exists (
          select 1
          from public.intellibus_profiles as student
          where student.user_id = transport_notifications.student_user_id
            and student.route_id = 'MVSR-ROUTE-01'
            and public.is_mvsr_engineering_student(student.user_id)
        )
      )
    )
  );

create or replace function public.perform_mvsr_transport_action(
  p_driver_user_id uuid,
  p_action text,
  p_trip_id uuid default null,
  p_stop_id text default null,
  p_qr_token uuid default null,
  p_attendance_event text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_accuracy double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_route public.intellibus_routes%rowtype;
  active_trip public.transport_trips%rowtype;
  student_profile public.intellibus_profiles%rowtype;
  current_attendance public.transport_attendance%rowtype;
  new_trip_id uuid;
  affected integer;
begin
  if not public.is_mvsr_test_driver(p_driver_user_id) then
    raise exception 'Only the assigned MVSR Engineering College test driver can use this service.';
  end if;

  select route.* into assigned_route
  from public.intellibus_routes as route
  where route.dataset_code = 'mvsr_engineering_test'
    and route.route_id = 'MVSR-ROUTE-01'
    and route.assigned_driver_id = 'MVSR-DRV-001'
    and route.vehicle_id = 'TEST-BUS-001';

  if assigned_route.route_id is null then
    raise exception 'The assigned MVSR test route is unavailable.';
  end if;

  if p_action = 'start_trip' then
    insert into public.transport_trips (route_id, driver_user_id, vehicle_id, status)
    values (assigned_route.route_id, p_driver_user_id, assigned_route.vehicle_id, 'active')
    returning trip_id into new_trip_id;

    insert into public.transport_notifications (
      parent_user_id, student_user_id, trip_id, notification_type, message
    )
    select link.parent_user_id, student.user_id, new_trip_id, 'trip_started',
      'Bus ' || assigned_route.vehicle_id || ' started route ' || assigned_route.route_name || '.'
    from public.parent_student_links as link
    join public.intellibus_profiles as student on student.user_id = link.student_user_id
    where student.role = 'student'
      and student.route_id = assigned_route.route_id
      and public.is_mvsr_engineering_student(student.user_id)
      and public.is_mvsr_test_parent(link.parent_user_id);

    return jsonb_build_object(
      'tripId', new_trip_id,
      'routeId', assigned_route.route_id,
      'vehicleId', assigned_route.vehicle_id,
      'status', 'active'
    );
  elsif p_action = 'end_trip' then
    update public.transport_trips
    set status = 'completed', ended_at = now()
    where trip_id = p_trip_id
      and driver_user_id = p_driver_user_id
      and route_id = assigned_route.route_id
      and status = 'active'
    returning * into active_trip;
    if not found then
      raise exception 'Active trip not found for this driver and route.';
    end if;

    insert into public.transport_notifications (
      parent_user_id, student_user_id, trip_id, notification_type, message
    )
    select link.parent_user_id, attendance.student_user_id, active_trip.trip_id, 'journey_completed',
      'Journey completed for route ' || assigned_route.route_name || '.'
    from public.transport_attendance as attendance
    join public.parent_student_links as link on link.student_user_id = attendance.student_user_id
    where attendance.trip_id = active_trip.trip_id
      and public.is_mvsr_engineering_student(attendance.student_user_id)
      and public.is_mvsr_test_parent(link.parent_user_id);
    return jsonb_build_object('tripId', active_trip.trip_id, 'status', 'completed');
  elsif p_action = 'reach_stop' then
    select * into active_trip
    from public.transport_trips
    where trip_id = p_trip_id
      and driver_user_id = p_driver_user_id
      and route_id = assigned_route.route_id
      and status = 'active';
    if not found then
      raise exception 'Active trip not found for this driver and route.';
    end if;
    if not exists (
      select 1 from public.intellibus_route_stops
      where stop_id = p_stop_id and route_id = assigned_route.route_id
    ) then
      raise exception 'Stop is not part of the assigned route.';
    end if;
    insert into public.transport_trip_stops (trip_id, stop_id)
    values (p_trip_id, p_stop_id)
    on conflict (trip_id, stop_id) do nothing;
    get diagnostics affected = row_count;
    if affected > 0 then
      insert into public.transport_notifications (
        parent_user_id, student_user_id, trip_id, notification_type, message
      )
      select link.parent_user_id, student.user_id, p_trip_id, 'stop_reached',
        'Bus reached ' || stop.stop_name || '.'
      from public.intellibus_profiles as student
      join public.parent_student_links as link on link.student_user_id = student.user_id
      join public.intellibus_route_stops as stop on stop.stop_id = p_stop_id
      where student.role = 'student'
        and student.route_id = assigned_route.route_id
        and public.is_mvsr_engineering_student(student.user_id)
        and public.is_mvsr_test_parent(link.parent_user_id)
        and p_stop_id in (student.pickup_stop_id, student.drop_stop_id);
    end if;
    return jsonb_build_object('stopId', p_stop_id, 'duplicate', affected = 0);
  elsif p_action = 'record_location' then
    if p_latitude is null or p_longitude is null or p_accuracy is null then
      raise exception 'A valid device location sample is required.';
    end if;
    if not exists (
      select 1 from public.transport_trips
      where trip_id = p_trip_id and driver_user_id = p_driver_user_id
        and route_id = assigned_route.route_id and status = 'active'
    ) then
      raise exception 'Active trip not found for this driver and route.';
    end if;
    insert into public.transport_trip_locations (
      trip_id, latitude, longitude, accuracy, recorded_at
    )
    values (p_trip_id, p_latitude, p_longitude, p_accuracy, now())
    on conflict (trip_id) do update
      set latitude = excluded.latitude,
          longitude = excluded.longitude,
          accuracy = excluded.accuracy,
          recorded_at = excluded.recorded_at;
    return jsonb_build_object('recorded', true);
  elsif p_action = 'scan_student' then
    if p_attendance_event is null
      or p_attendance_event not in ('boarded', 'dropped')
      or p_qr_token is null then
      raise exception 'Select a valid boarding or drop-off event and scan a student QR code.';
    end if;
    select * into active_trip
    from public.transport_trips
    where trip_id = p_trip_id
      and driver_user_id = p_driver_user_id
      and route_id = assigned_route.route_id
      and status = 'active';
    if not found then
      raise exception 'Start an assigned-route trip before recording attendance.';
    end if;
    select * into student_profile
    from public.intellibus_profiles as profile
    where profile.qr_token = p_qr_token
      and profile.route_id = assigned_route.route_id
      and public.is_mvsr_engineering_student(profile.user_id);
    if not found then
      raise exception 'QR code is invalid or student is not assigned to this route.';
    end if;
    select * into current_attendance
    from public.transport_attendance
    where trip_id = p_trip_id and student_user_id = student_profile.user_id
    for update;
    if p_attendance_event = 'boarded' then
      if found then
        return jsonb_build_object(
          'studentId', student_profile.student_id,
          'status', current_attendance.status,
          'duplicate', true
        );
      end if;
      insert into public.transport_attendance (trip_id, student_user_id, student_id, status)
      values (p_trip_id, student_profile.user_id, student_profile.student_id, 'boarded');
      insert into public.transport_notifications (
        parent_user_id, student_user_id, trip_id, notification_type, message
      )
      select link.parent_user_id, student_profile.user_id, p_trip_id, 'student_boarded',
        coalesce(student_profile.student_name, student_profile.student_id) || ' boarded bus ' || assigned_route.vehicle_id || '.'
      from public.parent_student_links as link
      where link.student_user_id = student_profile.user_id
        and public.is_mvsr_test_parent(link.parent_user_id);
      return jsonb_build_object('studentId', student_profile.student_id, 'status', 'boarded', 'duplicate', false);
    end if;
    if not found or current_attendance.status = 'dropped' then
      return jsonb_build_object(
        'studentId', student_profile.student_id,
        'status', coalesce(current_attendance.status, 'not_boarded'),
        'duplicate', true
      );
    end if;
    update public.transport_attendance
    set status = 'dropped', dropped_at = now()
    where attendance_id = current_attendance.attendance_id;
    insert into public.transport_notifications (
      parent_user_id, student_user_id, trip_id, notification_type, message
    )
    select link.parent_user_id, student_profile.user_id, p_trip_id, 'student_left',
      coalesce(student_profile.student_name, student_profile.student_id) || ' left bus ' || assigned_route.vehicle_id || '.'
    from public.parent_student_links as link
    where link.student_user_id = student_profile.user_id
      and public.is_mvsr_test_parent(link.parent_user_id);
    return jsonb_build_object('studentId', student_profile.student_id, 'status', 'dropped', 'duplicate', false);
  end if;

  raise exception 'Unsupported transport action.';
end;
$$;

revoke all on function public.perform_mvsr_transport_action(
  uuid, text, uuid, text, uuid, text, double precision, double precision, double precision
) from public, anon, authenticated;
grant execute on function public.perform_mvsr_transport_action(
  uuid, text, uuid, text, uuid, text, double precision, double precision, double precision
) to service_role;
