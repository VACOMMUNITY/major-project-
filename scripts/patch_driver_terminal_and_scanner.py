import re
from pathlib import Path

APP_JS = Path(r"c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\assets\app.js")
code = APP_JS.read_text(encoding="utf-8").replace("\r\n", "\n")

# Generate all 123 options for student select
options_js = "\\n".join([f'<option value="2451-23-737-{i:03d}">2451-23-737-{i:03d} (Test Student {i:03d})</option>' for i in range(1, 124)])

# 1. Update #driver-student-terminal HTML in renderDriver
old_terminal_html = """      <section class="panel card span-5" id="driver-student-terminal" style="border-color: rgba(59,130,246,0.35); background: rgba(15,23,42,0.65);">
        <div class="panel-heading">
          <div>
            <h2 style="font-size: 1rem; color: #f8fafc;">⚡ Student QR Attendance Terminal</h2>
            <p style="font-size: 0.8rem; margin: 0.2rem 0 0; color: #94a3b8;">Record entering & exit scans for students on your route</p>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.75rem; padding: 0.5rem 0;">
          <div>
            <label style="font-size: 0.82rem; color: #94a3b8; display: block; margin-bottom: 0.3rem;">Select Student on Route:</label>
            <select id="driver-scan-student-id" style="width: 100%; padding: 0.45rem 0.6rem; border-radius: 6px; background: #070d18; border: 1px solid rgba(255,255,255,0.2); color: #f8fafc; font-size: 0.85rem;">
              <option value="2451-23-737-001">2451-23-737-001 (Aarav Sharma - Stop 01)</option>
              <option value="2451-23-737-002">2451-23-737-002 (Vivaan Patel - Stop 01)</option>
              <option value="2451-23-737-050">2451-23-737-050 (Aditi Rao - Stop 02)</option>
              <option value="2451-23-737-123">2451-23-737-123 (Rohan Verma - Stop 03)</option>
            </select>
          </div>
          <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
            <button type="button" class="button button-primary" id="btn-driver-scan-board" style="font-size: 0.8rem; padding: 0.4rem 0.75rem;">
              🚌 Record Boarding QR Scan
            </button>
            <button type="button" class="button button-secondary" id="btn-driver-scan-drop" style="font-size: 0.8rem; padding: 0.4rem 0.75rem;">
              🚏 Record Drop-off QR Scan
            </button>
          </div>
          <p id="driver-scan-feedback" style="font-size: 0.8rem; margin: 0; color: #4ade80;"></p>
        </div>
      </section>"""

new_terminal_html = f"""      <section class="panel card span-5" id="driver-student-terminal" style="border-color: rgba(59,130,246,0.4); background: linear-gradient(135deg, rgba(15,23,42,0.85), rgba(30,58,138,0.3));">
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
              <input type="text" id="driver-barcode-input" placeholder="Scan QR (e.g. 2451-23-737-001)..." style="flex: 1; padding: 0.45rem 0.65rem; border-radius: 6px; background: #070d18; border: 1px solid rgba(59,130,246,0.4); color: #f8fafc; font-size: 0.86rem; font-family: monospace;" />
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
              <option value="Test Stop 01 (Campus North Gate)">Stop 01: Campus North Gate</option>
              <option value="Test Stop 02 (Library Circle)">Stop 02: Library Circle</option>
              <option value="Test Stop 03 (Hostel Junction)">Stop 03: Hostel Junction</option>
              <option value="Test Stop 04 (Science Block)">Stop 04: Science Block</option>
              <option value="Test Stop 05 (Central Engineering Block)">Stop 05: Central Engineering Block</option>
            </select>
          </div>

          <!-- Student Select Dropdown (All 123) -->
          <div>
            <label style="font-size: 0.8rem; color: #94a3b8; display: block; margin-bottom: 0.25rem;">
              Select from Route Students (123 Total):
            </label>
            <select id="driver-scan-student-id" style="width: 100%; padding: 0.42rem 0.6rem; border-radius: 6px; background: #070d18; border: 1px solid rgba(255,255,255,0.2); color: #f8fafc; font-size: 0.84rem;">
              {options_js}
            </select>
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
            <button type="button" class="quick-pick-btn" data-sid="2451-23-737-001" style="font-size: 0.74rem; padding: 0.18rem 0.45rem; border-radius: 4px; background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.3); color: #93c5fd; cursor: pointer;">001</button>
            <button type="button" class="quick-pick-btn" data-sid="2451-23-737-002" style="font-size: 0.74rem; padding: 0.18rem 0.45rem; border-radius: 4px; background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.3); color: #93c5fd; cursor: pointer;">002</button>
            <button type="button" class="quick-pick-btn" data-sid="2451-23-737-050" style="font-size: 0.74rem; padding: 0.18rem 0.45rem; border-radius: 4px; background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.3); color: #93c5fd; cursor: pointer;">050</button>
            <button type="button" class="quick-pick-btn" data-sid="2451-23-737-123" style="font-size: 0.74rem; padding: 0.18rem 0.45rem; border-radius: 4px; background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.3); color: #93c5fd; cursor: pointer;">123</button>
          </div>

          <p id="driver-scan-feedback" style="font-size: 0.82rem; margin: 0.2rem 0 0; color: #4ade80; min-height: 1.2rem;"></p>
        </div>
      </section>"""

