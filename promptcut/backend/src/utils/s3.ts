// S3 storage utilities (MinIO compatible)
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from './logger';

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: process.env.S3_USE_PATH_STYLE === 'true',
});

const BUCKET_NAME = process.env.S3_BUCKET || 'promptcut-media';

export interface UploadOptions {
  key: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

/**
 * Generate a pre-signed URL for uploading a file
 */
export const getUploadUrl = async (
  key: string,
  expiresIn: number = 3600
): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    logger.debug('Generated upload URL', { key });
    return url;
  } catch (error) {
    logger.error('Failed to generate upload URL', { key, error });
    throw error;
  }
};

/**
 * Generate a pre-signed URL for downloading a file
 */
export const getDownloadUrl = async (
  key: string,
  expiresIn: number = 3600
): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    logger.debug('Generated download URL', { key });
    return url;
  } catch (error) {
    logger.error('Failed to generate download URL', { key, error });
    throw error;
  }
};

/**
 * Check if a file exists in S3
 */
export const fileExists = async (key: string): Promise<boolean> => {
  const command = new HeadObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
};

/**
 * Get the public URL for a file (if bucket is public)
 */
export const getPublicUrl = (key: string): string => {
  const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
  return `${endpoint}/${BUCKET_NAME}/${key}`;
};

/**
 * Generate a unique file key for storage
 */
export const generateFileKey = (
  projectId: string,
  filename: string,
  type: 'original' | 'proxy' | 'thumbnail' | 'export'
): string => {
  const timestamp = Date.now();
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `projects/${projectId}/${type}/${timestamp}_${sanitized}`;
};

export default {
  s3Client,
  getUploadUrl,
  getDownloadUrl,
  fileExists,
  getPublicUrl,
  generateFileKey,
  BUCKET_NAME,
};
