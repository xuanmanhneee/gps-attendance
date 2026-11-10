const MOBILE_ROUTES = new Set([
  "POST /v0/user/auth/login",
  "POST /v0/user/auth/refresh",
  "GET /v0/users/me",
  "GET /v0/attendance-sessions/me",
  "POST /v0/attendance/check-in",
]);

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export async function proxyMobileRequest(
  request: Request,
  attendanceApiUrl = Deno.env.get("ATTENDANCE_API_URL") ??
    "http://localhost:3000",
  fetcher: Fetcher = fetch,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!MOBILE_ROUTES.has(`${request.method} ${url.pathname}`)) return null;

  const headers = new Headers();
  for (const name of ["authorization", "content-type"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const upstream = await fetcher(
    `${attendanceApiUrl.replace(/\/$/, "")}${url.pathname}${url.search}`,
    {
      method: request.method,
      headers,
      body: request.method === "GET" ? undefined : await request.arrayBuffer(),
    },
  );
  const responseHeaders = new Headers({
    "access-control-allow-origin": "*",
  });
  const contentType = upstream.headers.get("content-type");
  if (contentType) responseHeaders.set("content-type", contentType);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
