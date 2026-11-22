import { AuthService } from "../auth/auth.service.ts";
import { CourseService } from "../courses/course.service.ts";
import { createDatabase } from "../database/database.ts";
import { AttendanceIntegration } from "../integration/attendance.integration.ts";
import {
  MockAttendanceGateway,
  RealAttendanceGateway,
} from "../integration/attendance.gateway.ts";
import { StudentService } from "../students/student.service.ts";
import { createLmsRouter } from "./lms-router.ts";
import { MobileAttendanceIntegration } from "../integration/mobile-attendance.integration.ts";
import { AttendanceSummaryService } from "../attendance-summary/attendance-summary.service.ts";
import { AdminDirectoryService } from "../admin/admin-directory.service.ts";
import {
  type AttendanceUser,
  mapLmsUserToAttendance,
} from "../integration/lms-role.mapper.ts";
import { mapLmsUnitToAttendance } from "../integration/lms-unit.mapper.ts";
import { mapLmsCourseToAttendanceTag } from "../integration/lms-course.mapper.ts";
import { mapLmsSessionToAttendance } from "../integration/lms-session.mapper.ts";
import {
  AttendanceApiError,
  AttendanceHttpClient,
} from "../integration/attendance-client.ts";

const expect = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

class RecordingAttendanceGateway extends MockAttendanceGateway {
  syncedRoles: string[] = [];

  override syncUsers(users: AttendanceUser[]) {
    this.syncedRoles = users.map((user) => user.role);
    return super.syncUsers(users);
  }
}

Deno.test("seed provides a useful multi-class LMS dataset", () => {
  const database = createDatabase(":memory:");
  try {
    expect(
      database.repository.listUnits().length === 8,
      "seed must have 8 units",
    );
    expect(
      mapLmsUnitToAttendance(database.repository.listUnits()[0]).externalCode
        .length > 0,
      "unit mapper must expose Attendance externalCode",
    );
    expect(
      database.repository.listUsers().length === 24,
      "seed must have 24 users",
    );
    expect(
      database.repository.findUser("GV001")?.role === "lecturer" &&
        database.repository.findUser("SV001")?.role === "student",
      "LMS seed must use lecturer and student roles",
    );
    expect(
      ["GV001", "SV001"].map((code) =>
        mapLmsUserToAttendance(database.repository.findUser(code)!).role
      ).join(",") === "organizer,participant",
      "role mapper must map syncable LMS roles",
    );
    let adminRejected = false;
    try {
      mapLmsUserToAttendance(database.repository.findUser("ADMIN")!);
    } catch {
      adminRejected = true;
    }
    expect(adminRejected, "LMS admin must not become an Attendance admin");
    expect(
      database.repository.listClasses().length === 12,
      "seed must have 12 classes",
    );
    const firstClass = database.repository.listClasses()[0];
    const mappedTag = mapLmsCourseToAttendanceTag(
      firstClass,
      database.repository.listStudentCodes(firstClass.id),
    );
    expect(
      mappedTag.organizerCode === firstClass.lecturerCode &&
        mappedTag.participantCodes.length > 0 &&
        mappedTag.name.startsWith(`${firstClass.code} · `),
      "course mapping must stay inside the LMS adapter",
    );
    const mappedSession = mapLmsSessionToAttendance(
      {
        id: 1,
        externalId: "LMS-1",
        classId: firstClass.id,
        title: "Điểm danh",
        latitude: 11.95,
        longitude: 108.43,
        radius: 300,
        openAt: "2026-11-11T10:00:00.000Z",
        closeAt: "2026-11-11T10:45:00.000Z",
        buildingId: 3,
        createdAt: "2026-11-11T09:55:00.000Z",
      },
      "GV001",
      ["SV002", "SV001"],
    );
    expect(
      mappedSession.participantCodes.join(",") === "SV001,SV002" &&
        !("classId" in mappedSession) && !("buildingId" in mappedSession),
      "session mapper must normalize roster without leaking LMS ids",
    );
    const testBuilding = database.repository.findBuilding(3);
    expect(
      testBuilding?.code === "GPS-TEST" &&
        testBuilding.latitude === 11.951604996184374 &&
        testBuilding.longitude === 108.43791111196973,
      "seed must expose the supplied GPS test point",
    );
    expect(
      database.repository.listClasses().every((course) =>
        database.repository.listStudentCodes(course.id).length > 0
      ),
      "every seeded class must have a roster",
    );
    expect(
      database.repository.findAccount("sv020") !== null,
      "every seeded student must have a demo account",
    );
  } finally {
    database.close();
  }
});

