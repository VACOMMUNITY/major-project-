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
    return response(503, { error: "Parent sign-in is not configured on the server." });
  }

  try {
    const body = await request.json();
    const identifier = typeof body.identifier === "string"
      ? body.identifier.trim()
      : typeof body.username === "string"
        ? body.username.trim()
        : "";
    const password = typeof body.password === "string" ? body.password : "";
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier) && identifier.length <= 254;
    const isParentId = /^MVSR-PARENT-\d{3}$/.test(identifier);
    const isUsername = /^[A-Za-z]{1,64}$/.test(identifier);
    if ((!isEmail && !isParentId && !isUsername) || !password || password.length > 256) {
      return response(400, { error: "Parent ID, email, or password is incorrect." });
    }

    const admin = createClient(projectUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    let profileQuery = admin
      .from("intellibus_profiles")
      .select("user_id,username,parent_id,parent_email")
      .eq("role", "parent");
    if (isEmail) {
      profileQuery = profileQuery.ilike("parent_email", identifier);
    } else if (isParentId) {
      profileQuery = profileQuery.eq("parent_id", identifier);
    } else {
      profileQuery = profileQuery.ilike("username", identifier);
    }
    const { data: profile, error: profileError } = await profileQuery.maybeSingle();

    if (profileError) {
      console.error("Parent profile lookup failed:", profileError.message);
      return response(503, { error: "Parent sign-in is temporarily unavailable." });
    }
    if (!profile) {
      return response(401, { error: "Parent ID, email, or password is incorrect." });
    }

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.user_id);
    if (
      userError ||
      userData.user?.app_metadata?.intellibus_role !== "parent" ||
      (userData.user?.app_metadata?.mvsr_test_account === true && (
        userData.user.app_metadata.parent_id !== profile.parent_id ||
        !isLocalTestEnvironment(projectUrl)
      )) ||
      (isParentId && userData.user?.app_metadata?.parent_id !== identifier) ||
      (isEmail && userData.user?.email?.toLowerCase() !== identifier.toLowerCase()) ||
      (isUsername && userData.user?.app_metadata?.username?.toLowerCase() !== identifier.toLowerCase()) ||
      !userData.user.email
    ) {
      console.error("Parent auth account lookup failed:", userError?.message || "Parent account metadata is unavailable.");
      return response(401, { error: "Parent ID, email, or password is incorrect." });
    }

    const publicClient = createClient(projectUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await publicClient.auth.signInWithPassword({
      email: userData.user.email,
      password,
    });
    if (error || !data.session || data.user.id !== profile.user_id) {
      return response(401, { error: "Parent ID, email, or password is incorrect." });
    }

    return response(200, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      token_type: data.session.token_type,
      expires_in: data.session.expires_in,
      expires_at: data.session.expires_at,
    });
  } catch (error) {
    console.error("Parent sign-in request failed:", error);
    return response(400, { error: "Parent sign-in request could not be processed." });
  }
});
