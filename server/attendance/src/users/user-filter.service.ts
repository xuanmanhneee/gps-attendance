import { Injectable } from '@nestjs/common';
import type { UserFilterCriteria } from '@gps-attendance/shared';
import { UsersService } from './users.service';

@Injectable()
export class UserFilterService {
  constructor(private readonly usersService: UsersService) {}

  async resolveUserIds(criteria?: UserFilterCriteria): Promise<number[]> {
    const allUsers = await this.usersService.findAll();
    const allStudents = allUsers.filter((user) => user.role === 'student');

    const codes = criteria?.codeFilter?.addCodes ?? [];

    // Nếu không nhập mã nào, hoặc có chứa 'ALL', hoặc mảng rỗng -> áp dụng cho TẤT CẢ sinh viên
    if (codes.length === 0 || codes.some((c) => c.toUpperCase() === 'ALL')) {
      return allStudents.map((u) => u.id);
    }

    const normalizedCodes = new Set(
      codes.map((code) => code.trim().toLowerCase()),
    );

    const matchedStudents = allStudents.filter((student) =>
      normalizedCodes.has(student.code.toLowerCase()),
    );

    // Nếu không tìm thấy sinh viên nào khớp (ví dụ nhập sai format), fallback áp dụng cho toàn bộ sinh viên
    if (matchedStudents.length === 0) {
      return allStudents.map((u) => u.id);
    }

    return matchedStudents.map((student) => student.id);
  }
}

