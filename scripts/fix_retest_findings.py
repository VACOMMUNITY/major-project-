from pathlib import Path

APP_JS = Path(r"c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\assets\app.js")
code = APP_JS.read_text(encoding="utf-8").replace("\r\n", "\n")

# 1. Fix scan-student handler for Junior College vs MVSR
old_scan_handler = """    const event = details.event || "boarded"; // "boarded" or "dropped"
    const stopName = details.stopName || (event === "boarded" ? "Test Stop 01 (Campus North Gate)" : "Test Stop 05 (Central Engineering Block)");
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const nowIso = new Date().toISOString();

    // 1. Update individual student live transit record
    const existing = JSON.parse(localStorage.getItem("intellibus.live_transit." + studentId) || "{}");
    const updatedTransit = {
      ...existing,
      studentId,
      vehicleId: "TEST-BUS-001",
      routeId: "MVSR-ROUTE-01",
      driverId: "MVSR-DRV-001",
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
    const attendanceMap = JSON.parse(localStorage.getItem("intellibus.route_attendance") || "{}");
    const num = parseInt(studentId.split("-").pop(), 10);
    const depts = ["CSE", "IT", "ECE", "EEE", "Mechanical"];
    const stuRecord = attendanceMap[studentId] || {
      student_id: studentId,
      student_name: `Test Student ${String(num).padStart(3, "0")}`,
      department: depts[(num - 1) % 5],
      pickup_stop: "Test Stop 01 (Campus North Gate)",
      drop_stop: "Test Stop 05 (Central Engineering Block)",
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
    localStorage.setItem("intellibus.route_attendance", JSON.stringify(attendanceMap));"""

new_scan_handler = """    const event = details.event || "boarded"; // "boarded" or "dropped"
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
    localStorage.setItem(registryKey, JSON.stringify(attendanceMap));"""

assert old_scan_handler in code, "old_scan_handler not found"
code = code.replace(old_scan_handler, new_scan_handler, 1)

# 2. Fix loadStudentTransportDashboard dynamic strings
old_stu_qr = """      const docName = sessionStorage.getItem("intellibus.id_card." + studentAcc) || "MVSR_College_ID.pdf";
      qrStatus.innerHTML = `<span style="color:#4ade80;font-weight:600;">✅ Active Boarding Pass</span> · Generated after Face Verification & ID Card (${escapeHtml(docName)}) upload.`;
    } else if (profile.qr_svg) {
      // Prompt student to complete verification if not yet verified
      qrContainer.innerHTML = `
        <div style="text-align: center; padding: 1.5rem 1rem;">
          <span style="font-size: 2.2rem; display: block; margin-bottom: 0.5rem;">🔒</span>
          <strong style="color: #f8fafc; display: block; margin-bottom: 0.35rem;">Boarding QR Code Locked</strong>
          <p style="font-size: 0.85rem; color: #94a3b8; margin: 0 0 1rem;">Complete Face Verification & College ID Card upload to activate this pass.</p>
          <a class="button button-primary" href="face-verification.html?role=engineering-student" style="font-size: 0.85rem; padding: 0.45rem 0.9rem;">Complete Verification Now</a>
        </div>`;"""

new_stu_qr = """      const defaultDocName = profile.student_level === "junior-student" ? `INT_ID_${studentAcc}.pdf` : `MVSR_ID_${studentAcc}.pdf`;
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
        </div>`;"""

assert old_stu_qr in code, "old_stu_qr not found"
code = code.replace(old_stu_qr, new_stu_qr, 1)

old_sync_ui = """    const syncTransitUi = () => {
      const savedData = JSON.parse(localStorage.getItem("intellibus.live_transit." + studentAcc) || "null");
      const enteringPlaceEl = root.querySelector("#entering-place-display");
      const exitPlaceEl = root.querySelector("#exit-place-display");
      if (enteringPlaceEl && savedData?.pickupPlace) {
        enteringPlaceEl.textContent = savedData.pickupPlace;
      }
      if (exitPlaceEl && savedData?.dropPlace) {
        exitPlaceEl.textContent = savedData.dropPlace;
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
    };"""

new_sync_ui = """    const activeRouteId = route?.route_id || "MVSR-ROUTE-01";
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
    };"""

assert old_sync_ui in code, "old_sync_ui not found"
code = code.replace(old_sync_ui, new_sync_ui, 1)

old_stu_scan_btns = """    if (btnScanEntering) {
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
    }"""

new_stu_scan_btns = """    if (btnScanEntering) {
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
    }"""

assert old_stu_scan_btns in code, "old_stu_scan_btns not found"
code = code.replace(old_stu_scan_btns, new_stu_scan_btns, 1)

