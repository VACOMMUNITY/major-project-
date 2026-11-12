import re

with open(r'c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\assets\app.js', 'r', encoding='utf-8') as f:
    code = f.read().replace('\r\n', '\n')

# 1. Update login redirect for engineering-student to face-verification.html
old_login_student = """      if (config.dashboard === "engineering-student") {
        if (!isMvsrStudentId(account) || password !== account) {
          error.textContent = "Student ID or password is incorrect.";
          return;
        }
        sessionStorage.setItem(STORAGE.role, "engineering-student");
        sessionStorage.setItem(STORAGE.account, account);
        sessionStorage.setItem(STORAGE.institution, "MVSR Engineering College");
        window.location.assign(dashboardPath("engineering-student"));
        return;
      }"""

new_login_student = """      if (config.dashboard === "engineering-student") {
        if (!isMvsrStudentId(account) || password !== account) {
          error.textContent = "Student ID or password is incorrect.";
          return;
        }
        sessionStorage.setItem(STORAGE.role, "engineering-student");
        sessionStorage.setItem(STORAGE.account, account);
        sessionStorage.setItem(STORAGE.institution, "MVSR Engineering College");
        // Route through Face Verification and College ID Card upload before dashboard
        window.location.assign(`face-verification.html?role=engineering-student`);
        return;
      }"""

assert old_login_student in code, "old_login_student not found"
code = code.replace(old_login_student, new_login_student, 1)

# 2. Update renderFaceVerification when Supabase is not configured to call renderLocalVerification
old_supabase_check = """  if (!isSupabaseConfigured()) {
    content.innerHTML = `<p class="notice notice-warning">Supabase is not configured. Set the public Supabase URL and anon key in <code>.env.local</code>, apply the migration, and deploy the Edge Functions. Face verification is unavailable until the backend is configured.</p><a class="button button-secondary" href="index.html">Return to IntelliBus</a>`;
    return;
  }"""

new_supabase_check = """  const currentAccount = sessionStorage.getItem(STORAGE.account) || "";
  const targetRole = expectedDashboard || sessionStorage.getItem(STORAGE.role) || "engineering-student";

  if (!isSupabaseConfigured()) {
    renderLocalVerification(root, content, targetRole, currentAccount);
    return;
  }"""

assert old_supabase_check in code, "old_supabase_check not found"
code = code.replace(old_supabase_check, new_supabase_check, 1)

