/**
 * Dictionary tiếng Việt — nguồn sự thật cho danh sách translation key.
 *
 * Mọi key dùng ở component phải tồn tại ở đây; `TranslationKey` được suy ra
 * trực tiếp từ object này nên thêm key mới sẽ bắt `en.ts` bổ sung theo.
 */
export const vi = {
  // ---- App shell ----
  'app.brandPrimary': 'GPS',
  'app.brandSecondary': 'Attendance',
  'app.sidebarAria': 'Thanh điều hướng',
  'app.primaryNavAria': 'Điều hướng chính',

  // ---- Navigation ----
  'navigation.group.admin': 'Admin',
  'navigation.group.lecturer': 'Giảng viên',
  'navigation.overview': 'Tổng quan',
  'navigation.users': 'Người dùng',
  'navigation.units': 'Đơn vị',
  'navigation.tags': 'Thẻ tag',
  'navigation.attendanceSessions': 'Phiên điểm danh',
  'navigation.attendanceRecords': 'Bản ghi điểm danh',
  'navigation.statistics': 'Thống kê',

  // ---- Vai trò tài khoản (read-only) ----
  'roles.fieldLabel': 'Vai trò hiện tại',
  'roles.statusAria': 'Vai trò xác thực: {role}',
  'roles.admin': 'Quản trị viên',
  'roles.lecturer': 'Giảng viên',
  'roles.pill.admin': 'Admin',
  'roles.pill.lecturer': 'Lecturer',
  'roles.adminProfile': 'Admin hệ thống',
  'roles.lecturerProfile': 'Giảng viên phụ trách',

  // ---- Trạng thái chung ----
  'common.loading': 'Đang tải dữ liệu...',
  'common.emptyTitle': 'Chưa có dữ liệu',
  'common.errorTitle': 'Không thể tải dữ liệu',
  'common.retry': 'Thử lại',
  'common.dataUnavailable': 'Chưa có nguồn dữ liệu',
  'common.dataUnavailableHint':
    'API cho chỉ số này chưa có trong dashboard nên hệ thống không hiển thị số liệu ước lượng.',
  'common.viewAll': 'Xem tất cả',
  'common.details': 'Xem chi tiết',
  'common.logout': 'Đăng xuất',
  'common.logoutAria': 'Đăng xuất khỏi hệ thống',
  'common.backToDashboard': 'Quay lại tổng quan',
  'common.comingSoonTitle': 'Chức năng đang được phát triển',
  'common.comingSoonBody':
    'Trang này chưa có nghiệp vụ hoàn chỉnh. Mục menu đã sẵn sàng để nối API khi backend bổ sung.',
  'common.notFoundTitle': 'Không tìm thấy trang',
  'common.notFoundBody': 'Đường dẫn này không tồn tại trong dashboard.',
  'common.localeToggleAria': 'Đổi ngôn ngữ giao diện',
  'common.themeToggleAria': 'Đổi chế độ hiển thị',
  'common.theme.light': 'Sáng',
  'common.theme.dark': 'Tối',
  'common.theme.system': 'Theo hệ thống',
  'common.locale.vi': 'Tiếng Việt',
  'common.locale.en': 'Tiếng Anh',

  // ---- Topbar ----
  'topbar.context.admin': 'Trung tâm điều hành',
  'topbar.context.lecturer': 'Trung tâm giảng viên',

  // ---- Thẻ trợ giúp trong sidebar (theo prototype `help-card`) ----
  'help.title': 'Cần hỗ trợ?',
  'help.body': 'Xem hướng dẫn sử dụng GPS Attendance.',
  'help.action': 'Mở trung tâm trợ giúp →',

  // ---- Lời chào ----
  'greeting.morning': 'Chào buổi sáng, {name}',
  'greeting.afternoon': 'Chào buổi chiều, {name}',
  'greeting.evening': 'Chào buổi tối, {name}',
  'greeting.anonymous': 'Xin chào',

  // ---- Dashboard ----
  'dashboard.admin.eyebrow': 'Tổng quan hệ thống',
  'dashboard.admin.description':
    'Theo dõi phiên điểm danh và tình hình vận hành của hệ thống.',
  'dashboard.lecturer.eyebrow': 'Tổng quan điểm danh',
  'dashboard.lecturer.description':
    'Theo dõi các phiên điểm danh và tình hình lớp bạn phụ trách.',
  'dashboard.createSession': 'Tạo phiên điểm danh',
  'dashboard.sessionsByStatusTitle': 'Phân bố trạng thái phiên',
  'dashboard.sessionsByStatusSubtitle': 'Tổng hợp từ các phiên hiện có',
  'dashboard.recentSessionsTitle': 'Phiên điểm danh gần đây',
  'dashboard.recentSessionsSubtitle.admin':
    'Các phiên mới nhất đang có trên hệ thống',
  'dashboard.recentSessionsSubtitle.lecturer': 'Các phiên bạn tạo gần đây nhất',
  'dashboard.mySessionsTitle': 'Phiên điểm danh của tôi',
  'dashboard.attendanceRateTitle': 'Tỷ lệ có mặt',
  'dashboard.attendanceRateSubtitle': '7 ngày gần nhất',
  'dashboard.unavailableTitle': 'Chỉ số chưa có nguồn dữ liệu',
  'dashboard.unavailableSubtitle': 'Không hiển thị số liệu ước lượng',

  // ---- Summary cards ----
  'summary.totalSessions': 'Tổng phiên điểm danh',
  'summary.todaySessions': 'Phiên hôm nay',
  'summary.openSessions': 'Phiên đang mở',
  'summary.pendingSessions': 'Phiên sắp diễn ra',
  'summary.closedSessions': 'Phiên đã kết thúc',
  'summary.totalUsers': 'Tổng người dùng',
  'summary.units': 'Đơn vị',
  'summary.tags': 'Thẻ tag',
  'summary.attendanceRate': 'Tỷ lệ có mặt',
  'summary.attendanceRecords': 'Bản ghi điểm danh',
  'summary.totalSessionsNote': 'trên toàn hệ thống',
  'summary.todaySessionsNote': 'trong ngày hôm nay',
  'summary.statusNote': 'theo trạng thái hiện tại',

  // ---- Mô tả các page theo role ----
  'pages.users.description': 'Quản lý tài khoản và vai trò người dùng.',
  'pages.units.description': 'Cấu trúc khoa, bộ môn và lớp trong hệ thống.',
  'pages.tags.description': 'Gán thẻ tag để lọc và gom nhóm người dùng.',
  'pages.attendanceRecords.description':
    'Tra cứu chi tiết từng lượt điểm danh của sinh viên.',
  'pages.statistics.description':
    'Báo cáo tỷ lệ có mặt và xu hướng điểm danh theo thời gian.',
  // ---- Phiên điểm danh ----
  'sessions.page.description':
    'Quản lý các phiên điểm danh GPS do bạn tạo và theo dõi trạng thái.',
  'sessions.table.name': 'Phiên điểm danh',
  'sessions.table.time': 'Thời gian',
  'sessions.table.radius': 'Bán kính',
  'sessions.table.status': 'Trạng thái',
  'sessions.table.actions': 'Thao tác',
  'sessions.radiusValue': '{value} m',
  'sessions.empty': 'Chưa có phiên điểm danh nào.',
  'sessions.loadError': 'Không thể tải danh sách phiên điểm danh.',
  'sessions.status.open': 'Đang mở',
  'sessions.status.pending': 'Sắp diễn ra',
  'sessions.status.closed': 'Đã kết thúc',

  // ---- Chi tiết phiên ----
  'sessionDetail.loading': 'Đang tải thông tin phiên điểm danh...',
  'sessionDetail.invalidId': 'Mã phiên điểm danh không hợp lệ.',
  'sessionDetail.loadError': 'Không thể tải thông tin phiên điểm danh.',
  'sessionDetail.backToList': 'Quay lại danh sách phiên',
  'sessionDetail.openTime': 'Thời gian mở',
  'sessionDetail.closeTime': 'Thời gian đóng',
  'sessionDetail.radius': 'Bán kính điểm danh',
  'sessionDetail.coordinates': 'Toạ độ',
  'sessionDetail.openMaps': 'Mở vị trí trên Google Maps',
  'sessionDetail.participants': 'Người tham gia',
  'sessionDetail.participantCount': '{count} người',
  'sessionDetail.refreshAria': 'Tải lại danh sách người tham gia',
  'sessionDetail.refreshError':
    'Không thể tải lại danh sách người tham gia. Vui lòng thử lại.',
  'sessionDetail.emptyParticipants':
    'Chưa có người tham gia trong phiên điểm danh này.',
  'sessionDetail.studentCode': 'Mã sinh viên',
  'sessionDetail.present': 'Đã điểm danh',
  'sessionDetail.absent': 'Chưa điểm danh',
} as const;