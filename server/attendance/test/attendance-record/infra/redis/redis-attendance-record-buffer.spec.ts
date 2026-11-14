import { RedisService } from '../../../../src/redis/redis.service';
import { RedisAttendanceRecordBuffer } from '../../../../src/attendance-record/infra/redis/redis-attendance-record-buffer';

const markPresentInput = {
  sessionId: 4,
  userId: 9,
  checkedInAt: new Date('2026-01-01T00:00:01.000Z'),
  latitude: 10,
  longitude: 106,
  accuracy: 5,
  updateBy: 9,
};

describe('RedisAttendanceRecordBuffer session flush', () => {
  it('không đọc hoặc ghi key review khi commit check-in VALID', async () => {
    const redisService = {
      eval: jest.fn().mockResolvedValue(3),
    } as unknown as RedisService;
    const buffer = new RedisAttendanceRecordBuffer(redisService);

    await expect(
      buffer.tryMarkPresentAndClaimDevice(markPresentInput, 'device-9', 3600),
    ).resolves.toBe('present');

    expect(redisService.eval).toHaveBeenCalledWith(
      expect.not.stringContaining('attendance:review'),
      [
        'attendance:buffer:4',
        'attendance:device:4:device-9',
        'attendance:buffer-flushing:4',
      ],
      expect.any(Array),
    );
  });

  it('checks the flush lock in the same Lua commit and maps the locked result', async () => {
    const redisService = {
      eval: jest.fn().mockResolvedValue(4),
    } as unknown as RedisService;
    const buffer = new RedisAttendanceRecordBuffer(redisService);

    await expect(
      buffer.tryMarkPresentAndClaimDevice(markPresentInput, 'device-9', 3600),
    ).resolves.toBe('session-flushing');

    expect(redisService.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('EXISTS', KEYS[3])"),
      [
        'attendance:buffer:4',
        'attendance:device:4:device-9',
        'attendance:buffer-flushing:4',
      ],
      expect.any(Array),
    );
  });

  it('resolve record không truy cập candidate storage', async () => {
    const record = JSON.stringify({
      sessionId: 4,
      userId: 9,
      status: 'present',
      checkedInAt: '2026-01-01T00:00:01.000Z',
      latitude: null,
      longitude: null,
      accuracy: null,
      updateBy: 99,
      updatedAt: '2026-01-01T00:00:02.000Z',
    });
    const redisService = {
      eval: jest.fn().mockResolvedValue([3, 'absent', record]),
    } as unknown as RedisService;
    const buffer = new RedisAttendanceRecordBuffer(redisService);

    await expect(
      buffer.resolveReviewRecord(
        4,
        9,
        'approve',
        99,
        new Date('2026-01-01T00:00:01.000Z'),
      ),
    ).resolves.toMatchObject({
      status: 'resolved',
      record: { status: 'present', updateBy: 99 },
    });
    expect(redisService.eval).toHaveBeenCalledWith(
      expect.not.stringContaining('attendance:review'),
      ['attendance:buffer:4', 'attendance:buffer-flushing:4'],
      expect.any(Array),
    );
  });

  it('sets the flush lock and reads the snapshot in one Lua operation', async () => {
    const raw = JSON.stringify({
      ...markPresentInput,
      status: 'present',
      updatedAt: new Date('2026-01-01T00:00:02.000Z'),
    });
    const redisService = {
      eval: jest.fn().mockResolvedValue([raw]),
    } as unknown as RedisService;
    const buffer = new RedisAttendanceRecordBuffer(redisService);

    const snapshot = await buffer.beginSessionFlush(4);

    expect(redisService.eval).toHaveBeenCalledWith(
      expect.stringContaining("return redis.call('HVALS', KEYS[1])"),
      ['attendance:buffer:4', 'attendance:buffer-flushing:4'],
      [],
    );
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0]).toMatchObject({ sessionId: 4, userId: 9 });
    expect(snapshot[0].checkedInAt).toBeInstanceOf(Date);
    expect(snapshot[0].updatedAt).toBeInstanceOf(Date);
  });

  it('normalizes the legacy updateBy=0 sentinel before flushing to Postgres', async () => {
    const raw = JSON.stringify({
      ...markPresentInput,
      status: 'present',
      updateBy: 0,
      updatedAt: new Date('2026-01-01T00:00:02.000Z'),
    });
    const redisService = {
      eval: jest.fn().mockResolvedValue([raw]),
    } as unknown as RedisService;
    const buffer = new RedisAttendanceRecordBuffer(redisService);

    await expect(buffer.beginSessionFlush(4)).resolves.toMatchObject([
      { updateBy: null },
    ]);
  });

  it('deletes only the record buffer and flush lock after persistence', async () => {
    const redisService = {
      eval: jest.fn().mockResolvedValue(2),
    } as unknown as RedisService;
    const buffer = new RedisAttendanceRecordBuffer(redisService);

    await buffer.completeSessionFlush(4);

    expect(redisService.eval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('DEL', KEYS[1], KEYS[2])"),
      ['attendance:buffer:4', 'attendance:buffer-flushing:4'],
      [],
    );
  });
});

describe('RedisAttendanceRecordBuffer roster insert', () => {
  const absent = (sessionId: number, userId: number) => ({
    sessionId,
    userId,
    status: 'absent' as const,
    checkedInAt: null,
    latitude: null,
    longitude: null,
    accuracy: null,
    updateBy: null,
  });

  it('ghi roster theo lô 500 record mỗi lần gọi Lua, dùng HSETNX', async () => {
    const redisService = {
      eval: jest.fn().mockResolvedValue(0),
    } as unknown as RedisService;
    const buffer = new RedisAttendanceRecordBuffer(redisService);

    await buffer.insertRecordsIfAbsent(
      Array.from({ length: 1001 }, (_, i) => absent(7, i + 1)),
    );

    const calls = (redisService.eval as jest.Mock).mock.calls as [
      string,
      string[],
      string[],
    ][];
    expect(calls.map(([, , args]) => args.length)).toEqual([1000, 1000, 2]);
    for (const [script, keys] of calls) {
      expect(script).toContain('HSETNX');
      expect(keys).toEqual(['attendance:buffer:7']);
    }
    const [, , firstArgs] = calls[0];
    expect(firstArgs[0]).toBe('1');
    expect(JSON.parse(firstArgs[1])).toMatchObject({
      userId: 1,
      status: 'absent',
    });
    const [, , lastArgs] = calls[2];
    expect(lastArgs[0]).toBe('1001');
  });

  it('không gọi Redis khi roster rỗng', async () => {
    const redisService = { eval: jest.fn() } as unknown as RedisService;
    const buffer = new RedisAttendanceRecordBuffer(redisService);

    await buffer.insertRecordsIfAbsent([]);

    expect(redisService.eval).not.toHaveBeenCalled();
  });
});
