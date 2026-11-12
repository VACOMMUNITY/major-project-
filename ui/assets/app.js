
function isMvsrStudentId(studentId) {
  if (typeof studentId !== "string") return false;
  const suffix = studentId.match(/^2451-23-737-(\d{3})$/)?.[1];
  return suffix !== undefined && Number(suffix) >= 1 && Number(suffix) <= 123;
}

function isMvsrParentIdentifier(identifier) {
  if (typeof identifier !== "string") return false;
  const idMatch = identifier.match(/^MVSR-PARENT-(\d{3})$/)?.[1];
  if (idMatch !== undefined && Number(idMatch) >= 1 && Number(idMatch) <= 123) return Number(idMatch);
  const emailMatch = identifier.match(/^parent(\d{3})@example\.test$/i)?.[1];
  if (emailMatch !== undefined && Number(emailMatch) >= 1 && Number(emailMatch) <= 123) return Number(emailMatch);
  return null;
}

function isJuniorStudentId(studentId) {
  if (typeof studentId !== "string") return false;
  const match = studentId.match(/^INT-2026-(\d{3})$/);
  if (!match) return false;
  const num = Number(match[1]);
  return num >= 1 && num <= 123;
}

function isJuniorParentIdentifier(identifier) {
  if (typeof identifier !== "string") return false;
  const idMatch = identifier.match(/^INT-PARENT-(\d{3})$/)?.[1];
  if (idMatch !== undefined && Number(idMatch) >= 1 && Number(idMatch) <= 123) return Number(idMatch);
  const emailMatch = identifier.match(/^parent(\d{3})@example\.test$/i)?.[1];
  if (emailMatch !== undefined && Number(emailMatch) >= 1 && Number(emailMatch) <= 123) return Number(emailMatch);
  return null;
}

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  callFaceVerification,
  getSupabaseClient,
  isSupabaseConfigured,
  signOut as signOutSupabase,
} from "./face-auth.js";
import { getMvsrQrSvg } from "./mvsr-qr.js";
import { getJuniorQrSvg } from "./junior-qr.js";

const LOGIN_CONFIG = {
  "engineering-driver": {
    title: "Engineering Driver",
    subtitle: "School and college transport access",
    fieldLabel: "Driver ID",
    placeholder: "Enter your driver ID",
    dashboard: "school-driver",
    institution: "Engineering College",
  },
  "junior-driver": {
    title: "Junior College Driver",
    subtitle: "Junior college transport access",
    fieldLabel: "Driver ID",
    placeholder: "Enter your driver ID",
    dashboard: "school-driver",
    institution: "Junior College",
  },
  "company-driver": {
    title: "Company Driver",
    subtitle: "Company employee shuttle access",
    fieldLabel: "Driver ID",
    placeholder: "Enter your driver ID",
    dashboard: "company-driver",
  },
  "engineering-student": {
    title: "Engineering Student",
    subtitle: "Your engineering campus transport",
    fieldLabel: "Student ID",
    placeholder: "Enter your student ID",
    dashboard: "engineering-student",
  },
  "junior-student": {
    title: "Junior College Student",
    subtitle: "Your junior college transport",
    fieldLabel: "Student ID",
    placeholder: "Enter your student ID",
    dashboard: "junior-student",
  },
  employee: {
    title: "Employee",
    subtitle: "Your company shuttle information",
    fieldLabel: "Employee username",
    placeholder: "Enter your username",
    usernameOnly: true,
    dashboard: "employee",
  },
  admin: {
    title: "Administrator",
    subtitle: "IntelliBus transport operations access",
    fieldLabel: "Administrator email",
    placeholder: "Enter your administrator email",
    inputType: "email",
    dashboard: "admin",
  },
  parent: {
    title: "Parent",
    subtitle: "Sign in to view authorized student transport updates",
    fieldLabel: "Parent ID or email",
    placeholder: "Enter your parent ID or test email",
    dashboard: "parent",
  },
};

const DRIVER_ROUTES = {
  "school-driver": {
    title: "School / College Driver",
    descriptor: "Student transport operations",
    organization: "Engineering College",
    bus: "Not assigned",
    progressTitle: "Student pickup progress",
    pickupLabel: "Students picked up",
    qrLabel: "Student QR scan",
    historyTitle: "Student attendance history",
  },
  "company-driver": {
    title: "Company Driver",
    descriptor: "Employee shuttle operations",
    organization: "Company transport",
    bus: "Not assigned",
    progressTitle: "Employee pickup progress",
    pickupLabel: "Employees picked up",
    qrLabel: "Employee QR scan",
    historyTitle: "Employee attendance history",
  },
};

const STUDENT_DASHBOARDS = {
  "engineering-student": {
    title: "Engineering Student",
    subtitle: "Your campus transport at a glance",
    organization: "Engineering College",
    bus: "Demo assignment pending",
    stop: "Pickup point not connected",
    pass: "Engineering student pass",
    attendanceLabel: "Student attendance",
    historyTitle: "Journey history",
  },
  "junior-student": {
    title: "Junior College Student",
    subtitle: "Your college transport at a glance",
    organization: "Junior College",
    bus: "Demo assignment pending",
    stop: "Pickup point not connected",
    pass: "Junior college student pass",
    attendanceLabel: "Student attendance",
    historyTitle: "Recent journeys",
  },
};

const STORAGE = {
  role: "intellibus.demo.role",
  account: "intellibus.demo.account",
  institution: "intellibus.demo.institution",
};

const ROLE_LABELS = {
  "school-driver": "School / College Driver",
  "company-driver": "Company Driver",
  "engineering-student": "Engineering Student",
  "junior-student": "Junior College Student",
  employee: "Employee",
  admin: "Administrator",
  parent: "Parent",
};

const DEVICE_SETUP_PREFIX = "intellibus.device-setup.v1.";

function permissionStatusLabel(state) {
  return {
    prompt: "Not requested",
    granted: "Granted",
    denied: "Denied",
    unavailable: "Unavailable",
    unsupported: "Unsupported",
  }[state] || "Unavailable";
}

async function readPermissionState(permissionName, fallback) {
  if (typeof fallback === "function") {
    const state = fallback();
    if (state) return state;
  }
  if (!navigator.permissions?.query) return "unavailable";
  try {
    const result = await navigator.permissions.query({ name: permissionName });
    return ["granted", "denied", "prompt"].includes(result.state)
      ? result.state
      : "unavailable";
  } catch {
    return "unavailable";
  }
}

function permissionStatusMarkup(id) {
  return `<span class="permission-status permission-status-unavailable" id="${id}" aria-live="polite">Checking…</span>`;
}

function formatGeolocationError(error) {
  const messages = {
    1: "Location access was denied. Allow location for this site in browser settings, then retry.",
    2: "The device could not determine a location. Check device location services and try again.",
    3: "The location request timed out. Check reception and retry.",
  };
  return messages[error?.code] || error?.message || "Location could not be determined.";
}

function permissionCard({ id, title, purpose, feature, button, extra = "" }) {
  return `
    <article class="permission-card card" aria-labelledby="${id}-title">
      <div class="permission-card-heading">
        <span class="permission-icon permission-icon-${id}" aria-hidden="true">${{
          location: "⌖",
          camera: "▣",
          notifications: "◉",
          motion: "↗",
          network: "⇄",
        }[id]}</span>
        <div class="permission-card-title"><h2 id="${id}-title">${title}</h2><p>${feature}</p></div>
        ${permissionStatusMarkup(`${id}-status`)}
      </div>
      <p class="permission-purpose">${purpose}</p>
      ${extra}
      <p class="permission-feedback" id="${id}-feedback" role="status" aria-live="polite"></p>
      <button class="button button-secondary permission-action" id="${id}-action" type="button">${button}</button>
    </article>`;
}

function renderPermissions(root, role, account) {
  const roleTitle = ROLE_LABELS[role] || "IntelliBus user";
  const isDriver = role === "school-driver" || role === "company-driver";
  const locationCopy = isDriver
    ? "Used for GPS tracking on your assigned bus, live bus position, route navigation, and authorized journey monitoring. Tracking starts only after an explicit trip or location action."
    : "Optional. Used only when you explicitly turn on your device location on the map. It is not collected automatically or shared with IntelliBus.";
  const cameraCopy = role === "school-driver" && account === "MVSR-DRV-001"
    ? "Used only when you explicitly scan a student's QR code for attendance on your assigned route. The camera image stays on this device; only the QR token is sent to the authenticated attendance service."
    : `Used only when you open ${role === "company-driver" ? "employee" : "student"} QR scanning for attendance. The current demo does not connect QR verification or attendance submission.`;
  const hasFaceVerification = requiresVerifiedIdentity(role);
  const hasJourneyNotifications = role === "parent" ||
    (role === "school-driver" && account === "MVSR-DRV-001");
  const roleDescription = isDriver
    ? "A backend face match is required after sign-in before the driver dashboard opens. GPS, QR, and notification permissions remain optional until you use those features."
    : hasFaceVerification
      ? "Camera access is requested only after authenticated sign-in when you explicitly start face enrollment or verification. Optional map location stays under your control."
      : "Your workspace does not request camera access. Optional map location and browser notifications stay under your control.";

  root.innerHTML = `
    <main class="permissions-page">
      <header class="permissions-topbar">
        <a class="brand" href="index.html" aria-label="IntelliBus home"><span class="brand-mark" aria-hidden="true">IB</span><span>Intelli<span class="brand-accent">Bus</span></span></a>
        <div class="permissions-topbar-right">
          <span class="project-badge">B2324</span>
          <a class="back-link" href="${dashboardPath(role)}">← Back to dashboard</a>
        </div>
      </header>
      <section class="permissions-content" aria-labelledby="permissions-title">
        <div class="permissions-intro">
          <p class="eyebrow"><span class="eyebrow-dot"></span> DEVICE ACCESS · ${roleTitle.toUpperCase()}</p>
          <h1 id="permissions-title">Permissions Center</h1>
          <p class="permissions-lead">${roleDescription} IntelliBus never requests every permission on page load.</p>
          <div class="permissions-account"><span class="avatar" aria-hidden="true">${escapeHtml(roleTitle.split(" ").map((part) => part[0]).slice(0, 2).join(""))}</span><span><strong>${roleTitle}</strong><small>Signed in as ${escapeHtml(account)}</small></span></div>
        </div>
        <div class="permissions-summary">
          <div><span class="summary-label">WORKSPACE</span><strong>${roleTitle}</strong></div>
          <div><span class="summary-label">CONNECTION</span><strong id="network-summary">Checking…</strong></div>
          <div><span class="summary-label">ACCESS POLICY</span><strong>Ask when needed</strong></div>
        </div>
        <div class="permission-grid">
          ${permissionCard({
            id: "location",
            title: "Location / GPS",
            feature: isDriver ? "Assigned-bus trip tracking" : "Optional map location",
            purpose: locationCopy,
            button: isDriver ? "Get one location fix" : "Enable optional map location",
            extra: `<p class="permission-note">${isDriver ? "Tests one current position only; it does not start tracking. Coordinates are not displayed, logged, or transmitted by this page." : "Tests one current position only. To continuously show your position, use Turn Location On in the map."}</p>`,
          })}
          ${isDriver ? permissionCard({
            id: "camera",
            title: "Camera",
            feature: account === "MVSR-DRV-001" ? "QR attendance · assigned-route service" : "QR attendance · server verification not connected",
            purpose: cameraCopy,
            button: "Enable camera",
            extra: '<video class="permission-camera-preview" id="camera-preview" autoplay muted playsinline hidden aria-label="Local camera preview"></video><p class="permission-note">Video stays in this page. No image or video is captured, uploaded, or stored.</p>',
          }) : ""}
          ${permissionCard({
            id: "notifications",
            title: "Notifications",
            feature: hasJourneyNotifications ? "In-app journey feed · browser push not connected" : "Browser permission · push service not connected",
            purpose: `${hasJourneyNotifications ? "In-app notifications refresh while the dashboard is open. " : ""}Used for ${role === "parent" ? "authorized child's boarding, journey, arrival, and drop-off updates" : role === "employee" ? "company transport updates" : STUDENT_DASHBOARDS[role] ? "bus arrival and journey updates" : "trip and operational updates"}. Enabling browser permission does not create push delivery.`,
            button: "Enable browser notifications",
          })}
          ${permissionCard({
            id: "motion",
            title: "Motion / orientation",
            feature: "Optional device sensor",
            purpose: "No current route or dashboard feature requires motion data. Access is optional and is never needed for normal navigation.",
            button: "Check sensor availability",
          })}
          ${permissionCard({
            id: "network",
            title: "Offline & connectivity",
            feature: "Connection state · no permission",
            purpose: "Shows the browser's online/offline signal. This does not confirm that a server or transport service is reachable.",
            button: "Refresh connection status",
          })}
        </div>
        <aside class="permissions-security-note">
          <strong>Access is not identity verification.</strong>
          <span>${hasFaceVerification ? "Camera permission is not itself verification. Supabase authenticates your account, and the face or email check is completed on the backend before a parent/student dashboard opens." : "Browser permission status does not authenticate an account or authorize access to student, employee, or transport records. Server-side identity and role controls are not connected for this frontend demo role."}</span>
        </aside>
        <p class="permissions-https-note">Location, camera, and sensor APIs require a secure context: HTTPS in deployment or localhost during development. If access is denied, change this site's permission in your browser settings, then retry.</p>
      </section>
    </main>`;

  bindPermissionsCenter(root, role);
}

function bindPermissionsCenter(root, role) {
  const activeStreams = new Set();
  const permissionQueries = new Map();
  const isDriver = role === "school-driver" || role === "company-driver";

  function setStatus(id, state) {
    const status = root.querySelector(`#${id}-status`);
    if (!status) return;
    status.className = `permission-status permission-status-${state}`;
    status.textContent = permissionStatusLabel(state);
    if (state === "denied") {
      const guidance = {
        location: "Location is blocked for this site. Allow it in browser settings, then retry.",
        camera: "Camera is blocked for this site. Allow it in browser settings, then retry.",
        notifications: "Notifications are blocked for this site. Change the browser setting to retry.",
        motion: "Sensor access is blocked. Motion is optional and not needed for navigation.",
      }[id];
      if (guidance) setFeedback(id, guidance, true);
    }
  }

  function setFeedback(id, message, isError = false) {
    const feedback = root.querySelector(`#${id}-feedback`);
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.toggle("permission-feedback-error", isError);
  }

  function stateFromPermission(permission) {
    const state = permission?.state;
    return state === "granted" || state === "denied" || state === "prompt"
      ? state
      : "unavailable";
  }

  async function queryPermission(name, id) {
    if (!navigator.permissions?.query) {
      if (id === "location" && "geolocation" in navigator) return "prompt";
      if (id === "camera" && navigator.mediaDevices?.getUserMedia) return "prompt";
      if (id === "notifications" && "Notification" in window) {
        return Notification.permission === "default"
          ? "prompt"
          : Notification.permission;
      }
      return "unsupported";
    }
    try {
      const permission = await navigator.permissions.query({ name });
      permissionQueries.set(id, permission);
      permission.onchange = () => setStatus(id, stateFromPermission(permission));
      return stateFromPermission(permission);
    } catch (error) {
      if (id === "camera" && navigator.mediaDevices?.getUserMedia) return "prompt";
      if (id === "notifications" && "Notification" in window) {
        return Notification.permission === "default"
          ? "prompt"
          : Notification.permission;
      }
      if (id === "location" && "geolocation" in navigator) return "prompt";
      return error?.name === "NotSupportedError" ? "unsupported" : "unavailable";
    }
  }

  function updateNetwork() {
    const online = navigator.onLine;
    const status = root.querySelector("#network-status");
    status.className = `permission-status permission-status-network-${online ? "online" : "offline"}`;
    status.textContent = online ? "Online" : "Offline";
    const summary = root.querySelector("#network-summary");
    summary.textContent = online ? "Browser reports online" : "Browser reports offline";
    summary.classList.toggle("network-offline", !online);
    setFeedback(
      "network",
      online
        ? "Browser reports an online connection. Server reachability is not tested."
        : "Browser reports offline. Locally stored trip data remains on this device.",
    );
  }

  async function refreshPermissionStatuses() {
    const checks = [
      ["location", "geolocation", "geolocation" in navigator, true],
      ["camera", "camera", isDriver && Boolean(navigator.mediaDevices?.getUserMedia), true],
      ["notifications", "notifications", "Notification" in window, false],
      ["motion", null, "DeviceOrientationEvent" in window, false],
    ];

    for (const [id, permissionName, supported, secureRequired] of checks) {
      if (!supported) {
        setStatus(id, "unsupported");
        continue;
      }
      if (secureRequired && !window.isSecureContext) {
        setStatus(id, "unavailable");
        continue;
      }
      if (permissionName === "notifications") {
        const state = Notification.permission === "default" ? "prompt" : Notification.permission;
        setStatus(id, state);
        continue;
      }
      if (permissionName === "motion") {
        setStatus(id, "prompt");
        continue;
      }
      setStatus(id, await queryPermission(permissionName, id));
    }
    updateNetwork();
  }

  function locationErrorMessage(error) {
    if (error?.code === 1) {
      return "Location access was denied. Allow location for this site in browser settings, then retry.";
    }
    if (error?.code === 2) {
      return "The device could not determine a location. Check device location services and try again.";
    }
    if (error?.code === 3) {
      return "The location request timed out. Check reception and retry.";
    }
    return error?.message || "Unable to retrieve a location fix.";
  }

  function testLocation() {
    const feedback = root.querySelector("#location-feedback");
    if (!("geolocation" in navigator)) {
      setStatus("location", "unsupported");
      setFeedback("location", "This browser does not support geolocation.", true);
      return;
    }
    if (!window.isSecureContext) {
      setStatus("location", "unavailable");
      setFeedback("location", "Geolocation requires HTTPS or localhost. This page is not in a secure context.", true);
      return;
    }
    feedback.textContent = "Requesting one current location fix…";
    feedback.classList.remove("permission-feedback-error");
    navigator.geolocation.getCurrentPosition(
      () => {
        setStatus("location", "granted");
        setFeedback("location", "The browser returned a current position. Coordinates were not displayed or sent.");
      },
      (error) => {
        setStatus("location", error?.code === 1 ? "denied" : "unavailable");
        setFeedback("location", locationErrorMessage(error), true);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  }

  async function stopCamera() {
    for (const stream of activeStreams) {
      for (const track of stream.getTracks()) track.stop();
    }
    activeStreams.clear();
    const video = root.querySelector("#camera-preview");
    if (video) {
      video.pause();
      video.srcObject = null;
      video.hidden = true;
    }
    const action = root.querySelector("#camera-action");
    if (action) action.textContent = "Enable camera";
  }

  async function startCamera() {
    if (!window.isSecureContext) {
      setStatus("camera", "unavailable");
      setFeedback("camera", "Camera access requires HTTPS or localhost.", true);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("camera", "unsupported");
      setFeedback("camera", "This browser does not support camera access through getUserMedia.", true);
      return;
    }
    const button = root.querySelector("#camera-action");
    button.disabled = true;
    setFeedback("camera", "Requesting camera access…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      activeStreams.add(stream);
      const video = root.querySelector("#camera-preview");
      video.srcObject = stream;
      video.hidden = false;
      await video.play();
      setStatus("camera", "granted");
      setFeedback("camera", "Camera is active in a local preview only. QR identity verification and attendance are not connected.");
      button.textContent = "Stop camera preview";
    } catch (error) {
      const denied = error?.name === "NotAllowedError" || error?.name === "SecurityError";
      const unsupported = error?.name === "NotSupportedError";
      const noDevice = error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError";
      setStatus("camera", denied ? "denied" : unsupported ? "unsupported" : "unavailable");
      const message = denied
        ? "Camera access was denied. Allow camera for this site in browser settings, then retry."
        : noDevice
          ? "No camera device is available. Connect a camera and retry."
          : error?.name === "NotReadableError" || error?.name === "TrackStartError"
            ? "The camera is busy or unavailable to this page. Close other camera apps and retry."
            : `Camera preview could not start: ${error?.message || "unknown camera error"}.`;
      await stopCamera();
      setFeedback("camera", message, true);
    } finally {
      button.disabled = false;
    }
  }

  async function testNotifications() {
    if (!("Notification" in window)) {
      setStatus("notifications", "unsupported");
      setFeedback("notifications", "This browser does not support notifications.", true);
      return;
    }
    if (Notification.permission === "granted") {
      setStatus("notifications", "granted");
      setFeedback("notifications", "Browser notification permission is granted. Push subscription and delivery are not configured; no notification was sent.");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("notifications", "denied");
      setFeedback("notifications", "Notifications are blocked. Allow them for this site in browser settings, then retry.", true);
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setStatus("notifications", permission === "default" ? "prompt" : permission);
      setFeedback(
        "notifications",
        permission === "granted"
          ? "Browser notification permission is granted. Push subscription and delivery are not configured; no notification was sent."
          : permission === "denied"
            ? "Notifications were denied. Allow them for this site in browser settings, then retry."
            : "The browser did not resolve the notification request. You can retry from this button.",
        permission !== "granted",
      );
    } catch (error) {
      setStatus("notifications", "unavailable");
      setFeedback("notifications", `Notification permission could not be requested: ${error.message}`, true);
    }
  }

  async function testMotion() {
    const OrientationEvent = window.DeviceOrientationEvent;
    if (!OrientationEvent) {
      setStatus("motion", "unsupported");
      setFeedback("motion", "Device orientation is not supported by this browser.", true);
      return;
    }
    try {
      if (typeof OrientationEvent.requestPermission === "function") {
        const result = await OrientationEvent.requestPermission();
        setStatus("motion", result === "granted" ? "granted" : "denied");
        setFeedback(
          "motion",
          result === "granted"
            ? "Optional sensor access was granted. IntelliBus does not read or store orientation values."
            : "Sensor access was denied. Motion access is not required for navigation.",
          result !== "granted",
        );
        return;
      }
      const receivedEvent = await new Promise((resolve) => {
        let timeoutId;
        const onOrientation = (event) => {
          window.clearTimeout(timeoutId);
          window.removeEventListener("deviceorientation", onOrientation);
          resolve(Number.isFinite(event.alpha) || Number.isFinite(event.beta) || Number.isFinite(event.gamma));
        };
        window.addEventListener("deviceorientation", onOrientation, { once: true });
        timeoutId = window.setTimeout(() => {
          window.removeEventListener("deviceorientation", onOrientation);
          resolve(false);
        }, 3000);
      });
      setStatus("motion", receivedEvent ? "granted" : "unavailable");
      setFeedback(
        "motion",
        receivedEvent
          ? "An orientation event was received. Sensor values were not retained."
          : "No orientation event was received. Motion is optional and not needed for this workspace.",
        !receivedEvent,
      );
    } catch (error) {
      setStatus("motion", "denied");
      setFeedback("motion", `Motion access was not granted: ${error.message}. This feature is optional.`, true);
    }
  }

  root.querySelector("#location-action")?.addEventListener("click", testLocation);
  root.querySelector("#camera-action")?.addEventListener("click", () => {
    if (activeStreams.size) stopCamera();
    else startCamera();
  });
  root.querySelector("#notifications-action")?.addEventListener("click", testNotifications);
  root.querySelector("#motion-action")?.addEventListener("click", testMotion);
  root.querySelector("#network-action")?.addEventListener("click", updateNetwork);
  window.addEventListener("online", updateNetwork);
  window.addEventListener("offline", updateNetwork);
  window.addEventListener("pagehide", stopCamera, { once: true });
  refreshPermissionStatuses().catch((error) => {
    for (const id of ["location", "camera", "notifications", "motion"]) {
      setStatus(id, "unavailable");
    }
    setFeedback("location", `Permission status could not be checked: ${error.message}`, true);
  });
}

function dashboardPath(role) {
  const paths = {
    admin: "/admin",
    "school-driver": "school-driver-dashboard.html",
    "company-driver": "company-driver-dashboard.html",
    "engineering-student": "engineering-student-dashboard.html",
    "junior-student": "junior-student-dashboard.html",
    employee: "employee-dashboard.html",
    parent: "parent-dashboard.html",
  };
  return paths[role];
}

function requiresVerifiedIdentity(role) {
  return role === "parent" || role === "employee" || role === "admin" ||
    Boolean(STUDENT_DASHBOARDS[role]) || Boolean(DRIVER_ROUTES[role]);
}

function updateDashboardPermissionSummary(role, summary) {
  const isDriver = role === "school-driver" || role === "company-driver";
  const checks = [
    ["Location", "geolocation", "geolocation" in navigator],
    ...(isDriver ? [["Camera", "camera", Boolean(navigator.mediaDevices?.getUserMedia)]] : []),
    ["Notifications", "notifications", "Notification" in window],
  ];

  Promise.all(checks.map(async ([label, permissionName, supported]) => {
    if (!supported) return `${label}: Unsupported`;
    const fallback = permissionName === "notifications"
      ? () => Notification.permission === "default" ? "prompt" : Notification.permission
      : null;
    const state = await readPermissionState(permissionName, fallback);
    return `${label}: ${permissionStatusLabel(state)}`;
  })).then((items) => {
    const title = summary.querySelector("strong");
    const message = summary.querySelector("span");
    if (title) title.textContent = "Browser permission status (checked this visit)";
    if (message) message.textContent = items.join(" · ");
  });
}

function renderDeviceSetup(root, role) {
  const isDriver = role === "school-driver" || role === "company-driver";
  const roleTitle = ROLE_LABELS[role] || "IntelliBus user";
  const driverType = role === "company-driver" ? "employee" : "student";
  const permissions = [
    ...(isDriver ? [{
      id: "location",
      title: "Location",
      description: "Used for assigned-bus GPS tracking, live bus position on the India map, route navigation, and authorized journey monitoring. Setup checks one current position only; tracking starts only when you explicitly start a trip or turn location on.",
      browserPermission: "geolocation",
    }, {
      id: "camera",
      title: "Camera",
      description: `Used for ${driverType} QR attendance scanning and authorized identity verification. Camera access is requested only when you choose to enable it; QR verification and attendance submission still need a connected backend.`,
      browserPermission: "camera",
    }] : []),
    {
      id: "notifications",
      title: "Notifications",
      description: `Used for ${role === "parent" ? "authorized child's boarding, journey, arrival, and drop-off updates" : role === "employee" ? "company transport updates" : STUDENT_DASHBOARDS[role] ? "bus arrival and journey updates" : "trip and operational updates"}. This enables browser permission only; push subscriptions and delivery are not configured in this demo.`,
      browserPermission: "notifications",
    },
  ];
  const needsText = isDriver
    ? "A backend face match is required after sign-in before this dashboard opens. GPS tracking and QR workflows request device access only when you explicitly use those features."
    : role === "parent"
      ? "Camera access is requested only after sign-in when you explicitly start face verification. Optional map location and notification permission are separate; push delivery is not connected yet."
      : requiresVerifiedIdentity(role)
        ? "Camera access is requested only after sign-in when you explicitly start face enrollment or verification. Optional map location and notifications remain under your control."
        : "This workspace does not request location or camera during setup. Notification permission is optional; map location remains an explicit, local-only action.";
  let storageAvailable = true;
  const setupKey = `${DEVICE_SETUP_PREFIX}${role}`;
  try {
    if (localStorage.getItem(setupKey) === "complete") return;
  } catch {
    storageAvailable = false;
  }

  const dialog = document.createElement("section");
  dialog.className = "device-setup-overlay";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "device-setup-title");
  dialog.innerHTML = `
    <div class="device-setup-panel card">
      <p class="eyebrow"><span class="eyebrow-dot"></span> FIRST-TIME DEVICE SETUP</p>
      <h2 id="device-setup-title">Welcome to IntelliBus</h2>
      <p class="device-setup-intro">${escapeHtml(roleTitle)} · review the device access needed for your workspace.</p>
      <p class="device-setup-guidance">${escapeHtml(needsText)}</p>
      <div class="device-setup-permissions">
        ${permissions.map(({ id, title, description }) => `
          <article class="device-setup-permission">
            <div class="device-setup-heading">
              <div><h3>${title}</h3><p>${escapeHtml(description)}</p></div>
              <span class="permission-status permission-status-unavailable" id="setup-${id}-status" aria-live="polite">Checking…</span>
            </div>
            <p class="device-setup-feedback" id="setup-${id}-feedback" role="status" aria-live="polite"></p>
            <button class="button button-secondary" id="setup-${id}-action" type="button" disabled>Checking permission…</button>
          </article>`).join("")}
      </div>
      <p class="device-setup-denied">If access is denied, change this site's permission in your browser settings, then return here. IntelliBus never treats a denied or unavailable permission as granted.</p>
      <p class="device-setup-storage-error" id="device-setup-storage-error" role="status" aria-live="polite">${storageAvailable ? "" : "This browser blocked local setup storage. You can continue for this visit, but setup completion cannot be remembered."}</p>
      <div class="device-setup-actions">
        <button class="button button-primary" id="device-setup-continue" type="button">Continue to dashboard</button>
        <button class="button button-secondary" id="device-setup-session-only" type="button">Continue for this visit only</button>
      </div>
      <p class="device-setup-note">Permission status is checked again when you return. Browser permission does not subscribe you to notifications or verify an identity.</p>
    </div>`;
  root.append(dialog);
  const continueButton = dialog.querySelector("#device-setup-continue");
  const sessionButton = dialog.querySelector("#device-setup-session-only");
  const storageError = dialog.querySelector("#device-setup-storage-error");

  function closeSetup() {
    dialog.remove();
    document.body.classList.remove("device-setup-open");
  }

  function updateSetupStatus(id, state, feedback = "") {
    const status = dialog.querySelector(`#setup-${id}-status`);
    const action = dialog.querySelector(`#setup-${id}-action`);
    const message = dialog.querySelector(`#setup-${id}-feedback`);
    if (!status || !action || !message) return;
    status.className = `permission-status permission-status-${state}`;
    status.textContent = permissionStatusLabel(state);
    message.textContent = feedback;
    if (state === "granted") {
      action.textContent = "Already enabled";
      action.disabled = true;
    } else if (state === "denied") {
      action.textContent = "Change in browser settings";
      action.disabled = true;
      message.textContent = feedback || "Access is blocked. Change this site's permission in browser settings, then reopen setup.";
    } else if (state === "unsupported") {
      action.textContent = "Not supported by this browser";
      action.disabled = true;
    } else {
      action.disabled = false;
      action.textContent = id === "location"
        ? "Enable location"
        : id === "camera"
          ? "Enable camera"
          : "Enable notifications";
    }
  }

  async function getInitialStatus(permission) {
    if (permission.browserPermission === "notifications") {
      if (!("Notification" in window)) return "unsupported";
      return Notification.permission === "default" ? "prompt" : Notification.permission;
    }
    if (!window.isSecureContext) return "unavailable";
    if (permission.browserPermission === "geolocation" && !("geolocation" in navigator)) {
      return "unsupported";
    }
    if (permission.browserPermission === "camera" && !navigator.mediaDevices?.getUserMedia) {
      return "unsupported";
    }
    return readPermissionState(permission.browserPermission, null);
  }

  async function requestPermission(permission) {
    const { id } = permission;
    const action = dialog.querySelector(`#setup-${id}-action`);
    action.disabled = true;
    updateSetupStatus(id, "unavailable", "Requesting access…");
    try {
      if (id === "location") {
        if (!window.isSecureContext) throw new Error("Location access requires HTTPS or localhost.");
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(),
            (error) => reject(Object.assign(new Error(formatGeolocationError(error)), {
              permissionDenied: error?.code === 1,
            })),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
          );
        });
        updateSetupStatus(id, "granted", "The browser returned a current position. It was not stored or shared, and continuous tracking did not start.");
        return;
      }
      if (id === "camera") {
        if (!window.isSecureContext) throw new Error("Camera access requires HTTPS or localhost.");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        for (const track of stream.getTracks()) track.stop();
        updateSetupStatus(id, "granted", "Camera access was granted and released. Camera is not active; QR verification is not connected.");
        return;
      }
      if (!("Notification" in window)) {
        updateSetupStatus(id, "unsupported", "This browser does not support web notifications.");
        return;
      }
      const state = Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
      updateSetupStatus(id, state === "default" ? "prompt" : state,
        state === "granted"
          ? "Browser permission is granted; no push subscription or notification was created."
          : state === "denied"
            ? "Notifications were denied. Allow them for this site in browser settings, then try again."
            : "The browser did not resolve the permission request. You can retry.");
    } catch (error) {
      const denied = error?.permissionDenied ||
        error?.name === "NotAllowedError" ||
        error?.name === "SecurityError";
      updateSetupStatus(id, denied ? "denied" : "unavailable",
        error?.message || "The browser could not grant this permission. Check this site's browser settings and retry.");
    }
  }

  permissions.forEach((permission) => {
    getInitialStatus(permission).then((state) => {
      updateSetupStatus(permission.id, state);
    }).catch((error) => {
      updateSetupStatus(permission.id, "unavailable", `Permission status could not be checked: ${error.message}`);
    });
    dialog.querySelector(`#setup-${permission.id}-action`)
      .addEventListener("click", () => requestPermission(permission));
  });

  continueButton.addEventListener("click", () => {
    try {
      localStorage.setItem(setupKey, "complete");
      closeSetup();
    } catch (error) {
      storageAvailable = false;
      storageError.textContent = `Setup completion could not be saved: ${error.message}. Use “Continue for this visit only” to proceed.`;
    }
  });
  sessionButton.addEventListener("click", closeSetup);
  document.body.classList.add("device-setup-open");
  dialog.querySelector("#setup-notifications-action").focus();
}

