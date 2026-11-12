import re
from pathlib import Path

APP_JS = Path(r"c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\assets\app.js")
code = APP_JS.read_text(encoding="utf-8").replace("\r\n", "\n")

# 1. Import getJuniorQrSvg
old_import = """import { getMvsrQrSvg } from "./mvsr-qr.js";"""
new_import = """import { getMvsrQrSvg } from "./mvsr-qr.js";
import { getJuniorQrSvg } from "./junior-qr.js";"""

assert old_import in code, "old_import not found"
code = code.replace(old_import, new_import, 1)

# 2. Add isJuniorStudentId and isJuniorParentIdentifier
old_top_helpers = """function isMvsrParentIdentifier(identifier) {
  if (typeof identifier !== "string") return false;
  const idMatch = identifier.match(/^MVSR-PARENT-(\\d{3})$/)?.[1];
  if (idMatch !== undefined && Number(idMatch) >= 1 && Number(idMatch) <= 123) return Number(idMatch);
  const emailMatch = identifier.match(/^parent(\\d{3})@example\\.test$/i)?.[1];
  if (emailMatch !== undefined && Number(emailMatch) >= 1 && Number(emailMatch) <= 123) return Number(emailMatch);
  return null;
}"""

new_top_helpers = """function isMvsrParentIdentifier(identifier) {
  if (typeof identifier !== "string") return false;
  const idMatch = identifier.match(/^MVSR-PARENT-(\\d{3})$/)?.[1];
  if (idMatch !== undefined && Number(idMatch) >= 1 && Number(idMatch) <= 123) return Number(idMatch);
  const emailMatch = identifier.match(/^parent(\\d{3})@example\\.test$/i)?.[1];
  if (emailMatch !== undefined && Number(emailMatch) >= 1 && Number(emailMatch) <= 123) return Number(emailMatch);
  return null;
}

function isJuniorStudentId(studentId) {
  if (typeof studentId !== "string") return false;
  const match = studentId.match(/^INT-2026-(\\d{3})$/);
  if (!match) return false;
  const num = Number(match[1]);
  return num >= 1 && num <= 123;
}

function isJuniorParentIdentifier(identifier) {
  if (typeof identifier !== "string") return false;
  const idMatch = identifier.match(/^INT-PARENT-(\\d{3})$/)?.[1];
  if (idMatch !== undefined && Number(idMatch) >= 1 && Number(idMatch) <= 123) return Number(idMatch);
  const emailMatch = identifier.match(/^parent(\\d{3})@example\\.test$/i)?.[1];
  if (emailMatch !== undefined && Number(emailMatch) >= 1 && Number(emailMatch) <= 123) return Number(emailMatch);
  return null;
}"""

assert old_top_helpers in code, "old_top_helpers not found"
code = code.replace(old_top_helpers, new_top_helpers, 1)

# 3. Update renderLogin authentication for Junior College
old_login_checks = """      if (config.dashboard === "junior-student") {
        if (isMvsrStudentId(account)) {
          error.textContent = "Student ID or password is incorrect.";
          return;
        }
        sessionStorage.setItem(STORAGE.role, "junior-student");
        sessionStorage.setItem(STORAGE.account, account);
        sessionStorage.setItem(STORAGE.institution, "Junior College");
        window.location.assign(dashboardPath("junior-student"));
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
          if (account === "MVSR-DRV-001") {
            error.textContent = "Account ID or password is incorrect.";
            return;
          }
          sessionStorage.setItem(STORAGE.role, "school-driver");
          sessionStorage.setItem(STORAGE.account, account);
          sessionStorage.setItem(STORAGE.institution, "Junior College");
          window.location.assign(dashboardPath("school-driver"));
          return;
        }
      }"""

new_login_checks = """      if (config.dashboard === "junior-student") {
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
      }"""

assert old_login_checks in code, "old_login_checks not found"
code = code.replace(old_login_checks, new_login_checks, 1)

# In parent login check, support Junior College parent
old_parent_check = """      if (config.dashboard === "parent") {
        const parentNum = isMvsrParentIdentifier(account);
        if (parentNum) {
          if (password !== "Parent@123") {
            error.textContent = "Parent ID, email, or password is incorrect.";
            return;
          }
          sessionStorage.setItem(STORAGE.role, "parent");
          sessionStorage.setItem(STORAGE.account, account);
          window.location.assign(dashboardPath("parent"));
          return;
        }
      }"""

