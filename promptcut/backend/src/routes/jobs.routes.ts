// Jobs routes
import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /jobs/:id
 * Get job status and result
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM jobs WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    logger.error('Failed to get job', { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /jobs
 * List jobs for a project
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { project_id, type, status } = req.query;

    let queryText = 'SELECT * FROM jobs WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (project_id) {
      queryText += ` AND project_id = $${paramIndex}`;
      params.push(project_id);
      paramIndex++;
    }

    if (type) {
      queryText += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (status) {
      queryText += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    queryText += ' ORDER BY created_at DESC LIMIT 100';

    const result = await query(queryText, params);

    res.json(result.rows);
  } catch (error: any) {
    logger.error('Failed to list jobs', { error });
    res.status(500).json({ error: error.message });
  }
});

export default router;
