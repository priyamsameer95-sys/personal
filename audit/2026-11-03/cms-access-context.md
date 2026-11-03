# CMS access context — 3 November 2026

This is the context-building phase, following `audit-context-building`. It records reachable code, dependencies and assumptions; it does not rate vulnerabilities or prescribe fixes. No credentials or visitor contacts were inspected. No applicable `AGENTS.md` was found in the repository or its ancestor directories.

## System boundary and persistence

- The root application is Next.js 14.2.35; root `package.json` starts/builds Next, not `backend/` (`package.json:5-14,20`). Most homepage, CV, curated work and paintings originate from versioned source. CV reads `app/cv/content.json` (`app/cv/page.tsx:13,46-56`); curated work reads `content/work/case-studies` (`lib/work.ts:1,29-35`); supplied artwork remains independently available (`app/art/page.tsx:29-31,46-48`).
- Optional CMS content persists in PostgreSQL `content_items` and `media_assets` through the server-only `@vercel/postgres` client (`lib/db.ts:1-5`). Admin queries never use the empty preview reader (`lib/db.ts:16-24`). Blob assets are uploaded directly to Vercel using short-lived SDK-issued tokens, then their URL/path metadata is submitted to the CMS (`components/admin/CvForm.tsx:48-84`).
- All CMS entities share one administrator role and one `ADMIN_PASSWORD`; authentication is a signed `admin_session` cookie, not an individual-user table (`lib/auth.ts:3-4,52-75,113-116`).
- Separate `backend/` uses Express, Prisma's `DATABASE_URL` and S3, with its own CV/Painting/Blog/Project tables (`backend/src/app.js:12-23`, `backend/prisma/schema.prisma:1-38`). No Next call or root deployment script invoking it was found. Whether it is separately deployed remains unknown.

## Entry points and their established gates

| Entry point | Gate before effects | Effects / dependencies |
| --- | --- | --- |
| `/minforyam/login`, POST `/api/admin/login` | Intentionally public in middleware. Login checks configured password, process-local failed-attempt limit, JSON password equality. | `createSessionToken`, HttpOnly cookie, Secure in production, SameSite=Lax, 24-hour max age. `middleware.ts:20-23`; `app/api/admin/login/route.ts:12-55`. |
| `/minforyam` editor | Middleware verifies `admin_session`. | Renders CV/art/work/blog forms and library; calls the admin routes. `middleware.ts:36-54`; `app/minforyam/page.tsx:67-77,160-178`. |
| GET `/api/admin/content?type=...` | Middleware plus handler `isAdminAuthenticated`. | Reads all statuses/media of selected validated type. `app/api/admin/content/route.ts:16-59`. |
| POST `/api/admin/content` | Handler auth precedes parsing/services. | Validates payload, deduplicates slug, optionally fetches/parses PDF URL, inserts content then media; deletes submitted blobs on failed insert path. `app/api/admin/content/route.ts:80-195`. |
| GET `/api/admin/content/[id]` | Handler auth precedes database. | Reads any matching content/media ID; UUID value parameterized. `app/api/admin/content/[id]/route.ts:22-64`. |
| PUT `/api/admin/content/[id]` | Handler auth precedes database. | Reads existing item, validates basic fields/media MIME/count, fetches/parses CV PDF if needed, updates content, removes old blobs/media, updates/inserts submitted media. `app/api/admin/content/[id]/route.ts:73-249`. |
| DELETE `/api/admin/content/[id]` | Handler auth precedes database/blob operations. | Deletes each old blob then content (media cascade). `app/api/admin/content/[id]/route.ts:255-285`. |
| PUT `/api/admin/content/[id]/status` | Handler auth precedes parse/database. | Validates draft/published; changes status/timestamps. Partial unique DB index allows one published CV. `app/api/admin/content/[id]/status/route.ts:11-64`; `app/api/admin/migrate/route.ts:92-97`. |
| POST `/api/admin/blob-upload` | Generate-token body requires handler auth; callback path is authenticated by Vercel SDK signature. | SDK token constrained by selected content-type MIME/size; completed callback no-op. Middleware skips cookie only on signed-header POST, handler distinguishes event type. `middleware.ts:25-33`; `app/api/admin/blob-upload/route.ts:9-59`; `lib/validation.ts:20-65`. |
| POST `/api/admin/migrate` | Handler auth precedes schema access. | Checks absence of `content_items`, renames old tables, creates enums/tables/indexes. `app/api/admin/migrate/route.ts:8-125`. |
| POST `/api/admin/logout` | Handler auth. | Expires the browser cookie. `app/api/admin/logout/route.ts:5-12`. |
| GET `/api/admin/analytics`, `/api/admin/cv-leads` | Handler auth. | Reads reports, contacts/CSV. No public editor effects. `app/api/admin/analytics/route.ts:7-11`; `app/api/admin/cv-leads/route.ts:9-19`. |
| Hosted `/minforyam/analytics`, `/minforyam/cv-leads` | Unconditional 404 in middleware. | No hosted report UI, even with a valid cookie. `middleware.ts:15-18`. |
| POST `/api/analytics`, `/api/cv-download` | Intentionally anonymous; origin, body/field bounds and application-specific checks. | Appends analytics / saved CV form requests only, with no path into CMS content tables. `app/api/analytics/route.ts:18-63`; `app/api/cv-download/route.ts:46-73`. |
| Local 127.0.0.1:4310 `/api/report`, `/api/export` | Loopback socket + exact Host; POST + exact Origin + custom header; bounded JSON. | Direct provider wraps report queries in READ ONLY transaction. No edit/reset/config endpoints. `scripts/local-analytics.cjs:180-224,231-239`; `scripts/local-analytics-data.cjs:23-34,106-124`. |

