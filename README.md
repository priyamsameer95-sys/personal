# Priyam Sameer — Portfolio

A Next.js 14 portfolio presenting Priyam's product leadership, experience, writing and paintings. Visitors read the case studies and view the supporting material on the website. The active application lives in `app/`, with authenticated content management at `/minforyam` and server routes under `/api/admin`.

## Local preview

Use Node.js 22.3 or newer (Node.js 20.16–20.x is also supported by the PDF parser). Run these commands from the repository root:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000). No database or storage credentials are needed to preview the authored homepage, My Work collection, case studies, inline media, Experience or Art gallery. The supplied Art portfolio is available locally; additional database uploads and Writing remain empty without a configured publishing database. Existing database content URLs remain supported when that content is published.

If database credentials are already configured and you want to preview without accessing that database, set `LOCAL_PREVIEW=true` in `.env.local`. This flag only applies when `NODE_ENV` is unset or `development`; it cannot bypass database access in a production build or deployment. Public preview reads never write data, and admin routes always use the real database.

If any database URL is configured, automatic database preview is disabled. Database-backed pages report connection failures. Selected Work and authored case studies remain independent of those database reads. Remove unused database variables or explicitly enable local preview to work offline.

## Connected content and admin setup

The Next.js application uses PostgreSQL through `@vercel/postgres` and Vercel Blob for uploaded images and PDFs. Configure these variables in `.env.local` and separately in the deployment environment:

| Variable | Purpose |
| --- | --- |
| `POSTGRES_URL` | Pooled connection URL for a compatible Vercel/Neon PostgreSQL database. Required for database content reads and writes outside local preview; authored case studies are independent. |
| `ADMIN_PASSWORD` | Required strong, unique password for admin sign-in and session signing. There is no default password; missing configuration disables sign-in. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for media uploads and deletion. |
| `LOCAL_PREVIEW` | Optional `true` to keep public pages in empty preview mode during development. |
| `NEXT_PUBLIC_SITE_URL` | Optional public origin, including `https://`, for social-preview image URLs. Vercel deployment hostnames are used automatically when available. |

`DATABASE_URL` is not an alias for `POSTGRES_URL` in this application. A non-pooling URL alone is also insufficient for the default pooled client. Use `POSTGRES_URL` for the active site.

For a new, dedicated database, sign in at `/minforyam/login`, then send an authenticated `POST` request to `/api/admin/migrate`. The route creates the `content_items` and `media_assets` schema and refuses to run if `content_items` already exists. It also renames older `content` and `content_images` tables when present; review the route and use a backup before running it against an existing database. Do not use the separate backend's Prisma schema for this application.

Create entries in the admin panel and mark them published to show them on the public site. Drafts remain private. CV PDF imports can still extract source text when no body text is supplied. The public Experience page at `/cv` is authored on-site, with a prominent download of Priyam’s supplied PDF. The legacy `downloadable` database field is retained for compatibility; legacy content attachment actions remain disabled and the publishing forms save it as false.

## CV interest records

Every visible Download CV button asks for an email address and explains that Priyam receives it as a record of interest, without a newsletter subscription. `/api/cv-download` saves the request in PostgreSQL before returning the exact supplied, versioned PDF. A failed or unconfigured database shows a retry message; offline preview does not pretend to record requests. No email is sent.

The first request or authenticated admin visit automatically creates the dedicated `cv_download_leads` and `cv_download_rate_limits` tables with `CREATE TABLE IF NOT EXISTS`, independently of the content migration. `POSTGRES_URL` must permit table creation. Addresses are normalized and deduplicated; repeat requests update the count and latest time/page. The database limiter stores a short-lived HMAC fingerprint, never the raw IP. `CV_LEAD_RATE_SECRET` is optional; the existing admin password or database secret supplies the key when omitted.

Sign in at `/minforyam/login`, then select **CV interests** on the dashboard or open `/minforyam/cv-leads`. The private view lists the latest 200 addresses; authenticated `/api/admin/cv-leads?format=csv` exports up to the latest 10,000. Counts are recorded requests, not proof of a completed download or a PDF open. Verify persistence by submitting a test address, reloading the admin view and checking its row/count; repeated requests from the same browser address are limited to five per 15-minute window. The original public PDF route remains compatible with existing links, so this form captures the normal download flow rather than restricting direct file access.

## Authored work and selected projects

`content/work/case-studies.json` is the public source of truth for company groups, compact visual summaries, supported chart data, executive briefs, work classifications, full narrative and reference chapters, media captions and source notes. The typed export in `case-studies.ts` feeds `/product`, `/product/<slug>`, and homepage highlights. Work deliberately selects eight projects: College.money, lending MCP, lender integrations, EduLoans, RiskStac/ULI, SilkRoute, crop-health AI and UrbanKhet. It does not append the full registry or an additional publishing feed. All 25 case-study routes and 20 aliases remain available through Experience proof links, related studies and direct URLs. A registered alias redirects to its canonical case-study URL.

Images, inline videos and authored diagrams live in `public/work/`. Current public captures and generated tours are dated references, not historical ownership proof. Work offers four problem-based paths; original logos and official company websites support concise remit descriptions. The eight selected cases are initially visible without a filter.

