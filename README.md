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

If any database URL is configured, automatic database preview is disabled. Database-backed pages report connection failures. My Work keeps its authored studies available if additional database entries cannot be loaded. Remove unused database variables or explicitly enable local preview to work offline.

## Connected content and admin setup

The Next.js application uses PostgreSQL through `@vercel/postgres` and Vercel Blob for uploaded images and PDFs. Configure these variables in `.env.local` and separately in the deployment environment:

| Variable | Purpose |
| --- | --- |
| `POSTGRES_URL` | Pooled connection URL for a compatible Vercel/Neon PostgreSQL database. Required for database content reads and writes outside local preview; authored case studies are independent. |
| `ADMIN_PASSWORD` | Required strong, unique password for admin sign-in and session signing. There is no default password; missing configuration disables sign-in. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for media uploads and deletion. |
| `LOCAL_PREVIEW` | Optional `true` to keep public pages in empty preview mode during development. |

`DATABASE_URL` is not an alias for `POSTGRES_URL` in this application. A non-pooling URL alone is also insufficient for the default pooled client. Use `POSTGRES_URL` for the active site.

For a new, dedicated database, sign in at `/minforyam/login`, then send an authenticated `POST` request to `/api/admin/migrate`. The route creates the `content_items` and `media_assets` schema and refuses to run if `content_items` already exists. It also renames older `content` and `content_images` tables when present; review the route and use a backup before running it against an existing database. Do not use the separate backend's Prisma schema for this application.

Create entries in the admin panel and mark them published to show them on the public site. Drafts remain private. CV PDF imports can still extract source text when no body text is supplied. The public Experience page at `/cv` is authored on-site, with a prominent download of the original supplied CV. The legacy `downloadable` database field is retained for compatibility; legacy content attachment actions remain disabled and the publishing forms save it as false.

## Authored My Work collection

`content/work/case-studies.json` is the public source of truth for company groups, compact visual summaries, supported chart data, executive briefs, work classifications, full narrative and reference chapters, media captions and source notes. The typed export in `case-studies.ts` feeds `/product`, `/product/<slug>`, and homepage highlights. Published database work is appended without duplicating reserved case-study slugs. A registered alias redirects to its canonical case-study URL.

Images, inline videos and authored diagrams live in `public/work/`. Captured public pages and their generated walkthroughs are labelled as dated product references; they are not evidence of ownership of every current feature. A short visual overview leads each case; the full narrative and source references remain in accessible expandable chapters. Image enlargement remains inside the website. Existing section fragments open their containing chapters. Comparison charts use supported values with measurement limits beside them. Percentage rings explicitly label any implied remainder; proposals retain their proposal labels.

Download CV is available in the navigation, homepage and Experience page. It serves the unchanged user-supplied PDF from `public/cv/`. Other source documents, archives and separate media download actions remain retired; public Markdown rejects attachment links. Original project documents are retained as local reference material, with their supported information represented as website diagrams, charts, text, tables and reviewed images.

Experience also lists the supplied Udemy cryptocurrency and Pendo AI for Product Management certifications, with issue dates, credential identifiers and verified credential-page links. The homepage uses the interactive paper-peel illustration alongside its introduction; the former boxed four-step graphic is removed.

Original company, product and university logos are served locally from `public/brands/` through the shared `BrandMarks` component. Colours and proportions are preserved, with dark backing for original white artwork. Source URLs and checksums are recorded in [`BRAND-SOURCES.md`](BRAND-SOURCES.md); relationship labels remain separate from the branding.

Coverage and publication exclusions are documented in [`WORK-COVERAGE.md`](WORK-COVERAGE.md). The document-to-chapter mapping is in [`CONTENT-COVERAGE.md`](CONTENT-COVERAGE.md). Private research notes, credentials, applicant records, and farmer identifiers are not included in the public registry. The admin importer continues to accept source PDFs; this does not make them visitor downloads.

## Validation and production

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

The authored homepage, My Work, registered case studies, Experience and Art gallery work in production without database credentials. Additional art uploads, Writing and legacy database detail pages require a configured database. `LOCAL_PREVIEW=true` does not bypass the production requirement for those database detail pages. The public error screen allows retrying a failed load without exposing connection details to visitors.

The Art registry in `content/art/works.json` contains six named paintings, original artist notes, source-page mappings and the separate portfolio-cover photograph. Images in `public/art/priyam/` preserve the supplied artwork; lighter gallery previews open the full images in an accessible dialog. Close-ups and notes use native expandable sections. Published admin art entries remain available below the supplied portfolio and retain their existing detail routes. Source coverage and extraction details are in [ART-SOURCES.md](ART-SOURCES.md); the source PDF and lossless originals remain in the private local archive.

## Repository structure

- `app/`: public pages, content detail pages, admin dashboard, and API routes.
- `components/`: shared site components and admin forms.
- `lib/`: database access, authentication, content validation, and slug generation.
- `backend/`: a separate Express/Prisma/AWS S3 service with its own package and data model. The Next.js site does not call this service, and running it is unnecessary for the site preview. Its setup is documented in [`backend/README.md`](backend/README.md).

Keep actual credentials in ignored environment files or hosting settings. `.env.example` contains placeholders only.
