import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommonErrorCode } from '@gps-attendance/shared';
import { HealthReport, HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({
    summary:
      'Kiểm tra kết nối PostgreSQL và Redis (dùng cho load balancer, Docker)',
  })
  @Get()
  async check(): Promise<HealthReport> {
    const report = await this.healthService.check();

    if (report.status !== 'ok') {
      const down = Object.entries(report.checks)
        .filter(([, status]) => status === 'down')
        .map(([name]) => name);

      throw new ServiceUnavailableException({
        code: CommonErrorCode.SERVICE_UNAVAILABLE,
        message: `Không kết nối được: ${down.join(', ')}`,
      });
    }

    return report;
  }
}
