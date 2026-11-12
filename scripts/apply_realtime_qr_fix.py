with open(r'c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\assets\app.js', 'r', encoding='utf-8') as f:
    code = f.read().replace('\r\n', '\n')

# 1. Add import getMvsrQrSvg
old_import = 'import { getSupabaseClient, isSupabaseConfigured, signOut as signOutSupabase } from "./face-auth.js";'
# Check if import is split across lines
import_target = """import {
  callFaceVerification,
  getSupabaseClient,
  isSupabaseConfigured,
  signOut as signOutSupabase,
} from "./face-auth.js";"""

new_import = """import {
  callFaceVerification,
  getSupabaseClient,
  isSupabaseConfigured,
  signOut as signOutSupabase,
} from "./face-auth.js";
import { getMvsrQrSvg } from "./mvsr-qr.js";"""

assert import_target in code, "import_target not found"
code = code.replace(import_target, new_import, 1)

# 2. Replace dummy SVG in callTransportService
old_dummy_svg = """          qr_token: `00000000-0000-0000-0000-000000000${suffix}`,
          qr_svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/><text x="50" y="55" text-anchor="middle" font-size="12" fill="#000">${account}</text></svg>`,
        },"""

new_real_svg = """          qr_token: `00000000-0000-0000-0000-000000000${suffix}`,
          qr_svg: getMvsrQrSvg(account),
        },"""

assert old_dummy_svg in code, "old_dummy_svg not found"
code = code.replace(old_dummy_svg, new_real_svg, 1)

# 3. Replace the Transit Checkpoints markup in renderStudent
old_checkpoints_markup = """    <!-- Transit Checkpoints: Entering & Exit Records (QR Scanned) -->
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
    </section>"""

new_checkpoints_markup = """    <!-- Real-Time Transit Checkpoints: Live Boarding & Exit Station -->
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
            <div><span style="color: #94a3b8;">Entering Place:</span> <strong id="entering-place-display" style="color: #f8fafc;">Test Stop 01 (Campus North Gate)</strong></div>
            <div><span style="color: #94a3b8;">Entering Time:</span> <strong id="entering-time-display" style="color: #fde047;">Not boarded yet · Scan QR upon boarding</strong></div>
            <div><span style="color: #94a3b8;">Assigned Vehicle:</span> <strong style="color: #f8fafc;">TEST-BUS-001 (MVSR-ROUTE-01)</strong></div>
            <div><span style="color: #94a3b8;">Scanner Agent:</span> <strong id="entering-agent-display" style="color: #cbd5e1;">Awaiting Driver MVSR-DRV-001</strong></div>
          </div>
        </div>

        <!-- Exit Checkpoint Card -->
        <div class="checkpoint-card" style="padding: 1.2rem; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(147, 51, 234, 0.35); border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
            <span style="font-size: 0.82rem; font-weight: 700; color: #c084fc; text-transform: uppercase; letter-spacing: 0.5px;">🚏 Exit (Dropping) Checkpoint</span>
            <span id="exit-status-badge" class="badge" style="background: rgba(148,163,184,0.15); color: #cbd5e1; border: 1px solid rgba(148,163,184,0.3); font-size: 0.75rem; padding: 0.25rem 0.55rem; border-radius: 4px; font-weight: 600;">SCHEDULED</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.9rem;">
            <div><span style="color: #94a3b8;">Exit Place:</span> <strong id="exit-place-display" style="color: #f8fafc;">Test Stop 05 (Central Engineering Block)</strong></div>
            <div><span style="color: #94a3b8;">Exit Time:</span> <strong id="exit-time-display" style="color: #94a3b8;">Pending destination arrival</strong></div>
            <div><span style="color: #94a3b8;">Journey Status:</span> <strong id="exit-status-text" style="color: #94a3b8;">Scheduled for MVSR-ROUTE-01</strong></div>
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
    </section>"""

assert old_checkpoints_markup in code, "old_checkpoints_markup not found"
code = code.replace(old_checkpoints_markup, new_checkpoints_markup, 1)

# 4. Replace the loadStudentTransportDashboard buttons handling with full live-state management
old_dashboard_listeners = """    // Connect Entering & Exit QR scan simulator buttons
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

new_dashboard_listeners = """    // Real-Time Transit Synchronization & Clock
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

    const syncTransitUi = () => {
      const savedData = JSON.parse(localStorage.getItem("intellibus.live_transit." + studentAcc) || "null");
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
          enteringAgentEl.textContent = "Driver MVSR-DRV-001 (Bus TEST-BUS-001)";
          enteringAgentEl.style.color = "#f8fafc";
        }
        if (exitBadge && !savedData.dropped) {
          exitBadge.textContent = "🚌 IN TRANSIT";
          exitBadge.style.background = "#1e3a8a";
          exitBadge.style.color = "#93c5fd";
          exitBadge.style.borderColor = "#3b82f6";
        }
        if (exitTimeEl && !savedData.dropped) {
          exitTimeEl.textContent = "En route to Central Engineering Block";
          exitTimeEl.style.color = "#93c5fd";
        }
        if (exitStatusText && !savedData.dropped) {
          exitStatusText.textContent = "Bus is in transit on MVSR-ROUTE-01";
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
          enteringAgentEl.textContent = "Awaiting Driver MVSR-DRV-001";
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
          exitStatusText.textContent = "Scheduled for MVSR-ROUTE-01";
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
          exitAgentEl.textContent = "Confirmed by Driver MVSR-DRV-001 Terminal";
          exitAgentEl.style.color = "#f8fafc";
        }
      }

      // Update Attendance Table in real-time
      const attendanceElement = root.querySelector("#student-attendance");
      if (attendanceElement) {
        const liveRows = [];
        if (savedData?.boarded) {
          liveRows.push([
            "MVSR-ROUTE-01",
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

    if (btnScanEntering) {
      btnScanEntering.addEventListener("click", () => {
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        const existing = JSON.parse(localStorage.getItem("intellibus.live_transit." + studentAcc) || "{}");
        const updated = {
          ...existing,
          boarded: true,
          boardedAt: nowStr,
          pickupPlace: "Test Stop 01 (Campus North Gate)",
        };
        localStorage.setItem("intellibus.live_transit." + studentAcc, JSON.stringify(updated));
        syncTransitUi();
      });
    }

    if (btnScanExit) {
      btnScanExit.addEventListener("click", () => {
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        const existing = JSON.parse(localStorage.getItem("intellibus.live_transit." + studentAcc) || "{}");
        const updated = {
          ...existing,
          boarded: existing.boarded || true,
          boardedAt: existing.boardedAt || nowStr,
          dropped: true,
          droppedAt: nowStr,
          dropPlace: "Test Stop 05 (Central Engineering Block)",
        };
        localStorage.setItem("intellibus.live_transit." + studentAcc, JSON.stringify(updated));
        syncTransitUi();
      });
    }

    if (btnResetTransit) {
      btnResetTransit.addEventListener("click", () => {
        localStorage.removeItem("intellibus.live_transit." + studentAcc);
        syncTransitUi();
      });
    }"""

assert old_dashboard_listeners in code, "old_dashboard_listeners not found"
code = code.replace(old_dashboard_listeners, new_dashboard_listeners, 1)

with open(r'c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\assets\app.js', 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(code)

print("SUCCESS: Real-time transit and real QR SVG applied to app.js")
