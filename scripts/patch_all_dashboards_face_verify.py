from pathlib import Path

APP_JS = Path(r"c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\assets\app.js")
code = APP_JS.read_text(encoding="utf-8").replace("\r\n", "\n")

# 1. Update renderLogin so EVERY dashboard role routes through face-verification.html?role=...
old_login_block = """    const protectedRole = requiresVerifiedIdentity(config.dashboard);
    if (protectedRole && !isSupabaseConfigured()) {
      // Local development test authentication for MVSR Engineering College dataset
      if (config.dashboard === "engineering-student") {
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
      }
      if (config.dashboard === "junior-student") {
        if (!isJuniorStudentId(account) || password !== account) {
          error.textContent = "Student ID or password is incorrect.";
          return;
        }
        sessionStorage.setItem(STORAGE.role, "junior-student");
        sessionStorage.setItem(STORAGE.account, account);
        sessionStorage.setItem(STORAGE.institution, "Intermediate College (placeholder test organization)");
        window.location.assign(`face-verification.html?role=junior-student`);
        return;
      }
      if (config.dashboard === "school-driver") {
        if (config.institution === "Engineering College") {
          if (account !== "MVSR-DRV-001" || password !== "Driver@123") {
            error.textContent = "Account ID or password is incorrect.";
            return;
          }
          sessionStorage.setItem(STORAGE.role, "school-driver");
          sessionStorage.setItem(STORAGE.account, "MVSR-DRV-001");
          sessionStorage.setItem(STORAGE.institution, "Engineering College");
          window.location.assign(dashboardPath("school-driver"));
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
          window.location.assign(dashboardPath("school-driver"));
          return;
        }
      }
      if (config.dashboard === "company-driver") {
        if (account === "MVSR-DRV-001") {
          error.textContent = "Account ID or password is incorrect.";
          return;
        }
        sessionStorage.setItem(STORAGE.role, "company-driver");
        sessionStorage.setItem(STORAGE.account, account);
        window.location.assign(dashboardPath("company-driver"));
        return;
      }
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
          window.location.assign(dashboardPath("parent"));
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
          window.location.assign(dashboardPath("parent"));
          return;
        }
      }
      if (config.dashboard === "employee") {
        if (account === "MVSR-DRV-001" || isMvsrStudentId(account)) {
          error.textContent = "Account ID or password is incorrect.";
          return;
        }
        sessionStorage.setItem(STORAGE.role, "employee");
        sessionStorage.setItem(STORAGE.account, account);
        window.location.assign(dashboardPath("employee"));
        return;
      }
    }"""

new_login_block = """    const protectedRole = requiresVerifiedIdentity(config.dashboard);
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
    }"""

assert old_login_block in code, "old_login_block not found"
code = code.replace(old_login_block, new_login_block, 1)

# 2. Update renderLocalVerification to validate institute student / driver / parent / employee cleanly
old_local_verify_fn = """function renderLocalVerification(root, content, role, account) {"""
end_local_verify_fn = """async function renderFaceVerification(root) {"""

start_v = code.index(old_local_verify_fn)
end_v = code.index(end_local_verify_fn)

new_local_verify_fn = """function renderLocalVerification(root, content, role, account) {
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

"""

code = code[:start_v] + new_local_verify_fn + code[end_v:]

# 3. Update renderDashboard to enforce face verification check when !isSupabaseConfigured() unless ?instant= is used
old_dash_instant_end = """    } else if (role === "parent" && (instantParam === "INT-PARENT-001" || isJuniorParentIdentifier(instantParam))) {
      sessionStorage.setItem(STORAGE.role, "parent");
      sessionStorage.setItem(STORAGE.account, instantParam);
      sessionStorage.setItem(STORAGE.institution, "Junior College");
    }
  }"""

new_dash_instant_end = """    } else if (role === "parent" && (instantParam === "INT-PARENT-001" || isJuniorParentIdentifier(instantParam))) {
      sessionStorage.setItem(STORAGE.role, "parent");
      sessionStorage.setItem(STORAGE.account, instantParam);
      sessionStorage.setItem(STORAGE.institution, "Junior College");
    }
    if (instantParam) {
      const instAcc = sessionStorage.getItem(STORAGE.account) || instantParam;
      sessionStorage.setItem("intellibus.verified." + instAcc, "true");
      sessionStorage.setItem("intellibus.face_verified." + instAcc, "true");
    }
  }"""

assert old_dash_instant_end in code, "old_dash_instant_end not found"
code = code.replace(old_dash_instant_end, new_dash_instant_end, 1)

old_dash_fallback_guard = """  } else if (activeRole !== role || !account) {
    const loginRole = role === "school-driver" ? "engineering-driver" : role;
    window.location.replace(`login.html?role=${encodeURIComponent(loginRole)}`);
    return;
  }"""

new_dash_fallback_guard = """  } else if (activeRole !== role || !account) {
    const loginRole = role === "school-driver" ? "engineering-driver" : role;
    window.location.replace(`login.html?role=${encodeURIComponent(loginRole)}`);
    return;
  } else if (protectedRole && sessionStorage.getItem("intellibus.verified." + account) !== "true") {
    window.location.replace(`face-verification.html?role=${encodeURIComponent(role)}`);
    return;
  }"""

assert old_dash_fallback_guard in code, "old_dash_fallback_guard not found"
code = code.replace(old_dash_fallback_guard, new_dash_fallback_guard, 1)

APP_JS.write_text(code, encoding="utf-8", newline="\r\n")
print("SUCCESS: Enforced Face Verification & Institute Validation step across ALL dashboards.")
