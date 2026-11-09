import { AuthService } from "../auth/auth.service.ts";
import { CourseService } from "../courses/course.service.ts";
import { createDatabase } from "../database/database.ts";
import { AttendanceIntegration } from "../integration/attendance.integration.ts";
import { MockAttendanceGateway } from "../integration/attendance.gateway.ts";
import { StudentService } from "../students/student.service.ts";
import { createLmsRouter } from "./lms-router.ts";

const expect = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

Deno.test("login protects LMS routes and returns seeded data", async () => {
  const database = createDatabase(":memory:");
  try {
    const courses = new CourseService(database.repository);
    const router = createLmsRouter(
      courses,
      new AttendanceIntegration(
        new StudentService(database.repository),
        courses,
        new MockAttendanceGateway(),
      ),
      new AuthService(database.repository),
    );

    const unauthorized = await router(
      new Request("http://lms.test/api/classes"),
    );
    expect(unauthorized.status === 401, "classes must require authentication");

    const rejected = await router(
      new Request("http://lms.test/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: "gv001", password: "wrong" }),
      }),
    );
    expect(rejected.status === 401, "wrong password must be rejected");

    const student = await router(
      new Request("http://lms.test/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: "sv001", password: "demo123" }),
      }),
    );
    expect(
      student.status === 401,
      "participants must use the mobile client instead of LMS web",
    );

    const login = await router(
      new Request("http://lms.test/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: "gv001", password: "demo123" }),
      }),
    );
    const session = await login.json() as {
      token: string;
      user: { code: string };
    };
    expect(
      login.status === 200 && session.user.code === "GV001",
      "seeded lecturer must be able to login",
    );
    const authorized = (path: string, init: RequestInit = {}) =>
      router(
        new Request(`http://lms.test${path}`, {
          ...init,
          headers: {
            authorization: `Bearer ${session.token}`,
            ...init.headers,
          },
        }),
      );

    const classes = await authorized("/api/classes");
    expect(
      classes.status === 200 && (await classes.json() as unknown[]).length > 0,
      "authenticated user must receive classes",
    );
    const detail = await authorized("/api/classes/1");
    const classDetail = await detail.json() as { students: { code: string }[] };
    expect(
      detail.status === 200 && classDetail.students.length === 2,
      "class detail must include its student roster",
    );

    expect(
      (await authorized("/api/integration/sync", { method: "POST" })).status ===
        200,
      "sync must succeed with mock gateway",
    );
    const created = await authorized("/api/classes/1/sessions", {
      method: "POST",
      body: JSON.stringify({
        title: "Contract test",
        buildingId: 1,
        radius: 100,
        openAt: new Date().toISOString(),
        closeAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    });
    const externalId =
      ((await created.json()) as { session: { externalId: string } }).session
        .externalId;
    expect(
      created.status === 201,
      "session creation must follow the LMS contract",
    );
    await authorized(`/api/integration/sessions/${externalId}`);
    await authorized(`/api/integration/sessions/${externalId}/records`);
    await authorized(`/api/integration/sessions/${externalId}/cancel`, {
      method: "POST",
    });

    const report = await (await authorized("/api/integration/report"))
      .json() as { endpoint: string; source: string }[];
    const operations = new Set(report.map((call) => call.endpoint));
    expect(
      operations.size === 8 && report.every((call) => call.source === "mock"),
      "mock gateway must cover all eight OpenAPI operations",
    );
  } finally {
    database.close();
  }
});
