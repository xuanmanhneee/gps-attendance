// ----------------------------------------------------------------------------
// 1. Vị trí GPS
// ----------------------------------------------------------------------------
export interface LocationPayload {
  /** Vĩ độ, độ thập phân (vd: 11.9404) */
  latitude: number;

  /** Kinh độ, độ thập phân (vd: 108.4583) */
  longitude: number;

  /**
   * Độ chính xác ngang do chip GPS báo về, đơn vị mét.
   * Số càng nhỏ càng đáng tin. Dùng để server loại các vị trí quá
   * nhiễu/không đáng tin (vd accuracy > 50m thì nên nghi ngờ).
   */
  accuracy: number;

  /**
   * Thời điểm lấy được vị trí này, epoch ms — lấy từ chính GPS/hệ thống
   * định vị, KHÔNG phải giờ hệ thống của máy (2 giá trị có thể khác nhau
   * nếu người dùng chỉnh giờ máy).
   */
  timestamp: number;

  /**
   * Cờ do hệ điều hành báo "vị trí này có phải bị giả lập không".
   * - Android: lấy từ LocationManager (isFromMockProvider / Location.isMock()),
   *   tương đối đáng tin trên máy chưa root/chưa patch app.
   * - iOS: Apple không cung cấp API tương đương -> thường luôn là false/null,
   *   coi như "không xác định được" trên iOS, KHÔNG coi là bằng chứng vị trí thật.
   *
   * LƯU Ý QUAN TRỌNG: đây là giá trị do CHÍNH APP tự đọc và tự báo cáo lên.
   * Nếu máy bị root và app bị patch, giá trị này có thể bị làm giả trước khi
   * gửi lên server. Vì vậy trường này chỉ nên dùng như MỘT tín hiệu tham khảo,
   * không phải bằng chứng cuối cùng — độ tin cậy thật sự đến từ `integrityToken`
   * bên dưới.
   */
  isMockLocation: boolean;
}

// ----------------------------------------------------------------------------
// 2. Thiết bị
// ----------------------------------------------------------------------------
export interface DevicePayload {
  /**
   * ID cài đặt (installation ID) do app tự sinh và lưu bền vững trên máy,
   * dùng để đối chiếu "thiết bị này đã điểm danh cho tài khoản khác trong
   * cùng phiên chưa". KHÔNG dùng IMEI/serial số (vướng chính sách store +
   * quyền riêng tư).
   */
  deviceId: string;

  /** Nền tảng thiết bị — quyết định cách server verify integrityToken bên dưới */
  platform: "android" | "ios";

  /** Tên model máy, chỉ để hiển thị/thống kê trên dashboard, không dùng để check gian lận */
  model: string;
}

// ----------------------------------------------------------------------------
// 3. Xác thực tính toàn vẹn của app/thiết bị (Play Integrity / App Attest)
// ----------------------------------------------------------------------------
export interface DeviceIntegrityPayload {
  /**
   * Token thô (JWT) lấy được từ:
   * - Android: Play Integrity API
   * - iOS: App Attest
   *
   * Đây KHÔNG phải hash để server tự so sánh. Server nhận token này và gọi
   * ngược lên Google/Apple để xác minh — kết quả trả về cho biết: app có
   * đúng bản build hợp lệ chưa bị sửa không, máy có phải máy thật (không
   * phải emulator) không, máy có root/jailbreak không.
   *
   * Vì việc verify diễn ra ở Google/Apple (dựa trên khoá ký nằm trong chip
   * bảo mật của máy), giá trị này đáng tin hơn nhiều so với việc client tự
   * báo "isRooted: true/false" — nên KHÔNG cần thêm field kiểu đó nữa.
   *
   * null nếu bước lấy integrity token thất bại (vd. máy không có Google
   * Play Services) — server tự quyết định xử lý thế nào với case null
   * (từ chối cứng, hay chỉ hạ điểm tin cậy).
   */
  integrityToken: string | null;
}

// ----------------------------------------------------------------------------
// 4. Payload gửi lên server
// ----------------------------------------------------------------------------
export interface CheckInRequestDto {
  /** ID của phiên điểm danh sinh viên đang tham gia */
  sessionId: string;

  location: LocationPayload;
  device: DevicePayload;
  integrity: DeviceIntegrityPayload;
}