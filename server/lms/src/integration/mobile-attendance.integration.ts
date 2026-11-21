const MOBILE_ROUTES = new Map([
  ["GET /v0/users/me", "/mobile/users/me"],
  ["GET /v0/attendance-sessions/me", "/mobile/attendance-sessions/me"],
  ["POST /v0/attendance/check-in", "/mobile/attendance/check-in"],
]);

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export class MobileAttendanceIntegration {
  constructor(
    private readonly attendanceIntegrationUrl = Deno.env.get(
      "ATTENDANCE_INTEGRATION_URL",
    ) ?? "http://localhost:3000/v1/integration",
    private readonly apiKey = Deno.env.get("INTEGRATION_API_KEY") ?? "",
    private readonly fetcher: Fetcher = fetch,
    private readonly timeoutMs = 5_000,
  ) {
    const url = new URL(this.attendanceIntegrationUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Attendance URL phải dùng HTTP hoặc HTTPS");
    }
    if (!this.apiKey.trim() || this.timeoutMs <= 0) {
      throw new Error("Cấu hình mobile Attendance integration không hợp lệ");
    }
  }

  async proxy(
    request: Request,
    userCode: string | null,
  ): Promise<Response | null> {
    const url = new URL(request.url);
    const path = MOBILE_ROUTES.get(`${request.method} ${url.pathname}`);
    if (!path) return null;
    if (!userCode) {
      return Response.json(
        {
          success: false,
          code: "LMS_INVALID_TOKEN",
          message: "Phiên đăng nhập LMS không hợp lệ",
        },
        { status: 401, headers: { "access-control-allow-origin": "*" } },
      );
    }

    const headers = new Headers({
      "x-api-key": this.apiKey,
      "x-user-code": userCode,
    });
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);

    const upstream = await this.fetcher(
      `${this.attendanceIntegrationUrl.replace(/\/$/, "")}${path}${url.search}`,
      {
        method: request.method,
        headers,
        signal: AbortSignal.timeout(this.timeoutMs),
        body: request.method === "GET"
          ? undefined
          : await request.arrayBuffer(),
      },
    );
    const responseHeaders = new Headers({
      "access-control-allow-origin": "*",
    });
    const upstreamContentType = upstream.headers.get("content-type");
    if (upstreamContentType) {
      responseHeaders.set("content-type", upstreamContentType);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  }
}
