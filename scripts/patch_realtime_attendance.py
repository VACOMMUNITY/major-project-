import re
from pathlib import Path

APP_JS = Path(r"c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\assets\app.js")
code = APP_JS.read_text(encoding="utf-8").replace("\r\n", "\n")

# 1. Update callTransportService to handle scan-student, start-trip, end-trip, reach-stop in local fallback
old_service_end = """  throw new Error("Transport service is not connected.");
}"""

new_service_end = """  // Local mock handlers for Driver trip and student QR scanning actions
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
    if (/^2451-23-737-\\d{3}$/.test(raw)) {
      studentId = raw;
    } else {
      const match = raw.match(/([0-9a-f]{3})$/i);
      const suffix = match ? match[1] : "001";
      studentId = `2451-23-737-${suffix}`;
    }

    const event = details.event || "boarded"; // "boarded" or "dropped"
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
    localStorage.setItem("intellibus.route_attendance", JSON.stringify(attendanceMap));

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
}"""

assert old_service_end in code, "old_service_end not found in app.js"
code = code.replace(old_service_end, new_service_end, 1)

APP_JS.write_text(code, encoding="utf-8", newline="\r\n")
print("SUCCESS: Service fallback updated in app.js")
