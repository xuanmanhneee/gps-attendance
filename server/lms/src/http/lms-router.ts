import type { CourseService } from "../courses/course.service.ts";
import type { AttendanceIntegration } from "../integration/attendance.integration.ts";
import type { AuthService } from "../auth/auth.service.ts";
import type { MobileAttendanceIntegration } from "../integration/mobile-attendance.integration.ts";
import {
  AttendanceSummaryErrorCode,
  type AttendanceSummaryService,
} from "../attendance-summary/attendance-summary.service.ts";
import {
  AdminDirectoryError,
  AdminDirectoryErrorCode,
  type AdminDirectoryService,
  type CreateLmsClassRequest,
  type CreateLmsUnitInput,
  type CreateLmsUserInput,
} from "../admin/admin-directory.service.ts";

const LmsSessionErrorCode = {
  FORBIDDEN: "LMS_SESSION_FORBIDDEN",
  INVALID_INPUT: "LMS_SESSION_INVALID_INPUT",
} as const;

interface SessionRequestInput {
  title: string;
  buildingId: number;
  radius: number;
  openAt: string;
  closeAt: string;
}

class LmsSessionRequestError extends Error {}

function parseSessionInput(value: unknown): SessionRequestInput {
  const input = value as Record<string, unknown>;
  const title = typeof input?.title === "string" ? input.title.trim() : "";
  const buildingId = Number(input?.buildingId);
  const radius = Number(input?.radius);
  const openAt = typeof input?.openAt === "string" ? input.openAt : "";
  const closeAt = typeof input?.closeAt === "string" ? input.closeAt : "";
  if (
    !title || title.length > 255 || !Number.isInteger(buildingId) ||
    !Number.isFinite(radius) || radius < 1 || radius > 1000 ||
    !Number.isFinite(Date.parse(openAt)) ||
    !Number.isFinite(Date.parse(closeAt)) ||
    Date.parse(openAt) >= Date.parse(closeAt)
  ) {
    throw new LmsSessionRequestError("Thông tin phiên điểm danh không hợp lệ");
  }
  return { title, buildingId, radius, openAt, closeAt };
}

function parseCodes(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new LmsSessionRequestError(`${field} không hợp lệ`);
  }
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
}

