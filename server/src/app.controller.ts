import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { AttendanceStatus } from '@gps-attendance/shared-types';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    console.log('Test import:', AttendanceStatus.VALID);
    return this.appService.getHello();
  }
}
