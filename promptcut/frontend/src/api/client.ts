// API client for PromptCut backend
import axios from 'axios';
import type { Project, Media, Timeline, Job, Export, EditPlan } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Projects
export const projectsApi = {
  list: () => api.get<Project[]>('/projects'),
  get: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (data: { title: string; fps?: number; resolution?: string }) =>
    api.post<Project>('/projects', data),
  update: (id: string, data: Partial<Project>) => api.put<Project>(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
};

// Media
export const mediaApi = {
  list: (projectId: string) => api.get<Media[]>('/media', { params: { project_id: projectId } }),
  get: (id: string) => api.get<Media>(`/media/${id}`),
  delete: (id: string) => api.delete(`/media/${id}`),
};

// Upload
export const uploadApi = {
  requestUpload: (data: { project_id: string; filename: string; content_type?: string }) =>
    api.post<{ upload_url: string; media_id: string; file_key: string; job_id: string }>(
      '/upload',
      data
    ),
  uploadFile: async (uploadUrl: string, file: File) => {
    return axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
    });
  },
};

// Timeline
export const timelineApi = {
  get: (projectId: string) => api.get<Timeline>('/timeline', { params: { project_id: projectId } }),
  getById: (id: string) => api.get<Timeline>(`/timeline/${id}`),
  applyActions: (data: {
    project_id: string;
    actions: any[];
    timeline_id?: string;
    user_prompt?: string;
  }) => api.post<{ success: boolean; timeline: Timeline }>('/timeline/apply', data),
};

// AI
export const aiApi = {
  generatePlan: (data: { project_id: string; prompt: string }) =>
    api.post<{ job_id: string; status: string }>('/ai/plan', data),
  generatePlanSync: (data: { project_id: string; prompt: string }) =>
    api.post<{ plan: EditPlan; success: boolean }>('/ai/plan/sync', data),
};

// Export
export const exportApi = {
  start: (data: {
    project_id: string;
    timeline_id: string;
    format?: string;
    resolution?: string;
  }) =>
    api.post<{ export_id: string; job_id: string; status: string }>('/export', data),
  get: (id: string) => api.get<Export>(`/export/${id}`),
  list: (projectId: string) => api.get<Export[]>('/export', { params: { project_id: projectId } }),
};

// Jobs
export const jobsApi = {
  get: (id: string) => api.get<Job>(`/jobs/${id}`),
  list: (params?: { project_id?: string; type?: string; status?: string }) =>
    api.get<Job[]>('/jobs', { params }),
};

export default api;
