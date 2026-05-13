'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { aiApi } from '../api/ai.client';
import { useAiChatStore } from '../store/ai-chat.store';
import type { AiChatRequest } from '../types';

export function useAiChat() {
  const router = useRouter();
  const { sessionId, setSessionId, appendMessage, close } = useAiChatStore();

  return useMutation({
    mutationFn: (payload: Omit<AiChatRequest, 'sessionId'>) =>
      aiApi.chat({ ...payload, sessionId: sessionId ?? undefined }),
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      appendMessage({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        action: data.action,
        createdAt: Date.now(),
      });

      if (data.action?.type === 'navigate') {
        router.push(data.action.route);
        close();
      }
    },
  });
}
