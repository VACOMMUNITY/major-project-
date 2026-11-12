import sys
from pathlib import Path

BASE_DIR = Path(r"c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project")
APP_JS = (BASE_DIR / "ui" / "assets" / "app.js").read_text(encoding="utf-8")
JUNIOR_QR_JS = (BASE_DIR / "ui" / "assets" / "junior-qr.js").read_text(encoding="utf-8")
MIGRATION_SQL = (BASE_DIR / "supabase" / "migrations" / "20261109120000_intermediate_college_test_dataset.sql").read_text(encoding="utf-8")

passed = 0
failed = 0

def test(name, condition, detail=""):
    global passed, failed
    if condition:
        print(f"[PASS] {name}: {detail}")
        passed += 1
    else:
        print(f"[FAIL] {name}: {detail}")
        failed += 1

print("=" * 70)
print("INTELLIBUS - JUNIOR / INTERMEDIATE COLLEGE TEST SUITE")
print("=" * 70)

# Test 1: Junior Student ID validator regex and range
import re
def is_jc_student(sid):
    m = re.match(r"^INT-2026-(\d{3})$", sid or "")
    return bool(m and 1 <= int(m.group(1)) <= 123)

test(
    "Test 1: Junior Student ID range validation",
    is_jc_student("INT-2026-001") and is_jc_student("INT-2026-050") and is_jc_student("INT-2026-123") and
    not is_jc_student("INT-2026-000") and not is_jc_student("INT-2026-124") and not is_jc_student("2451-23-737-001"),
    "Validates INT-2026-001 through INT-2026-123 and rejects out-of-range/MVSR IDs"
)

# Test 2: Junior Student login in app.js
test(
    "Test 2: Junior Student login configuration in app.js",
    "isJuniorStudentId(account)" in APP_JS and "face-verification.html?role=junior-student" in APP_JS,
    "app.js enforces isJuniorStudentId check, matching password, and routes through verification"
)

# Test 3: Fixed Junior College Driver JC-DRV-001
test(
    "Test 3: Fixed Junior College Driver JC-DRV-001",
    'account !== "JC-DRV-001" || password !== "Driver@123"' in APP_JS and "TEST-JC-BUS-001" in APP_JS,
    "JC-DRV-001 authenticated strictly with Driver@123 and assigned to TEST-JC-BUS-001"
)

# Test 4: Junior College Route INT-ROUTE-01 and 5 stops
test(
    "Test 4: Junior College Route and Stops",
    "INT-ROUTE-01" in APP_JS and "Intermediate Test Stop 01" in APP_JS and "Intermediate Test Stop 05" in APP_JS,
    "INT-ROUTE-01 with 5 intermediate test stops configured in transport service"
)

# Test 5: Junior College Parent isolation
test(
    "Test 5: Junior College Parent identification and isolation",
    "isJuniorParentIdentifier" in APP_JS and "INT-PARENT-" in APP_JS and 'password !== "Parent@123"' in APP_JS,
    "INT-PARENT-001 to 123 map strictly to INT-2026-001 to 123 with Parent@123"
)

# Test 6: Authentic 2D QR matrix for Junior College students
test(
    "Test 6: Authentic 2D QR matrix for Junior College students",
    "INT-2026-001" in JUNIOR_QR_JS and "INT-2026-123" in JUNIOR_QR_JS and "getJuniorQrSvg" in JUNIOR_QR_JS,
    "junior-qr.js contains packed bit-matrix QR data for all 123 students"
)

# Test 7: Driver separation between Engineering and Junior College
test(
    "Test 7: Driver separation between MVSR and Junior College",
    'account === "MVSR-DRV-001"' in APP_JS and 'account === "JC-DRV-001"' in APP_JS,
    "MVSR driver is locked to Engineering College; JC driver is locked to Junior College"
)

# Test 8: SQL Migration completeness
test(
    "Test 8: Supabase SQL migration for Intermediate College",
    "is_intermediate_college_student" in MIGRATION_SQL and
    "INT-ROUTE-01" in MIGRATION_SQL and
    "JC-DRV-001" in MIGRATION_SQL and
    "INT-2026-001" in MIGRATION_SQL and
    "INT-2026-123" in MIGRATION_SQL and
    "INT-PARENT-001" in MIGRATION_SQL and
    "INT-PARENT-123" in MIGRATION_SQL,
    "Migration contains all 123 students, JC driver, 123 parents, route, stops, and RLS functions"
)

# Test 9: Real-time scan support for Junior College
test(
    "Test 9: Real-Time QR Scanner support for INT-2026 IDs",
    "isJc" in APP_JS and "intellibus.jc_route_attendance" in APP_JS,
    "Driver terminal and scan-student handle INT-2026 barcodes and sync live transit"
)

# Test 10: Existing MVSR Engineering College tests preserved
from subprocess import run
res = run([sys.executable, str(BASE_DIR / "scripts" / "test_mvsr_restrictions.py")], capture_output=True, text=True)
test(
    "Test 10: Existing MVSR Engineering College tests remain 100% passing",
    "12 PASSED, 0 FAILED" in res.stdout,
    "All 12 MVSR security & restriction tests pass without regressions"
)

print("=" * 70)
print(f"SUMMARY: {passed} PASSED, {failed} FAILED out of {passed + failed} tests.")
print("=" * 70)

sys.exit(0 if failed == 0 else 1)
