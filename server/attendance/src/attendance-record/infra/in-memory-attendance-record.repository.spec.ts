import { InMemoryAttendanceRecordStore } from './in-memory-attendance-record.repository';

describe('InMemoryAttendanceRecordStore', () => {
  it('khởi tạo roster lần hai không ghi đè record đã điểm danh', async () => {
    const store = new InMemoryAttendanceRecordStore();
    const absent = {
      sessionId: 1,
      userId: 2,
      status: 'absent' as const,
      checkedInAt: null,
      latitude: null,
      longitude: null,
      accuracy: null,
      updateBy: null,
    };
    await store.insertRecordIfAbsent(absent);
    await store.tryMarkPresentAndClaimDevice(
      {
        sessionId: 1,
        userId: 2,
        checkedInAt: new Date(),
        latitude: 10,
        longitude: 106,
        accuracy: 5,
        updateBy: 2,
      },
      'device-2',
      3600,
    );

    await store.insertRecordIfAbsent(absent);
    expect((await store.getRecord(1, 2))?.status).toBe('present');
  });

  it('chặn ghi mới sau khi bắt đầu flush và chỉ xoá sau khi complete', async () => {
    const store = new InMemoryAttendanceRecordStore();
    await store.insertRecordIfAbsent({
      sessionId: 1,
      userId: 2,
      status: 'absent',
      checkedInAt: null,
      latitude: null,
      longitude: null,
      accuracy: null,
      updateBy: null,
    });

    const snapshot = await store.beginSessionFlush(1);
    const result = await store.tryMarkPresentAndClaimDevice(
      {
        sessionId: 1,
        userId: 2,
        checkedInAt: new Date(),
        latitude: 10,
        longitude: 106,
        accuracy: 5,
        updateBy: 2,
      },
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
