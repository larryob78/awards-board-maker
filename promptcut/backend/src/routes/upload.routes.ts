// Upload routes
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getUploadUrl, generateFileKey } from '../utils/s3';
import { query } from '../utils/db';
import { logger } from '../utils/logger';
import mediaService from '../services/media.service';
import { mediaQueue } from '../services/queue.service';

const router = Router();

/**
 * POST /upload
 * Request a pre-signed URL for uploading media
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { project_id, filename, content_type } = req.body;

    if (!project_id || !filename) {
      return res.status(400).json({
        error: 'project_id and filename are required',
      });
    }

    // Generate unique media ID and file key
    const mediaId = uuidv4();
    const fileKey = generateFileKey(project_id, filename, 'original');

    // Determine media type from content_type or filename
    let mediaType: 'video' | 'audio' | 'image' = 'video';
    if (content_type) {
      if (content_type.startsWith('audio/')) mediaType = 'audio';
      else if (content_type.startsWith('image/')) mediaType = 'image';
    }

    // Generate pre-signed upload URL
    const uploadUrl = await getUploadUrl(fileKey, 3600);

    // Create media entry
    const media = await mediaService.createMedia({
      project_id,
      filename,
      uri_original: fileKey,
      media_type: mediaType,
    });

    // Create job for processing
    const jobResult = await query(
      `INSERT INTO jobs (id, project_id, type, payload_json, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        uuidv4(),
        project_id,
        'upload',
        JSON.stringify({ media_id: media.id, file_key: fileKey }),
        'pending',
      ]
    );

    const job = jobResult.rows[0];

    // Queue media processing job
    await mediaQueue.add('process-media', {
      mediaId: media.id,
      projectId: project_id,
      sourceUrl: fileKey,
      filename,
    }, {
      jobId: job.id,
    });

    logger.info('Upload URL generated', { mediaId: media.id, filename });

    res.json({
      upload_url: uploadUrl,
      media_id: media.id,
      file_key: fileKey,
      job_id: job.id,
    });
  } catch (error: any) {
    logger.error('Upload request failed', { error });
    res.status(500).json({ error: error.message });
  }
});

export default router;
