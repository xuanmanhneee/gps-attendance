import { AuditLogService } from '../../src/audit-log/audit-log.service';

describe('AuditLogService', () => {
  it('cắt reason về tối đa 500 ký tự trước khi append', async () => {
    const repository = {
      create: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue([]),
    };
    const service = new AuditLogService(repository);

    await service.record({
      entityType: 'AttendanceRecord',
      entityId: '1:2',
      action: 'REVIEW_RESOLVED',
      reason: 'x'.repeat(700),
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'x'.repeat(500) }),
    );
  });
});
