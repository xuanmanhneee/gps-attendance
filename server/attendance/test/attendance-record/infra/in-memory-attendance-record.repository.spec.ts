import { InMemoryAttendanceRecordStore } from '../../../src/attendance-record/infra/in-memory-attendance-record.repository';

describe('InMemoryAttendanceRecordStore', () => {
  const absent = (userId: number) => ({
    sessionId: 1,
    userId,
    status: 'absent' as const,
    checkedInAt: null,
    latitude: null,
    longitude: null,
    accuracy: null,
    updateBy: null,
  });

  const checkIn = (userId: number) => ({
    sessionId: 1,
    userId,
    checkedInAt: new Date(),
    latitude: 10,
    longitude: 106,
    accuracy: 5,
    updateBy: userId,
  });

  it('khởi tạo roster lần hai không ghi đè record đã điểm danh', async () => {
    const store = new InMemoryAttendanceRecordStore();
    await store.insertRecordIfAbsent(absent(2));
    await store.tryMarkPresentAndClaimDevice(checkIn(2), 'device-2', 3600);

    await store.insertRecordIfAbsent(absent(2));
    expect((await store.getRecord(1, 2))?.status).toBe('present');
  });

  it('chỉ một user có thể giữ cùng một device', async () => {
    const store = new InMemoryAttendanceRecordStore();
    await store.insertRecordIfAbsent(absent(1));
    await store.insertRecordIfAbsent(absent(2));

    await expect(
      store.tryMarkPresentAndClaimDevice(checkIn(1), 'shared-device', 3600),
    ).resolves.toBe('present');
    await expect(
      store.tryMarkPresentAndClaimDevice(checkIn(2), 'shared-device', 3600),
    ).resolves.toBe('device-used');
  });

  it.each([
    ['approve', 'present'],
    ['reject', 'absent'],
  ] as const)(
    'khóa retry sau khi organizer %s review record',
    async (decision, status) => {
      const store = new InMemoryAttendanceRecordStore();
      const candidateCreatedAt = new Date('2026-01-01T00:00:00.000Z');
      await store.insertRecordIfAbsent(absent(2));

      await expect(
        store.resolveReviewRecord(1, 2, decision, 99, candidateCreatedAt),
      ).resolves.toMatchObject({
        status: 'resolved',
        record: { status, updateBy: 99 },
      });
      await expect(
        store.tryMarkPresentAndClaimDevice(checkIn(2), 'device-2', 3600),
      ).resolves.toBe(decision === 'approve' ? 'already-present' : 'locked');
    },
  );

  it('hai lần resolve record đồng thời chỉ một lần thắng', async () => {
    const store = new InMemoryAttendanceRecordStore();
    const createdAt = new Date();
    await store.insertRecordIfAbsent(absent(2));

    const results = await Promise.all([
      store.resolveReviewRecord(1, 2, 'approve', 98, createdAt),
      store.resolveReviewRecord(1, 2, 'reject', 99, createdAt),
    ]);

    expect(
      results.filter((result) => result.status === 'resolved'),
    ).toHaveLength(1);
    expect(results.filter((result) => result.status === 'locked')).toHaveLength(
      1,
    );
  });

  it('chặn ghi mới sau khi bắt đầu flush và chỉ xoá sau khi complete', async () => {
    const store = new InMemoryAttendanceRecordStore();
    await store.insertRecordIfAbsent(absent(2));

    const snapshot = await store.beginSessionFlush(1);
    const result = await store.tryMarkPresentAndClaimDevice(
      checkIn(2),
      'device-2',
      3600,
    );

    expect(snapshot).toHaveLength(1);
    expect(snapshot[0].status).toBe('absent');
    expect(result).toBe('session-flushing');
    expect(await store.getRecord(1, 2)).not.toBeNull();

    await store.completeSessionFlush(1);
    expect(await store.getRecord(1, 2)).toBeNull();
  });
});
