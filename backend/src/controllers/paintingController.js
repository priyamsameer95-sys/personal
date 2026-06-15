import { prisma } from '../config/db.js';
import { uploadToS3 } from '../config/s3.js';

function countWords(str) {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Handle Painting image upload and description storage.
 */
export async function uploadPaintingHandler(req, res) {
  try {
    const { description } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'An image file (JPG or PNG) is required.' });
    }

    if (!description) {
      return res.status(400).json({ error: 'A text description is required.' });
    }

    // Validate description length (max 500 words)
    const wordCount = countWords(description);
    if (wordCount > 500) {
      return res.status(400).json({
        error: `Description exceeds the 500-word limit. Word count: ${wordCount}`
      });
    }

    // Upload high-res image to S3
    let imageUrl = '';
    try {
      imageUrl = await uploadToS3(req.file, 'paintings');
    } catch (s3Err) {
      console.error('S3 upload failed:', s3Err);
      return res.status(500).json({ error: 'Failed to upload image file to S3.' });
    }

    // Store painting details in database
    const painting = await prisma.painting.create({
      data: {
        imageUrl,
        description,
      },
    });

    return res.status(201).json({
      message: 'Painting uploaded successfully.',
      data: painting,
    });
  } catch (err) {
    console.error('Painting upload controller failed:', err);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
}

/**
 * Serves a paginated list of paintings.
 */
export async function getPaintingsHandler(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    if (page < 1 || limit < 1) {
      return res.status(400).json({ error: 'Page and limit must be positive integers.' });
    }

    const skip = (page - 1) * limit;

    const [paintings, total] = await Promise.all([
      prisma.painting.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.painting.count(),
    ]);

    return res.status(200).json({
      data: paintings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Get paintings controller failed:', err);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
}
