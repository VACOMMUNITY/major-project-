#!/usr/bin/env python3
"""Generate the MVSR_IntelliBus_Test_Dataset.xlsx workbook from synthetic test records."""

import csv
import io
import os
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

STUDENTS_CSV = """student_id,password_test_only,student_name,college,department,year,section,parent_id,route_id,status
2451-23-737-001,2451-23-737-001,Test Student 001,MVSR Engineering College,CSE,1st Year,A,MVSR-PARENT-001,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-002,2451-23-737-002,Test Student 002,MVSR Engineering College,IT,2nd Year,B,MVSR-PARENT-002,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-003,2451-23-737-003,Test Student 003,MVSR Engineering College,ECE,3rd Year,C,MVSR-PARENT-003,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-004,2451-23-737-004,Test Student 004,MVSR Engineering College,EEE,4th Year,A,MVSR-PARENT-004,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-005,2451-23-737-005,Test Student 005,MVSR Engineering College,Mechanical,1st Year,B,MVSR-PARENT-005,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-006,2451-23-737-006,Test Student 006,MVSR Engineering College,CSE,2nd Year,C,MVSR-PARENT-006,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-007,2451-23-737-007,Test Student 007,MVSR Engineering College,IT,3rd Year,A,MVSR-PARENT-007,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-008,2451-23-737-008,Test Student 008,MVSR Engineering College,ECE,4th Year,B,MVSR-PARENT-008,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-009,2451-23-737-009,Test Student 009,MVSR Engineering College,EEE,1st Year,C,MVSR-PARENT-009,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-010,2451-23-737-010,Test Student 010,MVSR Engineering College,Mechanical,2nd Year,A,MVSR-PARENT-010,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-011,2451-23-737-011,Test Student 011,MVSR Engineering College,CSE,3rd Year,B,MVSR-PARENT-011,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-012,2451-23-737-012,Test Student 012,MVSR Engineering College,IT,4th Year,C,MVSR-PARENT-012,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-013,2451-23-737-013,Test Student 013,MVSR Engineering College,ECE,1st Year,A,MVSR-PARENT-013,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-014,2451-23-737-014,Test Student 014,MVSR Engineering College,EEE,2nd Year,B,MVSR-PARENT-014,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-015,2451-23-737-015,Test Student 015,MVSR Engineering College,Mechanical,3rd Year,C,MVSR-PARENT-015,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-016,2451-23-737-016,Test Student 016,MVSR Engineering College,CSE,4th Year,A,MVSR-PARENT-016,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-017,2451-23-737-017,Test Student 017,MVSR Engineering College,IT,1st Year,B,MVSR-PARENT-017,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-018,2451-23-737-018,Test Student 018,MVSR Engineering College,ECE,2nd Year,C,MVSR-PARENT-018,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-019,2451-23-737-019,Test Student 019,MVSR Engineering College,EEE,3rd Year,A,MVSR-PARENT-019,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-020,2451-23-737-020,Test Student 020,MVSR Engineering College,Mechanical,4th Year,B,MVSR-PARENT-020,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-021,2451-23-737-021,Test Student 021,MVSR Engineering College,CSE,1st Year,C,MVSR-PARENT-021,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-022,2451-23-737-022,Test Student 022,MVSR Engineering College,IT,2nd Year,A,MVSR-PARENT-022,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-023,2451-23-737-023,Test Student 023,MVSR Engineering College,ECE,3rd Year,B,MVSR-PARENT-023,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-024,2451-23-737-024,Test Student 024,MVSR Engineering College,EEE,4th Year,C,MVSR-PARENT-024,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-025,2451-23-737-025,Test Student 025,MVSR Engineering College,Mechanical,1st Year,A,MVSR-PARENT-025,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-026,2451-23-737-026,Test Student 026,MVSR Engineering College,CSE,2nd Year,B,MVSR-PARENT-026,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-027,2451-23-737-027,Test Student 027,MVSR Engineering College,IT,3rd Year,C,MVSR-PARENT-027,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-028,2451-23-737-028,Test Student 028,MVSR Engineering College,ECE,4th Year,A,MVSR-PARENT-028,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-029,2451-23-737-029,Test Student 029,MVSR Engineering College,EEE,1st Year,B,MVSR-PARENT-029,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-030,2451-23-737-030,Test Student 030,MVSR Engineering College,Mechanical,2nd Year,C,MVSR-PARENT-030,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-031,2451-23-737-031,Test Student 031,MVSR Engineering College,CSE,3rd Year,A,MVSR-PARENT-031,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-032,2451-23-737-032,Test Student 032,MVSR Engineering College,IT,4th Year,B,MVSR-PARENT-032,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-033,2451-23-737-033,Test Student 033,MVSR Engineering College,ECE,1st Year,C,MVSR-PARENT-033,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-034,2451-23-737-034,Test Student 034,MVSR Engineering College,EEE,2nd Year,A,MVSR-PARENT-034,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-035,2451-23-737-035,Test Student 035,MVSR Engineering College,Mechanical,3rd Year,B,MVSR-PARENT-035,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-036,2451-23-737-036,Test Student 036,MVSR Engineering College,CSE,4th Year,C,MVSR-PARENT-036,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-037,2451-23-737-037,Test Student 037,MVSR Engineering College,IT,1st Year,A,MVSR-PARENT-037,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-038,2451-23-737-038,Test Student 038,MVSR Engineering College,ECE,2nd Year,B,MVSR-PARENT-038,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-039,2451-23-737-039,Test Student 039,MVSR Engineering College,EEE,3rd Year,C,MVSR-PARENT-039,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-040,2451-23-737-040,Test Student 040,MVSR Engineering College,Mechanical,4th Year,A,MVSR-PARENT-040,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-041,2451-23-737-041,Test Student 041,MVSR Engineering College,CSE,1st Year,B,MVSR-PARENT-041,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-042,2451-23-737-042,Test Student 042,MVSR Engineering College,IT,2nd Year,C,MVSR-PARENT-042,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-043,2451-23-737-043,Test Student 043,MVSR Engineering College,ECE,3rd Year,A,MVSR-PARENT-043,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-044,2451-23-737-044,Test Student 044,MVSR Engineering College,EEE,4th Year,B,MVSR-PARENT-044,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-045,2451-23-737-045,Test Student 045,MVSR Engineering College,Mechanical,1st Year,C,MVSR-PARENT-045,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-046,2451-23-737-046,Test Student 046,MVSR Engineering College,CSE,2nd Year,A,MVSR-PARENT-046,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-047,2451-23-737-047,Test Student 047,MVSR Engineering College,IT,3rd Year,B,MVSR-PARENT-047,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-048,2451-23-737-048,Test Student 048,MVSR Engineering College,ECE,4th Year,C,MVSR-PARENT-048,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-049,2451-23-737-049,Test Student 049,MVSR Engineering College,EEE,1st Year,A,MVSR-PARENT-049,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-050,2451-23-737-050,Test Student 050,MVSR Engineering College,Mechanical,2nd Year,B,MVSR-PARENT-050,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-051,2451-23-737-051,Test Student 051,MVSR Engineering College,CSE,3rd Year,C,MVSR-PARENT-051,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-052,2451-23-737-052,Test Student 052,MVSR Engineering College,IT,4th Year,A,MVSR-PARENT-052,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-053,2451-23-737-053,Test Student 053,MVSR Engineering College,ECE,1st Year,B,MVSR-PARENT-053,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-054,2451-23-737-054,Test Student 054,MVSR Engineering College,EEE,2nd Year,C,MVSR-PARENT-054,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-055,2451-23-737-055,Test Student 055,MVSR Engineering College,Mechanical,3rd Year,A,MVSR-PARENT-055,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-056,2451-23-737-056,Test Student 056,MVSR Engineering College,CSE,4th Year,B,MVSR-PARENT-056,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-057,2451-23-737-057,Test Student 057,MVSR Engineering College,IT,1st Year,C,MVSR-PARENT-057,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-058,2451-23-737-058,Test Student 058,MVSR Engineering College,ECE,2nd Year,A,MVSR-PARENT-058,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-059,2451-23-737-059,Test Student 059,MVSR Engineering College,EEE,3rd Year,B,MVSR-PARENT-059,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-060,2451-23-737-060,Test Student 060,MVSR Engineering College,Mechanical,4th Year,C,MVSR-PARENT-060,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-061,2451-23-737-061,Test Student 061,MVSR Engineering College,CSE,1st Year,A,MVSR-PARENT-061,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-062,2451-23-737-062,Test Student 062,MVSR Engineering College,IT,2nd Year,B,MVSR-PARENT-062,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-063,2451-23-737-063,Test Student 063,MVSR Engineering College,ECE,3rd Year,C,MVSR-PARENT-063,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-064,2451-23-737-064,Test Student 064,MVSR Engineering College,EEE,4th Year,A,MVSR-PARENT-064,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-065,2451-23-737-065,Test Student 065,MVSR Engineering College,Mechanical,1st Year,B,MVSR-PARENT-065,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-066,2451-23-737-066,Test Student 066,MVSR Engineering College,CSE,2nd Year,C,MVSR-PARENT-066,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-067,2451-23-737-067,Test Student 067,MVSR Engineering College,IT,3rd Year,A,MVSR-PARENT-067,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-068,2451-23-737-068,Test Student 068,MVSR Engineering College,ECE,4th Year,B,MVSR-PARENT-068,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-069,2451-23-737-069,Test Student 069,MVSR Engineering College,EEE,1st Year,C,MVSR-PARENT-069,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-070,2451-23-737-070,Test Student 070,MVSR Engineering College,Mechanical,2nd Year,A,MVSR-PARENT-070,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-071,2451-23-737-071,Test Student 071,MVSR Engineering College,CSE,3rd Year,B,MVSR-PARENT-071,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-072,2451-23-737-072,Test Student 072,MVSR Engineering College,IT,4th Year,C,MVSR-PARENT-072,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-073,2451-23-737-073,Test Student 073,MVSR Engineering College,ECE,1st Year,A,MVSR-PARENT-073,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-074,2451-23-737-074,Test Student 074,MVSR Engineering College,EEE,2nd Year,B,MVSR-PARENT-074,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-075,2451-23-737-075,Test Student 075,MVSR Engineering College,Mechanical,3rd Year,C,MVSR-PARENT-075,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-076,2451-23-737-076,Test Student 076,MVSR Engineering College,CSE,4th Year,A,MVSR-PARENT-076,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-077,2451-23-737-077,Test Student 077,MVSR Engineering College,IT,1st Year,B,MVSR-PARENT-077,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-078,2451-23-737-078,Test Student 078,MVSR Engineering College,ECE,2nd Year,C,MVSR-PARENT-078,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-079,2451-23-737-079,Test Student 079,MVSR Engineering College,EEE,3rd Year,A,MVSR-PARENT-079,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-080,2451-23-737-080,Test Student 080,MVSR Engineering College,Mechanical,4th Year,B,MVSR-PARENT-080,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-081,2451-23-737-081,Test Student 081,MVSR Engineering College,CSE,1st Year,C,MVSR-PARENT-081,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-082,2451-23-737-082,Test Student 082,MVSR Engineering College,IT,2nd Year,A,MVSR-PARENT-082,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-083,2451-23-737-083,Test Student 083,MVSR Engineering College,ECE,3rd Year,B,MVSR-PARENT-083,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-084,2451-23-737-084,Test Student 084,MVSR Engineering College,EEE,4th Year,C,MVSR-PARENT-084,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-085,2451-23-737-085,Test Student 085,MVSR Engineering College,Mechanical,1st Year,A,MVSR-PARENT-085,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-086,2451-23-737-086,Test Student 086,MVSR Engineering College,CSE,2nd Year,B,MVSR-PARENT-086,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-087,2451-23-737-087,Test Student 087,MVSR Engineering College,IT,3rd Year,C,MVSR-PARENT-087,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-088,2451-23-737-088,Test Student 088,MVSR Engineering College,ECE,4th Year,A,MVSR-PARENT-088,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-089,2451-23-737-089,Test Student 089,MVSR Engineering College,EEE,1st Year,B,MVSR-PARENT-089,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-090,2451-23-737-090,Test Student 090,MVSR Engineering College,Mechanical,2nd Year,C,MVSR-PARENT-090,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-091,2451-23-737-091,Test Student 091,MVSR Engineering College,CSE,3rd Year,A,MVSR-PARENT-091,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-092,2451-23-737-092,Test Student 092,MVSR Engineering College,IT,4th Year,B,MVSR-PARENT-092,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-093,2451-23-737-093,Test Student 093,MVSR Engineering College,ECE,1st Year,C,MVSR-PARENT-093,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-094,2451-23-737-094,Test Student 094,MVSR Engineering College,EEE,2nd Year,A,MVSR-PARENT-094,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-095,2451-23-737-095,Test Student 095,MVSR Engineering College,Mechanical,3rd Year,B,MVSR-PARENT-095,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-096,2451-23-737-096,Test Student 096,MVSR Engineering College,CSE,4th Year,C,MVSR-PARENT-096,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-097,2451-23-737-097,Test Student 097,MVSR Engineering College,IT,1st Year,A,MVSR-PARENT-097,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-098,2451-23-737-098,Test Student 098,MVSR Engineering College,ECE,2nd Year,B,MVSR-PARENT-098,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-099,2451-23-737-099,Test Student 099,MVSR Engineering College,EEE,3rd Year,C,MVSR-PARENT-099,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-100,2451-23-737-100,Test Student 100,MVSR Engineering College,Mechanical,4th Year,A,MVSR-PARENT-100,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-101,2451-23-737-101,Test Student 101,MVSR Engineering College,CSE,1st Year,B,MVSR-PARENT-101,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-102,2451-23-737-102,Test Student 102,MVSR Engineering College,IT,2nd Year,C,MVSR-PARENT-102,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-103,2451-23-737-103,Test Student 103,MVSR Engineering College,ECE,3rd Year,A,MVSR-PARENT-103,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-104,2451-23-737-104,Test Student 104,MVSR Engineering College,EEE,4th Year,B,MVSR-PARENT-104,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-105,2451-23-737-105,Test Student 105,MVSR Engineering College,Mechanical,1st Year,C,MVSR-PARENT-105,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-106,2451-23-737-106,Test Student 106,MVSR Engineering College,CSE,2nd Year,A,MVSR-PARENT-106,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-107,2451-23-737-107,Test Student 107,MVSR Engineering College,IT,3rd Year,B,MVSR-PARENT-107,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-108,2451-23-737-108,Test Student 108,MVSR Engineering College,ECE,4th Year,C,MVSR-PARENT-108,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-109,2451-23-737-109,Test Student 109,MVSR Engineering College,EEE,1st Year,A,MVSR-PARENT-109,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-110,2451-23-737-110,Test Student 110,MVSR Engineering College,Mechanical,2nd Year,B,MVSR-PARENT-110,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-111,2451-23-737-111,Test Student 111,MVSR Engineering College,CSE,3rd Year,C,MVSR-PARENT-111,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-112,2451-23-737-112,Test Student 112,MVSR Engineering College,IT,4th Year,A,MVSR-PARENT-112,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-113,2451-23-737-113,Test Student 113,MVSR Engineering College,ECE,1st Year,B,MVSR-PARENT-113,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-114,2451-23-737-114,Test Student 114,MVSR Engineering College,EEE,2nd Year,C,MVSR-PARENT-114,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-115,2451-23-737-115,Test Student 115,MVSR Engineering College,Mechanical,3rd Year,A,MVSR-PARENT-115,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-116,2451-23-737-116,Test Student 116,MVSR Engineering College,CSE,4th Year,B,MVSR-PARENT-116,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-117,2451-23-737-117,Test Student 117,MVSR Engineering College,IT,1st Year,C,MVSR-PARENT-117,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-118,2451-23-737-118,Test Student 118,MVSR Engineering College,ECE,2nd Year,A,MVSR-PARENT-118,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-119,2451-23-737-119,Test Student 119,MVSR Engineering College,EEE,3rd Year,B,MVSR-PARENT-119,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-120,2451-23-737-120,Test Student 120,MVSR Engineering College,Mechanical,4th Year,C,MVSR-PARENT-120,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-121,2451-23-737-121,Test Student 121,MVSR Engineering College,CSE,1st Year,A,MVSR-PARENT-121,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-122,2451-23-737-122,Test Student 122,MVSR Engineering College,IT,2nd Year,B,MVSR-PARENT-122,MVSR-ROUTE-01,ACTIVE_TEST
2451-23-737-123,2451-23-737-123,Test Student 123,MVSR Engineering College,ECE,3rd Year,C,MVSR-PARENT-123,MVSR-ROUTE-01,ACTIVE_TEST"""