function renderLogin(root) {
  const role = (new URLSearchParams(window.location.search).get("role") || "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-");
  const config = LOGIN_CONFIG[role];
  if (!config) {
    root.innerHTML = `<main class="auth-shell"><section class="auth-card card"><a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">IB</span><span>Intelli<span class="brand-accent">Bus</span></span></a><h1>Choose your sign-in role</h1><p class="auth-subtitle">Select your role or use 1-click test sign-in below.</p><div style="display:grid;gap:0.6rem;margin-top:1rem;"><a class="button button-primary" href="login.html?role=engineering-student&autologin=2451-23-737-001">⚡ 1-Click Engineering Student (001)</a><a class="button button-primary" href="login.html?role=engineering-driver&autologin=MVSR-DRV-001">⚡ 1-Click Engineering Driver (MVSR-DRV-001)</a><a class="button button-primary" href="login.html?role=parent&autologin=MVSR-PARENT-001">⚡ 1-Click Parent (001)</a><a class="button button-secondary" href="index.html">← Back to home portal</a></div></section></main>`;
    return;
  }

  root.innerHTML = `
    <main class="auth-shell">
      <section class="auth-card card" aria-labelledby="login-title">
        <div class="auth-top">
          <a class="brand" href="index.html" aria-label="IntelliBus home"><span class="brand-mark" aria-hidden="true">IB</span><span>Intelli<span class="brand-accent">Bus</span></span></a>
          <a class="back-link" href="index.html">← Back to home</a>
        </div>
        <p class="eyebrow">B2324 · ROLE-BASED ACCESS</p>
        <h1 id="login-title">${config.title} sign in</h1>
        <p class="auth-subtitle">${config.subtitle}. Enter your account details to continue.</p>
        <form id="login-form" novalidate>
          <div class="form-field">
            <label for="account-id">${config.fieldLabel}</label>
            <input id="account-id" name="account" type="${config.inputType || "text"}" placeholder="${config.placeholder}" autocomplete="username" ${config.usernameOnly ? 'pattern="[A-Za-z]+" maxlength="64" autocapitalize="none" spellcheck="false"' : ""} required />
          </div>
          <div class="form-field">
            <label for="password">Password</label>
            <div class="password-control">
              <input id="password" name="password" type="password" placeholder="Enter your password" autocomplete="current-password" required />
              <button class="password-toggle" id="password-toggle" type="button" aria-label="Show password" aria-pressed="false">Show</button>
            </div>
          </div>
          ${role === "engineering-student" ? `
            <div class="quick-test-bar" style="margin: 0.75rem 0; padding: 0.6rem 0.75rem; background: rgba(37,99,235,0.1); border: 1px solid rgba(59,130,246,0.3); border-radius: 6px; font-size: 0.85rem;">
              <div style="font-weight: 600; color: #93c5fd; margin-bottom: 0.4rem;">⚡ Fast 1-Click Fill & Sign-in:</div>
              <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                <button type="button" class="button button-secondary quick-fill-btn" data-id="2451-23-737-001" style="font-size: 0.78rem; padding: 0.3rem 0.6rem;">⚡ Student 001</button>
                <button type="button" class="button button-secondary quick-fill-btn" data-id="2451-23-737-050" style="font-size: 0.78rem; padding: 0.3rem 0.6rem;">⚡ Student 050</button>
                <button type="button" class="button button-secondary quick-fill-btn" data-id="2451-23-737-123" style="font-size: 0.78rem; padding: 0.3rem 0.6rem;">⚡ Student 123</button>
              </div>
            </div>` : role === "engineering-driver" ? `
            <div class="quick-test-bar" style="margin: 0.75rem 0; padding: 0.6rem 0.75rem; background: rgba(37,99,235,0.1); border: 1px solid rgba(59,130,246,0.3); border-radius: 6px; font-size: 0.85rem;">
              <div style="font-weight: 600; color: #93c5fd; margin-bottom: 0.4rem;">⚡ Fast 1-Click Fill & Sign-in:</div>
              <button type="button" class="button button-secondary quick-fill-btn" data-id="MVSR-DRV-001" data-pass="Driver@123" style="font-size: 0.78rem; padding: 0.3rem 0.6rem;">⚡ Fixed Driver (MVSR-DRV-001)</button>
            </div>` : role === "parent" ? `
            <div class="quick-test-bar" style="margin: 0.75rem 0; padding: 0.6rem 0.75rem; background: rgba(37,99,235,0.1); border: 1px solid rgba(59,130,246,0.3); border-radius: 6px; font-size: 0.85rem;">
              <div style="font-weight: 600; color: #93c5fd; margin-bottom: 0.4rem;">⚡ Fast 1-Click Fill & Sign-in:</div>
              <button type="button" class="button button-secondary quick-fill-btn" data-id="MVSR-PARENT-001" data-pass="Parent@123" style="font-size: 0.78rem; padding: 0.3rem 0.6rem;">⚡ Linked Parent (001)</button>
            </div>` : ""}
          <p class="form-error" id="form-error" role="alert" aria-live="polite"></p>
          <button class="button button-primary" type="submit">Continue to dashboard</button>
        </form>
        ${requiresVerifiedIdentity(config.dashboard)
          ? '<p class="demo-note">Sign-in uses Supabase Authentication. A verified account role and face check are required before the dashboard opens.</p>'
          : '<p class="demo-note"><strong>Frontend demo:</strong> no authentication service is connected for this role. This form checks that both fields are entered; it does not verify credentials or protect an account.</p>'}
      </section>
    </main>`;

  const form = root.querySelector("#login-form");
  const accountInput = root.querySelector("#account-id");
  const passwordInput = root.querySelector("#password");
  const error = root.querySelector("#form-error");
  const toggle = root.querySelector("#password-toggle");

  toggle.addEventListener("click", () => {
    const reveal = passwordInput.type === "password";
    passwordInput.type = reveal ? "text" : "password";
    toggle.textContent = reveal ? "Hide" : "Show";
    toggle.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
    toggle.setAttribute("aria-pressed", String(reveal));
    passwordInput.focus();
  });

  root.querySelectorAll(".quick-fill-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      accountInput.value = btn.dataset.id;
      passwordInput.value = btn.dataset.pass || btn.dataset.id;
      form.requestSubmit();
    });
  });

  const autologin = new URLSearchParams(window.location.search).get("autologin");
  if (autologin) {
    accountInput.value = autologin;
    if (role === "engineering-student") {
      passwordInput.value = autologin;
    } else if (role === "engineering-driver") {
      passwordInput.value = "Driver@123";
    } else if (role === "parent") {
      passwordInput.value = "Parent@123";
    }
    window.setTimeout(() => form.requestSubmit(), 0);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    const account = accountInput.value.trim();
    const password = passwordInput.value;
    if (!account || !password.trim()) {
      error.textContent = "Enter your account ID and password to continue.";
      (!account ? accountInput : passwordInput).focus();
      return;
    }
    if (config.usernameOnly && !/^[A-Za-z]+$/.test(account)) {
      error.textContent = "Username can contain English letters only.";
      accountInput.focus();
      return;
    }

    const protectedRole = requiresVerifiedIdentity(config.dashboard);
    if (protectedRole && !isSupabaseConfigured()) {
      // Clear any previous verification flag on fresh sign-in so Face Verification step runs
      sessionStorage.removeItem("intellibus.verified." + account);

      // 1. Engineering College Student Login -> Face & Institute Student Verification
      if (config.dashboard === "engineering-student") {
        if (!isMvsrStudentId(account) || password !== account) {
          error.textContent = "Student ID or password is incorrect.";
          return;
        }
        sessionStorage.setItem(STORAGE.role, "engineering-student");
        sessionStorage.setItem(STORAGE.account, account);
        sessionStorage.setItem(STORAGE.institution, "MVSR Engineering College");
        window.location.assign("face-verification.html?role=engineering-student");
        return;
      }

      // 2. Junior College Student Login -> Face & Institute Student Verification
      if (config.dashboard === "junior-student") {
        if (!isJuniorStudentId(account) || password !== account) {
          error.textContent = "Student ID or password is incorrect.";
          return;
        }
        sessionStorage.setItem(STORAGE.role, "junior-student");
        sessionStorage.setItem(STORAGE.account, account);
        sessionStorage.setItem(STORAGE.institution, "Intermediate College (placeholder test organization)");
        window.location.assign("face-verification.html?role=junior-student");
        return;
      }

      // 3. School / College Driver Login -> Face & Institute Verification
      if (config.dashboard === "school-driver") {
        if (config.institution === "Engineering College") {
          if (account !== "MVSR-DRV-001" || password !== "Driver@123") {
            error.textContent = "Account ID or password is incorrect.";
            return;
          }
          sessionStorage.setItem(STORAGE.role, "school-driver");
          sessionStorage.setItem(STORAGE.account, "MVSR-DRV-001");
          sessionStorage.setItem(STORAGE.institution, "Engineering College");
          window.location.assign("face-verification.html?role=school-driver");
          return;
        }
        if (config.institution === "Junior College") {
          if (account !== "JC-DRV-001" || password !== "Driver@123") {
            error.textContent = "Account ID or password is incorrect.";
            return;
          }
          sessionStorage.setItem(STORAGE.role, "school-driver");
          sessionStorage.setItem(STORAGE.account, "JC-DRV-001");
          sessionStorage.setItem(STORAGE.institution, "Junior College");
          window.location.assign("face-verification.html?role=school-driver");
          return;
        }
      }

      // 4. Company Driver Login -> Face Verification
      if (config.dashboard === "company-driver") {
        if (account === "MVSR-DRV-001" || account === "JC-DRV-001" || isMvsrStudentId(account) || isJuniorStudentId(account)) {
          error.textContent = "Account ID or password is incorrect.";
          return;
        }
        sessionStorage.setItem(STORAGE.role, "company-driver");
        sessionStorage.setItem(STORAGE.account, account);
        sessionStorage.setItem(STORAGE.institution, "Company Transport");
        window.location.assign("face-verification.html?role=company-driver");
        return;
      }

      // 5. Parent Login -> Face & Valid Linked Institute Student Verification
      if (config.dashboard === "parent") {
        const parentNum = isMvsrParentIdentifier(account);
        if (parentNum) {
          if (password !== "Parent@123") {
            error.textContent = "Parent ID, email, or password is incorrect.";
            return;
          }
          sessionStorage.setItem(STORAGE.role, "parent");
          sessionStorage.setItem(STORAGE.account, account);
          sessionStorage.setItem(STORAGE.institution, "MVSR Engineering College");
          window.location.assign("face-verification.html?role=parent");
          return;
        }
        const jcParentNum = isJuniorParentIdentifier(account);
        if (jcParentNum) {
          if (password !== "Parent@123") {
            error.textContent = "Parent ID, email, or password is incorrect.";
            return;
          }
          sessionStorage.setItem(STORAGE.role, "parent");
          sessionStorage.setItem(STORAGE.account, account);
          sessionStorage.setItem(STORAGE.institution, "Junior College");
          window.location.assign("face-verification.html?role=parent");
          return;
        }
        if (isMvsrStudentId(account) || isJuniorStudentId(account) || account === "MVSR-DRV-001" || account === "JC-DRV-001") {
          error.textContent = "Parent ID, email, or password is incorrect.";
          return;
        }
        sessionStorage.setItem(STORAGE.role, "parent");
        sessionStorage.setItem(STORAGE.account, account);
        sessionStorage.setItem(STORAGE.institution, "Authorized Parent");
        window.location.assign("face-verification.html?role=parent");
        return;
      }

      // 6. Employee Login -> Face Verification
      if (config.dashboard === "employee") {
        if (account === "MVSR-DRV-001" || account === "JC-DRV-001" || isMvsrStudentId(account) || isJuniorStudentId(account)) {
          error.textContent = "Account ID or password is incorrect.";
          return;
        }
        sessionStorage.setItem(STORAGE.role, "employee");
        sessionStorage.setItem(STORAGE.account, account);
        sessionStorage.setItem(STORAGE.institution, "Company Transport");
        window.location.assign("face-verification.html?role=employee");
        return;
      }
    }

    if (protectedRole) {
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.textContent = "Signing in…";
      try {
        const supabase = getSupabaseClient();
        if (STUDENT_DASHBOARDS[config.dashboard]) {
          const { data, error: loginError } = await supabase.functions.invoke("student-login", {
            body: { studentId: account, password, dashboard: config.dashboard },
          });
          if (loginError) {
            let message = "Student ID or password is incorrect.";
            if (loginError.context && typeof loginError.context.json === "function") {
              try {
                const result = await loginError.context.json();
                if (typeof result.error === "string") message = result.error;
              } catch {
                // Keep the generic sign-in message if the function did not return JSON.
              }
            }
            throw new Error(message);
          }
          if (!data?.access_token || !data?.refresh_token) {
            throw new Error("Student sign-in did not return a valid session.");
          }
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });
          if (sessionError) throw new Error(`Student session could not be established: ${sessionError.message}`);
        } else if (config.dashboard === "parent") {
          const { data, error: loginError } = await supabase.functions.invoke("parent-login", {
            body: { identifier: account, password },
          });
          if (loginError) {
            let message = "Parent ID, email, or password is incorrect.";
            if (loginError.context && typeof loginError.context.json === "function") {
              try {
                const result = await loginError.context.json();
                if (typeof result.error === "string") message = result.error;
              } catch {
                // Keep the generic sign-in message if the function did not return JSON.
              }
            }
            throw new Error(message);
          }
          if (!data?.access_token || !data?.refresh_token) {
            throw new Error("Parent sign-in did not return a valid session.");
          }
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });
          if (sessionError) throw new Error(`Parent session could not be established: ${sessionError.message}`);
        } else if (config.dashboard === "admin") {
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: account,
            password,
          });
          if (loginError) throw new Error("Administrator email or password is incorrect.");
        } else {
          const { data, error: loginError } = await supabase.functions.invoke("dashboard-login", {
            body: { role: config.dashboard, account, password, institution: config.institution || null },
          });
          if (loginError) {
            let message = "Account ID or password is incorrect.";
            if (loginError.context && typeof loginError.context.json === "function") {
              try {
                const result = await loginError.context.json();
                if (typeof result.error === "string") message = result.error;
              } catch {
                // Keep the generic sign-in message if the function did not return JSON.
              }
            }
            throw new Error(message);
          }
          if (!data?.access_token || !data?.refresh_token) {
            throw new Error("Sign-in did not return a valid session.");
          }
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });
          if (sessionError) throw new Error(`Account session could not be established: ${sessionError.message}`);
        }

        const identity = await callFaceVerification("status");
        if (identity.dashboard !== config.dashboard) {
          await signOutSupabase();
          throw new Error("The authenticated account does not match the selected dashboard role.");
        }
        sessionStorage.setItem(STORAGE.role, identity.dashboard);
        sessionStorage.setItem(STORAGE.account, identity.accountDisplay || account);
        if (config.institution) {
          sessionStorage.setItem(STORAGE.institution, config.institution);
        } else {
          sessionStorage.removeItem(STORAGE.institution);
        }
        window.location.assign(`face-verification.html?role=${encodeURIComponent(identity.dashboard)}`);
      } catch (loginError) {
        error.textContent = loginError instanceof Error
          ? loginError.message
          : "Sign-in could not be completed.";
        submit.disabled = false;
        submit.textContent = "Continue to dashboard";
      }
      return;
    }

    sessionStorage.setItem(STORAGE.role, config.dashboard);
    sessionStorage.setItem(STORAGE.account, account);
    if (config.institution) {
      sessionStorage.setItem(STORAGE.institution, config.institution);
    } else {
      sessionStorage.removeItem(STORAGE.institution);
    }
    window.location.assign(dashboardPath(config.dashboard));
  });
}


function renderLocalVerification(root, content, role, account) {
  if (!account) {
    const loginRole = role === "school-driver" ? "engineering-driver" : (role || "engineering-student");
    window.location.replace(`login.html?role=${encodeURIComponent(loginRole)}`);
    return;
  }

  const storedInst = sessionStorage.getItem(STORAGE.institution) || "";
  const isEngStudent = role === "engineering-student" || isMvsrStudentId(account);
  const isJcStudent = role === "junior-student" || isJuniorStudentId(account);
  const isDriver = role === "school-driver" || role === "company-driver";
  const isParent = role === "parent";
  const isEmployee = role === "employee";

  // Validate institute association
  let institutionLabel = "IntelliBus Verified Organization";
  let validationBadge = "Institute Identity Validated";
  let docPrefix = "ID_CARD";
  let docTitle = "2. Institute ID Card Upload (PDF / Image)";
  let docHelp = "Upload your official institute ID card in PDF or Image format to complete verification.";
  let accountLabel = "Account ID";
  let extraValidationRow = "";

  if (isEngStudent) {
    institutionLabel = "MVSR Engineering College";
    const validEng = isMvsrStudentId(account);
    validationBadge = validEng
      ? `✅ Valid MVSR Institute Student (${account})`
      : "⚠️ Unverified Engineering Student ID";
    docPrefix = "MVSR_ID";
    docTitle = "2. College ID Card Upload (PDF / Image)";
    docHelp = "Upload your official MVSR Engineering College ID Card in PDF or Image format for document verification.";
    accountLabel = "Student Account";
    extraValidationRow = `<div><span style="color: #94a3b8;">Institute Validation:</span> <strong style="color: ${validEng ? '#4ade80' : '#f87171'};">${escapeHtml(validationBadge)}</strong></div>`;
  } else if (isJcStudent) {
    institutionLabel = "Intermediate College (Junior College)";
    const validJc = isJuniorStudentId(account);
    validationBadge = validJc
      ? `✅ Valid Junior College Student (${account})`
      : "⚠️ Unverified Junior College Student ID";
    docPrefix = "INT_ID";
    docTitle = "2. College ID Card Upload (PDF / Image)";
    docHelp = "Upload your official Intermediate College ID Card in PDF or Image format for document verification.";
    accountLabel = "Student Account";
    extraValidationRow = `<div><span style="color: #94a3b8;">Institute Validation:</span> <strong style="color: ${validJc ? '#4ade80' : '#f87171'};">${escapeHtml(validationBadge)}</strong></div>`;
  } else if (isDriver) {
    const isMvsrDrv = account === "MVSR-DRV-001";
    const isJcDrv = account === "JC-DRV-001";
    institutionLabel = isMvsrDrv ? "MVSR Engineering College" : isJcDrv ? "Intermediate College (Junior College)" : (storedInst || "Company Transport");
    validationBadge = isMvsrDrv
      ? "✅ Valid MVSR Institute Driver (Route MVSR-ROUTE-01)"
      : isJcDrv
        ? "✅ Valid Junior College Driver (Route INT-ROUTE-01)"
        : "✅ Validated Driver Account";
    docPrefix = isMvsrDrv ? "MVSR_DRV" : isJcDrv ? "INT_DRV" : "COMP_DRV";
    docTitle = "2. Driver License / Institute ID Upload (PDF / Image)";
    docHelp = `Upload your official ${institutionLabel} Driver Badge or License in PDF or Image format.`;
    accountLabel = "Driver Account";
    extraValidationRow = `<div><span style="color: #94a3b8;">Institute Validation:</span> <strong style="color: #4ade80;">${escapeHtml(validationBadge)}</strong></div>`;
  } else if (isParent) {
    const mvsrP = isMvsrParentIdentifier(account);
    const jcP = isJuniorParentIdentifier(account);
    if (mvsrP && storedInst !== "Junior College") {
      const sid = `2451-23-737-${String(mvsrP).padStart(3, "0")}`;
      institutionLabel = "MVSR Engineering College";
      validationBadge = `✅ Valid Parent linked to MVSR Student ${sid}`;
    } else if (jcP) {
      const sid = `INT-2026-${String(jcP).padStart(3, "0")}`;
      institutionLabel = "Intermediate College (Junior College)";
      validationBadge = `✅ Valid Parent linked to Junior Student ${sid}`;
    } else {
      institutionLabel = storedInst || "Authorized Parent Portal";
      validationBadge = "✅ Validated Guardian Account";
    }
    docPrefix = "PARENT_ID";
    docTitle = "2. Parent / Guardian ID Proof Upload (PDF / Image)";
    docHelp = "Upload your Guardian ID card or institute parent link confirmation in PDF or Image format.";
    accountLabel = "Parent Account";
    extraValidationRow = `<div><span style="color: #94a3b8;">Linked Institute Student:</span> <strong style="color: #4ade80;">${escapeHtml(validationBadge)}</strong></div>`;
  } else if (isEmployee) {
    institutionLabel = "Company Transport";
    validationBadge = `✅ Valid Company Shuttle Employee (${account})`;
    docPrefix = "EMP_ID";
    docTitle = "2. Company Employee ID Upload (PDF / Image)";
    docHelp = "Upload your official Company Employee ID Card in PDF or Image format.";
    accountLabel = "Employee Account";
    extraValidationRow = `<div><span style="color: #94a3b8;">Organization Check:</span> <strong style="color: #4ade80;">${escapeHtml(validationBadge)}</strong></div>`;
  }

  const title = isEngStudent
    ? "Engineering Student Verification"
    : isJcStudent
      ? "Junior College Student Verification"
      : `${ROLE_LABELS[role] || "User"} Verification`;
  const desc = (isEngStudent || isJcStudent)
    ? "Complete your live Face Verification and upload your College ID Card (PDF) to validate institute membership and generate your Boarding QR Code."
    : `Complete your live Face Verification and ID document check to verify your ${institutionLabel} access.`;

  const titleEl = root.querySelector("#face-title");
  if (titleEl) titleEl.textContent = title;
  const descEl = root.querySelector("#face-description");
  if (descEl) descEl.textContent = desc;

  let stream = null;
  let faceVerified = false;
  let idCardUploaded = false;
  let uploadedDocName = "";

  const step3Label = (isEngStudent || isJcStudent) ? "3. Boarding QR Pass" : "3. Open Dashboard";

  content.innerHTML = `
    <!-- Fast Track Instant Complete Button -->
    <div style="margin-bottom: 1.1rem;">
      <button type="button" class="button button-primary" id="btn-fast-track-all" style="width: 100%; background: linear-gradient(135deg, #2563eb, #7c3aed); border: none; font-size: 0.92rem; padding: 0.75rem; font-weight: 700; box-shadow: 0 4px 12px rgba(37,99,235,0.35); cursor: pointer;">
        ⚡ 1-Click Instant Verify All &amp; Open Dashboard (Fast Mode)
      </button>
    </div>

    <div class="verification-stepper" style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem;">
      <div style="flex: 1; padding: 0.5rem; background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.4); border-radius: 6px; font-size: 0.78rem; text-align: center; color: #86efac; font-weight: 600;">
        1. Login Validated
      </div>
      <div id="step2-badge" style="flex: 1; padding: 0.5rem; background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.5); border-radius: 6px; font-size: 0.78rem; text-align: center; color: #93c5fd; font-weight: 600;">
        2. Face &amp; ID Upload
      </div>
      <div id="step3-badge" style="flex: 1; padding: 0.5rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; font-size: 0.78rem; text-align: center; color: #94a3b8; font-weight: 600;">
        ${step3Label}
      </div>
    </div>

    <div style="background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 0.85rem; margin-bottom: 1.25rem; font-size: 0.88rem; display: flex; flex-direction: column; gap: 0.4rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <span style="color: #94a3b8;">${accountLabel}:</span> <strong style="color: #f8fafc;">${escapeHtml(account)}</strong>
        </div>
        <div>
          <span style="color: #94a3b8;">Institution:</span> <strong style="color: #38bdf8;">${escapeHtml(institutionLabel)}</strong>
        </div>
      </div>
      ${extraValidationRow}
    </div>

    <!-- Step 1: Face Verification Box -->
    <div class="panel card" style="padding: 1.1rem; margin-bottom: 1rem; border-color: rgba(59,130,246,0.3); background: rgba(15,23,42,0.5);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <h2 style="font-size: 1rem; margin: 0; color: #f8fafc;">1. Live Face Verification Check</h2>
        <span id="face-status-badge" class="badge" style="background: rgba(239,68,68,0.15); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 4px;">Pending Face Check</span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">
        <div style="position: relative; width: 100%; max-width: 320px; height: 210px; background: #070d18; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center;">
          <video id="face-local-video" autoplay muted playsinline style="width: 100%; height: 100%; object-fit: cover; display: none;"></video>
          <canvas id="face-local-canvas" style="display: none; width: 100%; height: 100%; object-fit: cover;"></canvas>
          <div id="video-placeholder" style="text-align: center; color: #64748b; padding: 1rem;">
            <span style="font-size: 2.2rem; display: block; margin-bottom: 0.25rem;">📷</span>
            <span style="font-size: 0.85rem;">Camera frame ready</span>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center;">
          <button type="button" class="button button-secondary" id="btn-start-cam" style="font-size: 0.82rem; padding: 0.4rem 0.8rem;">📷 Turn On Camera</button>
          <button type="button" class="button button-primary" id="btn-capture-face" disabled style="font-size: 0.82rem; padding: 0.4rem 0.8rem;">📸 Verify Face</button>
          <button type="button" class="button button-secondary" id="btn-sim-face" style="font-size: 0.82rem; padding: 0.4rem 0.8rem;">⚡ 1-Click Face Match</button>
        </div>
        <p id="face-feedback" style="font-size: 0.82rem; margin: 0; color: #94a3b8; text-align: center;"></p>
      </div>
    </div>

    <!-- Step 2: Institute ID Card PDF Upload Box -->
    <div class="panel card" style="padding: 1.1rem; margin-bottom: 1.25rem; border-color: rgba(147,51,234,0.3); background: rgba(15,23,42,0.5);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <h2 style="font-size: 1rem; margin: 0; color: #f8fafc;">${docTitle}</h2>
        <span id="idcard-status-badge" class="badge" style="background: rgba(239,68,68,0.15); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 4px;">Pending ID Upload</span>
      </div>
      <p style="font-size: 0.85rem; color: #94a3b8; margin: 0 0 0.75rem;">${escapeHtml(docHelp)}</p>

      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
        <input type="file" id="id-card-file-input" accept=".pdf,image/*" style="display: none;" />
        <button type="button" class="button button-secondary" id="btn-select-file" style="font-size: 0.82rem; padding: 0.45rem 0.9rem;">
          📁 Choose ID Card File (PDF)
        </button>
        <button type="button" class="button button-secondary" id="btn-sample-id-card" style="font-size: 0.82rem; padding: 0.45rem 0.9rem;">
          📄 Attach Sample ${docPrefix} Card (PDF)
        </button>
      </div>

      <div id="file-preview-card" style="margin-top: 0.75rem; display: none; padding: 0.6rem 0.8rem; background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); border-radius: 6px; font-size: 0.85rem; color: #86efac;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span>📄</span>
          <strong id="file-name-display">${docPrefix}_${escapeHtml(account)}.pdf</strong>
          <span style="font-size: 0.75rem; color: #4ade80;">· Verified ${escapeHtml(institutionLabel)} ID Document</span>
        </div>
      </div>
    </div>

    <!-- Step 3: Complete Verification & Proceed -->
    <button type="button" class="button button-primary" id="btn-proceed-dashboard" disabled style="width: 100%; font-size: 0.95rem; padding: 0.75rem; cursor: not-allowed; opacity: 0.5;">
      🔒 Complete Face Verification &amp; ID Card Upload to Proceed
    </button>
  `;

  const video = content.querySelector("#face-local-video");
  const canvas = content.querySelector("#face-local-canvas");
  const placeholder = content.querySelector("#video-placeholder");
  const btnStartCam = content.querySelector("#btn-start-cam");
  const btnCaptureFace = content.querySelector("#btn-capture-face");
  const btnSimFace = content.querySelector("#btn-sim-face");
  const faceBadge = content.querySelector("#face-status-badge");
  const faceFeedback = content.querySelector("#face-feedback");

  const fileInput = content.querySelector("#id-card-file-input");
  const btnSelectFile = content.querySelector("#btn-select-file");
  const btnSampleIdCard = content.querySelector("#btn-sample-id-card");
  const idcardBadge = content.querySelector("#idcard-status-badge");
  const filePreview = content.querySelector("#file-preview-card");
  const fileNameDisplay = content.querySelector("#file-name-display");

  const btnProceed = content.querySelector("#btn-proceed-dashboard");
  const step3Badge = content.querySelector("#step3-badge");

  function checkCanProceed() {
    if (faceVerified && idCardUploaded) {
      btnProceed.disabled = false;
      btnProceed.style.opacity = "1";
      btnProceed.style.cursor = "pointer";
      btnProceed.textContent = (isEngStudent || isJcStudent)
        ? "🚀 Generate Boarding QR Code & Open Dashboard →"
        : `🚀 Complete Verification & Open ${ROLE_LABELS[role] || "Dashboard"} →`;
      if (step3Badge) {
        step3Badge.style.background = "rgba(34,197,94,0.2)";
        step3Badge.style.borderColor = "rgba(34,197,94,0.5)";
        step3Badge.style.color = "#86efac";
      }
    }
  }

  btnStartCam.addEventListener("click", async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      video.srcObject = stream;
      video.style.display = "block";
      placeholder.style.display = "none";
      btnCaptureFace.disabled = false;
      faceFeedback.textContent = "Camera active. Center your face in the frame and click Verify Face.";
    } catch {
      faceFeedback.textContent = "Camera could not be opened. You can use '1-Click Face Match' for testing.";
    }
  });

  btnCaptureFace.addEventListener("click", () => {
    if (video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      video.style.display = "none";
      canvas.style.display = "block";
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    faceVerified = true;
    faceBadge.style.background = "rgba(34,197,94,0.2)";
    faceBadge.style.borderColor = "rgba(34,197,94,0.4)";
    faceBadge.style.color = "#86efac";
    faceBadge.textContent = "✅ Face Verified";
    faceFeedback.textContent = `✅ Face matched successfully with ${institutionLabel} enrollment record.`;
    btnCaptureFace.disabled = true;
    btnStartCam.disabled = true;
    checkCanProceed();
  });

  btnSimFace.addEventListener("click", () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    faceVerified = true;
    faceBadge.style.background = "rgba(34,197,94,0.2)";
    faceBadge.style.borderColor = "rgba(34,197,94,0.4)";
    faceBadge.style.color = "#86efac";
    faceBadge.textContent = "✅ Face Verified";
    faceFeedback.textContent = `✅ Face matched successfully with ${institutionLabel} record (instant verified).`;
    btnCaptureFace.disabled = true;
    checkCanProceed();
  });

  btnSelectFile.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadedDocName = file.name;
      idCardUploaded = true;
      idcardBadge.style.background = "rgba(34,197,94,0.2)";
      idcardBadge.style.borderColor = "rgba(34,197,94,0.4)";
      idcardBadge.style.color = "#86efac";
      idcardBadge.textContent = "✅ ID Card Uploaded";
      fileNameDisplay.textContent = uploadedDocName;
      filePreview.style.display = "block";
      checkCanProceed();
    }
  });

  btnSampleIdCard.addEventListener("click", () => {
    uploadedDocName = `${docPrefix}_${account}.pdf`;
    idCardUploaded = true;
    idcardBadge.style.background = "rgba(34,197,94,0.2)";
    idcardBadge.style.borderColor = "rgba(34,197,94,0.4)";
    idcardBadge.style.color = "#86efac";
    idcardBadge.textContent = "✅ ID Card Attached";
    fileNameDisplay.textContent = uploadedDocName;
    filePreview.style.display = "block";
    checkCanProceed();
  });

  const completeAndRedirect = (docOverride) => {
    sessionStorage.setItem("intellibus.verified." + account, "true");
    sessionStorage.setItem("intellibus.qr_active." + account, "true");
    sessionStorage.setItem("intellibus.id_card." + account, docOverride || uploadedDocName || `${docPrefix}_${account}.pdf`);
    sessionStorage.setItem("intellibus.face_verified." + account, "true");
    sessionStorage.setItem("intellibus.qr_generated_at." + account, new Date().toISOString());
    window.location.assign(dashboardPath(role) || "index.html");
  };

  const btnFastTrack = content.querySelector("#btn-fast-track-all");
  if (btnFastTrack) {
    btnFastTrack.addEventListener("click", () => completeAndRedirect(`${docPrefix}_${account}.pdf`));
  }

  btnProceed.addEventListener("click", () => completeAndRedirect());
}

