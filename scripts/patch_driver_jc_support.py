import re
from pathlib import Path

APP_JS = Path(r"c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\assets\app.js")
code = APP_JS.read_text(encoding="utf-8").replace("\r\n", "\n")

# 1. Update bindTripControls to initialize dedicated driver for both MVSR-DRV-001 and JC-DRV-001
old_bind_driver = """  const mvsrTestDriver = role === "school-driver" && account === "MVSR-DRV-001";
  const mvsrInitialization = mvsrTestDriver
    ? initializeMvsrDriver(root)
    : initializeTripNavigation(root, role, organization, account);"""

new_bind_driver = """  const mvsrTestDriver = role === "school-driver" && account === "MVSR-DRV-001";
  const jcTestDriver = (role === "school-driver" || role === "junior-driver") && (account === "JC-DRV-001" || organization === "Junior College");
  const dedicatedInitialization = (mvsrTestDriver || jcTestDriver)
    ? initializeMvsrDriver(root)
    : initializeTripNavigation(root, role, organization, account);"""

assert old_bind_driver in code, "old_bind_driver not found"
code = code.replace(old_bind_driver, new_bind_driver, 1)

# Also replace mvsrInitialization.catch with dedicatedInitialization.catch
code = code.replace("mvsrInitialization.catch((error) => {", "dedicatedInitialization.catch((error) => {", 1)

# 2. Update loadMvsrDriverDashboard driver check and roster generation
old_check = """  if (data.role !== "school-driver" || data.route?.assigned_driver_id !== "MVSR-DRV-001") {
    throw new Error("The signed-in driver does not own the configured MVSR test route.");
  }"""

new_check = """  const driverId = data.route?.assigned_driver_id;
  if (data.role !== "school-driver" || (driverId !== "MVSR-DRV-001" && driverId !== "JC-DRV-001")) {
    throw new Error("The signed-in driver does not own an authorized college test route.");
  }
  const isJc = driverId === "JC-DRV-001";"""

assert old_check in code, "old_check not found"
code = code.replace(old_check, new_check, 1)

# Update roster generation inside loadMvsrDriverDashboard to adapt to MVSR vs Junior College
old_roster_gen = """  // Build Real-Time MVSR Attendance Roster from localStorage
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
  }"""

new_roster_gen = """  // Build Real-Time Attendance Roster from localStorage (MVSR or Junior College)
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
  }"""

assert old_roster_gen in code, "old_roster_gen not found"
code = code.replace(old_roster_gen, new_roster_gen, 1)

# In renderDriver, adapt terminal options when driver is JC-DRV-001
old_render_driver_opts = """  const isSchool = role === "school-driver";
  const isMvsr = account === "MVSR-DRV-001";
  const title = (isMvsr || (isSchool && institution === "Engineering College"))
    ? "Engineering College Driver"
    : (isSchool && institution === "Junior College" ? "Junior College Driver" : info.title);"""

new_render_driver_opts = """  const isSchool = role === "school-driver";
  const isMvsr = account === "MVSR-DRV-001";
  const isJcDriver = account === "JC-DRV-001" || (isSchool && institution === "Junior College");
  const title = (isMvsr || (isSchool && institution === "Engineering College"))
    ? "Engineering College Driver"
    : (isJcDriver ? "Junior College Driver" : info.title);"""

assert old_render_driver_opts in code, "old_render_driver_opts not found"
code = code.replace(old_render_driver_opts, new_render_driver_opts, 1)

# Update executeDriverScan in renderDriver to reload dashboard whether MVSR or JC
code = code.replace("if (isMvsr) await loadMvsrDriverDashboard(root);", "if (isMvsr || isJcDriver) await loadMvsrDriverDashboard(root);")

APP_JS.write_text(code, encoding="utf-8", newline="\r\n")
print("SUCCESS: JC driver support wired into app.js")