DRIVERS_CSV = """driver_id,password_test_only,driver_name,organization,assigned_route_id,vehicle_id,status
MVSR-DRV-001,Driver@123,Test Driver 001,MVSR Engineering College,MVSR-ROUTE-01,TEST-BUS-001,ACTIVE_TEST"""

PARENTS_CSV = """parent_id,parent_email_test,password_test_only,linked_student_id,relationship,consent_status,status
""" + "\n".join([
    f"MVSR-PARENT-{i:03d},parent{i:03d}@example.test,Parent@123,2451-23-737-{i:03d},Synthetic parent/guardian,NOT_COLLECTED,ACTIVE_TEST"
    for i in range(1, 124)
])

ROUTES_CSV = """route_id,route_name,assigned_driver_id,vehicle_id,route_status,note
MVSR-ROUTE-01,MVSR Test Campus Route,MVSR-DRV-001,TEST-BUS-001,TEST_ONLY,Placeholder route; add verified stops and coordinates before GPS testing."""

ROUTE_STOPS_CSV = """stop_id,route_id,stop_order,stop_name,latitude,longitude,note
MVSR-STOP-01,MVSR-ROUTE-01,1,Test Stop 01,,,Coordinates intentionally blank; add verified coordinates.
MVSR-STOP-02,MVSR-ROUTE-01,2,Test Stop 02,,,Coordinates intentionally blank; add verified coordinates.
MVSR-STOP-03,MVSR-ROUTE-01,3,Test Stop 03,,,Coordinates intentionally blank; add verified coordinates.
MVSR-STOP-04,MVSR-ROUTE-01,4,Test Stop 04,,,Coordinates intentionally blank; add verified coordinates.
MVSR-STOP-05,MVSR-ROUTE-01,5,Test Stop 05,,,Coordinates intentionally blank; add verified coordinates."""