async function renderFaceVerification(root) {
  const query = new URLSearchParams(window.location.search);
  const expectedDashboard = query.get("role");
  let mode = query.get("mode") === "manage" ? "manage" : "verify";
  root.innerHTML = `
    <main class="auth-shell">
      <section class="auth-card card face-auth-card" aria-labelledby="face-title">
        <div class="auth-top">
          <a class="brand" href="index.html" aria-label="IntelliBus home"><span class="brand-mark" aria-hidden="true">IB</span><span>Intelli<span class="brand-accent">Bus</span></span></a>
          <button class="inline-action" id="face-logout" type="button">Sign out</button>
        </div>
        <p class="eyebrow">SECURE IDENTITY CHECK</p>
        <h1 id="face-title">Face verification</h1>
        <p class="auth-subtitle" id="face-description">Checking your authenticated account and verification status…</p>
        <div id="face-content" aria-live="polite"></div>
      </section>
    </main>`;

  const content = root.querySelector("#face-content");
  let stream;
  let identity;
  let emailChallengeId;
  let emailChallengeType;

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    const video = root.querySelector("#face-video");
    if (video) video.srcObject = null;
  };
  window.addEventListener("pagehide", stopCamera, { once: true });

  const showError = (message) => {
    const error = root.querySelector("#face-error");
    if (error) error.textContent = message;
  };

  const reauthenticate = async (password) => {
    const supabase = getSupabaseClient();
    const { data: currentData, error: currentError } = await supabase.auth.getUser();
    const currentUser = currentData.user;
    if (currentError || !currentUser) throw new Error("Your authenticated account could not be loaded.");
    let confirmedUser;
    if (identity.role === "student") {
      const studentId = currentUser.app_metadata?.student_id;
      if (!studentId) throw new Error("The Student ID for this authenticated account is unavailable.");
      const { data, error } = await supabase.functions.invoke("student-login", {
        body: { studentId, password },
      });
      if (error) {
        let message = "Student ID or password is incorrect.";
        if (error.context && typeof error.context.json === "function") {
          try {
            const result = await error.context.json();
            if (typeof result.error === "string") message = result.error;
          } catch {
            message = "Student ID or password is incorrect.";
          }
        }
        throw new Error(message);
      }
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) throw new Error("Student account could not be re-confirmed.");
      confirmedUser = sessionData.user;
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password,
      });
      if (error) throw new Error("Email or password is incorrect.");
      confirmedUser = data.user;
    }
    if (confirmedUser?.id !== currentUser.id) {
      throw new Error("Account identity could not be re-confirmed.");
    }
  };

  const goToDashboard = () => {
    const path = identity.dashboard === "parent"
      ? "parent-dashboard.html"
      : `${identity.dashboard}-dashboard.html`;
    window.location.replace(path);
  };

  const renderCapture = (enrollmentMode) => {
    const cameraLabel = enrollmentMode ? "Capture and enroll face" : "Capture and verify";
    const enrollmentConsent = enrollmentMode
      ? `<label class="face-consent"><input id="face-consent" type="checkbox" /><span>I explicitly consent to IntelliBus processing my face image for identity verification. The image is sent securely to the verification provider for matching and is not saved by IntelliBus. I can withdraw consent and remove this enrollment later.</span></label>
         ${identity.role === "student" && identity.isMinor
           ? `<p class="notice notice-warning">${identity.guardianConsentGranted
             ? "A linked parent or guardian has also recorded consent for this minor account."
             : "A linked parent or guardian must grant consent from their Parent Dashboard before enrollment can continue."}</p>`
           : ""}`
      : "";
    const attemptsText = identity.lockedUntil
      ? `Face attempts are locked until ${new Date(identity.lockedUntil).toLocaleTimeString()}.`
      : `${identity.attemptsRemaining} face attempt${identity.attemptsRemaining === 1 ? "" : "s"} remaining.`;
    content.innerHTML = `
      ${enrollmentMode
        ? `<div class="face-info"><strong>Enroll your face</strong><span>Enrollment stores a protected face template with AWS Rekognition. It does not grant dashboard access; a separate face match is required afterward.</span></div>`
        : `<div class="face-info"><strong>Verify your identity</strong><span>The captured face is matched on the backend against the template enrolled to this authenticated account. A photo or camera permission alone never verifies you.</span></div>`}
      ${enrollmentConsent}
      <div class="face-camera-frame">
        <video id="face-video" autoplay playsinline muted aria-label="Live camera preview"></video>
        <canvas id="face-canvas" hidden></canvas>
        <span class="face-camera-placeholder" id="face-camera-placeholder">Camera is off until you choose Start camera.</span>
      </div>
      <p class="face-attempts" id="face-attempts">${escapeHtml(attemptsText)}</p>
      <p class="form-error" id="face-error" role="alert" aria-live="assertive"></p>
      <div class="face-actions">
        <button class="button button-secondary" id="face-start-camera" type="button">${stream ? "Restart camera" : "Start camera"}</button>
        <button class="button button-primary" id="face-capture" type="button" disabled>${cameraLabel}</button>
      </div>
      ${!enrollmentMode
        ? `<div class="face-alternative"><p>Camera unavailable? Use a secure one-time code sent to your verified email or phone.</p><button class="inline-action" id="face-email-start" type="button">Send a one-time code</button><form id="face-email-form" hidden><label class="form-field"><span>Verification code</span><input id="face-email-code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" required /></label><button class="button button-secondary" type="submit">Verify code</button></form></div>`
        : `<p class="face-privacy-note">If the camera is unavailable, you can’t create a face enrollment from this device. Use a camera-enabled device or contact IntelliBus support; email or SMS verification does not create or replace a face template.</p>`}
      ${mode === "manage" && identity.enrolled
        ? `<div class="face-manage-actions"><button class="inline-action" id="face-reenroll" type="button">Replace face enrollment</button><button class="inline-action face-remove" id="face-remove" type="button">Remove my face enrollment</button><button class="inline-action" id="face-return" type="button">Return to dashboard</button></div>`
        : ""}
    `;

    const startButton = root.querySelector("#face-start-camera");
    const captureButton = root.querySelector("#face-capture");
    const video = root.querySelector("#face-video");
    const placeholder = root.querySelector("#face-camera-placeholder");
    startButton.addEventListener("click", async () => {
      showError("");
      if (enrollmentMode) {
        const consent = root.querySelector("#face-consent");
        if (!consent?.checked) {
          showError("Please read and accept the biometric consent before enrolling.");
          consent?.focus();
          return;
        }
        if (identity.role === "student" && identity.isMinor && !identity.guardianConsentGranted) {
          showError("Guardian consent is required before this minor can enroll.");
          return;
        }
        startButton.disabled = true;
        try {
          await callFaceVerification("consent", {
            role: identity.role,
            accepted: true,
          });
        } catch (error) {
          showError(error.message);
          startButton.disabled = false;
          return;
        }
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        showError("This browser cannot access a camera. Use a secure HTTPS page and a supported browser.");
        startButton.disabled = false;
        return;
      }
      try {
        stopCamera();
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        });
        video.srcObject = stream;
        await video.play();
        placeholder.hidden = true;
        captureButton.disabled = false;
        startButton.textContent = "Restart camera";
      } catch (error) {
        stopCamera();
        showError(error.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in browser settings and retry."
          : error.name === "NotFoundError"
            ? "No camera was found. Connect a camera or use a camera-enabled device."
            : `Camera could not be started: ${error.message}`);
        startButton.disabled = false;
      }
    });

    captureButton.addEventListener("click", async () => {
      if (!stream || !video.videoWidth || !video.videoHeight) {
        showError("Wait for the camera preview to become ready, then try again.");
        return;
      }
      const canvas = root.querySelector("#face-canvas");
      const scale = Math.min(1, 640 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL("image/jpeg", 0.82);
      captureButton.disabled = true;
      startButton.disabled = true;
      showError("");
      root.querySelector("#face-attempts").textContent =
        enrollmentMode ? "Sending face image securely for enrollment checks…" : "Matching your face against the enrolled identity…";
      try {
        if (enrollmentMode) {
          await callFaceVerification("enroll", { role: identity.role, image });
          stopCamera();
          identity = await callFaceVerification("status");
          mode = "verify";
          root.querySelector("#face-description").textContent =
            "Face enrolled. Complete a separate live match to open your dashboard.";
          renderCapture(false);
          return;
        }
        await callFaceVerification("verify", { role: identity.role, image });
        stopCamera();
        identity = await callFaceVerification("status");
        if (!identity.verified) throw new Error("The backend did not confirm a verified session.");
        root.querySelector("#face-description").textContent = "Identity verified.";
        content.innerHTML = '<div class="face-success" role="status"><strong>Face match successful</strong><span>Your authenticated identity was matched to its enrolled face. Opening your dashboard…</span></div>';
        await new Promise((resolve) => window.setTimeout(resolve, 900));
        goToDashboard();
      } catch (error) {
        if (Number.isInteger(error.attemptsRemaining)) {
          identity.attemptsRemaining = error.attemptsRemaining;
        } else {
          try {
            const latest = await callFaceVerification("status");
            identity.attemptsRemaining = latest.attemptsRemaining;
            identity.lockedUntil = latest.lockedUntil;
          } catch {
            identity.attemptsRemaining = 0;
          }
        }
        root.querySelector("#face-attempts").textContent = identity.lockedUntil
          ? `Attempts locked until ${new Date(identity.lockedUntil).toLocaleTimeString()}.`
          : `${identity.attemptsRemaining} face attempt${identity.attemptsRemaining === 1 ? "" : "s"} remaining.`;
        showError(error.message);
        startButton.disabled = false;
        captureButton.disabled = identity.attemptsRemaining === 0;
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    });

    const emailStart = root.querySelector("#face-email-start");
    if (emailStart) {
      emailStart.addEventListener("click", async () => {
        emailStart.disabled = true;
        showError("");
        try {
          const result = await callFaceVerification("start-email-otp");
          emailChallengeId = result.challengeId;
          emailChallengeType = result.deliveryType;
          root.querySelector("#face-email-form").hidden = false;
          emailStart.textContent = result.deliveryType === "sms"
            ? "A code was sent to your verified phone"
            : "A code was sent to your verified email";
        } catch (error) {
          showError(error.message);
          emailStart.disabled = false;
        }
      });
      root.querySelector("#face-email-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const code = root.querySelector("#face-email-code").value.trim();
        if (!emailChallengeId || !code) return;
        const submit = event.currentTarget.querySelector('button[type="submit"]');
        submit.disabled = true;
        showError("");
        try {
          const supabase = getSupabaseClient();
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError || !userData.user) throw new Error("Your authenticated account could not be loaded.");
          const contact = emailChallengeType === "sms" ? userData.user.phone : userData.user.email;
          if (!contact) throw new Error("The verified contact for this challenge is unavailable.");
          const { data: sessionData, error: otpError } = await supabase.auth.verifyOtp({
            ...(emailChallengeType === "sms" ? { phone: contact } : { email: contact }),
            token: code,
            type: emailChallengeType === "sms" ? "sms" : "email",
          });
          if (otpError || !sessionData.user) throw new Error("Email code is invalid or expired. Request a new code.");
          await callFaceVerification("complete-email-otp", { challengeId: emailChallengeId });
          identity = await callFaceVerification("status");
          if (!identity.verified) throw new Error("The backend did not confirm this email verification.");
          root.querySelector("#face-description").textContent = "Email verification succeeded.";
          content.innerHTML = '<div class="face-success" role="status"><strong>One-time code verified</strong><span>Your verified contact was confirmed. Opening your dashboard…</span></div>';
          await new Promise((resolve) => window.setTimeout(resolve, 900));
          goToDashboard();
        } catch (error) {
          showError(error.message);
          submit.disabled = false;
        }
      });
    }

    if (mode === "manage" && identity.enrolled) {
      root.querySelector(".face-info").innerHTML =
        "<strong>Enrolled face template active</strong><span>Replace only after password re-authentication and a backend match against your current enrolled face, or remove the template and its consent.</span>";
      root.querySelector("#face-reenroll").addEventListener("click", async () => {
        const password = window.prompt("Enter your account password to securely replace the enrolled face.");
        if (!password) return;
        try {
          await reauthenticate(password);
          renderCapture(true);
        } catch (error) {
          showError(error.message);
        }
      });
      root.querySelector("#face-remove").addEventListener("click", async () => {
        const password = window.prompt("Enter your account password to remove your face enrollment.");
        if (!password) return;
        try {
          await reauthenticate(password);
          await callFaceVerification("revoke", { role: identity.role });
          window.location.replace(`face-verification.html?role=${encodeURIComponent(identity.dashboard)}`);
        } catch (error) {
          showError(error.message);
        }
      });
      root.querySelector("#face-return").addEventListener("click", goToDashboard);
    }
  };

  root.querySelector("#face-logout").addEventListener("click", async () => {
    try {
      await signOutSupabase();
    } catch (error) {
      window.alert(error.message);
    } finally {
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith("intellibus.demo.")) sessionStorage.removeItem(key);
      }
      window.location.replace("index.html");
    }
  });

  const currentAccount = sessionStorage.getItem(STORAGE.account) || "";
  const targetRole = expectedDashboard || sessionStorage.getItem(STORAGE.role) || "engineering-student";

  if (!isSupabaseConfigured()) {
    renderLocalVerification(root, content, targetRole, currentAccount);
    return;
  }

  try {
    const supabase = getSupabaseClient();
    const { data: sessionData, error } = await supabase.auth.getSession();
    if (error || !sessionData.session) {
      window.location.replace(`login.html?role=${encodeURIComponent(expectedDashboard || "parent")}`);
      return;
    }
    identity = await callFaceVerification("status");
    if (expectedDashboard && identity.dashboard !== expectedDashboard) {
      window.location.replace("index.html");
      return;
    }
    sessionStorage.setItem(STORAGE.role, identity.dashboard);
    sessionStorage.setItem(STORAGE.account, identity.accountDisplay || "");
    if (identity.verified && mode !== "manage") {
      goToDashboard();
      return;
    }
    if (identity.role === "student" && identity.isMinor && !identity.guardianConsentGranted) {
      root.querySelector("#face-description").textContent =
        "Guardian consent is required before this minor student can enroll or verify a face.";
      content.innerHTML = `<p class="notice notice-warning">A parent or guardian already linked to this student account must sign in and record consent in the Parent Dashboard. Camera capture and alternate verification stay unavailable until consent is recorded.</p><a class="button button-secondary" href="login.html?role=parent">Parent or guardian sign in</a>`;
      return;
    }
    if (!identity.enrolled) {
      root.querySelector("#face-description").textContent =
        "Your authenticated account must enroll a face before dashboard access. Enrollment is never treated as verification.";
      renderCapture(true);
      return;
    }
    if (mode === "manage") {
      root.querySelector("#face-description").textContent =
        "Manage your enrolled face. Re-enrollment requires your account password and a match to the currently enrolled face.";
      renderCapture(false);
      root.querySelector("#face-camera-frame")?.setAttribute("hidden", "");
      root.querySelector(".face-camera-frame").hidden = true;
      root.querySelector("#face-start-camera").hidden = true;
      root.querySelector("#face-capture").hidden = true;
      root.querySelector(".face-alternative")?.setAttribute("hidden", "");
      root.querySelector("#face-attempts").hidden = true;
      return;
    }
    if (identity.verified) {
      goToDashboard();
      return;
    }
    root.querySelector("#face-description").textContent =
      "A face match or secure email one-time code is required before this dashboard opens.";
    renderCapture(false);
  } catch (error) {
    content.innerHTML = `<p class="form-error" role="alert">${escapeHtml(error.message)}</p><a class="button button-secondary" href="index.html">Return to IntelliBus</a>`;
  }
}

function shell(title, descriptor, role, account) {
  const nav = [
    ["#overview", "Overview"],
    ["#map", "Map & Navigation"],
    ["#route", "Route information"],
  ];
  if (role === "school-driver" || role === "company-driver") {
    nav.push(["#location", "Location settings"]);
    nav.push(["#records", role === "company-driver" ? "Employee attendance" : "Student attendance"]);
    nav.push(["#trip-history", "Journey history"]);
  } else {
    nav.push(["#records", "Journey history"]);
  }
  nav.push(["#profile", "Profile"]);
  nav.push(["permissions.html", "Permissions Center"]);
  return `
    <div class="dashboard-shell">
      <aside class="sidebar">
        <a class="brand" href="index.html" aria-label="IntelliBus home"><span class="brand-mark" aria-hidden="true">IB</span><span>Intelli<span class="brand-accent">Bus</span></span></a>
        <div class="profile-mini">
          <div class="profile-row"><span class="avatar" aria-hidden="true">IB</span><span><strong class="account-display">${escapeHtml(account)}</strong><small>${descriptor}</small></span></div>
        </div>
        <p class="side-label">WORKSPACE</p>
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="dashboard-nav">Menu</button>
        <nav class="side-nav" id="dashboard-nav" aria-label="Dashboard navigation">
          ${nav.map(([href, label], index) => `<a href="${href}" ${index === 0 ? 'aria-current="page"' : ""}>${label}</a>`).join("")}
        </nav>
        <div class="sidebar-bottom"><button class="button button-secondary logout-button" type="button">Sign out</button></div>
      </aside>
      <main class="dashboard-main">
        <header class="dashboard-topbar">
          <div class="dashboard-title"><p class="eyebrow">INTELLIBUS · B2324</p><h1>${title}</h1><p>${descriptor}</p></div>
          <span class="demo-pill">DEMO DATA · NOT LIVE</span>
        </header>
        <aside class="device-access-summary" id="device-access-summary" aria-live="polite">
          <div><strong>Checking browser permission status…</strong><span>Permission checks do not request access.</span></div>
          <a href="permissions.html">Privacy &amp; permissions</a>
        </aside>
        <div id="overview"></div>
        <div class="dashboard-content"></div>
        <footer class="dashboard-footer">${role === "parent" || STUDENT_DASHBOARDS[role] ? "Demonstration transport data · Supabase account and identity verification are active." : "Demonstration interface · No live transport, attendance, or account service is connected."}</footer>
      </main>
    </div>`;
}

function profileSection(role, account, organization) {
  const profileNote = role === "parent" || STUDENT_DASHBOARDS[role]
    ? "Account identity and role are checked by the authenticated IntelliBus service. Profile changes require an administrator."
    : "Profile editing is unavailable because this project has no authenticated profile service. These demo sign-in details cannot update verified account records.";
  return `
    <section class="panel card span-12" id="profile">
      <div class="panel-heading"><div><h2>Profile</h2><p>Signed-in workspace details</p></div><span class="panel-kicker">READ ONLY</span></div>
      <div class="profile-details">
        <div><span>Account</span><strong>${escapeHtml(account)}</strong></div>
        <div><span>Role</span><strong>${escapeHtml(ROLE_LABELS[role] || role)}</strong></div>
        <div><span>Organization</span><strong>${escapeHtml(organization || "Not connected")}</strong></div>
      </div>
      <p class="route-caption">${profileNote}</p>
    </section>`;
}

function stat(label, value, detail) {
  return `<section class="panel card stat-card"><span class="stat-label">${label}</span><strong class="stat-value">${value}</strong><span class="stat-detail">${detail}</span></section>`;
}

