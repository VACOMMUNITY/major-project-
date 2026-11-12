alter table public.intellibus_profiles
  add column if not exists parent_id text,
  add column if not exists parent_email text,
  add column if not exists student_name text,
  add column if not exists institution text,
  add column if not exists department text,
  add column if not exists academic_year text,
  add column if not exists section text,
  add column if not exists route_id text,
  add column if not exists pickup_stop_id text,
  add column if not exists drop_stop_id text,
  add column if not exists qr_token uuid unique default gen_random_uuid(),
  add column if not exists qr_svg text;

create unique index if not exists intellibus_profiles_parent_id_unique
  on public.intellibus_profiles (parent_id)
  where parent_id is not null;

create unique index if not exists intellibus_profiles_parent_email_unique
  on public.intellibus_profiles (lower(parent_email))
  where parent_email is not null;

create table if not exists public.intellibus_routes (
  route_id text primary key,
  route_name text not null,
  assigned_driver_id text not null,
  vehicle_id text not null,
  route_status text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists intellibus_routes_assigned_driver_unique
  on public.intellibus_routes (assigned_driver_id);

create table if not exists public.intellibus_route_stops (
  stop_id text primary key,
  route_id text not null references public.intellibus_routes (route_id) on delete cascade,
  stop_order integer not null check (stop_order > 0),
  stop_name text not null,
  latitude double precision,
  longitude double precision,
  constraint intellibus_route_stop_coordinate_pair check (
    (latitude is null and longitude is null)
    or (
      latitude between -90 and 90
      and longitude between -180 and 180
    )
  ),
  unique (route_id, stop_order)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.intellibus_profiles'::regclass
      and conname = 'intellibus_profile_route_fk'
  ) then
    alter table public.intellibus_profiles
      add constraint intellibus_profile_route_fk
      foreign key (route_id) references public.intellibus_routes (route_id);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.intellibus_profiles'::regclass
      and conname = 'intellibus_profile_pickup_stop_fk'
  ) then
    alter table public.intellibus_profiles
      add constraint intellibus_profile_pickup_stop_fk
      foreign key (pickup_stop_id) references public.intellibus_route_stops (stop_id);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.intellibus_profiles'::regclass
      and conname = 'intellibus_profile_drop_stop_fk'
  ) then
    alter table public.intellibus_profiles
      add constraint intellibus_profile_drop_stop_fk
      foreign key (drop_stop_id) references public.intellibus_route_stops (stop_id);
  end if;
end;
$$;

