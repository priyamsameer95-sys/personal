import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Uploads a file buffer to S3 and returns the public file URL.
 * @param {Express.Multer.File} file
 * @param {string} folder
 * @returns {Promise<string>} S3 Object URL
 */
export async function uploadToS3(file, folder = 'uploads') {
  if (!process.env.AWS_S3_BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not defined.');
  }

  const fileExtension = file.originalname.split('.').pop();
  const fileKey = `${folder}/${crypto.randomUUID()}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3Client.send(command);

  return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileKey}`;
}