new_parent_check = """      if (config.dashboard === "parent") {
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
      }"""

assert old_parent_check in code, "old_parent_check not found"
code = code.replace(old_parent_check, new_parent_check, 1)

# In renderLocalVerification, support Junior College
old_local_verify_title = """  const isStudent = role === "engineering-student" || isMvsrStudentId(account);
  const title = isStudent ? "Engineering Student Verification" : "Identity Verification";
  const desc = isStudent
    ? "Complete your live Face Verification and upload your College ID Card (PDF) to generate your official Boarding QR Code."
    : "Complete your identity check to continue to your dashboard.";"""

new_local_verify_title = """  const isEngStudent = role === "engineering-student" || isMvsrStudentId(account);
  const isJcStudent = role === "junior-student" || isJuniorStudentId(account);
  const title = isEngStudent
    ? "Engineering Student Verification"
    : isJcStudent
      ? "Junior College Student Verification"
      : "Identity Verification";
  const desc = (isEngStudent || isJcStudent)
    ? "Complete your live Face Verification and upload your College ID Card (PDF) to generate your official Boarding QR Code."
    : "Complete your identity check to continue to your dashboard.";"""

assert old_local_verify_title in code, "old_local_verify_title not found"
code = code.replace(old_local_verify_title, new_local_verify_title, 1)

# In renderDashboard, support instant parameter for Junior College
old_instant_block = """    if (role === "engineering-student" && isMvsrStudentId(instantParam)) {
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
    }"""

new_instant_block = """    if (role === "engineering-student" && isMvsrStudentId(instantParam)) {
      sessionStorage.setItem(STORAGE.role, "engineering-student");
      sessionStorage.setItem(STORAGE.account, instantParam);
      sessionStorage.setItem(STORAGE.institution, "MVSR Engineering College");
      sessionStorage.setItem("intellibus.verified." + instantParam, "true");
      sessionStorage.setItem("intellibus.qr_active." + instantParam, "true");
      sessionStorage.setItem("intellibus.id_card." + instantParam, `MVSR_ID_${instantParam}.pdf`);
      sessionStorage.setItem("intellibus.face_verified." + instantParam, "true");
    } else if (role === "junior-student" && isJuniorStudentId(instantParam)) {
      sessionStorage.setItem(STORAGE.role, "junior-student");
      sessionStorage.setItem(STORAGE.account, instantParam);
      sessionStorage.setItem(STORAGE.institution, "Intermediate College (placeholder test organization)");
      sessionStorage.setItem("intellibus.verified." + instantParam, "true");
      sessionStorage.setItem("intellibus.qr_active." + instantParam, "true");
      sessionStorage.setItem("intellibus.id_card." + instantParam, `INT_ID_${instantParam}.pdf`);
      sessionStorage.setItem("intellibus.face_verified." + instantParam, "true");
    } else if (role === "school-driver" && instantParam === "MVSR-DRV-001") {
      sessionStorage.setItem(STORAGE.role, "school-driver");
      sessionStorage.setItem(STORAGE.account, "MVSR-DRV-001");
      sessionStorage.setItem(STORAGE.institution, "Engineering College");
    } else if (role === "school-driver" && instantParam === "JC-DRV-001") {
      sessionStorage.setItem(STORAGE.role, "school-driver");
      sessionStorage.setItem(STORAGE.account, "JC-DRV-001");
      sessionStorage.setItem(STORAGE.institution, "Junior College");
    } else if (role === "parent" && (instantParam === "MVSR-PARENT-001" || isMvsrParentIdentifier(instantParam))) {
      sessionStorage.setItem(STORAGE.role, "parent");
      sessionStorage.setItem(STORAGE.account, instantParam);
      sessionStorage.setItem(STORAGE.institution, "MVSR Engineering College");
    } else if (role === "parent" && (instantParam === "INT-PARENT-001" || isJuniorParentIdentifier(instantParam))) {
      sessionStorage.setItem(STORAGE.role, "parent");
      sessionStorage.setItem(STORAGE.account, instantParam);
      sessionStorage.setItem(STORAGE.institution, "Junior College");
    }"""

assert old_instant_block in code, "old_instant_block not found"
code = code.replace(old_instant_block, new_instant_block, 1)