Deno.test("Attendance gateway sends the neutral contract and retries 5xx", async () => {
  let attempts = 0;
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const client = new AttendanceHttpClient({
    baseUrl: "https://attendance.test/v1/integration",
    apiKey: "test-secret",
    maxAttempts: 2,
    sleep: () => Promise.resolve(),
    random: () => 0,
    fetcher: (input, init) => {
      attempts++;
      capturedUrl = String(input);
      capturedInit = init;
      return Promise.resolve(
        attempts === 1
          ? Response.json(
            { success: false, code: "TEMPORARY", message: "Thử lại" },
            { status: 503 },
          )
          : Response.json({
            success: true,
            data: { created: 1, updated: 0, unchanged: 0, failed: [] },
          }),
      );
    },
  });
  const gateway = new RealAttendanceGateway(client);

  await gateway.syncTags([{
    externalCode: "INT101",
    name: "INT101 · Nhập môn lập trình",
    organizerCode: "GV001",
    participantCodes: ["SV001"],
  }]);

  const headers = new Headers(capturedInit?.headers);
  const body = JSON.parse(String(capturedInit?.body)) as {
    tags: Array<Record<string, unknown>>;
  };
  expect(attempts === 2, "gateway must retry a transient 5xx once");
  expect(
    capturedUrl === "https://attendance.test/v1/integration/tags" &&
      headers.get("x-api-key") === "test-secret",
    "gateway must call the configured Attendance endpoint securely",
  );
  expect(
    body.tags[0].organizerCode === "GV001" &&
      Array.isArray(body.tags[0].participantCodes) &&
      !("lecturerCode" in body.tags[0]) && !("studentCodes" in body.tags[0]),
    "gateway must serialize only the neutral Attendance contract",
  );
});

Deno.test("Attendance client does not retry permanent 4xx errors", async () => {
  let attempts = 0;
  const client = new AttendanceHttpClient({
    baseUrl: "https://attendance.test/v1/integration",
    apiKey: "test-secret",
    maxAttempts: 3,
    sleep: () => Promise.resolve(),
    fetcher: () => {
      attempts++;
      return Promise.resolve(Response.json(
        {
          success: false,
          code: "INTEGRATION_VALIDATION_FAILED",
          message: "Payload không hợp lệ",
        },
        { status: 422 },
      ));
    },
  });

  let captured: unknown;
  try {
    await client.request("/sessions", { method: "POST", body: "{}" });
  } catch (error) {
    captured = error;
  }

  expect(attempts === 1, "client must not retry a permanent 4xx response");
  expect(
    captured instanceof AttendanceApiError &&
      captured.status === 422 && !captured.retryable,
    "client must preserve the structured Attendance error",
  );
});

Deno.test("Attendance client rejects a malformed success envelope", async () => {
  const client = new AttendanceHttpClient({
    baseUrl: "https://attendance.test/v1/integration",
    apiKey: "test-secret",
    maxAttempts: 1,
    fetcher: () => Promise.resolve(Response.json({ success: true })),
  });

  let captured: unknown;
  try {
    await client.request("/units");
  } catch (error) {
    captured = error;
  }
  expect(
    captured instanceof AttendanceApiError &&
      captured.code === "INTEGRATION_INVALID_RESPONSE",
    "client must reject success responses without data",
  );
});

