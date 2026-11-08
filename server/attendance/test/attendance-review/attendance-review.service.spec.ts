import { AttendanceReviewService } from '../../src/attendance-review/attendance-review.service';
import { InMemoryAttendanceReviewRepository } from '../../src/attendance-review/infra/in-memory/in-memory-attendance-review.repository';
import { InMemoryAttendanceReviewHistoryRepository } from '../../src/attendance-review/infra/in-memory/in-memory-attendance-review-history.repository';
import { InMemoryAttendanceRecordStore } from '../../src/attendance-record/infra/in-memory-attendance-record.repository';

describe('AttendanceReviewService', () => {
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

  const input = (reasons: Array<'LOW_CONFIDENCE_SCORE' | 'OUT_OF_RANGE'>) => ({
    sessionId: 1,
    userId: 2,
    reasons,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    expiresAt: new Date(Date.now() + 60_000),
  });

  const createFixture = async () => {
    const records = new InMemoryAttendanceRecordStore();
    await records.insertRecordIfAbsent(absent);
    const recordService = {
      getBySessionAndUser: (sessionId: number, userId: number) =>
        records.getRecord(sessionId, userId),
      resolveReviewRecord: (
        sessionId: number,
        userId: number,
        decision: 'approve' | 'reject',
        resolverId: number,
        candidateCreatedAt: Date,
      ) =>
        records.resolveReviewRecord(
          sessionId,
          userId,
          decision,
          resolverId,
          candidateCreatedAt,
        ),
    };
    const repository = new InMemoryAttendanceReviewRepository();
    const service = new AttendanceReviewService(
      repository,
      new InMemoryAttendanceReviewHistoryRepository(),
      recordService as never,
    );

    return { records, repository, service };
  };

  it('lưu candidate riêng và retry thay reasons mới nhất', async () => {
    const { records, service } = await createFixture();

    await expect(
      service.requestReview(input(['LOW_CONFIDENCE_SCORE'])),
    ).resolves.toBe('requested');
    await expect(service.requestReview(input(['OUT_OF_RANGE']))).resolves.toBe(
      'requested',
    );

    expect(await records.getRecord(1, 2)).toMatchObject({
      status: 'absent',
      updateBy: null,
    });
    expect(await service.findBySession(1)).toEqual([
      expect.objectContaining({ reasons: ['OUT_OF_RANGE'] }),
    ]);
  });

  it.each([
    ['approve', 'present'],
    ['reject', 'absent'],
  ] as const)(
    'resolve %s cập nhật record và xóa candidate',
    async (decision, status) => {
      const { records, service } = await createFixture();
      await service.requestReview(input(['LOW_CONFIDENCE_SCORE']));

      await expect(
        service.resolveReview(1, 2, decision, 99),
      ).resolves.toMatchObject({
        status: 'resolved',
        candidate: { reasons: ['LOW_CONFIDENCE_SCORE'] },
        record: { status, updateBy: 99 },
      });
      expect(await service.findBySession(1)).toHaveLength(0);
      expect(await records.getRecord(1, 2)).toMatchObject({
        status,
        updateBy: 99,
      });
    },
  );

  it('hai quyết định đồng thời chỉ một lần thắng', async () => {
    const { service } = await createFixture();
    await service.requestReview(input(['LOW_CONFIDENCE_SCORE']));

    const results = await Promise.all([
      service.resolveReview(1, 2, 'approve', 98),
      service.resolveReview(1, 2, 'reject', 99),
    ]);

    expect(
      results.filter((result) => result.status === 'resolved'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status !== 'resolved'),
    ).toHaveLength(1);
  });

  it('giữ kết quả resolve nếu cleanup candidate thất bại', async () => {
    const candidate = {
      sessionId: 1,
      userId: 2,
      reasons: ['LOW_CONFIDENCE_SCORE'] as const,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const repository = {
      find: jest.fn().mockResolvedValue(candidate),
      delete: jest.fn().mockRejectedValue(new Error('redis down')),
    };
    const records = {
      resolveReviewRecord: jest.fn().mockResolvedValue({
        status: 'resolved',
        previousStatus: 'absent',
        record: { ...absent, status: 'present', updateBy: 99 },
      }),
    };
    const service = new AttendanceReviewService(
      repository as never,
      new InMemoryAttendanceReviewHistoryRepository(),
      records as never,
    );

    await expect(
      service.resolveReview(1, 2, 'approve', 99),
    ).resolves.toMatchObject({
      status: 'resolved',
    });
  });

  it('dọn candidate nếu record bị khóa trong lúc đang request', async () => {
    const repository = new InMemoryAttendanceReviewRepository();
    const getBySessionAndUser = jest
      .fn()
      .mockResolvedValueOnce(absent)
      .mockResolvedValueOnce({ ...absent, status: 'present', updateBy: 2 });
    const service = new AttendanceReviewService(
      repository,
      new InMemoryAttendanceReviewHistoryRepository(),
      { getBySessionAndUser } as never,
    );

    await expect(
      service.requestReview(input(['LOW_CONFIDENCE_SCORE'])),
    ).resolves.toBe('already-present');
    expect(await repository.findBySession(1)).toHaveLength(0);
  });
});
