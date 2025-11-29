# Audit Notes – TaskFlow App (Next.js 15 / React 19 / drizzle / better-auth)

## (A) Architecture Summary
- Stack: Next.js 15 App Router, React 19, TypeScript, Tailwind via `@tailwindcss/postcss`, shadcn/ui, sonner, drizzle ORM with SQLite (`better-sqlite3`), better-auth (bearer), googleapis (Calendar/Gmail), Twilio (WhatsApp), PWA (manifest + service worker).
- Auth wiring: `src/lib/auth.ts` uses better-auth + drizzleAdapter (sqlite) + bearer plugin. Client: `src/lib/auth-client.ts` stores bearer token in localStorage + cookie and attaches Authorization. Middleware reads bearer token (cookie/Authorization) to gate `/dashboard|/focus|/settings|/archive`. App Router auth handler at `src/app/api/auth/[...all]/route.ts`.
- Tasks schema: `src/db/schema.ts` defines `tasks` with `userId` TEXT FK, `title`, `description`, `priority`, `startDate` TEXT nullable, `dueDate` TEXT (ISO expected), `category`, `status`, `archived` (boolean), `googleCalendarEventId`, `createdAt`, `updatedAt` (TEXT). Migrations under `drizzle/` match.
- Task creation flow: Frontend pages (`dashboard/focus/archive/settings`) call `/api/tasks` and related routes with bearer auth. Backend uses session.user.id (string) for scoping; expects startDate/dueDate as ISO strings; validates via `new Date(value)` + `getTime()` check.

## (B) Bugs / Inconsistencies
- Task POST runtime error reported: `TypeError: value.getTime is not a function` in `/api/tasks`. Likely cause: `isValidISO` (tasks route) is called with a non-string (e.g., a plain object or array from the client). Current validation uses `new Date(date).getTime()`, which will throw if `date` is an object with its own `getTime` property that is not a function. The API assumes ISO strings; if the client sends `{ dueDate: { seconds: ... } }` or an array, this error occurs. Need to harden validation to reject non-strings before calling `getTime`, and ensure the client always sends ISO strings (with time).
- Date/time shape: UI may be sending dates without time; backend expects full ISO (time required). Need canonical representation (ISO string with time) and defaulting if UI only has date.
- userId types: Backend/API and schema use `string`; some seeds and older code had numbers—seeds corrected, frontend type updated in dashboard, but confirm other pages (focus/archive/settings) still treat `userId` as number in local interfaces.
- Notifications robustness: Email/WhatsApp routes exist but may not be invoked from task flows; Google token refresh added for calendar/email but cron routes still use raw tokens without refresh.
- Cron routes: use `CRON_SECRET` Authorization; daily-summary and overdue cron query dueDate as ISO strings (text). They rely on accessToken without refresh handling.
- WhatsApp route: uses Twilio require() at runtime, assumes env vars; not integrated with cron/task flows; no per-user phone number stored.

## (C) Notifications Status
- Email: `src/app/api/notifications/email/route.ts` uses `getCurrentUser`, fetches account, calls `ensureGoogleAccessToken` (refresh-aware), sends Gmail message to user.email. Only triggered by direct POST; not wired to cron or task creation.
- WhatsApp: `src/app/api/notifications/whatsapp/route.ts` uses `getCurrentUser`, validates Twilio env vars, uses Twilio client to send a message to provided `phoneNumber`. Not called elsewhere (no cron linkage); uses static template.
- Cron endpoints:
  - `cron/check-overdue`: Bearer `CRON_SECRET` gate; finds tasks with dueDate < now and status upcoming; marks overdue; attempts email via Google tokens (no refresh helper). Uses account tokens and posts Gmail; also tries WhatsApp? (No direct Twilio here—email only).
  - `cron/daily-summary`: Bearer `CRON_SECRET`; for each user, sends Gmail summary for today’s tasks and overdue tasks (no refresh helper).
  - Both operate on ISO dueDate strings (text) and include time; overdue logic uses `lt(tasks.dueDate, now)` string compare, which relies on ISO ordering (OK if stored as ISO).

## (D) PWA / Service Worker
- `public/sw.js` caches only static assets (`icon-192.png`, `icon-512.png`, `manifest.json`) with cache-first strategy; no HTML/pages cached → reduced stale/auth leakage risk.
- `public/manifest.json` points to icons, installable; no obvious issues.

## (E) Config / Env
- Required: `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CRON_SECRET`; Twilio optional (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`); `DATABASE_URL=local.db`; `NEXT_PUBLIC_SITE_URL`.
- `.env.example` lists required keys; `.env` currently has placeholder values (must be filled for real use).

---

## Design Fixes (to implement next)
1) Task creation bug:
   - Harden validation to accept only strings for `startDate`/`dueDate` before calling `new Date(...)`/`getTime()`. Reject objects/arrays. Keep canonical storage as ISO strings with time.
   - Ensure clients send ISO strings (with time). If UI only supplies date, set a default time (e.g., 09:00 local) and document in code.
2) Notifications:
   - Use ISO strings with time; overdue/due-soon checks should use `new Date()` comparisons (or lexicographic on ISO).
   - Integrate notification triggers: optionally call email/WhatsApp routes from cron after checking env configuration; guard when tokens/env missing.
3) WhatsApp:
   - Validate envs; allow opt-in phone number (user profile or request body). Clear JSON errors if misconfigured. Consider integrating into cron for due/overdue reminders.
4) Auth/Google:
   - Keep better-auth flow intact. If adding refresh handling to cron routes, reuse `ensureGoogleAccessToken`. Verify account tokens saved via better-auth.
5) Cleanup:
   - ThemeColor warnings: optionally move to viewport export later.
   - SW already static-only; keep ignoring non-HTTP schemes.
