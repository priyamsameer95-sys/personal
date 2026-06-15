import { Router } from 'express';
import { createPortfolioHandler, getPortfolioHandler } from '../controllers/portfolioController.js';
import { uploadPortfolio } from '../middleware/uploadMiddleware.js';

const router = Router();

// POST /api/portfolio/create - Accepts title, description, and 5 to 7 images
router.post('/create', uploadPortfolio, createPortfolioHandler);

// GET /api/portfolio - Returns list of projects
router.get('/', getPortfolioHandler);

export default router;
