'use client';

import { create } from 'zustand';
import {
  mockTickets,
  mockTicketComments,
  type MockTicket,
  type MockComment,
  type TicketStatus,
} from '@/mocks/tickets.mock';
import { mockDailyReports, type MockDailyReport } from '@/mocks/daily-reports.mock';
import {
  mockIssues,
  mockIssueComments,
  type MockIssue,
  type MockIssueComment,
  type IssueStatus,
} from '@/mocks/issues.mock';

interface MockState {
  tickets: MockTicket[];
  comments: MockComment[];
  dailyReports: MockDailyReport[];
  issues: MockIssue[];
  issueComments: MockIssueComment[];

  createTicket: (
    input: Pick<MockTicket, 'title' | 'body' | 'priority' | 'orgId' | 'orgName' | 'reporterId' | 'reporterName'>,
  ) => MockTicket;
  setTicketStatus: (ticketId: string, status: TicketStatus) => void;
  assignTicket: (
    ticketId: string,
    assignee: { id: string; name: string } | null,
  ) => void;
  addComment: (
    input: Pick<MockComment, 'ticketId' | 'authorId' | 'authorName' | 'authorKind' | 'body'>,
  ) => MockComment;

  createDailyReport: (
    input: Omit<MockDailyReport, 'id' | 'createdAt'>,
  ) => MockDailyReport;

  setIssueStatus: (issueId: string, status: IssueStatus) => void;
  addIssueComment: (
    input: Pick<MockIssueComment, 'issueId' | 'authorId' | 'authorName' | 'body'>,
  ) => MockIssueComment;
}

const nextTicketId = (tickets: MockTicket[]): string => {
  const nums = tickets
    .map((t) => Number(t.id.replace(/^T-/, '')))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 1000) + 1;
  return `T-${next}`;
};

const nextCommentId = (ticketId: string, comments: MockComment[]): string => {
  const count = comments.filter((c) => c.ticketId === ticketId).length;
  return `${ticketId}-c-${count + 1}`;
};

const nextReportId = (reports: MockDailyReport[]): string => {
  const nums = reports
    .map((r) => Number(r.id.replace(/^dr-/, '')))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 1000) + 1;
  return `dr-${String(next).padStart(4, '0')}`;
};

const nextIssueCommentId = (issueId: string, comments: MockIssueComment[]): string => {
  const count = comments.filter((c) => c.issueId === issueId).length;
  return `${issueId}-c-${count + 1}`;
};

export const useMockState = create<MockState>((set, get) => ({
  tickets: mockTickets,
  comments: mockTicketComments,
  dailyReports: mockDailyReports,
  issues: mockIssues,
  issueComments: mockIssueComments,

  createTicket: (input) => {
    const now = new Date().toISOString();
    const ticket: MockTicket = {
      id: nextTicketId(get().tickets),
      ...input,
      status: 'OPEN',
      assigneeId: null,
      assigneeName: null,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ tickets: [ticket, ...s.tickets] }));
    return ticket;
  },

  setTicketStatus: (ticketId, status) => {
    set((s) => ({
      tickets: s.tickets.map((t) =>
        t.id === ticketId ? { ...t, status, updatedAt: new Date().toISOString() } : t,
      ),
    }));
  },

  assignTicket: (ticketId, assignee) => {
    set((s) => ({
      tickets: s.tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              assigneeId: assignee?.id ?? null,
              assigneeName: assignee?.name ?? null,
              updatedAt: new Date().toISOString(),
            }
          : t,
      ),
    }));
  },

  addComment: (input) => {
    const comment: MockComment = {
      id: nextCommentId(input.ticketId, get().comments),
      ...input,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      comments: [...s.comments, comment],
      tickets: s.tickets.map((t) =>
        t.id === input.ticketId ? { ...t, updatedAt: comment.createdAt } : t,
      ),
    }));
    return comment;
  },

  createDailyReport: (input) => {
    const report: MockDailyReport = {
      ...input,
      id: nextReportId(get().dailyReports),
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ dailyReports: [report, ...s.dailyReports] }));
    return report;
  },

  setIssueStatus: (issueId, status) => {
    const now = new Date().toISOString();
    set((s) => ({
      issues: s.issues.map((iss) =>
        iss.id === issueId
          ? {
              ...iss,
              status,
              updatedAt: now,
              resolvedAt: status === 'RESOLVED' ? now : iss.resolvedAt,
            }
          : iss,
      ),
    }));
  },

  addIssueComment: (input) => {
    const comment: MockIssueComment = {
      id: nextIssueCommentId(input.issueId, get().issueComments),
      ...input,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      issueComments: [...s.issueComments, comment],
      issues: s.issues.map((iss) =>
        iss.id === input.issueId ? { ...iss, updatedAt: comment.createdAt } : iss,
      ),
    }));
    return comment;
  },
}));