Deno.test("Attendance client reports request timeouts", async () => {
  const client = new AttendanceHttpClient({
    baseUrl: "https://attendance.test/v1/integration",
    apiKey: "test-secret",
    timeoutMs: 1,
    maxAttempts: 1,
    fetcher: (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(init.signal?.reason),
          { once: true },
        );
      }),
  });

  let captured: unknown;
  try {
    await client.request("/units");
  } catch (error) {
    captured = error;
  }
  expect(
    captured instanceof AttendanceApiError &&
      captured.code === "INTEGRATION_TIMEOUT" && captured.retryable,
    "client must distinguish retryable timeouts from other network errors",
  );
});

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
      new MobileAttendanceIntegration(
        "http://attendance.test/v1/integration",
        "test-secret",
      ),
      new AttendanceSummaryService(courses),
      new AdminDirectoryService(database.repository),
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
      "students must use the mobile client instead of LMS web",
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
      detail.status === 200 && classDetail.students.length === 6,
      "class detail must include its student roster",
    );
    const summaryResponse = await authorized(
      "/api/classes/1/attendance-summary",
    );
    const summaryBody = await summaryResponse.json() as {
      success: boolean;
      data: {
        source: string;
        finalizedSessionCount: number;
        students: {
          presentCount: number;
          lateCount: number;
          absentCount: number;
          excusedCount: number;
          attendanceRate: number;
        }[];
      };
    };
    expect(
      summaryResponse.status === 200 &&
        summaryBody.success &&
        summaryBody.data.source === "mock" &&
        summaryBody.data.students.length === 6 &&
        summaryBody.data.students.every((student) =>
          student.presentCount + student.lateCount + student.absentCount +
                student.excusedCount ===
            summaryBody.data.finalizedSessionCount &&
          student.attendanceRate >= 0 && student.attendanceRate <= 100
        ),
      "attendance summary must return stable valid mock metrics",
    );
    const missingSummary = await authorized(
      "/api/classes/999/attendance-summary",
    );
    expect(missingSummary.status === 404, "unknown class summary must be 404");

    const options = await authorized("/api/attendance-options");
    const optionsBody = await options.json() as {
      units: unknown[];
      students: unknown[];
    };
    expect(
      options.status === 200 && optionsBody.units.length === 8 &&
        optionsBody.students.length === 20,
      "lecturer must receive LMS units and students for attendance selection",
    );
    const emptyGeneralSession = await authorized("/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        title: "Empty session",
        buildingId: 1,
        radius: 100,
        openAt: new Date().toISOString(),
        closeAt: new Date(Date.now() + 60_000).toISOString(),
        unitCodes: [],
        studentCodes: [],
      }),
    });
    expect(
      emptyGeneralSession.status === 422,
      "general session must reject an empty participant selection",
    );
    const generalSession = await authorized("/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        title: "Khoa CNTT và sinh viên lẻ",
        buildingId: 1,
        radius: 100,
        openAt: new Date().toISOString(),
        closeAt: new Date(Date.now() + 60_000).toISOString(),
        unitCodes: ["CNTT"],
        studentCodes: ["SV013"],
      }),
    });
    const generalSessionBody = await generalSession.json() as {
      session: { classId: number | null };
      participantCount: number;
    };
    expect(
      generalSession.status === 201 &&
        generalSessionBody.session.classId === null &&
        generalSessionBody.participantCount === 13,
      "general session must expand descendant units and de-duplicate students",
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
      "session creation must sync dependencies automatically",
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
      operations.size === 7 && report.every((call) => call.source === "mock"),
      "mock gateway must cover all seven LMS integration operations",
    );
  } finally {
    database.close();
  }
});

