# Priyam Sameer — Portfolio

A Next.js 14 portfolio for product work, paintings, writing, and a printable CV. The active application lives in `app/`, with authenticated content management at `/minforyam` and server routes under `/api/admin`.

## Local preview

Use Node.js 22.3 or newer (Node.js 20.16–20.x is also supported by the PDF parser). Run these commands from the repository root:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000). No database or storage credentials are needed to preview the authored homepage, My Work collection, case studies, media downloads, or source CV. Database-backed art and writing collections remain empty in local preview. Existing database content URLs remain supported when that content is published.

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

Create entries in the admin panel and mark them published to show them on the public site. Drafts remain private. CV PDF uploads extract text automatically when no body text is supplied. The public CV page uses the designated source text and downloads the unchanged supplied PDF.

## Authored My Work collection

`content/work/case-studies.json` is the public source of truth for company groups, narrative sections, scoped outcomes, media captions, and real downloads. The typed export in `case-studies.ts` feeds `/product`, `/product/<slug>`, and homepage highlights. Published database work is appended without duplicating reserved case-study slugs. A registered alias redirects to its canonical case-study URL.

Assets live in `public/work/`. Captured public pages and their generated walkthroughs are labelled as dated product references; they are not evidence of ownership of every current feature. Each authored case has a PDF containing the complete public narrative. Rebuild those PDFs after changing the JSON with Python and ReportLab:

```bash
python3 scripts/build-work-pdfs.py
```

The source archive coverage and publication exclusions are documented in [`WORK-COVERAGE.md`](WORK-COVERAGE.md). Private research notes, credentials, applicant records, and farmer identifiers are not included in the published registry. The admin uploader continues to support images/PDFs; these curated video and ZIP assets are source-controlled independently.

## Validation and production

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

The authored homepage, My Work, registered case studies, and source CV work in production without database credentials. Database-backed art, writing, and legacy detail pages require a configured database. `LOCAL_PREVIEW=true` does not bypass that production requirement. The public error screen allows retrying a failed load without exposing connection details to visitors.

## Repository structure

- `app/`: public pages, content detail pages, admin dashboard, and API routes.
- `components/`: shared site components and admin forms.
- `lib/`: database access, authentication, content validation, and slug generation.
- `backend/`: a separate Express/Prisma/AWS S3 service with its own package and data model. The Next.js site does not call this service, and running it is unnecessary for the site preview. Its setup is documented in [`backend/README.md`](backend/README.md).

Keep actual credentials in ignored environment files or hosting settings. `.env.example` contains placeholders only.