assert old_terminal_html in code, "old_terminal_html not found"
code = code.replace(old_terminal_html, new_terminal_html, 1)

# 2. Update wire-up of driver terminal in renderDriver
old_wire_terminal = """  // Wire up driver terminal QR scan actions
  const btnDriverBoard = root.querySelector("#btn-driver-scan-board");
  const btnDriverDrop = root.querySelector("#btn-driver-scan-drop");
  const studentSelect = root.querySelector("#driver-scan-student-id");
  const driverFeedback = root.querySelector("#driver-scan-feedback");

  if (btnDriverBoard && studentSelect) {
    btnDriverBoard.addEventListener("click", () => {
      const studentId = studentSelect.value;
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      const existing = JSON.parse(localStorage.getItem("intellibus.live_transit." + studentId) || "{}");
      localStorage.setItem("intellibus.live_transit." + studentId, JSON.stringify({
        ...existing,
        boarded: true,
        boardedAt: nowStr,
        pickupPlace: "Test Stop 01 (Campus North Gate)",
      }));
      if (driverFeedback) {
        driverFeedback.textContent = `✅ Boarding recorded for ${studentId} at ${nowStr}`;
        driverFeedback.style.color = "#4ade80";
      }
    });
  }

  if (btnDriverDrop && studentSelect) {
    btnDriverDrop.addEventListener("click", () => {
      const studentId = studentSelect.value;
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      const existing = JSON.parse(localStorage.getItem("intellibus.live_transit." + studentId) || "{}");
      localStorage.setItem("intellibus.live_transit." + studentId, JSON.stringify({
        ...existing,
        boarded: existing.boarded || true,
        boardedAt: existing.boardedAt || nowStr,
        dropped: true,
        droppedAt: nowStr,
        dropPlace: "Test Stop 05 (Central Engineering Block)",
      }));
      if (driverFeedback) {
        driverFeedback.textContent = `✅ Drop-off recorded for ${studentId} at ${nowStr}`;
        driverFeedback.style.color = "#c084fc";
      }
    });
  }"""

new_wire_terminal = """  // Wire up driver terminal QR scan actions
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
      if (/^2451-23-737-\\d{3}$/.test(raw)) return raw;
      const num = parseInt(raw, 10);
      if (!isNaN(num) && num >= 1 && num <= 123) {
        return `2451-23-737-${String(num).padStart(3, "0")}`;
      }
      return raw;
    }
    return studentSelect?.value || "2451-23-737-001";
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
      if (isMvsr) await loadMvsrDriverDashboard(root);
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
        <p style="font-size: 0.85rem; color: #94a3b8; margin: 0 0 0.85rem;">Point device camera at the student\\'s dashboard QR code, or use fast simulated scan.</p>
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
                <option value="Test Stop 01 (Campus North Gate)">Stop 01: Campus North Gate</option>
                <option value="Test Stop 02 (Library Circle)">Stop 02: Library Circle</option>
                <option value="Test Stop 03 (Hostel Junction)">Stop 03: Hostel Junction</option>
                <option value="Test Stop 04 (Science Block)">Stop 04: Science Block</option>
                <option value="Test Stop 05 (Central Engineering Block)">Stop 05: Central Engineering Block</option>
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
        if (isMvsr) await loadMvsrDriverDashboard(root);
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
  }"""

assert old_wire_terminal in code, "old_wire_terminal not found"
code = code.replace(old_wire_terminal, new_wire_terminal, 1)

APP_JS.write_text(code, encoding="utf-8", newline="\r\n")
print("SUCCESS: driver terminal and scanner wired in app.js")