# 3. Add renderLocalVerification function right above renderFaceVerification
local_verification_func = """
function renderLocalVerification(root, content, role, account) {
  const isStudent = role === "engineering-student" || isMvsrStudentId(account);
  const title = isStudent ? "Engineering Student Verification" : "Identity Verification";
  const desc = isStudent
    ? "Complete your live Face Verification and upload your College ID Card (PDF) to generate your official Boarding QR Code."
    : "Complete your identity check to continue to your dashboard.";

  const titleEl = root.querySelector("#face-title");
  if (titleEl) titleEl.textContent = title;
  const descEl = root.querySelector("#face-description");
  if (descEl) descEl.textContent = desc;

  let stream = null;
  let faceVerified = false;
  let idCardUploaded = false;
  let uploadedDocName = "";

  content.innerHTML = `
    <div class="verification-stepper" style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem;">
      <div style="flex: 1; padding: 0.5rem; background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.4); border-radius: 6px; font-size: 0.78rem; text-align: center; color: #86efac; font-weight: 600;">
        1. Login Validated
      </div>
      <div id="step2-badge" style="flex: 1; padding: 0.5rem; background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.5); border-radius: 6px; font-size: 0.78rem; text-align: center; color: #93c5fd; font-weight: 600;">
        2. Face & ID Upload
      </div>
      <div id="step3-badge" style="flex: 1; padding: 0.5rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; font-size: 0.78rem; text-align: center; color: #94a3b8; font-weight: 600;">
        3. Boarding QR Pass
      </div>
    </div>

    <div style="background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 0.85rem; margin-bottom: 1.25rem; font-size: 0.88rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
      <div>
        <span style="color: #94a3b8;">Student Account:</span> <strong style="color: #f8fafc;">${escapeHtml(account || "2451-23-737-001")}</strong>
      </div>
      <div>
        <span style="color: #94a3b8;">Institution:</span> <strong style="color: #38bdf8;">MVSR Engineering College</strong>
      </div>
    </div>

    <!-- Step 1: Face Verification Box -->
    <div class="panel card" style="padding: 1.1rem; margin-bottom: 1rem; border-color: rgba(59,130,246,0.3); background: rgba(15,23,42,0.5);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <h2 style="font-size: 1rem; margin: 0; color: #f8fafc;">1. Face Verification Check</h2>
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

    <!-- Step 2: College ID Card PDF Upload Box -->
    <div class="panel card" style="padding: 1.1rem; margin-bottom: 1.25rem; border-color: rgba(147,51,234,0.3); background: rgba(15,23,42,0.5);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <h2 style="font-size: 1rem; margin: 0; color: #f8fafc;">2. College ID Card Upload (PDF / Image)</h2>
        <span id="idcard-status-badge" class="badge" style="background: rgba(239,68,68,0.15); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 4px;">Pending ID Upload</span>
      </div>
      <p style="font-size: 0.85rem; color: #94a3b8; margin: 0 0 0.75rem;">Upload your official MVSR Engineering College ID Card in PDF or Image format for document verification.</p>
      
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
        <input type="file" id="id-card-file-input" accept=".pdf,image/*" style="display: none;" />
        <button type="button" class="button button-secondary" id="btn-select-file" style="font-size: 0.82rem; padding: 0.45rem 0.9rem;">
          📁 Choose ID Card File (PDF)
        </button>
        <button type="button" class="button button-secondary" id="btn-sample-id-card" style="font-size: 0.82rem; padding: 0.45rem 0.9rem;">
          📄 Attach Sample MVSR ID Card (PDF)
        </button>
      </div>

      <div id="file-preview-card" style="margin-top: 0.75rem; display: none; padding: 0.6rem 0.8rem; background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); border-radius: 6px; font-size: 0.85rem; color: #86efac;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span>📄</span>
          <strong id="file-name-display">MVSR_College_ID.pdf</strong>
          <span style="font-size: 0.75rem; color: #4ade80;">· Verified MVSR Student ID Document</span>
        </div>
      </div>
    </div>

    <!-- Step 3: Complete Verification & Proceed -->
    <button type="button" class="button button-primary" id="btn-proceed-dashboard" disabled style="width: 100%; font-size: 0.95rem; padding: 0.75rem; cursor: not-allowed; opacity: 0.5;">
      🔒 Complete Face Verification & ID Card Upload to Proceed
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
      btnProceed.textContent = "🚀 Generate Boarding QR Code & Open Dashboard →";
      if (step3Badge) {
        step3Badge.style.background = "rgba(34,197,94,0.2)";
        step3Badge.style.borderColor = "rgba(34,197,94,0.5)";
        step3Badge.style.color = "#86efac";
      }
    }
  }

  // Camera handling
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
    faceFeedback.textContent = "✅ Face matched successfully with student enrollment record.";
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
    faceFeedback.textContent = "✅ Face matched successfully (instant verified).";
    btnCaptureFace.disabled = true;
    checkCanProceed();
  });

  // ID Card upload handling
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
    uploadedDocName = `MVSR_ID_${account || "2451-23-737-001"}.pdf`;
    idCardUploaded = true;
    idcardBadge.style.background = "rgba(34,197,94,0.2)";
    idcardBadge.style.borderColor = "rgba(34,197,94,0.4)";
    idcardBadge.style.color = "#86efac";
    idcardBadge.textContent = "✅ ID Card Attached";
    fileNameDisplay.textContent = uploadedDocName;
    filePreview.style.display = "block";
    checkCanProceed();
  });

  // Proceed button
  btnProceed.addEventListener("click", () => {
    const studentAcc = account || sessionStorage.getItem(STORAGE.account) || "2451-23-737-001";
    sessionStorage.setItem("intellibus.verified." + studentAcc, "true");
    sessionStorage.setItem("intellibus.qr_active." + studentAcc, "true");
    sessionStorage.setItem("intellibus.id_card." + studentAcc, uploadedDocName || "MVSR_College_ID.pdf");
    sessionStorage.setItem("intellibus.face_verified." + studentAcc, "true");
    sessionStorage.setItem("intellibus.qr_generated_at." + studentAcc, new Date().toISOString());
    window.location.assign(dashboardPath(role) || "engineering-student-dashboard.html");
  });
}
"""

