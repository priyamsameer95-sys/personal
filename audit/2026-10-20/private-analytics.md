# Private website analytics — 20 October 2026

Owner URL: `/minforyam/analytics`. The existing signed admin session is checked in middleware, the server page and the JSON endpoint (`/api/admin/analytics`) before data reads. Every private response is no-store/noindex, including redirects and unauthorized JSON. Analytics is excluded from the public navigation/sitemap, and login preserves only the explicitly allowed analytics return path. Existing CV CSV export remains protected by the same session.

The page shows 7/30/90-day page counts, visitor-days, daily charts, top public routes, referring hostnames and device categories. Visitor-days are the sum of estimated daily browser counts, not named people or a unique-person count across a month. IST determines daily buckets and displayed dates.

Collection is first-party, cookie-free and asynchronous. Only known public routes are accepted. Query strings, fragments, raw IP addresses, full user agents, referrer URLs, CV emails and admin routes are never stored in traffic events. A server-only HMAC rotates by IST date using IP and coarse browser/device categories. Browser DNT/GPC, known bots, prefetches and authenticated owner visits are excluded. Event UUIDs deduplicate writes, each daily visitor key has a capped500-event budget, and traffic events older than180 days are removed periodically. No visits are retroactively fabricated.

CV contact records preserve existing self-submitted email, first/latest request, all-time request count and latest page. Successful requests now append a dated event atomically with the existing contact upsert, so future daily CV charts are supported. Historic all-time totals remain separate from newly recorded daily events. A request is not proof of a PDF open, a verified email identity or a direct-file download; no browsing history is linked to CV emails.

The dashboard distinguishes genuine zero activity from storage errors. Data tables accompany charts, mobile tables are labelled scroll regions, and all mobile reading text remains16px. A synthetic local preview was used to inspect populated data layouts without accessing real visitor emails. That preview is outside the repository and is never deployed.

Validation: the actual storage, API, tracker, middleware and dashboard renderers have dedicated behavioral/security tests. Production build/type checks and original site route/media/CV preservation are checked before publication. Live unauthenticated requests must redirect or return401, with no data or cacheable responses.
