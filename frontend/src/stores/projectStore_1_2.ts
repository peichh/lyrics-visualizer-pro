
import { create } from 'zustand';
import { ProjectState } from '../types';

type Store = {
  project: ProjectState | null;
  setProject: (p: ProjectState) => void;
  currentTime: number;
  setCurrentTime: (t: number) => void;
  selectedCueId: string | null;
  setSelectedCueId: (id: string | null) => void;
  updateCue: (id: string, updates: any) => void;
  seekTo: (t: number) => void;
};

export const useProjectStore = create<Store>((set, get) => ({
  project: null,
  currentTime: 0,
  selectedCueId: null,
  setProject: (p) => set({ project: p }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setSelectedCueId: (id) => set({ selectedCueId: id }),
  updateCue: (id, updates) => set((state) => {
    if (!state.project) return state;
    const lyrics = state.project.lyrics.map(l => l.id === id ? { ...l, ...updates } : l);
    return { project: { ...state.project, lyrics } };
  }),
  seekTo: (t) => set({ currentTime: t })
}));
