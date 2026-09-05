import { http } from './api';
import type {
  ApiResponse,
  CheckInRequestPayload,
  CheckInResponsePayload,
  AttendanceSessionPayload,
} from '@gps-attendance/shared';

export type CheckInRequest = CheckInRequestPayload;
export type ValidationResult = CheckInResponsePayload;
export type AttendanceSession = AttendanceSessionPayload;

export const AttendanceAPI = {
  /**
   * Lấy danh sách các buổi học hiện có
   */
  async getSessions(token: string): Promise<ApiResponse<AttendanceSession[]>> {
    return http.get<ApiResponse<AttendanceSession[]>>('/attendance-sessions', token);
  },

  /**
   * Lấy chi tiết một buổi học
   */
  async getSession(
    sessionId: number,
    token: string,
  ): Promise<ApiResponse<AttendanceSession>> {
    return http.get<ApiResponse<AttendanceSession>>(
      `/attendance-sessions/${sessionId}`,
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
    return http.post<ApiResponse<ValidationResult>>('/attendance/check-in', payload, token);
  },

  /**
   * Lấy lịch sử điểm danh của user hiện tại
   */
  async getAttendanceHistory(token: string): Promise<ApiResponse<never[]>> {
    return Promise.resolve({
      success: false,
      code: 'ATTENDANCE_HISTORY_NOT_AVAILABLE',
      message: 'Backend chưa cung cấp API lịch sử điểm danh',
    });
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
      code: 'ATTENDANCE_RECORD_NOT_AVAILABLE',
      message: 'Backend chưa cung cấp API chi tiết bản ghi điểm danh',
    });
  },
};
