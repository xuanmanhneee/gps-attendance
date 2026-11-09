import type { CourseService } from "../courses/course.service.ts";
import type { StudentService } from "../students/student.service.ts";
import type { LmsSession } from "../database/lms.repository.ts";
import type { AttendanceGateway } from "./attendance.gateway.ts";

export class AttendanceIntegration {
  constructor(
    private readonly students: StudentService,
    private readonly courses: CourseService,
    private readonly attendance: AttendanceGateway,
  ) {}
  async sync(): Promise<unknown> {
    const units = await this.attendance.syncUnits(this.students.units());
    const users = await this.attendance.syncUsers(this.students.users());
    const courses = await this.attendance.syncCourses(
      this.courses.list().map((course) => ({
        externalCode: course.code,
        name: course.name,
        lecturerCode: course.lecturerCode,
        studentCodes: this.courses.students(course.id),
      })),
    );
    const accounts = await this.attendance.syncAccounts(this.students.users());
    return { units, users, courses, accounts, report: this.report() };
  }
  createAttendanceSession(session: LmsSession): Promise<unknown> {
    const course = this.courses.find(session.classId);
    if (!course) throw new Error("Không tìm thấy lớp học");
    return this.attendance.createSession(
      session,
      course,
      this.courses.students(course.id),
    );
  }
  getSession(externalId: string): Promise<unknown> {
    return this.attendance.getSession(externalId);
  }
  getRecords(externalId: string): Promise<unknown> {
    return this.attendance.getRecords(externalId);
  }
  cancelSession(externalId: string): Promise<unknown> {
    return this.attendance.cancelSession(externalId);
  }
  report() {
    return this.attendance.report();
  }
}
