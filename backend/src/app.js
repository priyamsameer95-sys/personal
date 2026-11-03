import express from 'express';
import dotenv from 'dotenv';
import { blockLegacyMutations, LEGACY_BACKEND_HOST } from './legacy-read-only.js';

import cvRoutes from './routes/cvRoutes.js';
import paintingRoutes from './routes/paintingRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
import portfolioRoutes from './routes/portfolioRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.disable('x-powered-by');
// Reject before routing, file parsing, S3 uploads or database mutations. This
// service is retained only for local reads of its separate historical model.
app.use(blockLegacyMutations);

// Routing Modules
app.use('/api/cv', cvRoutes);
app.use('/api/paintings', paintingRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/portfolio', portfolioRoutes);

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  if (err.message && (err.message.includes('Invalid file type') || err.message.includes('limit') || err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_UNEXPECTED_FILE')) {
    let msg = err.message;
    if (err.code === 'LIMIT_FILE_SIZE') msg = 'File size limit exceeded.';
    if (err.code === 'LIMIT_UNEXPECTED_FILE') msg = 'Too many files uploaded.';
    return res.status(400).json({ error: msg });
  }
  
  console.error('Unhandled Error:', err);
  return res.status(500).json({ error: 'Internal Server Error.' });
});

app.listen(PORT, LEGACY_BACKEND_HOST, () => {
  console.log(`Archived read-only backend listening on ${LEGACY_BACKEND_HOST}:${PORT}`);
});

export default app;
