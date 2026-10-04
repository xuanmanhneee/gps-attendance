import { http } from './api';
import type {
  ApiResponse,
  CheckInRequestPayload,
  CheckInResponsePayload,
  AttendanceSessionResponse,
  MyAttendanceSessionResponse,
  StudentAttendanceHistoryItemDto,
  StudentAttendanceSummary,
  AttendanceHistoryEventDto,
} from '@gps-attendance/shared';

export type AttendanceHistoryItem = StudentAttendanceHistoryItemDto;

export type CheckInRequest = CheckInRequestPayload;
export type ValidationResult = CheckInResponsePayload;
export type AttendanceSession = AttendanceSessionResponse;

export const AttendanceAPI = {
  /**
   * Lấy các phiên mà user hiện tại được gán
   */
  async getSessions(token: string): Promise<ApiResponse<MyAttendanceSessionResponse[]>> {
    return http.get<ApiResponse<MyAttendanceSessionResponse[]>>(
      '/v0/attendance-sessions/me',
      token,
    );
  },

  /**
   * Lấy tổng quan chuyên cần của sinh viên hiện tại
   */
  async getMySummary(
    token: string,
  ): Promise<ApiResponse<StudentAttendanceSummary>> {
    return http.get<ApiResponse<StudentAttendanceSummary>>(
      '/v0/attendance/records/summary',
      token,
    );
  },

  /**
   * Lấy chi tiết một buổi học
   */
  async getSession(
    sessionId: number,
    token: string,
  ): Promise<ApiResponse<AttendanceSession>> {
    return http.get<ApiResponse<AttendanceSession>>(
      `/v0/attendance-sessions/${sessionId}/detail`,
      token,
    );
  },

  /**
   * Thực hiện điểm danh cho một buổi học
   * Gửi vị trí GPS, thông tin thiết bị và kiểm tra tính xác thực
   */
  async checkIn(
    payload: CheckInRequest,
    token: string,
  ): Promise<ApiResponse<ValidationResult>> {
    return http.post<ApiResponse<ValidationResult>>(
      '/v0/attendance/check-in',
      payload,
      token,
    );
  },

  /**
   * Lấy lịch sử điểm danh thực tế của user hiện tại từ DB
   */
  async getAttendanceHistory(
    token: string,
  ): Promise<ApiResponse<StudentAttendanceHistoryItemDto[]>> {
    return http.get<ApiResponse<StudentAttendanceHistoryItemDto[]>>(
      '/v0/attendance/records/mine',
      token,
    );
  },

  async getAttendanceHistoryEvents(
    token: string,
  ): Promise<ApiResponse<AttendanceHistoryEventDto[]>> {
    return http.get<ApiResponse<AttendanceHistoryEventDto[]>>(
      '/v0/attendance/records/events/mine',
      token,
    );
  },

  /**
   * Lấy chi tiết một bản ghi điểm danh
   */
  async getAttendanceRecord(
    recordId: number,
    token: string,
  ): Promise<ApiResponse<StudentAttendanceHistoryItemDto>> {
    return http.get<ApiResponse<StudentAttendanceHistoryItemDto>>(
      `/v0/attendance/records/${recordId}`,
      token,
    );
  },
};
