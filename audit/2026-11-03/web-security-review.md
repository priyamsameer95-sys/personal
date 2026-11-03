# Website security review — 3 November 2026

Scope: content rendering, framework/dependencies, headers, demos and the separate
legacy Express service. Admin authentication and active admin API changes are
reviewed separately. No live database writes or accepted CV test submissions
were made for this review. No private connection information is recorded here.

## Concrete findings

1. **Unsupported framework security baseline.** The initial root package and
   lockfile pin Next.js 14.2.35. npm's advisory metadata identifies affected
   version ranges covering that version, including image-optimizer code
   execution vulnerabilities and App Router denial of service. Individual
   exploitability depends on deployment, image handling and enabled features;
   a vulnerability range alone does not prove a successful exploit here.
   The maintainer's [14 October security notice](https://nextjs.org/blog/nextjs-security-update-october-14-2026)
   gives 15.5.28 and 16.4.1 as patched releases. Registry metadata checked on
   3 November confirms `next@15.5.28` and `eslint-config-next@15.5.28` exist;
   the maintained 15 backport tag resolves to 15.5.28, with React 18.2 supported.
   Root agent owns the upgrade and regression checks.

2. **An unauthenticated alternative publishing service remained runnable.**
   `backend/src/app.js` originally mounted public POST handlers for CV,
   paintings, blogs and portfolio content, allowed broad CORS, and listened
   without a loopback address. The active Next.js website does not call this
   service. Starting that older server with valid database/storage credentials
   would nevertheless expose an independent route for unauthenticated writes.
   Fixed in this pass: an unconditional deny gate returns 410 for every method
   other than GET/HEAD before route/upload processing; the listener binds to
   `127.0.0.1`; broad CORS is removed. Historical read handlers and source files
   remain. There is no flag restoring anonymous writes. Three regression tests
   cover denied methods, permitted reads, gate ordering and listener address.

3. **CMS media URLs initially lacked a trusted-store check.**
   `lib/validation.ts` originally accepted any truthy `blob_url` and pathname.
   Active authenticated CV create/update handlers fetched the supplied URL for
   PDF extraction. A compromised admin session could therefore induce server
   requests to an unintended host. Require the exact configured Vercel Blob
   store, HTTPS/default port, no credentials/query/hash, correct object path,
   no redirect following, response timeout and a byte bound. The admin API
   security agent owns this fix; no overlapping edit was made here.

4. **Clickjacking protection was absent from the original Next configuration.**
   The original `next.config.mjs` provided no frame policy for publishing pages.
   A malicious site could frame a signed-in publisher and disguise controls.
   Root agent owns frame denial, CSP and related response-header changes.

## Existing protections confirmed

- Public database lookups use bound tagged SQL, filter published status, and
  do not expose a public content-write API outside the authenticated namespace.
- `MarkdownContent` skips raw HTML, strips rehype plugins and applies
  `safeMarkdownUrl`; JSON-LD escapes `<` before an inline script insertion.
- Interactive GitHub previews accept only reviewed static demo paths and use
  a sandboxed iframe without `allow-same-origin`. Close messages must originate
  from that frame's window.
- The public CV endpoint validates same-origin JSON, has a streaming body limit,
  validates fields, applies domain checks, and records through parameterized SQL.
  It cannot update portfolio content.

## Dependency advisory check

A read-only request to npm's bulk advisory service checked 311 production-marked
lockfile package names. In addition to Next.js, metadata lists newer fixes for
`undici` (6.29.1), `fast-uri` (3.1.9), `nanoid` (3.3.18), `browserslist`
(4.28.7), `postcss` (8.5.23), `source-map-js` (1.2.2), and
`baseline-browser-mapping` (2.11.0). Some are compiler/build paths or require
APIs and attacker inputs this site does not expose. They must be evaluated and
updated through the lockfile, rather than represented as proven website-edit
vulnerabilities. This check did not mutate package files or install code.

Representative primary advisories:

- [Next.js image optimizer SVG issue](https://github.com/advisories/GHSA-2464-fhr4-w9xw)
- [Next.js image optimizer AVIF issue](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4)
- [Undici TLS option handling](https://github.com/advisories/GHSA-2m5v-pch6-74hx)
- [PostCSS source-map file reads](https://github.com/advisories/GHSA-6g55-p6wh-862q)

This is a focused source review and negative-request verification, not a claim
that a website can never be compromised. Account-level GitHub/Vercel access and
multifactor authentication must remain under the owner's control.
