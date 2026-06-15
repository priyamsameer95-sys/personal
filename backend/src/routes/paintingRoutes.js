import { Router } from 'express';
import { uploadPaintingHandler, getPaintingsHandler } from '../controllers/paintingController.js';
import { uploadPainting } from '../middleware/uploadMiddleware.js';

const router = Router();

// POST /api/paintings/upload - Accepts single high-res JPG/PNG and description text payload
router.post('/upload', uploadPainting, uploadPaintingHandler);

// GET /api/paintings - Returns paginated list of paintings
router.get('/', getPaintingsHandler);

export default router;
