# IntelliBus maps, GPS, and device access

The role dashboards use Leaflet and OpenStreetMap for an interactive India map.
The map uses real route data only when an assigned route is configured; it never
generates route coordinates or live bus positions. Passenger dashboards never
request personal location automatically and currently have no assigned route data service.
Driver GPS and trip records are local to the current browser profile; there is
no GPS backend or network synchronization.

## Dashboard identity verification

Every dashboard (administrator, parent, both student levels, both driver roles,
and employee) requires Supabase Auth and a backend-confirmed face match before
opening.
Student ID, parent username, employee username, and driver ID sign-in resolve
to the matching Auth account on the server, without exposing the stored email
for those account-ID sign-ins. Administrators sign in with their Auth email;
their administrator role is checked by the backend. Each dashboard rechecks the
verified Supabase session. Three failed face attempts trigger a 15-minute
lockout; enrolled users can instead complete a one-time code sent to their
verified email or phone.

The workspace did not contain a Supabase client, auth service, migrations, or
database configuration when this integration was added. The migration therefore
adds an isolated `intellibus_profiles` role mapping and
`parent_student_links` relationship table rather than modifying unknown tables.
Only Supabase Auth `app_metadata` (which users cannot edit themselves) creates
roles. Set `intellibus_role` to `admin`, `parent`, `student`, `school-driver`,
`company-driver`, or `employee` for each Auth user. Students also need a unique
`student_id` and `student_level` (`engineering-student` or `junior-student`);
drivers need a unique `driver_id`; parents and employees need unique alphabetic
`username` values. Administrator accounts need only the `admin` role metadata
and sign in with their Auth email. `is_minor` defaults to `true`; an administrator
must set it to `false` for an adult student. The migration synchronizes these
values into the protected profile table. Provision the parent/student
relationship rows as an administrator; client-side users cannot create or
change those links. No existing cloud project or remote schema could be
inspected from this workspace, so reconcile the additive migrations with the
target project's schema before applying them.

Use the Supabase Auth Admin API or another trusted admin-only process to set
`app_metadata` (never `user_metadata`) for each account. For example, a student
account needs `{"intellibus_role":"student","student_id":"<assigned-id>","student_level":"engineering-student","is_minor":true}`; a driver needs `{"intellibus_role":"school-driver","driver_id":"<assigned-driver-id>"}`; an employee needs `{"intellibus_role":"employee","username":"<assigned-username>"}`; and an administrator needs `{"intellibus_role":"admin"}`.
Once both profile rows exist, an administrator can link them with:

```sql
insert into public.parent_student_links (parent_user_id, student_user_id)
select parent.user_id, student.user_id
from public.intellibus_profiles as parent
join public.intellibus_profiles as student on student.student_id = '<assigned-id>'
where parent.user_id = '<parent-auth-user-uuid>'
  and parent.role = 'parent'
  and student.role = 'student';
```

### Configure and deploy

1. Copy the existing Supabase project's public URL and anon/publishable key to
   the ignored `.env.local` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
   `.env.example` documents the variables. Do not put service-role keys or AWS
   credentials in any `VITE_*` setting.
2. Link the Supabase CLI to that existing project, run `supabase db push`, then
   deploy `student-login`, `parent-login`, and `dashboard-login` with JWT
   verification disabled (these functions establish a session from the
   administrator-assigned account ID and password) and deploy
   `face-verification` with JWT verification enabled:

   ```text
   supabase functions deploy student-login --no-verify-jwt
   supabase functions deploy parent-login --no-verify-jwt
   supabase functions deploy dashboard-login --no-verify-jwt
   supabase functions deploy face-verification
   ```
3. Configure the Edge Function secrets `AWS_REGION`, `AWS_ACCESS_KEY_ID`,
   `AWS_SECRET_ACCESS_KEY`, and optionally `AWS_REKOGNITION_COLLECTION_ID`.
   The AWS principal needs only Rekognition collection creation, face detection,
   indexing, image search, and face deletion permissions. Keep all credentials
   in Supabase secrets. Supabase service-role/anon environment variables are
   consumed only by the Edge Functions.
4. Configure Supabase Auth email delivery and the email template to send a
   one-time code (`{{ .Token }}`). Configure an SMS provider too if accounts
   use verified phone numbers. Use HTTPS (or localhost) for camera access.

The browser captures a JPEG in memory and sends it over HTTPS to the Edge
Function. AWS Rekognition performs face detection and matching against a
provider-managed face vector; only the provider's face ID is stored in the
Supabase table, which has RLS enabled and no client read/write policies. Raw
images are not written to local storage, Supabase, or the app's cache.
Re-enrollment requires a fresh password sign-in and a match to the currently
enrolled face. Every account must explicitly consent; minor/unknown-age student
accounts additionally require consent by a linked parent in the Parent
Dashboard. Consent can be withdrawn, which blocks verification until consent is
renewed.

This integration performs real image-based face matching, not camera-permission
checking or liveness detection. A photograph or replay may spoof an image-based
match; deployments needing presentation-attack resistance must add and validate
a liveness provider before relying on biometrics for high-risk decisions.
The email/SMS OTP alternative requires an already-enrolled face and a verified
contact method; it does not enroll or replace a face.

## GPS and maps

Open the UI over HTTPS or `localhost`/`127.0.0.1` so the browser can grant
Geolocation, camera, and Service Worker access. A driver must explicitly start a
GPS-tracked trip, which requires a successful one-time location fix before
continuous tracking starts. Drivers can also explicitly turn location on or off from
**Location settings**; **Follow My Location** recenters the map only after a real
GPS fix exists. Location tracking stops when turned off, when a trip ends, or
when the page is left. The map shows the most recently received position and its
timestamp; stale positions are not presented as current. A local-only trip is
available without GPS. High accuracy is requested, but browsers do not provide a
reliable satellite-only source indicator and may combine device-location signals.
IntelliBus does not perform an IP lookup or transmit coordinates to a backend.

