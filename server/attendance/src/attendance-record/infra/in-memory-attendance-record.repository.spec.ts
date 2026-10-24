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
});
