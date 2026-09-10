import { Injectable, OnModuleInit } from '@nestjs/common';

import { AttendanceSessionsService } from './attendance-sessions.service';
import type { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';

@Injectable()
export class AttendanceSessionSeeder implements OnModuleInit {
  constructor(
    private readonly attendanceSessionsService: AttendanceSessionsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;

    const sessions: CreateAttendanceSessionDto[] = [
      // 1. Quá khứ: 7 ngày trước (Đã đóng)
      {
        title: 'Tuần trước - Cơ sở dữ liệu (7 ngày trước)',
        latitude: 11.9404,
        longitude: 108.4583,
        radius: 80,
        openAt: new Date(now - 7 * day).toISOString(),
        closeAt: new Date(now - 7 * day + 2 * hour).toISOString(),
        participantCriteria: {
          codeFilter: {
            addCodes: ['2312686', '2312716', '2312718', '2312682', '2312631'],
          },
        },
      },
      // 2. Quá khứ: 3 ngày trước (Đã đóng)
      {
        title: 'Thực hành Lập trình mạng (3 ngày trước)',
        latitude: 11.9416,
        longitude: 108.4585,
        radius: 50,
        openAt: new Date(now - 3 * day).toISOString(),
        closeAt: new Date(now - 3 * day + 2 * hour).toISOString(),
        participantCriteria: {
          codeFilter: {
            addCodes: ['2312686', '2312716'],
          },
        },
      },
      // 3. Quá khứ: Hôm qua (Đã đóng)
      {
        title: 'Kiểm tra giữa kỳ - Hệ điều hành (Hôm qua)',
        latitude: 11.9404,
        longitude: 108.4583,
        radius: 100,
        openAt: new Date(now - 1 * day - 2 * hour).toISOString(),
        closeAt: new Date(now - 1 * day).toISOString(),
        participantCriteria: {
          codeFilter: {
            addCodes: ['2312686', '2312716', '2312718'],
          },
        },
      },
      // 4. Hôm nay: Đang diễn ra (Đà Lạt)
      {
        title: 'Đang mở - Điểm danh lớp Đồ án (Đà Lạt)',
        latitude: 11.9404,
        longitude: 108.4583,
        radius: 100,
        openAt: new Date(now - hour).toISOString(),
        closeAt: new Date(now + hour).toISOString(),
        participantCriteria: {
          codeFilter: {
            addCodes: ['2312686', '2312716', '2312718', '2312682'],
          },
        },
      },
      // 5. Hôm nay: Đang diễn ra (TP.HCM, bán kính lớn)
      {
        title: 'Đang mở - Hội thảo Công nghệ TP.HCM (Bán kính 500m)',
        latitude: 10.7769,
        longitude: 106.7009,
        radius: 500,
        openAt: new Date(now - 30 * 60 * 1000).toISOString(),
        closeAt: new Date(now + 3 * hour).toISOString(),
        participantCriteria: {
          codeFilter: {
            addCodes: ['2312686', '2312631'],
          },
        },
      },
      // 6. Hôm nay: Sắp diễn ra sau 2 giờ
      {
        title: 'Sắp mở - Sinh hoạt cố vấn học tập (Sau 2 giờ)',
        latitude: 11.942,
        longitude: 108.459,
        radius: 120,
        openAt: new Date(now + 2 * hour).toISOString(),
        closeAt: new Date(now + 4 * hour).toISOString(),
        participantCriteria: {
          codeFilter: {
            addCodes: ['2312686', '2312718', '2312682'],
          },
        },
      },
      // 7. Tương lai: Ngày mai
      {
        title: 'Ngày mai - Chuyên đề Lập trình di động',
        latitude: 11.9416,
        longitude: 108.4585,
        radius: 60,
        openAt: new Date(now + 1 * day).toISOString(),
        closeAt: new Date(now + 1 * day + 2 * hour).toISOString(),
        participantCriteria: {
          codeFilter: {
            addCodes: ['2312686', '2312716', '2312718'],
          },
        },
      },
      // 8. Tương lai: 3 ngày tới
      {
        title: '3 ngày tới - Báo cáo tiến độ đồ án',
        latitude: 11.9404,
        longitude: 108.4583,
        radius: 100,
        openAt: new Date(now + 3 * day).toISOString(),
        closeAt: new Date(now + 3 * day + 3 * hour).toISOString(),
        participantCriteria: {
          codeFilter: {
            addCodes: ['2312686', '2312682'],
          },
        },
      },
      // 9. Tương lai: Tuần sau (7 ngày tới)
      {
        title: 'Tuần sau - Kỳ thi kết thúc học phần (7 ngày tới)',
        latitude: 11.9404,
        longitude: 108.4583,
        radius: 150,
        openAt: new Date(now + 7 * day).toISOString(),
        closeAt: new Date(now + 7 * day + 2 * hour).toISOString(),
        participantCriteria: {
          codeFilter: {
            addCodes: ['2312686', '2312716', '2312718', '2312682', '2312631'],
          },
        },
      },
    ];

    for (const session of sessions) {
      await this.attendanceSessionsService.create(session, 1);
    }
  }
}
