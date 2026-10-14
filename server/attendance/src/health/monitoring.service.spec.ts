import { MonitoringService } from './monitoring.service';

describe('MonitoringService', () => {
  it('should trigger alert when check-in rejection ratio is too high', () => {
    const service = new MonitoringService();

    service.recordCheckInOutcome('REJECTED');
    service.recordCheckInOutcome('VALID');
    service.recordCheckInOutcome('REJECTED');
    service.recordCheckInOutcome('REJECTED');

    const summary = service.getAlertSummary();

    expect(summary.ratio).toBeCloseTo(0.75, 2);
    expect(summary.triggered).toBe(true);
    expect(summary.threshold).toBe(0.35);
  });
});