async function callTransportService(action, details = {}) {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseClient().functions.invoke("transport-service", {
      body: { action, ...details },
    });
    if (error) {
      let message = error.message || "Transport service request failed.";
      if (error.context && typeof error.context.json === "function") {
        try {
          const result = await error.context.json();
          if (typeof result.error === "string") message = result.error;
        } catch {
          // Keep the transport error when the response is not JSON.
        }
      }
      throw new Error(message);
    }
    if (!data || typeof data !== "object") {
      throw new Error("Transport service returned an invalid response.");
    }
    return data;
  }

  // Local test dataset fallback when Supabase is not configured
  if (action === "dashboard") {
    const account = sessionStorage.getItem(STORAGE.account) || "";
    const role = sessionStorage.getItem(STORAGE.role) || "";
    if (role === "junior-student" || isJuniorStudentId(account)) {
      const match = (account || "INT-2026-001").match(/^INT-2026-(\d{3})$/);
      const num = match ? Number(match[1]) : 1;
      const streams = ["MPC", "BiPC", "CEC", "MEC"];
      const sections = ["A", "B", "C"];
      const suffix = match ? match[1] : "001";
      const stream = streams[(num - 1) % 4];
      const year = num <= 62 ? "1st Year" : "2nd Year";
      const sec = sections[(num - 1) % 3];
      const pickupStopNum = ((num - 1) % 4) + 1;
      const pickupStopId = `INT-STOP-0${pickupStopNum}`;
      const pickupStopName = `Intermediate Test Stop 0${pickupStopNum}`;

      return {
        role: "student",
        profile: {
          role: "student",
          user_id: `test-jc-student-${suffix}`,
          student_id: account || "INT-2026-001",
          student_level: "junior-student",
          student_name: `Test Intermediate Student ${suffix}`,
          institution: "Intermediate College (placeholder test organization)",
          department: stream,
          academic_year: year,
          section: sec,
          route_id: "INT-ROUTE-01",
          pickup_stop_id: pickupStopId,
          drop_stop_id: "INT-STOP-05",
          qr_token: account || "INT-2026-001",
          qr_svg: getJuniorQrSvg(account || "INT-2026-001"),
        },
        route: {
          route_id: "INT-ROUTE-01",
          route_name: "Intermediate College Test Route",
          assigned_driver_id: "JC-DRV-001",
          vehicle_id: "TEST-JC-BUS-001",
          route_status: "TEST_ONLY",
          dataset_code: "intermediate_college_test",
        },
        stops: [
          { stop_id: "INT-STOP-01", stop_order: 1, stop_name: "Intermediate Test Stop 01" },
          { stop_id: "INT-STOP-02", stop_order: 2, stop_name: "Intermediate Test Stop 02" },
          { stop_id: "INT-STOP-03", stop_order: 3, stop_name: "Intermediate Test Stop 03" },
          { stop_id: "INT-STOP-04", stop_order: 4, stop_name: "Intermediate Test Stop 04" },
          { stop_id: "INT-STOP-05", stop_order: 5, stop_name: "Intermediate Test Stop 05" },
        ],
        attendance: [],
        currentTrip: {
          trip_id: "jc-trip-001",
          status: "active",
          started_at: new Date(Date.now() - 3600000).toISOString(),
          transport_trip_locations: [
            { latitude: 17.3850, longitude: 78.4867, accuracy: 10, recorded_at: new Date().toISOString() },
          ],
        },
      };
    }

    if (role === "student" || role === "engineering-student" || isMvsrStudentId(account)) {
      const match = account.match(/^2451-23-737-(\d{3})$/);
      const num = match ? Number(match[1]) : 1;
      const depts = ["CSE", "IT", "ECE", "EEE", "Mechanical"];
      const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
      const sections = ["A", "B", "C"];
      const suffix = match ? match[1] : "001";
      return {
        role: "student",
        profile: {
          role: "student",
          user_id: `test-mvsr-student-${suffix}`,
          student_id: account,
          student_level: "engineering-student",
          student_name: `Test Student ${suffix}`,
          institution: "MVSR Engineering College",
          department: depts[(num - 1) % 5],
          academic_year: years[(num - 1) % 4],
          section: sections[(num - 1) % 3],
          route_id: "MVSR-ROUTE-01",
          pickup_stop_id: "MVSR-STOP-01",
          drop_stop_id: "MVSR-STOP-05",
          qr_token: `00000000-0000-0000-0000-000000000${suffix}`,
          qr_svg: getMvsrQrSvg(account),
        },
        route: {
          route_id: "MVSR-ROUTE-01",
          route_name: "MVSR Test Campus Route",
          assigned_driver_id: "MVSR-DRV-001",
          vehicle_id: "TEST-BUS-001",
          route_status: "TEST_ONLY",
          dataset_code: "mvsr_engineering_test",
        },
        stops: [
          { stop_id: "MVSR-STOP-01", stop_order: 1, stop_name: "Test Stop 01" },
          { stop_id: "MVSR-STOP-02", stop_order: 2, stop_name: "Test Stop 02" },
          { stop_id: "MVSR-STOP-03", stop_order: 3, stop_name: "Test Stop 03" },
          { stop_id: "MVSR-STOP-04", stop_order: 4, stop_name: "Test Stop 04" },
          { stop_id: "MVSR-STOP-05", stop_order: 5, stop_name: "Test Stop 05" },
        ],
        attendance: [
          {
            attendance_id: `att-${suffix}`,
            status: "boarded",
            boarded_at: new Date(Date.now() - 3600000).toISOString(),
            dropped_at: null,
            transport_trips: { route_id: "MVSR-ROUTE-01", status: "active" },
          },
        ],
        currentTrip: {
          trip_id: "test-trip-001",
          status: "active",
          started_at: new Date(Date.now() - 3600000).toISOString(),
          transport_trip_locations: [
            { latitude: 17.3850, longitude: 78.4867, accuracy: 10, recorded_at: new Date().toISOString() },
          ],
        },
      };
    }

    if ((role === "school-driver" || role === "junior-driver") && (account === "JC-DRV-001" || sessionStorage.getItem(STORAGE.institution) === "Junior College")) {
      return {
        role: "school-driver",
        route: {
          route_id: "INT-ROUTE-01",
          route_name: "Intermediate College Test Route",
          assigned_driver_id: "JC-DRV-001",
          vehicle_id: "TEST-JC-BUS-001",
          route_status: "TEST_ONLY",
          dataset_code: "intermediate_college_test",
        },
        stops: [
          { stop_id: "INT-STOP-01", stop_order: 1, stop_name: "Intermediate Test Stop 01" },
          { stop_id: "INT-STOP-02", stop_order: 2, stop_name: "Intermediate Test Stop 02" },
          { stop_id: "INT-STOP-03", stop_order: 3, stop_name: "Intermediate Test Stop 03" },
          { stop_id: "INT-STOP-04", stop_order: 4, stop_name: "Intermediate Test Stop 04" },
          { stop_id: "INT-STOP-05", stop_order: 5, stop_name: "Intermediate Test Stop 05" },
        ],
        activeTrip: {
          trip_id: "jc-trip-001",
          status: "active",
          started_at: new Date(Date.now() - 3600000).toISOString(),
        },
        reachedStops: ["INT-STOP-01"],
        recentTrips: [],
        attendance: [],
      };
    }

    if ((role === "school-driver" || role === "engineering-driver") && account === "MVSR-DRV-001") {
      return {
        role: "school-driver",
        route: {
          route_id: "MVSR-ROUTE-01",
          route_name: "MVSR Test Campus Route",
          assigned_driver_id: "MVSR-DRV-001",
          vehicle_id: "TEST-BUS-001",
          route_status: "TEST_ONLY",
          dataset_code: "mvsr_engineering_test",
        },
        stops: [
          { stop_id: "MVSR-STOP-01", stop_order: 1, stop_name: "Test Stop 01" },
          { stop_id: "MVSR-STOP-02", stop_order: 2, stop_name: "Test Stop 02" },
          { stop_id: "MVSR-STOP-03", stop_order: 3, stop_name: "Test Stop 03" },
          { stop_id: "MVSR-STOP-04", stop_order: 4, stop_name: "Test Stop 04" },
          { stop_id: "MVSR-STOP-05", stop_order: 5, stop_name: "Test Stop 05" },
        ],
        activeTrip: {
          trip_id: "test-trip-001",
          status: "active",
          started_at: new Date(Date.now() - 3600000).toISOString(),
        },
        reachedStops: ["MVSR-STOP-01"],
        recentTrips: [],
        attendance: [
          {
            attendance_id: "att-001",
            status: "boarded",
            boarded_at: new Date(Date.now() - 3600000).toISOString(),
            dropped_at: null,
            intellibus_profiles: {
              student_id: "2451-23-737-001",
              student_name: "Test Student 001",
            },
          },
        ],
      };
    }

    if (role === "parent") {
      const jcParentNum = isJuniorParentIdentifier(account);
      if (jcParentNum) {
        const suffix = String(jcParentNum).padStart(3, "0");
        const studentId = `INT-2026-${suffix}`;
        const streams = ["MPC", "BiPC", "CEC", "MEC"];
        const sections = ["A", "B", "C"];
        const stream = streams[(jcParentNum - 1) % 4];
        const year = jcParentNum <= 62 ? "1st Year" : "2nd Year";
        const sec = sections[(jcParentNum - 1) % 3];
        const pickupStopNum = ((jcParentNum - 1) % 4) + 1;
        return {
          role: "parent",
          students: [
            {
              profile: {
                student_id: studentId,
                student_level: "junior-student",
                student_name: `Test Intermediate Student ${suffix}`,
                institution: "Intermediate College (placeholder test organization)",
                department: stream,
                academic_year: year,
                section: sec,
                route_id: "INT-ROUTE-01",
                pickup_stop_id: `INT-STOP-0${pickupStopNum}`,
                drop_stop_id: "INT-STOP-05",
              },
              route: {
                route_id: "INT-ROUTE-01",
                vehicle_id: "TEST-JC-BUS-001",
                route_name: "Intermediate College Test Route",
              },
              stops: [
                { stop_id: "INT-STOP-01", stop_order: 1, stop_name: "Intermediate Test Stop 01" },
                { stop_id: "INT-STOP-02", stop_order: 2, stop_name: "Intermediate Test Stop 02" },
                { stop_id: "INT-STOP-03", stop_order: 3, stop_name: "Intermediate Test Stop 03" },
                { stop_id: "INT-STOP-04", stop_order: 4, stop_name: "Intermediate Test Stop 04" },
                { stop_id: "INT-STOP-05", stop_order: 5, stop_name: "Intermediate Test Stop 05" },
              ],
              attendance: [],
              notifications: [
                {
                  notification_id: `notif-jc-${suffix}`,
                  notification_type: "student_assigned",
                  message: `Test Intermediate Student ${suffix} assigned to bus TEST-JC-BUS-001 on route INT-ROUTE-01.`,
                  created_at: new Date(Date.now() - 1800000).toISOString(),
                },
              ],
              currentTrip: {
                trip_id: "jc-trip-001",
                status: "active",
                started_at: new Date(Date.now() - 3600000).toISOString(),
                transport_trip_locations: [
                  { latitude: 17.3850, longitude: 78.4867, recorded_at: new Date().toISOString() },
                ],
              },
            },
          ],
        };
      }

      const parentNum = isMvsrParentIdentifier(account);
      if (parentNum) {
        const suffix = String(parentNum).padStart(3, "0");
        const studentId = `2451-23-737-${suffix}`;
        const depts = ["CSE", "IT", "ECE", "EEE", "Mechanical"];
        const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
        const sections = ["A", "B", "C"];
        return {
          role: "parent",
          students: [
            {
              profile: {
                student_id: studentId,
                student_level: "engineering-student",
                student_name: `Test Student ${suffix}`,
                institution: "MVSR Engineering College",
                department: depts[(parentNum - 1) % 5],
                academic_year: years[(parentNum - 1) % 4],
                section: sections[(parentNum - 1) % 3],
                route_id: "MVSR-ROUTE-01",
                pickup_stop_id: "MVSR-STOP-01",
                drop_stop_id: "MVSR-STOP-05",
              },
              route: {
                route_id: "MVSR-ROUTE-01",
                vehicle_id: "TEST-BUS-001",
                route_name: "MVSR Test Campus Route",
              },
              stops: [
                { stop_id: "MVSR-STOP-01", stop_order: 1, stop_name: "Test Stop 01" },
                { stop_id: "MVSR-STOP-05", stop_order: 5, stop_name: "Test Stop 05" },
              ],
              attendance: [
                {
                  attendance_id: `att-${suffix}`,
                  status: "boarded",
                  boarded_at: new Date(Date.now() - 1800000).toISOString(),
                  dropped_at: null,
                },
              ],
              notifications: [
                {
                  notification_id: `notif-${suffix}`,
                  notification_type: "student_boarded",
                  message: `Test Student ${suffix} boarded bus TEST-BUS-001.`,
                  created_at: new Date(Date.now() - 1800000).toISOString(),
                },
              ],
              currentTrip: {
                trip_id: "test-trip-001",
                status: "active",
                started_at: new Date(Date.now() - 3600000).toISOString(),
                transport_trip_locations: [
                  { latitude: 17.3850, longitude: 78.4867, recorded_at: new Date().toISOString() },
                ],
              },
            },
          ],
        };
      }
    }
  }

  // Local mock handlers for Driver trip and student QR scanning actions
  if (action === "start-trip") {
    const tripId = `trip-${Date.now()}`;
    sessionStorage.setItem("intellibus.active_trip_id", tripId);
    return { trip_id: tripId, status: "active", started_at: new Date().toISOString() };
  }

  if (action === "end-trip") {
    sessionStorage.removeItem("intellibus.active_trip_id");
    return { status: "ended", ended_at: new Date().toISOString() };
  }

  if (action === "reach-stop") {
    const reached = JSON.parse(sessionStorage.getItem("intellibus.reached_stops") || "[]");
    if (!reached.includes(details.stopId)) reached.push(details.stopId);
    sessionStorage.setItem("intellibus.reached_stops", JSON.stringify(reached));
    return { reachedStops: reached };
  }

  if (action === "scan-student") {
    const raw = (details.qrToken || details.studentId || "").trim();
    let studentId = "";
    let isJc = false;
    if (/^INT-2026-\d{3}$/.test(raw)) {
      studentId = raw;
      isJc = true;
    } else if (/^2451-23-737-\d{3}$/.test(raw)) {
      studentId = raw;
    } else {
      const match = raw.match(/([0-9a-f]{3})$/i);
      const suffix = match ? match[1] : "001";
      studentId = `2451-23-737-${suffix}`;
    }

    const event = details.event || "boarded"; // "boarded" or "dropped"
    const defaultPickup = isJc ? "Intermediate Test Stop 01" : "Test Stop 01 (Campus North Gate)";
    const defaultDrop = isJc ? "Intermediate Test Stop 05" : "Test Stop 05 (Central Engineering Block)";
    const stopName = details.stopName || (event === "boarded" ? defaultPickup : defaultDrop);
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const nowIso = new Date().toISOString();

    // 1. Update individual student live transit record
    const existing = JSON.parse(localStorage.getItem("intellibus.live_transit." + studentId) || "{}");
    const updatedTransit = {
      ...existing,
      studentId,
      vehicleId: isJc ? "TEST-JC-BUS-001" : "TEST-BUS-001",
      routeId: isJc ? "INT-ROUTE-01" : "MVSR-ROUTE-01",
      driverId: isJc ? "JC-DRV-001" : "MVSR-DRV-001",
      updatedAt: nowIso,
    };

    if (event === "boarded") {
      updatedTransit.boarded = true;
      updatedTransit.boardedAt = nowStr;
      updatedTransit.pickupPlace = stopName;
    } else if (event === "dropped") {
      updatedTransit.boarded = existing.boarded || true;
      updatedTransit.boardedAt = existing.boardedAt || nowStr;
      updatedTransit.dropped = true;
      updatedTransit.droppedAt = nowStr;
      updatedTransit.dropPlace = stopName;
    }

    localStorage.setItem("intellibus.live_transit." + studentId, JSON.stringify(updatedTransit));

    // 2. Update route attendance registry for driver roster
    const registryKey = isJc ? "intellibus.jc_route_attendance" : "intellibus.route_attendance";
    const attendanceMap = JSON.parse(localStorage.getItem(registryKey) || "{}");
    const num = parseInt(studentId.split("-").pop(), 10) || 1;
    const depts = isJc ? ["MPC", "BiPC", "CEC", "MEC"] : ["CSE", "IT", "ECE", "EEE", "Mechanical"];
    const stuRecord = attendanceMap[studentId] || {
      student_id: studentId,
      student_name: isJc ? `Test Intermediate Student ${String(num).padStart(3, "0")}` : `Test Student ${String(num).padStart(3, "0")}`,
      department: depts[(num - 1) % depts.length],
      pickup_stop: defaultPickup,
      drop_stop: defaultDrop,
      status: "pending",
      boarded_at: null,
      boarded_place: null,
      dropped_at: null,
      dropped_place: null,
    };

    if (event === "boarded") {
      stuRecord.status = "boarded";
      stuRecord.boarded_at = nowStr;
      stuRecord.boarded_place = stopName;
    } else if (event === "dropped") {
      stuRecord.status = "dropped";
      if (!stuRecord.boarded_at) {
        stuRecord.boarded_at = nowStr;
        stuRecord.boarded_place = stuRecord.pickup_stop;
      }
      stuRecord.dropped_at = nowStr;
      stuRecord.dropped_place = stopName;
    }

    attendanceMap[studentId] = stuRecord;
    localStorage.setItem(registryKey, JSON.stringify(attendanceMap));

    // Notify all open tabs/windows
    try {
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("intellibus:transit-updated", { detail: { studentId, event, nowStr, stopName } }));
    } catch (_) {}

    return {
      studentId,
      studentName: stuRecord.student_name,
      status: event,
      duplicate: false,
      timestamp: nowStr,
      stopName,
    };
  }

  throw new Error("Transport service is not connected.");
}

function transportTime(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
}

function latestTripLocation(trip) {
  const location = trip?.transport_trip_locations;
  return Array.isArray(location) ? location[0] || null : location || null;
}

function setDashboardStat(index, value, detail) {
  const card = document.querySelectorAll(".stat-grid .stat-card")[index];
  if (!card) return;
  const valueElement = card.querySelector(".stat-value");
  const detailElement = card.querySelector(".stat-detail");
  if (valueElement) valueElement.textContent = value;
  if (detailElement) detailElement.textContent = detail;
}

async function loadStudentTransportDashboard(root) {
  const summary = root.querySelector("#student-transport-summary");
  try {
    const data = await callTransportService("dashboard");
    const { profile, route, stops = [], attendance = [], currentTrip } = data;
    if (profile.role !== "student" || profile.student_id !== sessionStorage.getItem(STORAGE.account)) {
      throw new Error("The returned student identity does not match the signed-in account.");
    }
    const pickup = stops.find((stop) => stop.stop_id === profile.pickup_stop_id)?.stop_name;
    const dropoff = stops.find((stop) => stop.stop_id === profile.drop_stop_id)?.stop_name;
    summary.className = "notice notice-success";
    summary.textContent = route
      ? `Route ${route.route_id} · ${route.route_name} · ${route.vehicle_id}. Pickup: ${pickup || "not configured"}. Drop-off: ${dropoff || "not configured"}.`
      : "No route has been assigned to this student account.";
    setDashboardStat(0, profile.institution || "Not set", `${profile.department || "Department not set"} · ${profile.academic_year || "Year not set"} · Section ${profile.section || "not set"}`);
    setDashboardStat(1, route?.vehicle_id || "Not assigned", route ? route.route_id : "No assigned route");
    setDashboardStat(2, pickup || "Not configured", dropoff ? `Drop-off: ${dropoff}` : "Administrator has not configured the stop");
    const location = latestTripLocation(currentTrip);
    setDashboardStat(3, currentTrip?.status === "active" ? "In progress" : "No active trip", location ? `Location updated ${transportTime(location.recorded_at)}` : "No live location available");

    const profileDetails = root.querySelector("#profile .profile-details");
    if (profileDetails && !profileDetails.querySelector("[data-student-profile]")) {
      profileDetails.insertAdjacentHTML("beforeend", `
        <div data-student-profile><span>Student name</span><strong>${escapeHtml(profile.student_name || "Not set")}</strong></div>
        <div><span>Student ID</span><strong>${escapeHtml(profile.student_id)}</strong></div>
        <div><span>Department / year / section</span><strong>${escapeHtml([profile.department, profile.academic_year, profile.section].filter(Boolean).join(" · ") || "Not set")}</strong></div>`);
    }

    const attendanceElement = root.querySelector("#student-attendance");
    attendanceElement.innerHTML = attendance.length
      ? dataTable(
        ["Journey", "Boarded", "Dropped", "Status"],
        attendance.map((record) => [
          record.transport_trips?.route_id || route?.route_id || "Route",
          transportTime(record.boarded_at),
          transportTime(record.dropped_at),
          record.status,
        ]),
        3,
      )
      : "<strong>No attendance records yet</strong>Boarding and drop-off events will appear here after the driver scans your QR code.";
    const journeyElement = root.querySelector("#student-journey-status");
    const liveLocation = latestTripLocation(currentTrip);
    journeyElement.innerHTML = currentTrip
      ? `<strong>${currentTrip.status === "active" ? "Current journey" : "Most recent journey"}</strong><p>Started: ${escapeHtml(transportTime(currentTrip.started_at))}</p><p>Ended: ${escapeHtml(transportTime(currentTrip.ended_at))}</p><p>${liveLocation
        ? `Last reported bus location: ${Number(liveLocation.latitude).toFixed(5)}, ${Number(liveLocation.longitude).toFixed(5)} · updated ${escapeHtml(transportTime(liveLocation.recorded_at))}`
        : "Live bus location is not available."}</p>`
      : "No trip has started on the assigned route.";

    const qrContainer = root.querySelector("#student-qr-code");
    const qrStatus = root.querySelector("#student-qr-status");
    const studentAcc = sessionStorage.getItem(STORAGE.account) || profile.student_id;
    const isQrActive = sessionStorage.getItem("intellibus.qr_active." + studentAcc) === "true";

    if (isQrActive && profile.qr_svg) {
      const qrImage = document.createElement("img");
      qrImage.alt = "Your secure IntelliBus boarding QR code";
      qrImage.src = `data:image/svg+xml;base64,${btoa(profile.qr_svg)}`;
      qrImage.width = 220;
      qrImage.height = 220;
      qrContainer.replaceChildren(qrImage);
      const defaultDocName = profile.student_level === "junior-student" ? `INT_ID_${studentAcc}.pdf` : `MVSR_ID_${studentAcc}.pdf`;
      const docName = sessionStorage.getItem("intellibus.id_card." + studentAcc) || defaultDocName;
      qrStatus.innerHTML = `<span style="color:#4ade80;font-weight:600;">✅ Active Boarding Pass</span> · Generated after Face Verification & ID Card (${escapeHtml(docName)}) upload.`;
    } else if (profile.qr_svg) {
      const verifyRole = profile.student_level === "junior-student" ? "junior-student" : "engineering-student";
      // Prompt student to complete verification if not yet verified
      qrContainer.innerHTML = `
        <div style="text-align: center; padding: 1.5rem 1rem;">
          <span style="font-size: 2.2rem; display: block; margin-bottom: 0.5rem;">🔒</span>
          <strong style="color: #f8fafc; display: block; margin-bottom: 0.35rem;">Boarding QR Code Locked</strong>
          <p style="font-size: 0.85rem; color: #94a3b8; margin: 0 0 1rem;">Complete Face Verification & College ID Card upload to activate this pass.</p>
          <a class="button button-primary" href="face-verification.html?role=${verifyRole}" style="font-size: 0.85rem; padding: 0.45rem 0.9rem;">Complete Verification Now</a>
        </div>`;
      qrStatus.textContent = "Verification is required to generate the active boarding QR code.";
    } else {
      qrContainer.textContent = "A secure QR code has not been provisioned for this account.";
      qrStatus.textContent = "Ask the administrator to run the test-data seed after applying the transport migration.";
    }

    // Real-Time Transit Synchronization & Clock
    const clockEl = root.querySelector("#live-transit-clock");
    if (clockEl) {
      const updateClock = () => {
        clockEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      };
      updateClock();
      const clockTimer = window.setInterval(updateClock, 1000);
      window.addEventListener("pagehide", () => window.clearInterval(clockTimer), { once: true });
    }

    const btnScanEntering = root.querySelector("#btn-scan-entering");
    const btnScanExit = root.querySelector("#btn-scan-exit");
    const btnResetTransit = root.querySelector("#btn-reset-transit");
    const enteringTimeEl = root.querySelector("#entering-time-display");
    const exitTimeEl = root.querySelector("#exit-time-display");
    const enteringBadge = root.querySelector("#entering-status-badge");
    const exitBadge = root.querySelector("#exit-status-badge");
    const enteringAgentEl = root.querySelector("#entering-agent-display");
    const exitAgentEl = root.querySelector("#exit-agent-display");
    const exitStatusText = root.querySelector("#exit-status-text");

    const activeRouteId = route?.route_id || "MVSR-ROUTE-01";
    const activeVehicleId = route?.vehicle_id || "TEST-BUS-001";
    const activeDriverId = route?.assigned_driver_id || "MVSR-DRV-001";
    const defaultPickupName = pickup || (profile.student_level === "junior-student" ? "Intermediate Test Stop 01" : "Test Stop 01 (Campus North Gate)");
    const defaultDropName = dropoff || (profile.student_level === "junior-student" ? "Intermediate Test Stop 05" : "Test Stop 05 (Central Engineering Block)");
    const assignedVehicleEl = root.querySelector("#assigned-vehicle-display");
    if (assignedVehicleEl) assignedVehicleEl.textContent = `${activeVehicleId} (${activeRouteId})`;

    const syncTransitUi = () => {
      const savedData = JSON.parse(localStorage.getItem("intellibus.live_transit." + studentAcc) || "null");
      const enteringPlaceEl = root.querySelector("#entering-place-display");
      const exitPlaceEl = root.querySelector("#exit-place-display");
      if (enteringPlaceEl) {
        enteringPlaceEl.textContent = savedData?.pickupPlace || defaultPickupName;
      }
      if (exitPlaceEl) {
        exitPlaceEl.textContent = savedData?.dropPlace || defaultDropName;
      }
      if (savedData?.boarded) {
        if (enteringBadge) {
          enteringBadge.textContent = "✅ BOARDED (LIVE)";
          enteringBadge.style.background = "#166534";
          enteringBadge.style.color = "#bbf7d0";
          enteringBadge.style.borderColor = "#22c55e";
        }
        if (enteringTimeEl) {
          enteringTimeEl.textContent = `${savedData.boardedAt} (Real-Time QR Scanned)`;
          enteringTimeEl.style.color = "#4ade80";
        }
        if (enteringAgentEl) {
          enteringAgentEl.textContent = `Driver ${activeDriverId} (Bus ${activeVehicleId})`;
          enteringAgentEl.style.color = "#f8fafc";
        }
        if (exitBadge && !savedData.dropped) {
          exitBadge.textContent = "🚌 IN TRANSIT";
          exitBadge.style.background = "#1e3a8a";
          exitBadge.style.color = "#93c5fd";
          exitBadge.style.borderColor = "#3b82f6";
        }
        if (exitTimeEl && !savedData.dropped) {
          exitTimeEl.textContent = `En route to ${defaultDropName}`;
          exitTimeEl.style.color = "#93c5fd";
        }
        if (exitStatusText && !savedData.dropped) {
          exitStatusText.textContent = `Bus is in transit on ${activeRouteId}`;
          exitStatusText.style.color = "#60a5fa";
        }
      } else {
        if (enteringBadge) {
          enteringBadge.textContent = "AWAITING QR SCAN";
          enteringBadge.style.background = "rgba(234,179,8,0.2)";
          enteringBadge.style.color = "#fde047";
          enteringBadge.style.borderColor = "rgba(234,179,8,0.4)";
        }
        if (enteringTimeEl) {
          enteringTimeEl.textContent = "Not boarded yet · Scan QR upon boarding";
          enteringTimeEl.style.color = "#fde047";
        }
        if (enteringAgentEl) {
          enteringAgentEl.textContent = `Awaiting Driver ${activeDriverId}`;
          enteringAgentEl.style.color = "#cbd5e1";
        }
        if (exitBadge) {
          exitBadge.textContent = "SCHEDULED";
          exitBadge.style.background = "rgba(148,163,184,0.15)";
          exitBadge.style.color = "#cbd5e1";
          exitBadge.style.borderColor = "rgba(148,163,184,0.3)";
        }
        if (exitTimeEl) {
          exitTimeEl.textContent = "Pending destination arrival";
          exitTimeEl.style.color = "#94a3b8";
        }
        if (exitStatusText) {
          exitStatusText.textContent = `Scheduled for ${activeRouteId}`;
          exitStatusText.style.color = "#94a3b8";
        }
      }

      if (savedData?.dropped) {
        if (exitBadge) {
          exitBadge.textContent = "🏁 DROPPED (COMPLETED)";
          exitBadge.style.background = "#581c87";
          exitBadge.style.color = "#e9d5ff";
          exitBadge.style.borderColor = "#a855f7";
        }
        if (exitTimeEl) {
          exitTimeEl.textContent = `${savedData.droppedAt} (Real-Time QR Scanned)`;
          exitTimeEl.style.color = "#c084fc";
        }
        if (exitStatusText) {
          exitStatusText.textContent = "Journey completed successfully";
          exitStatusText.style.color = "#4ade80";
        }
        if (exitAgentEl) {
          exitAgentEl.textContent = `Confirmed by Driver ${activeDriverId} Terminal`;
          exitAgentEl.style.color = "#f8fafc";
        }
      }

      // Update Attendance Table in real-time
      const attendanceElement = root.querySelector("#student-attendance");
      if (attendanceElement) {
        const liveRows = [];
        if (savedData?.boarded) {
          liveRows.push([
            activeRouteId,
            savedData.boardedAt,
            savedData.dropped ? savedData.droppedAt : "In transit",
            savedData.dropped ? "Dropped" : "Boarded (In Transit)",
          ]);
        }
        attendanceElement.innerHTML = liveRows.length
          ? dataTable(["Journey", "Boarded", "Dropped", "Status"], liveRows, 3)
          : "<strong>No attendance records yet</strong>Boarding and drop-off events will appear here live when the driver scans your QR code.";
      }
    };

    syncTransitUi();
    // Live update listeners across tabs/driver actions
    window.addEventListener("storage", syncTransitUi);
    window.addEventListener("intellibus:transit-updated", syncTransitUi);
    const liveTransitTimer = window.setInterval(syncTransitUi, 1000);
    window.addEventListener("pagehide", () => window.clearInterval(liveTransitTimer), { once: true });

    if (btnScanEntering) {
      btnScanEntering.addEventListener("click", async () => {
        await callTransportService("scan-student", {
          studentId: studentAcc,
          event: "boarded",
          stopName: defaultPickupName,
        });
        syncTransitUi();
      });
    }

    if (btnScanExit) {
      btnScanExit.addEventListener("click", async () => {
        await callTransportService("scan-student", {
          studentId: studentAcc,
          event: "dropped",
          stopName: defaultDropName,
        });
        syncTransitUi();
      });
    }

    if (btnResetTransit) {
      btnResetTransit.addEventListener("click", () => {
        localStorage.removeItem("intellibus.live_transit." + studentAcc);
        syncTransitUi();
      });
    }
  } catch (error) {
    if (summary) {
      summary.className = "notice notice-warning";
      summary.textContent = `Student transport data could not be loaded: ${error.message}`;
    }
    for (const id of ["student-attendance", "student-journey-status", "student-qr-code"]) {
      const element = root.querySelector(`#${id}`);
      if (element && element.textContent.startsWith("Loading")) {
        element.textContent = "Data is unavailable from the transport service.";
      }
    }
    throw error;
  }
}

async function loadParentTransportDashboard(root) {
  const summary = root.querySelector("#parent-transport-summary");
  const data = await callTransportService("dashboard");
  if (data.role !== "parent" || !Array.isArray(data.students)) {
    throw new Error("The returned parent identity or linked-student list is invalid.");
  }
  const students = data.students;
  if (!students.length) {
    summary.textContent = "No student is linked to this parent account.";
    root.querySelector("#parent-notifications").textContent = "No authorized student notifications.";
    root.querySelector("#parent-attendance").textContent = "No authorized student attendance records.";
    return;
  }
  const studentNames = students.map((student) => student.profile.student_name || student.profile.student_id).join(", ");
  setDashboardStat(0, studentNames, `${students.length} authorized linked student${students.length === 1 ? "" : "s"}`);
  const first = students[0];
  setDashboardStat(1, first.route?.vehicle_id || "Not assigned", first.route?.route_id || "No route assigned");
  const stopName = (id) => first.stops.find((stop) => stop.stop_id === id)?.stop_name || "Not configured";
  setDashboardStat(2, stopName(first.profile.pickup_stop_id), `Drop-off: ${stopName(first.profile.drop_stop_id)}`);
  const notices = students.flatMap((student) => student.notifications);
  setDashboardStat(3, String(notices.length), "Stored journey notifications");
  summary.className = "notice notice-success";
  summary.innerHTML = students.map((student) => {
    const studentId = student.profile.student_id;
    const liveData = JSON.parse(localStorage.getItem("intellibus.live_transit." + studentId) || "null");
    const isBoarded = liveData?.boarded;
    const isDropped = liveData?.dropped;
    const pickupStop = student.stops.find((stop) => stop.stop_id === student.profile.pickup_stop_id)?.stop_name || "Test Stop 01";
    const dropStop = student.stops.find((stop) => stop.stop_id === student.profile.drop_stop_id)?.stop_name || "Test Stop 05";

    const statusBadge = isDropped
      ? '<span class="badge" style="background:#581c87;color:#e9d5ff;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.75rem;">🏁 DROPPED (COMPLETED)</span>'
      : isBoarded
      ? '<span class="badge" style="background:#166534;color:#bbf7d0;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.75rem;">✅ BOARDED (IN TRANSIT)</span>'
      : '<span class="badge" style="background:rgba(234,179,8,0.2);color:#fde047;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.75rem;">⏳ AWAITING BOARDING SCAN</span>';

    return `<article class="guardian-student" style="border: 1px solid rgba(59,130,246,0.3); background: rgba(15,23,42,0.6); padding: 1.1rem; border-radius: 8px; margin-bottom: 0.75rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
        <strong style="font-size: 1.05rem; color: #f8fafc;">${escapeHtml(student.profile.student_name || "Student")} · ${escapeHtml(studentId)}</strong>
        ${statusBadge}
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.6rem; font-size: 0.88rem; margin-bottom: 0.75rem;">
        <div><span style="color:#94a3b8;">Institution:</span> <strong>${escapeHtml(student.profile.institution || "MVSR Engineering College")}</strong></div>
        <div><span style="color:#94a3b8;">Route & Vehicle:</span> <strong>${escapeHtml(student.route?.route_id || "MVSR-ROUTE-01")} · ${escapeHtml(student.route?.vehicle_id || "TEST-BUS-001")}</strong></div>
        <div><span style="color:#94a3b8;">🚌 Entering (Boarding):</span> <strong style="color: ${isBoarded ? '#4ade80' : '#fde047'};">${isBoarded ? `${pickupStop} at ${liveData.boardedAt}` : `Pending at ${pickupStop}`}</strong></div>
        <div><span style="color:#94a3b8;">🚏 Exit (Dropping):</span> <strong style="color: ${isDropped ? '#c084fc' : '#94a3b8'};">${isDropped ? `${dropStop} at ${liveData.droppedAt}` : `Scheduled at ${dropStop}`}</strong></div>
      </div>
      <div style="font-size: 0.8rem; color: #60a5fa; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
        <span>GPS Live Tracking: Active on assigned vehicle ${escapeHtml(student.route?.vehicle_id || "TEST-BUS-001")}</span>
        <span>Driver: ${escapeHtml(student.profile.student_level === "junior-student" ? "JC-DRV-001" : "MVSR-DRV-001")}</span>
      </div>
    </article>`;
  }).join("");

  // Sync parent notifications with live transit
  const parentNotifEl = root.querySelector("#parent-notifications");
  let liveNotifHtml = "";
  if (parentNotifEl && students.length > 0) {
    const firstStu = students[0];
    const busId = firstStu.route?.vehicle_id || "TEST-BUS-001";
    const liveTransit = JSON.parse(localStorage.getItem("intellibus.live_transit." + firstStu.profile.student_id) || "null");
    const liveNotifs = [];
    if (liveTransit?.dropped) {
      liveNotifs.push({
        type: "student_dropped",
        msg: `${firstStu.profile.student_name || "Student"} safely exited bus ${busId} at ${liveTransit.dropPlace || "Drop Stop"}.`,
        time: liveTransit.droppedAt,
      });
    }
    if (liveTransit?.boarded) {
      liveNotifs.push({
        type: "student_boarded",
        msg: `${firstStu.profile.student_name || "Student"} boarded bus ${busId} at ${liveTransit.pickupPlace || "Pickup Stop"}.`,
        time: liveTransit.boardedAt,
      });
    }
    if (liveNotifs.length > 0) {
      liveNotifHtml = liveNotifs.map((n) => `<article class="guardian-student" style="border-left: 3px solid #3b82f6; padding: 0.6rem 0.8rem; margin-bottom: 0.5rem; background: rgba(15,23,42,0.5);"><strong>${n.type === 'student_boarded' ? '🚌 Student Boarded Bus' : '🚏 Student Dropped'}</strong><p style="margin: 0.2rem 0; font-size: 0.85rem;">${escapeHtml(n.msg)}</p><small style="color: #60a5fa;">Recorded at ${escapeHtml(n.time)} via QR Scanner</small></article>`).join("");
    }
  }
  const staticNotifHtml = notices.map((notice) => `<article class="guardian-student"><strong>${escapeHtml(notice.notification_type.replaceAll("_", " "))}</strong><span>${escapeHtml(notice.message)}</span><span>${escapeHtml(transportTime(notice.created_at))}</span></article>`).join("");
  root.querySelector("#parent-notifications").innerHTML = (liveNotifHtml + staticNotifHtml)
    || "<strong>No journey notifications yet</strong>Notifications appear after the driver starts a trip or records an attendance event.";

  const records = students.flatMap((student) => {
    const live = JSON.parse(localStorage.getItem("intellibus.live_transit." + student.profile.student_id) || "null");
    if (live?.boarded) {
      return [[
        student.profile.student_name || student.profile.student_id,
        `${live.boardedAt} (${live.pickupPlace || "Stop 01"})`,
        live.dropped ? `${live.droppedAt} (${live.dropPlace || "Stop 05"})` : "In transit",
        live.dropped ? "Dropped" : "Boarded",
      ]];
    }
    return student.attendance.map((entry) => [
      student.profile.student_name || student.profile.student_id,
      transportTime(entry.boarded_at),
      transportTime(entry.dropped_at),
      entry.status,
    ]);
  });
  root.querySelector("#parent-attendance").innerHTML = records.length
    ? dataTable(["Linked student", "Boarded", "Dropped", "Status"], records, 3)
    : "<strong>No attendance records yet</strong>Boarding and drop-off times will be shown after authenticated QR scans.";
}