Passenger maps also provide **Turn Location On** and **Turn Location Off**
controls. Location is not requested automatically; after the user opts in, the
map follows the device position locally. Turning it off removes the marker and
stops the browser location watch. Passenger location is not uploaded or stored.

OpenStreetMap attribution is shown on the map. Standard OpenStreetMap tiles need
an internet connection and are not cached for offline use; do not bulk-download
or cache them. Offline map tiles are available only when an operator configures
an authorized same-origin tile service with a compatible cache policy. Only then
does the explicit **Download configured route tiles** action cache the bounded
configured route area, within configured limits. It never downloads all of India.
The service worker caches the app shell; route/tile records use IndexedDB.
Clearing site data removes local trip and tile records. Offline data is not synced.

## Device Permissions Center

On the first role-dashboard visit, IntelliBus shows a role-aware device setup
screen. Setup completion is remembered per role in browser local storage, while
browser permission status is checked again on each dashboard visit. A setup
check never starts continuous GPS tracking. Drivers can explicitly request one
location fix and enable the camera; camera streams are released immediately
after a successful setup request. Browser notification permission is requested
only when its button is pressed and does not create a push subscription.
Students, employees, and parents are not asked for camera or location during
setup. Their optional map location remains available only through the map's
explicit **Turn Location On** action.

Use **Privacy & permissions** in the dashboard or open `permissions.html` for
current browser permission status and settings guidance. These checks do not
request access. Denied permissions are not reported as granted; change the
site's permission in browser settings and revisit the page to recheck it.
Connectivity comes from browser online/offline events and is not a permission.

The driver QR action requests camera access, detects QR codes locally when the
browser supports `BarcodeDetector`, and releases media tracks when the scanner
closes. QR contents are not displayed, uploaded, or stored. Server-side code
validation, identity verification, manual QR entry, and attendance submission
are not connected. Notification permission can be checked/requested, but push
delivery and service-worker notifications are not configured. Browser permission
status does not authenticate a user or authorize records.

The setup and permissions UI does not authenticate drivers or verify QR
attendance. Only Parent and Student sign-in use the new Supabase identity flow;
Driver and Employee sign-in remain the existing frontend demonstration.

Dashboard profile panels are read-only. There is no authenticated profile API to
save changes. No identity, role, organization, attendance, or verification data
can be safely edited through this frontend demo.

## Supplying an assigned route and authorized map tiles

No assigned route or offline tile provider is configured in this repository.
Before navigation can draw an assigned route or cache map tiles, the transport
operator must provide actual authorized route data and an authorized same-origin
raster tile service in `assets/offline-config.js` (or supply these through an
authenticated, offline-capable route service):

```js
window.INTELLIBUS_OFFLINE_CONFIG = {
  tileSourceId: "company-approved-tiles-v1",
  tileUrlTemplate: "/authorized-tiles/{z}/{x}/{y}.png",
  tileAttribution: "Map data © the provider",
  minZoom: 13,
  maxZoom: 15,
  maxTiles: 160,
  routes: {
    "school-driver": {
      id: "assigned-school-route-id",
      driverType: "school-driver",
      name: "Assigned school route",
      geometry: [
        { lat: 17.4, lng: 78.4 },
        { lat: 17.41, lng: 78.42 },
      ],
      stops: [
        { id: "stop-1", name: "Pickup stop", lat: 17.4, lng: 78.4, kind: "pickup" },
        { id: "stop-2", name: "Destination", lat: 17.41, lng: 78.42, kind: "destination" },
      ],
    },
    "company-driver": {
      id: "assigned-company-route-id",
      driverType: "company-driver",
      name: "Assigned company route",
      geometry: [/* supply this company's actual route geometry */],
      stops: [/* supply this company's actual pickup and destination stops */],
    },
  },
};
```

The example coordinates are schema examples only and are not displayed in the
application. Replace them with authorized route data. Add a separate route for
each driver type; the `driverType`
must match the dashboard role. Geometry must be the actual assigned road route
(not straight-line joins between pickup stops). Stop coordinates and route
geometry are validated before use.

The tile URL must resolve to the same origin as the app. Tiles are downloaded
only after an explicit driver action, only for the configured route bounds and
configured zoom levels, and only up to the configured tile cap. The app does not
bypass provider caching rules or fetch whole-map regions. The configured
attribution is shown on the map. Confirm the tile provider's license, cache
policy, attribution wording, and retention rules before enabling downloads.

When route configuration is absent, the India map remains interactive and shows
a clear route-unavailable state. GPS and local trip recording remain available.
Distance-to-stop is shown only when a GPS fix and real configured stop coordinates
are both present. The displayed straight-line distance is not a road-route ETA.

## Production integration still required

- Authenticate drivers and authorize route/stop/roster data on the server.
- Configure and operate the licensed same-origin map tile service.
- Provide current route geometry, assigned stops, and route version for offline
  app startup.
- Implement authenticated event synchronization, conflict handling, retention,
  and encryption appropriate to the deployment.
- Integrate dispatch, passenger attendance, and operational trip history.
- Add authenticated profile editing and backend QR verification/attendance APIs.

Driver and Employee login remain frontend demonstrations and do not authenticate
those roles.
Local IndexedDB is not a secure boundary or a substitute for an authorized,
managed device.
