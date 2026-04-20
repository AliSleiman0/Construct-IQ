import OpenAI from 'openai';

export const navigationTools: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'navigate_to_section',
      description:
        'Navigate the user to a main section of the application such as dashboard, users, projects, reports, or budget.',
      parameters: {
        type: 'object',
        properties: {
          section: {
            type: 'string',
            enum: ['dashboard', 'users', 'projects', 'reports', 'budget'],
            description: 'The section to navigate to',
          },
        },
        required: ['section'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'navigate_to_project',
      description: 'Navigate the user to a specific project by its ID.',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'The ID of the project to navigate to',
          },
        },
        required: ['projectId'],
      },
    },
  },
];

const SECTION_ROUTES: Record<string, string> = {
  dashboard: '/dashboard',
  users: '/users',
  projects: '/projects',
  reports: '/reports',
  budget: '/budget',
};

export function resolveNavigationRoute(
  toolName: string,
  toolInput: Record<string, string>,
): string {
  if (toolName === 'navigate_to_section') {
    return SECTION_ROUTES[toolInput.section] ?? '/dashboard';
  }
  if (toolName === 'navigate_to_project') {
    return `/projects/${toolInput.projectId}`;
  }
  return '/dashboard';
}