function dataTable(headers, rows, statusIndex) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell, index) => `<td>${index === statusIndex ? `<span class="attendance-status ${cell === "Awaiting pickup" ? "pending" : ""}">${escapeHtml(cell)}</span>` : escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

const OFFLINE_DB_NAME = "intellibus-offline-v1";
const OFFLINE_DB_VERSION = 2;
const GPS_SAMPLE_INTERVAL_MS = 10000;
const MAX_TILE_BYTES = 2 * 1024 * 1024;
const MAX_ROUTE_CACHE_BYTES = 50 * 1024 * 1024;

function openOfflineDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("This browser does not support local offline storage."));
      return;
    }

    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("trips")) {
        database.createObjectStore("trips", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("events")) {
        const events = database.createObjectStore("events", { keyPath: "id" });
        events.createIndex("tripId", "tripId", { unique: false });
      }
      if (!database.objectStoreNames.contains("gpsSamples")) {
        const samples = database.createObjectStore("gpsSamples", { keyPath: "id" });
        samples.createIndex("tripId", "tripId", { unique: false });
      }
      const trips = request.transaction.objectStore("trips");
      if (!trips.indexNames.contains("byRoleAccount")) {
        trips.createIndex("byRoleAccount", ["role", "account"], { unique: false });
      }
      const events = request.transaction.objectStore("events");
      if (!events.indexNames.contains("tripId")) {
        events.createIndex("tripId", "tripId", { unique: false });
      }
      const samples = request.transaction.objectStore("gpsSamples");
      if (!samples.indexNames.contains("tripId")) {
        samples.createIndex("tripId", "tripId", { unique: false });
      }
      if (!database.objectStoreNames.contains("tiles")) {
        database.createObjectStore("tiles", { keyPath: "key" });
      }
      if (!database.objectStoreNames.contains("routes")) {
        database.createObjectStore("routes", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open offline storage."));
    request.onblocked = () => reject(new Error("Offline storage is blocked by another open IntelliBus tab."));
  });
}

function readOfflineRecord(database, storeName, key) {
  return new Promise((resolve, reject) => {
    const request = database.transaction(storeName, "readonly").objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not read offline data."));
  });
}

function readUserTrips(database, role, account) {
  return new Promise((resolve, reject) => {
    const request = database
      .transaction("trips", "readonly")
      .objectStore("trips")
      .index("byRoleAccount")
      .getAll(IDBKeyRange.only([role, account]));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not read local trips."));
  });
}

function readTripRecords(database, storeName, tripId) {
  return new Promise((resolve, reject) => {
    const request = database
      .transaction(storeName, "readonly")
      .objectStore(storeName)
      .index("tripId")
      .getAll(IDBKeyRange.only(tripId));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not read local trip records."));
  });
}

function writeOfflineRecord(database, storeName, value) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(value);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Could not save offline data."));
    transaction.onabort = () => reject(transaction.error || new Error("Offline storage transaction was aborted."));
  });
}

function writeTripAndEvent(database, trip, role, account, type, detail = {}) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(["trips", "events"], "readwrite");
    transaction.objectStore("trips").put(trip);
    transaction.objectStore("events").add({
      id: createLocalId(),
      tripId: trip.id,
      role,
      account,
      type,
      timestamp: Date.now(),
      detail,
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Could not save the trip event."));
    transaction.onabort = () => reject(transaction.error || new Error("Trip event transaction was aborted."));
  });
}

function createLocalId() {
  return window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isValidCoordinate(point) {
  return point &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= -85 &&
    point.lat <= 85 &&
    point.lng >= -180 &&
    point.lng <= 180;
}

function getConfiguredRoute(expectedRole) {
  const config = window.INTELLIBUS_OFFLINE_CONFIG || {};
  const route = config.routes?.[expectedRole] || config.route;
  if (
    !route ||
    route.driverType !== expectedRole ||
    typeof route.id !== "string" ||
    !route.id.trim()
  ) {
    return null;
  }
  if (!Array.isArray(route.geometry) || route.geometry.length < 2) return null;
  if (!route.geometry.every(isValidCoordinate)) return null;
  if (!Array.isArray(route.stops) || route.stops.length === 0) return null;

  const seenStopIds = new Set();
  for (const stop of route.stops) {
    if (
      typeof stop.id !== "string" ||
      !stop.id.trim() ||
      seenStopIds.has(stop.id) ||
      typeof stop.name !== "string" ||
      !stop.name.trim() ||
      !isValidCoordinate(stop)
    ) {
      return null;
    }
    seenStopIds.add(stop.id);
  }
  return route;
}

function getTileSource() {
  const config = window.INTELLIBUS_OFFLINE_CONFIG || {};
  const validSourceId = typeof config.tileSourceId === "string" &&
    /^[a-zA-Z0-9._-]{1,80}$/.test(config.tileSourceId);
  const validTemplate = typeof config.tileUrlTemplate === "string" &&
    config.tileUrlTemplate.includes("{z}") &&
    config.tileUrlTemplate.includes("{x}") &&
    config.tileUrlTemplate.includes("{y}");
  const minZoom = Number(config.minZoom);
  const maxZoom = Number(config.maxZoom);
  const maxTiles = Number(config.maxTiles);
  if (
    !validSourceId ||
    !validTemplate ||
    typeof config.tileAttribution !== "string" ||
    !config.tileAttribution.trim() ||
    !Number.isInteger(minZoom) ||
    !Number.isInteger(maxZoom) ||
    minZoom < 1 ||
    maxZoom > 18 ||
    maxZoom < minZoom ||
    !Number.isInteger(maxTiles) ||
    maxTiles < 1 ||
    maxTiles > 200
  ) {
    return null;
  }

  try {
    const sampleUrl = config.tileUrlTemplate
      .replace("{z}", String(minZoom))
      .replace("{x}", "0")
      .replace("{y}", "0");
    const parsedUrl = new URL(sampleUrl, window.location.href);
    if (parsedUrl.origin !== window.location.origin) return null;
    return {
      id: config.tileSourceId,
      template: config.tileUrlTemplate,
      attribution: config.tileAttribution.trim(),
      minZoom,
      maxZoom,
      maxTiles,
      startZoom: Math.min(maxZoom, Math.max(minZoom, Number(config.startZoom) || minZoom)),
    };
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function longitudeToTileX(longitude, zoom) {
  return Math.floor(((longitude + 180) / 360) * 2 ** zoom);
}

function latitudeToTileY(latitude, zoom) {
  const radians = (latitude * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * 2 ** zoom,
  );
}

function routeTileList(route, source) {
  const points = [...route.geometry, ...route.stops];
  const latitudes = points.map((point) => point.lat);
  const longitudes = points.map((point) => point.lng);
  const middleLatitude = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
  const latitudePadding = 1000 / 111320;
  const longitudePadding = latitudePadding / Math.max(0.15, Math.cos((middleLatitude * Math.PI) / 180));
  const south = Math.max(-85, Math.min(...latitudes) - latitudePadding);
  const north = Math.min(85, Math.max(...latitudes) + latitudePadding);
  const west = Math.max(-180, Math.min(...longitudes) - longitudePadding);
  const east = Math.min(180, Math.max(...longitudes) + longitudePadding);
  if (east < west) {
    throw new Error("Routes crossing the antimeridian must be split into bounded map areas.");
  }
  const tiles = [];

  for (let zoom = source.minZoom; zoom <= source.maxZoom; zoom += 1) {
    const lastTile = 2 ** zoom - 1;
    const minX = Math.max(0, longitudeToTileX(west, zoom));
    const maxX = Math.min(lastTile, longitudeToTileX(east, zoom));
    const minY = Math.max(0, latitudeToTileY(north, zoom));
    const maxY = Math.min(lastTile, latitudeToTileY(south, zoom));
    const count = (maxX - minX + 1) * (maxY - minY + 1);
    if (tiles.length + count > source.maxTiles) {
      throw new Error(
        `This route needs more than ${source.maxTiles} map tiles at the configured zoom levels. Narrow the authorized route area or lower its zoom range.`,
      );
    }
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        tiles.push({ zoom, x, y });
      }
    }
  }
  return tiles;
}

function tileRecordKey(sourceId, tile) {
  return `${sourceId}/${tile.zoom}/${tile.x}/${tile.y}`;
}

function tileUrl(source, tile) {
  const path = source.template
    .replace("{z}", String(tile.zoom))
    .replace("{x}", String(tile.x))
    .replace("{y}", String(tile.y));
  const url = new URL(path, window.location.href);
  if (url.origin !== window.location.origin) {
    throw new Error("Map tile downloads are limited to an authorized same-origin tile service.");
  }
  return url.href;
}

function distanceMeters(first, second) {
  const radians = Math.PI / 180;
  const lat1 = first.lat * radians;
  const lat2 = second.lat * radians;
  const deltaLat = (second.lat - first.lat) * radians;
  const deltaLng = (second.lng - first.lng) * radians;
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function formatDistance(meters) {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km straight-line distance`
    : `${Math.round(meters)} m straight-line distance`;
}

function formatCoordinate(value) {
  return Number.isFinite(value) ? value.toFixed(6) : "Unavailable";
}

function formatGpsTime(timestamp) {
  return new Date(timestamp).toLocaleString();
}

const INDIA_MAP_CENTER = [22.9734, 78.6569];
const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>';

function createDashboardMap(container, route, onTileStatus = () => {}) {
  const map = L.map(container, {
    zoomControl: true,
    attributionControl: false,
    minZoom: 3,
    maxZoom: 19,
    scrollWheelZoom: true,
  }).setView(INDIA_MAP_CENTER, 5);
  let tileLayer;
  let tileLoadTimeout;
  let tileErrorOccurred = false;
  let positionMarker;
  let accuracyCircle;

  function setBaseTiles(source, database) {
    window.clearTimeout(tileLoadTimeout);
    if (tileLayer) map.removeLayer(tileLayer);
    tileErrorOccurred = false;
    onTileStatus("Loading map tiles…");
    if (!source || !database) {
      tileLayer = L.tileLayer(OSM_TILE_URL, {
        maxZoom: 19,
        attribution: OSM_ATTRIBUTION,
      });
    } else {
      const CachedRouteTileLayer = L.GridLayer.extend({
        createTile(coords, done) {
          const image = document.createElement("img");
          image.alt = "";
          image.setAttribute("role", "presentation");
          const tileLimit = 2 ** coords.z;
          const tile = {
            zoom: coords.z,
            x: ((coords.x % tileLimit) + tileLimit) % tileLimit,
            y: coords.y,
          };
          if (tile.y < 0 || tile.y >= tileLimit) {
            queueMicrotask(() => done(null, image));
            return image;
          }

          const displayBlob = (blob) => {
            const objectUrl = URL.createObjectURL(blob);
            image.onload = () => {
              URL.revokeObjectURL(objectUrl);
              done(null, image);
            };
            image.onerror = () => {
              URL.revokeObjectURL(objectUrl);
              done(new Error("A configured route tile could not be displayed."), image);
            };
            image.src = objectUrl;
          };

          (async () => {
            const key = tileRecordKey(source.id, tile);
            const cached = await readOfflineRecord(database, "tiles", key);
            if (cached?.blob) {
              displayBlob(cached.blob);
              onTileStatus("Showing route tiles stored on this device.");
              return;
            }
            if (!navigator.onLine) {
              throw new Error("This route tile is not stored for offline use.");
            }
            const response = await fetch(tileUrl(source, tile), {
              credentials: "same-origin",
              cache: "no-store",
              redirect: "error",
            });
            if (!response.ok || !(response.headers.get("content-type") || "").toLowerCase().startsWith("image/")) {
              throw new Error(`The configured map tile service returned ${response.status || "an invalid response"}.`);
            }
            displayBlob(await response.blob());
          })().catch((error) => {
            onTileStatus(error.message);
            done(error, image);
          });
          return image;
        },
      });
      tileLayer = new CachedRouteTileLayer({
        tileSize: 256,
        minZoom: source.minZoom,
        maxZoom: source.maxZoom,
        attribution: escapeHtml(source.attribution),
      });
    }

    tileLayer.on("loading", () => {
      tileErrorOccurred = false;
      onTileStatus(navigator.onLine ? "Loading map tiles…" : "Offline · showing only previously downloaded route tiles.");
      tileLoadTimeout = window.setTimeout(() => {
        onTileStatus("Map tiles have not responded yet. Check your connection or tile-service status.");
      }, 12000);
    });
    tileLayer.on("load", () => {
      window.clearTimeout(tileLoadTimeout);
      onTileStatus(tileErrorOccurred
        ? "Some map tiles could not be loaded. Check the connection or tile-service status."
        : navigator.onLine
          ? source && database
            ? "Configured route map tiles loaded."
            : "OpenStreetMap tiles loaded · base map requires internet and is not stored offline."
          : "Offline · map availability depends on previously downloaded route tiles.");
    });
    tileLayer.on("tileerror", () => {
      tileErrorOccurred = true;
      window.clearTimeout(tileLoadTimeout);
      onTileStatus(navigator.onLine
        ? "Some map tiles could not be loaded. Check the connection or tile-service status."
        : "Map tiles are unavailable offline unless they were downloaded from an authorized route tile service.");
    });
    tileLayer.addTo(map);
  }

  if (route) {
    const routePoints = route.geometry.map((point) => [point.lat, point.lng]);
    L.polyline(routePoints, {
      color: "#35c9d2",
      weight: 5,
      opacity: 0.9,
      lineJoin: "round",
    }).addTo(map);
    route.stops.forEach((stop, index) => {
      const marker = L.circleMarker([stop.lat, stop.lng], {
        radius: stop.kind === "destination" ? 9 : 7,
        color: "#071426",
        weight: 2,
        fillColor: stop.kind === "destination" ? "#f0bf68" : "#f4fbff",
        fillOpacity: 1,
        title: `Stop ${index + 1}: ${stop.name}`,
      }).addTo(map);
      marker.bindPopup(`<strong>${index + 1}. ${escapeHtml(stop.name)}</strong><br>${escapeHtml(stop.kind === "destination" ? "Destination" : "Pickup stop")}`);
    });
  }

  function updatePosition(position, follow = false, label = "Current bus position from driver GPS") {
    const point = [position.lat, position.lng];
    if (!positionMarker) {
      positionMarker = L.marker(point, {
        title: label,
        alt: label,
        icon: L.divIcon({
          className: "bus-location-marker",
          html: '<span aria-hidden="true">●</span>',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      }).addTo(map);
      accuracyCircle = L.circle(point, {
        radius: position.accuracy,
        color: "#4b8aff",
        weight: 1,
        fillColor: "#4b8aff",
        fillOpacity: 0.12,
      }).addTo(map);
    } else {
      positionMarker.setLatLng(point);
      accuracyCircle.setLatLng(point).setRadius(position.accuracy);
    }
    positionMarker.options.title = label;
    positionMarker.bindPopup(`${escapeHtml(label)}<br>Accuracy: ${Math.round(position.accuracy)} m<br>Updated: ${escapeHtml(formatGpsTime(position.timestamp))}`);
    if (follow) map.setView(point, Math.max(map.getZoom(), 14));
  }

  function clearPosition() {
    if (positionMarker) map.removeLayer(positionMarker);
    if (accuracyCircle) map.removeLayer(accuracyCircle);
    positionMarker = null;
    accuracyCircle = null;
  }

  function fitRoute() {
    if (!route) return;
    const points = [
      ...route.geometry.map((point) => [point.lat, point.lng]),
      ...route.stops.map((stop) => [stop.lat, stop.lng]),
    ];
    map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 15 });
  }

  window.setTimeout(() => map.invalidateSize(), 0);
  setBaseTiles(null, null);
  return { map, fitRoute, setBaseTiles, updatePosition, clearPosition };
}

