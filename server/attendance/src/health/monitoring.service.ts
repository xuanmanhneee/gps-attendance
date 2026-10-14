import { Injectable } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Registry,
} from 'prom-client';

export type CheckInStatus = 'VALID' | 'REVIEW' | 'REJECTED';

@Injectable()
export class MonitoringService {
  private readonly registry = new Registry();
  private readonly checkInOutcomes = new Counter({
    name: 'attendance_checkin_outcomes_total',
    help: 'Total attendance check-in outcomes by status',
    labelNames: ['status'],
    registers: [this.registry],
  });
  private readonly failureRatioGauge = new Gauge({
    name: 'attendance_checkin_failure_ratio',
    help: 'Failure ratio for attendance check-in attempts',
    registers: [this.registry],
  });
  private readonly outcomeCounts: Record<CheckInStatus, number> = {
    VALID: 0,
    REVIEW: 0,
    REJECTED: 0,
  };

  constructor() {
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'gps_attendance_',
    });
  }

  recordCheckInOutcome(status: CheckInStatus): number {
    this.checkInOutcomes.inc({ status });
    this.outcomeCounts[status] += 1;

    const total = Object.values(this.outcomeCounts).reduce((sum, value) => sum + value, 0);
    const ratio = total === 0 ? 0 : this.outcomeCounts.REJECTED / total;
    this.failureRatioGauge.set(ratio);

    return ratio;
  }

  getAlertSummary() {
    const total = Object.values(this.outcomeCounts).reduce((sum, value) => sum + value, 0);
    const rejected = this.outcomeCounts.REJECTED;
    const ratio = total === 0 ? 0 : rejected / total;
    const threshold = 0.35;

    return {
      status: ratio >= threshold ? 'alert' : 'ok',
      ratio,
      threshold,
      triggered: ratio >= threshold,
      total,
      rejected,
    };
  }

  async getMetricsText(): Promise<string> {
    return this.registry.metrics();
  }

  getAlerts() {
    return this.getAlertSummary();
  }
}
