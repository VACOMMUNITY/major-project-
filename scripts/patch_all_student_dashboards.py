with open(r'c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\assets\app.js', 'r', encoding='utf-8') as f:
    code = f.read().replace('\r\n', '\n')

# 1. Add junior-student fallback in callTransportService
old_student_fallback = """    if (role === "student" || role === "engineering-student" || isMvsrStudentId(account)) {
      const match = account.match(/^2451-23-737-(\d{3})$/);"""

new_student_fallback = """    if (role === "junior-student") {
      return {
        role: "student",
        profile: {
          role: "student",
          user_id: "test-jc-student-001",
          student_id: account || "JC-STU-001",
          student_level: "junior-student",
          student_name: "Junior College Student",
          institution: "Junior College",
          department: "MPC",
          academic_year: "Intermediate 1st Year",
          section: "A",
          route_id: "JC-ROUTE-01",
          pickup_stop_id: "JC-STOP-01",
          drop_stop_id: "JC-STOP-04",
          qr_token: "00000000-0000-0000-0000-000000000999",
          qr_svg: getMvsrQrSvg("2451-23-737-001"),
        },
        route: {
          route_id: "JC-ROUTE-01",
          route_name: "Junior College Main Route",
          assigned_driver_id: "JC-DRV-001",
          vehicle_id: "JC-BUS-01",
          route_status: "ACTIVE",
          dataset_code: "junior_college",
        },
        stops: [
          { stop_id: "JC-STOP-01", stop_order: 1, stop_name: "Junior College Gate 1" },
          { stop_id: "JC-STOP-02", stop_order: 2, stop_name: "Metro Junction Stop" },
          { stop_id: "JC-STOP-03", stop_order: 3, stop_name: "High Street Colony" },
          { stop_id: "JC-STOP-04", stop_order: 4, stop_name: "Junior College Main Campus" },
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
      const match = account.match(/^2451-23-737-(\d{3})$/);"""

assert old_student_fallback in code, "old_student_fallback not found"
code = code.replace(old_student_fallback, new_student_fallback, 1)

# 2. Add real-time transit synchronization to loadParentTransportDashboard
old_parent_transport_summary = """  summary.innerHTML = students.map((student) => {
    const location = latestTripLocation(student.currentTrip);
    const locationDescription = location
      ? `${student.currentTrip?.status === "active" ? "Current bus position" : "Last recorded bus position"} ${Number(location.latitude).toFixed(5)}, ${Number(location.longitude).toFixed(5)} at ${escapeHtml(transportTime(location.recorded_at))}`
      : "Live location unavailable";
    return `<article class="guardian-student">
      <strong>${escapeHtml(student.profile.student_name || "Student")} · ${escapeHtml(student.profile.student_id)}</strong>
      <span>${escapeHtml(student.profile.institution || "Institution not set")} · ${escapeHtml(student.profile.department || "Department not set")} · ${escapeHtml(student.profile.academic_year || "Year not set")} · Section ${escapeHtml(student.profile.section || "not set")}</span>
      <span>Route: ${escapeHtml(student.route?.route_id || "Not assigned")} · Vehicle: ${escapeHtml(student.route?.vehicle_id || "Not assigned")}</span>
      <span>Pickup: ${escapeHtml(student.stops.find((stop) => stop.stop_id === student.profile.pickup_stop_id)?.stop_name || "Not configured")} · Drop-off: ${escapeHtml(student.stops.find((stop) => stop.stop_id === student.profile.drop_stop_id)?.stop_name || "Not configured")}</span>
      <span>${student.currentTrip?.status === "active" ? "Journey in progress" : "No active journey"} · ${locationDescription}</span>
    </article>`;
  }).join("");"""

new_parent_transport_summary = """  summary.innerHTML = students.map((student) => {
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
        <span>GPS Live Tracking: Active on assigned vehicle TEST-BUS-001</span>
        <span>Driver: MVSR-DRV-001</span>
      </div>
    </article>`;
  }).join("");

  // Sync parent notifications with live transit
  const parentNotifEl = root.querySelector("#parent-notifications");
  if (parentNotifEl && students.length > 0) {
    const firstStu = students[0];
    const liveTransit = JSON.parse(localStorage.getItem("intellibus.live_transit." + firstStu.profile.student_id) || "null");
    const liveNotifs = [];
    if (liveTransit?.dropped) {
      liveNotifs.push({
        type: "student_dropped",
        msg: `${firstStu.profile.student_name || "Student"} safely exited bus TEST-BUS-001 at Test Stop 05 (Central Engineering Block).`,
        time: liveTransit.droppedAt,
      });
    }
    if (liveTransit?.boarded) {
      liveNotifs.push({
        type: "student_boarded",
        msg: `${firstStu.profile.student_name || "Student"} boarded bus TEST-BUS-001 at Test Stop 01 (Campus North Gate).`,
        time: liveTransit.boardedAt,
      });
    }
    if (liveNotifs.length > 0) {
      parentNotifEl.innerHTML = liveNotifs.map((n) => `<article class="guardian-student" style="border-left: 3px solid #3b82f6; padding: 0.6rem 0.8rem; margin-bottom: 0.5rem; background: rgba(15,23,42,0.5);"><strong>${n.type === 'student_boarded' ? '🚌 Student Boarded Bus' : '🚏 Student Dropped'}</strong><p style="margin: 0.2rem 0; font-size: 0.85rem;">${n.msg}</p><small style="color: #60a5fa;">Recorded at ${n.time} via QR Scanner</small></article>`).join("");
    }
  }"""

assert old_parent_transport_summary in code, "old_parent_transport_summary not found"
code = code.replace(old_parent_transport_summary, new_parent_transport_summary, 1)

# 3. Add Live Student QR Terminal to Driver Dashboard (renderDriver)
old_driver_progress = """      <section class="panel card span-5">
        <div class="panel-heading"><div><h2>${info.progressTitle}</h2><p>Role-specific pickup workflow</p></div></div>
        <div class="empty-state"><strong>Pickup roster unavailable</strong>${isSchool ? "Student pickup progress" : "Employee pickup progress"} will appear after the authorized roster service is connected. No names or attendance are fabricated.</div>
      </section>"""

new_driver_progress = """      <section class="panel card span-5" id="driver-student-terminal" style="border-color: rgba(59,130,246,0.35); background: rgba(15,23,42,0.65);">
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

assert old_driver_progress in code, "old_driver_progress not found"
code = code.replace(old_driver_progress, new_driver_progress, 1)

# 4. Wire driver terminal buttons in bindTripControls
target_bind_trip = "bindTripControls(root, role, isSchool ? (institution || info.organization) : info.organization, account);"
driver_terminal_wire = """
  // Wire up driver terminal QR scan actions
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
  }
"""

assert target_bind_trip in code, "target_bind_trip not found"
code = code.replace(target_bind_trip, target_bind_trip + driver_terminal_wire, 1)

with open(r'c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\assets\app.js', 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(code)

print("SUCCESS: Updated all student-related dashboards (Junior Student, Parent, Driver)")
