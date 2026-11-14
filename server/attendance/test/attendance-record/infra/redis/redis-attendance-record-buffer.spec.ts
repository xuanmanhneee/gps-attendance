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
      [
        'attendance:buffer:4',
        'attendance:buffer-flushing:4',
        'attendance:open-buffers',
      ],
      ['4'],
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
    expect(calls.map(([, , args]) => args.length)).toEqual([1001, 1001, 3]);
    for (const [script, keys, args] of calls) {
      expect(script).toContain('HSETNX');
      expect(keys).toEqual(['attendance:buffer:7', 'attendance:open-buffers']);
      expect(args[0]).toBe('7');
    }
    const [, , firstArgs] = calls[0];
    expect(firstArgs[1]).toBe('1');
    expect(JSON.parse(firstArgs[2])).toMatchObject({
      userId: 1,
      status: 'absent',
    });
    const [, , lastArgs] = calls[2];
    expect(lastArgs[1]).toBe('1001');
  });

  it('không gọi Redis khi roster rỗng', async () => {
    const redisService = { eval: jest.fn() } as unknown as RedisService;
    const buffer = new RedisAttendanceRecordBuffer(redisService);

    await buffer.insertRecordsIfAbsent([]);

    expect(redisService.eval).not.toHaveBeenCalled();
  });
});

describe('RedisAttendanceRecordBuffer open-buffers index', () => {
  const stored = (sessionId: number, userId: number) =>
    JSON.stringify({
      sessionId,
      userId,
      status: 'absent',
      checkedInAt: null,
      latitude: null,
      longitude: null,
      accuracy: null,
      updateBy: null,
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

  it('findByUser chỉ đọc buffer trong tập chỉ mục, không SCAN', async () => {
    const redisService = {
      smembers: jest.fn().mockResolvedValue(['3', '8']),
      eval: jest.fn().mockResolvedValue(['', stored(8, 5)]),
      scan: jest.fn(),
    } as unknown as RedisService;
    const buffer = new RedisAttendanceRecordBuffer(redisService);

    const records = await buffer.findByUser(5);

    expect(redisService.scan).not.toHaveBeenCalled();
    expect(redisService.smembers).toHaveBeenCalledWith(
      'attendance:open-buffers',
    );
    expect(redisService.eval).toHaveBeenCalledWith(
      expect.stringContaining('HGET'),
      ['attendance:buffer:3', 'attendance:buffer:8'],
      ['5'],
    );
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ sessionId: 8, userId: 5 });
  });

  it('findByUser không gọi Lua khi không có buffer nào mở', async () => {
    const redisService = {
      smembers: jest.fn().mockResolvedValue([]),
      eval: jest.fn(),
    } as unknown as RedisService;
    const buffer = new RedisAttendanceRecordBuffer(redisService);

    await expect(buffer.findByUser(5)).resolves.toEqual([]);
    expect(redisService.eval).not.toHaveBeenCalled();
  });

  it('ghi roster và xoá buffer cùng cập nhật tập chỉ mục', async () => {
    const redisService = {
      eval: jest.fn().mockResolvedValue(0),
    } as unknown as RedisService;
    const buffer = new RedisAttendanceRecordBuffer(redisService);

    await buffer.insertRecordsIfAbsent([
      {
        sessionId: 7,
        userId: 1,
        status: 'absent',
        checkedInAt: null,
        latitude: null,
        longitude: null,
        accuracy: null,
        updateBy: null,
      },
    ]);
    await buffer.completeSessionFlush(7);

    const calls = (redisService.eval as jest.Mock).mock.calls as [
      string,
      string[],
      string[],
    ][];
    expect(calls[0][0]).toContain('SADD');
    expect(calls[0][1]).toEqual([
      'attendance:buffer:7',
      'attendance:open-buffers',
    ]);
    expect(calls[0][2][0]).toBe('7');
    expect(calls[1][0]).toContain('SREM');
    expect(calls[1][1]).toContain('attendance:open-buffers');
    expect(calls[1][2]).toEqual(['7']);
  });

  it('lúc khởi động nạp các buffer có sẵn vào tập chỉ mục', async () => {
    const redisService = {
      scan: jest
        .fn()
        .mockResolvedValueOnce(['17', ['attendance:buffer:3']])
        .mockResolvedValueOnce(['0', ['attendance:buffer:12']]),
      sadd: jest.fn(),
    } as unknown as RedisService;
    const buffer = new RedisAttendanceRecordBuffer(redisService);

    await buffer.onModuleInit();

    expect(redisService.sadd).toHaveBeenCalledWith(
      'attendance:open-buffers',
      '3',
      '12',
    );
  });
});
