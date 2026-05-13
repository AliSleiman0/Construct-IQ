export interface MockPlan {
  id: string;
  name: string;
  pricePerMonth: number;
  description: string;
  maxUsers: number;
  maxProjects: number;
  features: string[];
  isPopular?: boolean;
}

export const mockPlans: MockPlan[] = [
  {
    id: 'plan-starter',
    name: 'Starter',
    pricePerMonth: 99,
    description: 'For small teams getting started — single project workflows.',
    maxUsers: 5,
    maxProjects: 1,
    features: [
      'Up to 5 team members',
      '1 active project',
      'Daily reports & issues',
      'Email support',
    ],
  },
  {
    id: 'plan-pro',
    name: 'Pro',
    pricePerMonth: 349,
    description: 'Multi-project teams — full operations toolset.',
    maxUsers: 25,
    maxProjects: 10,
    isPopular: true,
    features: [
      'Up to 25 team members',
      '10 active projects',
      'Daily reports, issues, tasks',
      'Procurement & budget',
      'Document management',
      'Priority support',
    ],
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise',
    pricePerMonth: 1499,
    description: 'For large GCs — unlimited scale + dedicated success.',
    maxUsers: 9999,
    maxProjects: 9999,
    features: [
      'Unlimited team members',
      'Unlimited projects',
      'Everything in Pro',
      'AI insights & analytics',
      'SSO + audit logs',
      'Dedicated success manager',
      '24/7 phone support',
    ],
  },
];