## Authentication call continuity

1. `isAdminAuthenticated` reads the cookie and calls `verifySessionToken` (`lib/auth.ts:113-116`).
2. Verification fails closed if password/token absent, token >1024 chars, format invalid, JSON malformed, expiry not safe integer, or expired (`lib/auth.ts:78-99`).
3. Verification imports the configured password as a SHA-256 HMAC key and verifies the raw encoded payload (`lib/auth.ts:39-49,101-109`). Token creation signs the expiry using the same key (`lib/auth.ts:59-75`). Rotation of `ADMIN_PASSWORD` invalidates existing signatures by construction.
4. Password presence/nonblank is enforced; minimum length/entropy or a second factor: **nothing found** (`lib/auth.ts:52-55`). Whether production password has adequate entropy is unexamined.
5. Rate limiting counts five failed comparisons in a 15-minute process-local Map (`lib/auth.ts:6-28`; login `:18-23,40-46`). Persistence/sharing across serverless instances/restarts: **nothing found**. `getClientIp` trusts first `x-forwarded-for` value, then framework IP (`lib/auth.ts:31-36`); deployment proxy header overwrite behavior is unexamined.
6. Logout clears one browser's cookie; server-side revocation registry or nonce: **nothing found** (`app/api/admin/logout/route.ts:10-12`; token payload `lib/auth.ts:65-66`).

## Content-write assumptions

- Mutating CMS handlers verify the session directly, so middleware bypass alone does not authorize writes (route gates in entry-point table). Same-origin/Fetch-Metadata or CSRF-token verification inside CMS login/content/status/delete/logout handlers: **nothing found**. Browser cookie is SameSite=Lax (`app/api/admin/login/route.ts:49-55`).
- Blob SDK upload constraints apply to the prior upload transaction (`app/api/admin/blob-upload/route.ts:41-47`). Content creation separately accepts client-submitted media URL/path/kind/MIME (`lib/validation.ts:138-168`). A server-side link between submitted URL/path and an authorized upload in this store: **nothing found**.
- CV extraction fetches a submitted media URL from the server (`app/api/admin/content/route.ts:118-126`; `[id]/route.ts:139-147`). Host/store allowlist, redirect policy, byte ceiling and fetch timeout on those extraction fetches: **nothing found**.
- Media update uses each supplied `id` in `UPDATE media_assets WHERE id = ...`, while constructing `newMediaIds` from the same submitted list (`app/api/admin/content/[id]/route.ts:179-214`). A required `content_id` match or lookup of submitted existing IDs against the current item: **nothing found**. All authenticated administrators currently share the same complete role.
- Content SQL is parameterized with tagged-template substitution (create `:138-168`, update `:159-229`, status `:28-50`). Multi-step content/blob edits are not wrapped in an explicit SQL transaction in these handlers. Partial DB/blob effects and cleanup ordering are visible; atomicity is not established.
- Public CMS reads explicitly require `status = 'published'` (`lib/work.ts:88-103`; `app/art/page.tsx:33-44`; `app/blog/page.tsx:32-38`; `app/[category]/[id]/page.tsx:96-113`). Curated source routes take precedence over DB records (`app/[category]/[id]/page.tsx:72-91`).
- React text output escapes plain fields. CMS Markdown rendering skips HTML, removes rehype plugins and transforms URLs (`components/MarkdownContent.tsx:17-29`, `lib/content.ts:37-44`). JSON-LD uses `serializeJsonLd`; implementation outside the write gate was not the focus of this pass.
- Private response headers currently establish no-store, noindex and nosniff (`middleware.ts:5-9`; `next.config.mjs:7-19`). Root config does not itself establish a sitewide frame policy/CSP. Hosting-injected headers require separate inspection.

## Separate Express route chain

`backend/src/app.js:15-23` installs CORS/JSON/form parsers and mounts four routers. Each writer directly chains Multer then a controller (`backend/src/routes/cvRoutes.js:8`, `paintingRoutes.js:8`, `blogRoutes.js:8`, `portfolioRoutes.js:8`). Authorization middleware: **nothing found**. Upload MIME/count/size checks are in `backend/src/middleware/uploadMiddleware.js:5-43`.

Controllers create S3 objects (`backend/src/config/s3.js:18-35`) then Prisma records: CV `backend/src/controllers/cvController.js:25-40`; painting `paintingController.js:31-46`; blog `blogController.js:37-56`; project `portfolioController.js:40-59`. Public GET lists do not have draft/status concepts (`backend/prisma/schema.prisma:10-38`). Listener binds with no explicit host (`backend/src/app.js:38-40`). Whether this service is running, reachable or credentialed: open question; source alone does not establish production exposure.

## Open questions for the subsequent review

- Production CMS enabled state, deployed secret strength and independent Vercel/GitHub account protection are not established by repository source.
- Does the user require browser editing now, or would a locked CMS with code/GitHub publishing satisfy current operational needs? There is no explicit enabled/disabled CMS feature flag in the baseline inspected source.
- Exact hosting proxy trust, WAF/edge rate limiting and final deployed headers are unexamined.
- Separate Express backend deployment is unverified. No authenticated bridge from active Next UI to it was found.
- Database row-level roles, network restrictions, backups, credentials' scope and Blob store ownership policy are external configuration and were not inspected here.

## Coverage

Read every Next API handler, middleware/authentication, content payload rules, active public CMS readers, local dashboard transport/reader boundary, separate Express mounts/routes/controllers and persistence definitions. Read existing `tests/admin-auth.test.cjs` for coverage context. No source changes, live content writes, login guessing, secret reads or destructive probes were performed in this context phase.
