# Local-only website analytics

Run `npm run analytics:local`, then open **http://127.0.0.1:4310/** on this Mac. The listener binds only to `127.0.0.1`; it does not listen on the LAN or the public internet. The dashboard assets live in `local-analytics/`, outside Next's public directory, and are not a hosted page. The production analytics and CV-interest UI routes return 404.

Sign in with the existing website admin password. The local server sends it over HTTPS to the fixed `https://www.priyamsameer.com/api/admin/login` endpoint. It does not save the password. The returned production session stays only in the Node process's memory. The browser receives a separate random HttpOnly, SameSite=Strict local session cookie. Session lifetime is at most 24 hours and is capped to the production session's encoded expiry. Sign out or stop the local process to discard access. Restarting the process requires sign-in again.

The website still receives anonymous page views and meaningful click events through its public write-only analytics endpoint. The local server reads the existing owner-authenticated report and CV CSV export endpoints over HTTPS. Those endpoints do not expose data without the owner's existing authenticated session. The local browser never receives a production session cookie, password or database credentials.

## Dashboard contents

- 7-, 30- and 90-day reporting periods with daily page views, visitor-days, meaningful clicks and successful CV requests.
- Popular pages, actions and targets, clicks by page, referrer hostnames and approximate device categories.
- All-time email addresses voluntarily shared for the CV, latest 200 records, with an authenticated CSV export.
- Real loading, expired-session, empty and upstream-failure states. Unavailable data is never represented as zero traffic.

Visitor-days estimate browsers within each day and add daily counts, rather than claiming to identify people. No browsing is connected to a CV email. CV requests count successful form submissions, not confirmed PDF opens. Historical traffic cannot be reconstructed. Tracking respects Do Not Track and Global Privacy Control and excludes bots and signed-in website administrators.

## Local security boundary

- Fixed upstream origin and explicit report/login/export endpoints; no client-supplied upstream URL.
- Exact Host validation and loopback socket validation prevent other hostnames and DNS rebinding.
- All local API operations, including report reads and CSV exports, require POST, exact same-origin Origin, an explicit custom header and a JSON body. Cross-origin forms and scripts cannot read reports or change sessions.
- No CORS access, no-store responses, noindex headers, a restrictive content policy and frame protection.
- Five sign-in attempts per 15 minutes, bounded request/response bodies, upstream timeouts, rejected redirects and sanitized errors.
- No third-party scripts, fonts, analytics, cookies or stored credentials in the local interface. Data is inserted as text rather than HTML.
- Local analytics files and routes include no sample contacts or fabricated traffic. Automated tests inject a fake transport without permitting a configurable production origin.

## Verification

`node --test tests/local-analytics.test.cjs` exercises local origin and host boundaries, owner sign-in, session isolation and expiry, protected reports and exports, sign-out, rate limits, body bounds, upstream failures and static asset restrictions. The local launch command is separate from the production application and requires only Node.js 18 or later.

If port 4310 is already used, the launcher prints a clear message and exits without switching to a publicly reachable address. Keep the terminal process running while viewing the dashboard. It does not register an auto-start background service.
