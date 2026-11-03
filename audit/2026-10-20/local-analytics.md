# Local-only website analytics

Run `npm run analytics:local`, then open **http://127.0.0.1:4310/** on this Mac. The listener binds only to `127.0.0.1`; it does not listen on the LAN or public internet. The dashboard opens directly without a password, browser login session or cookie. Its assets remain outside the public website. Hosted report pages still return 404.

## Live records

Removing the local password screen does not remove authentication from the live website’s private report or CV-email APIs. The local server can read them using an already configured server-only `ANALYTICS_ADMIN_SESSION`, or authenticate with an already configured server-only `ADMIN_PASSWORD`. Neither value is rendered in the browser, logged, written to this repository or accepted through an unauthenticated local form. Upstream sessions stay only in process memory. No environment settings or credentials are changed automatically.

If no valid connection exists, the dashboard reports **Live data is not connected**, with no fabricated counts or email records. Opening a passwordless local interface cannot recover a forgotten website credential. No Vercel account access is required to open the local dashboard.

## Reports

When a connection is configured, the dashboard shows 7/30/90-day views and actions, per-page activity, sources and device categories, along with all-time CV-request totals and the latest 200 volunteered email addresses. CSV export uses the protected website endpoint. Visitor-days are anonymous daily browser estimates, and no browsing history is linked to email records. CV requests are successful form submissions, not proof of PDF opens or verified identities.

**Hide data** clears the report from the page and cancels pending report/export results. **Refresh** loads it again.

## Local security boundary

All local data operations require POST, the exact loopback Host and Origin, a custom request header, and bounded JSON. Other machines, cross-origin pages and DNS-rebinding hosts are rejected. Responses are non-cacheable with a restrictive content policy and frame protection. Upstream origins and endpoints are fixed; redirects and arbitrary destinations are rejected. Stored website records remain protected by the website’s existing authentication. Any process or user on this Mac that can reach the loopback server can use this passwordless interface.

Tests cover both configured and unconfigured connections, host/origin checks, private-data text rendering, unavailable versus empty states, and delayed data/export handling. The separate launcher requires Node.js 18 or later and does not register an auto-start service.
