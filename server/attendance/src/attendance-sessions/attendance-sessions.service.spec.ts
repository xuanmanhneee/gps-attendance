// attendance-sessions.service.spec.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  AttendanceSessionErrorCode,
  isValidUserFilterCriteria,
} from '@gps-attendance/shared';

import { AttendanceSessionsService } from './attendance-sessions.service';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';
import { UpdateAttendanceSessionDto } from './dto/update-attendance-session.dto';
import { InMemoryAttendanceSessionRepository } from './infra/in-memory/in-memory-attendance-session.repository';
// chỉnh path đúng theo project

jest.mock('@gps-attendance/shared', () => ({
  ...jest.requireActual('@gps-attendance/shared'),
  isValidUserFilterCriteria: jest.fn(() => true),
}));

const NOW = new Date('2026-10-12T08:00:00.000Z');
const OWNER = 1;
const OTHER = 2;
const min = (n: number) => new Date(NOW.getTime() + n * 60_000);

describe('AttendanceSessionsService', () => {
  let repo: InMemoryAttendanceSessionRepository;
  let service: AttendanceSessionsService;
  let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let scheduler: { schedule: jest.Mock; cancel: jest.Mock; onJob: jest.Mock };
  let userFilter: { assertTagsOwnedBy: jest.Mock; resolveUserIds: jest.Mock };
  let records: {
    initializeForSession: jest.Mock;
    clearSessionBuffer: jest.Mock;
  };

  // seed session với trạng thái mong muốn
  const seed = (openAt: Date, closeAt: Date) =>
    repo.create({
      title: 'Buổi 1',
      latitude: 10,
      longitude: 106,
      radius: 100,
      openAt,
      closeAt,
      createdBy: OWNER,
    });

  const patch = (id: number, dto: object, userId = OWNER) =>
    service.update(id, dto as UpdateAttendanceSessionDto, userId);

  // lấy mã lỗi từ exception của Nest
  const codeOf = async (promise: Promise<unknown>) => {
    try {
      await promise;
    } catch (e) {
      return (e as { getResponse: () => { code: string } }).getResponse().code;
    }
    return undefined;
  };

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    jest.mocked(isValidUserFilterCriteria).mockReturnValue(true);

    repo = new InMemoryAttendanceSessionRepository();
    const values = new Map<string, string>();
    redis = {
      get: jest.fn(async (key: string) => values.get(key) ?? null),
      set: jest.fn(async (key: string, value: string) => {
        values.set(key, value);
      }),
      del: jest.fn(async (key: string) => {
        values.delete(key);
      }),
    };
    scheduler = { schedule: jest.fn(), cancel: jest.fn(), onJob: jest.fn() };
    userFilter = { assertTagsOwnedBy: jest.fn(), resolveUserIds: jest.fn() };
    records = {
      initializeForSession: jest.fn(),
      clearSessionBuffer: jest.fn(),
    };

    service = new AttendanceSessionsService(
      repo,
      userFilter as never,
      records as never,
      redis as never,
      scheduler as never,
      { create: () => ({ warn: jest.fn() }) } as never,
    );
  });

  afterEach(() => jest.useRealTimers());

  describe('khởi tạo roster có thể chạy lại', () => {
    const initialize = (sessionId: number) =>
      (
        service as unknown as {
          initializeRoster: (id: number) => Promise<void>;
        }
      ).initializeRoster(sessionId);

    it('giữ criteria để retry khi ghi roster lỗi', async () => {
      const session = await seed(min(30), min(60));
      const criteria = { codeFilter: { include: ['S1'] } };
      await redis.set(
        `attendance:session:${session.id}:criteria`,
        JSON.stringify(criteria),
      );
      userFilter.resolveUserIds.mockResolvedValue([3]);
      records.initializeForSession.mockRejectedValueOnce(
        new Error('Redis tạm thời lỗi'),
      );

      await expect(initialize(session.id)).rejects.toThrow(
        'Redis tạm thời lỗi',
      );
      expect(
        await redis.get(`attendance:session:${session.id}:criteria`),
      ).not.toBeNull();
      expect(
        await redis.get(`attendance:session:${session.id}:roster-initialized`),
      ).toBeNull();
    });

    it('không khởi tạo lại roster đã hoàn tất và lên lịch flush nếu phiên đã đóng', async () => {
      const session = await seed(min(-30), min(-1));
      await redis.set(
        `attendance:session:${session.id}:criteria`,
        JSON.stringify({ codeFilter: { include: ['S1'] } }),
      );
      userFilter.resolveUserIds.mockResolvedValue([3]);

      await initialize(session.id);
      await initialize(session.id);

      expect(records.initializeForSession).toHaveBeenCalledTimes(1);
      expect(
        await redis.get(`attendance:session:${session.id}:roster-initialized`),
      ).toBe('1');
      expect(scheduler.schedule).toHaveBeenCalledWith(
        'attendance:flush',
        expect.any(Date),
        { sessionId: session.id },
        `flush:${session.id}`,
      );
    });
  });

  describe('create', () => {
    const create = (openAt: Date, closeAt: Date) =>
      service.create(
        {
          title: 'Buổi 1',
          latitude: 10,
          longitude: 106,
          radius: 100,
          openAt: openAt.toISOString(),
          closeAt: closeAt.toISOString(),
          participantCriteria: { codeFilter: { include: ['S1'] } },
        } as CreateAttendanceSessionDto,
        OWNER,
      );

    it('khởi tạo roster ngay khi giờ mở đã qua, không lên lịch init-roster', async () => {
      userFilter.resolveUserIds.mockResolvedValue([3, 4]);

      const session = await create(min(-2), min(60));

      expect(session.status).toBe('open');
      expect(records.initializeForSession).toHaveBeenCalledWith(
        session.id,
        [3, 4],
      );
      expect(redis.del).toHaveBeenCalledWith(
        `attendance:session:${session.id}:criteria`,
      );
      expect(scheduler.schedule).toHaveBeenCalledTimes(1);
      expect(scheduler.schedule).toHaveBeenCalledWith(
        'attendance:flush',
        min(70),
        { sessionId: session.id },
        `flush:${session.id}`,
      );
    });

    it('khởi tạo roster ngay khi giờ mở còn dưới 5 phút', async () => {
      userFilter.resolveUserIds.mockResolvedValue([3]);

      const session = await create(min(2), min(60));

      expect(session.status).toBe('pending');
      expect(records.initializeForSession).toHaveBeenCalledWith(
        session.id,
        [3],
      );
      expect(scheduler.schedule).not.toHaveBeenCalledWith(
        'attendance:init-roster',
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('vẫn lên lịch init-roster cho giờ mở đủ xa', async () => {
      const session = await create(min(60), min(120));

      expect(records.initializeForSession).not.toHaveBeenCalled();
      expect(scheduler.schedule).toHaveBeenCalledWith(
        'attendance:init-roster',
        min(55),
        { sessionId: session.id },
        `init-roster:${session.id}`,
      );
    });

    it('từ chối khi giờ đóng đã qua', async () => {
      await expect(create(min(-60), min(-1))).rejects.toThrow(
        BadRequestException,
      );
      expect(scheduler.schedule).not.toHaveBeenCalled();
    });
  });

  describe('quyền và trạng thái', () => {
    it('từ chối người không phải owner', async () => {
      const s = await seed(min(60), min(180));

      await expect(patch(s.id, { radius: 200 }, OTHER)).rejects.toThrow(
        ForbiddenException,
      );
      expect((await repo.findById(s.id))!.radius).toBe(100);
    });

    it('từ chối session đã đóng', async () => {
      const s = await seed(min(-120), min(-60));

      const code = await codeOf(patch(s.id, { radius: 200 }));
      expect(code).toBe(AttendanceSessionErrorCode.UPDATE_INVALID_STATUS);
    });

    it('từ chối session đã huỷ', async () => {
      const s = await seed(min(60), min(180));
      await repo.update(s.id, { status: 'cancelled' });

      const code = await codeOf(patch(s.id, { radius: 200 }));
      expect(code).toBe(AttendanceSessionErrorCode.UPDATE_INVALID_STATUS);
    });
  });

  describe('session đang open', () => {
    it('cho sửa closeAt và đặt lại job flush', async () => {
      const s = await seed(min(-60), min(60));
      const newClose = min(120);

      await patch(s.id, { closeAt: newClose.toISOString() });

      expect((await repo.findById(s.id))!.closeAt).toEqual(newClose);
      expect(scheduler.cancel).toHaveBeenCalledWith(`flush:${s.id}`);
      expect(scheduler.schedule).toHaveBeenCalledWith(
        'attendance:flush',
        new Date(newClose.getTime() + 10 * 60 * 1000),
        { sessionId: s.id },
        `flush:${s.id}`,
      );
      expect(scheduler.cancel).not.toHaveBeenCalledWith(`init-roster:${s.id}`);
    });

    it('chặn sửa trường khác closeAt', async () => {
      const s = await seed(min(-60), min(60));

      const code = await codeOf(patch(s.id, { radius: 200 }));
      expect(code).toBe(AttendanceSessionErrorCode.UPDATE_FIELD_LOCKED);
      expect((await repo.findById(s.id))!.radius).toBe(100);
    });
  });

  describe('pending, trước initAt', () => {
    it('sửa trường thường, không đụng job', async () => {
      const s = await seed(min(60), min(180));

      const result = await patch(s.id, { radius: 200, title: 'Mới' });

      expect(result.radius).toBe(200);
      expect(result.title).toBe('Mới');
      expect(result.latitude).toBe(10); // trường không gửi giữ nguyên
      expect(scheduler.cancel).not.toHaveBeenCalled();
      expect(scheduler.schedule).not.toHaveBeenCalled();
    });

    it('đổi openAt thì đặt lại init-roster lúc openAt - 5 phút', async () => {
      const s = await seed(min(60), min(180));
      const newOpen = min(90);

      await patch(s.id, { openAt: newOpen.toISOString() });

      expect(scheduler.schedule).toHaveBeenCalledWith(
        'attendance:init-roster',
        min(85),
        { sessionId: s.id },
        `init-roster:${s.id}`,
      );
    });

    it('sửa criteria: ghi Redis và kiểm tag thuộc owner', async () => {
      const s = await seed(min(60), min(180));
      const criteria = { tags: [1] };

      await patch(s.id, { participantCriteria: criteria });

      expect(userFilter.assertTagsOwnedBy).toHaveBeenCalledWith(
        criteria,
        OWNER,
      );
      expect(redis.set).toHaveBeenCalledWith(
        `attendance:session:${s.id}:criteria`,
        JSON.stringify(criteria),
      );
    });

    it('criteria không hợp lệ thì không ghi gì', async () => {
      const s = await seed(min(60), min(180));
      jest.mocked(isValidUserFilterCriteria).mockReturnValue(false);

      const code = await codeOf(
        patch(s.id, { participantCriteria: {}, radius: 200 }),
      );

      expect(code).toBe(AttendanceSessionErrorCode.INVALID_CRITERIA);
      expect(redis.set).not.toHaveBeenCalled();
      expect((await repo.findById(s.id))!.radius).toBe(100);
    });
  });

  describe('pending, sau initAt (roster đã khoá)', () => {
    // openAt cách 3 phút < 5 phút buffer
    it('chặn sửa criteria', async () => {
      const s = await seed(min(3), min(120));

      const code = await codeOf(patch(s.id, { participantCriteria: {} }));
      expect(code).toBe(AttendanceSessionErrorCode.CRITERIA_LOCKED);
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('vẫn sửa được trường thường', async () => {
      const s = await seed(min(3), min(120));

      const result = await patch(s.id, { radius: 300 });
      expect(result.radius).toBe(300);
    });

    it('đổi openAt không đặt lại init-roster', async () => {
      const s = await seed(min(3), min(120));

      await patch(s.id, { openAt: min(4).toISOString() });

      expect(scheduler.schedule).not.toHaveBeenCalledWith(
        'attendance:init-roster',
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe('khoảng thời gian', () => {
    it('openAt >= closeAt', async () => {
      const s = await seed(min(60), min(180));

      const code = await codeOf(
        patch(s.id, { openAt: min(200).toISOString() }),
      );
      expect(code).toBe(AttendanceSessionErrorCode.INVALID_TIME_RANGE);
    });

    it('đổi openAt đến gần hiện tại thì huỷ job cũ và khởi tạo roster ngay', async () => {
      const s = await seed(min(60), min(180));
      const criteria = { codeFilter: { include: ['S1'] } };
      await redis.set(
        `attendance:session:${s.id}:criteria`,
        JSON.stringify(criteria),
      );
      userFilter.resolveUserIds.mockResolvedValue([3]);

      await patch(s.id, { openAt: min(2).toISOString() });

      expect(scheduler.cancel).toHaveBeenCalledWith(`init-roster:${s.id}`);
      expect(records.initializeForSession).toHaveBeenCalledWith(s.id, [3]);
      expect(scheduler.schedule).not.toHaveBeenCalledWith(
        'attendance:init-roster',
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('closeAt mới nằm trong quá khứ', async () => {
      const s = await seed(min(-60), min(60));

      const code = await codeOf(
        patch(s.id, { closeAt: min(-1).toISOString() }),
      );
      expect(code).toBe(AttendanceSessionErrorCode.INVALID_TIME_RANGE);
    });
  });

  it('không ghi gì khi guard thất bại (ví dụ: không ghi Redis nếu validate lỗi)', async () => {
    const s = await seed(min(60), min(180));

    await expect(
      patch(s.id, { participantCriteria: {}, openAt: min(200).toISOString() }),
    ).rejects.toThrow(ConflictException.name ? Error : Error);

    expect(redis.set).not.toHaveBeenCalled();
    expect(scheduler.schedule).not.toHaveBeenCalled();
  });
});