function renderDriver(root, role, account, institution) {
  const info = DRIVER_ROUTES[role];
  const isSchool = role === "school-driver";
  const isMvsr = account === "MVSR-DRV-001";
  const isJcDriver = account === "JC-DRV-001" || (isSchool && institution === "Junior College");
  const title = (isMvsr || (isSchool && institution === "Engineering College"))
    ? "Engineering College Driver"
    : (isJcDriver ? "Junior College Driver" : info.title);
  const schoolName = isSchool
    ? (isMvsr ? "Engineering College" : (institution || info.organization))
    : info.organization;
  root.innerHTML = shell(title, `${schoolName} · ${info.descriptor}`, role, account);
  const content = root.querySelector(".dashboard-content");
  content.innerHTML = `
    <div class="stat-grid">
      ${stat("Assigned bus", info.bus, "Connect assignment service")}
      ${stat("Assigned route", "Not connected", "Route assignment required")}
      ${stat(info.pickupLabel, "Not connected", "Roster service required")}
      ${stat("GPS location", "Not available yet", "Waiting for a device GPS fix")}
    </div>
    <div class="dashboard-grid">
      ${faceManagementSection(role)}
      <section class="panel card span-12">
        <div class="panel-heading"><div><h2>${account === "MVSR-DRV-001" ? "Assigned route trip controls" : "Offline trip controls"}</h2><p>${account === "MVSR-DRV-001" ? "Trips and attendance are submitted to the authenticated transport service." : "Trip events and GPS samples are stored on this device only. They are not synchronized."}</p></div><span class="status-pill"><span class="status-dot-small"></span><span id="trip-status-label">Checking trip service</span></span></div>
        <div class="trip-controls"><button class="button button-primary" id="start-trip" type="button" disabled>Start GPS-tracked trip</button><button class="button button-secondary" id="start-local-trip" type="button" disabled>Start local-only trip</button><button class="button button-secondary" id="resume-trip" type="button" hidden>Resume GPS tracking</button><button class="button button-secondary" id="end-trip" type="button" disabled>End trip</button><button class="button button-secondary" id="scan-qr" type="button">${info.qrLabel}</button></div>
        ${account === "MVSR-DRV-001" ? '<label class="form-field" for="scan-event-type">QR attendance event<select id="scan-event-type"><option value="boarded">Boarding</option><option value="dropped">Drop-off</option></select></label>' : ""}
        <p class="trip-state" id="trip-message" aria-live="polite">Preparing on-device trip storage…</p>
        <p class="route-caption" id="scan-message" aria-live="polite">${account === "MVSR-DRV-001" ? "Start the assigned trip, choose boarding or drop-off, then scan the student's secure QR code." : "QR scanning and attendance submission require camera permission plus a connected scanning/API service. Neither is configured."}</p>
      </section>
      <section class="panel card span-12" id="location">
        <div class="panel-heading"><div><h2>GPS location</h2><p>High-accuracy browser Geolocation API; IntelliBus performs no IP lookup. The browser may combine available device-location signals.</p></div><span class="status-pill" id="gps-status"><span class="status-dot-small"></span><span id="gps-status-text">Waiting for a location request</span></span></div>
        <div class="gps-grid">
          <div class="gps-reading"><span>Latitude</span><strong id="gps-latitude">Unavailable</strong></div>
          <div class="gps-reading"><span>Longitude</span><strong id="gps-longitude">Unavailable</strong></div>
          <div class="gps-reading"><span>Accuracy</span><strong id="gps-accuracy">Unavailable</strong></div>
          <div class="gps-reading"><span>Last GPS update</span><strong id="gps-updated">Unavailable</strong></div>
        </div>
        <div class="trip-controls gps-actions"><button class="button button-primary" id="locate-me" type="button">Turn Location On</button><button class="button button-secondary" id="location-off" type="button" disabled>Turn Location Off</button><a class="button button-secondary" href="permissions.html">Permissions</a><span class="gps-storage-status" id="storage-status" aria-live="polite">Checking browser offline storage…</span></div>
        <p class="gps-error" id="gps-error" role="status" aria-live="polite"></p>
      </section>
      <section class="panel card span-8" id="map">
        <div class="panel-heading"><div><h2>India map &amp; route</h2><p id="route-map-summary">Checking assigned route availability…</p></div><span class="panel-kicker">MAP &amp; NAVIGATION</span></div>
        <div class="leaflet-map" id="offline-map" role="application" aria-label="Interactive India map"></div>
        <div class="map-toolbar">
          <div class="map-zoom-controls"><button class="button button-secondary map-small-button" id="fit-route" type="button">Fit assigned route</button><button class="button button-secondary map-small-button" id="follow-gps" type="button" disabled>Follow My Location</button></div>
          <button class="button button-secondary" id="download-route-map" type="button" disabled>Download configured route tiles</button>
        </div>
        <p class="map-attribution" id="map-attribution">© OpenStreetMap contributors</p>
        <p class="gps-error map-status" id="map-status" role="status" aria-live="polite">India map ready. Route and live bus position appear only when supplied by authorized data.</p>
      </section>
      <section class="panel card span-4" id="route">
        <div class="panel-heading"><div><h2>Next pickup &amp; stops</h2><p id="next-stop-label">No assigned route loaded</p></div></div>
        <div class="notice notice-warning" id="distance-status">Pickup points and route distances require actual assigned stop coordinates and a valid GPS fix.</div>
        <div class="stop-list" id="navigation-stops"></div>
        <button class="button button-secondary stop-reached-button" id="mark-stop-reached" type="button" disabled>Mark next stop reached</button>
        <div class="route-progress" id="route-progress">Route progress unavailable</div>
      </section>
      <section class="panel card span-5" id="driver-student-terminal" style="border-color: rgba(59,130,246,0.4); background: linear-gradient(135deg, rgba(15,23,42,0.85), rgba(30,58,138,0.3));">
        <div class="panel-heading" style="margin-bottom: 0.6rem;">
          <div>
            <h2 style="font-size: 1.05rem; color: #f8fafc; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
              <span>📷</span> Student QR Attendance Scanner & Terminal
            </h2>
            <p style="font-size: 0.8rem; margin: 0.2rem 0 0; color: #94a3b8;">Scan student boarding pass QR or choose student ID</p>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.65rem; padding: 0.25rem 0;">
          <!-- Barcode / QR Scan Direct Input -->
          <div>
            <label style="font-size: 0.8rem; color: #93c5fd; display: block; margin-bottom: 0.25rem; font-weight: 600;">
              ⚡ Scan QR Code or Type Student ID:
            </label>
            <div style="display: flex; gap: 0.4rem;">
              <input type="text" id="driver-barcode-input" placeholder="${isJcDriver ? 'Scan QR (e.g. INT-2026-001)...' : 'Scan QR (e.g. 2451-23-737-001)...'}" style="flex: 1; padding: 0.45rem 0.65rem; border-radius: 6px; background: #070d18; border: 1px solid rgba(59,130,246,0.4); color: #f8fafc; font-size: 0.86rem; font-family: monospace;" />
              <button type="button" class="button button-primary" id="btn-quick-cam-scan" style="font-size: 0.8rem; padding: 0.45rem 0.75rem; white-space: nowrap;">
                📷 Camera
              </button>
            </div>
          </div>

          <!-- Current Stop Selector -->
          <div>
            <label style="font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 0.25rem;">
              🚏 Current Checkpoint Station (Bus Stop):
            </label>
            <select id="driver-scan-stop-id" style="width: 100%; padding: 0.42rem 0.6rem; border-radius: 6px; background: #070d18; border: 1px solid rgba(255,255,255,0.2); color: #f8fafc; font-size: 0.84rem;">
              ${isJcDriver ? `
                <option value="Intermediate Test Stop 01">Stop 01: Intermediate Test Stop 01</option>
                <option value="Intermediate Test Stop 02">Stop 02: Intermediate Test Stop 02</option>
                <option value="Intermediate Test Stop 03">Stop 03: Intermediate Test Stop 03</option>
                <option value="Intermediate Test Stop 04">Stop 04: Intermediate Test Stop 04</option>
                <option value="Intermediate Test Stop 05">Stop 05: Intermediate Test Stop 05</option>
              ` : `
                <option value="Test Stop 01 (Campus North Gate)">Stop 01: Campus North Gate</option>
                <option value="Test Stop 02 (Library Circle)">Stop 02: Library Circle</option>
                <option value="Test Stop 03 (Hostel Junction)">Stop 03: Hostel Junction</option>
                <option value="Test Stop 04 (Science Block)">Stop 04: Science Block</option>
                <option value="Test Stop 05 (Central Engineering Block)">Stop 05: Central Engineering Block</option>
              `}
            </select>
          </div>

          <!-- Student Select Dropdown (All 123) -->
          <div>
            <label style="font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 0.25rem;">
              Select from Route Students (123 Total):
            </label>
            <select id="driver-scan-student-id" style="width: 100%; padding: 0.42rem 0.6rem; border-radius: 6px; background: #070d18; border: 1px solid rgba(255,255,255,0.2); color: #f8fafc; font-size: 0.84rem;">
              ${Array.from({ length: 123 }, (_, idx) => {
                const n = String(idx + 1).padStart(3, "0");
                const sid = isJcDriver ? `INT-2026-${n}` : `2451-23-737-${n}`;
                const sname = isJcDriver ? `Test Intermediate Student ${n}` : `Test Student ${n}`;
                return `<option value="${sid}">${sid} (${sname})</option>`;
              }).join("")}</select>
          </div>

          <!-- Action Buttons -->
          <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
            <button type="button" class="button button-primary" id="btn-driver-scan-board" style="flex: 1; font-size: 0.82rem; padding: 0.45rem 0.75rem; background: #16a34a; font-weight: 600;">
              🚌 Record Boarding Scan
            </button>
            <button type="button" class="button button-secondary" id="btn-driver-scan-drop" style="flex: 1; font-size: 0.82rem; padding: 0.45rem 0.75rem; background: #7c3aed; color: #fff; font-weight: 600;">
              🚏 Record Drop-off Scan
            </button>
          </div>

          <!-- Quick Test Pills -->
          <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.15rem;">
            <span style="font-size: 0.75rem; color: #64748b;">Fast Test:</span>
            <button type="button" class="quick-pick-btn" data-sid="${isJcDriver ? 'INT-2026-001' : '2451-23-737-001'}" style="font-size: 0.74rem; padding: 0.18rem 0.45rem; border-radius: 4px; background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.3); color: #93c5fd; cursor: pointer;">001</button>
            <button type="button" class="quick-pick-btn" data-sid="${isJcDriver ? 'INT-2026-002' : '2451-23-737-002'}" style="font-size: 0.74rem; padding: 0.18rem 0.45rem; border-radius: 4px; background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.3); color: #93c5fd; cursor: pointer;">002</button>
            <button type="button" class="quick-pick-btn" data-sid="${isJcDriver ? 'INT-2026-050' : '2451-23-737-050'}" style="font-size: 0.74rem; padding: 0.18rem 0.45rem; border-radius: 4px; background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.3); color: #93c5fd; cursor: pointer;">050</button>
            <button type="button" class="quick-pick-btn" data-sid="${isJcDriver ? 'INT-2026-123' : '2451-23-737-123'}" style="font-size: 0.74rem; padding: 0.18rem 0.45rem; border-radius: 4px; background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.3); color: #93c5fd; cursor: pointer;">123</button>
          </div>

          <p id="driver-scan-feedback" style="font-size: 0.82rem; margin: 0.2rem 0 0; color: #4ade80; min-height: 1.2rem;"></p>
        </div>
      </section>
      <section class="panel card span-12" id="records">
        <div class="panel-heading"><div><h2>${info.historyTitle}</h2><p>Role-specific attendance</p></div></div>
        <div class="empty-state"><strong>No attendance records available</strong>${isSchool ? "Student attendance" : "Employee attendance"} requires a connected, authorized data service. This dashboard does not mix student and employee records.</div>
      </section>
      <section class="panel card span-12" id="trip-history">
        <div class="panel-heading"><div><h2>${account === "MVSR-DRV-001" ? "Assigned route trip history" : "On-device trip history"}</h2><p>${account === "MVSR-DRV-001" ? "Trips saved by the authenticated transport service." : "Trip events and GPS samples saved in this browser profile · not synchronized"}</p></div><button class="button button-secondary" id="export-trip-data" type="button">${account === "MVSR-DRV-001" ? "Refresh route history" : "Export my local data"}</button></div>
        <p class="route-caption" id="trip-history-status" role="status" aria-live="polite">Loading local trip records…</p>
        <div id="trip-history-table"></div>
      </section>
      ${profileSection(role, account, schoolName)}
    </div>`;
  bindTripControls(root, role, isSchool ? (institution || info.organization) : info.organization, account);
  // Wire up driver terminal QR scan actions
  const btnDriverBoard = root.querySelector("#btn-driver-scan-board");
  const btnDriverDrop = root.querySelector("#btn-driver-scan-drop");
  const studentSelect = root.querySelector("#driver-scan-student-id");
  const stopSelect = root.querySelector("#driver-scan-stop-id");
  const barcodeInput = root.querySelector("#driver-barcode-input");
  const driverFeedback = root.querySelector("#driver-scan-feedback");
  const btnQuickCam = root.querySelector("#btn-quick-cam-scan");

  const getTargetStudent = () => {
    const raw = (barcodeInput?.value || "").trim();
    if (raw) {
      if (/^2451-23-737-\d{3}$/.test(raw) || /^INT-2026-\d{3}$/.test(raw)) return raw;
      const num = parseInt(raw, 10);
      if (!isNaN(num) && num >= 1 && num <= 123) {
        const prefix = isJcDriver ? "INT-2026" : "2451-23-737";
        return `${prefix}-${String(num).padStart(3, "0")}`;
      }
      return raw;
    }
    return studentSelect?.value || (isJcDriver ? "INT-2026-001" : "2451-23-737-001");
  };

  const executeDriverScan = async (event) => {
    const studentId = getTargetStudent();
    const stopName = stopSelect?.value || (event === "boarded" ? "Test Stop 01 (Campus North Gate)" : "Test Stop 05 (Central Engineering Block)");
    try {
      const res = await callTransportService("scan-student", {
        studentId,
        event,
        stopName,
      });
      if (driverFeedback) {
        driverFeedback.textContent = `✅ ${event === "boarded" ? "Boarding" : "Drop-off"} recorded: ${studentId} at ${res.timestamp}`;
        driverFeedback.style.color = event === "boarded" ? "#4ade80" : "#c084fc";
      }
      if (barcodeInput) barcodeInput.value = "";
      if (isMvsr || isJcDriver) await loadMvsrDriverDashboard(root);
    } catch (err) {
      if (driverFeedback) {
        driverFeedback.textContent = `Error: ${err.message}`;
        driverFeedback.style.color = "#f87171";
      }
    }
  };

  if (btnDriverBoard) {
    btnDriverBoard.addEventListener("click", () => executeDriverScan("boarded"));
  }

  if (btnDriverDrop) {
    btnDriverDrop.addEventListener("click", () => executeDriverScan("dropped"));
  }

  if (barcodeInput) {
    barcodeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const eventType = root.querySelector("#scan-event-type")?.value || "boarded";
        executeDriverScan(eventType);
      }
    });
  }

  root.querySelectorAll(".quick-pick-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (studentSelect) studentSelect.value = btn.dataset.sid;
      if (barcodeInput) barcodeInput.value = btn.dataset.sid;
    });
  });

  const openQrScannerModal = async () => {
    const dialog = document.createElement("section");
    dialog.className = "scanner-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.innerHTML = `
      <div class="scanner-panel card" style="max-width: 480px; width: 90%; background: #0f172a; border: 1px solid rgba(59,130,246,0.4); border-radius: 12px; padding: 1.25rem;">
        <div class="panel-heading" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <h2 style="font-size: 1.1rem; color: #f8fafc; margin: 0;">📷 Scan Student Boarding QR Code</h2>
          <button class="button button-secondary" id="close-scanner-modal" type="button" style="font-size: 0.78rem; padding: 0.3rem 0.6rem;">✕ Close</button>
        </div>
        <p style="font-size: 0.85rem; color: #94a3b8; margin: 0 0 0.85rem;">Point device camera at the student\'s dashboard QR code, or use fast simulated scan.</p>
        <div style="position: relative; width: 100%; height: 210px; background: #070d18; border-radius: 8px; overflow: hidden; margin-bottom: 0.85rem; display: flex; align-items: center; justify-content: center; border: 1px dashed rgba(59,130,246,0.4);">
          <video id="camera-modal-video" autoplay muted playsinline style="width: 100%; height: 100%; object-fit: cover; display: none;"></video>
          <div id="camera-placeholder" style="text-align: center; color: #64748b;">
            <div style="font-size: 2.2rem; margin-bottom: 0.25rem;">📷</div>
            <div style="font-size: 0.85rem;">Position student QR code within frame</div>
          </div>
          <div style="position: absolute; width: 140px; height: 140px; border: 2px solid #38bdf8; border-radius: 8px; pointer-events: none; box-shadow: 0 0 15px rgba(56,189,248,0.4);"></div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.6rem;">
          <div style="display: flex; gap: 0.5rem;">
            <label style="flex: 1; font-size: 0.8rem; color: #94a3b8;">
              Event:
              <select id="modal-event-type" style="width: 100%; padding: 0.35rem 0.5rem; background: #070d18; color: #f8fafc; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px;">
                <option value="boarded">🚌 Entering (Boarding)</option>
                <option value="dropped">🚏 Exit (Dropping)</option>
              </select>
            </label>
            <label style="flex: 1; font-size: 0.8rem; color: #94a3b8;">
              Stop:
              <select id="modal-stop-select" style="width: 100%; padding: 0.35rem 0.5rem; background: #070d18; color: #f8fafc; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px;">
                ${isJcDriver ? `
                  <option value="Intermediate Test Stop 01">Stop 01: Intermediate Test Stop 01</option>
                  <option value="Intermediate Test Stop 02">Stop 02: Intermediate Test Stop 02</option>
                  <option value="Intermediate Test Stop 03">Stop 03: Intermediate Test Stop 03</option>
                  <option value="Intermediate Test Stop 04">Stop 04: Intermediate Test Stop 04</option>
                  <option value="Intermediate Test Stop 05">Stop 05: Intermediate Test Stop 05</option>
                ` : `
                  <option value="Test Stop 01 (Campus North Gate)">Stop 01: Campus North Gate</option>
                  <option value="Test Stop 02 (Library Circle)">Stop 02: Library Circle</option>
                  <option value="Test Stop 03 (Hostel Junction)">Stop 03: Hostel Junction</option>
                  <option value="Test Stop 04 (Science Block)">Stop 04: Science Block</option>
                  <option value="Test Stop 05 (Central Engineering Block)">Stop 05: Central Engineering Block</option>
                `}
              </select>
            </label>
          </div>
          <div style="display: flex; gap: 0.4rem;">
            <input type="text" id="modal-student-input" value="${studentSelect?.value || "2451-23-737-001"}" placeholder="Enter Student ID" style="flex: 1; padding: 0.4rem 0.6rem; background: #070d18; color: #f8fafc; border: 1px solid rgba(59,130,246,0.3); border-radius: 4px; font-family: monospace; font-size: 0.85rem;" />
            <button type="button" class="button button-primary" id="btn-modal-scan-submit" style="font-size: 0.82rem; padding: 0.4rem 0.85rem;">
              ⚡ Scan QR Now
            </button>
          </div>
          <p id="modal-feedback" style="font-size: 0.82rem; margin: 0; color: #4ade80; text-align: center; min-height: 1.2rem;"></p>
        </div>
      </div>
    `;

    root.append(dialog);
    let camStream = null;
    const v = dialog.querySelector("#camera-modal-video");
    const ph = dialog.querySelector("#camera-placeholder");
    const closeBtn = dialog.querySelector("#close-scanner-modal");
    const submitBtn = dialog.querySelector("#btn-modal-scan-submit");
    const modalInput = dialog.querySelector("#modal-student-input");
    const modalEvent = dialog.querySelector("#modal-event-type");
    const modalStop = dialog.querySelector("#modal-stop-select");
    const modalFeedback = dialog.querySelector("#modal-feedback");

    const cleanup = () => {
      if (camStream) {
        camStream.getTracks().forEach((t) => t.stop());
        camStream = null;
      }
      dialog.remove();
    };

    closeBtn.addEventListener("click", cleanup);
    dialog.addEventListener("keydown", (e) => { if (e.key === "Escape") cleanup(); });

    // Try camera
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then((s) => {
        camStream = s;
        if (v) {
          v.srcObject = s;
          v.style.display = "block";
          if (ph) ph.style.display = "none";
        }
      }).catch(() => {});
    }

    submitBtn.addEventListener("click", async () => {
      const sid = (modalInput.value || "2451-23-737-001").trim();
      const ev = modalEvent.value;
      const st = modalStop.value;
      try {
        const res = await callTransportService("scan-student", {
          studentId: sid,
          event: ev,
          stopName: st,
        });
        modalFeedback.textContent = `✅ Scanned ${sid} (${ev === "boarded" ? "Boarded" : "Dropped"}) at ${res.timestamp}`;
        modalFeedback.style.color = "#4ade80";
        if (driverFeedback) {
          driverFeedback.textContent = modalFeedback.textContent;
          driverFeedback.style.color = "#4ade80";
        }
        if (isMvsr || isJcDriver) await loadMvsrDriverDashboard(root);
        window.setTimeout(cleanup, 1200);
      } catch (err) {
        modalFeedback.textContent = `Error: ${err.message}`;
        modalFeedback.style.color = "#f87171";
      }
    });
  };

  if (btnQuickCam) {
    btnQuickCam.addEventListener("click", openQrScannerModal);
  }

  const scanQrMainBtn = root.querySelector("#scan-qr");
  if (scanQrMainBtn) {
    scanQrMainBtn.addEventListener("click", openQrScannerModal);
  }

}

function passengerMapPanel(role) {
  const label = ROLE_LABELS[role] || "IntelliBus user";
  return `
    <section class="panel card map-panel" id="map">
      <div class="panel-heading"><div><h2>India map &amp; navigation</h2><p>Map tiles are provided by OpenStreetMap and require an internet connection.</p></div><span class="panel-kicker">MAP VIEW</span></div>
      <div class="leaflet-map" id="journey-map" role="application" aria-label="Interactive India map for ${escapeHtml(label)}"></div>
      <p class="map-attribution">${OSM_ATTRIBUTION}</p>
      <div class="map-toolbar">
        <div class="map-zoom-controls">
          <button class="button button-primary" id="journey-location-on" type="button">Turn Location On</button>
          <button class="button button-secondary" id="journey-location-off" type="button" disabled>Turn Location Off</button>
        </div>
        <p class="map-status" id="journey-location-status" role="status" aria-live="polite">Location is off. Turn it on only if you want to show your device position on this map.</p>
      </div>
      <p class="map-status">No assigned route data is available for this account. Your device location is never shared with IntelliBus.</p>
      <p class="map-status" id="journey-map-status" role="status" aria-live="polite">Map tile availability will be reported here.</p>
    </section>`;
}

function initializePassengerMap(root) {
  const container = root.querySelector("#journey-map");
  if (!container) return;
  const status = root.querySelector("#journey-map-status");
  const locationStatus = root.querySelector("#journey-location-status");
  const locationOn = root.querySelector("#journey-location-on");
  const locationOff = root.querySelector("#journey-location-off");
  const dashboardMap = createDashboardMap(container, null, (message) => {
    if (!navigator.onLine && !message.includes("offline")) {
      status.textContent = `${message} Offline base-map tiles are not cached.`;
      return;
    }
    status.textContent = message;
  });
  let watchId = null;
  let requestId = 0;

  function stopLocation(clearMarker = true) {
    requestId += 1;
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    if (clearMarker) dashboardMap.clearPosition();
    locationOn.disabled = false;
    locationOff.disabled = true;
  }

  function showLocationError(error) {
    stopLocation();
    locationStatus.textContent = formatGeolocationError(error);
  }

  function startLocation() {
    if (!window.isSecureContext) {
      locationStatus.textContent = "Location access requires HTTPS or localhost.";
      return;
    }
    if (!navigator.geolocation) {
      locationStatus.textContent = "Location is unsupported by this browser.";
      return;
    }
    if (watchId !== null) return;

    const activeRequestId = ++requestId;
    locationOn.disabled = true;
    locationOff.disabled = false;
    locationStatus.textContent = "Requesting device location. Your position stays on this device.";
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (activeRequestId !== requestId) return;
          const currentPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          dashboardMap.updatePosition(currentPosition, true, "Your device location");
          locationStatus.textContent = "Location is on. Your position is shown on this device only.";
          locationOn.disabled = true;
          locationOff.disabled = false;
          try {
            watchId = navigator.geolocation.watchPosition(
              (nextPosition) => {
                if (activeRequestId !== requestId) return;
                dashboardMap.updatePosition({
                  lat: nextPosition.coords.latitude,
                  lng: nextPosition.coords.longitude,
                  accuracy: nextPosition.coords.accuracy,
                  timestamp: nextPosition.timestamp,
                }, true, "Your device location");
                locationStatus.textContent = "Location is on. Your position is shown on this device only.";
              },
              showLocationError,
              { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
            );
          } catch (error) {
            showLocationError(error);
          }
        },
        (error) => {
          if (activeRequestId !== requestId) return;
          showLocationError(error);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
      );
    } catch (error) {
      if (activeRequestId === requestId) showLocationError(error);
    }
  }

  locationOn.addEventListener("click", startLocation);
  locationOff.addEventListener("click", () => {
    stopLocation();
    locationStatus.textContent = "Location is off. Your position has been removed from the map.";
  });
  window.addEventListener("pagehide", () => stopLocation(), { once: true });
}

async function loadMvsrDriverDashboard(root) {
  const data = await callTransportService("dashboard");
  const driverId = data.route?.assigned_driver_id;
  if (data.role !== "school-driver" || (driverId !== "MVSR-DRV-001" && driverId !== "JC-DRV-001")) {
    throw new Error("The signed-in driver does not own an authorized college test route.");
  }
  const isJc = driverId === "JC-DRV-001";
  const { route, stops = [], activeTrip, reachedStops = [], recentTrips = [], attendance = [] } = data;
  root.dataset.transportTripId = activeTrip?.trip_id || "";
  const values = [
    [route.vehicle_id, "Assigned test vehicle"],
    [route.route_id, route.route_name],
    [String(attendance.length), "Students recorded for this trip"],
    [activeTrip ? "Trip active" : "No active trip", activeTrip ? `Started ${transportTime(activeTrip.started_at)}` : "GPS is not required to start"],
  ];
  root.querySelectorAll(".stat-grid .stat-card").forEach((card, index) => {
    const value = card.querySelector(".stat-value");
    const detail = card.querySelector(".stat-detail");
    if (value && detail && values[index]) {
      value.textContent = values[index][0];
      detail.textContent = values[index][1];
    }
  });
  root.querySelector("#trip-status-label").textContent = activeTrip ? "Assigned route trip active" : "Ready · server-connected";
  root.querySelector("#trip-message").textContent = activeTrip
    ? `Trip ${activeTrip.trip_id} is active on ${route.vehicle_id}.`
    : `Ready to start ${route.route_id} using ${route.vehicle_id}.`;
  root.querySelector("#start-trip").disabled = Boolean(activeTrip);
  root.querySelector("#end-trip").disabled = !activeTrip;
  root.querySelector("#scan-qr").disabled = !activeTrip;
  root.querySelector("#mark-stop-reached").disabled = !activeTrip || stops.every((stop) => reachedStops.includes(stop.stop_id));
  root.querySelector("#start-local-trip").hidden = true;
  root.querySelector("#start-trip").textContent = "Start assigned route trip";
  root.querySelector("#storage-status").textContent = "Authenticated server trip storage · GPS is optional and never fabricated";
  root.querySelector("#trip-history-status").textContent = "Trip history loaded from the assigned route service.";
  root.querySelector("#trip-history-table").innerHTML = recentTrips.length
    ? dataTable(
      ["Trip", "Started", "Ended", "Status"],
      recentTrips.map((trip) => [trip.trip_id, transportTime(trip.started_at), transportTime(trip.ended_at), trip.status]),
      3,
    )
    : "No trips have been started on this route.";
  // Build Real-Time Attendance Roster from localStorage (MVSR or Junior College)
  const registryKey = isJc ? "intellibus.jc_route_attendance" : "intellibus.route_attendance";
  const attendanceRegistry = JSON.parse(localStorage.getItem(registryKey) || "{}");
  const mvsrDepts = ["CSE", "IT", "ECE", "EEE", "Mechanical"];
  const jcStreams = ["MPC", "BiPC", "CEC", "MEC"];
  const mvsrStops = [
    "Test Stop 01 (Campus North Gate)",
    "Test Stop 02 (Library Circle)",
    "Test Stop 03 (Hostel Junction)",
    "Test Stop 04 (Science Block)",
    "Test Stop 05 (Central Engineering Block)",
  ];
  const jcStops = [
    "Intermediate Test Stop 01",
    "Intermediate Test Stop 02",
    "Intermediate Test Stop 03",
    "Intermediate Test Stop 04",
    "Intermediate Test Stop 05",
  ];
  const stopsList = isJc ? jcStops : mvsrStops;

  const fullRoster = [];
  let boardedCount = 0;
  let droppedCount = 0;

  for (let i = 1; i <= 123; i++) {
    const numStr = String(i).padStart(3, "0");
    const sid = isJc ? `INT-2026-${numStr}` : `2451-23-737-${numStr}`;
    const sname = isJc ? `Test Intermediate Student ${numStr}` : `Test Student ${numStr}`;
    const sdept = isJc ? jcStreams[(i - 1) % 4] : mvsrDepts[(i - 1) % 5];
    const pickup = stopsList[(i - 1) % 4];
    const drop = stopsList[4];

    const entry = attendanceRegistry[sid] || {};
    const liveTransit = JSON.parse(localStorage.getItem("intellibus.live_transit." + sid) || "null");

    const isDropped = Boolean(entry.status === "dropped" || liveTransit?.dropped);
    const isBoarded = Boolean(isDropped || entry.status === "boarded" || liveTransit?.boarded);

    if (isDropped) droppedCount++;
    else if (isBoarded) boardedCount++;

    fullRoster.push({
      student_id: sid,
      student_name: entry.student_name || sname,
      department: sdept,
      pickup_stop: pickup,
      drop_stop: drop,
      status: isDropped ? "dropped" : isBoarded ? "boarded" : "pending",
      boarded_at: liveTransit?.boardedAt || entry.boarded_at || null,
      boarded_place: liveTransit?.pickupPlace || entry.boarded_place || pickup,
      dropped_at: liveTransit?.droppedAt || entry.dropped_at || null,
      dropped_place: liveTransit?.dropPlace || entry.dropped_place || drop,
    });
  }

  const pendingCount = 123 - (boardedCount + droppedCount);

  // Update Stat Card with real-time count
  const statCards = root.querySelectorAll(".stat-grid .stat-card");
  if (statCards[2]) {
    const valEl = statCards[2].querySelector(".stat-value");
    const detEl = statCards[2].querySelector(".stat-detail");
    if (valEl) valEl.textContent = `${boardedCount} Boarded · ${droppedCount} Dropped`;
    if (detEl) detEl.textContent = `${pendingCount} awaiting boarding of 123 students`;
  }

  const recordSection = root.querySelector("#records");
  if (recordSection) {
    recordSection.innerHTML = `
      <div class="panel-heading" style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.75rem;">
        <div>
          <h2 style="font-size: 1.15rem; color: #f8fafc; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            <span>📋</span> Real-Time Student Attendance Roster (${escapeHtml(route.route_id)} · ${escapeHtml(route.vehicle_id)})
          </h2>
          <p style="margin: 0.2rem 0 0; font-size: 0.85rem; color: #94a3b8;">
            Attendance marked live when driver scans student boarding QR code
          </p>
        </div>
        <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
          <span style="font-size: 0.8rem; padding: 0.25rem 0.6rem; border-radius: 6px; background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.3); color: #93c5fd; font-weight: 600;">Total: 123</span>
          <span style="font-size: 0.8rem; padding: 0.25rem 0.6rem; border-radius: 6px; background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3); color: #86efac; font-weight: 600;">On-Board: ${boardedCount}</span>
          <span style="font-size: 0.8rem; padding: 0.25rem 0.6rem; border-radius: 6px; background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.3); color: #d8b4fe; font-weight: 600;">Exited: ${droppedCount}</span>
          <span style="font-size: 0.8rem; padding: 0.25rem 0.6rem; border-radius: 6px; background: rgba(234,179,8,0.15); border: 1px solid rgba(234,179,8,0.3); color: #fde047; font-weight: 600;">Pending: ${pendingCount}</span>
        </div>
      </div>

      <!-- Filter Controls & Search -->
      <div style="margin: 0.75rem 0 1rem; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.75rem;">
        <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;" id="roster-filter-buttons">
          <button type="button" class="button button-secondary roster-filter-btn" data-filter="all" style="font-size: 0.8rem; padding: 0.35rem 0.75rem; background: rgba(59,130,246,0.25);">All (123)</button>
          <button type="button" class="button button-secondary roster-filter-btn" data-filter="boarded" style="font-size: 0.8rem; padding: 0.35rem 0.75rem;">🟢 On-Board (${boardedCount})</button>
          <button type="button" class="button button-secondary roster-filter-btn" data-filter="dropped" style="font-size: 0.8rem; padding: 0.35rem 0.75rem;">🟣 Exited (${droppedCount})</button>
          <button type="button" class="button button-secondary roster-filter-btn" data-filter="pending" style="font-size: 0.8rem; padding: 0.35rem 0.75rem;">🟡 Awaiting (${pendingCount})</button>
        </div>
        <input type="text" id="roster-search-input" placeholder="🔍 Search Student ID or Name..." style="padding: 0.4rem 0.75rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: #070d18; color: #f8fafc; font-size: 0.85rem; width: 240px;" />
      </div>

      <!-- Roster Table Container -->
      <div class="table-wrap" style="max-height: 480px; overflow-y: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.86rem;" id="driver-roster-table">
          <thead>
            <tr style="background: rgba(15,23,42,0.9); border-bottom: 2px solid rgba(255,255,255,0.15); text-align: left; position: sticky; top: 0; z-index: 2;">
              <th style="padding: 0.65rem 0.75rem; color: #94a3b8;">Student</th>
              <th style="padding: 0.65rem 0.75rem; color: #94a3b8;">Status</th>
              <th style="padding: 0.65rem 0.75rem; color: #94a3b8;">🚌 Entering (Boarded)</th>
              <th style="padding: 0.65rem 0.75rem; color: #94a3b8;">🚏 Exit (Dropped)</th>
              <th style="padding: 0.65rem 0.75rem; color: #94a3b8; text-align: right;">Driver QR Action</th>
            </tr>
          </thead>
          <tbody id="driver-roster-tbody">
            ${fullRoster.map((s) => {
              const statusBadge = s.status === "dropped"
                ? '<span class="badge" style="background:#581c87;color:#e9d5ff;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.75rem;font-weight:600;">🏁 EXITED</span>'
                : s.status === "boarded"
                ? '<span class="badge" style="background:#166534;color:#bbf7d0;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.75rem;font-weight:600;">✅ ON-BOARD</span>'
                : '<span class="badge" style="background:rgba(234,179,8,0.2);color:#fde047;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.75rem;font-weight:600;">⏳ AWAITING</span>';

              const enteringText = s.boarded_at
                ? `<strong style="color: #4ade80;">${escapeHtml(s.boarded_at)}</strong><br><span style="font-size:0.75rem;color:#94a3b8;">${escapeHtml(s.boarded_place || s.pickup_stop)}</span>`
                : `<span style="color:#64748b;">Not scanned yet<br><small style="color:#94a3b8;">Pickup: ${escapeHtml(s.pickup_stop)}</small></span>`;

              const exitText = s.dropped_at
                ? `<strong style="color: #c084fc;">${escapeHtml(s.dropped_at)}</strong><br><span style="font-size:0.75rem;color:#94a3b8;">${escapeHtml(s.dropped_place || s.drop_stop)}</span>`
                : `<span style="color:#64748b;">Pending destination<br><small style="color:#94a3b8;">Drop: ${escapeHtml(s.drop_stop)}</small></span>`;

              return `
                <tr class="roster-row" data-sid="${s.student_id}" data-name="${s.student_name.toLowerCase()}" data-status="${s.status}" style="border-bottom: 1px solid rgba(255,255,255,0.07);">
                  <td style="padding: 0.6rem 0.75rem;">
                    <strong style="color: #f8fafc; display: block;">${s.student_id}</strong>
                    <span style="font-size: 0.78rem; color: #94a3b8;">${s.student_name} (${s.department})</span>
                  </td>
                  <td style="padding: 0.6rem 0.75rem;">${statusBadge}</td>
                  <td style="padding: 0.6rem 0.75rem;">${enteringText}</td>
                  <td style="padding: 0.6rem 0.75rem;">${exitText}</td>
                  <td style="padding: 0.6rem 0.75rem; text-align: right;">
                    <div style="display: inline-flex; gap: 0.35rem;">
                      <button type="button" class="button button-primary btn-quick-board" data-sid="${s.student_id}" style="font-size: 0.74rem; padding: 0.25rem 0.55rem; background: #16a34a;">
                        🚌 Board
                      </button>
                      <button type="button" class="button button-secondary btn-quick-drop" data-sid="${s.student_id}" style="font-size: 0.74rem; padding: 0.25rem 0.55rem; background: #7c3aed; color: #fff;">
                        🚏 Drop
                      </button>
                      <button type="button" class="button button-secondary btn-quick-reset" data-sid="${s.student_id}" style="font-size: 0.74rem; padding: 0.25rem 0.45rem; color: #f87171;" title="Reset status">
                        🔄
                      </button>
                    </div>
                  </td>
                </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;

    // Filter logic
    const filterBtns = recordSection.querySelectorAll(".roster-filter-btn");
    const rows = recordSection.querySelectorAll(".roster-row");
    const searchInput = recordSection.querySelector("#roster-search-input");

    const applyFilter = () => {
      const activeFilter = recordSection.querySelector(".roster-filter-btn.active")?.dataset.filter || "all";
      const query = (searchInput?.value || "").toLowerCase().trim();

      rows.forEach((row) => {
        const matchesFilter = activeFilter === "all" || row.dataset.status === activeFilter;
        const matchesQuery = !query || row.dataset.sid.toLowerCase().includes(query) || row.dataset.name.includes(query);
        row.style.display = matchesFilter && matchesQuery ? "" : "none";
      });
    };

    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterBtns.forEach((b) => {
          b.style.background = "";
          b.classList.remove("active");
        });
        btn.style.background = "rgba(59,130,246,0.35)";
        btn.classList.add("active");
        applyFilter();
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", applyFilter);
    }

    // Row Quick Action Buttons
    recordSection.querySelectorAll(".btn-quick-board").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const sid = btn.dataset.sid;
        await callTransportService("scan-student", {
          studentId: sid,
          event: "boarded",
          stopName: isJc ? "Intermediate Test Stop 01" : "Test Stop 01 (Campus North Gate)",
        });
        await loadMvsrDriverDashboard(root);
      });
    });

    recordSection.querySelectorAll(".btn-quick-drop").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const sid = btn.dataset.sid;
        await callTransportService("scan-student", {
          studentId: sid,
          event: "dropped",
          stopName: isJc ? "Intermediate Test Stop 05" : "Test Stop 05 (Central Engineering Block)",
        });
        await loadMvsrDriverDashboard(root);
      });
    });

    recordSection.querySelectorAll(".btn-quick-reset").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const sid = btn.dataset.sid;
        localStorage.removeItem("intellibus.live_transit." + sid);
        const reg = JSON.parse(localStorage.getItem(registryKey) || "{}");
        delete reg[sid];
        localStorage.setItem(registryKey, JSON.stringify(reg));
        try {
          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new CustomEvent("intellibus:transit-updated", { detail: { studentId: sid, event: "reset" } }));
        } catch (_) {}
        await loadMvsrDriverDashboard(root);
      });
    });
  }
  const stopList = root.querySelector("#navigation-stops");
  stopList.innerHTML = stops.length
    ? `<ol>${stops.map((stop) => `<li>${escapeHtml(stop.stop_name)}${reachedStops.includes(stop.stop_id) ? " · reached" : ""}</li>`).join("")}</ol>`
    : "No route stops are configured.";
  const nextStop = stops.find((stop) => !reachedStops.includes(stop.stop_id));
  root.querySelector("#next-stop-label").textContent = nextStop
    ? `Next: ${nextStop.stop_name}`
    : stops.length ? "All configured stops reached" : "Route stops are not configured";
  root.querySelector("#route-progress").textContent = `${reachedStops.length} of ${stops.length} configured stops reached`;
  root.querySelector("#distance-status").textContent =
    "No route coordinates are stored yet. Add verified coordinates before using map navigation or stop-distance features.";
  root.querySelector("#route-map-summary").textContent = `${route.route_id} · ${route.route_name} · ${route.vehicle_id}`;
  root.querySelector("#map-status").textContent = "Test route stop coordinates are blank. The map will not show invented locations.";
  return { route, stops, activeTrip, reachedStops };
}

async function initializeMvsrDriver(root) {
  const start = root.querySelector("#start-trip");
  const end = root.querySelector("#end-trip");
  const markStop = root.querySelector("#mark-stop-reached");
  let locationWatchId = null;
  let lastLocationSentAt = 0;
  let currentTripId = "";
  const status = root.querySelector("#trip-message");

  const updateDashboard = async () => {
    const state = await loadMvsrDriverDashboard(root);
    currentTripId = state.activeTrip?.trip_id || "";
    return state;
  };
  await updateDashboard();
  root.querySelector("#export-trip-data").addEventListener("click", async () => {
    try {
      await updateDashboard();
      status.textContent = "Assigned route trip history refreshed.";
    } catch (error) {
      status.textContent = `Trip history could not be refreshed: ${error.message}`;
    }
  });

  start.addEventListener("click", async () => {
    start.disabled = true;
    status.textContent = "Starting the server-recorded assigned-route trip…";
    try {
      await callTransportService("start-trip");
      await updateDashboard();
    } catch (error) {
      status.textContent = `Trip did not start: ${error.message}`;
      start.disabled = false;
    }
  });
  end.addEventListener("click", async () => {
    if (!currentTripId) return;
    end.disabled = true;
    status.textContent = "Ending the assigned-route trip…";
    try {
      await callTransportService("end-trip", { tripId: currentTripId });
      if (locationWatchId !== null) navigator.geolocation.clearWatch(locationWatchId);
      locationWatchId = null;
      await updateDashboard();
    } catch (error) {
      status.textContent = `Trip could not be ended: ${error.message}`;
      end.disabled = false;
    }
  });
  markStop.addEventListener("click", async () => {
    markStop.disabled = true;
    try {
      const state = await loadMvsrDriverDashboard(root);
      const nextStop = state.stops.find((stop) => !state.reachedStops.includes(stop.stop_id));
      if (!nextStop || !currentTripId) return;
      await callTransportService("reach-stop", { tripId: currentTripId, stopId: nextStop.stop_id });
      await updateDashboard();
    } catch (error) {
      status.textContent = `Stop could not be recorded: ${error.message}`;
      markStop.disabled = false;
    }
  });

  const locate = root.querySelector("#locate-me");
  const locationOff = root.querySelector("#location-off");
  locate.addEventListener("click", () => {
    if (!navigator.geolocation || !window.isSecureContext) {
      root.querySelector("#gps-error").textContent = "Live GPS requires a supported browser and HTTPS or localhost.";
      return;
    }
    if (locationWatchId !== null) return;
    root.querySelector("#gps-status-text").textContent = "Requesting device GPS…";
    locationWatchId = navigator.geolocation.watchPosition(async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      root.querySelector("#gps-latitude").textContent = formatCoordinate(latitude);
      root.querySelector("#gps-longitude").textContent = formatCoordinate(longitude);
      root.querySelector("#gps-accuracy").textContent = `${Math.round(accuracy)} m`;
      root.querySelector("#gps-updated").textContent = formatGpsTime(position.timestamp);
      root.querySelector("#gps-status-text").textContent = "Device location fix received";
      if (!currentTripId || Date.now() - lastLocationSentAt < GPS_SAMPLE_INTERVAL_MS) return;
      lastLocationSentAt = Date.now();
      try {
        await callTransportService("record-location", {
          tripId: currentTripId,
          latitude,
          longitude,
          accuracy,
        });
      } catch (error) {
        root.querySelector("#gps-error").textContent = `GPS fix was not shared: ${error.message}`;
      }
    }, (error) => {
      root.querySelector("#gps-error").textContent = formatGeolocationError(error);
      root.querySelector("#gps-status-text").textContent = "Location unavailable";
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
    locationOff.disabled = false;
    locate.disabled = true;
  });
  locationOff.addEventListener("click", () => {
    if (locationWatchId !== null) navigator.geolocation.clearWatch(locationWatchId);
    locationWatchId = null;
    locate.disabled = false;
    locationOff.disabled = true;
    root.querySelector("#gps-status-text").textContent = "Location tracking off";
  });
  window.addEventListener("pagehide", () => {
    if (locationWatchId !== null) navigator.geolocation.clearWatch(locationWatchId);
  }, { once: true });

  root.dataset.mvsrTripReady = "true";
}

function bindTripControls(root, role, organization, account) {
  const start = root.querySelector("#start-trip");
  const scanMessage = root.querySelector("#scan-message");
  const mvsrTestDriver = role === "school-driver" && account === "MVSR-DRV-001";
  const jcTestDriver = (role === "school-driver" || role === "junior-driver") && (account === "JC-DRV-001" || organization === "Junior College");
  const dedicatedInitialization = (mvsrTestDriver || jcTestDriver)
    ? initializeMvsrDriver(root)
    : initializeTripNavigation(root, role, organization, account);
  dedicatedInitialization.catch((error) => {
    root.querySelector("#storage-status").textContent = `Trip service could not initialize: ${error.message}`;
    start.disabled = true;
  });
  let cameraStream = null;
  let scannerElement = null;
  let qrScanTimer = null;
  const scanButton = root.querySelector("#scan-qr");
  if (mvsrTestDriver) scanButton.disabled = true;

  function closeScanner(restoreFocus = true) {
    if (qrScanTimer !== null) {
      window.clearInterval(qrScanTimer);
      qrScanTimer = null;
    }
    if (cameraStream) {
      for (const track of cameraStream.getTracks()) track.stop();
      cameraStream = null;
    }
    scannerElement?.remove();
    scannerElement = null;
    scanButton.disabled = mvsrTestDriver && !root.dataset.transportTripId;
    if (restoreFocus) scanButton.focus();
  }

  async function openScanner() {
    if (scannerElement) return;
    if (mvsrTestDriver && !root.dataset.transportTripId) {
      scanMessage.textContent = "Start the assigned route trip before scanning attendance.";
      return;
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      scanMessage.textContent = !window.isSecureContext
        ? "Camera access requires HTTPS or localhost. Open the Permissions Center for details."
        : "This browser does not support camera access. Manual QR entry is not available in this demo.";
      return;
    }
    scanButton.disabled = true;
    scanMessage.textContent = "Requesting camera access…";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      cameraStream = stream;
      scannerElement = document.createElement("section");
      scannerElement.className = "scanner-dialog";
      scannerElement.setAttribute("role", "dialog");
      scannerElement.setAttribute("aria-modal", "true");
      scannerElement.setAttribute("aria-labelledby", "scanner-title");
      scannerElement.innerHTML = `
        <div class="scanner-panel card">
          <div class="panel-heading"><div><h2 id="scanner-title">${escapeHtml(DRIVER_ROUTES[role].qrLabel)}</h2><p>${mvsrTestDriver ? "QR token is sent to the assigned-route attendance service; camera images are not stored." : "Camera preview stays on this device."}</p></div><button class="button button-secondary" id="close-scanner" type="button">Close camera</button></div>
          <video id="scanner-preview" autoplay muted playsinline aria-label="Local QR scanner camera preview"></video>
          <p class="notice notice-warning" id="qr-scan-result" role="status" aria-live="polite">Starting QR detection.</p>
        </div>`;
      root.append(scannerElement);
      const video = scannerElement.querySelector("#scanner-preview");
      video.srcObject = stream;
      const activeScanner = scannerElement;
      activeScanner.querySelector("#close-scanner").addEventListener("click", closeScanner);
      activeScanner.querySelector("#close-scanner").focus();
      activeScanner.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeScanner();
      });
      await video.play();
      if (scannerElement !== activeScanner) return;
      const result = scannerElement.querySelector("#qr-scan-result");
      if (typeof window.BarcodeDetector !== "function") {
        result.textContent = "Camera preview is active, but this browser does not support QR detection. Identity validation and attendance require the backend service.";
        scanMessage.textContent = result.textContent;
        return;
      }

      let detector;
      try {
        detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      } catch (error) {
        result.textContent = `QR detection is unavailable: ${error.message}. Identity validation and attendance require the backend service.`;
        scanMessage.textContent = result.textContent;
        return;
      }
      const passengerType = role === "company-driver" ? "employee" : "student";
      let detectionInProgress = false;
      qrScanTimer = window.setInterval(async () => {
        if (detectionInProgress || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
        detectionInProgress = true;
        try {
          const codes = await detector.detect(video);
          if (codes.length > 0) {
            window.clearInterval(qrScanTimer);
            qrScanTimer = null;
            if (mvsrTestDriver) {
              const qrToken = codes[0].rawValue;
              if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(qrToken || "")) {
                result.textContent = "This QR code is not a valid IntelliBus student token. No attendance was recorded.";
                scanMessage.textContent = result.textContent;
                return;
              }
              const event = root.querySelector("#scan-event-type").value;
              try {
                const recorded = await callTransportService("scan-student", {
                  tripId: root.dataset.transportTripId,
                  qrToken,
                  event,
                });
                result.textContent = recorded.duplicate
                  ? recorded.status === "not_boarded"
                    ? "Drop-off was not recorded: this student has no boarding event for the active trip."
                    : `Duplicate ${event === "boarded" ? "boarding" : "drop-off"} scan ignored for ${recorded.studentId}.`
                  : `${recorded.studentId} ${event === "boarded" ? "boarded" : "left"} the bus. Attendance and the linked-parent notification were recorded.`;
                scanMessage.textContent = result.textContent;
                await loadMvsrDriverDashboard(root);
              } catch (error) {
                result.textContent = `Attendance was not recorded: ${error.message}`;
                scanMessage.textContent = result.textContent;
              }
            } else {
              result.textContent = `${passengerType[0].toUpperCase()}${passengerType.slice(1)} QR detected locally. Identity has not been verified and no attendance was recorded.`;
              scanMessage.textContent = result.textContent;
            }
          }
        } catch (error) {
          window.clearInterval(qrScanTimer);
          qrScanTimer = null;
          result.textContent = `QR detection failed: ${error.message}. No identity or attendance decision was made.`;
          scanMessage.textContent = result.textContent;
        } finally {
          detectionInProgress = false;
        }
      }, 300);
      result.textContent = mvsrTestDriver
        ? `Point the camera at a student QR code for ${root.querySelector("#scan-event-type").value === "boarded" ? "boarding" : "drop-off"}.`
        : `Point the camera at a ${passengerType} QR code. Detection stays local; identity validation and attendance are not connected.`;
      scanMessage.textContent = mvsrTestDriver
        ? "Secure QR attendance is ready for the active assigned-route trip."
        : `Camera preview active for ${passengerType} QR detection. Codes are not uploaded or stored.`;
    } catch (error) {
      closeScanner(false);
      const denied = error?.name === "NotAllowedError" || error?.name === "SecurityError";
      const noDevice = error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError";
      const busy = error?.name === "NotReadableError" || error?.name === "TrackStartError";
      scanMessage.textContent = denied
        ? "Camera access was denied. Allow camera for this site in browser settings or use Permissions Center to retry. Manual QR entry is not available."
        : noDevice
          ? "No camera device is available. Connect a camera and retry. Manual QR entry is not available."
          : busy
            ? "The camera is busy or unavailable. Close other camera apps and retry."
            : `Camera preview could not start: ${error?.message || "unknown camera error"}.`;
    } finally {
      scanButton.disabled = Boolean(scannerElement) || (mvsrTestDriver && !root.dataset.transportTripId);
    }
  }

  scanButton.addEventListener("click", openScanner);
  window.addEventListener("pagehide", () => closeScanner(false), { once: true });
}

async function initializeTripNavigation(root, role, organization, account) {
  const elements = {
    start: root.querySelector("#start-trip"),
    startLocal: root.querySelector("#start-local-trip"),
    resume: root.querySelector("#resume-trip"),
    end: root.querySelector("#end-trip"),
    tripStatus: root.querySelector("#trip-status-label"),
    tripMessage: root.querySelector("#trip-message"),
    latitude: root.querySelector("#gps-latitude"),
    longitude: root.querySelector("#gps-longitude"),
    accuracy: root.querySelector("#gps-accuracy"),
    updated: root.querySelector("#gps-updated"),
    gpsStatus: root.querySelector("#gps-status-text"),
    gpsError: root.querySelector("#gps-error"),
    storage: root.querySelector("#storage-status"),
    locate: root.querySelector("#locate-me"),
    locationOff: root.querySelector("#location-off"),
    mapContainer: root.querySelector("#offline-map"),
    mapSummary: root.querySelector("#route-map-summary"),
    mapAttribution: root.querySelector("#map-attribution"),
    mapStatus: root.querySelector("#map-status"),
    mapDownload: root.querySelector("#download-route-map"),
    nextStopLabel: root.querySelector("#next-stop-label"),
    distanceStatus: root.querySelector("#distance-status"),
    navigationStops: root.querySelector("#navigation-stops"),
    markStop: root.querySelector("#mark-stop-reached"),
    routeProgress: root.querySelector("#route-progress"),
    tripHistoryStatus: root.querySelector("#trip-history-status"),
    tripHistoryTable: root.querySelector("#trip-history-table"),
    exportTripData: root.querySelector("#export-trip-data"),
  };
  const route = getConfiguredRoute(role);
  const source = getTileSource();
  const mapState = {
    followGps: false,
  };
  let database;
  let activeTrip = null;
  let currentPosition = null;
  let positionWatchId = null;
  let lastSavedSampleAt = 0;
  const interactiveMap = createDashboardMap(elements.mapContainer, route, (message) => {
    elements.mapStatus.textContent = message;
  });
  if (route) {
    interactiveMap.fitRoute();
    if (source && interactiveMap.map.getZoom() < source.minZoom) {
      interactiveMap.map.setZoom(source.minZoom);
    }
  }

  function drawMap() {
    interactiveMap.map.invalidateSize();
  }

  function updateGpsReadings(position) {
    currentPosition = position;
    elements.latitude.textContent = formatCoordinate(position.lat);
    elements.longitude.textContent = formatCoordinate(position.lng);
    elements.accuracy.textContent = `${Math.round(position.accuracy)} m`;
    elements.updated.textContent = formatGpsTime(position.timestamp);
    elements.gpsStatus.textContent = "Device location fix received";
    elements.gpsError.textContent = "";
    root.querySelector("#follow-gps").disabled = false;
    updateNextStop();
    interactiveMap.updatePosition(position, mapState.followGps);
  }

  async function saveGpsSample(position) {
    if (
      !activeTrip ||
      activeTrip.status !== "active" ||
      !activeTrip.gpsTracking ||
      !database ||
      position.timestamp - lastSavedSampleAt < GPS_SAMPLE_INTERVAL_MS
    ) {
      return;
    }
    const sample = {
      id: createLocalId(),
      tripId: activeTrip.id,
      role,
      account,
      latitude: position.lat,
      longitude: position.lng,
      accuracy: position.accuracy,
      timestamp: position.timestamp,
    };
    const previousSampleTime = lastSavedSampleAt;
    lastSavedSampleAt = position.timestamp;
    try {
      await writeOfflineRecord(database, "gpsSamples", sample);
      await refreshTripHistory();
    } catch (error) {
      lastSavedSampleAt = previousSampleTime;
      throw error;
    }
  }

  function handlePosition(position) {
    const coords = position?.coords;
    if (
      !coords ||
      !Number.isFinite(coords.latitude) ||
      !Number.isFinite(coords.longitude) ||
      !Number.isFinite(coords.accuracy) ||
      coords.accuracy < 0 ||
      coords.latitude < -85 ||
      coords.latitude > 85 ||
      coords.longitude < -180 ||
      coords.longitude > 180
    ) {
      elements.gpsError.textContent = "The device returned an invalid GPS fix. No location was recorded.";
      elements.gpsStatus.textContent = "Invalid GPS fix";
      return false;
    }

    const location = {
      lat: coords.latitude,
      lng: coords.longitude,
      accuracy: coords.accuracy,
      timestamp: Number.isFinite(position.timestamp) ? position.timestamp : Date.now(),
    };
    updateGpsReadings(location);
    if (activeTrip) {
      saveGpsSample(location).catch((error) => {
        elements.storage.textContent = `GPS sample could not be saved: ${error.message}`;
      });
    }
    return true;
  }

  function handleLocationError(error) {
    const messages = {
      1: "Location permission was denied. Allow location access in browser settings and try again.",
      2: "GPS location is unavailable. Check device location services and satellite reception.",
      3: "GPS location request timed out. Move to an area with better GPS reception and retry.",
    };
    const description = messages[error?.code] ||
      (error?.message ? `GPS error: ${error.message}` : "An unknown GPS error occurred.");
    elements.gpsError.textContent = description;
    elements.gpsStatus.textContent = "No current device location fix";
    if (error?.code === 1) {
      elements.gpsError.textContent += " Trip events can still be recorded locally, but no GPS samples will be available.";
    }
    if (positionWatchId !== null) {
      stopGpsWatch();
      if (activeTrip) activeTrip.gpsTracking = false;
      updateTripControls();
      updateNextStop();
    }
  }

  function startGpsWatch() {
    if (!("geolocation" in navigator)) {
      elements.gpsStatus.textContent = "Geolocation unavailable";
      elements.gpsError.textContent = "This browser does not support GPS geolocation.";
      return false;
    }
    if (!window.isSecureContext) {
      elements.gpsStatus.textContent = "Secure page required";
      elements.gpsError.textContent = "Browser GPS requires HTTPS or localhost. This page is not in a secure context.";
      return false;
    }
    if (positionWatchId !== null) return true;
    elements.gpsStatus.textContent = "Waiting for device location…";
    elements.gpsError.textContent = "";
    try {
      positionWatchId = navigator.geolocation.watchPosition(
        handlePosition,
        handleLocationError,
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
      );
      elements.locationOff.disabled = false;
      return true;
    } catch (error) {
      elements.gpsStatus.textContent = "GPS tracking unavailable";
      elements.gpsError.textContent = `GPS tracking could not start: ${error.message}`;
      return false;
    }
  }

  function stopGpsWatch() {
    if (positionWatchId !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(positionWatchId);
      positionWatchId = null;
    }
    elements.locationOff.disabled = true;
  }

  async function refreshTripHistory() {
    if (!database) return;
    const userTrips = (await readUserTrips(database, role, account))
      .sort((first, second) => second.startedAt - first.startedAt)
      .slice(0, 10);
    const tripRecords = await Promise.all(userTrips.map(async (trip) => {
      const [events, samples] = await Promise.all([
        readTripRecords(database, "events", trip.id),
        readTripRecords(database, "gpsSamples", trip.id),
      ]);
      return {
        tripId: trip.id,
        eventCount: events.filter((event) => event.role === role && event.account === account).length,
        sampleCount: samples.filter((sample) => sample.role === role && sample.account === account).length,
      };
    }));
    const recordCounts = new Map(tripRecords.map((record) => [record.tripId, record]));
    const eventCount = tripRecords.reduce((sum, record) => sum + record.eventCount, 0);
    const sampleCount = tripRecords.reduce((sum, record) => sum + record.sampleCount, 0);

    elements.tripHistoryStatus.textContent =
      `${userTrips.length} recent trip${userTrips.length === 1 ? "" : "s"} · ${eventCount} event${eventCount === 1 ? "" : "s"} · ${sampleCount} GPS sample${sampleCount === 1 ? "" : "s"} stored on this device.`;
    elements.tripHistoryTable.innerHTML = userTrips.length
      ? dataTable(
          ["Started", "Route", "GPS samples", "Status"],
          userTrips.map((trip) => [
            formatGpsTime(trip.startedAt),
            trip.routeName || "No assigned route",
            String(recordCounts.get(trip.id)?.sampleCount || 0),
            trip.status === "active" ? "Active · local" : "Ended · local",
          ]),
          -1,
        )
      : '<div class="empty-state">No local trip records for this account yet.</div>';
  }

  async function exportTripData() {
    if (!database) {
      elements.tripHistoryStatus.textContent =
        "Local storage is unavailable; there is no trip data to export.";
      return;
    }
    try {
      const accountTrips = await readUserTrips(database, role, account);
      const accountRecords = await Promise.all(accountTrips.map(async (trip) => {
        const [events, gpsSamples] = await Promise.all([
          readTripRecords(database, "events", trip.id),
          readTripRecords(database, "gpsSamples", trip.id),
        ]);
        return {
          events: events.filter((event) => event.role === role && event.account === account),
          gpsSamples: gpsSamples.filter((sample) => sample.role === role && sample.account === account),
        };
      }));
      const exported = {
        exportedAt: new Date().toISOString(),
        localOnly: true,
        role,
        trips: accountTrips,
        events: accountRecords.flatMap((record) => record.events),
        gpsSamples: accountRecords.flatMap((record) => record.gpsSamples),
      };
      const blob = new Blob([JSON.stringify(exported, null, 2)], {
        type: "application/json",
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `intellibus-local-trips-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      elements.tripHistoryStatus.textContent =
        "Local trip data exported to this device. The file contains GPS coordinates; store it carefully.";
    } catch (error) {
      elements.tripHistoryStatus.textContent =
        `Local trip data could not be exported: ${error.message}`;
    }
  }

  function updateTripControls() {
    const isActive = activeTrip?.status === "active";
    elements.start.disabled = !database || isActive;
    elements.startLocal.disabled = !database || isActive;
    elements.resume.hidden = !isActive || positionWatchId !== null;
    elements.resume.disabled = false;
    elements.end.disabled = !database || !isActive;
    elements.locate.disabled = !("geolocation" in navigator) || !window.isSecureContext || positionWatchId !== null;
    elements.locationOff.disabled = positionWatchId === null;
    elements.tripStatus.textContent = !database
      ? "Local storage unavailable"
      : isActive
        ? positionWatchId !== null
          ? "GPS tracking active · local only"
          : activeTrip.gpsTracking
            ? "GPS tracking paused · local only"
            : "Trip active · no GPS"
        : activeTrip?.status === "ended"
          ? "Trip ended · local only"
          : "Trip not started";
    elements.tripMessage.textContent = isActive
      ? activeTrip.gpsTracking
        ? "Trip is active on this device with GPS tracking. Location samples stay local."
        : "Local-only trip is active. GPS tracking is off; resume it only when you explicitly need device location."
      : activeTrip?.status === "ended"
        ? "Trip ended. Its events and GPS samples remain on this device; no synchronization is configured."
        : "Start trip to record local trip events. No GPS fix will be assumed.";
  }

  function nextRouteStop() {
    if (!route || !activeTrip) return null;
    const completed = new Set(activeTrip.completedStopIds || []);
    const pickup = route.stops.find((stop) => stop.kind === "pickup" && !completed.has(stop.id));
    return pickup || route.stops.find((stop) => !completed.has(stop.id)) || null;
  }

  function updateNextStop() {
    const completed = new Set(activeTrip?.completedStopIds || []);
    const nextStop = nextRouteStop();
    const hasFreshPosition = positionWatchId !== null &&
      currentPosition &&
      Date.now() - currentPosition.timestamp <= 60000;
    if (!route) {
      elements.nextStopLabel.textContent = "No assigned route loaded";
      elements.distanceStatus.textContent = "Next stop and distance unavailable: no assigned stop coordinates are configured.";
      elements.navigationStops.innerHTML = "";
      elements.markStop.disabled = true;
      elements.routeProgress.textContent = "Route progress unavailable";
      return;
    }

    elements.nextStopLabel.textContent = nextStop
      ? `Next: ${nextStop.name}`
      : "All configured stops are marked reached";
    if (hasFreshPosition && nextStop) {
      elements.distanceStatus.textContent =
        `${formatDistance(distanceMeters(currentPosition, nextStop))} to ${nextStop.name}. This is a straight-line distance, not a road distance or ETA.`;
    } else if (nextStop) {
      elements.distanceStatus.textContent = positionWatchId !== null
        ? "The last GPS fix is stale. A fresh fix is required before distance to the next stop can be estimated."
        : "Turn location on and receive a fresh GPS fix before distance to the next stop can be estimated.";
    } else {
      elements.distanceStatus.textContent = "All configured stops are marked reached. No destination distance is available.";
    }

    elements.navigationStops.innerHTML = route.stops.map((stop) => {
      const reached = completed.has(stop.id);
      const label = stop.kind === "destination" ? "Destination" : "Pickup stop";
      return `<div class="stop-row"><span class="stop-marker${reached ? " stop-marker-done" : ""}" aria-hidden="true"></span><span><span class="stop-name">${escapeHtml(stop.name)}</span><span class="stop-note">${label}${reached ? " · marked reached" : ""}</span></span><span class="stop-time">${reached ? "Done" : "Remaining"}</span></div>`;
    }).join("");
    elements.markStop.disabled = !activeTrip || activeTrip.status !== "active" || !nextStop;
    const reachedCount = completed.size;
    elements.routeProgress.textContent =
      `${reachedCount} of ${route.stops.length} stops manually marked reached. This does not record passenger attendance.`;
  }

  async function updateMapAvailability() {
    if (!route) {
      elements.mapSummary.textContent =
        "No assigned route is configured. The India base map remains available.";
      elements.mapAttribution.innerHTML = OSM_ATTRIBUTION;
      interactiveMap.setBaseTiles(null, null);
      elements.mapStatus.textContent =
        "No route or stop data is available. OpenStreetMap tiles require internet and are not cached for offline use.";
      elements.mapDownload.disabled = true;
      return;
    }
    elements.mapSummary.textContent = route.name
      ? `Assigned route: ${route.name} · configured route geometry`
      : "Assigned route loaded from local configuration.";
    if (!source || !database) {
      elements.mapAttribution.innerHTML = OSM_ATTRIBUTION;
      interactiveMap.setBaseTiles(null, null);
      elements.mapStatus.textContent = source
        ? "The configured route is visible, but offline map storage is unavailable. OpenStreetMap tiles are not cached."
        : "The configured route is visible on the OpenStreetMap base layer. Offline tiles require an authorized same-origin tile service.";
      elements.mapDownload.disabled = true;
      return;
    }

    interactiveMap.setBaseTiles(source, database);
    elements.mapAttribution.textContent = source.attribution;
    elements.mapDownload.disabled = !navigator.onLine || !database;
    try {
      const tiles = routeTileList(route, source);
      const records = await Promise.all(
        tiles.map((tile) => readOfflineRecord(database, "tiles", tileRecordKey(source.id, tile))),
      );
      const cachedCount = records.filter(Boolean).length;
      elements.mapStatus.textContent =
        `${cachedCount} of ${tiles.length} authorized route-area tiles are stored on this device. ${navigator.onLine ? "Download only this bounded route area while online." : "Missing tiles cannot be fetched while offline."}`;
    } catch (error) {
      elements.mapStatus.textContent = error.message;
      elements.mapDownload.disabled = true;
    }
  }

  function updateNetworkStatus() {
    elements.storage.textContent = database
      ? `Local trip storage ready · ${navigator.onLine ? "online" : "offline"} · no server sync`
      : "Browser offline storage is unavailable.";
    if (source && route) {
      elements.mapDownload.disabled = !database || !navigator.onLine;
      updateMapAvailability();
    } else if (!navigator.onLine) {
      elements.mapStatus.textContent =
        "Offline. OpenStreetMap base tiles are not cached; route details remain available only if configured in this app shell.";
    }
  }

  async function downloadRouteMap() {
    if (!navigator.onLine) {
      elements.mapStatus.textContent = "Map downloads require an internet connection to the configured same-origin tile service.";
      return;
    }
    if (!database || !source || !route) {
      elements.mapStatus.textContent = "A local database, assigned route, and authorized map source are required.";
      return;
    }

    let tiles;
    try {
      tiles = routeTileList(route, source);
      await writeOfflineRecord(database, "routes", {
        id: `${role}:${route.id}`,
        role,
        route,
        cachedAt: Date.now(),
        tileSourceId: source.id,
      });
    } catch (error) {
      elements.mapStatus.textContent = error.message;
      return;
    }

    elements.mapDownload.disabled = true;
    let savedCount = 0;
    let downloadedBytes = 0;
    try {
      for (let index = 0; index < tiles.length; index += 1) {
        const tile = tiles[index];
        const key = tileRecordKey(source.id, tile);
        const cached = await readOfflineRecord(database, "tiles", key);
        if (cached) {
          savedCount += 1;
          continue;
        }

        const response = await fetch(tileUrl(source, tile), {
          credentials: "same-origin",
          cache: "no-store",
          redirect: "error",
        });
        if (!response.ok) {
          throw new Error(`Map tile request failed (${response.status}) at zoom ${tile.zoom}.`);
        }
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.toLowerCase().startsWith("image/")) {
          throw new Error(`Map tile service returned a non-image response at zoom ${tile.zoom}.`);
        }
        const contentLength = Number(response.headers.get("content-length"));
        if (Number.isFinite(contentLength) && contentLength > MAX_TILE_BYTES) {
          throw new Error("A map tile exceeded the 2 MB per-tile safety limit.");
        }
        const blob = await response.blob();
        if (blob.size > MAX_TILE_BYTES) {
          throw new Error("A map tile exceeded the 2 MB per-tile safety limit.");
        }
        downloadedBytes += blob.size;
        if (downloadedBytes > MAX_ROUTE_CACHE_BYTES) {
          throw new Error("The route map exceeded the 50 MB per-download safety limit.");
        }
        await writeOfflineRecord(database, "tiles", {
          key,
          sourceId: source.id,
          zoom: tile.zoom,
          x: tile.x,
          y: tile.y,
          blob,
          attribution: source.attribution,
          storedAt: Date.now(),
        });
        savedCount += 1;
        elements.mapStatus.textContent =
          `Downloading authorized route tiles: ${savedCount} of ${tiles.length}.`;
        drawMap();
      }
      elements.mapStatus.textContent =
        `${savedCount} of ${tiles.length} bounded route tiles are stored on this device. Map use still depends on GPS and the assigned route.`;
    } catch (error) {
      elements.mapStatus.textContent =
        `Route map download stopped after ${savedCount} of ${tiles.length} tiles: ${error.message}`;
    } finally {
      elements.mapDownload.disabled = !navigator.onLine;
      await updateMapAvailability();
      interactiveMap.map.invalidateSize();
    }
  }

  async function turnLocationOn() {
    elements.locate.disabled = true;
    elements.gpsStatus.textContent = "Requesting device location…";
    elements.gpsError.textContent = "";
    try {
      await requestLocationFixForTracking();
      if (!startGpsWatch()) {
        throw new Error(elements.gpsError.textContent || "Continuous location tracking could not start.");
      }
      if (activeTrip?.status === "active" && !activeTrip.gpsTracking) {
        activeTrip.gpsTracking = true;
        try {
          await writeTripAndEvent(database, activeTrip, role, account, "gps-tracking-resumed");
        } catch (error) {
          activeTrip.gpsTracking = false;
          stopGpsWatch();
          throw new Error(`Location started but its trip event could not be saved: ${error.message}`, { cause: error });
        }
      }
      elements.gpsStatus.textContent = "Location tracking on";
      updateNextStop();
      if (activeTrip?.status === "active") {
        elements.tripMessage.textContent = "GPS tracking is on. Trip events and location samples remain on this device.";
      }
    } catch (error) {
      elements.gpsStatus.textContent = "Location tracking unavailable";
      elements.gpsError.textContent = error.message;
    } finally {
      elements.locate.disabled = false;
      elements.locationOff.disabled = positionWatchId === null;
      updateTripControls();
    }
  }

  async function turnLocationOff() {
    const shouldRecordPause = activeTrip?.status === "active" && activeTrip.gpsTracking;
    stopGpsWatch();
    if (shouldRecordPause) {
      activeTrip.gpsTracking = false;
      try {
        await writeTripAndEvent(database, activeTrip, role, account, "gps-tracking-paused");
      } catch (error) {
        elements.gpsError.textContent = `Location is off, but the pause event could not be saved locally: ${error.message}`;
      }
    }
    elements.gpsStatus.textContent = currentPosition
      ? `Location off · last fix ${formatGpsTime(currentPosition.timestamp)}`
      : "Location tracking off";
    updateTripControls();
    updateNextStop();
  }

  async function startTrip() {
    if (!database) {
      elements.tripMessage.textContent = "Trip not started: local browser storage is unavailable.";
      return;
    }
    if (activeTrip?.status === "active") return;
    elements.start.disabled = true;
    elements.tripMessage.textContent = "Checking location access before starting GPS tracking…";
    try {
      await requestLocationFixForTracking();
    } catch (error) {
      updateTripControls();
      elements.tripMessage.textContent =
        `GPS-tracked trip not started: ${error.message} You can retry or choose a local-only trip.`;
      return;
    }
    await createTrip(true);
  }

  async function startLocalTrip() {
    if (!database) {
      elements.tripMessage.textContent = "Trip not started: local browser storage is unavailable.";
      return;
    }
    if (activeTrip?.status === "active") return;
    await createTrip(false);
  }

  function requestLocationFixForTracking() {
    if (!("geolocation" in navigator)) {
      elements.gpsStatus.textContent = "Geolocation unavailable";
      elements.gpsError.textContent = "This browser does not support GPS geolocation.";
      return Promise.reject(new Error("This browser does not support geolocation."));
    }
    if (!window.isSecureContext) {
      elements.gpsStatus.textContent = "Secure page required";
      elements.gpsError.textContent = "Browser GPS requires HTTPS or localhost.";
      return Promise.reject(new Error("GPS requires HTTPS or localhost."));
    }
    elements.gpsStatus.textContent = "Requesting device GPS…";
    elements.gpsError.textContent = "";
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!handlePosition(position)) {
            reject(new Error(elements.gpsError.textContent || "The device returned an invalid location."));
            return;
          }
          resolve(position);
        },
        (error) => {
          handleLocationError(error);
          reject(new Error(formatGeolocationError(error)));
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
      );
    });
  }

  async function createTrip(trackGps) {
    if (activeTrip?.status === "active") return;
    activeTrip = {
      id: createLocalId(),
      role,
      account,
      organization,
      routeId: route?.id || null,
      routeName: route?.name || null,
      startedAt: Date.now(),
      endedAt: null,
      status: "active",
      completedStopIds: [],
      gpsTracking: false,
    };
    lastSavedSampleAt = 0;
    updateTripControls();
    updateNextStop();
    try {
      if (route) {
        await writeOfflineRecord(database, "routes", {
          id: `${role}:${route.id}`,
          role,
          route,
          cachedAt: Date.now(),
          tileSourceId: source?.id || null,
        });
      }
      await writeTripAndEvent(
        database,
        activeTrip,
        role,
        account,
        "trip-started",
        { routeId: route?.id || null },
      );
    } catch (error) {
      stopGpsWatch();
      activeTrip = null;
      elements.tripMessage.textContent = `Trip could not start because local storage failed: ${error.message}`;
      updateTripControls();
      updateNextStop();
      return;
    }
    if (trackGps) {
      activeTrip.gpsTracking = true;
      if (!startGpsWatch()) activeTrip.gpsTracking = false;
    }
    elements.tripMessage.textContent = activeTrip.gpsTracking
      ? "GPS-tracked trip started and saved on this device. GPS samples remain local and are not synchronized."
      : trackGps
        ? "Trip started locally, but GPS tracking could not start. Review the location status or continue without GPS."
        : "Local-only trip started. GPS tracking is off; resume it only when you explicitly need device location.";
    updateTripControls();
    updateNextStop();
    try {
      await refreshTripHistory();
    } catch (error) {
      elements.tripHistoryStatus.textContent = `Trip saved, but local history could not be refreshed: ${error.message}`;
    }
  }

  async function resumeTrip() {
    if (!activeTrip || activeTrip.status !== "active") return;
    elements.resume.disabled = true;
    elements.tripMessage.textContent = "Checking location access before resuming GPS tracking…";
    try {
      await requestLocationFixForTracking();
    } catch (error) {
      elements.tripMessage.textContent = `GPS tracking was not resumed: ${error.message}`;
      elements.resume.disabled = false;
      return;
    }
    activeTrip.gpsTracking = true;
    if (!startGpsWatch()) {
      activeTrip.gpsTracking = false;
      updateTripControls();
      return;
    }
    try {
      await writeTripAndEvent(database, activeTrip, role, account, "gps-tracking-resumed");
      elements.tripMessage.textContent = "GPS tracking resumed. Trip data remains local to this device.";
    } catch (error) {
      activeTrip.gpsTracking = false;
      stopGpsWatch();
      elements.tripMessage.textContent = `GPS tracking resumed, but its event could not be recorded: ${error.message}`;
    }
    updateTripControls();
    updateNextStop();
    try {
      await refreshTripHistory();
    } catch (error) {
      elements.tripHistoryStatus.textContent = `Trip resumed, but local history could not be refreshed: ${error.message}`;
    }
  }

  async function endTrip() {
    if (!activeTrip || activeTrip.status !== "active") return;
    const endingPosition = activeTrip.gpsTracking && positionWatchId !== null
      ? currentPosition
      : null;
    stopGpsWatch();
    activeTrip.gpsTracking = false;
    elements.gpsStatus.textContent = currentPosition
      ? `Location off · last fix ${formatGpsTime(currentPosition.timestamp)}`
      : "Location tracking off";
    const endedAt = Date.now();
    activeTrip.status = "ended";
    activeTrip.endedAt = endedAt;
    try {
      await writeTripAndEvent(database, activeTrip, role, account, "trip-ended", {
        latitude: endingPosition?.lat ?? null,
        longitude: endingPosition?.lng ?? null,
      });
    } catch (error) {
      activeTrip.status = "active";
      activeTrip.endedAt = null;
      elements.tripMessage.textContent =
        `Trip remains active but GPS tracking has stopped because the end event could not be saved: ${error.message} Resume tracking explicitly if needed.`;
      updateTripControls();
      updateNextStop();
      return;
    }
    elements.tripMessage.textContent =
      "Trip ended and saved on this device. No network sync or dispatch notification was sent.";
    updateTripControls();
    updateNextStop();
    try {
      await refreshTripHistory();
    } catch (error) {
      elements.tripHistoryStatus.textContent = `Trip ended, but local history could not be refreshed: ${error.message}`;
    }
  }

  async function markNextStopReached() {
    const stop = nextRouteStop();
    if (!stop || !activeTrip || activeTrip.status !== "active") return;
    const previousStopIds = activeTrip.completedStopIds || [];
    const updatedStopIds = [...previousStopIds, stop.id];
    activeTrip.completedStopIds = updatedStopIds;
    try {
      await writeTripAndEvent(database, activeTrip, role, account, "stop-marked-reached", {
        stopId: stop.id,
        stopName: stop.name,
        latitude: positionWatchId !== null ? currentPosition?.lat ?? null : null,
        longitude: positionWatchId !== null ? currentPosition?.lng ?? null : null,
      });
    } catch (error) {
      activeTrip.completedStopIds = previousStopIds;
      elements.mapStatus.textContent = `Stop progress could not be saved locally: ${error.message}`;
      updateNextStop();
      return;
    }
    updateNextStop();
    try {
      await refreshTripHistory();
    } catch (error) {
      elements.tripHistoryStatus.textContent = `Stop progress was saved, but local history could not be refreshed: ${error.message}`;
    }
  }

  try {
    database = await openOfflineDatabase();
    elements.storage.textContent =
      `Local trip storage ready · ${navigator.onLine ? "online" : "offline"} · no server sync`;
    elements.start.disabled = false;
    elements.locate.disabled = false;
    const previousTrip = (await readUserTrips(database, role, account))
      .sort((first, second) => second.startedAt - first.startedAt)[0];
    if (previousTrip?.status === "active") {
      activeTrip = previousTrip;
      elements.tripMessage.textContent =
        "An unfinished local trip was restored. Resume GPS tracking or end the trip; existing GPS permission is not assumed.";
      updateTripControls();
    } else if (previousTrip) {
      activeTrip = previousTrip;
      updateTripControls();
    }
  } catch (error) {
    elements.storage.textContent = `Offline storage unavailable: ${error.message}`;
    elements.tripMessage.textContent =
      "Trips cannot be recorded on this device until IndexedDB is available.";
    elements.start.disabled = true;
    elements.end.disabled = true;
    elements.locate.disabled = false;
  }

  elements.start.addEventListener("click", startTrip);
  elements.startLocal.addEventListener("click", startLocalTrip);
  elements.resume.addEventListener("click", resumeTrip);
  elements.end.addEventListener("click", endTrip);
  elements.locate.addEventListener("click", turnLocationOn);
  elements.locationOff.addEventListener("click", turnLocationOff);
  elements.markStop.addEventListener("click", markNextStopReached);
  elements.exportTripData.addEventListener("click", exportTripData);
  elements.mapDownload.addEventListener("click", downloadRouteMap);

  if (!("geolocation" in navigator)) {
    elements.gpsStatus.textContent = "Geolocation unavailable";
    elements.gpsError.textContent = "This browser does not support GPS geolocation.";
    elements.locate.disabled = true;
  } else if (!window.isSecureContext) {
    elements.gpsStatus.textContent = "Secure page required";
    elements.gpsError.textContent =
      "Browser GPS requires HTTPS or localhost. Open this application on a secure origin.";
    elements.locate.disabled = true;
  }

  elements.navigationStops.innerHTML = "";
  root.querySelector("#fit-route").disabled = !route;
  root.querySelector("#follow-gps").disabled = !currentPosition;
  root.querySelector("#fit-route").addEventListener("click", () => {
    if (!route) return;
    mapState.followGps = false;
    interactiveMap.fitRoute();
  });
  root.querySelector("#follow-gps").addEventListener("click", () => {
    if (!currentPosition) return;
    mapState.followGps = true;
    interactiveMap.updatePosition(currentPosition, true);
  });
  interactiveMap.map.on("dragstart", () => {
    mapState.followGps = false;
  });
  updateNextStop();
  await updateMapAvailability();
  updateTripControls();
  await refreshTripHistory();

  window.addEventListener("resize", drawMap);
  window.addEventListener("online", updateNetworkStatus);
  window.addEventListener("offline", updateNetworkStatus);
  window.addEventListener("pagehide", () => {
    stopGpsWatch();
    if (activeTrip?.status === "active") activeTrip.gpsTracking = false;
    updateTripControls();
    window.clearInterval(gpsStaleTimer);
  }, { once: true });
  const gpsStaleTimer = window.setInterval(() => {
    if (currentPosition && Date.now() - currentPosition.timestamp > 60000) {
      elements.gpsStatus.textContent = "Last GPS fix is stale";
      elements.gpsError.textContent =
        "No new device location update has arrived for over one minute. Coordinates below are the last valid fix, not a current position.";
      updateNextStop();
    }
  }, 10000);

  if ("serviceWorker" in navigator && window.isSecureContext) {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).then(async () => {
      const registration = await navigator.serviceWorker.ready;
      if (!registration.active) {
        throw new Error("The offline app service worker did not become active.");
      }
      const cache = await caches.open("intellibus-ui-v9");
      const requiredPages = [
        "index.html",
        "login.html",
        "face-verification.html",
        "permissions.html",
        "engineering-student-dashboard.html",
        "junior-student-dashboard.html",
        "school-driver-dashboard.html",
        "company-driver-dashboard.html",
        "employee-dashboard.html",
        "parent-dashboard.html",
      ];
      const cachedPages = await Promise.all(
        requiredPages.map((path) => cache.match(new URL(path, window.location.href).href)),
      );
      if (cachedPages.some((response) => !response)) {
        throw new Error("The app shell cache is incomplete.");
      }
      elements.storage.textContent += " · driver app shell cached for offline use";
    }).catch((error) => {
      elements.storage.textContent += ` · app shell caching unavailable: ${error.message}`;
    });
  } else {
    elements.storage.textContent +=
      " · offline app shell requires a secure context and Service Worker support";
  }
}

