# CMS security hardening — 3 November 2026

## Editing access

The deployed Next.js app publishes through `/api/admin/*`. Every content read and write checks its signed owner session inside the handler as well as middleware. Public reads remain read-only. The independent archived Express service now rejects all mutations before parsing/upload/storage handlers and listens only on loopback.

Sessions now have an eight-hour absolute lifetime, a fresh random nonce, version/purpose/issued-time checks and a domain-separated HMAC. Older sessions are intentionally rejected. Cookies remain HttpOnly and production Secure, now SameSite Strict. Missing passwords or configurations shorter than 20 characters disable CMS authentication. The actual existing hosting credential was not read, changed or exposed during this work.

Every browser mutation independently requires the exact configured site origin, same-origin fetch metadata when present, and JSON content type for payload-bearing operations. Missing/null/foreign origins, sibling sites and simple form requests are rejected. DELETE and logout may have empty bodies but still require the origin and session. Blob completion callbacks instead retain the SDK's cryptographic signature check; a forged callback header cannot request upload credentials. Admin pages cannot be framed. Login comparison work is bounded to five attempts per deployment-provided IP and fifty globally per database-clock 15-minute window in one atomic persistent PostgreSQL reservation. Only HMAC buckets are stored. Storage failure disables sign-in rather than falling back to per-instance counters.

## Media and content boundaries

Content JSON is bounded before parsing, including chunked bodies; sign-in JSON is limited to 2 KiB. POST/PUT validate field types and sizes before mutation. Media must match the exact public Blob store derived from its server-only token (or explicit matching hostname) and uploaded path. Credentials, alternate hosts, ambiguous paths and redirects are rejected. PDF extraction uses a timed, streamed 20 MiB maximum, PDF content type and signature; server errors are redacted. Retained media IDs must belong to the edited content item, and UPDATE is also scoped by content ID. Web migrations require an explicit maintenance flag, disabled by default.

Global response protections cover MIME sniffing, framing, referrers, object embedding and form destinations. Same-origin sandbox demos still work; admin routes use the stricter frame denial. No script-blocking CSP is claimed: the current policy supplies those listed directives while preserving Next hydration and existing media.

## Dependencies and validation

Next.js moved from unsupported 14.2.35 to maintained 15.5.28 with matching ESLint configuration and async route parameters. Compatible transitive updates include the patched PostCSS parser and brace expansion. Production `npm audit --omit=dev` reports zero advisories at this check. Development lint tooling still has moderate minimatch-related advisory chains requiring a separate breaking tooling migration; this is not a claim that every development dependency is advisory-free. Dependabot is configured for weekly update pull requests; it does not automatically merge changes.

Validation: all 295 automated tests passed; the Next.js15.5.28 production build and type checks passed. Nineteen checks against an isolated production server confirmed public routes work, forged sessions cannot edit/upload/publish, private report pages stay404, admin pages redirect to sign-in and foreign-origin sign-in is403. Coverage includes authentication, durable login reservations, malicious origins, upload signatures, malformed/foreign media, direct-handler protection, public content routes and the production build. Tests use synthetic credentials and service mocks, never production content mutations. Live verification uses only denied operations and public reads.

## Local analytics

The local dashboard is unchanged: it binds to 127.0.0.1, validates socket/Host/Origin/custom headers, keeps its connection file owner-only and uses explicit read-only database transactions. It has no content editing endpoint. Existing analytics, CV request records and visitor identifiers are not altered by this security pass.

## Boundaries and owner account settings

This does not establish that a website is impossible to compromise or that an already-stolen hosting/GitHub account is safe. GitHub branch metadata currently reports main is unprotected. Enabling repository branch rules and requiring account passkeys/2FA need the owner's account administration access; the connected repository tool cannot change those settings. They were not silently changed or represented as enabled. A compromised Mac user account can read that user's private files; local file permissions are not a dedicated database read-only role.

References: [Next.js security release](https://nextjs.org/blog/nextjs-security-update-october-14-2026), [OWASP CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [Vercel request headers](https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for).
