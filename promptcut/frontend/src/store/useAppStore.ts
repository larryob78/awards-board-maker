// Global state management using Zustand
import { create } from 'zustand';
import type { Project, Media, Timeline } from '../types';

interface AppState {
  // Current project
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;

  // Media
  mediaList: Media[];
  setMediaList: (media: Media[]) => void;
  addMedia: (media: Media) => void;

  // Timeline
  timeline: Timeline | null;
  setTimeline: (timeline: Timeline | null) => void;

  // UI State
  selectedMediaId: string | null;
  setSelectedMediaId: (id: string | null) => void;

  currentTime: number;
  setCurrentTime: (time: number) => void;

  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;

  zoom: number;
  setZoom: (zoom: number) => void;

  // Prompt
  promptValue: string;
  setPromptValue: (value: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Project
  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),

  // Media
  mediaList: [],
  setMediaList: (media) => set({ mediaList: media }),
  addMedia: (media) => set((state) => ({ mediaList: [...state.mediaList, media] })),

  // Timeline
  timeline: null,
  setTimeline: (timeline) => set({ timeline }),

  // UI State
  selectedMediaId: null,
  setSelectedMediaId: (id) => set({ selectedMediaId: id }),

  currentTime: 0,
  setCurrentTime: (time) => set({ currentTime: time }),

  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  zoom: 1,
  setZoom: (zoom) => set({ zoom }),

  // Prompt
  promptValue: '',
  setPromptValue: (value) => set({ promptValue: value }),
}));
