import { AttendanceSessionQueryService } from './attendance-session-query.service';

const session = {
  id: 7,
  title: 'Buổi 1',
  latitude: 10,
  longitude: 106,
  radius: 100,
  openAt: new Date('2026-10-24T09:00:00.000Z'),
  closeAt: new Date('2026-10-24T10:00:00.000Z'),
  status: 'pending',
  createdBy: 1,
  createdAt: new Date('2026-10-24T08:00:00.000Z'),
  updatedAt: new Date('2026-10-24T08:00:00.000Z'),
};

const user = {
  id: 3,
  code: 'P003',
  role: 'participant',
  fullname: 'Người tham gia',
  unitId: 1,
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  updatedAt: new Date('2026-10-01T00:00:00.000Z'),
};

describe('AttendanceSessionQueryService.getDetail', () => {
  const organizer = {
    userId: session.createdBy,
    username: 'organizer',
    role: 'organizer' as const,
  };
  const sessions = {
    findById: jest.fn(),
    getPendingCriteria: jest.fn(),
  };
  const records = { findBySessionId: jest.fn() };
  const users = { findByIds: jest.fn() };
  const userFilter = { resolveUserIds: jest.fn() };

  const service = new AttendanceSessionQueryService(
    sessions as never,
    records as never,
    users as never,
    userFilter as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    sessions.findById.mockResolvedValue(session);
    users.findByIds.mockResolvedValue([user]);
  });

  it('trả danh sách dự kiến từ criteria mà không tạo trạng thái điểm danh giả', async () => {
    const criteria = { codeFilter: { include: ['P003'] } };
    sessions.getPendingCriteria.mockResolvedValue(criteria);
    userFilter.resolveUserIds.mockResolvedValue([user.id]);

    const detail = await service.getDetail(session.id, organizer);

    expect(userFilter.resolveUserIds).toHaveBeenCalledWith(criteria);
    expect(users.findByIds).toHaveBeenCalledWith([user.id]);
    expect(records.findBySessionId).not.toHaveBeenCalled();
    expect(detail.participants).toEqual([]);
    expect(detail.plannedParticipants).toEqual([
      { code: user.code, role: user.role, fullname: user.fullname },
    ]);
  });

  it('giữ danh sách dự kiến rỗng khi criteria chưa tìm thấy người phù hợp', async () => {
    sessions.getPendingCriteria.mockResolvedValue({
      codeFilter: { include: ['P999'] },
    });
    userFilter.resolveUserIds.mockResolvedValue([]);
    users.findByIds.mockResolvedValue([]);

    const detail = await service.getDetail(session.id, organizer);

    expect(detail.plannedParticipants).toEqual([]);
    expect(detail.participants).toEqual([]);
  });

  it('sau khi khởi tạo roster thì đọc trạng thái từ record', async () => {
    sessions.getPendingCriteria.mockResolvedValue(null);
    records.findBySessionId.mockResolvedValue([
      {
        sessionId: session.id,
        userId: user.id,
        status: 'absent',
        checkedInAt: null,
        updatedAt: new Date('2026-10-24T08:55:00.000Z'),
      },
    ]);

    const detail = await service.getDetail(session.id, organizer);

    expect(userFilter.resolveUserIds).not.toHaveBeenCalled();
    expect(detail.plannedParticipants).toBeNull();
    expect(detail.participants).toEqual([
      {
        user: {
          id: user.id,
          code: user.code,
          role: user.role,
          fullname: user.fullname,
        },
        status: 'absent',
        checkedInAt: null,
        updatedAt: '2026-10-24T08:55:00.000Z',
      },
    ]);
  });

  it('không cho organizer xem record của phiên do người khác tạo', async () => {
    await expect(
      service.getDetail(session.id, {
        userId: 999,
        username: 'other-organizer',
        role: 'organizer',
      }),
    ).rejects.toMatchObject({
      response: { code: 'ATTENDANCE_SESSION_FORBIDDEN' },
    });

    expect(records.findBySessionId).not.toHaveBeenCalled();
  });

  it('cho phép admin xem record của mọi phiên', async () => {
    sessions.getPendingCriteria.mockResolvedValue(null);
    records.findBySessionId.mockResolvedValue([]);
    users.findByIds.mockResolvedValue([]);

    await expect(
      service.getDetail(session.id, {
        userId: 999,
        username: 'admin',
        role: 'admin',
      }),
    ).resolves.toMatchObject({ id: session.id, participants: [] });
  });
});