# In callTransportService, replace junior-student handler with 123-dataset handler
old_call_transport_jc = """    if (role === "junior-student") {
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
    }"""

new_call_transport_jc = """    if (role === "junior-student" || isJuniorStudentId(account)) {
      const match = (account || "INT-2026-001").match(/^INT-2026-(\\d{3})$/);
      const num = match ? Number(match[1]) : 1;
      const streams = ["MPC", "BiPC", "CEC", "MEC"];
      const sections = ["A", "B", "C"];
      const suffix = match ? match[1] : "001";
      const stream = streams[(num - 1) % 4];
      const year = num <= 62 ? "1st Year" : "2nd Year";
      const sec = sections[(num - 1) % 3];
      const pickupStopNum = ((num - 1) % 4) + 1;
      const pickupStopId = `INT-STOP-0${pickupStopNum}`;
      const pickupStopName = `Intermediate Test Stop 0${pickupStopNum}`;

      return {
        role: "student",
        profile: {
          role: "student",
          user_id: `test-jc-student-${suffix}`,
          student_id: account || "INT-2026-001",
          student_level: "junior-student",
          student_name: `Test Intermediate Student ${suffix}`,
          institution: "Intermediate College (placeholder test organization)",
          department: stream,
          academic_year: year,
          section: sec,
          route_id: "INT-ROUTE-01",
          pickup_stop_id: pickupStopId,
          drop_stop_id: "INT-STOP-05",
          qr_token: account || "INT-2026-001",
          qr_svg: getJuniorQrSvg(account || "INT-2026-001"),
        },
        route: {
          route_id: "INT-ROUTE-01",
          route_name: "Intermediate College Test Route",
          assigned_driver_id: "JC-DRV-001",
          vehicle_id: "TEST-JC-BUS-001",
          route_status: "TEST_ONLY",
          dataset_code: "intermediate_college_test",
        },
        stops: [
          { stop_id: "INT-STOP-01", stop_order: 1, stop_name: "Intermediate Test Stop 01" },
          { stop_id: "INT-STOP-02", stop_order: 2, stop_name: "Intermediate Test Stop 02" },
          { stop_id: "INT-STOP-03", stop_order: 3, stop_name: "Intermediate Test Stop 03" },
          { stop_id: "INT-STOP-04", stop_order: 4, stop_name: "Intermediate Test Stop 04" },
          { stop_id: "INT-STOP-05", stop_order: 5, stop_name: "Intermediate Test Stop 05" },
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
    }"""

assert old_call_transport_jc in code, "old_call_transport_jc not found"
code = code.replace(old_call_transport_jc, new_call_transport_jc, 1)

# In callTransportService for driver, support JC-DRV-001
old_driver_jc = """    if ((role === "school-driver" || role === "engineering-driver") && account === "MVSR-DRV-001") {"""
new_driver_jc = """    if ((role === "school-driver" || role === "junior-driver") && (account === "JC-DRV-001" || sessionStorage.getItem(STORAGE.institution) === "Junior College")) {
      return {
        role: "school-driver",
        route: {
          route_id: "INT-ROUTE-01",
          route_name: "Intermediate College Test Route",
          assigned_driver_id: "JC-DRV-001",
          vehicle_id: "TEST-JC-BUS-001",
          route_status: "TEST_ONLY",
          dataset_code: "intermediate_college_test",
        },
        stops: [
          { stop_id: "INT-STOP-01", stop_order: 1, stop_name: "Intermediate Test Stop 01" },
          { stop_id: "INT-STOP-02", stop_order: 2, stop_name: "Intermediate Test Stop 02" },
          { stop_id: "INT-STOP-03", stop_order: 3, stop_name: "Intermediate Test Stop 03" },
          { stop_id: "INT-STOP-04", stop_order: 4, stop_name: "Intermediate Test Stop 04" },
          { stop_id: "INT-STOP-05", stop_order: 5, stop_name: "Intermediate Test Stop 05" },
        ],
        activeTrip: {
          trip_id: "jc-trip-001",
          status: "active",
          started_at: new Date(Date.now() - 3600000).toISOString(),
        },
        reachedStops: ["INT-STOP-01"],
        recentTrips: [],
        attendance: [],
      };
    }

    if ((role === "school-driver" || role === "engineering-driver") && account === "MVSR-DRV-001") {"""

