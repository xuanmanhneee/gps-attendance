import type { Account } from '#account/account.model';

export const mockAccounts: Account[] = [
  {
    id: 1,
    userId: 1,
    username: 'admin',
    passwordHash:
      '$2b$10$5N0ySe2xBzbCcChmwqSrAuMRRKaqVMIP2GNkCzslMFdu5akjiFvtW',
    status: 'active',
    createdAt: new Date('2026-01-01T08:00:00Z'),
    updatedAt: new Date('2026-01-01T08:00:00Z'),
  },
  {
    id: 2,
    userId: 2,
    username: 'organizer',
    passwordHash:
      '$2b$10$regQBliOdhAY5xeTe.bw.OpgVU3MOfWhZdBf80aM79GT/BQV66mgm',
    status: 'active',
    createdAt: new Date('2026-01-02T08:00:00Z'),
    updatedAt: new Date('2026-01-02T08:00:00Z'),
  },
  {
    id: 3,
    userId: 3,
    username: 'student1',
    passwordHash:
      '$2b$10$u2N.mr5ecD/sdhapXz5CqucIavuoaXeSmsbPE2bR0AkME1HOWB5XG',
    status: 'active',
    createdAt: new Date('2026-01-03T08:00:00Z'),
    updatedAt: new Date('2026-01-03T08:00:00Z'),
  },
  {
    id: 4,
    userId: 4,
    username: 'student2',
    passwordHash:
      '$2b$10$Lc48VGJoFwAuQyaK3FB8EuEAezcsQP.uudbfkfvQMeD8jhS.d4szm',
    status: 'locked',
    createdAt: new Date('2026-01-04T08:00:00Z'),
    updatedAt: new Date('2026-01-04T08:00:00Z'),
  },
  {
    id: 5,
    userId: 5,
    username: 'student3',
    passwordHash:
      '$2b$10$rGERwjZSgnFbY2DmTjZ0QOTzqQsMKWuh/zt/A/NANwBeqh9gvkwYa',
    status: 'disabled',
    createdAt: new Date('2026-01-05T08:00:00Z'),
    updatedAt: new Date('2026-01-05T08:00:00Z'),
  },
];