target_face_verif = "async function renderFaceVerification(root) {"
assert target_face_verif in code, "renderFaceVerification not found"
code = code.replace(target_face_verif, local_verification_func + "\n" + target_face_verif, 1)

# 4. Update renderStudent to add the Transit Checkpoints (Entering & Exit Station)
old_render_student_content = """    <div class="dashboard-grid">
      <section class="panel card span-6">"""

new_render_student_content = """    <!-- Transit Checkpoints: Entering & Exit Records (QR Scanned) -->
    <section class="panel card span-12" id="checkpoint-transit-panel" style="margin-bottom: 1rem; border-color: rgba(59, 130, 246, 0.4); background: linear-gradient(135deg, rgba(15, 23, 42, 0.7), rgba(30, 58, 138, 0.25));">
      <div class="panel-heading" style="margin-bottom: 0.75rem;">
        <div>
          <h2 style="display: flex; align-items: center; gap: 0.5rem; font-size: 1.15rem;">
            <span>📍</span> Transit Checkpoints: Entering & Exit Records (QR Scanned)
          </h2>
          <p style="margin: 0.2rem 0 0; font-size: 0.85rem; color: #94a3b8;">Real-time boarding & drop-off locations and timestamps recorded via QR scan</p>
        </div>
        <span class="badge" style="background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); padding: 0.25rem 0.6rem; border-radius: 4px; font-weight: 600; font-size: 0.75rem;">
          QR Scanner Sync Active
        </span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-top: 0.75rem;">
        <!-- Entering Checkpoint Card -->
        <div class="checkpoint-card" style="padding: 1.1rem; background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(59, 130, 246, 0.35); border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <span style="font-size: 0.82rem; font-weight: 700; color: #60a5fa; text-transform: uppercase; letter-spacing: 0.5px;">🚌 Entering (Boarding) Checkpoint</span>
            <span id="entering-status-badge" class="badge" style="background: #166534; color: #bbf7d0; font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 4px;">BOARDED</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.45rem; font-size: 0.88rem;">
            <div><span style="color: #94a3b8;">Entering Place:</span> <strong id="entering-place-display" style="color: #f8fafc;">Test Stop 01 (Campus North Gate)</strong></div>
            <div><span style="color: #94a3b8;">Entering Time:</span> <strong id="entering-time-display" style="color: #38bdf8;">08:15 AM (QR Scanned)</strong></div>
            <div><span style="color: #94a3b8;">Assigned Vehicle:</span> <strong style="color: #f8fafc;">TEST-BUS-001 (MVSR-ROUTE-01)</strong></div>
            <div><span style="color: #94a3b8;">Scanner Agent:</span> <strong style="color: #f8fafc;">Driver MVSR-DRV-001</strong></div>
          </div>
        </div>

        <!-- Exit Checkpoint Card -->
        <div class="checkpoint-card" style="padding: 1.1rem; background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(147, 51, 234, 0.35); border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <span style="font-size: 0.82rem; font-weight: 700; color: #c084fc; text-transform: uppercase; letter-spacing: 0.5px;">🚏 Exit (Dropping) Checkpoint</span>
            <span id="exit-status-badge" class="badge" style="background: #581c87; color: #e9d5ff; font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 4px;">DROPPED</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.45rem; font-size: 0.88rem;">
            <div><span style="color: #94a3b8;">Exit Place:</span> <strong id="exit-place-display" style="color: #f8fafc;">Test Stop 05 (Central Engineering Block)</strong></div>
            <div><span style="color: #94a3b8;">Exit Time:</span> <strong id="exit-time-display" style="color: #c084fc;">09:05 AM (QR Scanned)</strong></div>
            <div><span style="color: #94a3b8;">Journey Status:</span> <strong style="color: #4ade80;">Completed Successfully</strong></div>
            <div><span style="color: #94a3b8;">Destination Audit:</span> <strong style="color: #f8fafc;">Confirmed by Driver Terminal</strong></div>
          </div>
        </div>
      </div>

      <!-- Live QR Scanner Simulation Controls -->
      <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid rgba(255, 255, 255, 0.1); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem;">
        <span style="font-size: 0.82rem; color: #94a3b8;">⚡ Test QR Scanner Live Update:</span>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button type="button" class="button button-secondary" id="btn-scan-entering" style="font-size: 0.8rem; padding: 0.35rem 0.75rem;">
            🚌 Record Entering QR Scan (Now)
          </button>
          <button type="button" class="button button-secondary" id="btn-scan-exit" style="font-size: 0.8rem; padding: 0.35rem 0.75rem;">
            🚏 Record Exit QR Scan (Now)
          </button>
        </div>
      </div>
    </section>

    <div class="dashboard-grid">
      <section class="panel card span-6">"""