# 3. Fix loadParentTransportDashboard live sync & notifications overwrite bug
old_parent_section = """      <div style="font-size: 0.8rem; color: #60a5fa; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
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
  }
  root.querySelector("#parent-notifications").innerHTML = notices.length
    ? notices.map((notice) => `<article class="guardian-student"><strong>${escapeHtml(notice.notification_type.replaceAll("_", " "))}</strong><span>${escapeHtml(notice.message)}</span><span>${escapeHtml(transportTime(notice.created_at))}</span></article>`).join("")
    : "<strong>No journey notifications yet</strong>Notifications appear after the driver starts a trip or records an attendance event.";
  const records = students.flatMap((student) => student.attendance.map((entry) => [
    student.profile.student_name || student.profile.student_id,
    transportTime(entry.boarded_at),
    transportTime(entry.dropped_at),
    entry.status,
  ]));
  root.querySelector("#parent-attendance").innerHTML = records.length
    ? dataTable(["Linked student", "Boarded", "Dropped", "Status"], records, 3)
    : "<strong>No attendance records yet</strong>Boarding and drop-off times will be shown after authenticated QR scans.";"""

new_parent_section = """      <div style="font-size: 0.8rem; color: #60a5fa; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
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
    : "<strong>No attendance records yet</strong>Boarding and drop-off times will be shown after authenticated QR scans.";"""

assert old_parent_section in code, "old_parent_section not found"
code = code.replace(old_parent_section, new_parent_section, 1)

# 4. Fix renderDriver terminal stops/students/quick-picks for JC-DRV-001 vs MVSR-DRV-001
old_driver_stop_select = """          <!-- Current Stop Selector -->
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
            <select id="driver-scan-student-id" style="width: 100%; padding: 0.42rem 0.6rem; border-radius: 6px; background: #070d18; border: 1px solid rgba(255,255,255,0.2); color: #f8fafc; font-size: 0.84rem;">"""

new_driver_stop_select = """          <!-- Current Stop Selector -->
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
              }).join("")}"""

# Wait: remove old hardcoded 123 options between <select id="driver-scan-student-id"...> and </select>
start_idx = code.index(old_driver_stop_select)
end_select_idx = code.index("</select>", start_idx + len(old_driver_stop_select))
code = code[:start_idx] + new_driver_stop_select + code[end_select_idx:]

# Also fix fast test pills and barcode placeholder in renderDriver
code = code.replace(
    'placeholder="Scan QR (e.g. 2451-23-737-001)..."',
    'placeholder="${isJcDriver ? \'Scan QR (e.g. INT-2026-001)...\' : \'Scan QR (e.g. 2451-23-737-001)...\'}"'
)

old_fast_pills = """            <button type="button" class="quick-pick-btn" data-sid="2451-23-737-001" style="font-size: 0.74rem; padding: 0.18rem 0.45rem; border-radius: 4px; background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.3); color: #93c5fd; cursor: pointer;">001</button>
            <button type="button" class="quick-pick-btn" data-sid="2451-23-737-002" style="font-size: 0.74rem; padding: 0.18rem 0.45rem; border-radius: 4px; background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.3); color: #93c5fd; cursor: pointer;">002</button>
            <button type="button" class="quick-pick-btn" data-sid="2451-23-737-050" style="font-size: 0.74rem; padding: 0.18rem 0.45rem; border-radius: 4px; background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.3); color: #93c5fd; cursor: pointer;">050</button>
            <button type="button" class="quick-pick-btn" data-sid="2451-23-737-123" style="font-size: 0.74rem; padding: 0.18rem 0.45rem; border-radius: 4px; background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.3); color: #93c5fd; cursor: pointer;">123</button>"""

new_fast_pills = """            <button type="button" class="quick-pick-btn" data-sid="${isJcDriver ? 'INT-2026-001' : '2451-23-737-001'}" style="font-size: 0.74rem; padding: 0.18rem 0.45rem; border-radius: 4px; background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.3); color: #93c5fd; cursor: pointer;">001</button>
            <button type="button" class="quick-pick-btn" data-sid="${isJcDriver ? 'INT-2026-002' : '2451-23-737-002'}" style="font-size: 0.74rem; padding: 0.18rem 0.45rem; border-radius: 4px; background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.3); color: #93c5fd; cursor: pointer;">002</button>
            <button type="button" class="quick-pick-btn" data-sid="${isJcDriver ? 'INT-2026-050' : '2451-23-737-050'}" style="font-size: 0.74rem; padding: 0.18rem 0.45rem; border-radius: 4px; background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.3); color: #93c5fd; cursor: pointer;">050</button>
            <button type="button" class="quick-pick-btn" data-sid="${isJcDriver ? 'INT-2026-123' : '2451-23-737-123'}" style="font-size: 0.74rem; padding: 0.18rem 0.45rem; border-radius: 4px; background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.3); color: #93c5fd; cursor: pointer;">123</button>"""

