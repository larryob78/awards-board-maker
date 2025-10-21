// Type definitions for PromptCut Backend

export interface Project {
  id: string;
  title: string;
  fps: number;
  resolution: string;
  created_at: Date;
  updated_at: Date;
}

export interface Media {
  id: string;
  project_id: string;
  filename: string;
  uri_original: string;
  uri_proxy?: string;
  uri_thumbnail?: string;
  duration?: number;
  fps?: number;
  width?: number;
  height?: number;
  codec?: string;
  file_size?: number;
  media_type: 'video' | 'audio' | 'image';
  transcript?: string;
  metadata_json?: Record<string, any>;
  created_at: Date;
}

export interface Timeline {
  id: string;
  project_id: string;
  state_json: TimelineState;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export interface TimelineState {
  tracks: Track[];
  duration: number;
  fps?: number;
}

export interface Track {
  id: string;
  type: 'video' | 'audio' | 'text';
  clips: Clip[];
  effects?: Effect[];
}

export interface Clip {
  id: string;
  media_id: string;
  start_time: number; // Timeline position
  duration: number;
  trim_start: number; // Source trim
  trim_end: number; // Source trim
  speed?: number; // Speed multiplier (1.0 = normal)
  volume?: number; // 0-1
  transitions?: Transition[];
}

export interface Transition {
  type: 'crossfade' | 'dissolve' | 'wipe' | 'cut';
  duration: number;
  position: 'in' | 'out';
}

export interface Effect {
  type: string;
  parameters: Record<string, any>;
  start_time?: number;
  duration?: number;
}

export interface Job {
  id: string;
  project_id?: string;
  type: 'upload' | 'proxy' | 'ai_plan' | 'render' | 'export';
  payload_json: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result_json?: Record<string, any>;
  error_message?: string;
  started_at?: Date;
  finished_at?: Date;
  created_at: Date;
}

export interface Export {
  id: string;
  project_id: string;
  job_id?: string;
  filename: string;
  uri?: string;
  format: 'mp4' | 'mov' | 'webm';
  resolution: string;
  file_size?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: Date;
  completed_at?: Date;
}

// AI Edit Plan Types
export interface EditPlan {
  duration: number;
  style: string;
  structure: EditSection[];
  actions: EditAction[];
  metadata?: Record<string, any>;
}

export interface EditSection {
  section: string;
  goal: string;
  duration: number;
  description?: string;
}

export interface EditAction {
  type: 'cut' | 'transition' | 'overlayText' | 'speed' | 'effect' | 'audio';
  asset?: string;
  in?: number;
  out?: number;
  time?: number;
  duration?: number;
  style?: string;
  text?: string;
  parameters?: Record<string, any>;
}

// Request/Response types
export interface UploadResponse {
  upload_url: string;
  media_id: string;
  file_key: string;
}

export interface AIEditRequest {
  project_id: string;
  prompt: string;
  context?: {
    available_media: string[]; // media IDs
    current_timeline?: TimelineState;
  };
}

export interface AIEditResponse {
  plan: EditPlan;
  reasoning?: string;
  confidence?: number;
}

export interface ApplyEditRequest {
  project_id: string;
  timeline_id?: string;
  actions: EditAction[];
  user_prompt?: string;
}

export interface MediaMetadata {
  format: string;
  duration: number;
  bitrate: number;
  streams: {
    codec: string;
    type: 'video' | 'audio';
    width?: number;
    height?: number;
    fps?: number;
    channels?: number;
    sample_rate?: number;
  }[];
}
