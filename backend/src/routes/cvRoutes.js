import { Router } from 'express';
import { uploadCvHandler, getLatestCvHandler } from '../controllers/cvController.js';
import { uploadCv } from '../middleware/uploadMiddleware.js';

const router = Router();

// POST /api/cv/upload - Accepts single PDF file
router.post('/upload', uploadCv, uploadCvHandler);

// GET /api/cv/latest - Serves the latest extracted CV text
router.get('/latest', getLatestCvHandler);

export default router;