assert old_fast_pills in code, "old_fast_pills not found"
code = code.replace(old_fast_pills, new_fast_pills, 1)

# Fix getTargetStudent shorthand number mapping and default stop
old_get_target = """  const getTargetStudent = () => {
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
  };"""

new_get_target = """  const getTargetStudent = () => {
    const raw = (barcodeInput?.value || "").trim();
    if (raw) {
      if (/^2451-23-737-\\d{3}$/.test(raw) || /^INT-2026-\\d{3}$/.test(raw)) return raw;
      const num = parseInt(raw, 10);
      if (!isNaN(num) && num >= 1 && num <= 123) {
        const prefix = isJcDriver ? "INT-2026" : "2451-23-737";
        return `${prefix}-${String(num).padStart(3, "0")}`;
      }
      return raw;
    }
    return studentSelect?.value || (isJcDriver ? "INT-2026-001" : "2451-23-737-001");
  };"""

assert old_get_target in code, "old_get_target not found"
code = code.replace(old_get_target, new_get_target, 1)

# Fix modal stops in openQrScannerModal
old_modal_stops = """              <select id="modal-stop-select" style="width: 100%; padding: 0.35rem 0.5rem; background: #070d18; color: #f8fafc; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px;">
                <option value="Test Stop 01 (Campus North Gate)">Stop 01: Campus North Gate</option>
                <option value="Test Stop 02 (Library Circle)">Stop 02: Library Circle</option>
                <option value="Test Stop 03 (Hostel Junction)">Stop 03: Hostel Junction</option>
                <option value="Test Stop 04 (Science Block)">Stop 04: Science Block</option>
                <option value="Test Stop 05 (Central Engineering Block)">Stop 05: Central Engineering Block</option>
              </select>"""

new_modal_stops = """              <select id="modal-stop-select" style="width: 100%; padding: 0.35rem 0.5rem; background: #070d18; color: #f8fafc; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px;">
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
              </select>"""

assert old_modal_stops in code, "old_modal_stops not found"
code = code.replace(old_modal_stops, new_modal_stops, 1)

# 5. Fix loadMvsrDriverDashboard heading and Quick Board/Drop/Reset handlers
code = code.replace(
    "<span>📋</span> Real-Time Student Attendance Roster (MVSR-ROUTE-01)",
    "<span>📋</span> Real-Time Student Attendance Roster (${escapeHtml(route.route_id)} · ${escapeHtml(route.vehicle_id)})",
    1
)

old_quick_handlers = """    // Row Quick Action Buttons
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
        localStorage.setItem("intellibus.route_attendance", JSON.stringify(reg));"""

new_quick_handlers = """    // Row Quick Action Buttons
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
        localStorage.setItem(registryKey, JSON.stringify(reg));"""

assert old_quick_handlers in code, "old_quick_handlers not found"
code = code.replace(old_quick_handlers, new_quick_handlers, 1)

# 6. Fix renderStudent initial checkpoint placeholders
old_render_student_cards = """            <div><span style="color: #94a3b8;">Entering Place:</span> <strong id="entering-place-display" style="color: #f8fafc;">Test Stop 01 (Campus North Gate)</strong></div>
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
            <div><span style="color: #94a3b8;">Journey Status:</span> <strong id="exit-status-text" style="color: #94a3b8;">Scheduled for MVSR-ROUTE-01</strong></div>"""

new_render_student_cards = """            <div><span style="color: #94a3b8;">Entering Place:</span> <strong id="entering-place-display" style="color: #f8fafc;">${role === "junior-student" ? "Intermediate Test Stop 01" : "Test Stop 01 (Campus North Gate)"}</strong></div>
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
            <div><span style="color: #94a3b8;">Journey Status:</span> <strong id="exit-status-text" style="color: #94a3b8;">${role === "junior-student" ? "Scheduled for INT-ROUTE-01" : "Scheduled for MVSR-ROUTE-01"}</strong></div>"""

assert old_render_student_cards in code, "old_render_student_cards not found"
code = code.replace(old_render_student_cards, new_render_student_cards, 1)

APP_JS.write_text(code, encoding="utf-8", newline="\r\n")
print("SUCCESS: Fixed all retest findings in app.js")
