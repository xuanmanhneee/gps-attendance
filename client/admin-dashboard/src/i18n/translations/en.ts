import type { TranslationKey } from '../translation-keys';

/**
 * Dictionary tiếng Anh.
 *
 * Kiểu `Record<TranslationKey, string>` buộc file này phải có đủ key của `vi`,
 * nên không thể quên dịch khi thêm key mới.
 */
export const en: Record<TranslationKey, string> = {
  // ---- App shell ----
  'app.brandPrimary': 'GPS',
  'app.brandSecondary': 'Attendance',
  'app.sidebarAria': 'Navigation sidebar',
  'app.primaryNavAria': 'Main navigation',

  // ---- Navigation ----
  'navigation.group.admin': 'Admin',
  'navigation.group.lecturer': 'Lecturer',
  'navigation.overview': 'Overview',
  'navigation.users': 'Users',
  'navigation.units': 'Units',
  'navigation.tags': 'Tags',
  'navigation.attendanceSessions': 'Attendance sessions',
  'navigation.attendanceRecords': 'Attendance records',
  'navigation.statistics': 'Statistics',

  // ---- Authenticated role (read-only) ----
  'roles.fieldLabel': 'Current role',
  'roles.statusAria': 'Authenticated role: {role}',
  'roles.admin': 'Administrator',
  'roles.lecturer': 'Lecturer',
  'roles.pill.admin': 'Admin',
  'roles.pill.lecturer': 'Lecturer',
  'roles.adminProfile': 'System admin',
  'roles.lecturerProfile': 'Course lecturer',

  // ---- Shared states ----
  'common.loading': 'Loading data...',
  'common.emptyTitle': 'No data yet',
  'common.errorTitle': 'Unable to load data',
  'common.retry': 'Retry',
  'common.dataUnavailable': 'No data source yet',
  'common.dataUnavailableHint':
    'The dashboard has no API for this metric yet, so no estimated value is displayed.',
  'common.viewAll': 'View all',
  'common.details': 'View details',
  'common.logout': 'Sign out',
  'common.logoutAria': 'Sign out of the system',
  'common.backToDashboard': 'Back to overview',
  'common.comingSoonTitle': 'This feature is under development',
  'common.comingSoonBody':
    'This page has no complete behaviour yet. The menu entry is ready to be wired to an API once the backend provides one.',
  'common.notFoundTitle': 'Page not found',
  'common.notFoundBody': 'This path does not exist in the dashboard.',
  'common.localeToggleAria': 'Change interface language',
  'common.themeToggleAria': 'Change appearance',
  'common.theme.light': 'Light',
  'common.theme.dark': 'Dark',
  'common.theme.system': 'System',
  'common.locale.vi': 'Vietnamese',
  'common.locale.en': 'English',

  // ---- Topbar ----
  'topbar.context.admin': 'Operations centre',
  'topbar.context.lecturer': 'Lecturer centre',

  // ---- Sidebar help card (mirrors the prototype `help-card`) ----
  'help.title': 'Need help?',
  'help.body': 'Read the GPS Attendance user guide.',
  'help.action': 'Open the help centre →',

  // ---- Greeting ----
  'greeting.morning': 'Good morning, {name}',
  'greeting.afternoon': 'Good afternoon, {name}',
  'greeting.evening': 'Good evening, {name}',
  'greeting.anonymous': 'Welcome',

  // ---- Dashboard ----
  'dashboard.admin.eyebrow': 'System overview',
  'dashboard.admin.description':
    'Track attendance sessions and how the system is operating.',
  'dashboard.lecturer.eyebrow': 'Attendance overview',
  'dashboard.lecturer.description':
    'Track attendance sessions and the attendance status of your classes.',
  'dashboard.createSession': 'Create attendance session',
  'dashboard.sessionsByStatusTitle': 'Session status breakdown',
  'dashboard.sessionsByStatusSubtitle': 'Aggregated from existing sessions',
  'dashboard.recentSessionsTitle': 'Recent attendance sessions',
  'dashboard.recentSessionsSubtitle.admin':
    'The most recent sessions on the system',
  'dashboard.recentSessionsSubtitle.lecturer':
    'Your most recently created sessions',
  'dashboard.mySessionsTitle': 'My attendance sessions',
  'dashboard.attendanceRateTitle': 'Attendance rate',
  'dashboard.attendanceRateSubtitle': 'Last 7 days',
  'dashboard.unavailableTitle': 'Metrics without a data source',
  'dashboard.unavailableSubtitle': 'No estimated values are shown',

  // ---- Summary cards ----
  'summary.totalSessions': 'Total sessions',
  'summary.todaySessions': 'Sessions today',
  'summary.openSessions': 'Open sessions',
  'summary.pendingSessions': 'Upcoming sessions',
  'summary.closedSessions': 'Closed sessions',
  'summary.totalUsers': 'Total users',
  'summary.units': 'Units',
  'summary.tags': 'Tags',
  'summary.attendanceRate': 'Attendance rate',
  'summary.attendanceRecords': 'Attendance records',
  'summary.totalSessionsNote': 'across the whole system',
  'summary.todaySessionsNote': 'during today',
  'summary.statusNote': 'by current status',

  // ---- Page descriptions ----
  'pages.users.description': 'Manage user accounts and roles.',
  'pages.units.description': 'Faculties, departments and classes structure.',
  'pages.tags.description': 'Assign tags to filter and group users.',
  'pages.attendanceRecords.description':
    'Look up individual student attendance records.',
  'pages.statistics.description':
    'Attendance rate reports and trends over time.',

  // ---- Attendance sessions ----
  'sessions.page.description':
    'Manage the GPS attendance sessions you created and track their status.',
  'sessions.table.name': 'Session',
  'sessions.table.time': 'Time',
  'sessions.table.radius': 'Radius',
  'sessions.table.status': 'Status',
  'sessions.table.actions': 'Actions',
  'sessions.radiusValue': '{value} m',
  'sessions.empty': 'No attendance session yet.',
  'sessions.loadError': 'Unable to load the attendance session list.',
  'sessions.status.open': 'Open',
  'sessions.status.pending': 'Upcoming',
  'sessions.status.closed': 'Closed',

  // ---- Session detail ----
  'sessionDetail.loading': 'Loading session details...',
  'sessionDetail.invalidId': 'Invalid attendance session id.',
  'sessionDetail.loadError': 'Unable to load the attendance session.',
  'sessionDetail.backToList': 'Back to session list',
  'sessionDetail.openTime': 'Open time',
  'sessionDetail.closeTime': 'Close time',
  'sessionDetail.radius': 'Attendance radius',
  'sessionDetail.coordinates': 'Coordinates',
  'sessionDetail.openMaps': 'Open location in Google Maps',
  'sessionDetail.participants': 'Participants',
  'sessionDetail.participantCount': '{count} people',
  'sessionDetail.refreshAria': 'Reload participant list',
  'sessionDetail.refreshError':
    'Unable to reload the participant list. Please try again.',
  'sessionDetail.emptyParticipants':
    'There is no participant in this attendance session yet.',
  'sessionDetail.studentCode': 'Student code',
  'sessionDetail.present': 'Checked in',
  'sessionDetail.absent': 'Not checked in',
} as const;
