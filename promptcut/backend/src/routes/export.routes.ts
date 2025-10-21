// Export routes
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../utils/db';
import { logger } from '../utils/logger';
import { renderQueue } from '../services/queue.service';
import { getDownloadUrl } from '../utils/s3';

const router = Router();

/**
 * POST /export
 * Start a new export/render job
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { project_id, timeline_id, format = 'mp4', resolution = '1920x1080' } = req.body;

    if (!project_id || !timeline_id) {
      return res.status(400).json({
        error: 'project_id and timeline_id are required',
      });
    }

    // Validate format and resolution
    const validFormats = ['mp4', 'mov', 'webm'];
    const validResolutions = ['1920x1080', '1280x720', '3840x2160', '1080x1920'];

    if (!validFormats.includes(format)) {
      return res.status(400).json({
        error: `Invalid format. Must be one of: ${validFormats.join(', ')}`,
      });
    }

    if (!validResolutions.includes(resolution)) {
      return res.status(400).json({
        error: `Invalid resolution. Must be one of: ${validResolutions.join(', ')}`,
      });
    }

    // Create export record
    const exportId = uuidv4();
    const filename = `export_${Date.now()}.${format}`;

    await query(
      `INSERT INTO exports (id, project_id, filename, format, resolution, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [exportId, project_id, filename, format, resolution, 'pending']
    );

    // Create job
    const jobId = uuidv4();
    await query(
      `INSERT INTO jobs (id, project_id, type, payload_json, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        jobId,
        project_id,
        'render',
        JSON.stringify({ timeline_id, export_id: exportId, format, resolution }),
        'pending',
      ]
    );

    // Update export with job_id
    await query(
      'UPDATE exports SET job_id = $1 WHERE id = $2',
      [jobId, exportId]
    );

    // Queue render job
    await renderQueue.add('render-video', {
      projectId: project_id,
      timelineId: timeline_id,
      exportId,
      format,
      resolution,
    }, {
      jobId,
    });

    logger.info('Export started', { exportId, format, resolution });

    res.json({
      export_id: exportId,
      job_id: jobId,
      status: 'pending',
      message: 'Export started',
    });
  } catch (error: any) {
    logger.error('Export request failed', { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /export/:id
 * Get export status and download URL
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM exports WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Export not found' });
    }

    const exportData = result.rows[0];

    // If completed, generate download URL
    if (exportData.status === 'completed' && exportData.uri) {
      exportData.download_url = await getDownloadUrl(exportData.uri, 3600);
    }

    // Get job progress
    if (exportData.job_id) {
      const jobResult = await query(
        'SELECT progress, status FROM jobs WHERE id = $1',
        [exportData.job_id]
      );

      if (jobResult.rows.length > 0) {
        exportData.job_progress = jobResult.rows[0].progress;
        exportData.job_status = jobResult.rows[0].status;
      }
    }

    res.json(exportData);
  } catch (error: any) {
    logger.error('Failed to get export', { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /export
 * List all exports for a project
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { project_id } = req.query;

    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required' });
    }

    const result = await query(
      'SELECT * FROM exports WHERE project_id = $1 ORDER BY created_at DESC',
      [project_id]
    );

    res.json(result.rows);
  } catch (error: any) {
    logger.error('Failed to list exports', { error });
    res.status(500).json({ error: error.message });
  }
});

export default router;