assert old_driver_jc in code, "old_driver_jc not found"
code = code.replace(old_driver_jc, new_driver_jc, 1)

# In callTransportService for parent, support INT-PARENT-xxx
old_parent_transport = """    if (role === "parent") {
      const parentNum = isMvsrParentIdentifier(account);"""

new_parent_transport = """    if (role === "parent") {
      const jcParentNum = isJuniorParentIdentifier(account);
      if (jcParentNum) {
        const suffix = String(jcParentNum).padStart(3, "0");
        const studentId = `INT-2026-${suffix}`;
        const streams = ["MPC", "BiPC", "CEC", "MEC"];
        const sections = ["A", "B", "C"];
        const stream = streams[(jcParentNum - 1) % 4];
        const year = jcParentNum <= 62 ? "1st Year" : "2nd Year";
        const sec = sections[(jcParentNum - 1) % 3];
        const pickupStopNum = ((jcParentNum - 1) % 4) + 1;
        return {
          role: "parent",
          students: [
            {
              profile: {
                student_id: studentId,
                student_level: "junior-student",
                student_name: `Test Intermediate Student ${suffix}`,
                institution: "Intermediate College (placeholder test organization)",
                department: stream,
                academic_year: year,
                section: sec,
                route_id: "INT-ROUTE-01",
                pickup_stop_id: `INT-STOP-0${pickupStopNum}`,
                drop_stop_id: "INT-STOP-05",
              },
              route: {
                route_id: "INT-ROUTE-01",
                vehicle_id: "TEST-JC-BUS-001",
                route_name: "Intermediate College Test Route",
              },
              stops: [
                { stop_id: "INT-STOP-01", stop_order: 1, stop_name: "Intermediate Test Stop 01" },
                { stop_id: "INT-STOP-02", stop_order: 2, stop_name: "Intermediate Test Stop 02" },
                { stop_id: "INT-STOP-03", stop_order: 3, stop_name: "Intermediate Test Stop 03" },
                { stop_id: "INT-STOP-04", stop_order: 4, stop_name: "Intermediate Test Stop 04" },
                { stop_id: "INT-STOP-05", stop_order: 5, stop_name: "Intermediate Test Stop 05" },
              ],
              attendance: [],
              notifications: [
                {
                  notification_id: `notif-jc-${suffix}`,
                  notification_type: "student_assigned",
                  message: `Test Intermediate Student ${suffix} assigned to bus TEST-JC-BUS-001 on route INT-ROUTE-01.`,
                  created_at: new Date(Date.now() - 1800000).toISOString(),
                },
              ],
              currentTrip: {
                trip_id: "jc-trip-001",
                status: "active",
                started_at: new Date(Date.now() - 3600000).toISOString(),
                transport_trip_locations: [
                  { latitude: 17.3850, longitude: 78.4867, recorded_at: new Date().toISOString() },
                ],
              },
            },
          ],
        };
      }

      const parentNum = isMvsrParentIdentifier(account);"""

assert old_parent_transport in code, "old_parent_transport not found"
code = code.replace(old_parent_transport, new_parent_transport, 1)

# In scan-student action handler, support INT-2026-xxx
old_scan_student_mapping = """    const raw = (details.qrToken || details.studentId || "").trim();
    let studentId = "";
    if (/^2451-23-737-\\d{3}$/.test(raw)) {
      studentId = raw;
    } else {
      const match = raw.match(/([0-9a-f]{3})$/i);
      const suffix = match ? match[1] : "001";
      studentId = `2451-23-737-${suffix}`;
    }"""

new_scan_student_mapping = """    const raw = (details.qrToken || details.studentId || "").trim();
    let studentId = "";
    let isJc = false;
    if (/^INT-2026-\\d{3}$/.test(raw)) {
      studentId = raw;
      isJc = true;
    } else if (/^2451-23-737-\\d{3}$/.test(raw)) {
      studentId = raw;
    } else {
      const match = raw.match(/([0-9a-f]{3})$/i);
      const suffix = match ? match[1] : "001";
      studentId = `2451-23-737-${suffix}`;
    }"""

assert old_scan_student_mapping in code, "old_scan_student_mapping not found"
code = code.replace(old_scan_student_mapping, new_scan_student_mapping, 1)

APP_JS.write_text(code, encoding="utf-8", newline="\r\n")
print("SUCCESS: Junior College dataset logic applied to app.js")
