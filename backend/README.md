# Archived Portfolio Backend — Local Reads Only

The active portfolio uses the authenticated Next.js CMS. It does not call this
older Express/Prisma/AWS S3 service, whose data model is separate.

This archived service binds only to `127.0.0.1`. Every method other than `GET`
and `HEAD` returns `410` before routing or upload parsing. The historical write
controllers remain for reference but cannot be invoked through this server.
Do not deploy it publicly or use it to publish content. There is no environment
flag that restores its unauthenticated uploads.

## Folder Structure

```
backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── config/
│   │   ├── db.js
│   │   └── s3.js
│   ├── controllers/
│   │   ├── cvController.js
│   │   ├── paintingController.js
│   │   ├── blogController.js
│   │   └── portfolioController.js
│   ├── middleware/
│   │   └── uploadMiddleware.js
│   ├── routes/
│   │   ├── cvRoutes.js
│   │   ├── paintingRoutes.js
│   │   ├── blogRoutes.js
│   │   └── portfolioRoutes.js
│   └── app.js
├── .env.example
├── package.json
└── README.md
```

## Setup & Running Instructions

1. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your PostgreSQL `DATABASE_URL` and AWS credentials:
   ```bash
   cp .env.example .env
   ```

3. **Run Prisma Migrations**:
   Run database schema migrations and generate the client code:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start the server**:
   - Dev mode (automatic restarts): `npm run dev`
   - Production mode: `npm start`

## Historical Modules & Read Endpoints

The former `POST` endpoints listed below are **disabled** and return `410`.
Only their `GET` counterparts remain available locally.

### 1. CV Module
- **POST `/api/cv/upload`**: Disabled.
- **GET `/api/cv/latest`**: Serves the latest uploaded CV's extracted text and S3 URL directly.

### 2. Paintings Module
- **POST `/api/paintings/upload`**: Disabled.
- **GET `/api/paintings`**: Serves a paginated list of paintings and descriptions (`?page=1&limit=10`).

### 3. Blogs Module
- **POST `/api/blogs/create`**: Disabled.
- **GET `/api/blogs`**: Serves all blog essays.

### 4. Work Portfolio Module
- **POST `/api/portfolio/create`**: Disabled.
- **GET `/api/portfolio`**: Serves all portfolio projects.
