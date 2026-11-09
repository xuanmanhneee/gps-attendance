import type { CourseService } from "../courses/course.service.ts";
import type { AttendanceIntegration } from "../integration/attendance.integration.ts";
import type { CreateLmsSessionInput } from "../database/lms.repository.ts";
import type { AuthService } from "../auth/auth.service.ts";
export function createLmsRouter(
  courses: CourseService,
  integration: AttendanceIntegration,
  auth: AuthService,
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
        request.method === "POST" && url.pathname === "/api/integration/sync"
      ) return json(await integration.sync());
      if (
        request.method === "GET" && url.pathname === "/api/integration/report"
      ) return json(integration.report());
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
        const input = await request.json() as Omit<
          CreateLmsSessionInput,
          "classId" | "latitude" | "longitude"
        >;
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
      return json({
        message: error instanceof Error ? error.message : "Unexpected error",
      }, 502);
    }
  };
}
