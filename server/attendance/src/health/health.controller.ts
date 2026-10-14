import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthCheckResult, HealthService } from './health.service';
import { MonitoringService } from './monitoring.service';

@ApiTags('health')
@Controller(['health', 'v0/health'])
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly monitoringService: MonitoringService,
  ) {}

  @ApiOperation({
    summary: 'Kiểm tra trạng thái hệ thống: Database, Migrations, RAM, CPU',
  })
  @ApiResponse({
    status: 200,
    description: 'Hệ thống hoạt động bình thường',
  })
  @ApiResponse({
    status: 503,
    description: 'Hệ thống đang gặp sự cố (ví dụ mất kết nối Database)',
  })
  @Get()
  async getHealth(@Res() res: Response): Promise<Response<HealthCheckResult>> {
    const result = await this.healthService.check();
    const httpStatus =
      result.status === 'error'
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.OK;

    return res.status(httpStatus).json(result);
  }

  @ApiOperation({ summary: 'Trả về metrics Prometheus để scrape cho Grafana' })
  @Get('metrics')
  async getMetrics(@Res() res: Response): Promise<Response<string>> {
    const metrics = await this.monitoringService.getMetricsText();
    return res.type('text/plain; version=0.7.0; charset=utf-8').send(metrics);
  }

  @ApiOperation({ summary: 'Trả về cảnh báo realtime cho tỉ lệ check-in fail cao' })
  @Get('alerts')
  async getAlerts() {
    return this.monitoringService.getAlerts();
  }
}
