import { Router } from 'express';
import { createBlogHandler, getBlogsHandler } from '../controllers/blogController.js';
import { uploadBlog } from '../middleware/uploadMiddleware.js';

const router = Router();

// POST /api/blogs/create - Accepts title, content, and up to 3 image files
router.post('/create', uploadBlog, createBlogHandler);

// GET /api/blogs - Returns list of blogs
router.get('/', getBlogsHandler);

export default router;
