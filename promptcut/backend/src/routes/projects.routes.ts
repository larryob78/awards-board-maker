// Projects routes
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../utils/db';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /projects
 * Create a new project
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, fps = 30, resolution = '1920x1080' } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const result = await query(
      `INSERT INTO projects (id, title, fps, resolution)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [uuidv4(), title, fps, resolution]
    );

    const project = result.rows[0];
    logger.info('Project created', { projectId: project.id, title });

    res.json(project);
  } catch (error: any) {
    logger.error('Failed to create project', { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /projects
 * List all projects
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM projects ORDER BY created_at DESC'
    );

    res.json(result.rows);
  } catch (error: any) {
    logger.error('Failed to list projects', { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /projects/:id
 * Get a specific project
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    logger.error('Failed to get project', { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /projects/:id
 * Update a project
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, fps, resolution } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      params.push(title);
      paramIndex++;
    }

    if (fps !== undefined) {
      updates.push(`fps = $${paramIndex}`);
      params.push(fps);
      paramIndex++;
    }

    if (resolution !== undefined) {
      updates.push(`resolution = $${paramIndex}`);
      params.push(resolution);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const result = await query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    logger.error('Failed to update project', { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /projects/:id
 * Delete a project (cascades to all related data)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await query('DELETE FROM projects WHERE id = $1', [id]);

    logger.info('Project deleted', { projectId: id });
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to delete project', { error });
    res.status(500).json({ error: error.message });
  }
});

export default router;
