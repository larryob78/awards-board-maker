// Type definitions for PromptCut Frontend

export interface Project {
  id: string;
  title: string;
  fps: number;
  resolution: string;
  created_at: string;
  updated_at: string;
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
  media_type: 'video' | 'audio' | 'image';
  created_at: string;
  // Runtime URLs from backend
  proxy_url?: string;
  thumbnail_url?: string;
  original_url?: string;
}

export interface Timeline {
  id: string;
  project_id: string;
  state_json: TimelineState;
  version: number;
  created_at: string;
  updated_at: string;
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
}

export interface Clip {
  id: string;
  media_id: string;
  start_time: number;
  duration: number;
  trim_start: number;
  trim_end: number;
  speed?: number;
  volume?: number;
}

export interface Job {
  id: string;
  project_id?: string;
  type: 'upload' | 'proxy' | 'ai_plan' | 'render' | 'export';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  created_at: string;
}

export interface Export {
  id: string;
  project_id: string;
  filename: string;
  format: 'mp4' | 'mov' | 'webm';
  resolution: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  download_url?: string;
  job_progress?: number;
  created_at: string;
}

export interface EditPlan {
  duration: number;
  style: string;
  structure: Array<{
    section: string;
    goal: string;
    duration: number;
  }>;
  actions: Array<{
    type: string;
    asset?: string;
    [key: string]: any;
  }>;
}
