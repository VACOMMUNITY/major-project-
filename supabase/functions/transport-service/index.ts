import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function fail(status: number, message: string) {
  return response(status, { error: message });
}

const MVSR_DATASET_CODE = "mvsr_engineering_test";
const MVSR_ROUTE_ID = "MVSR-ROUTE-01";
const MVSR_INSTITUTION = "MVSR Engineering College";

function isLocalTestEnvironment(projectUrl: string) {
  return Deno.env.get("MVSR_TEST_MODE") === "true" &&
    URL.canParse(projectUrl) &&
    ["localhost", "127.0.0.1", "::1", "kong"].includes(new URL(projectUrl).hostname);
}

function isMvsrStudentId(studentId: unknown) {
  if (typeof studentId !== "string") return false;
  const suffix = studentId.match(/^2451-23-737-(\d{3})$/)?.[1];
  return suffix !== undefined && Number(suffix) >= 1 && Number(suffix) <= 123;
}

function isMvsrParentId(parentId: unknown) {
  if (typeof parentId !== "string") return false;
  const suffix = parentId.match(/^MVSR-PARENT-(\d{3})$/)?.[1];
  return suffix !== undefined && Number(suffix) >= 1 && Number(suffix) <= 123;
}

function isMvsrEngineeringStudent(profile: {
  student_id?: unknown;
  student_level?: unknown;
  institution?: unknown;
}) {
  return profile.student_level === "engineering-student" &&
    profile.institution === MVSR_INSTITUTION &&
    isMvsrStudentId(profile.student_id);
}

