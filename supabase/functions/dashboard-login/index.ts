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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response(405, { error: "Method not allowed." });

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!projectUrl || !serviceKey || !anonKey) {
    return response(503, { error: "Dashboard sign-in is not configured on the server." });
  }

  try {
    const body = await request.json();
    const role = body.role;
    const account = typeof body.account === "string" ? body.account.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const isEmployee = role === "employee";
    const isDriver = role === "school-driver" || role === "company-driver";
    if (
      (!isEmployee && !isDriver) ||
      !account ||
      account.length > 128 ||
      (isEmployee && !/^[A-Za-z]{1,64}$/.test(account)) ||
      !password ||
      password.length > 256
    ) {
      return response(400, { error: "Enter a valid account ID and password." });
    }

    const admin = createClient(projectUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const profileQuery = admin
      .from("intellibus_profiles")
      .select("user_id,driver_id,username,institution")
      .eq("role", role);
    const { data: profile, error: profileError } = isEmployee
      ? await profileQuery.ilike("username", account).maybeSingle()
      : await profileQuery.eq("driver_id", account).maybeSingle();

    if (profileError) {
      console.error("Dashboard profile lookup failed:", profileError.message);
      return response(503, { error: "Dashboard sign-in is temporarily unavailable." });
    }
    if (!profile) {
      return response(401, { error: "Account ID or password is incorrect." });
    }

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.user_id);
    const appMetadata = userData.user?.app_metadata;
    const accountMatches = isEmployee
      ? typeof appMetadata?.username === "string" &&
        appMetadata.username.toLowerCase() === account.toLowerCase()
      : appMetadata?.driver_id === account;
    const isMvsrDriver = role === "school-driver" && account === "MVSR-DRV-001";
    if (
      userError ||
      appMetadata?.intellibus_role !== role ||
      !accountMatches ||
      (isMvsrDriver && (
        appMetadata?.mvsr_test_account !== true ||
        profile.institution !== "MVSR Engineering College" ||
        body.institution !== "Engineering College" ||
        !isLocalTestEnvironment(projectUrl)
      )) ||
      (!userData.user?.email && !userData.user?.phone)
    ) {
      return response(401, { error: "Account ID or password is incorrect." });
    }

    const publicClient = createClient(projectUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const credentials = userData.user.email
      ? { email: userData.user.email, password }
      : { phone: userData.user.phone, password };
    const { data, error } = await publicClient.auth.signInWithPassword(credentials);
    if (error || !data.session || data.user.id !== profile.user_id) {
      return response(401, { error: "Account ID or password is incorrect." });
    }

    return response(200, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      token_type: data.session.token_type,
      expires_in: data.session.expires_in,
      expires_at: data.session.expires_at,
    });
  } catch (error) {
    console.error("Dashboard sign-in request failed:", error);
    return response(400, { error: "Dashboard sign-in request could not be processed." });
  }
});
