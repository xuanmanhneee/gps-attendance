type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type AttendanceEnvelope<T> =
  | { success: true; data: T }
  | { success: false; code: string; message: string };

export class AttendanceApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "AttendanceApiError";
  }
}

export interface AttendanceHttpClientOptions {
  baseUrl: string;
  apiKey: string;
  fetcher?: Fetcher;
  timeoutMs?: number;
  maxAttempts?: number;
  sleep?: (delayMs: number) => Promise<void>;
  random?: () => number;
}

export class AttendanceHttpClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetcher: Fetcher;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly sleep: (delayMs: number) => Promise<void>;
  private readonly random: () => number;

  constructor(options: AttendanceHttpClientOptions) {
    const url = new URL(options.baseUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Attendance URL phải dùng HTTP hoặc HTTPS");
    }
    if (!options.apiKey.trim()) {
      throw new Error("INTEGRATION_API_KEY chưa được cấu hình");
    }

    this.baseUrl = url.toString().replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.fetcher = options.fetcher ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 5_000;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.sleep = options.sleep ??
      ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));
    this.random = options.random ?? Math.random;

    if (this.timeoutMs <= 0 || this.maxAttempts < 1) {
      throw new Error("Cấu hình timeout/retry của Attendance không hợp lệ");
    }
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!path.startsWith("/")) {
      throw new Error("Attendance path phải bắt đầu bằng /");
    }

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await this.send<T>(path, options);
      } catch (error) {
        const normalized = this.normalizeError(error);
        if (!normalized.retryable || attempt === this.maxAttempts) {
          throw normalized;
        }
        await this.sleep(this.retryDelay(attempt));
      }
    }
    throw new Error("Attendance request kết thúc ngoài dự kiến");
  }

  private async send<T>(path: string, options: RequestInit): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set("content-type", "application/json");
    headers.set("x-api-key", this.apiKey);
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...options,
      signal: AbortSignal.timeout(this.timeoutMs),
      headers,
    });

    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      throw this.invalidResponse(response.status);
    }
    if (
      typeof parsed !== "object" || parsed === null ||
      !("success" in parsed) || typeof parsed.success !== "boolean" ||
      (parsed.success === true && !("data" in parsed))
    ) {
      throw this.invalidResponse(response.status);
    }
    const body = parsed as AttendanceEnvelope<T>;

    if (!response.ok || body.success !== true) {
      const error = body.success === false ? body : null;
      throw new AttendanceApiError(
        error?.message ?? `Attendance API returned ${response.status}`,
        response.status,
        error?.code ?? "INTEGRATION_REQUEST_FAILED",
        response.status === 429 || response.status >= 500,
      );
    }
    return body.data;
  }

  private normalizeError(error: unknown): AttendanceApiError {
    if (error instanceof AttendanceApiError) return error;
    const timeout = error instanceof DOMException &&
      ["AbortError", "TimeoutError"].includes(error.name);
    return new AttendanceApiError(
      timeout ? "Attendance request timeout" : "Không thể kết nối Attendance",
      null,
      timeout ? "INTEGRATION_TIMEOUT" : "INTEGRATION_NETWORK_ERROR",
      true,
    );
  }

  private invalidResponse(status: number): AttendanceApiError {
    return new AttendanceApiError(
      `Attendance trả response sai contract (${status})`,
      status,
      "INTEGRATION_INVALID_RESPONSE",
      status >= 500,
    );
  }

  private retryDelay(attempt: number): number {
    const exponential = 100 * 2 ** (attempt - 1);
    return exponential + Math.floor(this.random() * exponential * 0.25);
  }
}

export function createAttendanceHttpClientFromEnv(): AttendanceHttpClient {
  return new AttendanceHttpClient({
    baseUrl: Deno.env.get("ATTENDANCE_INTEGRATION_URL") ??
      "http://localhost:3000/v1/integration",
    apiKey: Deno.env.get("INTEGRATION_API_KEY") ?? "",
  });
}
