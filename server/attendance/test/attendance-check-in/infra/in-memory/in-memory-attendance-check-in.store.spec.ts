import { InMemoryAttendanceCheckInStore } from '../../../../src/attendance-check-in/infra/in-memory/in-memory-attendance-check-in.store';

describe('InMemoryAttendanceCheckInStore attempt window', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-25T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows three attempts and rejects the fourth in a rolling window', async () => {
    const store = new InMemoryAttendanceCheckInStore();

    await expect(store.tryRecordAttempt(1, 2, 3, 120)).resolves.toBe(true);
    await expect(store.tryRecordAttempt(1, 2, 3, 120)).resolves.toBe(true);
    await expect(store.tryRecordAttempt(1, 2, 3, 120)).resolves.toBe(true);
    await expect(store.tryRecordAttempt(1, 2, 3, 120)).resolves.toBe(false);

    jest.advanceTimersByTime(120_000);

    await expect(store.tryRecordAttempt(1, 2, 3, 120)).resolves.toBe(true);
  });

  it('only releases attempts that actually leave the sliding window', async () => {
    const store = new InMemoryAttendanceCheckInStore();

    await expect(store.tryRecordAttempt(1, 2, 3, 120)).resolves.toBe(true);
    jest.advanceTimersByTime(119_000);
    await expect(store.tryRecordAttempt(1, 2, 3, 120)).resolves.toBe(true);
    await expect(store.tryRecordAttempt(1, 2, 3, 120)).resolves.toBe(true);
    await expect(store.tryRecordAttempt(1, 2, 3, 120)).resolves.toBe(false);

    jest.advanceTimersByTime(1_000);

    await expect(store.tryRecordAttempt(1, 2, 3, 120)).resolves.toBe(true);
    await expect(store.tryRecordAttempt(1, 2, 3, 120)).resolves.toBe(false);
  });

  it('keeps windows independent between users and sessions', async () => {
    const store = new InMemoryAttendanceCheckInStore();

    await expect(store.tryRecordAttempt(1, 2, 3, 120)).resolves.toBe(true);
    await expect(store.tryRecordAttempt(1, 3, 3, 120)).resolves.toBe(true);
    await expect(store.tryRecordAttempt(2, 2, 3, 120)).resolves.toBe(true);
  });
});
