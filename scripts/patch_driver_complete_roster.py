import re
from pathlib import Path

APP_JS = Path(r"c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\assets\app.js")
code = APP_JS.read_text(encoding="utf-8").replace("\r\n", "\n")

# Replace the attendanceContent in loadMvsrDriverDashboard
old_attendance_block = """  const attendanceContent = attendance.length
    ? dataTable(
      ["Student ID", "Student", "Boarded", "Dropped", "Status"],
      attendance.map((record) => [
        record.intellibus_profiles?.student_id || "Student",
        record.intellibus_profiles?.student_name || "Name unavailable",
        transportTime(record.boarded_at),
        transportTime(record.dropped_at),
        record.status,
      ]),
      4,
    )
    : "<div class=\\"empty-state\\"><strong>No scans recorded for this trip</strong>Real attendance appears after the assigned driver scans a student's QR code.</div>";
  const recordSection = root.querySelector("#records");
  const recordHeading = recordSection.querySelector(".panel-heading")?.outerHTML || "";
  recordSection.innerHTML = `${recordHeading}<div id="mvsr-attendance-content">${attendanceContent}</div>`;"""

new_attendance_block = """  // Build Real-Time MVSR Attendance Roster from localStorage
  const attendanceRegistry = JSON.parse(localStorage.getItem("intellibus.route_attendance") || "{}");
  const depts = ["CSE", "IT", "ECE", "EEE", "Mechanical"];
  const stopsList = [
    "Test Stop 01 (Campus North Gate)",
    "Test Stop 02 (Library Circle)",
    "Test Stop 03 (Hostel Junction)",
    "Test Stop 04 (Science Block)",
    "Test Stop 05 (Central Engineering Block)",
  ];

  const fullRoster = [];
  let boardedCount = 0;
  let droppedCount = 0;

  for (let i = 1; i <= 123; i++) {
    const sid = `2451-23-737-${String(i).padStart(3, "0")}`;
    const entry = attendanceRegistry[sid] || {};
    const liveTransit = JSON.parse(localStorage.getItem("intellibus.live_transit." + sid) || "null");

    const isDropped = Boolean(entry.status === "dropped" || liveTransit?.dropped);
    const isBoarded = Boolean(isDropped || entry.status === "boarded" || liveTransit?.boarded);

    if (isDropped) droppedCount++;
    else if (isBoarded) boardedCount++;

    fullRoster.push({
      student_id: sid,
      student_name: entry.student_name || `Test Student ${String(i).padStart(3, "0")}`,
      department: depts[(i - 1) % 5],
      pickup_stop: stopsList[(i - 1) % 4],
      drop_stop: stopsList[4],
      status: isDropped ? "dropped" : isBoarded ? "boarded" : "pending",
      boarded_at: liveTransit?.boardedAt || entry.boarded_at || null,
      boarded_place: liveTransit?.pickupPlace || entry.boarded_place || stopsList[(i - 1) % 4],
      dropped_at: liveTransit?.droppedAt || entry.dropped_at || null,
      dropped_place: liveTransit?.dropPlace || entry.dropped_place || stopsList[4],
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
            <span>📋</span> Real-Time Student Attendance Roster (MVSR-ROUTE-01)
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
          stopName: "Test Stop 01 (Campus North Gate)",
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
          stopName: "Test Stop 05 (Central Engineering Block)",
        });
        await loadMvsrDriverDashboard(root);
      });
    });

    recordSection.querySelectorAll(".btn-quick-reset").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const sid = btn.dataset.sid;
        localStorage.removeItem("intellibus.live_transit." + sid);
        const reg = JSON.parse(localStorage.getItem("intellibus.route_attendance") || "{}");
        delete reg[sid];
        localStorage.setItem("intellibus.route_attendance", JSON.stringify(reg));
        try {
          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new CustomEvent("intellibus:transit-updated", { detail: { studentId: sid, event: "reset" } }));
        } catch (_) {}
        await loadMvsrDriverDashboard(root);
      });
    });
  }"""

assert old_attendance_block in code, "old_attendance_block not found in app.js"
code = code.replace(old_attendance_block, new_attendance_block, 1)

APP_JS.write_text(code, encoding="utf-8", newline="\r\n")
print("SUCCESS: loadMvsrDriverDashboard attendance roster updated")