SUMMARY_CSV = """Item,Details
Purpose,Synthetic test records for local development only.
Institution,MVSR Engineering College is only a requested test label. This is NOT an official college roster.
Student IDs,123 records: 2451-23-737-001 through 2451-23-737-123.
Student password,"For testing only, each password_test_only equals that student's student_id."
Fixed driver ID,MVSR-DRV-001
Driver test password,Driver@123
Parent test accounts,Synthetic parent accounts mapped one-to-one to the corresponding synthetic student; password Parent@123.
Route,MVSR-ROUTE-01 with five placeholder stops. Coordinates are blank.
Security,Never use these predictable passwords in production. Never store plaintext passwords in Supabase tables. Use Supabase Auth or a secure backend.
Privacy,All names and emails are synthetic. Do not import actual student personal information without authorization.
Biometrics,"Do not enroll real faces using this test dataset. Obtain informed consent and guardian consent where applicable, and use real server-side verification."
GPS/attendance,"Use test locations only until verified routes, QR issuance, driver assignment and permissions are configured."
Import guidance,Ask the coding agent to inspect the actual schema and create a safe seed script matching existing tables. Do not blindly import these columns."""


def escape_xml(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def col_name(index: int) -> str:
    result = ""
    index += 1
    while index > 0:
        index, remainder = divmod(index - 1, 26)
        result = chr(65 + remainder) + result
    return result


def make_sheet_xml(rows: list[list[str]]) -> str:
    out = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
        "<sheetData>",
    ]
    for r_idx, row in enumerate(rows, start=1):
        out.append(f'<row r="{r_idx}">')
        for c_idx, val in enumerate(row):
            cell_ref = f"{col_name(c_idx)}{r_idx}"
            if val is None or val == "":
                continue
            out.append(
                f'<c r="{cell_ref}" t="inlineStr"><is><t>{escape_xml(str(val))}</t></is></c>'
            )
        out.append("</row>")
    out.append("</sheetData>")
    out.append("</worksheet>")
    return "".join(out)


