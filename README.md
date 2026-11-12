# IntelliBus

## Run locally

Install the dependencies and start the Vite development server:

```sh
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`). Do not use VS Code Live Server (port 5500) or open files under `ui/` directly with `file://`: the dashboard pages import npm dependencies and need Vite to resolve them. If a dashboard URL includes a role query, use `junior-student`; `junior_student` is also accepted.

To create and preview a static build:

```sh
npm run build
npm run preview
```

The build uses relative asset URLs so it can also be hosted below a site subpath.

## Supabase parent usernames

Apply the Supabase migrations and deploy the `student-login`, `parent-login`, and `face-verification` Edge Functions. Parent usernames are provisioned by a trusted administrator in the user's Supabase **app metadata**:

```json
{
  "intellibus_role": "parent",
  "username": "ParentName"
}
```

Usernames are case-insensitive, unique, and must contain English letters only. Existing parent accounts need a username added to app metadata before username sign-in will work. Parent passwords continue to use Supabase Auth and should remain strong; student and driver ID formats are unchanged.

## MVSR synthetic test dataset

The MVSR workbook contains synthetic test records, not an official college roster. The seed process reads the workbook directly and never writes its password column to an application table.

1. Review `supabase/migrations/20261107120000_mvsr_test_transport.sql` and `supabase/migrations/20261107130000_mvsr_engineering_access.sql`. These are additive: they keep existing accounts and records, tag the fixed MVSR route as `mvsr_engineering_test`, and apply RLS to restrict its route, trip, attendance, location, and notification data to the test engineering students, their linked test parents, and the assigned MVSR driver.
2. For local testing, start the existing local Supabase stack and apply pending migrations without resetting the database:

   ```powershell
   supabase start
   supabase migration up --local
   supabase functions serve --env-file supabase/functions/.env.local
   ```

   Point the ignored frontend `.env.local` file at the local Supabase URL and publishable anon key printed by the local stack. The function env file should contain `MVSR_TEST_MODE=true`; do not put a service-role key in the frontend env file.

3. Keep `MVSR_TEST_MODE=true` in the local Edge Functions environment. MVSR student, parent, and driver sign-in and transport access are rejected unless the setting is enabled and the configured Supabase URL is local (`localhost`, `127.0.0.1`, `::1`, or the local `kong` gateway). This gate applies only to marked MVSR test accounts; it does not alter Junior College or Company sign-in.
4. Validate the workbook before connecting to Supabase:

   ```powershell
   python -m pip install -r scripts\requirements-seed.txt
   python scripts\seed_mvsr_test_data.py "C:\path\to\MVSR_IntelliBus_Test_Dataset.xlsx" --check
   ```

5. For a local Supabase instance only, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the trusted PowerShell process, then run with `--apply`. The script checks required tables/columns and existing IDs first, refuses conflicting accounts/routes/stops, and can be safely rerun. It rejects non-loopback Supabase URLs. The service-role key must never be copied into `.env.local`, a `VITE_*` setting, or frontend code.
6. The same local-only setting can skip face verification for these seeded test accounts. The bypass also requires a loopback or local Docker gateway Supabase URL and the account to carry server-managed `mvsr_test_account` metadata. Do not enable this on a hosted project.

Do not run the seed script against a hosted/production Supabase project. For a hosted backend, review and apply additive migration and Edge Function changes only through the project's normal approval/deployment process; this import and MVSR test-account access are restricted to local Supabase. Junior College and Company accounts continue using their existing role-specific authentication paths and cannot read rows tagged with the MVSR dataset code.

Student sign-in uses the Student ID as both ID and test password. The driver is `MVSR-DRV-001` / `Driver@123`. Parents can use their `MVSR-PARENT-###` ID or workbook test email with `Parent@123`. Passwords are stored only by Supabase Auth, which hashes them.

The workbook's five stop coordinates are intentionally blank. Configure verified coordinates in `public.intellibus_route_stops` and set each student's `pickup_stop_id` / `drop_stop_id` in `public.intellibus_profiles` before location-based stop notifications or map navigation are used. No coordinates or pickup/drop assignments are fabricated. Parent notifications are persisted in-app and refreshed while the dashboard is open; no push/email provider exists in the current project.

The seed process generates QR SVGs locally from random per-student tokens; those tokens are validated by the authenticated server before attendance is recorded. Camera scanning requires a secure browser context and a browser that implements `BarcodeDetector`.
