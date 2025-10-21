// Media processing service
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../utils/db';
import { logger } from '../utils/logger';
import { generateFileKey, getDownloadUrl } from '../utils/s3';
import { Media, MediaMetadata } from '../types';
import path from 'path';
import fs from 'fs/promises';

export class MediaService {
  /**
   * Create a new media entry in the database
   */
  async createMedia(data: {
    project_id: string;
    filename: string;
    uri_original: string;
    media_type: 'video' | 'audio' | 'image';
  }): Promise<Media> {
    const result = await query<Media>(
      `INSERT INTO media (project_id, filename, uri_original, media_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.project_id, data.filename, data.uri_original, data.media_type]
    );
    return result.rows[0];
  }

  /**
   * Get all media for a project
   */
  async getProjectMedia(projectId: string): Promise<Media[]> {
    const result = await query<Media>(
      'SELECT * FROM media WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    );
    return result.rows;
  }

  /**
   * Get media by ID
   */
  async getMediaById(mediaId: string): Promise<Media | null> {
    const result = await query<Media>(
      'SELECT * FROM media WHERE id = $1',
      [mediaId]
    );
    return result.rows[0] || null;
  }

  /**
   * Extract metadata from a video file using ffmpeg
   */
  async extractMetadata(filePath: string): Promise<MediaMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          logger.error('Failed to extract metadata', { filePath, error: err });
          return reject(err);
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

        const result: MediaMetadata = {
          format: metadata.format.format_name || 'unknown',
          duration: metadata.format.duration || 0,
          bitrate: metadata.format.bit_rate || 0,
          streams: []
        };

        if (videoStream) {
          result.streams.push({
            codec: videoStream.codec_name || 'unknown',
            type: 'video',
            width: videoStream.width,
            height: videoStream.height,
            fps: this.parseFps(videoStream.r_frame_rate),
          });
        }

        if (audioStream) {
          result.streams.push({
            codec: audioStream.codec_name || 'unknown',
            type: 'audio',
            channels: audioStream.channels,
            sample_rate: audioStream.sample_rate,
          });
        }

        resolve(result);
      });
    });
  }

  /**
   * Update media metadata in database
   */
  async updateMediaMetadata(
    mediaId: string,
    metadata: Partial<Media>
  ): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(metadata).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        updates.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (updates.length === 0) return;

    values.push(mediaId);
    await query(
      `UPDATE media SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
  }

  /**
   * Generate a proxy (lower resolution) version of a video
   */
  async generateProxy(
    sourceUrl: string,
    projectId: string,
    filename: string
  ): Promise<string> {
    const proxyKey = generateFileKey(projectId, filename, 'proxy');
    const tempInput = `/tmp/promptcut/${uuidv4()}_input`;
    const tempOutput = `/tmp/promptcut/${uuidv4()}_proxy.mp4`;

    try {
      // Create temp directory
      await fs.mkdir('/tmp/promptcut', { recursive: true });

      // Download source file
      // In production, this would download from S3
      // For now, we'll assume the file is accessible

      return new Promise((resolve, reject) => {
        ffmpeg(sourceUrl)
          .outputOptions([
            '-vf scale=1280:720',
            '-c:v libx264',
            '-preset fast',
            '-crf 28',
            '-c:a aac',
            '-b:a 128k',
          ])
          .output(tempOutput)
          .on('end', async () => {
            logger.info('Proxy generation completed', { filename });
            // In production, upload to S3 and return the S3 key
            resolve(proxyKey);
          })
          .on('error', (err) => {
            logger.error('Proxy generation failed', { filename, error: err });
            reject(err);
          })
          .run();
      });
    } catch (error) {
      logger.error('Failed to generate proxy', { error });
      throw error;
    }
  }

  /**
   * Generate a thumbnail from a video
   */
  async generateThumbnail(
    sourceUrl: string,
    projectId: string,
    filename: string,
    timeInSeconds: number = 1
  ): Promise<string> {
    const thumbnailKey = generateFileKey(projectId, filename.replace(/\.[^.]+$/, '.jpg'), 'thumbnail');
    const tempOutput = `/tmp/promptcut/${uuidv4()}_thumb.jpg`;

    try {
      await fs.mkdir('/tmp/promptcut', { recursive: true });

      return new Promise((resolve, reject) => {
        ffmpeg(sourceUrl)
          .screenshots({
            timestamps: [timeInSeconds],
            filename: path.basename(tempOutput),
            folder: path.dirname(tempOutput),
            size: '640x360',
          })
          .on('end', () => {
            logger.info('Thumbnail generated', { filename });
            // In production, upload to S3
            resolve(thumbnailKey);
          })
          .on('error', (err) => {
            logger.error('Thumbnail generation failed', { filename, error: err });
            reject(err);
          });
      });
    } catch (error) {
      logger.error('Failed to generate thumbnail', { error });
      throw error;
    }
  }

  /**
   * Parse frame rate from ffprobe format (e.g., "30/1" -> 30)
   */
  private parseFps(fpsString?: string): number | undefined {
    if (!fpsString) return undefined;
    const parts = fpsString.split('/');
    if (parts.length === 2) {
      return parseInt(parts[0]) / parseInt(parts[1]);
    }
    return parseFloat(fpsString);
  }

  /**
   * Delete media and associated files
   */
  async deleteMedia(mediaId: string): Promise<void> {
    // TODO: Delete files from S3
    await query('DELETE FROM media WHERE id = $1', [mediaId]);
    logger.info('Media deleted', { mediaId });
  }
}

export default new MediaService();