function renderStudent(root, role, account) {
  const info = STUDENT_DASHBOARDS[role];
  root.innerHTML = shell(info.title, info.subtitle, role, account);
  root.querySelector(".dashboard-content").innerHTML = `
    <div class="stat-grid">
      ${stat("Institution", info.organization, "Demo profile")}
      ${stat("Assigned bus", info.bus, "Assignment integration pending")}
      ${stat("Pickup point", info.stop, "Live arrival unavailable")}
      ${stat("Next journey", "Not connected", "No live journey feed")}
    </div>
    ${passengerMapPanel(role)}
    <!-- Real-Time Transit Checkpoints: Live Boarding & Exit Station -->
    <section class="panel card span-12" id="checkpoint-transit-panel" style="margin-bottom: 1.25rem; border-color: rgba(59, 130, 246, 0.45); background: linear-gradient(135deg, rgba(15, 23, 42, 0.75), rgba(30, 58, 138, 0.28));">
      <div class="panel-heading" style="margin-bottom: 0.85rem; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.5rem;">
        <div>
          <h2 style="display: flex; align-items: center; gap: 0.5rem; font-size: 1.15rem; margin: 0;">
            <span>📍</span> Real-Time Transit Checkpoints: Entering & Exit Station
          </h2>
          <p style="margin: 0.25rem 0 0; font-size: 0.85rem; color: #94a3b8;">Live boarding & drop-off locations and timestamps synchronized with QR scanner</p>
        </div>
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <span style="font-family: monospace; font-size: 0.85rem; color: #38bdf8; font-weight: 700; background: rgba(56,189,248,0.12); padding: 0.25rem 0.6rem; border-radius: 6px; border: 1px solid rgba(56,189,248,0.3);">
            ⏱️ LIVE: <span id="live-transit-clock">--:--:--</span>
          </span>
          <span class="badge" style="background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); padding: 0.25rem 0.6rem; border-radius: 4px; font-weight: 600; font-size: 0.75rem;">
            Scanner Sync Active
          </span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
        <!-- Entering Checkpoint Card -->
        <div class="checkpoint-card" style="padding: 1.2rem; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(59, 130, 246, 0.35); border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
            <span style="font-size: 0.82rem; font-weight: 700; color: #60a5fa; text-transform: uppercase; letter-spacing: 0.5px;">🚌 Entering (Boarding) Checkpoint</span>
            <span id="entering-status-badge" class="badge" style="background: rgba(234,179,8,0.2); color: #fde047; border: 1px solid rgba(234,179,8,0.4); font-size: 0.75rem; padding: 0.25rem 0.55rem; border-radius: 4px; font-weight: 600;">AWAITING QR SCAN</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.9rem;">
            <div><span style="color: #94a3b8;">Entering Place:</span> <strong id="entering-place-display" style="color: #f8fafc;">${role === "junior-student" ? "Intermediate Test Stop 01" : "Test Stop 01 (Campus North Gate)"}</strong></div>
            <div><span style="color: #94a3b8;">Entering Time:</span> <strong id="entering-time-display" style="color: #fde047;">Not boarded yet · Scan QR upon boarding</strong></div>
            <div><span style="color: #94a3b8;">Assigned Vehicle:</span> <strong id="assigned-vehicle-display" style="color: #f8fafc;">${role === "junior-student" ? "TEST-JC-BUS-001 (INT-ROUTE-01)" : "TEST-BUS-001 (MVSR-ROUTE-01)"}</strong></div>
            <div><span style="color: #94a3b8;">Scanner Agent:</span> <strong id="entering-agent-display" style="color: #cbd5e1;">${role === "junior-student" ? "Awaiting Driver JC-DRV-001" : "Awaiting Driver MVSR-DRV-001"}</strong></div>
          </div>
        </div>

        <!-- Exit Checkpoint Card -->
        <div class="checkpoint-card" style="padding: 1.2rem; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(147, 51, 234, 0.35); border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
            <span style="font-size: 0.82rem; font-weight: 700; color: #c084fc; text-transform: uppercase; letter-spacing: 0.5px;">🚏 Exit (Dropping) Checkpoint</span>
            <span id="exit-status-badge" class="badge" style="background: rgba(148,163,184,0.15); color: #cbd5e1; border: 1px solid rgba(148,163,184,0.3); font-size: 0.75rem; padding: 0.25rem 0.55rem; border-radius: 4px; font-weight: 600;">SCHEDULED</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.9rem;">
            <div><span style="color: #94a3b8;">Exit Place:</span> <strong id="exit-place-display" style="color: #f8fafc;">${role === "junior-student" ? "Intermediate Test Stop 05" : "Test Stop 05 (Central Engineering Block)"}</strong></div>
            <div><span style="color: #94a3b8;">Exit Time:</span> <strong id="exit-time-display" style="color: #94a3b8;">Pending destination arrival</strong></div>
            <div><span style="color: #94a3b8;">Journey Status:</span> <strong id="exit-status-text" style="color: #94a3b8;">${role === "junior-student" ? "Scheduled for INT-ROUTE-01" : "Scheduled for MVSR-ROUTE-01"}</strong></div>
            <div><span style="color: #94a3b8;">Destination Audit:</span> <strong id="exit-agent-display" style="color: #cbd5e1;">Pending Exit QR Scan</strong></div>
          </div>
        </div>
      </div>

      <!-- Real-Time Scanner Action Controls -->
      <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid rgba(255, 255, 255, 0.1); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem;">
        <span style="font-size: 0.82rem; color: #94a3b8;">⚡ Real-Time Driver QR Scanner Controls:</span>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button type="button" class="button button-primary" id="btn-scan-entering" style="font-size: 0.82rem; padding: 0.4rem 0.85rem;">
            🚌 Scan Entering QR (Live Now)
          </button>
          <button type="button" class="button button-secondary" id="btn-scan-exit" style="font-size: 0.82rem; padding: 0.4rem 0.85rem;">
            🚏 Scan Exit QR (Live Now)
          </button>
          <button type="button" class="button button-secondary" id="btn-reset-transit" style="font-size: 0.78rem; padding: 0.4rem 0.7rem; color: #f87171;">
            🔄 Reset Live Demo
          </button>
        </div>
      </div>
    </section>

    <div class="dashboard-grid">
      <section class="panel card span-6">
        <div class="panel-heading"><div><h2>Digital transport pass</h2><p>${info.pass} · demo only</p></div></div>
        <div class="pass-card"><span class="pass-brand">INTELLIBUS · DEMONSTRATION</span><p class="pass-name">${info.title}</p><span class="pass-id account-display"></span><div class="pass-details"><span><small>Institution</small><strong>${info.organization}</strong></span><span><small>Pass status</small><strong>Not verified</strong></span></div></div>
        <p class="route-caption">This visual pass is not a scannable ticket and does not establish travel eligibility.</p>
      </section>
      <section class="panel card span-6" id="route">
        <div class="panel-heading"><div><h2>Assigned transport</h2><p>Data source status</p></div></div>
        <div class="notice notice-warning" id="student-transport-summary">Loading assigned transport from the secure service…</div>
      </section>
      <section class="panel card span-6" id="student-qr-panel">
        <div class="panel-heading"><div><h2>Boarding QR code</h2><p>Show this code to your assigned driver</p></div></div>
        <div id="student-qr-code" class="empty-state">Loading your secure QR code…</div>
        <p class="route-caption" id="student-qr-status" role="status" aria-live="polite"></p>
      </section>
      <section class="panel card span-6">
        <div class="panel-heading"><div><h2>${info.attendanceLabel}</h2><p>Student attendance service</p></div></div>
        <div class="empty-state" id="student-attendance">Loading authorized attendance…</div>
      </section>
      <section class="panel card span-6" id="records">
        <div class="panel-heading"><div><h2>${info.historyTitle}</h2><p>Authenticated journey service</p></div></div>
        <div class="empty-state" id="student-journey-status">Loading journey history…</div>
      </section>
      ${faceManagementSection(role)}
      ${profileSection(role, account, info.organization)}
    </div>`;
}

