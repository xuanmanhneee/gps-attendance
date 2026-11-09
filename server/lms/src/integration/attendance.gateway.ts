import { attendanceRequest } from "./attendance-client.ts";
import type {
  LmsClass,
  LmsSession,
  LmsUnit,
  LmsUser,
} from "../database/lms.repository.ts";

export interface IntegrationCallReport {
  endpoint: string;
  source: "attendance" | "mock";
  ok: boolean;
  message?: string;
  at: string;
}

export interface AttendanceGateway {
  syncUnits(units: LmsUnit[]): Promise<unknown>;
  syncUsers(users: LmsUser[]): Promise<unknown>;
  syncCourses(courses: unknown[]): Promise<unknown>;
  syncAccounts(users: LmsUser[]): Promise<unknown>;
  createSession(
    session: LmsSession,
    course: LmsClass,
    studentCodes: string[],
  ): Promise<unknown>;
  getSession(externalId: string): Promise<unknown>;
  getRecords(externalId: string): Promise<unknown>;
  cancelSession(externalId: string): Promise<unknown>;
  report(): IntegrationCallReport[];
}

export class RealAttendanceGateway implements AttendanceGateway {
  private readonly calls: IntegrationCallReport[] = [];
  private async call<T>(
    endpoint: string,
    path: string,
    options?: RequestInit,
  ): Promise<T> {
    const at = new Date().toISOString();
    try {
      const value = await attendanceRequest<T>(path, options);
      this.calls.push({ endpoint, source: "attendance", ok: true, at });
      return value;
    } catch (error) {
      this.calls.push({
        endpoint,
        source: "attendance",
        ok: false,
        at,
        message: error instanceof Error ? error.message : "Attendance error",
      });
      throw error;
    }
  }
  syncUnits(units: LmsUnit[]) {
    return this.call("PUT /units", "/units", {
      method: "PUT",
      body: JSON.stringify({ units }),
    });
  }
  syncUsers(users: LmsUser[]) {
    return this.call("PUT /users", "/users", {
      method: "PUT",
      body: JSON.stringify({ users }),
    });
  }
  syncCourses(courses: unknown[]) {
    return this.call("PUT /courses", "/courses", {
      method: "PUT",
      body: JSON.stringify({ courses }),
    });
  }
  syncAccounts(users: LmsUser[]) {
    return this.call("PUT /accounts", "/accounts", {
      method: "PUT",
      body: JSON.stringify({ users }),
    });
  }
  createSession(session: LmsSession, course: LmsClass, studentCodes: string[]) {
    return this.call("POST /sessions", "/sessions", {
      method: "POST",
      body: JSON.stringify({
        externalId: session.externalId,
        title: session.title,
        latitude: session.latitude,
        longitude: session.longitude,
        radius: session.radius,
        openAt: session.openAt,
        closeAt: session.closeAt,
        lecturerCode: course.lecturerCode,
        studentCodes,
      }),
    });
  }
  getSession(externalId: string) {
    return this.call(
      "GET /sessions/{externalId}",
      `/sessions/${encodeURIComponent(externalId)}`,
    );
  }
  getRecords(externalId: string) {
    return this.call(
      "GET /sessions/{externalId}/records",
      `/sessions/${encodeURIComponent(externalId)}/records`,
    );
  }
  cancelSession(externalId: string) {
    return this.call(
      "POST /sessions/{externalId}/cancel",
      `/sessions/${encodeURIComponent(externalId)}/cancel`,
      { method: "POST" },
    );
  }
  report() {
    return this.calls;
  }
}

export class MockAttendanceGateway implements AttendanceGateway {
  private readonly sessions = new Map<
    string,
    { status: string; participantCount: number; finalized: boolean }
  >();
  private readonly calls: IntegrationCallReport[] = [];
  private record(endpoint: string) {
    this.calls.push({
      endpoint,
      source: "mock",
      ok: true,
      at: new Date().toISOString(),
      message: "Attendance unavailable; mock fallback used",
    });
  }
  syncUnits(units: LmsUnit[]) {
    this.record("PUT /units");
    return Promise.resolve({
      created: units.length,
      updated: 0,
      unchanged: 0,
      failed: [],
    });
  }
  syncUsers(users: LmsUser[]) {
    this.record("PUT /users");
    return Promise.resolve({
      created: users.length,
      updated: 0,
      unchanged: 0,
      failed: [],
    });
  }
  syncCourses(courses: unknown[]) {
    this.record("PUT /courses");
    return Promise.resolve({
      created: courses.length,
      updated: 0,
      unchanged: 0,
      failed: [],
    });
  }
  syncAccounts(users: LmsUser[]) {
    this.record("PUT /accounts");
    return Promise.resolve({
      created: users.length,
      updated: 0,
      unchanged: 0,
      failed: [],
    });
  }
  createSession(
    session: LmsSession,
    _course: LmsClass,
    studentCodes: string[],
  ) {
    this.record("POST /sessions");
    this.sessions.set(session.externalId, {
      status: "pending",
      participantCount: studentCodes.length,
      finalized: false,
    });
    return Promise.resolve(this.get(session.externalId));
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
    return this.calls;
  }
  private get(externalId: string) {
    return {
      externalId,
      ...(this.sessions.get(externalId) ??
        { status: "pending", participantCount: 0, finalized: false }),
    };
  }
}

export class HybridAttendanceGateway implements AttendanceGateway {
  constructor(
    private readonly real: RealAttendanceGateway,
    private readonly mock: MockAttendanceGateway,
  ) {}
  private async fallback<T>(fn: () => Promise<T>, mockFn: () => Promise<T>) {
    try {
      return await fn();
    } catch {
      return mockFn();
    }
  }
  syncUnits(v: LmsUnit[]) {
    return this.fallback(
      () => this.real.syncUnits(v),
      () => this.mock.syncUnits(v),
    );
  }
  syncUsers(v: LmsUser[]) {
    return this.fallback(
      () => this.real.syncUsers(v),
      () => this.mock.syncUsers(v),
    );
  }
  syncCourses(v: unknown[]) {
    return this.fallback(
      () => this.real.syncCourses(v),
      () => this.mock.syncCourses(v),
    );
  }
  syncAccounts(v: LmsUser[]) {
    return this.fallback(
      () => this.real.syncAccounts(v),
      () => this.mock.syncAccounts(v),
    );
  }
  createSession(s: LmsSession, c: LmsClass, u: string[]) {
    return this.fallback(
      () => this.real.createSession(s, c, u),
      () => this.mock.createSession(s, c, u),
    );
  }
  getSession(id: string) {
    return this.fallback(
      () => this.real.getSession(id),
      () => this.mock.getSession(id),
    );
  }
  getRecords(id: string) {
    return this.fallback(
      () => this.real.getRecords(id),
      () => this.mock.getRecords(id),
    );
  }
  cancelSession(id: string) {
    return this.fallback(
      () => this.real.cancelSession(id),
      () => this.mock.cancelSession(id),
    );
  }
  report() {
    return [...this.real.report(), ...this.mock.report()];
  }
}
