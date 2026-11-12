import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CreateCollectionCommand,
  DeleteFacesCommand,
  DetectFacesCommand,
  IndexFacesCommand,
  RekognitionClient,
  SearchFacesByImageCommand,
} from "npm:@aws-sdk/client-rekognition";

const CONSENT_VERSION = "intellibus-biometric-2026-11";
const MATCH_THRESHOLD = 90;
const MAX_IMAGE_BASE64_LENGTH = 5_500_000;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FaceProfile = {
  user_id: string;
  role: "parent" | "student" | "school-driver" | "company-driver" | "employee" | "admin";
  student_id: string | null;
  student_level: "engineering-student" | "junior-student" | null;
  driver_id: string | null;
  username: string | null;
  parent_id: string | null;
  parent_email: string | null;
  institution: string | null;
  is_minor: boolean;
};

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function decodeClaims(token: string) {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("The access token is invalid.");
  const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(decoded) as { auth_time?: number; session_id?: string };
}

function decodeImage(value: unknown): Uint8Array {
  if (typeof value !== "string" || value.length > MAX_IMAGE_BASE64_LENGTH) {
    throw new Error("Capture a smaller face image and try again.");
  }
  const encoded = value.replace(/^data:image\/jpeg;base64,/, "");
  const binary = atob(encoded);
  if (binary.length < 500) throw new Error("The captured image is empty or invalid.");
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function dashboardFor(profile: FaceProfile) {
  if (profile.role === "student") return profile.student_level;
  return profile.role;
}

function isLocalTestEnvironment(projectUrl: string) {
  if (Deno.env.get("MVSR_TEST_MODE") !== "true") return false;
  try {
    return ["localhost", "127.0.0.1", "::1", "kong"].includes(new URL(projectUrl).hostname);
  } catch (error) {
    if (error instanceof TypeError) return false;
    throw error;
  }
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

function isMvsrStudentProfile(profile: {
  student_id?: unknown;
  student_level?: unknown;
  institution?: unknown;
}) {
  return profile.student_level === "engineering-student" &&
    profile.institution === "MVSR Engineering College" &&
    isMvsrStudentId(profile.student_id);
}

async function requireRole(
  admin: SupabaseClient,
  userId: string,
  role: FaceProfile["role"],
): Promise<FaceProfile> {
  const { data: authUser, error: authError } = await admin.auth.admin.getUserById(userId);
  if (
    authError ||
    authUser.user?.app_metadata?.intellibus_role !== role
  ) {
    throw new Error("This account is not authorized for this dashboard.");
  }
  const { data, error } = await admin
    .from("intellibus_profiles")
    .select("user_id,role,student_id,student_level,driver_id,username,parent_id,parent_email,institution,is_minor")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Account role verification failed.");
  if (!data || data.role !== role) throw new Error("This account is not authorized for this dashboard.");
  if (
    (role === "student" && data.student_level === "engineering-student" &&
      (!isMvsrStudentProfile(data) ||
        authUser.user?.app_metadata?.student_id !== data.student_id ||
        authUser.user?.app_metadata?.student_level !== "engineering-student" ||
        authUser.user?.app_metadata?.mvsr_test_account !== true ||
        !isLocalTestEnvironment(Deno.env.get("SUPABASE_URL") || ""))) ||
    (role === "student" && isMvsrStudentId(data.student_id) &&
      data.student_level !== "engineering-student") ||
    (authUser.user?.app_metadata?.mvsr_test_account === true &&
      !isLocalTestEnvironment(Deno.env.get("SUPABASE_URL") || "")) ||
    (role === "school-driver" && data.driver_id === "MVSR-DRV-001" &&
      (data.institution !== "MVSR Engineering College" ||
        authUser.user?.app_metadata?.driver_id !== "MVSR-DRV-001" ||
        authUser.user?.app_metadata?.mvsr_test_account !== true)) ||
    (role === "parent" && authUser.user?.app_metadata?.mvsr_test_account === true &&
      (!isMvsrParentId(data.parent_id) ||
      authUser.user?.app_metadata?.parent_id !== data.parent_id)) ||
    (authUser.user?.app_metadata?.mvsr_test_account === true &&
      role === "student" && !isMvsrStudentProfile(data)) ||
    (authUser.user?.app_metadata?.mvsr_test_account === true &&
      role === "school-driver" && data.driver_id !== "MVSR-DRV-001") ||
    (authUser.user?.app_metadata?.mvsr_test_account === true &&
      role !== "parent" && role !== "student" && role !== "school-driver")
  ) {
    throw new Error("This MVSR test account is not available in the configured environment.");
  }
  return data as FaceProfile;
}

async function requireParentHasStudent(admin: SupabaseClient, userId: string) {
  const { data: parentAuth, error: parentAuthError } = await admin.auth.admin.getUserById(userId);
  if (parentAuthError) throw new Error("Parent account could not be verified.");
  const mvsrTestParent = parentAuth.user?.app_metadata?.mvsr_test_account === true;
  if (
    mvsrTestParent &&
    (!isMvsrParentId(parentAuth.user?.app_metadata?.parent_id) ||
      !isLocalTestEnvironment(Deno.env.get("SUPABASE_URL") || ""))
  ) {
    throw new Error("This MVSR test parent is not available in the configured environment.");
  }
  const { data, error } = await admin
    .from("parent_student_links")
    .select("intellibus_profiles!parent_student_links_student_user_id_fkey(role,student_id,student_level,institution)")
    .eq("parent_user_id", userId);
  if (error) throw new Error("Parent-student relationship could not be verified.");
  const eligibleStudents = await Promise.all((data || []).map(async (link) => {
    const student = link.intellibus_profiles as {
      role: string;
      student_id: string | null;
      student_level: string | null;
      institution: string | null;
    } | null;
    if (student?.role !== "student") return false;
    if (!mvsrTestParent) return true;
    if (!isMvsrStudentProfile(student)) return false;
    const { data: isAuthorizedStudent, error: authorizationError } = await admin.rpc(
      "is_mvsr_engineering_student",
      { p_user_id: link.student_user_id },
    );
    if (authorizationError) throw new Error("MVSR student authorization could not be verified.");
    return isAuthorizedStudent === true;
  }));
  if (!eligibleStudents.some(Boolean)) {
    throw new Error("No authorized student account is linked to this parent.");
  }
}

async function requireRecentAuth(authTime: number | undefined) {
  const ageSeconds = authTime ? Math.floor(Date.now() / 1000) - authTime : Number.MAX_SAFE_INTEGER;
  if (ageSeconds < 0 || ageSeconds > 10 * 60) {
    throw new Error("For your security, sign in again before enrolling or replacing a face.");
  }
}

async function hasConsent(
  admin: SupabaseClient,
  subjectUserId: string,
  consentedBy: string,
  consentType: "subject" | "guardian",
) {
  const { data, error } = await admin
    .from("biometric_consents")
    .select("consented_at,revoked_at")
    .eq("subject_user_id", subjectUserId)
    .eq("consented_by", consentedBy)
    .eq("consent_type", consentType)
    .eq("consent_version", CONSENT_VERSION)
    .order("consented_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Biometric consent status could not be checked.");
  return Boolean(data && !data.revoked_at);
}

async function checkGuardianConsent(admin: SupabaseClient, profile: FaceProfile) {
  if (profile.role !== "student" || !profile.is_minor) return;
  if (await guardianConsentGranted(admin, profile.user_id)) return;
  throw new Error("A linked parent or guardian must first provide biometric consent for this student.");
}

async function guardianConsentGranted(admin: SupabaseClient, studentUserId: string) {
  const { data: links, error: linkError } = await admin
    .from("parent_student_links")
    .select("parent_user_id")
    .eq("student_user_id", studentUserId);
  if (linkError) throw new Error("Guardian relationship could not be verified.");
  for (const link of links || []) {
    if (await hasConsent(admin, studentUserId, link.parent_user_id, "guardian")) return true;
  }
  return false;
}

async function requireVerifiedSession(admin: SupabaseClient, userId: string, sessionId: string) {
  const { data, error } = await admin
    .from("face_enrollments")
    .select("verified_at,verified_session_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data?.verified_at || data.verified_session_id !== sessionId) {
    throw new Error("Complete identity verification before continuing.");
  }
  if (Date.now() - new Date(data.verified_at).getTime() >= 8 * 60 * 60 * 1000) {
    throw new Error("Your identity verification has expired. Verify again to continue.");
  }
}

function createRekognitionClient() {
  const region = Deno.env.get("AWS_REGION");
  const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("Face verification is not configured on the server.");
  }
  return new RekognitionClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function ensureCollection(client: RekognitionClient, collectionId: string) {
  try {
    await client.send(new CreateCollectionCommand({ CollectionId: collectionId }));
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "ResourceAlreadyExistsException") throw error;
  }
}

async function reserveAttempt(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin.rpc("reserve_face_attempt", { p_user_id: userId });
  if (error) throw new Error("Face verification could not be started.");
  if (!data?.allowed) {
    throw new Error("Three attempts have been used. Try again after the temporary lockout or use a verified-contact code.");
  }
  return data.attemptsRemaining as number;
}

async function saveVerified(admin: SupabaseClient, userId: string, sessionId: string) {
  const { error } = await admin.rpc("mark_face_verified", {
    p_user_id: userId,
    p_session_id: sessionId,
  });
  if (error) throw new Error("Verification succeeded, but the secure session could not be recorded.");
}

async function listLinkedStudents(admin: SupabaseClient, parentId: string, mvsrOnly = false) {
  const { data, error } = await admin
    .from("parent_student_links")
    .select("student_user_id,intellibus_profiles!parent_student_links_student_user_id_fkey(user_id,student_id,student_level,institution,role)")
    .eq("parent_user_id", parentId);
  if (error) throw new Error("Linked student accounts could not be loaded.");
  return Promise.all((data || []).map(async (link) => {
    const profile = link.intellibus_profiles as {
      user_id: string;
      student_id: string;
      student_level: string | null;
      institution: string | null;
      role: string;
    } | null;
    if (profile?.role !== "student" || (mvsrOnly && !isMvsrStudentProfile(profile))) return null;
    if (mvsrOnly) {
      const { data: isAuthorizedStudent, error: authorizationError } = await admin.rpc(
        "is_mvsr_engineering_student",
        { p_user_id: profile.user_id },
      );
      if (authorizationError) throw new Error("MVSR student authorization could not be verified.");
      if (isAuthorizedStudent !== true) return null;
    }
    return {
      studentId: profile?.student_id || "",
      consentGranted: profile ? await hasConsent(admin, profile.user_id, parentId, "guardian") : false,
    };
  })).then((students) => students.filter(Boolean));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response(405, { error: "Method not allowed." });
  if (Number(request.headers.get("content-length") || 0) > 6_000_000) {
    return response(413, { error: "Captured image is too large." });
  }

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!projectUrl || !anonKey || !serviceKey) {
    return response(503, { error: "Face verification is not configured on the server." });
  }

  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token || token === authorization) return response(401, { error: "Sign in to continue." });

  const publicClient = createClient(projectUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await publicClient.auth.getUser(token);
  if (authError || !authData.user) return response(401, { error: "Your session has expired. Sign in again." });

  const admin = createClient(projectUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const claims = decodeClaims(token);
    if (!claims.session_id) throw new Error("The authenticated session is invalid.");
    const body = await request.json();
    const action = body.action;
    const userId = authData.user.id;

    if (action === "status") {
      const { data: profile, error } = await admin
        .from("intellibus_profiles")
        .select("user_id,role,student_id,student_level,driver_id,username,parent_id,parent_email,institution,is_minor")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error("Role verification is unavailable.");
      if (!profile || !["parent", "student", "school-driver", "company-driver", "employee", "admin"].includes(profile.role)) {
        throw new Error("This account does not have an authorized IntelliBus dashboard role.");
      }
      if (authData.user.app_metadata?.intellibus_role !== profile.role) {
        throw new Error("This account does not have an administrator-assigned IntelliBus role.");
      }
      const mvsrTestAccount = authData.user.app_metadata?.mvsr_test_account === true;
      const localTestEnvironment = isLocalTestEnvironment(projectUrl);
      if (
        (profile.role === "student" && profile.student_level === "engineering-student" &&
          (!isMvsrStudentProfile(profile) ||
            authData.user.app_metadata?.student_id !== profile.student_id ||
            authData.user.app_metadata?.student_level !== "engineering-student" ||
            !mvsrTestAccount ||
            !localTestEnvironment)) ||
        (profile.role === "student" && isMvsrStudentId(profile.student_id) &&
          profile.student_level !== "engineering-student") ||
        (mvsrTestAccount && !localTestEnvironment) ||
        (profile.role === "school-driver" && profile.driver_id === "MVSR-DRV-001" &&
          (!mvsrTestAccount ||
            profile.institution !== "MVSR Engineering College" ||
            authData.user.app_metadata?.driver_id !== "MVSR-DRV-001")) ||
        (mvsrTestAccount && profile.role === "school-driver" &&
          profile.driver_id !== "MVSR-DRV-001") ||
        (profile.role === "parent" && mvsrTestAccount &&
          (!isMvsrParentId(profile.parent_id) ||
            authData.user.app_metadata?.parent_id !== profile.parent_id)) ||
        (mvsrTestAccount && profile.role === "student" &&
          (!isMvsrStudentProfile(profile) ||
            authData.user.app_metadata?.student_id !== profile.student_id ||
            authData.user.app_metadata?.student_level !== "engineering-student")) ||
        (mvsrTestAccount &&
          profile.role !== "parent" && profile.role !== "student" && profile.role !== "school-driver")
      ) {
        throw new Error("This MVSR test account is not available in the configured environment.");
      }
      if (profile.role === "parent") await requireParentHasStudent(admin, userId);
      const localTestMode = localTestEnvironment && mvsrTestAccount;
      if (localTestMode) {
        const linkedStudents = profile.role === "parent"
          ? await listLinkedStudents(admin, userId, true)
          : [];
        return response(200, {
          success: true,
          role: profile.role,
          dashboard: dashboardFor(profile as FaceProfile),
          accountDisplay: profile.student_id || profile.driver_id || profile.username || profile.parent_id || profile.parent_email || "IntelliBus account",
          studentId: profile.student_id,
          isMinor: profile.role === "student" && profile.is_minor,
          guardianConsentGranted: false,
          enrolled: false,
          verified: true,
          testMode: true,
          attemptsRemaining: 3,
          lockedUntil: null,
          linkedStudents,
        });
      }

      const { data: enrollment, error: enrollmentError } = await admin
        .from("face_enrollments")
        .select("provider_face_id,enrolled_at,attempts_used,locked_until,verified_at,verified_session_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (enrollmentError) throw new Error("Face enrollment status is unavailable.");
      const guardianConsentReady = profile.role !== "student" || !profile.is_minor
        ? true
        : await guardianConsentGranted(admin, userId);
      const verified = Boolean(
        enrollment?.verified_at &&
        enrollment.verified_session_id === claims.session_id &&
        guardianConsentReady &&
        Date.now() - new Date(enrollment.verified_at).getTime() < 8 * 60 * 60 * 1000,
      );
      let linkedStudents = [];
      if (profile.role === "parent") {
        linkedStudents = await listLinkedStudents(admin, userId, mvsrTestAccount);
      }
      return response(200, {
        success: true,
        role: profile.role,
        dashboard: dashboardFor(profile as FaceProfile),
        accountDisplay: profile.student_id || profile.driver_id || profile.username || profile.parent_id || profile.parent_email || "IntelliBus account",
        studentId: profile.student_id,
        isMinor: profile.role === "student" && profile.is_minor,
        guardianConsentGranted: guardianConsentReady,
        enrolled: Boolean(enrollment?.provider_face_id && enrollment.enrolled_at),
        verified,
        attemptsRemaining: Math.max(0, 3 - (enrollment?.attempts_used || 0)),
        lockedUntil: enrollment?.locked_until || null,
        linkedStudents,
      });
    }

    if (action === "consent") {
      const profile = await requireRole(admin, userId, body.role);
      if (body.accepted !== true) throw new Error("Explicit biometric consent is required.");
      if (profile.role === "parent") await requireParentHasStudent(admin, userId);
      if (!await hasConsent(admin, userId, userId, "subject")) {
        const { error } = await admin.from("biometric_consents").insert({
          subject_user_id: userId,
          consented_by: userId,
          consent_type: "subject",
          consent_version: CONSENT_VERSION,
        });
        if (error) throw new Error("Your consent could not be recorded.");
      }
      return response(200, { success: true });
    }

    if (action === "guardian-consent") {
      await requireRole(admin, userId, "parent");
      await requireVerifiedSession(admin, userId, claims.session_id);
      const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";
      if (!studentId || body.accepted !== true) throw new Error("Select a linked student and provide explicit guardian consent.");
      const { data: student, error: studentError } = await admin
        .from("intellibus_profiles")
        .select("user_id,role,student_id,student_level,institution")
        .eq("role", "student")
        .eq("student_id", studentId)
        .maybeSingle();
      if (studentError) throw new Error("Student identity could not be checked.");
      if (!student) throw new Error("That student account is not available.");
      if (
        authData.user.app_metadata?.mvsr_test_account === true &&
        !isMvsrStudentProfile(student)
      ) {
        throw new Error("MVSR test parents may manage only their linked engineering test student.");
      }
      const { data: relationship, error: relationshipError } = await admin
        .from("parent_student_links")
        .select("parent_user_id")
        .eq("parent_user_id", userId)
        .eq("student_user_id", student.user_id)
        .maybeSingle();
      if (relationshipError) throw new Error("Parent-student relationship could not be verified.");
      if (!relationship) throw new Error("You are not authorized to consent for that student.");
      if (!await hasConsent(admin, student.user_id, userId, "guardian")) {
        const { error } = await admin.from("biometric_consents").insert({
          subject_user_id: student.user_id,
          consented_by: userId,
          consent_type: "guardian",
          consent_version: CONSENT_VERSION,
        });
        if (error) throw new Error("Guardian consent could not be recorded.");
      }
      return response(200, { success: true });
    }

    if (action === "guardian-revoke") {
      await requireRole(admin, userId, "parent");
      await requireVerifiedSession(admin, userId, claims.session_id);
      const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";
      const { data: student, error: studentError } = await admin
        .from("intellibus_profiles")
        .select("user_id,student_id,student_level,institution")
        .eq("role", "student")
        .eq("student_id", studentId)
        .maybeSingle();
      if (studentError || !student) throw new Error("That student account is not available.");
      if (
        authData.user.app_metadata?.mvsr_test_account === true &&
        !isMvsrStudentProfile(student)
      ) {
        throw new Error("MVSR test parents may manage only their linked engineering test student.");
      }
      const { data: relationship, error: relationshipError } = await admin
        .from("parent_student_links")
        .select("parent_user_id")
        .eq("parent_user_id", userId)
        .eq("student_user_id", student.user_id)
        .maybeSingle();
      if (relationshipError || !relationship) throw new Error("You are not authorized to manage consent for that student.");
      const { error } = await admin
        .from("biometric_consents")
        .update({ revoked_at: new Date().toISOString() })
        .eq("subject_user_id", student.user_id)
        .eq("consented_by", userId)
        .eq("consent_type", "guardian")
        .is("revoked_at", null);
      if (error) throw new Error("Guardian consent could not be withdrawn.");
      return response(200, { success: true });
    }

    if (action === "enroll") {
      const profile = await requireRole(admin, userId, body.role);
      await requireRecentAuth(claims.auth_time);
      if (!await hasConsent(admin, userId, userId, "subject")) {
        throw new Error("Explicit biometric consent must be recorded before enrollment.");
      }
      if (profile.role === "parent") await requireParentHasStudent(admin, userId);
      await checkGuardianConsent(admin, profile);

      const image = decodeImage(body.image);
      const collectionId = Deno.env.get("AWS_REKOGNITION_COLLECTION_ID") || "intellibus-face-templates";
      const rekognition = createRekognitionClient();
      await ensureCollection(rekognition, collectionId);
      const detected = await rekognition.send(new DetectFacesCommand({
        Image: { Bytes: image },
        Attributes: ["DEFAULT"],
      }));
      if (detected.FaceDetails?.length !== 1) {
        throw new Error("Capture one face in good lighting, with no other people in the frame.");
      }

      const { data: claimed, error: claimError } = await admin.rpc("claim_face_enrollment", {
        p_user_id: userId,
      });
      if (claimError) throw new Error("Face enrollment could not be reserved securely.");
      if (!claimed) throw new Error("Another face enrollment is in progress. Wait a few minutes and retry.");

      try {
        const { data: previous, error: previousError } = await admin
          .from("face_enrollments")
          .select("provider_face_id,enrolled_at")
          .eq("user_id", userId)
          .maybeSingle();
        if (previousError) throw new Error("Existing face enrollment could not be checked.");
        const oldFaceId = previous?.provider_face_id || null;
        const attemptsRemaining = await reserveAttempt(admin, userId);
        if (oldFaceId) {
          const matches = await rekognition.send(new SearchFacesByImageCommand({
            CollectionId: collectionId,
            Image: { Bytes: image },
            FaceMatchThreshold: MATCH_THRESHOLD,
            MaxFaces: 10,
            QualityFilter: "HIGH",
          }));
          const ownMatch = matches.FaceMatches?.find(
            (match) => match.Face?.FaceId === oldFaceId && (match.Similarity || 0) >= MATCH_THRESHOLD,
          );
          if (!ownMatch) {
            return response(401, {
              error: "The captured face does not match the currently enrolled identity. The existing enrollment was not changed.",
              attemptsRemaining,
            });
          }
        }

        const matches = await rekognition.send(new SearchFacesByImageCommand({
          CollectionId: collectionId,
          Image: { Bytes: image },
          FaceMatchThreshold: MATCH_THRESHOLD,
          MaxFaces: 10,
          QualityFilter: "HIGH",
        }));
        const duplicate = matches.FaceMatches?.find(
          (match) => match.Face?.FaceId && match.Face.FaceId !== oldFaceId && (match.Similarity || 0) >= MATCH_THRESHOLD,
        );
        if (duplicate) {
          return response(409, {
            error: "This face is already enrolled to another IntelliBus account. Contact support if you believe this is a mistake.",
            attemptsRemaining,
          });
        }

        const indexed = await rekognition.send(new IndexFacesCommand({
          CollectionId: collectionId,
          Image: { Bytes: image },
          ExternalImageId: userId,
          MaxFaces: 1,
          QualityFilter: "HIGH",
          DetectionAttributes: ["DEFAULT"],
        }));
        if (indexed.FaceRecords?.length !== 1 || indexed.UnindexedFaces?.length) {
          throw new Error("The face image did not meet enrollment quality checks. Try again in better lighting.");
        }
        const newFaceId = indexed.FaceRecords[0].Face?.FaceId;
        if (!newFaceId) throw new Error("The face provider did not return an enrollment reference.");
        const { error: saveError } = await admin.from("face_enrollments").upsert({
          user_id: userId,
          provider_face_id: newFaceId,
          enrolled_at: new Date().toISOString(),
          attempts_used: 0,
          attempt_window_started_at: new Date().toISOString(),
          locked_until: null,
          verified_at: null,
          verified_session_id: null,
          updated_at: new Date().toISOString(),
        });
        if (saveError) {
          try {
            await rekognition.send(new DeleteFacesCommand({
              CollectionId: collectionId,
              FaceIds: [newFaceId],
            }));
          } catch (cleanupError) {
            console.error("Uncommitted Rekognition face cleanup failed:", cleanupError);
          }
          throw new Error("The enrollment could not be saved securely.");
        }
        if (oldFaceId) {
          try {
            await rekognition.send(new DeleteFacesCommand({
              CollectionId: collectionId,
              FaceIds: [oldFaceId],
            }));
          } catch (cleanupError) {
            const { error: restoreError } = await admin
              .from("face_enrollments")
              .update({
                provider_face_id: oldFaceId,
                enrolled_at: previous.enrolled_at,
                verified_at: null,
                verified_session_id: null,
              })
              .eq("user_id", userId);
            if (!restoreError) {
              try {
                await rekognition.send(new DeleteFacesCommand({
                  CollectionId: collectionId,
                  FaceIds: [newFaceId],
                }));
              } catch (newFaceCleanupError) {
                console.error("Replacement Rekognition face cleanup failed:", newFaceCleanupError);
              }
            }
            if (restoreError) console.error("Previous face enrollment restoration failed:", restoreError.message);
            console.error("Previous Rekognition face could not be deleted:", cleanupError);
            throw new Error("The previous face could not be securely retired. The old enrollment was restored where possible; contact support before retrying.");
          }
        }
        return response(200, { success: true, enrolled: true, attemptsRemaining });
      } finally {
        const { error: releaseError } = await admin.rpc("release_face_enrollment", {
          p_user_id: userId,
        });
        if (releaseError) console.error("Face enrollment lock release failed:", releaseError.message);
      }
    }

    if (action === "verify") {
      const profile = await requireRole(admin, userId, body.role);
      if (profile.role === "parent") await requireParentHasStudent(admin, userId);
      await checkGuardianConsent(admin, profile);
      const image = decodeImage(body.image);
      const collectionId = Deno.env.get("AWS_REKOGNITION_COLLECTION_ID") || "intellibus-face-templates";
      const rekognition = createRekognitionClient();
      await ensureCollection(rekognition, collectionId);
      const detected = await rekognition.send(new DetectFacesCommand({
        Image: { Bytes: image },
        Attributes: ["DEFAULT"],
      }));
      if (detected.FaceDetails?.length !== 1) {
        throw new Error("Capture one face in good lighting, with no other people in the frame.");
      }

      const { data: enrollment, error: enrollmentError } = await admin
        .from("face_enrollments")
        .select("provider_face_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (enrollmentError) throw new Error("Face enrollment could not be checked.");
      if (!enrollment?.provider_face_id) throw new Error("Enroll a face before attempting verification.");
      const attemptsRemaining = await reserveAttempt(admin, userId);

      const matches = await rekognition.send(new SearchFacesByImageCommand({
        CollectionId: collectionId,
        Image: { Bytes: image },
        FaceMatchThreshold: MATCH_THRESHOLD,
        MaxFaces: 10,
        QualityFilter: "HIGH",
      }));
      const ownMatch = matches.FaceMatches?.find(
        (match) => match.Face?.FaceId === enrollment.provider_face_id && (match.Similarity || 0) >= MATCH_THRESHOLD,
      );
      if (!ownMatch) {
        return response(401, {
          error: "Face verification failed. Adjust the lighting and try again.",
          attemptsRemaining,
        });
      }
      await saveVerified(admin, userId, claims.session_id!);
      return response(200, { success: true, verified: true, dashboard: dashboardFor(profile) });
    }

    if (action === "start-email-otp") {
      const { data: profile, error: profileError } = await admin
        .from("intellibus_profiles")
        .select("user_id,role,student_id,student_level,driver_id,username,is_minor")
        .eq("user_id", userId)
        .maybeSingle();
      if (profileError || !profile || !["parent", "student", "school-driver", "company-driver", "employee", "admin"].includes(profile.role)) {
        throw new Error("Account role could not be verified.");
      }
      if (authData.user.app_metadata?.intellibus_role !== profile.role) {
        throw new Error("Account role could not be confirmed.");
      }
      if (profile.role === "parent") await requireParentHasStudent(admin, userId);
      if (profile.role === "student") await checkGuardianConsent(admin, profile as FaceProfile);
      const { data: enrollment, error: enrollmentError } = await admin
        .from("face_enrollments")
        .select("provider_face_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (enrollmentError) throw new Error("Face enrollment status is unavailable.");
      if (!enrollment?.provider_face_id) throw new Error("Complete face enrollment before using the email alternative.");
      const deliveryType = authData.user.email && authData.user.email_confirmed_at
        ? "email"
        : authData.user.phone && authData.user.phone_confirmed_at
          ? "sms"
          : null;
      if (!deliveryType) throw new Error("A verified email address or phone number is required for the secure alternative.");
      const { data: latestChallenge, error: latestError } = await admin
        .from("face_email_challenges")
        .select("created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestError) throw new Error("Email verification could not be started.");
      if (latestChallenge && Date.now() - new Date(latestChallenge.created_at).getTime() < 60_000) {
        throw new Error("Wait one minute before requesting another one-time code.");
      }
      const { data: challenge, error: challengeError } = await admin
        .from("face_email_challenges")
        .insert({ user_id: userId, delivery_type: deliveryType })
        .select("challenge_id")
        .single();
      if (challengeError) throw new Error("Email verification could not be started.");
      const otpClient = createClient(projectUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const otpRequest = deliveryType === "email"
        ? await otpClient.auth.signInWithOtp({
          email: authData.user.email!,
          options: { shouldCreateUser: false },
        })
        : await otpClient.auth.signInWithOtp({
          phone: authData.user.phone!,
          options: { shouldCreateUser: false },
        });
      const { error: otpError } = otpRequest;
      if (otpError) {
        await admin.from("face_email_challenges").delete().eq("challenge_id", challenge.challenge_id);
        console.error("Face fallback code delivery failed:", otpError.message);
        throw new Error("The one-time code could not be sent. Check the email/SMS service configuration and try again.");
      }
      return response(200, { success: true, challengeId: challenge.challenge_id, deliveryType });
    }

    if (action === "complete-email-otp") {
      const challengeId = typeof body.challengeId === "string" ? body.challengeId : "";
      if (!challengeId) throw new Error("The email verification request has expired. Start again.");
      const { data: challenge, error: challengeError } = await admin
        .from("face_email_challenges")
        .select("challenge_id,created_at,expires_at,consumed_at")
        .eq("challenge_id", challengeId)
        .eq("user_id", userId)
        .maybeSingle();
      if (challengeError || !challenge || challenge.consumed_at || new Date(challenge.expires_at) < new Date()) {
        throw new Error("The email verification request has expired. Start again.");
      }
      const authTime = claims.auth_time || 0;
      if (authTime * 1000 < new Date(challenge.created_at).getTime() || Date.now() - authTime * 1000 > 10 * 60 * 1000) {
        throw new Error("The code has not been verified for this session. Enter the email code and try again.");
      }
      const { data: enrollment, error: enrollmentError } = await admin
        .from("face_enrollments")
        .select("provider_face_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (enrollmentError || !enrollment?.provider_face_id) {
        throw new Error("Face enrollment status could not be confirmed.");
      }
      const { data: profile, error: profileError } = await admin
        .from("intellibus_profiles")
        .select("user_id,role,student_id,student_level,driver_id,username,is_minor")
        .eq("user_id", userId)
        .maybeSingle();
      if (profileError || !profile || authData.user.app_metadata?.intellibus_role !== profile.role) {
        throw new Error("Account role could not be confirmed.");
      }
      if (profile.role === "parent") await requireParentHasStudent(admin, userId);
      await checkGuardianConsent(admin, profile as FaceProfile);
      const { data: consumedChallenge, error: consumeError } = await admin
        .from("face_email_challenges")
        .update({ consumed_at: new Date().toISOString() })
        .eq("challenge_id", challengeId)
        .is("consumed_at", null)
        .select("challenge_id")
        .maybeSingle();
      if (consumeError || !consumedChallenge) throw new Error("The email verification code could not be recorded.");
      await saveVerified(admin, userId, claims.session_id!);
      return response(200, { success: true, verified: true });
    }

    if (action === "revoke") {
      const profile = await requireRole(admin, userId, body.role);
      await requireRecentAuth(claims.auth_time);
      const { data: enrollment, error } = await admin
        .from("face_enrollments")
        .select("provider_face_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error("Face enrollment could not be loaded.");
      if (enrollment?.provider_face_id) {
        const collectionId = Deno.env.get("AWS_REKOGNITION_COLLECTION_ID") || "intellibus-face-templates";
        await createRekognitionClient().send(new DeleteFacesCommand({
          CollectionId: collectionId,
          FaceIds: [enrollment.provider_face_id],
        }));
      }
      const { error: deleteError } = await admin.from("face_enrollments").delete().eq("user_id", userId);
      if (deleteError) throw new Error("Face enrollment could not be removed from IntelliBus.");
      const { error: consentError } = await admin
        .from("biometric_consents")
        .update({ revoked_at: new Date().toISOString() })
        .eq("subject_user_id", userId)
        .eq("consented_by", userId)
        .eq("consent_type", "subject")
        .is("revoked_at", null);
      if (consentError) throw new Error("Face enrollment was removed, but consent status could not be updated.");
      return response(200, { success: true, role: profile.role });
    }

    return response(400, { error: "Unknown face verification action." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Face verification could not be completed.";
    const isAuthError = /not authorized|sign in again|sign in to continue/i.test(message);
    if (!isAuthError && !/attempt|could not be processed/i.test(message)) {
      console.error("Face verification request failed:", message);
    }
    return response(isAuthError ? 403 : 400, { error: message });
  }
});