def build_xlsx(sheets: dict[str, list[list[str]]], output_path: Path):
    content_types = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
        '<Default Extension="xml" ContentType="application/xml"/>',
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
    ]

    workbook_rels = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    ]

    workbook_xml = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
        "<sheets>",
    ]

    sheet_xmls = {}
    for idx, (sheet_name, rows) in enumerate(sheets.items(), start=1):
        part_name = f"/xl/worksheets/sheet{idx}.xml"
        content_types.append(
            f'<Override PartName="{part_name}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        )
        workbook_rels.append(
            f'<Relationship Id="rId{idx}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{idx}.xml"/>'
        )
        workbook_xml.append(
            f'<sheet name="{escape_xml(sheet_name)}" sheetId="{idx}" r:id="rId{idx}"/>'
        )
        sheet_xmls[f"xl/worksheets/sheet{idx}.xml"] = make_sheet_xml(rows)

    content_types.append("</Types>")
    workbook_rels.append("</Relationships>")
    workbook_xml.append("</sheets>")
    workbook_xml.append("</workbook>")

    root_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>"""

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", "".join(content_types))
        zf.writestr("_rels/.rels", root_rels)
        zf.writestr("xl/_rels/workbook.xml.rels", "".join(workbook_rels))
        zf.writestr("xl/workbook.xml", "".join(workbook_xml))
        for filename, content in sheet_xmls.items():
            zf.writestr(filename, content)


def parse_csv(csv_text: str) -> list[list[str]]:
    reader = csv.reader(io.StringIO(csv_text.strip()))
    return [row for row in reader if row]


def main():
    base_dir = Path(__file__).resolve().parent.parent
    data_dir = base_dir / "data"
    data_dir.mkdir(exist_ok=True)

    # Save CSV copies
    (data_dir / "mvsr_students.csv").write_text(STUDENTS_CSV.strip(), encoding="utf-8")
    (data_dir / "mvsr_drivers.csv").write_text(DRIVERS_CSV.strip(), encoding="utf-8")
    (data_dir / "mvsr_parents.csv").write_text(PARENTS_CSV.strip(), encoding="utf-8")
    (data_dir / "mvsr_routes.csv").write_text(ROUTES_CSV.strip(), encoding="utf-8")
    (data_dir / "mvsr_stops.csv").write_text(ROUTE_STOPS_CSV.strip(), encoding="utf-8")
    (data_dir / "mvsr_summary.csv").write_text(SUMMARY_CSV.strip(), encoding="utf-8")

    sheets = {
        "Students": parse_csv(STUDENTS_CSV),
        "Drivers": parse_csv(DRIVERS_CSV),
        "Parent_Test_Accounts": parse_csv(PARENTS_CSV),
        "Routes": parse_csv(ROUTES_CSV),
        "Route_Stops": parse_csv(ROUTE_STOPS_CSV),
        "Summary": parse_csv(SUMMARY_CSV),
    }

    out_xlsx = base_dir / "MVSR_IntelliBus_Test_Dataset.xlsx"
    build_xlsx(sheets, out_xlsx)
    print(f"Generated {out_xlsx} successfully with {len(sheets)} sheets.")


if __name__ == "__main__":
    main()