export function createLmsRouter(
  courses: CourseService,
  integration: AttendanceIntegration,
  auth: AuthService,
  mobileAttendance: MobileAttendanceIntegration,
  attendanceSummaries: AttendanceSummaryService,
  adminDirectory: AdminDirectoryService,
) {
  const json = (data: unknown, status = 200) =>
    Response.json(data, {
      status,
      headers: { "access-control-allow-origin": "*" },
    });
  return async function router(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "content-type, authorization",
        },
      });
    }
    const url = new URL(request.url);
    try {
      if (
        request.method === "POST" && url.pathname === "/v0/user/auth/login"
      ) {
        const body = await request.json() as {
          username?: string;
          password?: string;
        };
        const session = await auth.loginStudent(
          body.username ?? "",
          body.password ?? "",
        );
        return session ? json({ success: true, data: session }) : json({
          success: false,
          code: "LMS_INVALID_CREDENTIALS",
          message: "Tên đăng nhập hoặc mật khẩu không đúng",
        }, 401);
      }
      if (
        request.method === "POST" && url.pathname === "/v0/user/auth/refresh"
      ) {
        const body = await request.json() as { refreshToken?: string };
        const session = auth.refreshStudent(body.refreshToken ?? "");
        return session ? json({ success: true, data: session }) : json({
          success: false,
          code: "LMS_INVALID_TOKEN",
          message: "Refresh token không hợp lệ",
        }, 401);
      }
      if (
        request.method === "POST" && url.pathname === "/v0/user/auth/logout"
      ) {
        auth.logoutStudent(request);
        return json({ success: true, data: null });
      }

      const mobileUser = auth.authenticateStudent(request);
      const mobileResponse = await mobileAttendance.proxy(
        request,
        mobileUser?.code ?? null,
      );
      if (mobileResponse) return mobileResponse;

      if (request.method === "POST" && url.pathname === "/api/auth/login") {
        const body = await request.json() as {
          username?: string;
          password?: string;
        };
        const session = await auth.login(
          body.username ?? "",
          body.password ?? "",
        );
        return session
          ? json(session)
          : json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" }, 401);
      }
      const user = auth.authenticate(request);
      if (!user) return json({ message: "Bạn cần đăng nhập" }, 401);
      if (
        request.method === "POST" &&
        ["/api/admin/units", "/api/admin/users", "/api/admin/classes"].includes(
          url.pathname,
        ) &&
        user.role !== "admin"
      ) {
        return json({
          success: false,
          code: AdminDirectoryErrorCode.FORBIDDEN,
          message: "Chỉ admin LMS được phép thực hiện thao tác này",
        }, 403);
      }
      if (request.method === "POST" && url.pathname === "/api/admin/units") {
        const result = adminDirectory.createUnit(
          await request.json() as CreateLmsUnitInput,
        );
        const sync = await integration.syncUnits();
        return json(
          { success: true, data: { unit: result.unit, sync } },
          result.created ? 201 : 200,
        );
      }
      if (request.method === "POST" && url.pathname === "/api/admin/users") {
        const result = await adminDirectory.createUser(
          await request.json() as CreateLmsUserInput,
        );
        const sync = {
          units: await integration.syncUnits(),
          user: await integration.syncUser(result.user),
        };
        return json(
          { success: true, data: { user: result.user, sync } },
          result.created ? 201 : 200,
        );
      }
      if (request.method === "POST" && url.pathname === "/api/admin/classes") {
        const result = adminDirectory.createClass(
          await request.json() as CreateLmsClassRequest,
        );
        const sync = await integration.syncClass(result.class);
        return json(
          { success: true, data: { class: result.class, sync } },
          result.created ? 201 : 200,
        );
      }
      if (request.method === "GET" && url.pathname === "/api/auth/me") {
        return json(user);
      }
      if (request.method === "POST" && url.pathname === "/api/auth/logout") {
        auth.logout(request);
        return json({ loggedOut: true });
      }
      if (request.method === "GET" && url.pathname === "/api/classes") {
        return json(courses.list());
      }
      if (request.method === "GET" && url.pathname === "/api/buildings") {
        return json(courses.buildings());
      }
      if (
        request.method === "GET" &&
        url.pathname === "/api/attendance-options"
      ) {
        if (user.role !== "lecturer") {
          return json({
            success: false,
            code: LmsSessionErrorCode.FORBIDDEN,
            message: "Chỉ giảng viên được tạo phiên điểm danh",
          }, 403);
        }
        return json(integration.attendanceOptions());
      }
      if (request.method === "POST" && url.pathname === "/api/sessions") {
        if (user.role !== "lecturer") {
          return json({
            success: false,
            code: LmsSessionErrorCode.FORBIDDEN,
            message: "Chỉ giảng viên được tạo phiên điểm danh",
          }, 403);
        }
        const body = await request.json() as Record<string, unknown>;
        const input = parseSessionInput(body);
        const unitCodes = parseCodes(body.unitCodes, "Danh sách unit");
        const studentCodes = parseCodes(
          body.studentCodes,
          "Danh sách sinh viên",
        );
        let participants: string[];
        try {
          participants = integration.resolveParticipantCodes(
            unitCodes,
            studentCodes,
          );
        } catch (error) {
          throw new LmsSessionRequestError(
            error instanceof Error
              ? error.message
              : "Người tham gia không hợp lệ",
          );
        }
        if (participants.length === 0) {
          throw new LmsSessionRequestError("Cần chọn ít nhất một sinh viên");
        }
        const building = courses.building(input.buildingId);
        if (!building) {
          throw new LmsSessionRequestError("Không tìm thấy tòa nhà");
        }
        const session = courses.createSession({
          ...input,
          classId: null,
          latitude: building.latitude,
          longitude: building.longitude,
        });
        const result = await integration.createGeneralAttendanceSession(
          session,
          user.code,
          participants,
        );
        return json({ session, ...result }, 201);
      }
      if (
        request.method === "POST" && url.pathname === "/api/integration/sync"
      ) return json(await integration.sync());
      if (
        request.method === "GET" && url.pathname === "/api/integration/report"
      ) return json(integration.report());
      const attendanceSummaryPath = url.pathname.match(
        /^\/api\/classes\/(\d+)\/attendance-summary$/,
      );
      if (request.method === "GET" && attendanceSummaryPath) {
        const summary = attendanceSummaries.getByClassId(
          Number(attendanceSummaryPath[1]),
        );
        return summary ? json({ success: true, data: summary }) : json({
          success: false,
          code: AttendanceSummaryErrorCode.NOT_FOUND,
          message: "Không tìm thấy lớp học",
        }, 404);
      }
      const classDetailPath = url.pathname.match(/^\/api\/classes\/(\d+)$/);
      if (request.method === "GET" && classDetailPath) {
        const course = courses.find(Number(classDetailPath[1]));
        return course
          ? json({ course, students: courses.studentDetails(course.id) })
          : json({ message: "Không tìm thấy lớp học" }, 404);
      }
      const classPath = url.pathname.match(/^\/api\/classes\/(\d+)\/sessions$/);
      if (request.method === "POST" && classPath) {
        const classId = Number(classPath[1]);
        if (!courses.find(classId)) {
          return json({ message: "Không tìm thấy lớp học" }, 404);
        }
        const input = parseSessionInput(await request.json());
        const building = courses.building(input.buildingId);
        if (!building) return json({ message: "Không tìm thấy tòa nhà" }, 404);
        const session = courses.createSession({
          ...input,
          classId,
          latitude: building.latitude,
          longitude: building.longitude,
        });
        return json({
          session,
          attendance: await integration.createAttendanceSession(session),
        }, 201);
      }
      const resultPath = url.pathname.match(
        /^\/api\/integration\/sessions\/([^/]+)(\/records)?$/,
      );
      if (request.method === "GET" && resultPath) {
        return json(
          await (resultPath[2]
            ? integration.getRecords(resultPath[1])
            : integration.getSession(resultPath[1])),
        );
      }
      const cancelPath = url.pathname.match(
        /^\/api\/integration\/sessions\/([^/]+)\/cancel$/,
      );
      if (request.method === "POST" && cancelPath) {
        return json(await integration.cancelSession(cancelPath[1]));
      }
      return json({ message: "Not found" }, 404);
    } catch (error) {
      if (error instanceof LmsSessionRequestError) {
        return json({
          success: false,
          code: LmsSessionErrorCode.INVALID_INPUT,
          message: error.message,
        }, 422);
      }
      if (error instanceof AdminDirectoryError) {
        return json({
          success: false,
          code: error.code,
          message: error.message,
        }, error.status);
      }
      if (error instanceof SyntaxError) {
        return json({
          success: false,
          code: AdminDirectoryErrorCode.INVALID_INPUT,
          message: "JSON không hợp lệ",
        }, 400);
      }
      if (url.pathname.startsWith("/api/admin/")) {
        return json({
          success: false,
          code: AdminDirectoryErrorCode.SYNC_FAILED,
          message: error instanceof Error
            ? error.message
            : "Không thể đồng bộ sang Attendance",
        }, 502);
      }
      return json({
        message: error instanceof Error ? error.message : "Unexpected error",
      }, 502);
    }
  };
}
