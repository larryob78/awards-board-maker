// Timeline routes
import { Router, Request, Response } from 'express';
import timelineService from '../services/timeline.service';
import { logger } from '../utils/logger';
import { ApplyEditRequest } from '../types';

const router = Router();

/**
 * GET /timeline?project_id=xxx
 * Get the latest timeline for a project
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { project_id } = req.query;

    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required' });
    }

    const timeline = await timelineService.getOrCreateTimeline(project_id as string);

    res.json(timeline);
  } catch (error: any) {
    logger.error('Failed to get timeline', { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /timeline/:id
 * Get a specific timeline by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const timeline = await timelineService.getTimelineById(id);

    if (!timeline) {
      return res.status(404).json({ error: 'Timeline not found' });
    }

    res.json(timeline);
  } catch (error: any) {
    logger.error('Failed to get timeline', { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /timeline/apply
 * Apply edit actions to the timeline
 */
router.post('/apply', async (req: Request, res: Response) => {
  try {
    const { project_id, timeline_id, actions, user_prompt }: ApplyEditRequest = req.body;

    if (!project_id || !actions || !Array.isArray(actions)) {
      return res.status(400).json({
        error: 'project_id and actions array are required',
      });
    }

    logger.info('Applying edit actions', {
      project_id,
      actionCount: actions.length,
    });

    const timeline = await timelineService.applyEditActions(
      project_id,
      actions,
      timeline_id,
      user_prompt
    );

    res.json({
      success: true,
      timeline,
    });
  } catch (error: any) {
    logger.error('Failed to apply edit actions', { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /timeline/:id
 * Delete a timeline
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await timelineService.deleteTimeline(id);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to delete timeline', { error });
    res.status(500).json({ error: error.message });
  }
});

export default router;
