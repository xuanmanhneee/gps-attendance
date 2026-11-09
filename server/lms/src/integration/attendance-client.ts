const attendanceUrl = Deno.env.get("ATTENDANCE_INTEGRATION_URL") ??
  "http://localhost:3000/v1/integration";
const apiKey = Deno.env.get("INTEGRATION_API_KEY") ?? "";

export async function attendanceRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${attendanceUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      ...options.headers,
    },
  });
  const body = await response.json() as {
    success: boolean;
    data?: T;
    code?: string;
    message?: string;
  };
  if (!response.ok || !body.success) {
    throw new Error(
      body.message ?? `Attendance API returned ${response.status}`,
    );
  }
  return body.data as T;
}
