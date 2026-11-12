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

function isLocalTestEnvironment(projectUrl: string) {
  return Deno.env.get("MVSR_TEST_MODE") === "true" &&
    URL.canParse(projectUrl) &&
    ["localhost", "127.0.0.1", "::1", "kong"].includes(new URL(projectUrl).hostname);
}

function isMvsrStudentId(studentId: string) {
  const suffix = studentId.match(/^2451-23-737-(\d{3})$/)?.[1];
  return suffix !== undefined && Number(suffix) >= 1 && Number(suffix) <= 123;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return response(405, { error: "Method not allowed." });
  }

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!projectUrl || !serviceKey || !anonKey) {
    return response(503, { error: "Student sign-in is not configured on the server." });
  }

  try {
    const body = await request.json();
    const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const requestedDashboard = typeof body.dashboard === "string" ? body.dashboard : null;
    if (
      !studentId ||
      !password ||
      studentId.length > 128 ||
      password.length > 256 ||
      (requestedDashboard !== null && !["engineering-student", "junior-student"].includes(requestedDashboard))
    ) {
      return response(400, { error: "Enter a valid student ID and password." });
    }

    const admin = createClient(projectUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: profile, error: profileError } = await admin
      .from("intellibus_profiles")
      .select("user_id,student_level,institution")
      .eq("role", "student")
      .eq("student_id", studentId)
      .maybeSingle();

    if (profileError) {
      console.error("Student profile lookup failed:", profileError.message);
      return response(503, { error: "Student sign-in is temporarily unavailable." });
    }
    if (!profile) {
      return response(401, { error: "Student ID or password is incorrect." });
    }

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.user_id);
    if (userError || (!userData.user?.email && !userData.user?.phone)) {
      console.error("Student auth account lookup failed:", userError?.message || "No password sign-in identifier is set.");
      return response(401, { error: "Student ID or password is incorrect." });
    }
    const appMetadata = userData.user.app_metadata;
    const isMvsrStudent = isMvsrStudentId(studentId) &&
      profile.student_level === "engineering-student" &&
      profile.institution === "MVSR Engineering College" &&
      appMetadata?.mvsr_test_account === true;
    if (
      appMetadata?.intellibus_role !== "student" ||
      appMetadata?.student_id !== studentId ||
      appMetadata?.student_level !== profile.student_level ||
      (profile.student_level !== "engineering-student" && profile.student_level !== "junior-student") ||
      (profile.student_level === "engineering-student" && !isMvsrStudent) ||
      (isMvsrStudent && !isLocalTestEnvironment(projectUrl)) ||
      (requestedDashboard !== null && requestedDashboard !== profile.student_level) ||
      (profile.student_level === "junior-student" && isMvsrStudentId(studentId))
    ) {
      return response(401, { error: "Student ID or password is incorrect." });
    }

    const publicClient = createClient(projectUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const credentials = userData.user.email
      ? { email: userData.user.email, password }
      : { phone: userData.user.phone, password };
    const { data, error } = await publicClient.auth.signInWithPassword({
      ...credentials,
    });
    if (error || !data.session || data.user.id !== profile.user_id) {
      return response(401, { error: "Student ID or password is incorrect." });
    }

    return response(200, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      token_type: data.session.token_type,
      expires_in: data.session.expires_in,
      expires_at: data.session.expires_at,
    });
  } catch (error) {
    console.error("Student sign-in request failed:", error);
    return response(400, { error: "Student sign-in request could not be processed." });
  }
});
