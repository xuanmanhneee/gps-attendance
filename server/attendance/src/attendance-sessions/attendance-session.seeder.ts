import { Injectable, OnModuleInit } from '@nestjs/common';

import { AttendanceSessionsService } from './attendance-sessions.service';

@Injectable()
export class AttendanceSessionSeeder implements OnModuleInit {
  constructor(
    private readonly attendanceSessionsService: AttendanceSessionsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.attendanceSessionsService.create(
      {
        title: 'Test Attendance Session',
        latitude: 11.9404,
        longitude: 108.4583,
        radius: 100,
        openAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        closeAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),

        participantCriteria: {
          codeFilter: {
            include: ['2312686', '2312716', '2312718'],
          },
        },
      },
      1,
    );
  }
}