export interface NavigateAction {
  type: 'navigate';
  route: string;
}

export interface AiResponseDto {
  reply: string;
  action?: NavigateAction;
  sessionId: string;
}

export interface AgentReply {
  reply: string;
  action?: NavigateAction;
}
