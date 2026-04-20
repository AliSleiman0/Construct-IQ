import { create } from 'zustand';
import type { AiMessage } from '../types';

interface AiChatState {
  isOpen: boolean;
  sessionId: string | null;
  messages: AiMessage[];
  open: () => void;
  close: () => void;
  toggle: () => void;
  setSessionId: (id: string) => void;
  appendMessage: (message: AiMessage) => void;
  resetConversation: () => void;
}

export const useAiChatStore = create<AiChatState>((set) => ({
  isOpen: false,
  sessionId: null,
  messages: [],
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setSessionId: (id) => set({ sessionId: id }),
  appendMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  resetConversation: () => set({ sessionId: null, messages: [] }),
}));