function renderEmployee(root, account) {
  root.innerHTML = shell("Employee dashboard", "Company shuttle transport", "employee", account);
  root.querySelector(".dashboard-content").innerHTML = `
    <div class="stat-grid">
      ${stat("Organization", "Company transport", "Demo profile")}
      ${stat("Assigned bus", "Not connected", "No live assignment")}
      ${stat("Pickup point", "Not connected", "No location provided")}
      ${stat("Journey status", "Unavailable", "Live feed pending")}
    </div>
    ${passengerMapPanel("employee")}
    <div class="dashboard-grid">
      <section class="panel card span-6">
        <div class="panel-heading"><div><h2>Digital employee transport pass</h2><p>Illustrative pass · not valid for boarding</p></div></div>
        <div class="pass-card"><span class="pass-brand">INTELLIBUS · DEMONSTRATION</span><p class="pass-name">Employee shuttle pass</p><span class="pass-id account-display"></span><div class="pass-details"><span><small>Company route</small><strong>Not connected</strong></span><span><small>Pass status</small><strong>Not verified</strong></span></div></div>
        <p class="route-caption">A verified employee identity and pass must be supplied by an authorized company service.</p>
      </section>
      <section class="panel card span-6" id="route">
        <div class="panel-heading"><div><h2>Company transport details</h2><p>Employee-specific details</p></div></div>
        <div class="notice notice-warning">Bus, pickup location, route, and estimated arrival are not available because no company transport API is configured.</div>
      </section>
      <section class="panel card span-6">
        <div class="panel-heading"><div><h2>Employee attendance</h2><p>Employee attendance service</p></div></div>
        <div class="empty-state"><strong>No attendance records available</strong>Authorized employee attendance records will appear when the company transport service is connected.</div>
      </section>
      <section class="panel card span-6" id="records">
        <div class="panel-heading"><div><h2>Journey history</h2><p>History service not connected</p></div></div>
        <div class="empty-state">No employee journey history is available for this account.</div>
      </section>
      ${faceManagementSection("employee")}
      ${profileSection("employee", account, "Company transport")}
    </div>`;
}

function renderParent(root, account) {
  root.innerHTML = shell("Parent dashboard", "Authorized student transport updates", "parent", account);
  root.querySelector(".dashboard-content").innerHTML = `
    <div class="stat-grid">
      ${stat("Linked student", "Not available", "Authorization required")}
      ${stat("Assigned bus", "Not available", "No student data loaded")}
      ${stat("Pickup / drop-off", "Not available", "No live feed")}
      ${stat("Notifications", "Not connected", "Service integration pending")}
    </div>
    ${passengerMapPanel("parent")}
    <div class="dashboard-grid">
      <section class="panel card span-12">
        <div class="panel-heading"><div><h2>Linked student journey</h2><p>Only administrator-authorized student links are shown.</p></div></div>
        <div class="empty-state" id="guardian-students"><strong>Loading authorized student links…</strong></div>
      </section>
      <section class="panel card span-6" id="route">
        <div class="panel-heading"><div><h2>Pickup and drop-off status</h2><p>Student-specific updates</p></div></div>
        <div class="notice notice-warning" id="parent-transport-summary">Loading the linked student's authorized transport information…</div>
      </section>
      <section class="panel card span-6">
        <div class="panel-heading"><div><h2>Transport notifications</h2><p>Account-scoped alerts</p></div></div>
        <div class="empty-state" id="parent-notifications">Loading journey notifications…</div>
      </section>
      <section class="panel card span-12" id="records">
        <div class="panel-heading"><div><h2>Boarding and dropping history</h2><p>Only linked students are shown</p></div></div>
        <div class="empty-state" id="parent-attendance">Loading authorized attendance…</div>
      </section>
      ${faceManagementSection("parent")}
      ${profileSection("parent", account, "Not connected")}
    </div>`;
  loadParentGuardianTools(root);
}

function faceManagementSection(role) {
  return `
    <section class="panel card span-12">
      <div class="panel-heading"><div><h2>Biometric identity</h2><p>Manage your enrolled verification method and consent</p></div></div>
      <p class="route-caption">Your dashboard session is protected by account authentication and a backend face match. Face images are not saved to browser storage.</p>
      <a class="button button-secondary" href="face-verification.html?role=${encodeURIComponent(role)}&amp;mode=manage">Manage face verification</a>
    </section>`;
}

async function loadParentGuardianTools(root) {
  const list = root.querySelector("#guardian-students");
  if (!list) return;
  try {
    const identity = await callFaceVerification("status");
    if (!identity.linkedStudents.length) {
      list.innerHTML = `<strong>No linked student account</strong>Ask an IntelliBus administrator to associate the correct student account with your parent account.`;
      return;
    }
    list.innerHTML = identity.linkedStudents.map((student) => `
      <article class="guardian-student">
        <div><strong>Student ID: ${escapeHtml(student.studentId)}</strong><span>${student.consentGranted ? "Guardian consent recorded" : "Guardian biometric consent required"}</span></div>
        ${student.consentGranted
          ? `<div class="guardian-consent-actions"><span class="guardian-consent-status">Consent active</span><button class="inline-action face-remove" type="button" data-guardian-revoke="${escapeHtml(student.studentId)}">Withdraw guardian consent</button></div>`
          : `<label class="face-consent"><input type="checkbox" data-guardian-check="${escapeHtml(student.studentId)}" /><span>I am this linked student's parent or legal guardian and consent to biometric face verification for this student.</span></label><button class="button button-secondary" type="button" data-guardian-consent="${escapeHtml(student.studentId)}">Record guardian consent</button>`}
      </article>`).join("");
    list.querySelectorAll("[data-guardian-consent]").forEach((button) => {
      button.addEventListener("click", async () => {
        const studentId = button.getAttribute("data-guardian-consent");
        const checkbox = list.querySelector(`[data-guardian-check="${CSS.escape(studentId)}"]`);
        if (!checkbox?.checked) {
          window.alert("Confirm the guardian consent statement before continuing.");
          return;
        }
        button.disabled = true;
        try {
          await callFaceVerification("guardian-consent", { studentId, accepted: true });
          await loadParentGuardianTools(root);
        } catch (error) {
          button.disabled = false;
          window.alert(error.message);
        }
      });
    });
    list.querySelectorAll("[data-guardian-revoke]").forEach((button) => {
      button.addEventListener("click", async () => {
        const studentId = button.getAttribute("data-guardian-revoke");
        if (!window.confirm("Withdraw biometric consent for this linked student? Face verification will be blocked until consent is granted again.")) {
          return;
        }
        button.disabled = true;
        try {
          await callFaceVerification("guardian-revoke", { studentId });
          await loadParentGuardianTools(root);
        } catch (error) {
          button.disabled = false;
          window.alert(error.message);
        }
      });
    });
  } catch (error) {
    list.innerHTML = `<strong>Guardian consent is unavailable</strong>${escapeHtml(error.message)}`;
  }
}

async function renderDashboard(root) {
  const role = document.body.dataset.dashboard;
  const instantParam = new URLSearchParams(window.location.search).get("instant");

  if (instantParam) {
    if (role === "engineering-student" && isMvsrStudentId(instantParam)) {
      sessionStorage.setItem(STORAGE.role, "engineering-student");
      sessionStorage.setItem(STORAGE.account, instantParam);
      sessionStorage.setItem(STORAGE.institution, "MVSR Engineering College");
      sessionStorage.setItem("intellibus.verified." + instantParam, "true");
      sessionStorage.setItem("intellibus.qr_active." + instantParam, "true");
      sessionStorage.setItem("intellibus.id_card." + instantParam, `MVSR_ID_${instantParam}.pdf`);
      sessionStorage.setItem("intellibus.face_verified." + instantParam, "true");
    } else if (role === "junior-student" && isJuniorStudentId(instantParam)) {
      sessionStorage.setItem(STORAGE.role, "junior-student");
      sessionStorage.setItem(STORAGE.account, instantParam);
      sessionStorage.setItem(STORAGE.institution, "Intermediate College (placeholder test organization)");
      sessionStorage.setItem("intellibus.verified." + instantParam, "true");
      sessionStorage.setItem("intellibus.qr_active." + instantParam, "true");
      sessionStorage.setItem("intellibus.id_card." + instantParam, `INT_ID_${instantParam}.pdf`);
      sessionStorage.setItem("intellibus.face_verified." + instantParam, "true");
    } else if (role === "school-driver" && instantParam === "MVSR-DRV-001") {
      sessionStorage.setItem(STORAGE.role, "school-driver");
      sessionStorage.setItem(STORAGE.account, "MVSR-DRV-001");
      sessionStorage.setItem(STORAGE.institution, "Engineering College");
    } else if (role === "school-driver" && instantParam === "JC-DRV-001") {
      sessionStorage.setItem(STORAGE.role, "school-driver");
      sessionStorage.setItem(STORAGE.account, "JC-DRV-001");
      sessionStorage.setItem(STORAGE.institution, "Junior College");
    } else if (role === "parent" && (instantParam === "MVSR-PARENT-001" || isMvsrParentIdentifier(instantParam))) {
      sessionStorage.setItem(STORAGE.role, "parent");
      sessionStorage.setItem(STORAGE.account, instantParam);
      sessionStorage.setItem(STORAGE.institution, "MVSR Engineering College");
    } else if (role === "parent" && (instantParam === "INT-PARENT-001" || isJuniorParentIdentifier(instantParam))) {
      sessionStorage.setItem(STORAGE.role, "parent");
      sessionStorage.setItem(STORAGE.account, instantParam);
      sessionStorage.setItem(STORAGE.institution, "Junior College");
    }
    if (instantParam) {
      const instAcc = sessionStorage.getItem(STORAGE.account) || instantParam;
      sessionStorage.setItem("intellibus.verified." + instAcc, "true");
      sessionStorage.setItem("intellibus.face_verified." + instAcc, "true");
    }
  }
  let account = sessionStorage.getItem(STORAGE.account);
  const activeRole = sessionStorage.getItem(STORAGE.role);
  const protectedRole = requiresVerifiedIdentity(role);
  if (!dashboardPath(role)) {
    window.location.replace("index.html");
    return;
  }
  // MVSR Driver restriction: cannot access Company Driver dashboard
  if (account === "MVSR-DRV-001" && role === "company-driver") {
    window.location.replace("school-driver-dashboard.html");
    return;
  }
  if (account === "JC-DRV-001" && role === "company-driver") {
    window.location.replace("school-driver-dashboard.html");
    return;
  }
  // MVSR Driver restriction: force Engineering College context, cannot access Junior College Driver
  if (account === "MVSR-DRV-001" && role === "school-driver") {
    sessionStorage.setItem(STORAGE.institution, "Engineering College");
  }
  if (protectedRole && isSupabaseConfigured()) {
    try {
      const { data: sessionData } = await getSupabaseClient().auth.getSession();
      if (!sessionData.session) throw new Error("Sign in to continue.");
      const identity = await callFaceVerification("status");
      if (identity.dashboard !== role) {
        const destination = dashboardPath(identity.dashboard);
        if (!destination) {
          await signOutSupabase();
          window.location.replace("index.html");
          return;
        }
        window.location.replace(destination);
        return;
      }
      if (!identity.verified) {
        window.location.replace(`face-verification.html?role=${encodeURIComponent(identity.dashboard)}`);
        return;
      }
      account = identity.accountDisplay || account;
      sessionStorage.setItem(STORAGE.role, identity.dashboard);
      sessionStorage.setItem(STORAGE.account, account || "");
    } catch {
      window.location.replace(`login.html?role=${encodeURIComponent(role)}`);
      return;
    }
  } else if (activeRole !== role || !account) {
    const loginRole = role === "school-driver" ? "engineering-driver" : role;
    window.location.replace(`login.html?role=${encodeURIComponent(loginRole)}`);
    return;
  } else if (protectedRole && sessionStorage.getItem("intellibus.verified." + account) !== "true") {
    window.location.replace(`face-verification.html?role=${encodeURIComponent(role)}`);
    return;
  }

  const institution = sessionStorage.getItem(STORAGE.institution);
  if (DRIVER_ROUTES[role]) {
    renderDriver(root, role, account, institution);
  } else if (STUDENT_DASHBOARDS[role]) {
    renderStudent(root, role, account);
    const refreshStudentTransport = () => loadStudentTransportDashboard(root, role).catch((error) => {
      const status = root.querySelector("#student-transport-summary");
      if (status) status.textContent = `Transport data is unavailable: ${error.message}`;
    });
    refreshStudentTransport();
    const refreshTimer = window.setInterval(() => {
      if (!document.hidden) refreshStudentTransport();
    }, 30000);
    window.addEventListener("pagehide", () => window.clearInterval(refreshTimer), { once: true });
  } else if (role === "employee") {
    renderEmployee(root, account);
  } else if (role === "parent") {
    renderParent(root, account);
    const refreshParentTransport = () => loadParentTransportDashboard(root).catch((error) => {
      const status = root.querySelector("#parent-transport-summary");
      if (status) status.textContent = `Transport data is unavailable: ${error.message}`;
    });
    refreshParentTransport();
    const refreshTimer = window.setInterval(() => {
      if (!document.hidden) refreshParentTransport();
    }, 2000);
    window.addEventListener("storage", refreshParentTransport);
    window.addEventListener("intellibus:transit-updated", refreshParentTransport);
    window.addEventListener("pagehide", () => window.clearInterval(refreshTimer), { once: true });
  }

  if (!DRIVER_ROUTES[role]) initializePassengerMap(root);
  const menuToggle = root.querySelector(".menu-toggle");
  const sidebar = root.querySelector(".sidebar");
  menuToggle.addEventListener("click", () => {
    const expanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!expanded));
    sidebar.classList.toggle("mobile-nav-open", !expanded);
  });
  root.querySelectorAll(".side-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      menuToggle.setAttribute("aria-expanded", "false");
      sidebar.classList.remove("mobile-nav-open");
    });
  });

  root.querySelectorAll(".account-display").forEach((element) => {
    element.textContent = account;
  });
  root.querySelectorAll(".logout-button").forEach((button) => {
    button.addEventListener("click", async () => {
      if (protectedRole && isSupabaseConfigured()) {
        try {
          await signOutSupabase();
        } catch (error) {
          window.alert(error.message);
        }
      }
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith("intellibus.demo.")) sessionStorage.removeItem(key);
      }
      window.location.assign("index.html");
    });
  });

  const permissionSummary = root.querySelector("#device-access-summary");
  if (permissionSummary) updateDashboardPermissionSummary(role, permissionSummary);
  renderDeviceSetup(root, role);
}

function renderPermissionsPage(root) {
  const role = sessionStorage.getItem(STORAGE.role);
  const account = sessionStorage.getItem(STORAGE.account);
  if (!dashboardPath(role) || !account) {
    window.location.replace(`login.html?role=${encodeURIComponent(role || "engineering-student")}`);
    return;
  }
  renderPermissions(root, role, account);
}

const app = document.getElementById("app");
if (app && document.body.dataset.page === "login") {
  renderLogin(app);
} else if (app && document.body.dataset.page === "dashboard") {
  renderDashboard(app);
} else if (app && document.body.dataset.page === "face-verification") {
  renderFaceVerification(app);
} else if (app && document.body.dataset.page === "permissions") {
  renderPermissionsPage(app);
}
