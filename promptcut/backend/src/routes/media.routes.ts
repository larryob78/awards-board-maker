// Media routes
import { Router, Request, Response } from 'express';
import mediaService from '../services/media.service';
import { logger } from '../utils/logger';
import { getDownloadUrl } from '../utils/s3';

const router = Router();

/**
 * GET /media?project_id=xxx
 * Get all media for a project
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { project_id } = req.query;

    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required' });
    }

    const media = await mediaService.getProjectMedia(project_id as string);

    // Generate download URLs for proxies and thumbnails
    const mediaWithUrls = await Promise.all(
      media.map(async (m) => {
        const urls: any = {};

        if (m.uri_proxy) {
          urls.proxy_url = await getDownloadUrl(m.uri_proxy);
        }
        if (m.uri_thumbnail) {
          urls.thumbnail_url = await getDownloadUrl(m.uri_thumbnail);
        }
        if (m.uri_original) {
          urls.original_url = await getDownloadUrl(m.uri_original);
        }

        return { ...m, ...urls };
      })
    );

    res.json(mediaWithUrls);
  } catch (error: any) {
    logger.error('Failed to get media', { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /media/:id
 * Get a specific media item
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const media = await mediaService.getMediaById(id);

    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Generate download URLs
    const urls: any = {};
    if (media.uri_proxy) {
      urls.proxy_url = await getDownloadUrl(media.uri_proxy);
    }
    if (media.uri_thumbnail) {
      urls.thumbnail_url = await getDownloadUrl(media.uri_thumbnail);
    }
    if (media.uri_original) {
      urls.original_url = await getDownloadUrl(media.uri_original);
    }

    res.json({ ...media, ...urls });
  } catch (error: any) {
    logger.error('Failed to get media', { error });
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /media/:id
 * Delete a media item
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await mediaService.deleteMedia(id);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to delete media', { error });
    res.status(500).json({ error: error.message });
  }
});

export default router;
