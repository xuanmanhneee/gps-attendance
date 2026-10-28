import { RedisService } from '../../../redis/redis.service';
import { RedisAttendanceRecordBuffer } from './redis-attendance-record-buffer';

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

  it('deletes the buffer and flush lock together after durable persistence', async () => {
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