Each main case explains the problem, personal remit, consequential decisions and scoped results. Explicit `primaryMediaIds: []` permits a purposeful account without decorative media. `presentation.format` distinguishes a case, note or archive; selected main-media/table IDs prevent source dumps. The complete open reference collection is at `/product/<slug>/references`; old section/chapter fragments reach the appropriate main or reference location. `internalSectionIds` prevents an unresolved private numerical register from being published. All 25 case URLs, 20 aliases and original media remain. No content accordions or nested scrolling galleries are used.

Every Download CV action uses `CvDownload` and serves the exact bytes of `Priyam_Sameer_Zero_to_One_Product_Manager_CV (4).pdf`. Its source filename, SHA-256, byte count and page count are recorded in `content/cv-download.json`. The public filename remains compatible with existing links; a SHA-derived version query makes updated controls bypass an older cached CV. The downloaded PDF is not generated from `app/cv/content.json`, which remains the separate source for the on-site Experience page. The obsolete PDF generator has been removed. Other source documents, archives and separate media downloads remain retired; public Markdown rejects attachment links.

Experience includes the complete role chronology, concise responsibilities, all 25 descriptive case links, education and two certifications. Credential verification links retain their identifiers in the destination, rather than printing them as extra CV text. Home leads with three delivered problems before the separate EduLoans prototype/MCP proposal, and includes a bounded help module, selected career and original painting. Source and maturity labels distinguish historical delivery, current references, authored explanation and proposed validation.

The full 342-page audit implementation, all 497 figure IDs, source continuity and unresolved evidence are mapped in [`audit/2026-10-15/README.md`](audit/2026-10-15/README.md). Original section/media identities and hashes are recorded before editing; unique supported detail is retained in reference records while the main account is shortened.

Original company, product and university logos are served locally from `public/brands/` through the shared `BrandMarks` component. Colours and proportions are preserved, with dark backing for original white artwork. Source URLs and checksums are recorded in [`BRAND-SOURCES.md`](BRAND-SOURCES.md); relationship labels remain separate from the branding.

Coverage and publication exclusions are documented in [`WORK-COVERAGE.md`](WORK-COVERAGE.md). The document-to-chapter mapping is in [`CONTENT-COVERAGE.md`](CONTENT-COVERAGE.md), media and original section continuity in [`MEDIA-FIRST-COVERAGE.md`](content/work/MEDIA-FIRST-COVERAGE.md), and the additive business/technical depth in [`SELECTED-WORK-COVERAGE.md`](content/work/SELECTED-WORK-COVERAGE.md). Private research notes, credentials, applicant records, and farmer identifiers are not included in the public registry. The admin importer continues to accept source PDFs; this does not make them visitor downloads.

## Validation and production

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

The authored homepage, My Work, registered case studies, Experience and Art gallery work in production without database credentials. Additional art uploads, Writing and legacy database detail pages require a configured database. Writing keeps an honest case-led holding page when no publishing connection is configured; a configured connection failure has retry and Work recovery actions. Unknown legacy detail routes return a deliberate 404 when no publishing connection is configured; configured connection failures remain errors. `LOCAL_PREVIEW=true` does not bypass production database requirements. Recovery screens do not expose connection details to visitors.

The current design contract is in [DESIGN-DIRECTION.md](DESIGN-DIRECTION.md), with the audit and verification record in [SITE-AUDIT.md](SITE-AUDIT.md). Cream paper, readable black ink, quiet rules and colour at the paper edge frame original artwork, brands and relevant evidence. Company context uses short prose with inline proof instead of a scale sidebar. Main decisions remain open; detailed records and deduplicated sources are available on a separate open evidence page. Mobile navigation preserves visible CV/contact actions; supporting metadata and measurement notes stay readable.

The Art registry in `content/art/works.json` contains six named paintings, original artist notes, source-page mappings and the separate portfolio-cover photograph. Images in `public/art/priyam/` preserve the supplied artwork; lighter gallery previews open the full images in an accessible dialog. Artist notes remain open; small Detail thumbnails enlarge directly beside the paintings. The unresolved ANNA cover is retained in source records, not presented as another artwork. Published admin art entries remain available below the supplied portfolio and retain their existing detail routes. Source coverage and extraction details are in [ART-SOURCES.md](ART-SOURCES.md); the source PDF and lossless originals remain in the private local archive.

## Repository structure

- `app/`: public pages, content detail pages, admin dashboard, and API routes.
- `components/`: shared site components and admin forms.
- `lib/`: database access, authentication, content validation, and slug generation.
- `backend/`: a separate Express/Prisma/AWS S3 service with its own package and data model. The Next.js site does not call this service, and running it is unnecessary for the site preview. Its setup is documented in [`backend/README.md`](backend/README.md).

Keep actual credentials in ignored environment files or hosting settings. `.env.example` contains placeholders only.

### GitHub projects

`/github` lists every public repository owned by `priyamsameer95-sys`, grouped by AI/audio orchestration, financial decision systems, local-first developer tools, creative browser experiences and build infrastructure. The header and homepage link to it.

- Public GitHub discovery is cached for one hour and uses no credentials. Private and foreign-owned repositories are excluded.
- `content/github-projects.json` holds the reviewed descriptions, ordering, genuine demo/walkthrough links and a complete public fallback snapshot. Update this file to curate new projects; uncurated public repositories still appear automatically.
- Descriptions are grounded in repository READMEs/source documents; prototype and empty-repository labels are explicit. Technical pitches include source-backed mechanisms and explicitly scoped models. The catalogue does not execute external project code or assert production results.
