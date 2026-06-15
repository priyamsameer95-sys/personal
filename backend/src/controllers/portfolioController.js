import { prisma } from '../config/db.js';
import { uploadToS3 } from '../config/s3.js';

function countWords(str) {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Handle portfolio project creation.
 * Accepts between 5 and 7 images, uploads to S3, and links to the project database record.
 */
export async function createPortfolioHandler(req, res) {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'A project title is required.' });
    }

    if (!description) {
      return res.status(400).json({ error: 'A project description is required.' });
    }

    // Validate description length (max 1000 words)
    const wordCount = countWords(description);
    if (wordCount > 1000) {
      return res.status(400).json({
        error: `Project description exceeds the 1000-word limit. Word count: ${wordCount}`
      });
    }

    // Enforce limits: 5 to 7 images
    const files = req.files || [];
    if (files.length < 5 || files.length > 7) {
      return res.status(400).json({
        error: `Portfolio projects require between 5 and 7 image files. Received: ${files.length}`
      });
    }

    // Upload images to S3
    const imageUrls = [];
    for (const file of files) {
      try {
        const url = await uploadToS3(file, 'portfolio');
        imageUrls.push(url);
      } catch (s3Err) {
        console.error('S3 upload failed for portfolio image:', s3Err);
        return res.status(500).json({ error: 'Failed to upload project images to S3.' });
      }
    }

    // Create database record
    const project = await prisma.project.create({
      data: {
        title,
        description,
        images: imageUrls,
      },
    });

    return res.status(201).json({
      message: 'Portfolio project created successfully.',
      data: project,
    });
  } catch (err) {
    console.error('Create portfolio controller failed:', err);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
}

/**
 * Get all portfolio projects.
 */
export async function getPortfolioHandler(req, res) {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      data: projects,
    });
  } catch (err) {
    console.error('Get portfolio controller failed:', err);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
}
