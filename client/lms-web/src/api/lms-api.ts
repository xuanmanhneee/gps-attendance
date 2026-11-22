import { request } from './http-client';
import type { AttendanceOptions, AttendanceSession, AttendanceSummary, Building, CallReport, Course, CourseDetail, LmsUser } from '../types';

export type CreateSessionInput = {
  title: string;
  buildingId: number;
  radius: number;
  openAt: string;
  closeAt: string;
};

export type CreateGeneralSessionInput = CreateSessionInput & {
  unitCodes: string[];
  studentCodes: string[];
};

export const lmsApi = {
  login: (username: string, password: string) => request<{ token: string; user: LmsUser }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request<LmsUser>('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  courses: () => request<Course[]>('/api/classes'),
  course: (id: number) => request<CourseDetail>(`/api/classes/${id}`),
  buildings: () => request<Building[]>('/api/buildings'),
  attendanceOptions: () => request<AttendanceOptions>('/api/attendance-options'),
  attendanceSummary: (id: number) => request<AttendanceSummary>(`/api/classes/${id}/attendance-summary`),
  createSession: (classId: number, input: CreateSessionInput) => request<{ session: { externalId: string } }>(`/api/classes/${classId}/sessions`, { method: 'POST', body: JSON.stringify(input) }),
  createGeneralSession: (input: CreateGeneralSessionInput) => request<{ session: { externalId: string }; participantCount: number }>('/api/sessions', { method: 'POST', body: JSON.stringify(input) }),
  session: (externalId: string) => request<AttendanceSession>(`/api/integration/sessions/${encodeURIComponent(externalId)}`),
  records: (externalId: string) => request<unknown>(`/api/integration/sessions/${encodeURIComponent(externalId)}/records`),
  cancelSession: (externalId: string) => request<AttendanceSession>(`/api/integration/sessions/${encodeURIComponent(externalId)}/cancel`, { method: 'POST' }),
  integrationReport: () => request<CallReport[]>('/api/integration/report'),
  sync: () => request<{ report: CallReport[] }>('/api/integration/sync', { method: 'POST' }),
};