Deno.test("mobile integration forwards only supported Attendance routes", async () => {
  let receivedUrl = "";
  let receivedAuthorization = "";
  let receivedApiKey = "";
  let receivedUserCode = "";
  let receivedBody = "";
  const integration = new MobileAttendanceIntegration(
    "http://attendance.test/v1/integration",
    "integration-secret",
    async (input, init) => {
      receivedUrl = input.toString();
      receivedAuthorization = new Headers(init?.headers).get(
        "authorization",
      ) ?? "";
      receivedApiKey = new Headers(init?.headers).get("x-api-key") ?? "";
      receivedUserCode = new Headers(init?.headers).get("x-user-code") ?? "";
      receivedBody = await new Response(init?.body).text();
      return Response.json({ success: true, data: { status: "VALID" } });
    },
  );
  const response = await integration.proxy(
    new Request("http://lms.test/v0/attendance/check-in", {
      method: "POST",
      headers: {
        authorization: "Bearer participant-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ sessionId: 7 }),
    }),
    "SV001",
  );

  expect(
    receivedUrl ===
      "http://attendance.test/v1/integration/mobile/attendance/check-in",
    "proxy must target Attendance",
  );
  expect(
    receivedAuthorization === "",
    "proxy must not leak the LMS token",
  );
  expect(
    receivedApiKey === "integration-secret" && receivedUserCode === "SV001",
    "proxy must authenticate the LMS and identify the student",
  );
  expect(
    receivedBody === JSON.stringify({ sessionId: 7 }),
    "proxy must preserve the request body",
  );
  expect(response?.status === 200, "proxy must preserve the response status");

  const blocked = await integration.proxy(
    new Request("http://lms.test/v0/users"),
    "SV001",
  );
  expect(blocked === null, "proxy must reject routes outside the allowlist");
});

Deno.test("mobile authenticates with LMS identity and rotates its session", async () => {
  const database = createDatabase(":memory:");
  try {
    const courses = new CourseService(database.repository);
    let upstreamUserCode = "";
    const router = createLmsRouter(
      courses,
      new AttendanceIntegration(
        new StudentService(database.repository),
        courses,
        new MockAttendanceGateway(),
      ),
      new AuthService(database.repository),
      new MobileAttendanceIntegration(
        "http://attendance.test/v1/integration",
        "integration-secret",
        (_input, init) => {
          upstreamUserCode = new Headers(init?.headers).get("x-user-code") ??
            "";
          return Promise.resolve(Response.json({
            success: true,
            data: {
              code: "SV001",
              fullname: "Trần Minh Anh",
              role: "participant",
            },
          }));
        },
      ),
      new AttendanceSummaryService(courses),
      new AdminDirectoryService(database.repository),
    );

    const login = await router(
      new Request("http://lms.test/v0/user/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: "sv001", password: "demo123" }),
      }),
    );
    const loginBody = await login.json() as {
      data: { accessToken: string; refreshToken: string };
    };
    expect(
      login.status === 200,
      "student LMS account must login on mobile",
    );

    const profile = await router(
      new Request("http://lms.test/v0/users/me", {
        headers: { authorization: `Bearer ${loginBody.data.accessToken}` },
      }),
    );
    expect(
      profile.status === 200 && upstreamUserCode === "SV001",
      "mobile request must use the authenticated LMS user code",
    );

    const refreshed = await router(
      new Request(
        "http://lms.test/v0/user/auth/refresh",
        {
          method: "POST",
          body: JSON.stringify({ refreshToken: loginBody.data.refreshToken }),
        },
      ),
    );
    const refreshedBody = await refreshed.json() as {
      data: { accessToken: string };
    };
    const stale = await router(
      new Request("http://lms.test/v0/users/me", {
        headers: { authorization: `Bearer ${loginBody.data.accessToken}` },
      }),
    );
    expect(
      refreshed.status === 200 &&
        refreshedBody.data.accessToken !== loginBody.data.accessToken &&
        stale.status === 401,
      "refresh must rotate and revoke the previous LMS access token",
    );
  } finally {
    database.close();
  }
});

