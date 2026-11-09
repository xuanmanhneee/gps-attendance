import { AttendanceSessionsService } from './attendance-sessions.service';

describe('AttendanceSessionsService Redis cache', () => {
  const session = {
    id: 14,
    title: 'Cached session',
    latitude: 11.95,
    longitude: 108.44,
    radius: 40,
    openAt: new Date(Date.now() - 60_000),
    closeAt: new Date(Date.now() + 600_000),
    status: 'pending' as const,
    createdBy: 7,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const repository = { findById: jest.fn().mockResolvedValue(session) };
  const prisma = {
    lecturerLocationVerification: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  const redis = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue('OK'),
    eval: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
  };
  const scheduler = {
    schedule: jest.fn(),
    cancel: jest.fn(),
    onJob: jest.fn(),
  };
  const createService = () =>
    new AttendanceSessionsService(
      repository as never,
      {} as never,
      prisma as never,
      scheduler,
      redis as never,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findById.mockResolvedValue(session);
    prisma.lecturerLocationVerification.findFirst.mockResolvedValue(null);
    redis.set.mockResolvedValue('OK');
  });

  it('serves a cached session and recomputes its time-derived status', async () => {
    redis.get.mockResolvedValue(JSON.stringify(session));

    await expect(createService().findById(session.id)).resolves.toMatchObject({
      id: session.id,
      status: 'open',
      openAt: session.openAt,
      closeAt: session.closeAt,
    });

    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('loads and seeds the session cache on a miss without overwriting a concurrent update', async () => {
    redis.get.mockResolvedValue(null);

    await createService().findById(session.id);

    expect(repository.findById).toHaveBeenCalledWith(session.id);
    expect(redis.set).toHaveBeenCalledWith(
      `attendance:session:${session.id}:context`,
      JSON.stringify(session),
      { ttlSec: 86_400, ifNotExists: true },
    );
  });

  it('caches the absence of a lecturer verification to avoid repeated reads', async () => {
    redis.get.mockResolvedValueOnce(null).mockResolvedValueOnce(
      JSON.stringify({ verifiedAt: null }),
    );
    const service = createService();

    await expect(service.findLatestLecturerVerification(session.id)).resolves.toBeNull();
    await expect(service.findLatestLecturerVerification(session.id)).resolves.toBeNull();

    expect(prisma.lecturerLocationVerification.findFirst).toHaveBeenCalledTimes(1);
    expect(redis.set).toHaveBeenCalledWith(
      `attendance:session:${session.id}:lecturer-verification`,
      JSON.stringify({ verifiedAt: null }),
      { ttlSec: 300, ifNotExists: true },
    );
  });

  it('returns a cached lecturer verification without querying PostgreSQL', async () => {
    const verifiedAt = new Date();
    redis.get.mockResolvedValue(
      JSON.stringify({
        latitude: 11.95,
        longitude: 108.44,
        accuracy: 5,
        verifiedAt: verifiedAt.toISOString(),
      }),
    );

    await expect(
      createService().findLatestLecturerVerification(session.id),
    ).resolves.toEqual({
      latitude: 11.95,
      longitude: 108.44,
      accuracy: 5,
      verifiedAt,
    });

    expect(prisma.lecturerLocationVerification.findFirst).not.toHaveBeenCalled();
  });
});
