import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { IntegrationService } from '../../src/integration/integration.service';

const dto = {
  externalId: 'LESSON-1',
  lecturerCode: 'GV001',
  title: 'Demo',
  latitude: 11.94,
  longitude: 108.45,
  radius: 100,
  openAt: '2099-01-01T00:00:00.000Z',
  closeAt: '2099-01-01T00:15:00.000Z',
  studentCodes: ['SV002', 'SV001'],
};

describe('IntegrationService', () => {
  const units = {};
  const records = {};
  const users = {
    findByCode: jest.fn().mockResolvedValue({ id: 1, code: 'GV001', role: 'organizer' }),
    findByCodes: jest.fn().mockResolvedValue([
      { id: 1, code: 'GV001', role: 'organizer' },
      { id: 2, code: 'SV001', role: 'participant' },
      { id: 3, code: 'SV002', role: 'participant' },
    ]),
  };
  const sessions = {
    findById: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((_dto, createdBy) =>
      Promise.resolve({
        id: 10,
        title: 'Demo',
        latitude: 11.94,
        longitude: 108.45,
        radius: 100,
        openAt: new Date(dto.openAt),
        closeAt: new Date(dto.closeAt),
        status: 'pending',
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
  };
  const sessionLinks = {
    findByExternalId: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 5,
      externalId: 'LESSON-1',
      requestFingerprint: 'fingerprint',
      attendanceSessionId: null,
      createdAt: new Date(),
    }),
    attachSession: jest.fn(),
    delete: jest.fn(),
  };
  const tags = {
    findByOwner: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    assignToUser: jest.fn(),
  };
  const accounts = { provisionForUser: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('syncs a child even when it appears before its parent', async () => {
    const stored = new Map<string, any>();
    const unitService = {
      findByExternalCode: jest.fn((code: string) =>
        Promise.resolve(stored.get(code) ?? null),
      ),
      create: jest.fn((input: any) => {
        const unit = {
          id: stored.size + 1,
          externalCode: input.externalCode,
          name: input.name,
          parentId: input.parentId,
        };
        stored.set(input.externalCode, unit);
        return Promise.resolve(unit);
      }),
      update: jest.fn(),
    };
    const service = new IntegrationService(
      unitService as never,
      users as never,
      sessions as never,
      records as never,
      tags as never,
      accounts as never,
      sessionLinks as never,
    );

    await expect(
      service.syncUnits([
        { externalCode: 'CHILD', name: 'Child', parentCode: 'ROOT' },
        { externalCode: 'ROOT', name: 'Root', parentCode: null },
      ]),
    ).resolves.toMatchObject({ created: 2, failed: [] });
    expect(stored.get('CHILD').parentId).toBe(stored.get('ROOT').id);
  });

  it('resolves external codes and delegates roster creation to the existing session flow', async () => {
    const service = new IntegrationService(
      units as never,
      users as never,
      sessions as never,
      records as never,
      tags as never,
      accounts as never,
      sessionLinks as never,
    );

    await expect(service.createSession(dto)).resolves.toMatchObject({
      created: true,
      externalId: 'LESSON-1',
    });
    expect(sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        participantCriteria: {
          codeFilter: { include: ['SV001', 'SV002'], exclude: [] },
        },
      }),
      1,
    );
    expect(sessionLinks.attachSession).toHaveBeenCalledWith(5, 10);
  });

  it('maps an LMS course to an organizer-owned attendance tag', async () => {
    tags.create.mockResolvedValue({ id: 20, name: 'INT101 · Nhập môn lập trình', ownerId: 1 });
    const service = new IntegrationService(units as never, users as never, sessions as never, records as never, tags as never, accounts as never, sessionLinks as never);
    await expect(service.syncCourses([{ externalCode: 'INT101', name: 'Nhập môn lập trình', lecturerCode: 'GV001', studentCodes: ['SV001'] }])).resolves.toMatchObject({ created: 1 });
    expect(tags.create).toHaveBeenCalledWith('INT101 · Nhập môn lập trình', 1);
    expect(tags.assignToUser).toHaveBeenCalledWith(20, 2, 1);
  });

  it('rejects the whole request when any code is unknown', async () => {
    users.findByCodes.mockResolvedValueOnce([
      { id: 1, code: 'GV001', role: 'organizer' },
      { id: 2, code: 'SV001', role: 'participant' },
    ]);
    const service = new IntegrationService(
      units as never,
      users as never,
      sessions as never,
      records as never,
      tags as never,
      accounts as never,
      sessionLinks as never,
    );

    await expect(service.createSession(dto)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('rejects reuse of externalId with different normalized content', async () => {
    sessionLinks.findByExternalId.mockResolvedValueOnce({
      externalId: 'LESSON-1',
      requestFingerprint: 'different',
      attendanceSessionId: 10,
    });
    const service = new IntegrationService(
      units as never,
      users as never,
      sessions as never,
      records as never,
      tags as never,
      accounts as never,
      sessionLinks as never,
    );

    await expect(service.createSession(dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
