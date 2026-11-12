import { useEffect, useState } from "react";
import {
  callFaceVerification,
  getSupabaseClient,
  isSupabaseConfigured,
  signOut as signOutSupabase,
} from "../../ui/assets/face-auth.js";

const signInPath = "/ui/login.html?role=admin";
const faceVerificationPath = "/ui/face-verification.html?role=admin";

export default function AdminGate({ children }) {
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function verifyAdmin() {
      if (!isSupabaseConfigured()) {
        setError("Administrator authentication is not configured for this application.");
        return;
      }

      try {
        const { data, error: sessionError } = await getSupabaseClient().auth.getSession();
        if (!active) return;
        if (sessionError) throw new Error(`The administrator session could not be checked: ${sessionError.message}`);
        if (!data.session) {
          window.location.replace(signInPath);
          return;
        }

        const identity = await callFaceVerification("status");
        if (!active) return;
        if (identity.dashboard !== "admin") {
          await signOutSupabase();
          if (active) window.location.replace("/");
          return;
        }
        if (!identity.verified) {
          window.location.replace(faceVerificationPath);
          return;
        }

        setAuthorized(true);
      } catch (verificationError) {
        if (active) {
          setError(verificationError instanceof Error
            ? verificationError.message
            : "Administrator identity could not be verified.");
        }
      }
    }

    verifyAdmin();
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <main className="admin-auth-status">
        <section className="admin-auth-card" role="alert">
          <h1>Administrator verification unavailable</h1>
          <p>{error}</p>
          <a href={signInPath}>Return to administrator sign in</a>
        </section>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="admin-auth-status" aria-live="polite">
        <p>Checking administrator identity…</p>
      </main>
    );
  }

  return children;
}
