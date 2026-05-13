import type { InternalAxiosRequestConfig } from 'axios';
import { ROLE_HOME, ROLE_PREFIX, type Role } from '@/config/roles';
import type { MockResponse } from '../mock-client';

const SIDEBAR_KEYWORDS: { keyword: string; section: string }[] = [
  { keyword: 'project', section: 'projects' },
  { keyword: 'ticket', section: 'tickets' },
  { keyword: 'support', section: 'support' },
  { keyword: 'report', section: 'reports' },
  { keyword: 'issue', section: 'issues' },
  { keyword: 'unit', section: 'units' },
  { keyword: 'payment', section: 'payments' },
  { keyword: 'progress', section: 'progress' },
  { keyword: 'invoice', section: 'billing' },
  { keyword: 'billing', section: 'billing' },
  { keyword: 'task', section: 'tasks' },
];

interface AiChatBody {
  message?: string;
  projectId?: string;
  sessionId?: string;
}

const parseBody = (data: unknown): AiChatBody => {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as AiChatBody;
    } catch {
      return {};
    }
  }
  return data as AiChatBody;
};

const tryNavigation = (message: string): { route: string; section: string } | null => {
  if (typeof window === 'undefined') return null;
  const role = document.cookie
    .split('; ')
    .find((c) => c.startsWith('mock_role='))
    ?.split('=')[1] as Role | undefined;
  if (!role) return null;

  const lower = message.toLowerCase();
  const navIntent = /\b(go to|open|show|take me to|navigate to)\b/.test(lower);
  if (!navIntent) return null;

  if (lower.includes('dashboard')) {
    return { route: ROLE_HOME[role], section: 'dashboard' };
  }
  for (const { keyword, section } of SIDEBAR_KEYWORDS) {
    if (lower.includes(keyword)) {
      return { route: `${ROLE_PREFIX[role]}/${section}`, section };
    }
  }
  return null;
};

export const aiHandler = (config: InternalAxiosRequestConfig): MockResponse | null => {
  const url = config.url ?? '';
  const method = (config.method ?? 'get').toLowerCase();

  if (url === '/ai/chat' && method === 'post') {
    const body = parseBody(config.data);
    const message = (body.message ?? '').trim();
    const sessionId = body.sessionId ?? `mock-session-${Date.now()}`;

    if (!message) {
      return {
        status: 200,
        data: { reply: 'How can I help?', sessionId },
      };
    }

    const nav = tryNavigation(message);
    if (nav) {
      return {
        status: 200,
        data: {
          reply: `Taking you to ${nav.section}.`,
          action: { type: 'navigate', route: nav.route },
          sessionId,
        },
      };
    }

    return {
      status: 200,
      data: {
        reply:
          "I'm running in demo mode — the AI backend isn't wired up in this build. Try asking me to navigate (e.g. \"go to projects\" or \"open tickets\") and I'll route you there.",
        sessionId,
      },
    };
  }

  if (/^\/ai\/summarize-report\/[^/]+$/.test(url) && method === 'post') {
    return {
      status: 200,
      data: {
        summary: 'Demo summary: site reported productive day with no blockers; concrete pour and curtain wall both progressed.',
      },
    };
  }

  return null;
};
