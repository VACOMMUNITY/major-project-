import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SESSION_KEY = "intellibus.supabase.auth.v1";
const isAllowedUrl = (() => {
  try {
    const url = new URL(supabaseUrl);
    return url.protocol === "https:" || ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
})();
const isConfigured =
  typeof supabaseUrl === "string" &&
  isAllowedUrl &&
  !supabaseUrl.includes("your-project") &&
  typeof supabaseAnonKey === "string" &&
  supabaseAnonKey.length > 20 &&
  !supabaseAnonKey.includes("your-public-anon-key");

let client;

export function getSupabaseClient() {
  if (!isConfigured) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.");
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storage: window.sessionStorage,
        storageKey: SESSION_KEY,
      },
    });
  }
  return client;
}

export async function callFaceVerification(action, values = {}) {
  const { data, error } = await getSupabaseClient().functions.invoke("face-verification", {
    body: { action, ...values },
  });
  if (error) {
    let responseBody;
    if (error.context && typeof error.context.json === "function") {
      try {
        responseBody = await error.context.json();
      } catch {
        responseBody = null;
      }
    }
    const failure = new Error(responseBody?.error || error.message || "Face verification could not be completed.");
    if (Number.isInteger(responseBody?.attemptsRemaining)) {
      failure.attemptsRemaining = responseBody.attemptsRemaining;
    }
    throw failure;
  }
  if (!data?.success) throw new Error(data?.error || "Face verification could not be completed.");
  return data;
}

export async function signOut() {
  const { error } = await getSupabaseClient().auth.signOut({ scope: "global" });
  if (error) throw new Error(`Sign out failed: ${error.message}`);
}

export function isSupabaseConfigured() {
  return isConfigured;
}
