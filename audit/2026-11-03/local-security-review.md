# Private local analytics review — 3 November 2026

Scope: the loopback analytics server, direct database reader, local interface and macOS installer. No private connection values or visitor email records were read or included. The dashboard's intentional passwordless local access was preserved.

## Result

No route in this service edits website content. Its only data routes read an analytics report or export CV request records. The running process was confirmed listening on `127.0.0.1:4310`, with no wildcard or LAN listener.

| Control | Source evidence | Verification |
| --- | --- | --- |
| Local network boundary | `scripts/local-analytics.cjs:183` verifies exact Host and loopback socket; `:238` binds explicitly to `127.0.0.1` | Actual listener inspection; wrong Host received 403 |
| Browser origin boundary | `scripts/local-analytics.cjs:198` requires POST; `:200` requires exact Origin and custom header; no CORS permission is returned | Foreign/missing Origin and missing custom header received 403 |
| No file server or content editor | `scripts/local-analytics.cjs:12` lists four static assets; `:195` permits only the report/export data routes | `/api/cms` and the private connection-file path both received 404 |
| Restrictive local document policy | `scripts/local-analytics.cjs:18` disables caching, framing, referrers and cross-origin resource use; CSP permits local assets and connections only | Existing focused server tests pass |
| No arbitrary upstream fetch target | `scripts/local-analytics.cjs:64` pins production origin and three endpoint shapes, disables redirects and bounds response sizes | Existing fixed-transport tests pass |
| Read-only database work | `scripts/local-analytics-data.cjs:113` begins a repeatable-read, read-only transaction; report/export use fixed SELECT statements with bound parameters | Tests require read-only transaction, SELECT-only work, rollback/close on failures |
| Private local connection | `scripts/local-analytics-data.cjs:23` accepts only owner-owned regular files without group/other permissions, bounded size and exact configuration keys | Actual runtime/data directories were 0700; connection file was 0600, owner-owned, not a symlink |
| Private installed runtime | `scripts/install-local-analytics.cjs:127` refuses symlink/type mismatches; `:166` applies 0700 directories, `:173`/`:197` applies 0600 files | Actual logs and LaunchAgent were 0600; installer safety tests pass |
| Report rendering | `local-analytics/dashboard.js:19` inserts data through textContent; `:184` clears records when hidden; exports neutralize spreadsheet formulas in `scripts/local-analytics-data.cjs:65` | Text-injection, export and delayed-response tests pass |
| Repository exclusions | `.gitignore:38` excludes local data/uploads and `:42` excludes environment files | Reviewed source, without reading secrets |

44 focused local analytics tests passed. Read-only live HTTP checks returned 200 for the dashboard asset, 403 for rejected origins/hosts/headers, and 404 for absent write/config routes.

## Remaining limits

- The application uses explicit read-only transactions; this does not establish that the stored production credential itself is a dedicated read-only database role. A separately provisioned SELECT-only role would reduce the consequence of a compromised macOS account. No database roles or credentials were changed during this review.
- Passwordless loopback access trusts software running under this Mac account. A malicious local process can supply browser-style headers and read reports; loopback and Origin checks protect against remote sites, not an already compromised owner session. This follows the owner's explicit local-only, no-password requirement.
- The review establishes the inspected controls and checks, not a guarantee against every possible attack. Website CMS routes are reviewed separately.

## Separate media hardening

Added `lib/admin-media.ts` and five focused tests to bind CMS media to the configured Blob store and prevent arbitrary PDF fetch targets, redirects and unbounded downloads. The parent implementation integrates this helper into CMS write routes. Type checking passes.
