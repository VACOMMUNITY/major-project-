#!/usr/bin/env python3
"""Idempotently provision the synthetic MVSR test workbook into an existing Supabase project."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zipfile
from pathlib import Path
from urllib.parse import urlparse
from xml.etree import ElementTree


NAMESPACES = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "relationships": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "package": "http://schemas.openxmlformats.org/package/2006/relationships",
}
EXPECTED_STUDENT_IDS = {f"2451-23-737-{number:03d}" for number in range(1, 124)}
EXPECTED_PARENT_IDS = {f"MVSR-PARENT-{number:03d}" for number in range(1, 124)}
TEST_DRIVER_ID = "MVSR-DRV-001"
TEST_ROUTE_ID = "MVSR-ROUTE-01"
TEST_VEHICLE_ID = "TEST-BUS-001"
TEST_DATASET_CODE = "mvsr_engineering_test"
TEST_INSTITUTION = "MVSR Engineering College"


def fail(message: str) -> None:
    raise RuntimeError(message)


def column_index(reference: str) -> int:
    letters = re.match(r"[A-Z]+", reference)
    if not letters:
        fail(f"Invalid workbook cell reference: {reference}")
    result = 0
    for character in letters.group(0):
        result = result * 26 + ord(character) - ord("A") + 1
    return result - 1


def is_mvsr_institution(name: str | None) -> bool:
    if not name:
        return False
    clean = name.strip().casefold()
    return clean in {"mvsr engineering college", "mvsr engineering college (test label only)"}


def workbook_sheets(path: Path) -> dict[str, list[dict[str, str]]]:
    if path.is_dir():
        import csv
        sheet_map = {
            "Students": ["mvsr_students.csv", "students.csv", "Students.csv"],
            "Drivers": ["mvsr_drivers.csv", "drivers.csv", "Drivers.csv"],
            "Parent_Test_Accounts": ["mvsr_parents.csv", "parents.csv", "Parent_Test_Accounts.csv"],
            "Routes": ["mvsr_routes.csv", "routes.csv", "Routes.csv"],
            "Route_Stops": ["mvsr_stops.csv", "stops.csv", "Route_Stops.csv"],
        }
        result: dict[str, list[dict[str, str]]] = {}
        for sheet_name, candidate_files in sheet_map.items():
            for cand in candidate_files:
                cand_path = path / cand
                if cand_path.is_file():
                    with open(cand_path, "r", encoding="utf-8-sig") as sf:
                        reader = csv.DictReader(sf)
                        result[sheet_name] = [dict(row) for row in reader]
                    break
        if result:
            return result

    try:
        archive = zipfile.ZipFile(path)
    except (OSError, zipfile.BadZipFile) as error:
        fail(f"Could not open the Excel workbook: {error}")

    with archive:
        workbook = ElementTree.fromstring(archive.read("xl/workbook.xml"))
        relationships = ElementTree.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        relationship_targets = {
            entry.attrib["Id"]: entry.attrib["Target"] for entry in relationships
        }
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared_root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
            shared_strings = [
                "".join(text.text or "" for text in item.findall(".//main:t", NAMESPACES))
                for item in shared_root.findall("main:si", NAMESPACES)
            ]

        result: dict[str, list[dict[str, str]]] = {}
        for sheet in workbook.findall("main:sheets/main:sheet", NAMESPACES):
            relation_id = sheet.attrib[f"{{{NAMESPACES['relationships']}}}id"]
            target = relationship_targets[relation_id].lstrip("/")
            if not target.startswith("xl/"):
                target = f"xl/{target}"
            root = ElementTree.fromstring(archive.read(target))
            raw_rows: list[list[str]] = []
            for row in root.findall(".//main:sheetData/main:row", NAMESPACES):
                cells = row.findall("main:c", NAMESPACES)
                values = [""] * (max((column_index(cell.attrib["r"]) for cell in cells), default=-1) + 1)
                for cell in cells:
                    value = cell.find("main:v", NAMESPACES)
                    inline = cell.find("main:is", NAMESPACES)
                    text = (
                        "".join(item.text or "" for item in inline.findall(".//main:t", NAMESPACES))
                        if inline is not None
                        else value.text if value is not None else ""
                    )
                    if cell.attrib.get("t") == "s" and text:
                        text = shared_strings[int(text)]
                    values[column_index(cell.attrib["r"])] = text
                raw_rows.append(values)
            if not raw_rows:
                result[sheet.attrib["name"]] = []
                continue
            headers = raw_rows[0]
            result[sheet.attrib["name"]] = [
                {
                    headers[index]: row[index] if index < len(row) else ""
                    for index in range(len(headers))
                    if headers[index]
                }
                for row in raw_rows[1:]
                if any(row)
            ]
        return result


def require(condition: bool, message: str) -> None:
    if not condition:
        fail(message)


def validate_dataset(sheets: dict[str, list[dict[str, str]]]) -> None:
    required = {"Students", "Drivers", "Parent_Test_Accounts", "Routes", "Route_Stops"}
    require(required.issubset(sheets), f"Workbook is missing sheets: {', '.join(sorted(required - set(sheets)))}")
    students = sheets["Students"]
    parents = sheets["Parent_Test_Accounts"]
    drivers = sheets["Drivers"]
    routes = sheets["Routes"]
    stops = sheets["Route_Stops"]
    required_columns = {
        "Students": {
            "student_id", "password_test_only", "student_name", "college", "department",
            "year", "section", "parent_id", "route_id", "status",
        },
        "Parent_Test_Accounts": {
            "parent_id", "parent_email_test", "password_test_only", "linked_student_id",
            "relationship", "consent_status", "status",
        },
        "Drivers": {
            "driver_id", "password_test_only", "driver_name", "organization",
            "assigned_route_id", "vehicle_id", "status",
        },
        "Routes": {
            "route_id", "route_name", "assigned_driver_id", "vehicle_id", "route_status", "note",
        },
        "Route_Stops": {
            "stop_id", "route_id", "stop_order", "stop_name", "latitude", "longitude", "note",
        },
    }
    for sheet_name, columns in required_columns.items():
        records = sheets[sheet_name]
        require(
            all(columns.issubset(record) for record in records),
            f"Sheet {sheet_name} is missing one or more required columns.",
        )

    require(
        {record.get("student_id", "") for record in students} == EXPECTED_STUDENT_IDS
        and len(students) == 123,
        "Expected exactly 123 distinct student IDs from 2451-23-737-001 through -123.",
    )
    require(len(parents) == 123, "Expected exactly 123 synthetic parent accounts.")
    require(
        {record.get("parent_id", "") for record in parents} == EXPECTED_PARENT_IDS
        and len(parents) == 123,
        "Expected exactly MVSR-PARENT-001 through MVSR-PARENT-123.",
    )
    require(len(drivers) == 1 and drivers[0].get("driver_id") == TEST_DRIVER_ID, "The workbook must contain the fixed test driver.")
    require(len(routes) == 1 and routes[0].get("route_id") == TEST_ROUTE_ID, "The workbook must contain MVSR-ROUTE-01.")
    require(len(stops) == 5, "Expected five route stops.")
    require(
        all(is_mvsr_institution(record.get("college")) for record in students)
        and is_mvsr_institution(drivers[0].get("organization", "")),
        "The workbook must contain only MVSR Engineering College students and its test driver.",
    )
    require(
        routes[0].get("assigned_driver_id") == TEST_DRIVER_ID
        and routes[0].get("vehicle_id") == TEST_VEHICLE_ID
        and drivers[0].get("assigned_route_id") == TEST_ROUTE_ID
        and drivers[0].get("vehicle_id") == TEST_VEHICLE_ID,
        "The driver, route, and vehicle assignments must match the fixed MVSR test account.",
    )
    for sheet_name, records, columns in (
        ("Students", students, ("student_id", "student_name", "college", "department", "year", "section", "parent_id", "route_id")),
        ("Parent_Test_Accounts", parents, ("parent_id", "parent_email_test", "linked_student_id")),
        ("Drivers", drivers, ("driver_id", "driver_name", "assigned_route_id", "vehicle_id")),
        ("Routes", routes, ("route_id", "route_name", "assigned_driver_id", "vehicle_id", "route_status")),
        ("Route_Stops", stops, ("stop_id", "route_id", "stop_order", "stop_name")),
    ):
        require(
            all(record.get(column) for record in records for column in columns),
            f"Sheet {sheet_name} contains a blank required value.",
        )

    parent_by_id = {record.get("parent_id"): record for record in parents}
    for student in students:
        student_id = student["student_id"]
        parent = parent_by_id.get(student.get("parent_id"))
        require(parent is not None, f"{student_id} refers to a parent missing from the workbook.")
        require(
            parent.get("linked_student_id") == student_id,
            f"{student_id} does not match the parent's linked_student_id.",
        )
        require(
            parent.get("password_test_only") == "Parent@123",
            f"The test parent password does not match {parent['parent_id']}.",
        )
        require(
            student.get("password_test_only") == student_id,
            f"The test password does not match {student_id}.",
        )
    require(
        drivers[0].get("password_test_only") == "Driver@123"
        and drivers[0].get("vehicle_id") == TEST_VEHICLE_ID
        and drivers[0].get("assigned_route_id") == TEST_ROUTE_ID,
        "The fixed driver credentials or assignment do not match the requested test account.",
    )
    require(all(not stop.get("latitude") and not stop.get("longitude") for stop in stops), "The workbook unexpectedly contains coordinates; verify them before importing.")


def make_qr_svg(token: str) -> str:
    try:
        import qrcode
        from qrcode.image.svg import SvgPathImage
    except ImportError:
        fail("Install the seed-only QR dependency with: python -m pip install -r scripts\\requirements-seed.txt")
    code = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=5, border=2)
    code.add_data(token)
    code.make(fit=True)
    return code.make_image(image_factory=SvgPathImage).to_string().decode("utf-8")


class SupabaseAdmin:
    def __init__(self, project_url: str, service_key: str):
        self.project_url = project_url.rstrip("/")
        self.service_key = service_key

    def request(self, method: str, path: str, body: object | None = None, prefer: str | None = None):
        headers = {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json",
        }
        if prefer:
            headers["Prefer"] = prefer
        data = json.dumps(body).encode() if body is not None else None
        request = urllib.request.Request(
            f"{self.project_url}{path}", data=data, headers=headers, method=method
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                content = response.read()
                return json.loads(content) if content else None
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            fail(f"Supabase request failed ({error.code}) for {path}: {detail[:500]}")
        except urllib.error.URLError as error:
            fail(f"Could not connect to the configured Supabase project: {error.reason}")

    def table(self, name: str, select: str, filters: str = ""):
        query = urllib.parse.urlencode({"select": select}, safe="(),.*")
        if filters:
            query = f"{query}&{filters}"
        return self.request("GET", f"/rest/v1/{name}?{query}")

    def upsert(self, name: str, records: list[dict[str, object]], conflict: str) -> None:
        if not records:
            return
        query = urllib.parse.urlencode({"on_conflict": conflict})
        self.request(
            "POST",
            f"/rest/v1/{name}?{query}",
            records,
            "resolution=merge-duplicates,return=minimal",
        )

    def auth_users(self) -> dict[str, dict[str, object]]:
        users: dict[str, dict[str, object]] = {}
        page = 1
        while True:
            response = self.request(
                "GET", f"/auth/v1/admin/users?page={page}&per_page=1000"
            )
            batch = response.get("users", []) if isinstance(response, dict) else []
            for user in batch:
                email = user.get("email")
                if email:
                    users[email.lower()] = user
            if len(batch) < 1000:
                return users
            page += 1

    def ensure_user(self, email: str, password: str, app_metadata: dict[str, object], users: dict[str, dict[str, object]]) -> str:
        existing = users.get(email.lower())
        account_id = app_metadata.get("student_id") or app_metadata.get("parent_id") or app_metadata.get("driver_id")
        role = app_metadata["intellibus_role"]
        if existing:
            current_metadata = existing.get("app_metadata") or {}
            if (
                current_metadata.get("mvsr_test_account") is not True
                or current_metadata.get("intellibus_role") != role
                or current_metadata.get("student_id") != app_metadata.get("student_id")
                or current_metadata.get("parent_id") != app_metadata.get("parent_id")
                or current_metadata.get("driver_id") != app_metadata.get("driver_id")
            ):
                fail(f"Refusing to overwrite an existing non-matching Auth account: {email}")
            account_id = existing["id"]
            self.request(
                "PUT",
                f"/auth/v1/admin/users/{account_id}",
                {
                    "password": password,
                    "email_confirm": True,
                    "app_metadata": app_metadata,
                },
            )
            existing.update({"app_metadata": app_metadata})
            return str(account_id)

        created = self.request(
            "POST",
            "/auth/v1/admin/users",
            {
                "email": email,
                "password": password,
                "email_confirm": True,
                "app_metadata": app_metadata,
            },
        )
        users[email.lower()] = created
        return str(created["id"])


PROFILE_COLUMNS = (
    "user_id,role,student_id,student_level,driver_id,parent_id,parent_email,institution,"
    "route_id,qr_token,qr_svg,pickup_stop_id,drop_stop_id,username"
)


def preflight_schema(admin: SupabaseAdmin) -> None:
    requirements = {
        "intellibus_profiles": (
            "user_id,role,student_id,student_level,driver_id,parent_id,parent_email,"
            "student_name,institution,department,academic_year,section,route_id,"
            "pickup_stop_id,drop_stop_id,qr_token,qr_svg"
        ),
        "parent_student_links": "parent_user_id,student_user_id",
        "intellibus_routes": "route_id,route_name,assigned_driver_id,vehicle_id,route_status,dataset_code",
        "intellibus_route_stops": "stop_id,route_id,stop_order,stop_name,latitude,longitude",
    }
    for table, columns in requirements.items():
        admin.table(table, columns, "limit=0")


def seed(path: Path, apply_changes: bool) -> None:
    sheets = workbook_sheets(path)
    validate_dataset(sheets)
    students = sheets["Students"]
    parents = sheets["Parent_Test_Accounts"]
    driver = sheets["Drivers"][0]
    routes = sheets["Routes"]
    stops = sheets["Route_Stops"]
    if not apply_changes:
        print(
            "Workbook validated: 123 students, 123 linked parents, 1 fixed driver, "
            f"{len(routes)} route, {len(stops)} stops; no Supabase data changed."
        )
        return

    project_url = os.environ.get("SUPABASE_URL", "")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    parsed_url = urlparse(project_url)
    require(
        parsed_url.scheme in {"http", "https"}
        and parsed_url.hostname in {"localhost", "127.0.0.1", "::1"},
        "Test accounts may only be imported into a local loopback Supabase instance.",
    )
    require(bool(service_key), "Set SUPABASE_SERVICE_ROLE_KEY in the trusted local shell; never use a frontend VITE_ variable.")
    admin = SupabaseAdmin(project_url, service_key)

    preflight_schema(admin)
    student_filter = f"student_id=in.({','.join(sorted(EXPECTED_STUDENT_IDS))})"
    parent_ids = [record["parent_id"] for record in sheets["Parent_Test_Accounts"]]
    parent_emails = [record["parent_email_test"] for record in sheets["Parent_Test_Accounts"]]
    driver_id_value = driver["driver_id"]
    existing_profiles = []
    for filter_value in (
        student_filter,
        f"parent_id=in.({','.join(parent_ids)})",
        f"parent_email=in.({','.join(parent_emails)})",
        f"driver_id=eq.{driver_id_value}",
    ):
        existing_profiles.extend(admin.table("intellibus_profiles", PROFILE_COLUMNS, filter_value))
    profile_by_student = {row["student_id"]: row for row in existing_profiles if row.get("student_id")}
    profile_by_parent = {row["parent_id"]: row for row in existing_profiles if row.get("parent_id")}
    profile_by_parent_email = {
        row["parent_email"].lower(): row
        for row in existing_profiles
        if row.get("parent_email")
    }
    profile_by_driver = {row["driver_id"]: row for row in existing_profiles if row.get("driver_id")}
    existing_route = admin.table(
        "intellibus_routes",
        "route_id,route_name,assigned_driver_id,vehicle_id,route_status,dataset_code",
        f"route_id=eq.{TEST_ROUTE_ID}",
    )
    existing_stops = admin.table(
        "intellibus_route_stops",
        "stop_id,route_id,stop_order,stop_name,latitude,longitude",
        f"stop_id=in.({','.join(stop['stop_id'] for stop in sheets['Route_Stops'])})",
    )
    existing_stops_by_id = {row["stop_id"]: row for row in existing_stops}
    route = routes[0]
    if existing_route:
        existing = existing_route[0]
        for key in ("route_name", "assigned_driver_id", "vehicle_id", "route_status"):
            require(
                existing[key] == route[key],
                f"Route {route['route_id']} already exists with different {key}; it was not overwritten.",
            )
        require(
            existing["dataset_code"] in (None, TEST_DATASET_CODE),
            f"Route {route['route_id']} belongs to a different dataset; it was not overwritten.",
        )
    for stop in stops:
        existing = existing_stops_by_id.get(stop["stop_id"])
        if existing:
            require(
                existing["route_id"] == stop["route_id"]
                and int(existing["stop_order"]) == int(stop["stop_order"])
                and existing["stop_name"] == stop["stop_name"],
                f"Stop {stop['stop_id']} already exists with different route details; it was not overwritten.",
            )
    user_by_email = admin.auth_users()

    accounts: list[tuple[str, str, dict[str, object]]] = []
    account_by_student: dict[str, str] = {}
    account_by_parent: dict[str, str] = {}
    account_by_driver: dict[str, str] = {}
    for student in students:
        student_id = student["student_id"]
        email = f"{student_id}@students.mvsr.intellibus.test"
        metadata = {
            "intellibus_role": "student",
            "student_id": student_id,
            "student_level": "engineering-student",
            "mvsr_test_account": True,
        }
        accounts.append((email, student["password_test_only"], metadata))
    for parent in parents:
        metadata = {
            "intellibus_role": "parent",
            "parent_id": parent["parent_id"],
            "mvsr_test_account": True,
        }
        accounts.append((parent["parent_email_test"], parent["password_test_only"], metadata))
    driver_metadata = {
        "intellibus_role": "school-driver",
        "driver_id": driver["driver_id"],
        "mvsr_test_account": True,
    }
    accounts.append(
        (
            f"{driver['driver_id'].lower()}@drivers.mvsr.intellibus.test",
            driver["password_test_only"],
            driver_metadata,
        )
    )

    intended_emails = {email.lower() for email, _, _ in accounts}
    student_institution_by_id = {
        record["student_id"]: record["college"] for record in students
    }
    for email, _, metadata in accounts:
        existing = user_by_email.get(email.lower())
        if existing:
            user_metadata = existing.get("app_metadata") or {}
            matching_metadata = all(
                user_metadata.get(key) == value
                for key, value in metadata.items()
                if key != "mvsr_test_account"
            )
            require(user_metadata.get("mvsr_test_account") is True and matching_metadata, f"Refusing to overwrite existing account {email}.")
        student_id = metadata.get("student_id")
        parent_id = metadata.get("parent_id")
        driver_id = metadata.get("driver_id")
        if student_id in profile_by_student:
            require(
                profile_by_student[student_id]["user_id"] == (existing or {}).get("id"),
                f"Student ID already belongs to another account: {student_id}",
            )
            existing_profile = profile_by_student[student_id]
            require(
                existing_profile["role"] == "student"
                and existing_profile["student_level"] == "engineering-student"
                and existing_profile.get("institution") in (
                    None,
                    student_institution_by_id[student_id],
                ),
                f"Student profile conflicts with the MVSR dataset: {student_id}",
            )
        if parent_id in profile_by_parent:
            require(
                profile_by_parent[parent_id]["user_id"] == (existing or {}).get("id"),
                f"Parent ID already belongs to another account: {parent_id}",
            )
            require(
                profile_by_parent[parent_id]["role"] == "parent",
                f"Parent profile conflicts with the MVSR dataset: {parent_id}",
            )
        parent_email = email.lower() if parent_id else None
        if parent_email in profile_by_parent_email:
            require(
                profile_by_parent_email[parent_email]["user_id"] == (existing or {}).get("id"),
                f"Parent email already belongs to another account: {email}",
            )
        if driver_id in profile_by_driver:
            require(
                profile_by_driver[driver_id]["user_id"] == (existing or {}).get("id"),
                f"Driver ID already belongs to another account: {driver_id}",
            )
            existing_driver = profile_by_driver[driver_id]
            require(
                existing_driver["role"] == "school-driver"
                and existing_driver.get("institution") in (None, TEST_INSTITUTION),
                f"Driver profile conflicts with the MVSR dataset: {driver_id}",
            )
    require(len(intended_emails) == len(accounts), "Workbook accounts contain duplicate email addresses.")

    planned_qr = {}
    for student in students:
        existing_profile = profile_by_student.get(student["student_id"], {})
        token = existing_profile.get("qr_token") or str(uuid.uuid4())
        planned_qr[student["student_id"]] = (token, make_qr_svg(token))

    for email, password, metadata in accounts:
        user_id = admin.ensure_user(email, password, metadata, user_by_email)
        if "student_id" in metadata:
            account_by_student[str(metadata["student_id"])] = user_id
        elif "parent_id" in metadata:
            account_by_parent[str(metadata["parent_id"])] = user_id
        else:
            account_by_driver[str(metadata["driver_id"])] = user_id
    route_records = [
        {
            "route_id": route["route_id"],
            "route_name": route["route_name"],
            "assigned_driver_id": route["assigned_driver_id"],
            "vehicle_id": route["vehicle_id"],
            "route_status": route["route_status"],
            "dataset_code": TEST_DATASET_CODE,
        }
        for route in routes
    ]
    stop_records = [
        {
            "stop_id": stop["stop_id"],
            "route_id": stop["route_id"],
            "stop_order": int(stop["stop_order"]),
            "stop_name": stop["stop_name"],
            "latitude": existing_stops_by_id.get(stop["stop_id"], {}).get("latitude"),
            "longitude": existing_stops_by_id.get(stop["stop_id"], {}).get("longitude"),
        }
        for stop in stops
    ]
    admin.upsert("intellibus_routes", route_records, "route_id")
    admin.upsert("intellibus_route_stops", stop_records, "stop_id")

    imported_user_ids = [*account_by_student.values(), *account_by_parent.values(), *account_by_driver.values()]
    old_profiles = admin.table(
        "intellibus_profiles",
        "user_id,pickup_stop_id,drop_stop_id,username",
        f"user_id=in.({','.join(imported_user_ids)})",
    )
    old_profiles_by_id = {row["user_id"]: row for row in old_profiles}
    profile_records: list[dict[str, object]] = []
    for student in students:
        user_id = account_by_student[student["student_id"]]
        old_profile = old_profiles_by_id.get(user_id, {})
        qr_token, qr_svg = planned_qr[student["student_id"]]
        profile_records.append(
            {
                "user_id": user_id,
                "role": "student",
                "username": None,
                "student_id": student["student_id"],
                "student_level": "engineering-student",
                "student_name": student["student_name"],
                "institution": TEST_INSTITUTION,
                "department": student["department"],
                "academic_year": student["year"],
                "section": student["section"],
                "route_id": student["route_id"],
                "pickup_stop_id": old_profile.get("pickup_stop_id"),
                "drop_stop_id": old_profile.get("drop_stop_id"),
                "qr_token": qr_token,
                "qr_svg": qr_svg,
                "parent_id": None,
                "parent_email": None,
                "driver_id": None,
            }
        )
    for parent in parents:
        profile_records.append(
            {
                "user_id": account_by_parent[parent["parent_id"]],
                "role": "parent",
                "username": old_profiles_by_id.get(account_by_parent[parent["parent_id"]], {}).get("username"),
                "parent_id": parent["parent_id"],
                "parent_email": parent["parent_email_test"],
                "student_id": None,
                "student_level": None,
                "driver_id": None,
                "student_name": None,
                "institution": None,
                "department": None,
                "academic_year": None,
                "section": None,
                "route_id": None,
                "pickup_stop_id": None,
                "drop_stop_id": None,
                "qr_token": None,
                "qr_svg": None,
            }
        )
    profile_records.append(
        {
            "user_id": account_by_driver[driver["driver_id"]],
            "role": "school-driver",
            "username": None,
            "driver_id": driver["driver_id"],
            "institution": TEST_INSTITUTION,
            "student_id": None,
            "student_level": None,
            "parent_id": None,
            "parent_email": None,
            "student_name": None,
            "department": None,
            "academic_year": None,
            "section": None,
            "route_id": None,
            "pickup_stop_id": None,
            "drop_stop_id": None,
            "qr_token": None,
            "qr_svg": None,
        }
    )
    admin.upsert("intellibus_profiles", profile_records, "user_id")

    link_records = [
        {
            "parent_user_id": account_by_parent[parent["parent_id"]],
            "student_user_id": account_by_student[parent["linked_student_id"]],
        }
        for parent in parents
    ]
    admin.upsert("parent_student_links", link_records, "parent_user_id,student_user_id")
    print(
        "Supabase import complete: 123 students, 123 parents, 1 driver, "
        f"{len(route_records)} route, {len(stop_records)} stops, {len(link_records)} parent links."
    )
    print("Passwords were sent only to Supabase Auth for hashing; no password column was written.")
    print("The workbook has no stop coordinates; any previously configured coordinates were preserved.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workbook", type=Path, help="Path to MVSR_IntelliBus_Test_Dataset.xlsx")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate workbook contents and report counts without contacting Supabase.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Create/update only matching synthetic test accounts and related records.",
    )
    arguments = parser.parse_args()
    try:
        if arguments.check and arguments.apply:
            fail("Choose either --check or --apply, not both.")
        seed(arguments.workbook, arguments.apply)
    except (OSError, RuntimeError, KeyError, ValueError, ElementTree.ParseError, zipfile.BadZipFile) as error:
        print(f"Seed process stopped: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
