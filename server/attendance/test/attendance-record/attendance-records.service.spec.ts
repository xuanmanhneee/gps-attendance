import { ILoggerFactory } from '../../src/common/logging/logger.factory';
import { RedisService } from '../../src/redis/redis.service';
import { IAttendanceRecordBuffer } from '../../src/attendance-record/attendance-record.buffer';
import { AttendanceRecord } from '../../src/attendance-record/attendance-record.model';
import { IAttendanceRecordRepository } from '../../src/attendance-record/attendance-record.repository';
import { AttendanceRecordsService } from '../../src/attendance-record/attendance-records.service';

describe('AttendanceRecordsService', () => {
  it('không nhận check-in mới sau khi session bắt đầu flush', async () => {
    let bufferedRecord: AttendanceRecord | null = {
      sessionId: 1,
      userId: 10,
      status: 'absent',
      checkedInAt: null,
      latitude: null,
      longitude: null,
      accuracy: null,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      updateBy: null,
    };
    let persistedRecord: AttendanceRecord | null = null;
    let sessionIsFlushing = false;

    let signalBulkUpsertStarted!: () => void;
    const bulkUpsertStarted = new Promise<void>((resolve) => {
      signalBulkUpsertStarted = resolve;
    });
    let allowBulkUpsert!: () => void;
    const bulkUpsertAllowed = new Promise<void>((resolve) => {
      allowBulkUpsert = resolve;
    });

    const buffer: IAttendanceRecordBuffer = {
      getRecord: jest.fn(async () => bufferedRecord),
      findByUser: jest.fn(async () =>
        bufferedRecord ? [{ ...bufferedRecord }] : [],
      ),
      findBySession: jest.fn(async () =>
        bufferedRecord ? [{ ...bufferedRecord }] : [],
      ),
      upsertRecord: jest.fn(),
      insertRecordIfAbsent: jest.fn(),
      resolveReviewRecord: jest.fn(),
      tryMarkPresentAndClaimDevice: jest.fn(async (input) => {
        if (sessionIsFlushing) return 'session-flushing';
        if (!bufferedRecord) return 'record-missing';

        bufferedRecord = {
          ...bufferedRecord,
          ...input,
          status: 'present',
          updatedAt: input.checkedInAt,
        };
        return 'present';
      }),
      beginSessionFlush: jest.fn(async () => {
        sessionIsFlushing = true;
        return bufferedRecord ? [{ ...bufferedRecord }] : [];
      }),
      completeSessionFlush: jest.fn(async () => {
        bufferedRecord = null;
        sessionIsFlushing = false;
      }),
      clearSession: jest.fn(async () => {
        bufferedRecord = null;
      }),
    };
    const repository: IAttendanceRecordRepository = {
      getRecord: jest.fn(async () => persistedRecord),
      findByUser: jest.fn(async () =>
        persistedRecord ? [{ ...persistedRecord }] : [],
      ),
      findBySession: jest.fn(async () =>
        persistedRecord ? [{ ...persistedRecord }] : [],
      ),
      bulkUpsert: jest.fn(async (records) => {
        signalBulkUpsertStarted();
        await bulkUpsertAllowed;
        persistedRecord = { ...records[0] };
      }),
    };
    const loggerFactory: ILoggerFactory = {
      create: jest.fn(() => ({
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
      })),
    };
    const redisService = {} as RedisService;
    const service = new AttendanceRecordsService(
      repository,
      buffer,
      loggerFactory,
      redisService,
    );

    const flush = service.flushSessionToDb(1);
    await bulkUpsertStarted;

    expect(buffer.completeSessionFlush).not.toHaveBeenCalled();

    const markResult = await service.markPresent(
      {
        sessionId: 1,
        userId: 10,
        checkedInAt: new Date('2026-01-01T00:00:01.000Z'),
        latitude: 10,
        longitude: 106,
        accuracy: 5,
        updateBy: 10,
      },
      'device-10',
      3600,
    );

    allowBulkUpsert();
    await flush;

    expect(markResult).toBe('session-flushing');
    expect(bufferedRecord).toBeNull();
    expect(persistedRecord).toMatchObject({
      sessionId: 1,
      userId: 10,
      status: 'absent',
    });
  });

  it('giữ nguyên buffer và khoá flush khi lưu DB thất bại để job có thể retry', async () => {
    const record: AttendanceRecord = {
      sessionId: 1,
      userId: 10,
      status: 'absent',
      checkedInAt: null,
      latitude: null,
      longitude: null,
      accuracy: null,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      updateBy: null,
    };
    const repository = {
      bulkUpsert: jest
        .fn()
        .mockRejectedValue(new Error('database unavailable')),
    } as unknown as IAttendanceRecordRepository;
    const buffer = {
      beginSessionFlush: jest.fn().mockResolvedValue([record]),
      completeSessionFlush: jest.fn(),
    } as unknown as IAttendanceRecordBuffer;
    const loggerFactory: ILoggerFactory = {
      create: jest.fn(() => ({
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
      })),
    };
    const service = new AttendanceRecordsService(
      repository,
      buffer,
      loggerFactory,
      {} as RedisService,
    );

    await expect(service.flushSessionToDb(1)).rejects.toThrow(
      'database unavailable',
    );
    expect(buffer.completeSessionFlush).not.toHaveBeenCalled();
  });

  it('flush chỉ ghi attendance record xuống Postgres', async () => {
    const record: AttendanceRecord = {
      sessionId: 1,
      userId: 10,
      status: 'absent',
      checkedInAt: null,
      latitude: null,
      longitude: null,
      accuracy: null,
      updatedAt: new Date(),
      updateBy: null,
    };
    const repository = {
      bulkUpsert: jest.fn().mockResolvedValue(undefined),
    } as unknown as IAttendanceRecordRepository;
    const buffer = {
      beginSessionFlush: jest.fn().mockResolvedValue([record]),
      completeSessionFlush: jest.fn().mockResolvedValue(undefined),
    } as unknown as IAttendanceRecordBuffer;
    const service = new AttendanceRecordsService(
      repository,
      buffer,
      {
        create: () => ({
          log: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          debug: jest.fn(),
          verbose: jest.fn(),
        }),
      },
      {} as RedisService,
    );

    await service.flushSessionToDb(1);

    const persisted = (repository.bulkUpsert as jest.Mock).mock.calls[0][0][0];
    expect(persisted).toMatchObject({ status: 'absent', updateBy: null });
  });
});
