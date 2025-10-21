// AI editing routes
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import aiService from '../services/ai.service';
import mediaService from '../services/media.service';
import timelineService from '../services/timeline.service';
import { query } from '../utils/db';
import { logger } from '../utils/logger';
import { aiQueue } from '../services/queue.service';
import { AIEditRequest } from '../types';

const router = Router();

/**
 * POST /ai/plan
 * Generate an edit plan from a prompt
 */
router.post('/plan', async (req: Request, res: Response) => {
  try {
    const { project_id, prompt, context }: AIEditRequest = req.body;

    if (!project_id || !prompt) {
      return res.status(400).json({
        error: 'project_id and prompt are required',
      });
    }

    logger.info('AI edit plan requested', { project_id, prompt });

    // Get available media
    const media = await mediaService.getProjectMedia(project_id);

    if (media.length === 0) {
      return res.status(400).json({
        error: 'No media available. Please upload media first.',
      });
    }

    // Get current timeline if exists
    const timeline = await timelineService.getOrCreateTimeline(project_id);

    // Create job
    const jobId = uuidv4();
    await query(
      `INSERT INTO jobs (id, project_id, type, payload_json, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        jobId,
        project_id,
        'ai_plan',
        JSON.stringify({ prompt, media_ids: media.map(m => m.id) }),
        'pending',
      ]
    );

    // Queue AI job
    await aiQueue.add('generate-edit-plan', {
      projectId: project_id,
      prompt,
      mediaIds: media.map(m => m.id),
    }, {
      jobId,
    });

    res.json({
      job_id: jobId,
      status: 'pending',
      message: 'Edit plan generation started',
    });
  } catch (error: any) {
    logger.error('AI plan request failed', { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /ai/plan/sync
 * Generate an edit plan synchronously (for testing/demo)
 */
router.post('/plan/sync', async (req: Request, res: Response) => {
  try {
    const { project_id, prompt }: AIEditRequest = req.body;

    if (!project_id || !prompt) {
      return res.status(400).json({
        error: 'project_id and prompt are required',
      });
    }

    // Get available media
    const media = await mediaService.getProjectMedia(project_id);

    if (media.length === 0) {
      return res.status(400).json({
        error: 'No media available. Please upload media first.',
      });
    }

    // Get current timeline if exists
    const timeline = await timelineService.getOrCreateTimeline(project_id);

    // Generate plan synchronously
    const editPlan = await aiService.generateEditPlan(
      prompt,
      media,
      timeline.state_json
    );

    logger.info('AI edit plan generated', { project_id });

    res.json({
      plan: editPlan,
      success: true,
    });
  } catch (error: any) {
    logger.error('AI plan generation failed', { error });
    res.status(500).json({ error: error.message });
  }
});

export default router;
