// Job queue service using BullMQ
import { Queue, Worker, Job as BullJob } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { query } from '../utils/db';
import mediaService from './media.service';
import aiService from './ai.service';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Job types
export interface MediaProcessingJob {
  mediaId: string;
  projectId: string;
  sourceUrl: string;
  filename: string;
}

export interface AIEditJob {
  projectId: string;
  prompt: string;
  mediaIds: string[];
}

export interface RenderJob {
  projectId: string;
  timelineId: string;
  exportId: string;
  format: string;
  resolution: string;
}

// Create queues
export const mediaQueue = new Queue<MediaProcessingJob>('media-processing', { connection });
export const aiQueue = new Queue<AIEditJob>('ai-editing', { connection });
export const renderQueue = new Queue<RenderJob>('rendering', { connection });

// Media Processing Worker
const mediaWorker = new Worker<MediaProcessingJob>(
  'media-processing',
  async (job: BullJob<MediaProcessingJob>) => {
    const { mediaId, projectId, sourceUrl, filename } = job.data;

    logger.info('Processing media', { mediaId, filename });

    try {
      // Update job status in database
      await query(
        'UPDATE jobs SET status = $1, started_at = NOW() WHERE id = $2',
        ['processing', job.id]
      );

      // Extract metadata
      await job.updateProgress(20);
      logger.info('Extracting metadata', { mediaId });
      // Note: In production, download file from S3 first
      // const metadata = await mediaService.extractMetadata(localFilePath);

      // Generate proxy
      await job.updateProgress(40);
      logger.info('Generating proxy', { mediaId });
      const proxyKey = await mediaService.generateProxy(sourceUrl, projectId, filename);

      // Generate thumbnail
      await job.updateProgress(70);
      logger.info('Generating thumbnail', { mediaId });
      const thumbnailKey = await mediaService.generateThumbnail(sourceUrl, projectId, filename);

      // Update media record
      await job.updateProgress(90);
      await mediaService.updateMediaMetadata(mediaId, {
        uri_proxy: proxyKey,
        uri_thumbnail: thumbnailKey,
        // ...metadata fields
      });

      // Update job as completed
      await query(
        `UPDATE jobs SET status = $1, progress = 100, finished_at = NOW(),
         result_json = $2 WHERE id = $3`,
        ['completed', JSON.stringify({ proxyKey, thumbnailKey }), job.id]
      );

      logger.info('Media processing completed', { mediaId });
      return { success: true };
    } catch (error: any) {
      logger.error('Media processing failed', { mediaId, error });

      await query(
        'UPDATE jobs SET status = $1, error_message = $2, finished_at = NOW() WHERE id = $3',
        ['failed', error.message, job.id]
      );

      throw error;
    }
  },
  { connection }
);

// AI Editing Worker
const aiWorker = new Worker<AIEditJob>(
  'ai-editing',
  async (job: BullJob<AIEditJob>) => {
    const { projectId, prompt, mediaIds } = job.data;

    logger.info('Processing AI edit request', { projectId, prompt });

    try {
      await query(
        'UPDATE jobs SET status = $1, started_at = NOW() WHERE id = $2',
        ['processing', job.id]
      );

      // Get media details
      const mediaList = await Promise.all(
        mediaIds.map(id => mediaService.getMediaById(id))
      );
      const validMedia = mediaList.filter(m => m !== null);

      // Generate edit plan
      await job.updateProgress(50);
      const editPlan = await aiService.generateEditPlan(prompt, validMedia);

      // Update job as completed
      await query(
        `UPDATE jobs SET status = $1, progress = 100, finished_at = NOW(),
         result_json = $2 WHERE id = $3`,
        ['completed', JSON.stringify(editPlan), job.id]
      );

      logger.info('AI edit plan generated', { projectId });
      return { success: true, editPlan };
    } catch (error: any) {
      logger.error('AI editing failed', { projectId, error });

      await query(
        'UPDATE jobs SET status = $1, error_message = $2, finished_at = NOW() WHERE id = $3',
        ['failed', error.message, job.id]
      );

      throw error;
    }
  },
  { connection }
);

// Render Worker (delegates to Python service)
const renderWorker = new Worker<RenderJob>(
  'rendering',
  async (job: BullJob<RenderJob>) => {
    const { projectId, timelineId, exportId, format, resolution } = job.data;

    logger.info('Starting render', { projectId, exportId });

    try {
      await query(
        'UPDATE jobs SET status = $1, started_at = NOW() WHERE id = $2',
        ['processing', job.id]
      );

      await query(
        'UPDATE exports SET status = $1 WHERE id = $2',
        ['processing', exportId]
      );

      // Call Python worker to handle actual rendering
      // This would be an HTTP request to the Python FastAPI service
      const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8000';
      const response = await fetch(`${pythonWorkerUrl}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeline_id: timelineId,
          export_id: exportId,
          format,
          resolution,
        }),
      });

      if (!response.ok) {
        throw new Error(`Render failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Update job and export
      await query(
        `UPDATE jobs SET status = $1, progress = 100, finished_at = NOW(),
         result_json = $2 WHERE id = $3`,
        ['completed', JSON.stringify(result), job.id]
      );

      await query(
        `UPDATE exports SET status = $1, uri = $2, file_size = $3, completed_at = NOW()
         WHERE id = $4`,
        ['completed', result.output_uri, result.file_size, exportId]
      );

      logger.info('Render completed', { projectId, exportId });
      return { success: true, result };
    } catch (error: any) {
      logger.error('Render failed', { projectId, exportId, error });

      await query(
        'UPDATE jobs SET status = $1, error_message = $2, finished_at = NOW() WHERE id = $3',
        ['failed', error.message, job.id]
      );

      await query(
        'UPDATE exports SET status = $1 WHERE id = $2',
        ['failed', exportId]
      );

      throw error;
    }
  },
  { connection }
);

// Worker event handlers
[mediaWorker, aiWorker, renderWorker].forEach((worker) => {
  worker.on('completed', (job) => {
    logger.info('Job completed', { jobId: job.id, queue: worker.name });
  });

  worker.on('failed', (job, err) => {
    logger.error('Job failed', { jobId: job?.id, queue: worker.name, error: err });
  });

  worker.on('progress', (job, progress) => {
    logger.debug('Job progress', { jobId: job.id, progress });
  });
});

export default {
  mediaQueue,
  aiQueue,
  renderQueue,
};