create table if not exists public.transport_trips (
  trip_id uuid primary key default gen_random_uuid(),
  route_id text not null references public.intellibus_routes (route_id),
  driver_user_id uuid not null references public.intellibus_profiles (user_id),
  vehicle_id text not null,
  status text not null check (status in ('active', 'completed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create unique index if not exists transport_one_active_trip_per_route
  on public.transport_trips (route_id)
  where status = 'active';

create table if not exists public.transport_trip_stops (
  trip_id uuid not null references public.transport_trips (trip_id) on delete cascade,
  stop_id text not null references public.intellibus_route_stops (stop_id),
  reached_at timestamptz not null default now(),
  primary key (trip_id, stop_id)
);

create table if not exists public.transport_trip_locations (
  trip_id uuid primary key references public.transport_trips (trip_id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy double precision not null check (accuracy >= 0),
  recorded_at timestamptz not null default now()
);

create table if not exists public.transport_attendance (
  attendance_id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.transport_trips (trip_id) on delete cascade,
  student_user_id uuid not null references public.intellibus_profiles (user_id),
  student_id text not null,
  status text not null check (status in ('boarded', 'dropped')),
  boarded_at timestamptz not null default now(),
  dropped_at timestamptz,
  unique (trip_id, student_user_id),
  constraint transport_attendance_drop_status check (
    (status = 'boarded' and dropped_at is null)
    or (status = 'dropped' and dropped_at is not null)
  )
);

create table if not exists public.transport_notifications (
  notification_id uuid primary key default gen_random_uuid(),
  parent_user_id uuid not null references public.intellibus_profiles (user_id) on delete cascade,
  student_user_id uuid not null references public.intellibus_profiles (user_id) on delete cascade,
  trip_id uuid references public.transport_trips (trip_id) on delete set null,
  notification_type text not null check (
    notification_type in (
      'student_boarded',
      'student_left',
      'trip_started',
      'stop_reached',
      'journey_completed'
    )
  ),
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists transport_attendance_student_time
  on public.transport_attendance (student_user_id, boarded_at desc);
create index if not exists transport_notifications_parent_time
  on public.transport_notifications (parent_user_id, created_at desc);
create index if not exists intellibus_profiles_route_id_idx
  on public.intellibus_profiles (route_id)
  where route_id is not null;

alter table public.intellibus_routes enable row level security;
alter table public.intellibus_route_stops enable row level security;
alter table public.transport_trips enable row level security;
alter table public.transport_trip_stops enable row level security;
alter table public.transport_trip_locations enable row level security;
alter table public.transport_attendance enable row level security;
alter table public.transport_notifications enable row level security;

create or replace function public.can_access_intellibus_route(p_route_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.intellibus_profiles as profile
    where profile.user_id = (select auth.uid())
      and (
        profile.role = 'admin'
        or (
          profile.role in ('school-driver', 'company-driver')
          and exists (
            select 1 from public.intellibus_routes as route
            where route.route_id = p_route_id
              and route.assigned_driver_id = profile.driver_id
          )
        )
        or (profile.role = 'student' and profile.route_id = p_route_id)
      )
  )
  or exists (
    select 1
    from public.parent_student_links as link
    join public.intellibus_profiles as student on student.user_id = link.student_user_id
    where link.parent_user_id = (select auth.uid())
      and student.role = 'student'
      and student.route_id = p_route_id
  );
$$;

revoke all on function public.can_access_intellibus_route(text) from public, anon;
grant execute on function public.can_access_intellibus_route(text) to authenticated;

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
    driver_user_id = (select auth.uid())
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
      join public.intellibus_profiles as student on student.user_id = link.student_user_id
      where link.parent_user_id = (select auth.uid())
        and student.route_id = transport_trips.route_id
    )
  );

drop policy if exists transport_trip_stops_read_related on public.transport_trip_stops;
create policy transport_trip_stops_read_related
  on public.transport_trip_stops for select to authenticated
  using (
    exists (
      select 1 from public.transport_trips as trip
      where trip.trip_id = transport_trip_stops.trip_id
    )
  );

drop policy if exists transport_trip_locations_read_related on public.transport_trip_locations;
create policy transport_trip_locations_read_related
  on public.transport_trip_locations for select to authenticated
  using (
    exists (
      select 1 from public.transport_trips as trip
      where trip.trip_id = transport_trip_locations.trip_id
    )
  );

drop policy if exists transport_attendance_read_related on public.transport_attendance;
create policy transport_attendance_read_related
  on public.transport_attendance for select to authenticated
  using (
    student_user_id = (select auth.uid())
    or exists (
      select 1 from public.parent_student_links as link
      where link.parent_user_id = (select auth.uid())
        and link.student_user_id = transport_attendance.student_user_id
    )
    or exists (
      select 1 from public.transport_trips as trip
      where trip.trip_id = transport_attendance.trip_id
        and trip.driver_user_id = (select auth.uid())
    )
  );

drop policy if exists transport_notifications_read_parent on public.transport_notifications;
create policy transport_notifications_read_parent
  on public.transport_notifications for select to authenticated
  using (parent_user_id = (select auth.uid()));

revoke all on public.intellibus_routes, public.intellibus_route_stops,
  public.transport_trips, public.transport_trip_stops, public.transport_trip_locations,
  public.transport_attendance, public.transport_notifications from anon, authenticated;
grant select on public.intellibus_routes, public.intellibus_route_stops,
  public.transport_trips, public.transport_trip_stops, public.transport_trip_locations,
  public.transport_attendance, public.transport_notifications to authenticated;
grant all on public.intellibus_routes, public.intellibus_route_stops,
  public.transport_trips, public.transport_trip_stops, public.transport_trip_locations,
  public.transport_attendance, public.transport_notifications to service_role;

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
  select route.* into assigned_route
  from public.intellibus_routes as route
  join public.intellibus_profiles as driver
    on driver.driver_id = route.assigned_driver_id
  where driver.user_id = p_driver_user_id
    and driver.role = 'school-driver'
  limit 1;

  if assigned_route.route_id is null then
    raise exception 'Driver has no assigned test route.';
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
    where student.role = 'student' and student.route_id = assigned_route.route_id;

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
    where attendance.trip_id = active_trip.trip_id;
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
    from public.intellibus_profiles
    where qr_token = p_qr_token and role = 'student'
      and route_id = assigned_route.route_id;
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
      where link.student_user_id = student_profile.user_id;
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
    where link.student_user_id = student_profile.user_id;
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
