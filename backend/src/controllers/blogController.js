import { prisma } from '../config/db.js';
import { uploadToS3 } from '../config/s3.js';

function countWords(str) {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Handle blog creation with S3 uploads and database storage.
 */
export async function createBlogHandler(req, res) {
  try {
    const { title, content } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'A blog title is required.' });
    }

    if (!content) {
      return res.status(400).json({ error: 'Blog content is required.' });
    }

    // Validate content length (max 2500 words)
    const wordCount = countWords(content);
    if (wordCount > 2500) {
      return res.status(400).json({
        error: `Blog content exceeds the 2500-word limit. Word count: ${wordCount}`
      });
    }

    // Check files array
    const files = req.files || [];
    if (files.length > 3) {
      return res.status(400).json({ error: 'A blog can have a maximum of 3 images.' });
    }

    // Upload files to S3
    const imageUrls = [];
    for (const file of files) {
      try {
        const url = await uploadToS3(file, 'blogs');
        imageUrls.push(url);
      } catch (s3Err) {
        console.error('S3 upload failed for blog image:', s3Err);
        return res.status(500).json({ error: 'Failed to upload blog images to S3.' });
      }
    }

    // Save blog record
    const blog = await prisma.blog.create({
      data: {
        title,
        content,
        images: imageUrls,
      },
    });

    return res.status(201).json({
      message: 'Blog created successfully.',
      data: blog,
    });
  } catch (err) {
    console.error('Create blog controller failed:', err);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
}

/**
 * Get all blogs.
 */
export async function getBlogsHandler(req, res) {
  try {
    const blogs = await prisma.blog.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      data: blogs,
    });
  } catch (err) {
    console.error('Get blogs controller failed:', err);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
}
