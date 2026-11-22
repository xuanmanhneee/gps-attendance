import { createDatabase } from "./database/database.ts";
import { CourseService } from "./courses/course.service.ts";
import { AttendanceIntegration } from "./integration/attendance.integration.ts";
import { RealAttendanceGateway } from "./integration/attendance.gateway.ts";
import { createLmsRouter } from "./http/lms-router.ts";
import { StudentService } from "./students/student.service.ts";
import { AuthService } from "./auth/auth.service.ts";
import { MobileAttendanceIntegration } from "./integration/mobile-attendance.integration.ts";
import { AttendanceSummaryService } from "./attendance-summary/attendance-summary.service.ts";
import { AdminDirectoryService } from "./admin/admin-directory.service.ts";

const database = createDatabase(
  Deno.env.get("LMS_DATABASE_PATH") ?? "./lms.sqlite",
);
const courses = new CourseService(database.repository);
const students = new StudentService(database.repository);
const integration = new AttendanceIntegration(
  students,
  courses,
  new RealAttendanceGateway(),
);
const auth = new AuthService(database.repository);
const mobileAttendance = new MobileAttendanceIntegration();
const attendanceSummaries = new AttendanceSummaryService(courses);
const adminDirectory = new AdminDirectoryService(database.repository);

Deno.serve(
  {
    port: Number(Deno.env.get("PORT") ?? 3100),
    onListen: ({ port }) =>
      console.log(`LMS server listening on http://localhost:${port}`),
  },
  createLmsRouter(
    courses,
    integration,
    auth,
    mobileAttendance,
    attendanceSummaries,
    adminDirectory,
  ),
);
