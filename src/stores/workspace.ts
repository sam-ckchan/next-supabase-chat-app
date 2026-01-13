import { create } from "zustand";

interface WorkspaceState {
  currentWorkspaceId: string | null;
  currentChannelId: string | null;
  setWorkspace: (id: string | null) => void;
  setChannel: (id: string | null) => void;
  clearChannel: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspaceId: null,
  currentChannelId: null,
  setWorkspace: (id) =>
    set({
      currentWorkspaceId: id,
      currentChannelId: null, // Clear channel when workspace changes
    }),
  setChannel: (id) => set({ currentChannelId: id }),
  clearChannel: () => set({ currentChannelId: null }),
}));
