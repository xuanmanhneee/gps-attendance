import type { CourseService } from "../courses/course.service.ts";
import type { StudentService } from "../students/student.service.ts";
import type {
  LmsClass,
  LmsSession,
  LmsUser,
} from "../database/lms.repository.ts";
import type {
  AttendanceGateway,
  AttendanceRecordsView,
  AttendanceSessionView,
  AttendanceSyncResult,
  IntegrationCallReport,
} from "./attendance.gateway.ts";
import { mapLmsUserToAttendance } from "./lms-role.mapper.ts";
import { mapLmsUnitToAttendance } from "./lms-unit.mapper.ts";
import { mapLmsCourseToAttendanceTag } from "./lms-course.mapper.ts";
import { mapLmsSessionToAttendance } from "./lms-session.mapper.ts";

interface AttendanceDirectorySync {
  units: AttendanceSyncResult;
  users: AttendanceSyncResult;
  tags: AttendanceSyncResult;
}

export class AttendanceIntegration {
  constructor(
    private readonly students: StudentService,
    private readonly courses: CourseService,
    private readonly attendance: AttendanceGateway,
  ) {}
  async sync(): Promise<
    AttendanceDirectorySync & { report: IntegrationCallReport[] }
  > {
    const units = this.ensureSynced(
      await this.attendance.syncUnits(
        this.students.units().map(mapLmsUnitToAttendance),
      ),
    );
    const users = this.ensureSynced(
      await this.attendance.syncUsers(
        this.students.users().map(mapLmsUserToAttendance),
      ),
    );
    const tags = this.ensureSynced(
      await this.attendance.syncTags(
        this.courses.list().map((course) =>
          mapLmsCourseToAttendanceTag(
            course,
            this.courses.students(course.id),
          )
        ),
      ),
    );
    return { units, users, tags, report: this.report() };
  }
  async syncUnits(): Promise<AttendanceSyncResult> {
    return this.ensureSynced(
      await this.attendance.syncUnits(
        this.students.units().map(mapLmsUnitToAttendance),
      ),
    );
  }
  async syncUser(user: LmsUser): Promise<AttendanceSyncResult> {
    if (user.role === "admin") {
      throw new Error("Admin LMS không thuộc contract Attendance");
    }
    return this.ensureSynced(
      await this.attendance.syncUsers([mapLmsUserToAttendance(user)]),
    );
  }
  async syncClass(course: LmsClass): Promise<AttendanceDirectorySync> {
    const units = await this.syncUnits();
    const users = this.ensureSynced(
      await this.attendance.syncUsers(
        this.students.users().map(mapLmsUserToAttendance),
      ),
    );
    const tags = this.ensureSynced(
      await this.attendance.syncTags([
        mapLmsCourseToAttendanceTag(
          course,
          this.courses.students(course.id),
        ),
      ]),
    );
    return { units, users, tags };
  }
  async createAttendanceSession(
    session: LmsSession,
  ): Promise<AttendanceSessionView> {
    if (session.classId === null) {
      throw new Error("Phiên không gắn với lớp học");
    }
    const course = this.courses.find(session.classId);
    if (!course) throw new Error("Không tìm thấy lớp học");
    await this.syncClass(course);
    return await this.attendance.createSession(
      mapLmsSessionToAttendance(
        session,
        course.lecturerCode,
        this.courses.students(course.id),
      ),
    );
  }
  attendanceOptions() {
    return {
      units: this.students.units(),
      students: this.students.participants(),
    };
  }
  resolveParticipantCodes(unitCodes: string[], studentCodes: string[]) {
    return this.students.resolveParticipantCodes(unitCodes, studentCodes);
  }
  async createGeneralAttendanceSession(
    session: LmsSession,
    lecturerCode: string,
    participants: string[],
  ): Promise<{
    attendance: AttendanceSessionView;
    participantCount: number;
  }> {
    await this.syncUnits();
    const users = this.students.users().filter((candidate) =>
      candidate.code === lecturerCode || participants.includes(candidate.code)
    );
    this.ensureSynced(
      await this.attendance.syncUsers(users.map(mapLmsUserToAttendance)),
    );
    return {
      attendance: await this.attendance.createSession(
        mapLmsSessionToAttendance(session, lecturerCode, participants),
      ),
      participantCount: participants.length,
    };
  }
  getSession(externalId: string): Promise<AttendanceSessionView> {
    return this.attendance.getSession(externalId);
  }
  getRecords(externalId: string): Promise<AttendanceRecordsView> {
    return this.attendance.getRecords(externalId);
  }
  cancelSession(externalId: string): Promise<AttendanceSessionView> {
    return this.attendance.cancelSession(externalId);
  }
  report(): IntegrationCallReport[] {
    return this.attendance.report();
  }

  private ensureSynced(result: AttendanceSyncResult): AttendanceSyncResult {
    if (result.failed.length > 0) {
      throw new Error(
        result.failed[0].message || "Attendance từ chối đồng bộ",
      );
    }
    return result;
  }
}
