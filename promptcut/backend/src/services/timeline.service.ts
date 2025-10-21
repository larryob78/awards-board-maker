// Timeline management service
import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../utils/db';
import { logger } from '../utils/logger';
import {
  Timeline,
  TimelineState,
  Track,
  Clip,
  EditAction,
  Media,
} from '../types';
import mediaService from './media.service';

export class TimelineService {
  /**
   * Get or create timeline for a project
   */
  async getOrCreateTimeline(projectId: string): Promise<Timeline> {
    let result = await query<Timeline>(
      'SELECT * FROM timeline WHERE project_id = $1 ORDER BY version DESC LIMIT 1',
      [projectId]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Create new timeline
    const initialState: TimelineState = {
      tracks: [
        { id: uuidv4(), type: 'video', clips: [] },
        { id: uuidv4(), type: 'audio', clips: [] },
      ],
      duration: 0,
      fps: 30,
    };

    result = await query<Timeline>(
      `INSERT INTO timeline (project_id, state_json, version)
       VALUES ($1, $2, 1)
       RETURNING *`,
      [projectId, JSON.stringify(initialState)]
    );

    return result.rows[0];
  }

  /**
   * Get timeline by ID
   */
  async getTimelineById(timelineId: string): Promise<Timeline | null> {
    const result = await query<Timeline>(
      'SELECT * FROM timeline WHERE id = $1',
      [timelineId]
    );
    return result.rows[0] || null;
  }

  /**
   * Apply edit actions to a timeline
   */
  async applyEditActions(
    projectId: string,
    actions: EditAction[],
    timelineId?: string,
    userPrompt?: string
  ): Promise<Timeline> {
    return transaction(async (client) => {
      // Get or create timeline
      let timeline: Timeline;
      if (timelineId) {
        const result = await client.query<Timeline>(
          'SELECT * FROM timeline WHERE id = $1',
          [timelineId]
        );
        timeline = result.rows[0];
      } else {
        timeline = await this.getOrCreateTimeline(projectId);
      }

      const currentState = timeline.state_json as TimelineState;
      const newState = JSON.parse(JSON.stringify(currentState)); // Deep clone

      // Apply each action
      for (const action of actions) {
        await this.applyAction(newState, action, projectId);
      }

      // Update duration
      newState.duration = this.calculateTimelineDuration(newState);

      // Save new version
      const newVersion = timeline.version + 1;
      const result = await client.query<Timeline>(
        `INSERT INTO timeline (project_id, state_json, version)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [projectId, JSON.stringify(newState), newVersion]
      );

      const newTimeline = result.rows[0];

      // Save to edit history
      if (userPrompt) {
        await client.query(
          `INSERT INTO edit_history (project_id, timeline_id, action, previous_state, new_state, user_prompt)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            projectId,
            newTimeline.id,
            'apply_edit_plan',
            JSON.stringify(currentState),
            JSON.stringify(newState),
            userPrompt,
          ]
        );
      }

      logger.info('Applied edit actions', {
        projectId,
        actionCount: actions.length,
        newVersion,
      });

      return newTimeline;
    });
  }

  /**
   * Apply a single edit action to the timeline state
   */
  private async applyAction(
    state: TimelineState,
    action: EditAction,
    projectId: string
  ): Promise<void> {
    switch (action.type) {
      case 'cut':
        await this.applyCutAction(state, action, projectId);
        break;
      case 'transition':
        this.applyTransitionAction(state, action);
        break;
      case 'overlayText':
        this.applyTextOverlayAction(state, action);
        break;
      case 'speed':
        this.applySpeedAction(state, action);
        break;
      case 'effect':
        this.applyEffectAction(state, action);
        break;
      default:
        logger.warn('Unknown action type', { type: action.type });
    }
  }

  /**
   * Apply a cut action (add a clip to the timeline)
   */
  private async applyCutAction(
    state: TimelineState,
    action: EditAction,
    projectId: string
  ): Promise<void> {
    if (!action.asset) {
      logger.warn('Cut action missing asset ID');
      return;
    }

    const media = await mediaService.getMediaById(action.asset);
    if (!media) {
      logger.warn('Media not found for cut action', { assetId: action.asset });
      return;
    }

    const clip: Clip = {
      id: uuidv4(),
      media_id: action.asset,
      start_time: action.in || 0,
      duration: (action.out || media.duration || 0) - (action.in || 0),
      trim_start: action.in || 0,
      trim_end: action.out || media.duration || 0,
    };

    // Add to appropriate track
    const trackType = media.media_type === 'audio' ? 'audio' : 'video';
    let track = state.tracks.find(t => t.type === trackType);

    if (!track) {
      track = { id: uuidv4(), type: trackType, clips: [] };
      state.tracks.push(track);
    }

    track.clips.push(clip);
  }

  /**
   * Apply a transition action
   */
  private applyTransitionAction(state: TimelineState, action: EditAction): void {
    // Find the last clip in the video track and add transition
    const videoTrack = state.tracks.find(t => t.type === 'video');
    if (!videoTrack || videoTrack.clips.length === 0) return;

    const lastClip = videoTrack.clips[videoTrack.clips.length - 1];
    if (!lastClip.transitions) {
      lastClip.transitions = [];
    }

    lastClip.transitions.push({
      type: action.style as any || 'crossfade',
      duration: action.duration || 1,
      position: 'out',
    });
  }

  /**
   * Apply a text overlay action
   */
  private applyTextOverlayAction(state: TimelineState, action: EditAction): void {
    // Create or find text track
    let textTrack = state.tracks.find(t => t.type === 'text');
    if (!textTrack) {
      textTrack = { id: uuidv4(), type: 'text', clips: [] };
      state.tracks.push(textTrack);
    }

    const textClip: Clip = {
      id: uuidv4(),
      media_id: 'text_' + uuidv4(),
      start_time: action.time || 0,
      duration: action.duration || 3,
      trim_start: 0,
      trim_end: action.duration || 3,
    };

    // Store text in metadata (would be better in a separate field)
    (textClip as any).text = action.text;

    textTrack.clips.push(textClip);
  }

  /**
   * Apply a speed change action
   */
  private applySpeedAction(state: TimelineState, action: EditAction): void {
    if (!action.asset) return;

    // Find the clip and apply speed
    for (const track of state.tracks) {
      const clip = track.clips.find(c => c.media_id === action.asset);
      if (clip) {
        clip.speed = (action as any).speed || 1.0;
        clip.duration = clip.duration / clip.speed;
        break;
      }
    }
  }

  /**
   * Apply an effect action
   */
  private applyEffectAction(state: TimelineState, action: EditAction): void {
    // Add effect to the first video track
    const videoTrack = state.tracks.find(t => t.type === 'video');
    if (!videoTrack) return;

    if (!videoTrack.effects) {
      videoTrack.effects = [];
    }

    videoTrack.effects.push({
      type: action.style || 'unknown',
      parameters: action.parameters || {},
      start_time: action.time,
      duration: action.duration,
    });
  }

  /**
   * Calculate total timeline duration
   */
  private calculateTimelineDuration(state: TimelineState): number {
    let maxDuration = 0;

    for (const track of state.tracks) {
      let trackDuration = 0;
      for (const clip of track.clips) {
        trackDuration = Math.max(trackDuration, clip.start_time + clip.duration);
      }
      maxDuration = Math.max(maxDuration, trackDuration);
    }

    return maxDuration;
  }

  /**
   * Delete timeline
   */
  async deleteTimeline(timelineId: string): Promise<void> {
    await query('DELETE FROM timeline WHERE id = $1', [timelineId]);
  }
}

export default new TimelineService();
