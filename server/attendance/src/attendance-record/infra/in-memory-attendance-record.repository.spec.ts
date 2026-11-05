import { InMemoryAttendanceRecordStore } from './in-memory-attendance-record.repository';

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

  const checkIn = (
    userId: number,
    validationStatus: 'VALID' | 'REVIEW',
    reasons?: ['LOW_CONFIDENCE_SCORE'],
  ) => ({
    sessionId: 1,
    userId,
    checkedInAt: new Date(),
    latitude: 10,
    longitude: 106,
    accuracy: 5,
    updateBy: userId,
    validationStatus,
    reasons,
  });

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
        validationStatus: 'VALID',
      },
      'device-2',
      3600,
    );

    await store.insertRecordIfAbsent(absent);
    expect((await store.getRecord(1, 2))?.status).toBe('present');
  });

  it('ghi REVIEW ở trạng thái absent và retry thay reasons mới nhất', async () => {
    const store = new InMemoryAttendanceRecordStore();
    await store.insertRecordIfAbsent(absent(2));

    await store.tryMarkPresentAndClaimDevice(
      checkIn(2, 'REVIEW', ['LOW_CONFIDENCE_SCORE']),
      'device-2',
      3600,
    );
    await store.tryMarkPresentAndClaimDevice(
      {
        ...checkIn(2, 'REVIEW'),
        reasons: ['OUT_OF_RANGE'],
      },
      'device-2',
      3600,
    );

    expect(await store.getRecord(1, 2)).toMatchObject({
      status: 'absent',
      updateBy: null,
      reasons: ['OUT_OF_RANGE'],
    });
  });

  it('chỉ giữ thiết bị khi VALID', async () => {
    const store = new InMemoryAttendanceRecordStore();
    await store.insertRecordIfAbsent(absent(1));
    await store.insertRecordIfAbsent(absent(2));

    await expect(
      store.tryMarkPresentAndClaimDevice(
        checkIn(1, 'REVIEW', ['LOW_CONFIDENCE_SCORE']),
        'shared-device',
        3600,
      ),
    ).resolves.toBe('review');
    await expect(
      store.tryMarkPresentAndClaimDevice(
        checkIn(2, 'VALID'),
        'shared-device',
        3600,
      ),
    ).resolves.toBe('present');
  });

  it('retry VALID sau REVIEW xóa toàn bộ field review tạm', async () => {
    const store = new InMemoryAttendanceRecordStore();
    await store.insertRecordIfAbsent(absent(1));
    await store.tryMarkPresentAndClaimDevice(
      checkIn(1, 'REVIEW', ['LOW_CONFIDENCE_SCORE']),
      'device-1',
      3600,
    );
    await store.requestReview(1, 1, 'Em có mặt');

    await expect(
      store.tryMarkPresentAndClaimDevice(checkIn(1, 'VALID'), 'device-1', 3600),
    ).resolves.toBe('present');

    const record = await store.getRecord(1, 1);
    expect(record).toMatchObject({ status: 'present', updateBy: 1 });
    expect(record).not.toHaveProperty('reasons');
    expect(record).not.toHaveProperty('reviewRequested');
    expect(record).not.toHaveProperty('note');
  });

  it('không cho gửi yêu cầu nếu record chưa có reasons', async () => {
    const store = new InMemoryAttendanceRecordStore();
    await store.insertRecordIfAbsent(absent(2));
    await expect(store.requestReview(1, 2, 'Có mặt')).resolves.toBe(
      'not-eligible',
    );
  });

  it.each([
    ['approve', 'present'],
    ['reject', 'absent'],
  ] as const)('khóa retry sau khi giảng viên %s', async (decision, status) => {
    const store = new InMemoryAttendanceRecordStore();
    await store.insertRecordIfAbsent(absent(2));
    await store.tryMarkPresentAndClaimDevice(
      checkIn(2, 'REVIEW', ['LOW_CONFIDENCE_SCORE']),
      'device-2',
      3600,
    );
    await store.requestReview(1, 2, 'Em có mặt');
    await expect(
      store.resolveReview(1, 2, decision, 99),
    ).resolves.toMatchObject({
      status: 'resolved',
      record: { status, updateBy: 99 },
    });
    await expect(
      store.tryMarkPresentAndClaimDevice(checkIn(2, 'VALID'), 'device-2', 3600),
    ).resolves.toBe(decision === 'approve' ? 'already-present' : 'locked');
  });

  it('hai lần duyệt đồng thời chỉ một lần thắng', async () => {
    const store = new InMemoryAttendanceRecordStore();
    await store.insertRecordIfAbsent(absent(2));
    await store.tryMarkPresentAndClaimDevice(
      checkIn(2, 'REVIEW', ['LOW_CONFIDENCE_SCORE']),
      'device-2',
      3600,
    );
    await store.requestReview(1, 2);

    const results = await Promise.all([
      store.resolveReview(1, 2, 'approve', 98),
      store.resolveReview(1, 2, 'reject', 99),
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
        validationStatus: 'VALID',
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
