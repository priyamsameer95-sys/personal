# Unique browser counts

## Diagnosis

The old anonymous visitor hash rotates by India-local date and is derived from network/browser category. COUNT(DISTINCT visitor_hash) across 7/30/90 days therefore measures visitor-days, not people deduplicated across those dates. Previously saved hashes cannot reconstruct historical period uniques.

## Correction

Eligible page views receive a signed random first-party browser identifier with an absolute 90-day lifetime. The cookie is host-only, HttpOnly, SameSite=Lax and Secure in production. Only its purpose-separated HMAC is stored in the new nullable site_page_views.browser_hash column. Existing daily hashes remain unchanged for daily reporting and abuse budgets. Neither identifier is connected to CV emails.

The collector applies existing Do Not Track, Global Privacy Control, admin, bot, prefetch, same-origin, body-size and event-shape exclusions before creating an identity. Actions cannot mint visitor identities. The page-view insert and first-measurement timestamp are atomic. Historical rows are never backfilled.

The local reader remains read-only and detects the additive schema before querying new columns. Unique visitors use COUNT(DISTINCT browser_hash) over the selected date bounds, with first-measurement time and identified-page-view coverage alongside the old visitor-day estimate. A missing identifier history produces unavailable, never a relabelled old total. Page-specific uniques remain unavailable for entirely historical pages.

Unique visitors means browsers, not a verified number of people. Different devices, private windows, cleared/expired cookies and simultaneous first visits in separate tabs can count separately. Privacy exclusions can omit visits. The public footer now describes the first-party cookie accurately.

## Validation

255 automated tests, type checking and the production build pass. Regression checks cover signed identity persistence across days, fixed expiry, tampering, privacy exclusions, atomic storage, period-specific distinct counting, partial historical coverage, absent schema and queueing fast SPA navigation until the first identity response arrives. Rejected requests release the queue; queued work rechecks current privacy and visibility. The installed local service was updated using the existing private owner-only connection.