async function isTrustedMvsrStudent(admin: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await admin.rpc("is_mvsr_engineering_student", {
    p_user_id: userId,
  });
  if (error) throw new Error("Linked MVSR student authorization could not be verified.");
  return data === true;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return fail(405, "Method not allowed.");

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!projectUrl || !serviceKey || !anonKey) {
    return fail(503, "Transport services are not configured on the server.");
  }
  const authorization = request.headers.get("Authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return fail(401, "Sign in before using transport services.");

  const publicClient = createClient(projectUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await publicClient.auth.getUser(accessToken);
  if (authError || !authData.user) return fail(401, "Your session is invalid or has expired.");

  const admin = createClient(projectUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: profile, error: profileError } = await admin
    .from("intellibus_profiles")
    .select("user_id,role,student_id,student_level,driver_id,parent_id,student_name,institution,department,academic_year,section,route_id,pickup_stop_id,drop_stop_id,qr_token,qr_svg")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Transport profile lookup failed:", profileError.message);
    return fail(503, "Your transport profile could not be loaded.");
  }
  const isMvsrStudent = Boolean(profile && isMvsrEngineeringStudent(profile));
  const isMvsrParent = profile?.role === "parent" &&
    profile.parent_id === authData.user.app_metadata?.parent_id &&
    isMvsrParentId(profile.parent_id) &&
    authData.user.app_metadata?.mvsr_test_account === true;
  const isMvsrDriver = profile?.role === "school-driver" &&
    profile.driver_id === "MVSR-DRV-001" &&
    profile.institution === MVSR_INSTITUTION &&
    authData.user.app_metadata?.mvsr_test_account === true;
  const metadataMatches = profile?.role === "student"
    ? authData.user.app_metadata?.student_id === profile.student_id
    : profile?.role === "school-driver"
      ? authData.user.app_metadata?.driver_id === profile.driver_id
      : profile?.role === "parent"
        ? !profile.parent_id || authData.user.app_metadata?.parent_id === profile.parent_id
        : false;
  if (!profile || authData.user.app_metadata?.intellibus_role !== profile.role || !metadataMatches) {
    return fail(403, "This account is not authorized for transport services.");
  }
  if (
    (profile.role === "student" && (
      profile.student_level === "engineering-student"
        ? !isMvsrStudent ||
          authData.user.app_metadata?.student_level !== "engineering-student" ||
          authData.user.app_metadata?.mvsr_test_account !== true ||
          !isLocalTestEnvironment(projectUrl)
        : profile.student_level !== "junior-student" || isMvsrStudentId(profile.student_id)
    )) ||
    (authData.user.app_metadata?.mvsr_test_account === true && !isLocalTestEnvironment(projectUrl)) ||
    (authData.user.app_metadata?.mvsr_test_account === true &&
      !(
        (profile.role === "student" &&
          isMvsrStudent &&
          authData.user.app_metadata?.student_level === "engineering-student") ||
        (profile.role === "parent" && isMvsrParent) ||
        (profile.role === "school-driver" && isMvsrDriver)
      ))
  ) {
    return fail(403, "This MVSR test account is not available in the configured environment.");
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail(400, "The transport request must contain valid JSON.");
  }
  const action = typeof body.action === "string" ? body.action : "";

  try {
    if (action === "dashboard") {
      if (profile.role === "student") {
        if (
          profile.student_level === "engineering-student" &&
          (!isMvsrStudent || profile.route_id !== MVSR_ROUTE_ID)
        ) {
          return fail(403, "Only the assigned MVSR Engineering College student dataset is available.");
        }
        const [routeResult, attendanceResult] = await Promise.all([
          admin.from("intellibus_routes").select("route_id,route_name,vehicle_id,route_status,assigned_driver_id,dataset_code").eq("route_id", profile.route_id).maybeSingle(),
          admin.from("transport_attendance").select("attendance_id,status,boarded_at,dropped_at,transport_trips(route_id,started_at,ended_at,status)").eq("student_user_id", profile.user_id).order("boarded_at", { ascending: false }).limit(25),
        ]);
        if (routeResult.error || attendanceResult.error) throw new Error("Student journey records could not be loaded.");
        if (
          profile.student_level === "engineering-student" &&
          (routeResult.data?.route_id !== MVSR_ROUTE_ID ||
            routeResult.data.dataset_code !== MVSR_DATASET_CODE ||
            routeResult.data.assigned_driver_id !== "MVSR-DRV-001" ||
            routeResult.data.vehicle_id !== "TEST-BUS-001")
        ) {
          return fail(403, "The MVSR Engineering College route assignment is unavailable.");
        }
        if (
          routeResult.data?.dataset_code === MVSR_DATASET_CODE &&
          (!isMvsrStudent || profile.student_level !== "engineering-student")
        ) {
          return fail(403, "This route is restricted to MVSR Engineering College test students.");
        }
        const stops = profile.route_id
          ? await admin.from("intellibus_route_stops").select("stop_id,stop_order,stop_name,latitude,longitude").eq("route_id", profile.route_id).order("stop_order")
          : { data: [], error: null };
        if (stops.error) throw new Error("Assigned route stops could not be loaded.");
        const currentTrip = profile.route_id
          ? await admin.from("transport_trips").select("trip_id,status,started_at,ended_at,transport_trip_locations(latitude,longitude,accuracy,recorded_at)").eq("route_id", profile.route_id).order("started_at", { ascending: false }).limit(1).maybeSingle()
          : { data: null, error: null };
        if (currentTrip.error) throw new Error("Current journey location could not be loaded.");
        return response(200, {
          role: profile.role,
          profile,
          route: routeResult.data,
          stops: stops.data || [],
          attendance: attendanceResult.data || [],
          currentTrip: currentTrip.data,
        });
      }

      if (profile.role === "parent") {
        const { data: links, error: linksError } = await admin
          .from("parent_student_links")
          .select("student_user_id")
          .eq("parent_user_id", profile.user_id);
        if (linksError) throw new Error("Authorized student links could not be loaded.");
        const students = [];
        for (const link of links || []) {
          const { data: student, error: studentError } = await admin
            .from("intellibus_profiles")
            .select("user_id,student_id,student_level,student_name,institution,department,academic_year,section,route_id,pickup_stop_id,drop_stop_id")
            .eq("user_id", link.student_user_id)
            .eq("role", "student")
            .maybeSingle();
          if (studentError) throw new Error("Linked student profile could not be loaded.");
          if (!student) continue;

          const routeResult = student.route_id
            ? await admin.from("intellibus_routes").select("route_id,route_name,vehicle_id,route_status,assigned_driver_id,dataset_code").eq("route_id", student.route_id).maybeSingle()
            : { data: null, error: null };
          if (routeResult.error) throw new Error("Linked student route could not be loaded.");
          const studentClaimsMvsr = isMvsrEngineeringStudent(student);
          const linkedStudentIsMvsr = studentClaimsMvsr &&
            await isTrustedMvsrStudent(admin, student.user_id);
          const linkedRouteIsMvsr = routeResult.data?.dataset_code === MVSR_DATASET_CODE ||
            student.route_id === MVSR_ROUTE_ID;
          if (
            ((studentClaimsMvsr && !linkedStudentIsMvsr) ||
              linkedStudentIsMvsr ||
              linkedRouteIsMvsr) &&
            (!isMvsrParent ||
              !linkedStudentIsMvsr ||
              student.route_id !== MVSR_ROUTE_ID ||
            routeResult.data?.dataset_code !== MVSR_DATASET_CODE ||
            routeResult.data.assigned_driver_id !== "MVSR-DRV-001" ||
            routeResult.data.vehicle_id !== "TEST-BUS-001")
          ) {
            continue;
          }
          if (isMvsrParent && !linkedStudentIsMvsr) continue;

          const [attendanceResult, notificationResult] = await Promise.all([
            admin.from("transport_attendance").select("attendance_id,status,boarded_at,dropped_at,transport_trips(route_id,started_at,ended_at,status)").eq("student_user_id", student.user_id).order("boarded_at", { ascending: false }).limit(25),
            admin.from("transport_notifications").select("notification_id,notification_type,message,created_at,read_at").eq("parent_user_id", profile.user_id).eq("student_user_id", student.user_id).order("created_at", { ascending: false }).limit(25),
          ]);
          if (attendanceResult.error || notificationResult.error) {
            throw new Error("Linked student journey data could not be loaded.");
          }
          const lastTrip = student.route_id
            ? await admin.from("transport_trips").select("trip_id,status,started_at,ended_at,transport_trip_locations(latitude,longitude,accuracy,recorded_at)").eq("route_id", student.route_id).order("started_at", { ascending: false }).limit(1).maybeSingle()
            : { data: null, error: null };
          if (lastTrip.error) throw new Error("Linked student location could not be loaded.");
          const stops = student.route_id
            ? await admin.from("intellibus_route_stops").select("stop_id,stop_order,stop_name").eq("route_id", student.route_id).order("stop_order")
            : { data: [], error: null };
          if (stops.error) throw new Error("Linked student stops could not be loaded.");
          students.push({
            profile: student,
            route: routeResult.data,
            stops: stops.data || [],
            attendance: attendanceResult.data || [],
            notifications: notificationResult.data || [],
            currentTrip: lastTrip.data,
          });
        }
        return response(200, { role: profile.role, students });
      }

      if (profile.role === "school-driver") {
        if (authData.user.app_metadata?.driver_id !== profile.driver_id) {
          return fail(403, "Driver assignment could not be verified.");
        }
        const { data: route, error: routeError } = await admin
          .from("intellibus_routes")
          .select("route_id,route_name,vehicle_id,route_status,assigned_driver_id,dataset_code")
          .eq("assigned_driver_id", profile.driver_id)
          .maybeSingle();
        if (routeError) throw new Error("Assigned route could not be loaded.");
        if (!route) return fail(403, "No route is assigned to this driver.");
        if (
          route.dataset_code === MVSR_DATASET_CODE
            ? !isMvsrDriver || route.route_id !== MVSR_ROUTE_ID || route.vehicle_id !== "TEST-BUS-001"
            : isMvsrDriver
        ) {
          return fail(403, "This driver is not assigned to the MVSR Engineering College test route.");
        }
        const [stops, activeTrip, recentTrips] = await Promise.all([
          admin.from("intellibus_route_stops").select("stop_id,stop_order,stop_name,latitude,longitude").eq("route_id", route.route_id).order("stop_order"),
          admin.from("transport_trips").select("trip_id,status,started_at,ended_at").eq("route_id", route.route_id).eq("status", "active").maybeSingle(),
          admin.from("transport_trips").select("trip_id,status,started_at,ended_at").eq("route_id", route.route_id).order("started_at", { ascending: false }).limit(10),
        ]);
        if (stops.error || activeTrip.error || recentTrips.error) throw new Error("Driver trip information could not be loaded.");
        const attendance = activeTrip.data
          ? await admin.from("transport_attendance").select("attendance_id,status,boarded_at,dropped_at,intellibus_profiles(student_id,student_name)").eq("trip_id", activeTrip.data.trip_id).order("boarded_at", { ascending: false })
          : { data: [], error: null };
        if (attendance.error) throw new Error("Driver attendance information could not be loaded.");
        const reachedStops = activeTrip.data
          ? await admin.from("transport_trip_stops").select("stop_id").eq("trip_id", activeTrip.data.trip_id)
          : { data: [], error: null };
        if (reachedStops.error) throw new Error("Trip stop progress could not be loaded.");
        return response(200, {
          role: profile.role,
          route,
          stops: stops.data || [],
          activeTrip: activeTrip.data,
          reachedStops: (reachedStops.data || []).map((stop) => stop.stop_id),
          recentTrips: recentTrips.data || [],
          attendance: attendance.data || [],
        });
      }
      return fail(403, "This role has no transport dashboard.");
    }

    if (
      profile.role !== "school-driver" ||
      authData.user.app_metadata?.driver_id !== profile.driver_id ||
      !isMvsrDriver ||
      !isLocalTestEnvironment(projectUrl)
    ) {
      return fail(403, "Only the assigned driver can change this trip.");
    }
    const { data: assignedRoute, error: assignedRouteError } = await admin
      .from("intellibus_routes")
      .select("route_id,assigned_driver_id,dataset_code")
      .eq("route_id", MVSR_ROUTE_ID)
      .eq("assigned_driver_id", "MVSR-DRV-001")
      .eq("dataset_code", MVSR_DATASET_CODE)
      .maybeSingle();
    if (assignedRouteError) throw new Error("Assigned MVSR test route could not be verified.");
    if (!assignedRoute) return fail(403, "The MVSR test route is not assigned to this driver.");
    const rpcAction = {
      "start-trip": "start_trip",
      "end-trip": "end_trip",
      "reach-stop": "reach_stop",
      "scan-student": "scan_student",
      "record-location": "record_location",
    }[action];
    if (!rpcAction) return fail(400, "Unsupported transport action.");
    const tripId = typeof body.tripId === "string" ? body.tripId : null;
    const stopId = typeof body.stopId === "string" ? body.stopId : null;
    const qrToken = typeof body.qrToken === "string" ? body.qrToken : null;
    const attendanceEvent = typeof body.event === "string" ? body.event : null;
    const coordinates = [body.latitude, body.longitude, body.accuracy];
    if (action === "record-location" && !coordinates.every((value) => typeof value === "number" && Number.isFinite(value))) {
      return fail(400, "A valid GPS location fix is required.");
    }
    if (action === "scan-student" && (!qrToken || !["boarded", "dropped"].includes(attendanceEvent || ""))) {
      return fail(400, "Choose boarding or drop-off before scanning a student QR code.");
    }
    if (action === "reach-stop" && !stopId) return fail(400, "Select a stop on the assigned route.");

    const { data, error } = await admin.rpc("perform_mvsr_transport_action", {
      p_driver_user_id: profile.user_id,
      p_action: rpcAction,
      p_trip_id: tripId,
      p_stop_id: stopId,
      p_qr_token: qrToken,
      p_attendance_event: attendanceEvent,
      p_latitude: typeof body.latitude === "number" ? body.latitude : null,
      p_longitude: typeof body.longitude === "number" ? body.longitude : null,
      p_accuracy: typeof body.accuracy === "number" ? body.accuracy : null,
    });
    if (error) {
      console.error("Transport action failed:", error.message);
      return fail(409, error.message);
    }
    return response(200, data);
  } catch (error) {
    console.error("Transport service request failed:", error);
    return fail(503, error instanceof Error ? error.message : "Transport service request failed.");
  }
});
