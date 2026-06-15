# Portfolio Content Management Backend

A modular and scalable Express.js backend for portfolio content management, leveraging Prisma ORM, PostgreSQL, AWS S3 storage, and Multer file upload parsing.

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

## Modules & Endpoints

### 1. CV Module
- **POST `/api/cv/upload`**: Uploads a single PDF file (using field name `file`). Automatically extracts the text contents and uploads the file to S3.
- **GET `/api/cv/latest`**: Serves the latest uploaded CV's extracted text and S3 URL directly.

### 2. Paintings Module
- **POST `/api/paintings/upload`**: Accepts a single image (field `file`, JPG or PNG) and a `description` string (up to 500 words).
- **GET `/api/paintings`**: Serves a paginated list of paintings and descriptions (`?page=1&limit=10`).

### 3. Blogs Module
- **POST `/api/blogs/create`**: Handles multipart form-data. Accepts a `title`, `content` (up to 2500 words), and up to 3 banner images (field name `files`, JPG or PNG).
- **GET `/api/blogs`**: Serves all blog essays.

### 4. Work Portfolio Module
- **POST `/api/portfolio/create`**: Handles bulk image uploads. Accepts a `title`, `description` (up to 1000 words), and between 5 and 7 project images (field name `files`, JPG or PNG).
- **GET `/api/portfolio`**: Serves all portfolio projects.
