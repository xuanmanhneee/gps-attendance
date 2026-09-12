import { http } from './api';
import type {
  ApiResponse,
  CheckInRequestPayload,
  CheckInResponsePayload,
  AttendanceSessionResponse,
  StudentAttendanceHistoryItemDto,
} from '@gps-attendance/shared';

export type AttendanceHistoryItem = StudentAttendanceHistoryItemDto;

export type CheckInRequest = CheckInRequestPayload;
export type ValidationResult = CheckInResponsePayload;
export type AttendanceSession = AttendanceSessionResponse;

export const AttendanceAPI = {
  /**
   * Lấy các phiên mà user hiện tại được gán
   */
  async getSessions(token: string): Promise<ApiResponse<AttendanceSession[]>> {
    return http.get<ApiResponse<AttendanceSession[]>>(
      '/v0/attendance-sessions/mine',
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
      '/attendance/check-in',
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
      '/attendance/records/mine',
      token,
    );
  },

  /**
   * Lấy chi tiết một bản ghi điểm danh
   */
  async getAttendanceRecord(
    _recordId: number,
    _token: string,
  ): Promise<ApiResponse<never>> {
    return Promise.resolve({
      success: false,
      code: 'UNKNOWN_ERROR',
      message: 'Backend chưa cung cấp API chi tiết bản ghi điểm danh',
    });
  },
};
