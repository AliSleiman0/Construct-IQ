export interface NavigateAction {
  type: 'navigate';
  route: string;
}

export type AiAction = NavigateAction;

export interface AiChatRequest {
  message: string;
  projectId?: string;
  sessionId?: string;
}

export interface AiChatResponse {
  reply: string;
  action?: AiAction;
  sessionId: string;
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: AiAction;
  createdAt: number;
}
