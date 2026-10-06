import { ConflictException, ForbiddenException } from '@nestjs/common';
import { AttendanceRecordsService } from '../attendance-record/attendance-records.service';
import { AttendanceSession } from './attendance-session.model';
import { IAttendanceSessionRepository } from './attendance-session.repository';
import { AttendanceSessionsService } from './attendance-sessions.service';
import { PrismaService } from '../common/database/prisma.service';

describe('AttendanceSessionsService.cancel', () => {
  let service: AttendanceSessionsService;
  let repository: jest.Mocked<Pick<IAttendanceSessionRepository, 'findById' | 'cancel'>>;

  const pendingSession: AttendanceSession = {
    id: 12,
    title: 'Session test',
    latitude: 11.95,
    longitude: 108.44,
    radius: 50,
    openAt: new Date(Date.now() + 60_000),
    closeAt: new Date(Date.now() + 3_600_000),
    status: 'pending',
    createdBy: 7,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    repository = {
      findById: jest.fn().mockResolvedValue(pendingSession),
      cancel: jest.fn().mockImplementation(async (id) => ({
        ...pendingSession,
        id,
        status: 'cancelled',
      })),
    };

    service = new AttendanceSessionsService(
      repository as unknown as IAttendanceSessionRepository,
      {} as AttendanceRecordsService,
      {} as PrismaService,
    );
  });

  it('cancels a pending session and persists cancelled status', async () => {
    const result = await service.cancel(12, { userId: 7, role: 'lecturer' });

    expect(repository.cancel).toHaveBeenCalledWith(12);
    expect(result.status).toBe('cancelled');
  });

  it('allows an admin to cancel another lecturer session', async () => {
    const result = await service.cancel(12, { userId: 99, role: 'admin' });

    expect(repository.cancel).toHaveBeenCalledWith(12);
    expect(result.status).toBe('cancelled');
  });

  it('rejects cancellation by a lecturer who does not own the session', async () => {
    await expect(
      service.cancel(12, { userId: 8, role: 'lecturer' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.cancel).not.toHaveBeenCalled();
  });

  it('does not cancel a session that has already closed', async () => {
    repository.findById.mockResolvedValue({
      ...pendingSession,
      openAt: new Date(Date.now() - 3_600_000),
      closeAt: new Date(Date.now() - 60_000),
    });

    await expect(
      service.cancel(12, { userId: 7, role: 'lecturer' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.cancel).not.toHaveBeenCalled();
  });

  it('does not cancel a session that was already cancelled', async () => {
    repository.findById.mockResolvedValue({
      ...pendingSession,
      status: 'cancelled',
    });

    await expect(
      service.cancel(12, { userId: 7, role: 'lecturer' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.cancel).not.toHaveBeenCalled();
  });
});