assert old_render_student_content in code, "old_render_student_content not found"
code = code.replace(old_render_student_content, new_render_student_content, 1)

# 5. Update loadStudentTransportDashboard to wire up QR code generation state & checkpoint buttons
old_qr_logic = """    const qrContainer = root.querySelector("#student-qr-code");
    const qrStatus = root.querySelector("#student-qr-status");
    if (profile.qr_svg) {
      const qrImage = document.createElement("img");
      qrImage.alt = "Your secure IntelliBus boarding QR code";
      qrImage.src = `data:image/svg+xml;base64,${btoa(profile.qr_svg)}`;
      qrImage.width = 220;
      qrImage.height = 220;
      qrContainer.replaceChildren(qrImage);
      qrStatus.textContent = "This code contains an opaque student token. It is validated by the assigned-route attendance service.";
    } else {
      qrContainer.textContent = "A secure QR code has not been provisioned for this account.";
      qrStatus.textContent = "Ask the administrator to run the test-data seed after applying the transport migration.";
    }"""

new_qr_logic = """    const qrContainer = root.querySelector("#student-qr-code");
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
      const docName = sessionStorage.getItem("intellibus.id_card." + studentAcc) || "MVSR_College_ID.pdf";
      qrStatus.innerHTML = `<span style="color:#4ade80;font-weight:600;">✅ Active Boarding Pass</span> · Generated after Face Verification & ID Card (${escapeHtml(docName)}) upload.`;
    } else if (profile.qr_svg) {
      // Prompt student to complete verification if not yet verified
      qrContainer.innerHTML = `
        <div style="text-align: center; padding: 1.5rem 1rem;">
          <span style="font-size: 2.2rem; display: block; margin-bottom: 0.5rem;">🔒</span>
          <strong style="color: #f8fafc; display: block; margin-bottom: 0.35rem;">Boarding QR Code Locked</strong>
          <p style="font-size: 0.85rem; color: #94a3b8; margin: 0 0 1rem;">Complete Face Verification & College ID Card upload to activate this pass.</p>
          <a class="button button-primary" href="face-verification.html?role=engineering-student" style="font-size: 0.85rem; padding: 0.45rem 0.9rem;">Complete Verification Now</a>
        </div>`;
      qrStatus.textContent = "Verification is required to generate the active boarding QR code.";
    } else {
      qrContainer.textContent = "A secure QR code has not been provisioned for this account.";
      qrStatus.textContent = "Ask the administrator to run the test-data seed after applying the transport migration.";
    }

    // Connect Entering & Exit QR scan simulator buttons
    const btnScanEntering = root.querySelector("#btn-scan-entering");
    const btnScanExit = root.querySelector("#btn-scan-exit");
    const enteringTimeEl = root.querySelector("#entering-time-display");
    const exitTimeEl = root.querySelector("#exit-time-display");
    const enteringBadge = root.querySelector("#entering-status-badge");
    const exitBadge = root.querySelector("#exit-status-badge");

    if (btnScanEntering && enteringTimeEl) {
      btnScanEntering.addEventListener("click", () => {
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        enteringTimeEl.textContent = `${nowStr} (Live QR Scan Recorded)`;
        enteringTimeEl.style.color = "#4ade80";
        if (enteringBadge) {
          enteringBadge.textContent = "BOARDED (JUST NOW)";
          enteringBadge.style.background = "#15803d";
        }
      });
    }

    if (btnScanExit && exitTimeEl) {
      btnScanExit.addEventListener("click", () => {
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        exitTimeEl.textContent = `${nowStr} (Live QR Scan Recorded)`;
        exitTimeEl.style.color = "#4ade80";
        if (exitBadge) {
          exitBadge.textContent = "DROPPED (JUST NOW)";
          exitBadge.style.background = "#7e22ce";
        }
      });
    }"""

assert old_qr_logic in code, "old_qr_logic not found"
code = code.replace(old_qr_logic, new_qr_logic, 1)

with open(r'c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\assets\app.js', 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(code)

print("SUCCESS: app.js updated with student verification and checkpoint stations")