Deno.test("only LMS admin creates directory data and syncs it", async () => {
  const database = createDatabase(":memory:");
  try {
    const courses = new CourseService(database.repository);
    const gateway = new RecordingAttendanceGateway();
    const students = new StudentService(database.repository);
    const router = createLmsRouter(
      courses,
      new AttendanceIntegration(
        students,
        courses,
        gateway,
      ),
      new AuthService(database.repository),
      new MobileAttendanceIntegration(
        "http://attendance.test/v1/integration",
        "test-secret",
      ),
      new AttendanceSummaryService(courses),
      new AdminDirectoryService(database.repository),
    );
    const login = async (username: string) => {
      const response = await router(
        new Request("http://lms.test/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ username, password: "demo123" }),
        }),
      );
      return await response.json() as { token: string };
    };
    const lecturer = await login("gv001");
    const forbidden = await router(
      new Request("http://lms.test/api/admin/units", {
        method: "POST",
        headers: { authorization: `Bearer ${lecturer.token}` },
        body: JSON.stringify({ code: "KTPM", name: "Khoa Phần mềm" }),
      }),
    );
    expect(
      forbidden.status === 403,
      "lecturer must not create directory data",
    );

    const admin = await login("admin");
    expect(
      students.users().every((user) => user.role !== "admin"),
      "LMS admin must not be included in Attendance sync",
    );
    const adminRequest = (path: string, body: unknown) =>
      router(
        new Request(`http://lms.test${path}`, {
          method: "POST",
          headers: { authorization: `Bearer ${admin.token}` },
          body: JSON.stringify(body),
        }),
      );
    const invalidUnit = await adminRequest("/api/admin/units", {
      code: 123,
      name: "Không hợp lệ",
    });
    expect(invalidUnit.status === 400, "admin input must be validated");
    const unitInput = {
      code: "KTPM",
      name: "Khoa Phần mềm",
      parentCode: "DLU",
    };
    const createdUnit = await adminRequest("/api/admin/units", unitInput);
    const retriedUnit = await adminRequest("/api/admin/units", unitInput);
    expect(
      createdUnit.status === 201 && retriedUnit.status === 200,
      "unit creation must be idempotent for sync retries",
    );

    const createdUser = await adminRequest("/api/admin/users", {
      code: "SV100",
      fullname: "Sinh viên mới",
      role: "student",
      unitCode: "KTPM",
      username: "sv100",
      password: "demo1234",
    });
    const createdUserBody = JSON.stringify(await createdUser.json());
    const retriedUser = await adminRequest("/api/admin/users", {
      code: "SV100",
      fullname: "Sinh viên mới",
      role: "student",
      unitCode: "KTPM",
      username: "sv100",
      password: "demo1234",
    });
    expect(
      createdUser.status === 201 && retriedUser.status === 200,
      "user creation must be idempotent for sync retries",
    );
    expect(
      !createdUserBody.includes("password") &&
        !createdUserBody.includes("demo1234"),
      "admin response must not expose credentials",
    );
    expect(
      database.repository.findAccount("sv100")?.passwordHash.startsWith(
        "pbkdf2$",
      ),
      "new account passwords must use PBKDF2",
    );
    const mobileLogin = await router(
      new Request("http://lms.test/v0/user/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: "sv100", password: "demo1234" }),
      }),
    );
    expect(
      mobileLogin.status === 200,
      "created student must login on mobile",
    );
    const invalidClass = await adminRequest("/api/admin/classes", {
      code: "NEW101",
      name: "Lớp thiếu roster",
      lecturerCode: "GV001",
      studentCodes: [],
    });
    expect(invalidClass.status === 400, "class roster must not be empty");
    const classInput = {
      code: "NEW101",
      name: "Lớp học mới",
      lecturerCode: "GV001",
      studentCodes: ["SV100", "SV001"],
    };
    const createdClass = await adminRequest("/api/admin/classes", classInput);
    const retriedClass = await adminRequest("/api/admin/classes", {
      ...classInput,
      studentCodes: ["SV001", "SV100"],
    });
    expect(
      createdClass.status === 201 && retriedClass.status === 200,
      "class creation with the same roster must be idempotent",
    );
    const storedClass = database.repository.findClassByCode("NEW101");
    expect(
      storedClass &&
        database.repository.listStudentCodes(storedClass.id).join(",") ===
          "SV001,SV100",
      "class and its full roster must be stored together",
    );
    expect(
      gateway.report().filter((call) => call.endpoint === "PUT /units")
            .length ===
          6 &&
        gateway.report().filter((call) => call.endpoint === "PUT /users")
            .length === 4 &&
        gateway.report().filter((call) => call.endpoint === "PUT /tags")
            .length === 2,
      "each admin request must sync through the Attendance gateway",
    );
    expect(
      gateway.syncedRoles.includes("organizer") &&
        gateway.syncedRoles.includes("participant") &&
        !gateway.syncedRoles.includes("lecturer") &&
        !gateway.syncedRoles.includes("student"),
      "integration must map LMS roles to Attendance roles",
    );
  } finally {
    database.close();
  }
});
