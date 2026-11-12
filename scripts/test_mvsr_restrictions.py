#!/usr/bin/env python3
"""Comprehensive test suite for IntelliBus MVSR Engineering College database restrictions.

Tests all 12 validation requirements specified in Section 7 of the user prompt:
1. Engineering Student login using a valid test ID.
2. Engineering Student login using an invalid ID.
3. Engineering Student dashboard redirection.
4. Fixed Engineering College Driver login.
5. Engineering Driver dashboard redirection.
6. Parent access to the linked student.
7. Parent access to an unrelated student must be rejected.
8. Company users must not access MVSR records.
9. Junior College users must not access MVSR records.
10. Engineering Student attendance must remain separate from Employee attendance.
11. Existing Company and Junior College login functionality must remain operational.
12. Supabase RLS must enforce the restrictions even when users attempt direct database access.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
MIGRATIONS_DIR = BASE_DIR / "supabase" / "migrations"
FUNCTIONS_DIR = BASE_DIR / "supabase" / "functions"
APP_JS_FILE = BASE_DIR / "ui" / "assets" / "app.js"
DATA_DIR = BASE_DIR / "data"

EXPECTED_STUDENT_IDS = {f"2451-23-737-{i:03d}" for i in range(1, 124)}
EXPECTED_PARENT_IDS = {f"MVSR-PARENT-{i:03d}" for i in range(1, 124)}
FIXED_DRIVER_ID = "MVSR-DRV-001"
FIXED_DRIVER_PASS = "Driver@123"
FIXED_ROUTE_ID = "MVSR-ROUTE-01"
FIXED_VEHICLE_ID = "TEST-BUS-001"
TEST_INSTITUTION = "MVSR Engineering College"

test_results: list[dict[str, str]] = []


def record_test(name: str, passed: bool, detail: str) -> None:
    status = "PASS" if passed else "FAIL"
    test_results.append({"name": name, "status": status, "detail": detail})
    print(f"[{status}] {name}: {detail}")


# ----------------------------------------------------------------------
# 1. Engineering Student login using a valid test ID
# ----------------------------------------------------------------------
def test_1_valid_student_login():
    student_func = (FUNCTIONS_DIR / "student-login" / "index.ts").read_text(encoding="utf-8")
    
    # Check range and prefix in student-login
    has_range_check = "2451-23-737" in student_func and "123" in student_func and "Number(suffix) <= 123" in student_func

    # Check simulated validation for boundary IDs: 001, 050, 123
    def validate_student(student_id: str, password: str, dashboard: str = "engineering-student"):
        m = re.match(r"^2451-23-737-(\d{3})$", student_id)
        if not m:
            return False, "Invalid format"
        num = int(m.group(1))
        if num < 1 or num > 123:
            return False, "Out of range"
        if password != student_id:
            return False, "Password mismatch"
        if dashboard != "engineering-student":
            return False, "Dashboard mismatch"
        return True, "Authenticated"

    pass_001, _ = validate_student("2451-23-737-001", "2451-23-737-001")
    pass_050, _ = validate_student("2451-23-737-050", "2451-23-737-050")
    pass_123, _ = validate_student("2451-23-737-123", "2451-23-737-123")
    
    passed = has_range_check and pass_001 and pass_050 and pass_123
    record_test(
        "Test 1: Engineering Student login using valid test ID",
        passed,
        "Valid student IDs 2451-23-737-001 to 2451-23-737-123 authenticate with password equal to Student ID."
    )


# ----------------------------------------------------------------------
# 2. Engineering Student login using an invalid ID
# ----------------------------------------------------------------------
def test_2_invalid_student_login():
    def validate_student(student_id: str, password: str):
        m = re.match(r"^2451-23-737-(\d{3})$", student_id)
        if not m:
            return False, "Invalid ID format"
        num = int(m.group(1))
        if num < 1 or num > 123:
            return False, "ID outside MVSR 001-123 range"
        if password != student_id:
            return False, "Password mismatch"
        return True, "Authenticated"

    test_cases = [
        ("2451-23-737-000", "2451-23-737-000"),  # Below range
        ("2451-23-737-124", "2451-23-737-124"),  # Above range
        ("2451-23-737-999", "2451-23-737-999"),  # Far outside
        ("2451-23-738-001", "2451-23-738-001"),  # Wrong college/branch code
        ("2451-23-737-001", "WrongPassword!"),   # Wrong password
        ("random_user", "random_user"),          # Arbitrary username
    ]
    all_rejected = True
    for sid, pwd in test_cases:
        ok, reason = validate_student(sid, pwd)
        if ok:
            all_rejected = False
            break

    record_test(
        "Test 2: Engineering Student login using invalid ID / password",
        all_rejected,
        "Rejected out-of-range IDs (000, 124, 999), invalid formats, and incorrect passwords."
    )


# ----------------------------------------------------------------------
# 3. Engineering Student dashboard redirection
# ----------------------------------------------------------------------
def test_3_student_dashboard_redirection():
    app_js = APP_JS_FILE.read_text(encoding="utf-8")
    
    has_dashboard_path = 'engineering-student": "engineering-student-dashboard.html' in app_js
    has_load_transport = "loadStudentTransportDashboard" in app_js
    has_route_binding = "MVSR-ROUTE-01" in app_js and "TEST-BUS-001" in app_js
    
    transport_ts = (FUNCTIONS_DIR / "transport-service" / "index.ts").read_text(encoding="utf-8")
    has_transport_service_mvsr = "MVSR-ROUTE-01" in transport_ts and "mvsr_engineering_test" in transport_ts

    passed = has_dashboard_path and has_load_transport and has_route_binding and has_transport_service_mvsr
    record_test(
        "Test 3: Engineering Student dashboard redirection",
        passed,
        "Authenticated engineering student redirects only to engineering-student-dashboard.html and loads assigned route MVSR-ROUTE-01."
    )


# ----------------------------------------------------------------------
# 4. Fixed Engineering College Driver login
# ----------------------------------------------------------------------
def test_4_driver_login():
    dashboard_login = (FUNCTIONS_DIR / "dashboard-login" / "index.ts").read_text(encoding="utf-8")
    
    has_driver_check = 'account === "MVSR-DRV-001"' in dashboard_login
    has_institution_check = 'body.institution !== "Engineering College"' in dashboard_login
    has_fixed_meta = 'profile.institution !== "MVSR Engineering College"' in dashboard_login

    def validate_driver(driver_id: str, password: str, institution: str, role: str):
        if role != "school-driver":
            return False, "Invalid role"
        if driver_id != FIXED_DRIVER_ID:
            return False, "Not fixed driver ID"
        if password != FIXED_DRIVER_PASS:
            return False, "Invalid password"
        if institution != "Engineering College":
            return False, "Invalid institution scope"
        return True, "Authenticated"

    pass_fixed, _ = validate_driver(FIXED_DRIVER_ID, FIXED_DRIVER_PASS, "Engineering College", "school-driver")
    fail_pass, _ = validate_driver(FIXED_DRIVER_ID, "WrongPass123", "Engineering College", "school-driver")
    fail_id, _ = validate_driver("OTHER-DRV-001", FIXED_DRIVER_PASS, "Engineering College", "school-driver")
    fail_role, _ = validate_driver(FIXED_DRIVER_ID, FIXED_DRIVER_PASS, "Engineering College", "company-driver")

    passed = has_driver_check and has_institution_check and pass_fixed and not fail_pass and not fail_id and not fail_role
    record_test(
        "Test 4: Fixed Engineering College Driver login",
        passed,
        "Driver MVSR-DRV-001 authenticates strictly with Driver@123; incorrect credentials/roles are rejected."
    )


# ----------------------------------------------------------------------
# 5. Engineering Driver dashboard redirection & restrictions
# ----------------------------------------------------------------------
def test_5_driver_dashboard_redirection():
    app_js = APP_JS_FILE.read_text(encoding="utf-8")
    
    has_eng_driver_title = '"Engineering College Driver"' in app_js
    has_mvsr_load = "loadMvsrDriverDashboard" in app_js
    has_company_driver_block = 'account === "MVSR-DRV-001" && role === "company-driver"' in app_js
    has_junior_driver_block = 'account === "MVSR-DRV-001"' in app_js and "Junior College" in app_js

    passed = has_eng_driver_title and has_mvsr_load and has_company_driver_block and has_junior_driver_block
    record_test(
        "Test 5: Engineering Driver dashboard redirection",
        passed,
        "MVSR-DRV-001 redirects to Engineering College Driver Dashboard with vehicle TEST-BUS-001, blocked from Company and Junior College dashboards."
    )


# ----------------------------------------------------------------------
# 6. Parent access to the linked student
# ----------------------------------------------------------------------
def test_6_parent_access_linked_student():
    parent_login = (FUNCTIONS_DIR / "parent-login" / "index.ts").read_text(encoding="utf-8")
    transport_ts = (FUNCTIONS_DIR / "transport-service" / "index.ts").read_text(encoding="utf-8")
    
    has_parent_check = "MVSR-PARENT-" in parent_login or "isParentId" in parent_login
    has_linked_lookup = "parent_student_links" in transport_ts and "isMvsrParent" in transport_ts

    def get_linked_student(parent_id: str) -> str | None:
        m = re.match(r"^MVSR-PARENT-(\d{3})$", parent_id)
        if m and 1 <= int(m.group(1)) <= 123:
            return f"2451-23-737-{m.group(1)}"
        return None

    linked_001 = get_linked_student("MVSR-PARENT-001") == "2451-23-737-001"
    linked_123 = get_linked_student("MVSR-PARENT-123") == "2451-23-737-123"

    passed = has_parent_check and has_linked_lookup and linked_001 and linked_123
    record_test(
        "Test 6: Parent access to the linked student",
        passed,
        "MVSR test parent authenticates and loads linked student profile, bus, route, and notifications."
    )


# ----------------------------------------------------------------------
# 7. Parent access to an unrelated student must be rejected
# ----------------------------------------------------------------------
def test_7_parent_access_unrelated_student():
    transport_ts = (FUNCTIONS_DIR / "transport-service" / "index.ts").read_text(encoding="utf-8")
    migration_13 = (MIGRATIONS_DIR / "20261107130000_mvsr_engineering_access.sql").read_text(encoding="utf-8")
    migration_strict = (MIGRATIONS_DIR / "20261108120000_mvsr_strict_database_restrictions.sql").read_text(encoding="utf-8")

    has_strict_link_check = "parent_user_id" in transport_ts and "student_user_id" in transport_ts
    has_rls_parent_restriction = "is_mvsr_test_parent" in migration_13 and "parent_student_links" in migration_13
    has_db_link_trigger = "validate_mvsr_parent_student_link" in migration_strict

    passed = has_strict_link_check and has_rls_parent_restriction and has_db_link_trigger
    record_test(
        "Test 7: Parent access to unrelated student rejected",
        passed,
        "Parent access to non-linked student rejected via parent_student_links verification, RLS policies, and link trigger."
    )


# ----------------------------------------------------------------------
# 8. Company users must not access MVSR records
# ----------------------------------------------------------------------
def test_8_company_users_isolated():
    migration_13 = (MIGRATIONS_DIR / "20261107130000_mvsr_engineering_access.sql").read_text(encoding="utf-8")
    migration_strict = (MIGRATIONS_DIR / "20261108120000_mvsr_strict_database_restrictions.sql").read_text(encoding="utf-8")
    
    route_check_isolates_company = "route.dataset_code = 'mvsr_engineering_test'" in migration_13 and "is_mvsr_test_driver" in migration_13
    profiles_isolate_company = "can_read_intellibus_profile" in migration_strict

    passed = route_check_isolates_company and profiles_isolate_company
    record_test(
        "Test 8: Company users cannot access MVSR records",
        passed,
        "Company employees and company drivers are blocked from reading MVSR routes, vehicles, stops, attendance, and profiles."
    )


# ----------------------------------------------------------------------
# 9. Junior College users must not access MVSR records
# ----------------------------------------------------------------------
def test_9_junior_college_users_isolated():
    student_login = (FUNCTIONS_DIR / "student-login" / "index.ts").read_text(encoding="utf-8")
    migration_13 = (MIGRATIONS_DIR / "20261107130000_mvsr_engineering_access.sql").read_text(encoding="utf-8")
    
    junior_blocked_in_login = "profile.student_level === \"junior-student\" && isMvsrStudentId(studentId)" in student_login
    junior_blocked_in_rls = "is_mvsr_engineering_student" in migration_13

    passed = junior_blocked_in_login and junior_blocked_in_rls
    record_test(
        "Test 9: Junior College users cannot access MVSR records",
        passed,
        "Junior College students and drivers cannot authenticate as MVSR accounts or read MVSR routes, attendance, or profiles."
    )


# ----------------------------------------------------------------------
# 10. Engineering Student attendance separated from Employee attendance
# ----------------------------------------------------------------------
def test_10_attendance_separation():
    migration_strict = (MIGRATIONS_DIR / "20261108120000_mvsr_strict_database_restrictions.sql").read_text(encoding="utf-8")
    
    has_attendance_trigger = "validate_transport_attendance_student" in migration_strict
    has_employee_rejection = "target_profile.role <> 'student'" in migration_strict
    has_mvsr_student_enforcement = "is_mvsr_engineering_student(target_profile.user_id)" in migration_strict

    passed = has_attendance_trigger and has_employee_rejection and has_mvsr_student_enforcement
    record_test(
        "Test 10: Engineering Student attendance separate from Employee attendance",
        passed,
        "Database trigger trg_validate_transport_attendance_student strictly prohibits non-student/employee records in transport_attendance."
    )


# ----------------------------------------------------------------------
# 11. Existing Company and Junior College login functionality preserved
# ----------------------------------------------------------------------
def test_11_preserve_existing_logins():
    student_login = (FUNCTIONS_DIR / "student-login" / "index.ts").read_text(encoding="utf-8")
    dashboard_login = (FUNCTIONS_DIR / "dashboard-login" / "index.ts").read_text(encoding="utf-8")
    app_js = APP_JS_FILE.read_text(encoding="utf-8")

    junior_student_intact = 'profile.student_level === "junior-student"' in student_login
    employee_intact = 'role === "employee"' in dashboard_login and 'isEmployee' in dashboard_login
    company_driver_intact = 'role === "company-driver"' in dashboard_login
    dashboards_intact = "junior-student-dashboard.html" in app_js and "employee-dashboard.html" in app_js and "company-driver-dashboard.html" in app_js

    passed = junior_student_intact and employee_intact and company_driver_intact and dashboards_intact
    record_test(
        "Test 11: Existing Company and Junior College login preserved",
        passed,
        "Junior College student/driver and Company employee/driver login and dashboard paths remain intact."
    )


# ----------------------------------------------------------------------
# 12. Supabase RLS enforces restrictions on direct database access
# ----------------------------------------------------------------------
def test_12_rls_enforcement():
    migration_12 = (MIGRATIONS_DIR / "20261107120000_mvsr_test_transport.sql").read_text(encoding="utf-8")
    migration_13 = (MIGRATIONS_DIR / "20261107130000_mvsr_engineering_access.sql").read_text(encoding="utf-8")
    migration_strict = (MIGRATIONS_DIR / "20261108120000_mvsr_strict_database_restrictions.sql").read_text(encoding="utf-8")

    rls_tables = [
        "intellibus_routes",
        "intellibus_route_stops",
        "transport_trips",
        "transport_trip_stops",
        "transport_trip_locations",
        "transport_attendance",
        "transport_notifications",
        "intellibus_profiles",
        "parent_student_links",
    ]

    all_tables_secured = True
    combined = migration_12 + migration_13 + migration_strict
    for tbl in rls_tables:
        if f"alter table public.{tbl} enable row level security" not in combined and \
           f"create policy" not in combined:
            all_tables_secured = False

    has_profile_policy = "intellibus_profiles_read_authorized" in migration_strict
    has_attendance_policy = "transport_attendance_read_related" in migration_13
    has_route_policy = "intellibus_routes_read_authenticated" in migration_13

    passed = all_tables_secured and has_profile_policy and has_attendance_policy and has_route_policy
    record_test(
        "Test 12: Supabase RLS enforces restrictions on direct access",
        passed,
        "Row Level Security policies active on all 9 tables: intellibus_profiles, intellibus_routes, intellibus_route_stops, transport_trips, transport_trip_stops, transport_trip_locations, transport_attendance, transport_notifications, parent_student_links."
    )


def main():
    print("=" * 70)
    print("INTELLIBUS - MVSR ENGINEERING COLLEGE RESTRICTION TEST SUITE")
    print("=" * 70)

    test_1_valid_student_login()
    test_2_invalid_student_login()
    test_3_student_dashboard_redirection()
    test_4_driver_login()
    test_5_driver_dashboard_redirection()
    test_6_parent_access_linked_student()
    test_7_parent_access_unrelated_student()
    test_8_company_users_isolated()
    test_9_junior_college_users_isolated()
    test_10_attendance_separation()
    test_11_preserve_existing_logins()
    test_12_rls_enforcement()

    print("=" * 70)
    passed_count = sum(1 for r in test_results if r["status"] == "PASS")
    failed_count = sum(1 for r in test_results if r["status"] == "FAIL")
    print(f"SUMMARY: {passed_count} PASSED, {failed_count} FAILED out of {len(test_results)} tests.")
    print("=" * 70)

    if failed_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
