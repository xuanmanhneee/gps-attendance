import { AttendanceCheckInService } from '../../src/attendance-check-in/attendance-check-in.service';

describe('AttendanceCheckInService review resolution history', () => {
  it('giữ quyết định thành công khi ghi history lỗi và log đủ entry', async () => {
    const logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };
    const now = Date.now();
    const reviewService = {
      resolveReview: jest.fn().mockResolvedValue({
        status: 'resolved',
        previousStatus: 'absent',
        record: {
          sessionId: 1,
          userId: 2,
          status: 'present',
          updateBy: 99,
        },
        candidate: {
          sessionId: 1,
          userId: 2,
          reasons: ['LOW_CONFIDENCE_SCORE'],
          createdAt: new Date(now),
        },
      }),
      recordHistory: jest.fn().mockRejectedValue(new Error('db down')),
    };
    const service = new AttendanceCheckInService(
      {
        findById: jest.fn().mockResolvedValue({
          id: 1,
          createdBy: 99,
          status: 'open',
          openAt: new Date(now - 60_000),
          closeAt: new Date(now + 60_000),
        }),
      } as never,
      {} as never,
      {} as never,
      reviewService as never,
      {} as never,
      {} as never,
      { create: () => logger } as never,
    );

    await expect(
      service.resolveReview(1, 2, 'approve', 99, 'Đã xác nhận'),
    ).resolves.toBeUndefined();
    expect(reviewService.recordHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 1,
        userId: 2,
        resolverId: 99,
        decision: 'approve',
        reasons: ['LOW_CONFIDENCE_SCORE'],
        previousStatus: 'absent',
        resolvedStatus: 'present',
      }),
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('"sessionId":1'),
      expect.any(String),
    );
  });
});
