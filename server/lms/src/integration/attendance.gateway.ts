import {
  AttendanceApiError,
  AttendanceHttpClient,
  createAttendanceHttpClientFromEnv,
} from "./attendance-client.ts";
import type { AttendanceUser } from "./lms-role.mapper.ts";
import type { AttendanceUnit } from "./lms-unit.mapper.ts";
import type { AttendanceTag } from "./lms-course.mapper.ts";
import type { AttendanceSessionInput } from "./lms-session.mapper.ts";

export interface IntegrationCallReport {
  endpoint: string;
  source: "attendance" | "mock";
  ok: boolean;
  message?: string;
  at: string;
}

export interface AttendanceSyncResult {
  created: number;
  updated: number;
  unchanged: number;
  failed: Array<{ key: string; code: string; message: string }>;
}

export interface AttendanceSessionView {
  externalId: string;
  title?: string;
  status: "pending" | "open" | "closed" | "cancelled";
  openAt?: string;
  closeAt?: string;
  participantCount: number;
  finalized: boolean;
}

export interface AttendanceRecordsView {
  externalId: string;
  finalized: boolean;
  records: Array<{
    code: string;
    fullname: string;
    status: "absent" | "present" | "late" | "excused";
    checkedInAt: string | null;
  }>;
}

export interface AttendanceGateway {
  syncUnits(units: AttendanceUnit[]): Promise<AttendanceSyncResult>;
  syncUsers(users: AttendanceUser[]): Promise<AttendanceSyncResult>;
  syncTags(tags: AttendanceTag[]): Promise<AttendanceSyncResult>;
  createSession(input: AttendanceSessionInput): Promise<AttendanceSessionView>;
  getSession(externalId: string): Promise<AttendanceSessionView>;
  getRecords(externalId: string): Promise<AttendanceRecordsView>;
  cancelSession(externalId: string): Promise<AttendanceSessionView>;
  report(): IntegrationCallReport[];
}

export class RealAttendanceGateway implements AttendanceGateway {
  private readonly calls: IntegrationCallReport[] = [];

  constructor(
    private readonly client: AttendanceHttpClient =
      createAttendanceHttpClientFromEnv(),
  ) {}

  private async call<T>(
    endpoint: string,
    path: string,
    options?: RequestInit,
  ): Promise<T> {
    const at = new Date().toISOString();
    try {
      const value = await this.client.request<T>(path, options);
      this.record({ endpoint, source: "attendance", ok: true, at });
      return value;
    } catch (error) {
      this.record({
        endpoint,
        source: "attendance",
        ok: false,
        at,
        message: error instanceof AttendanceApiError
          ? error.code
          : "INTEGRATION_REQUEST_FAILED",
      });
      throw error;
    }
  }
  syncUnits(units: AttendanceUnit[]) {
    return this.call<AttendanceSyncResult>("PUT /units", "/units", {
      method: "PUT",
      body: JSON.stringify({ units }),
    });
  }
  syncUsers(users: AttendanceUser[]) {
    return this.call<AttendanceSyncResult>("PUT /users", "/users", {
      method: "PUT",
      body: JSON.stringify({ users }),
    });
  }
  syncTags(tags: AttendanceTag[]) {
    return this.call<AttendanceSyncResult>("PUT /tags", "/tags", {
      method: "PUT",
      body: JSON.stringify({ tags }),
    });
  }
  createSession(input: AttendanceSessionInput) {
    return this.call<AttendanceSessionView>("POST /sessions", "/sessions", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
  getSession(externalId: string) {
    return this.call<AttendanceSessionView>(
      "GET /sessions/{externalId}",
      `/sessions/${encodeURIComponent(externalId)}`,
    );
  }
  getRecords(externalId: string) {
    return this.call<AttendanceRecordsView>(
      "GET /sessions/{externalId}/records",
      `/sessions/${encodeURIComponent(externalId)}/records`,
    );
  }
  cancelSession(externalId: string) {
    return this.call<AttendanceSessionView>(
      "POST /sessions/{externalId}/cancel",
      `/sessions/${encodeURIComponent(externalId)}/cancel`,
      { method: "POST" },
    );
  }
  report() {
    return [...this.calls];
  }
  private record(call: IntegrationCallReport) {
    this.calls.push(call);
    if (this.calls.length > 200) this.calls.shift();
  }
}

export class MockAttendanceGateway implements AttendanceGateway {
  private readonly sessions = new Map<
    string,
    {
      status: AttendanceSessionView["status"];
      participantCount: number;
      finalized: boolean;
    }
  >();
  private readonly calls: IntegrationCallReport[] = [];
  private record(endpoint: string) {
    this.calls.push({
      endpoint,
      source: "mock",
      ok: true,
      at: new Date().toISOString(),
      message: "Mock Attendance gateway used",
    });
    if (this.calls.length > 200) this.calls.shift();
  }
  syncUnits(units: AttendanceUnit[]) {
    this.record("PUT /units");
    return Promise.resolve({
      created: units.length,
      updated: 0,
      unchanged: 0,
      failed: [],
    });
  }
  syncUsers(users: AttendanceUser[]) {
    this.record("PUT /users");
    return Promise.resolve({
      created: users.length,
      updated: 0,
      unchanged: 0,
      failed: [],
    });
  }
  syncTags(tags: AttendanceTag[]) {
    this.record("PUT /tags");
    return Promise.resolve({
      created: tags.length,
      updated: 0,
      unchanged: 0,
      failed: [],
    });
  }
  createSession(input: AttendanceSessionInput) {
    this.record("POST /sessions");
    this.sessions.set(input.externalId, {
      status: "pending",
      participantCount: input.participantCodes.length,
      finalized: false,
    });
    return Promise.resolve(this.get(input.externalId));
  }
  getSession(externalId: string) {
    this.record("GET /sessions/{externalId}");
    return Promise.resolve(this.get(externalId));
  }
  getRecords(externalId: string) {
    this.record("GET /sessions/{externalId}/records");
    return Promise.resolve({
      externalId,
      finalized: this.sessions.get(externalId)?.finalized ?? false,
      records: [],
    });
  }
  cancelSession(externalId: string) {
    this.record("POST /sessions/{externalId}/cancel");
    const session = this.sessions.get(externalId);
    if (session) session.status = "cancelled";
    return Promise.resolve(this.get(externalId));
  }
  report() {
    return [...this.calls];
  }
  private get(externalId: string): AttendanceSessionView {
    return {
      externalId,
      ...(this.sessions.get(externalId) ??
        { status: "pending", participantCount: 0, finalized: false }),
    };
  }
}
