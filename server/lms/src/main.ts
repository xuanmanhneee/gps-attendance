import { createDatabase } from "./database/database.ts";
import { CourseService } from "./courses/course.service.ts";
import { AttendanceIntegration } from "./integration/attendance.integration.ts";
import { MockAttendanceGateway } from "./integration/attendance.gateway.ts";
import { createLmsRouter } from "./http/lms-router.ts";
import { StudentService } from "./students/student.service.ts";
import { AuthService } from "./auth/auth.service.ts";

const database = createDatabase(
  Deno.env.get("LMS_DATABASE_PATH") ?? "./lms.sqlite",
);
const courses = new CourseService(database.repository);
const students = new StudentService(database.repository);
const integration = new AttendanceIntegration(
  students,
  courses,
  new MockAttendanceGateway(),
);
const auth = new AuthService(database.repository);

Deno.serve(
  {
    port: Number(Deno.env.get("PORT") ?? 3100),
    onListen: ({ port }) =>
      console.log(`LMS server listening on http://localhost:${port}`),
  },
  createLmsRouter(courses, integration, auth),
);
