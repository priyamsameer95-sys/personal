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

Create entries in the admin panel and mark them published to show them on the public site. Drafts remain private. CV PDF imports can still extract source text when no body text is supplied. The public Experience page at `/cv` is authored on-site, with a prominent download of the original supplied CV. The legacy `downloadable` database field is retained for compatibility; legacy content attachment actions remain disabled and the publishing forms save it as false.

## Authored work and selected projects

`content/work/case-studies.json` is the public source of truth for company groups, compact visual summaries, supported chart data, executive briefs, work classifications, full narrative and reference chapters, media captions and source notes. The typed export in `case-studies.ts` feeds `/product`, `/product/<slug>`, and homepage highlights. Work deliberately selects eight projects: College.money, lending MCP, lender integrations, EduLoans, RiskStac/ULI, SilkRoute, crop-health AI and UrbanKhet. It does not append the full registry or an additional publishing feed. All 25 case-study routes and 20 aliases remain available through Experience proof links, related studies and direct URLs. A registered alias redirects to its canonical case-study URL.

Images, inline videos and authored diagrams live in `public/work/`. Captured public pages and their generated walkthroughs are labelled as dated product references; they are not evidence of ownership of every current feature. Work groups selected projects under sourced company introductions with original logos, business context and official website actions, except for the historical UrbanKhet venture. Each project shows relevant media, personal responsibility, a key decision and a qualified result or status. Absolute also exposes direct proof links for the connected Upaj farmer app, farm monitoring, crop-health AI and institutional risk-information work.

Each case starts with a compact introduction and relevant visual evidence, followed by the situation, three specific decisions, results and limits, and open supporting source families. Galleries and written walkthrough descriptions remain visible without content accordions or nested scrolling regions. Images enlarge inside the website with complete-image fit and a scrollable actual-size view. Existing section fragments reach their owning open chapter. Comparison charts retain measurement limits beside their supported values; percentage rings label any implied remainder. Prototypes, proposals, current references and historical evidence retain their distinct labels. Official source text is linked through readable HTTPS references beside source context.

The current registry contains 25 studies across nine contexts, 221 sections and 34 tables. This retains all 198 original sections, four validation additions and 19 selected-depth additions; the previous 17 tables are retained alongside 17 new tables. There are 113 unique media URLs (103 images and ten videos) across 121 registry entries, including the original 17 workflow SVGs, one MCP proposal SVG, three new authored diagrams, four original prototype captures and five original UrbanKhet LinkedIn images.

Download CV is available in the navigation, homepage and Experience page. It serves the unchanged user-supplied PDF from `public/cv/`. Other source documents, archives and separate media download actions remain retired; public Markdown rejects attachment links. Original project documents are retained as local reference material, with their supported information represented as website diagrams, charts, text, tables and reviewed images.

Experience is a clean CV with complete career progression, personal scope and inline proof links to all 25 case studies. It also lists the supplied Udemy cryptocurrency and Pendo AI for Product Management certifications, with issue dates, credential identifiers and verified credential-page links. Home separates its identity, positioning, current role and primary actions from three inline project previews below the hero: College.money, the lending MCP proposal and crop-health AI. The prototype preview and paper-peel illustration are removed from the hero.

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

The authored homepage, My Work, registered case studies, Experience and Art gallery work in production without database credentials. Additional art uploads, Writing and legacy database detail pages require a configured database. Writing distinguishes an empty published collection from a failed or missing production connection, with retry and work recovery actions. Unknown legacy detail routes return a deliberate 404 when no publishing connection is configured; configured connection failures remain errors. `LOCAL_PREVIEW=true` does not bypass production database requirements. Recovery screens do not expose connection details to visitors.

The critical design audit and verification record is in [SITE-AUDIT.md](SITE-AUDIT.md). The shared visual direction uses cream paper, readable black ink, quiet rules and colour revealed through the peel, original artwork, brands and relevant evidence. Mobile navigation preserves visible CV/contact actions; supporting metadata and measurement notes stay readable.

The Art registry in `content/art/works.json` contains six named paintings, original artist notes, source-page mappings and the separate portfolio-cover photograph. Images in `public/art/priyam/` preserve the supplied artwork; lighter gallery previews open the full images in an accessible dialog. Close-ups and artist notes remain visible beside the paintings. Published admin art entries remain available below the supplied portfolio and retain their existing detail routes. Source coverage and extraction details are in [ART-SOURCES.md](ART-SOURCES.md); the source PDF and lossless originals remain in the private local archive.

## Repository structure

- `app/`: public pages, content detail pages, admin dashboard, and API routes.
- `components/`: shared site components and admin forms.
- `lib/`: database access, authentication, content validation, and slug generation.
- `backend/`: a separate Express/Prisma/AWS S3 service with its own package and data model. The Next.js site does not call this service, and running it is unnecessary for the site preview. Its setup is documented in [`backend/README.md`](backend/README.md).

Keep actual credentials in ignored environment files or hosting settings. `.env.example` contains placeholders only.
