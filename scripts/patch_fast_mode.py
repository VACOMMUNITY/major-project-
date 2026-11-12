with open(r'c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\assets\app.js', 'r', encoding='utf-8') as f:
    code = f.read().replace('\r\n', '\n')

# 1. Add Fast Track button in renderLocalVerification
old_stepper = """    <div class="verification-stepper" style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem;">"""

new_stepper = """    <!-- Fast Track Instant Complete Button -->
    <div style="margin-bottom: 1.1rem;">
      <button type="button" class="button button-primary" id="btn-fast-track-all" style="width: 100%; background: linear-gradient(135deg, #2563eb, #7c3aed); border: none; font-size: 0.92rem; padding: 0.75rem; font-weight: 700; box-shadow: 0 4px 12px rgba(37,99,235,0.35); cursor: pointer;">
        ⚡ 1-Click Instant Verify All & Open Dashboard (Fast Mode)
      </button>
    </div>

    <div class="verification-stepper" style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem;">"""

assert old_stepper in code, "old_stepper not found"
code = code.replace(old_stepper, new_stepper, 1)

# Wire fast track button in renderLocalVerification
old_proceed_wire = """  // Proceed button
  btnProceed.addEventListener("click", () => {"""

new_proceed_wire = """  // Fast Track Instant 1-Click Verification
  const btnFastTrack = content.querySelector("#btn-fast-track-all");
  if (btnFastTrack) {
    btnFastTrack.addEventListener("click", () => {
      const studentAcc = account || sessionStorage.getItem(STORAGE.account) || "2451-23-737-001";
      sessionStorage.setItem("intellibus.verified." + studentAcc, "true");
      sessionStorage.setItem("intellibus.qr_active." + studentAcc, "true");
      sessionStorage.setItem("intellibus.id_card." + studentAcc, `MVSR_ID_${studentAcc}.pdf`);
      sessionStorage.setItem("intellibus.face_verified." + studentAcc, "true");
      sessionStorage.setItem("intellibus.qr_generated_at." + studentAcc, new Date().toISOString());
      window.location.assign(dashboardPath(role) || "engineering-student-dashboard.html");
    });
  }

  // Proceed button
  btnProceed.addEventListener("click", () => {"""

assert old_proceed_wire in code, "old_proceed_wire not found"
code = code.replace(old_proceed_wire, new_proceed_wire, 1)

# 2. Add ?instant= parameter support in renderDashboard
old_render_dash_account = """async function renderDashboard(root) {
  const role = document.body.dataset.dashboard;
  let account = sessionStorage.getItem(STORAGE.account);
  const activeRole = sessionStorage.getItem(STORAGE.role);
  const protectedRole = requiresVerifiedIdentity(role);"""

new_render_dash_account = """async function renderDashboard(root) {
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
    } else if (role === "school-driver" && instantParam === "MVSR-DRV-001") {
      sessionStorage.setItem(STORAGE.role, "school-driver");
      sessionStorage.setItem(STORAGE.account, "MVSR-DRV-001");
      sessionStorage.setItem(STORAGE.institution, "Engineering College");
    } else if (role === "parent" && (instantParam === "MVSR-PARENT-001" || isMvsrParentIdentifier(instantParam))) {
      sessionStorage.setItem(STORAGE.role, "parent");
      sessionStorage.setItem(STORAGE.account, instantParam);
    }
  }

  let account = sessionStorage.getItem(STORAGE.account);
  const activeRole = sessionStorage.getItem(STORAGE.role);
  const protectedRole = requiresVerifiedIdentity(role);"""

assert old_render_dash_account in code, "old_render_dash_account not found"
code = code.replace(old_render_dash_account, new_render_dash_account, 1)

with open(r'c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\assets\app.js', 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(code)

print("SUCCESS: Fast Mode applied to app.js")
