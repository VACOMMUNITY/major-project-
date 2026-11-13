// IntelliBus Offline Routing and Navigation Configuration
// Pre-configured GPS route geometry, stops, and offline tile parameters
window.INTELLIBUS_OFFLINE_CONFIG = {
  tileSourceId: "mvsr-offline-tiles",
  tileUrlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  tileAttribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\" rel=\"noreferrer\">OpenStreetMap contributors</a> · IntelliBus Offline GPS",
  minZoom: 11,
  maxZoom: 17,
  maxTiles: 360,
  routes: {
    // MVSR Engineering College Route (MVSR-ROUTE-01)
    "MVSR-ROUTE-01": {
      id: "MVSR-ROUTE-01",
      driverType: "school-driver",
      name: "MVSR Test Campus Route",
      organization: "MVSR Engineering College",
      vehicle: "TEST-BUS-001",
      driverId: "MVSR-DRV-001",
      geometry: [
        { lat: 17.3524, lng: 78.5032 },
        { lat: 17.3450, lng: 78.5005 },
        { lat: 17.3320, lng: 78.4980 },
        { lat: 17.3270, lng: 78.5050 },
        { lat: 17.3210, lng: 78.5140 },
        { lat: 17.3160, lng: 78.5210 },
        { lat: 17.3110, lng: 78.5280 },
        { lat: 17.3060, lng: 78.5315 },
        { lat: 17.3015, lng: 78.5350 },
      ],
      stops: [
        { id: "MVSR-STOP-01", name: "Test Stop 01 (Campus North Gate)", lat: 17.3524, lng: 78.5032, kind: "pickup", order: 1 },
        { id: "MVSR-STOP-02", name: "Test Stop 02 (Chandrayangutta X Roads)", lat: 17.3320, lng: 78.4980, kind: "pickup", order: 2 },
        { id: "MVSR-STOP-03", name: "Test Stop 03 (Balapur Junction)", lat: 17.3210, lng: 78.5140, kind: "pickup", order: 3 },
        { id: "MVSR-STOP-04", name: "Test Stop 04 (Badangpet Bus Bay)", lat: 17.3110, lng: 78.5280, kind: "pickup", order: 4 },
        { id: "MVSR-STOP-05", name: "Test Stop 05 (MVSR Main Gate)", lat: 17.3015, lng: 78.5350, kind: "destination", order: 5 },
      ],
    },
    // Junior / Intermediate College Route (INT-ROUTE-01)
    "INT-ROUTE-01": {
      id: "INT-ROUTE-01",
      driverType: "school-driver",
      name: "Intermediate College Test Route",
      organization: "Intermediate College",
      vehicle: "TEST-JC-BUS-001",
      driverId: "JC-DRV-001",
      geometry: [
        { lat: 17.3916, lng: 78.4428 },
        { lat: 17.3980, lng: 78.4530 },
        { lat: 17.4042, lng: 78.4639 },
        { lat: 17.3985, lng: 78.4675 },
        { lat: 17.3930, lng: 78.4710 },
        { lat: 17.3909, lng: 78.4752 },
        { lat: 17.3888, lng: 78.4795 },
        { lat: 17.3869, lng: 78.4831 },
        { lat: 17.3850, lng: 78.4867 },
      ],
      stops: [
        { id: "INT-STOP-01", name: "Intermediate Test Stop 01 (Mehdipatnam Depot)", lat: 17.3916, lng: 78.4428, kind: "pickup", order: 1 },
        { id: "INT-STOP-02", name: "Intermediate Test Stop 02 (Lakdikapul Metro)", lat: 17.4042, lng: 78.4639, kind: "pickup", order: 2 },
        { id: "INT-STOP-03", name: "Intermediate Test Stop 03 (Nampally Station)", lat: 17.3930, lng: 78.4710, kind: "pickup", order: 3 },
        { id: "INT-STOP-04", name: "Intermediate Test Stop 04 (Abids Circle)", lat: 17.3888, lng: 78.4795, kind: "pickup", order: 4 },
        { id: "INT-STOP-05", name: "Intermediate Test Stop 05 (College Campus Gate)", lat: 17.3850, lng: 78.4867, kind: "destination", order: 5 },
      ],
    },
    // Company Transport Route (COMP-ROUTE-01)
    "COMP-ROUTE-01": {
      id: "COMP-ROUTE-01",
      driverType: "company-driver",
      name: "Tech Park Shuttle Route",
      organization: "Company transport",
      vehicle: "TEST-SHUTTLE-01",
      driverId: "COMP-DRV-001",
      geometry: [
        { lat: 17.4650, lng: 78.3610 },
        { lat: 17.4580, lng: 78.3710 },
        { lat: 17.4504, lng: 78.3808 },
        { lat: 17.4442, lng: 78.3890 },
        { lat: 17.4380, lng: 78.3970 },
        { lat: 17.4320, lng: 78.3900 },
        { lat: 17.4260, lng: 78.3830 },
        { lat: 17.4330, lng: 78.3660 },
        { lat: 17.4400, lng: 78.3489 },
      ],
      stops: [
        { id: "COMP-STOP-01", name: "Kondapur RTA", lat: 17.4650, lng: 78.3610, kind: "pickup", order: 1 },
        { id: "COMP-STOP-02", name: "Hitec City Cyber Towers", lat: 17.4504, lng: 78.3808, kind: "pickup", order: 2 },
        { id: "COMP-STOP-03", name: "Madhapur Metro", lat: 17.4380, lng: 78.3970, kind: "pickup", order: 3 },
        { id: "COMP-STOP-04", name: "Raidurg Bio-Diversity Park", lat: 17.4260, lng: 78.3830, kind: "pickup", order: 4 },
        { id: "COMP-STOP-05", name: "Gachibowli Tech Campus", lat: 17.4400, lng: 78.3489, kind: "destination", order: 5 },
      ],
    },
  },
  // Default fallback route
  route: null,
};

// Aliases for roles
window.INTELLIBUS_OFFLINE_CONFIG.routes["school-driver"] = window.INTELLIBUS_OFFLINE_CONFIG.routes["MVSR-ROUTE-01"];
window.INTELLIBUS_OFFLINE_CONFIG.routes["engineering-driver"] = window.INTELLIBUS_OFFLINE_CONFIG.routes["MVSR-ROUTE-01"];
window.INTELLIBUS_OFFLINE_CONFIG.routes["company-driver"] = window.INTELLIBUS_OFFLINE_CONFIG.routes["COMP-ROUTE-01"];
window.INTELLIBUS_OFFLINE_CONFIG.routes["engineering-student"] = window.INTELLIBUS_OFFLINE_CONFIG.routes["MVSR-ROUTE-01"];
window.INTELLIBUS_OFFLINE_CONFIG.routes["junior-student"] = window.INTELLIBUS_OFFLINE_CONFIG.routes["INT-ROUTE-01"];
window.INTELLIBUS_OFFLINE_CONFIG.routes["employee"] = window.INTELLIBUS_OFFLINE_CONFIG.routes["COMP-ROUTE-01"];
