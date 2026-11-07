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
  'app.sidebarExpandAria': 'Expand navigation sidebar',
  'app.sidebarCollapseAria': 'Collapse navigation sidebar',
  'app.breadcrumbAria': 'Current page location',
  'app.pageActionsAria': 'Page actions',

  // ---- Navigation ----
  'navigation.group.admin': 'Admin',
  'navigation.group.organizer': 'Organizer',
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
  'roles.organizer': 'Organizer',
  'roles.pill.admin': 'Admin',
  'roles.pill.organizer': 'Organizer',
  'roles.participant': 'Participant',
  'roles.adminProfile': 'System admin',
  'roles.organizerProfile': 'Organizer',

  // ---- Shared states ----
  'common.loading': 'Loading data...',
  'common.emptyTitle': 'No data yet',
  'common.errorTitle': 'Unable to load data',
  'common.retry': 'Retry',
  'common.refresh': 'Refresh',
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
  'common.cancel': 'Cancel',
  'common.errorBoundaryTitle': 'Something went wrong rendering this page',
  'common.errorBoundaryBody':
    'The system encountered an unexpected error while rendering. You can reload the page to try again.',
  'common.reloadPage': 'Reload',

  // ---- Topbar ----
  'topbar.context.admin': 'Operations centre',
  'topbar.context.organizer': 'Organizer centre',

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
  'dashboard.organizer.eyebrow': 'Attendance overview',
  'dashboard.organizer.description':
    'Track the attendance sessions you manage.',
  'dashboard.createSession': 'Create attendance session',
  'dashboard.sessionsByStatusTitle': 'Session status breakdown',
  'dashboard.sessionsByStatusSubtitle': 'Aggregated from existing sessions',
  'dashboard.recentSessionsTitle': 'Recent attendance sessions',
  'dashboard.recentSessionsSubtitle.admin':
    'The most recent sessions on the system',
  'dashboard.recentSessionsSubtitle.organizer':
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
  'pages.units.description': 'Unit hierarchy across the system.',
  'pages.tags.description': 'Assign tags to filter and group users.',
  'pages.attendanceRecords.description':
    'Look up individual participant attendance records.',
  'pages.statistics.description':
    'Attendance rate reports and trends over time.',

  // ---- Attendance records ----
  'attendanceRecords.title': 'Attendance record lookup',
  'attendanceRecords.description':
    'Select a session to view each participant attendance status.',
  'attendanceRecords.selectedSession': 'Viewing: {title}',
  'attendanceRecords.loadingSessions': 'Loading attendance sessions...',
  'attendanceRecords.emptySessions':
    'There are no attendance sessions to look up yet.',
  'attendanceRecords.session': 'Attendance session',
  'attendanceRecords.search': 'Find participant',
  'attendanceRecords.searchPlaceholder': 'Enter participant name or code',
  'attendanceRecords.status': 'Status',
  'attendanceRecords.allStatuses': 'All statuses',
  'attendanceRecords.loading': 'Loading attendance records...',
  'attendanceRecords.rosterPending':
    'The attendance roster has not been initialized yet. Records will appear shortly before the session opens.',
  'attendanceRecords.total': 'Total',
  'attendanceRecords.empty': 'This session has no attendance records.',
  'attendanceRecords.noMatches':
    'No attendance records match the current filters.',
  'attendanceRecords.code': 'Code',
  'attendanceRecords.participant': 'Participant',
  'attendanceRecords.checkedInAt': 'Check-in time',
  'attendanceRecords.updatedAt': 'Last updated',

  // ---- Attendance sessions ----
  'sessions.page.description':
    'Manage and track GPS attendance sessions.',
  'sessions.total': '{count} attendance sessions',
  'sessions.filter.label': 'Filter by organizer',
  'sessions.filter.allOrganizers': 'All organizers',
  'sessions.filter.loading': 'Loading the organizer list...',
  'sessions.filter.loadError': 'Unable to load the organizer list.',
  'sessions.filter.invalidOrganizer': 'The selected organizer is invalid.',
  'sessions.filter.statusLabel': 'Status',
  'sessions.filter.allStatuses': 'All statuses',
  'sessions.emptyFiltered': 'No attendance sessions match the filter.',
  'sessions.filter.includeCancelled': 'Show cancelled sessions',
  'sessions.emptyMaybeHiddenCancelled':
    'No sessions match the filter. Some cancelled sessions may be hidden — enable "Show cancelled sessions" to view.',
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
  'sessions.status.cancelled': 'Cancelled',
  'sessions.reloading': 'Reloading the session list...',
  'sessions.staleDataWarning':
    'The session list may be outdated because a load failed.',
  'sessions.createError': 'Unable to create the attendance session.',
  'sessions.createSuccess': 'Attendance session created successfully.',
  'sessions.error.validation': 'The submitted data is not valid.',
  'sessions.error.unauthorized': 'Your session has expired.',
  'sessions.error.forbidden': 'You do not have permission for this action.',
  'sessions.error.notFound': 'Attendance session not found.',
  'sessions.error.conflict': 'The action conflicts with the current data.',
  'sessions.error.tooManyRequests':
    'Too many requests, please try again later.',
  'sessions.error.internal': 'The server hit an error, please try again later.',
  'sessions.error.unknown': 'Something went wrong, please try again.',
  'sessions.error.invalidTimeRange': 'The session time range is not valid.',
  'sessions.error.invalidRadius': 'The attendance radius is not valid.',
  'sessions.error.creationForbidden':
    'You do not have permission to create attendance sessions.',

  'sessions.error.invalidCriteria': 'Invalid participant criteria.',
  'sessions.error.cancelInvalidStatus':
    'Cannot cancel a session that is closed or already cancelled.',
  'sessions.error.updateInvalidStatus':
    'Cannot edit a session that is closed or cancelled.',
  'sessions.error.updateFieldLocked':
    'An open session can only have its closing time changed.',
  'sessions.error.criteriaLocked':
    'The participant list has already been generated, so the criteria can no longer be changed.',
  'sessions.updateError': 'Could not update the attendance session.',
  'sessions.updateSuccess': 'Attendance session updated.',
  'sessions.cancelError': 'Could not cancel the attendance session.',

  // ---- Edit session ----
  'sessions.edit.heading': 'Edit attendance session',
  'sessions.edit.description':
    'Update the session fields allowed by its current status',
  'sessions.edit.loading': 'Loading the session for editing...',
  'sessions.edit.submit': 'Save changes',
  'sessions.edit.submitting': 'Saving...',
  'sessions.edit.timeHelp':
    'The closing time must be after the opening time and still in the future.',
  'sessions.edit.openLockedTitle': 'This session is open',
  'sessions.edit.openLockedDescription':
    'The title, opening time and location are locked. Only the closing time can be changed.',
  'sessions.edit.participantsUnchanged':
    'Participant criteria and the participant list remain unchanged by this update.',
  'sessions.edit.unavailableTitle': 'This session cannot be edited',
  'sessions.edit.backToDetail': 'Back to session details',

  // ---- Session form ----
  'sessions.form.title': 'Session title',
  'sessions.form.heading': 'Create a new attendance session',
  'sessions.form.description':
    'Configure GPS range, time and applicable participants',
  'sessions.form.close': 'Close the create-session dialog',
  'sessions.form.locationSection': 'GPS coordinates & radius',
  'sessions.form.locationHelp':
    'Enter coordinates directly or use your current location, then fine-tune them on the map.',
  'sessions.form.locationReady': 'Location ready',
  'sessions.form.openDate': 'Open date',
  'sessions.form.openClock': 'Open time of day',
  'sessions.form.closeDate': 'Close date',
  'sessions.form.closeClock': 'Close time of day',
  'sessions.form.titlePlaceholder': 'E.g. Morning shift attendance',
  'sessions.form.titleRequired': 'Please enter a session title.',
  'sessions.form.latitude': 'Latitude',
  'sessions.form.latitudeRequired':
    'Please enter a latitude or use the current location.',
  'sessions.form.latitudeInvalid': 'Latitude must be between -90 and 90.',
  'sessions.form.longitude': 'Longitude',
  'sessions.form.longitudeRequired':
    'Please enter a longitude or use the current location.',
  'sessions.form.longitudeInvalid': 'Longitude must be between -180 and 180.',
  'sessions.form.radius': 'Radius (m)',
  'sessions.form.radiusRequired': 'Please enter a radius.',
  'sessions.form.radiusInvalid': 'Radius must be a positive number.',
  'sessions.form.openTime': 'Open time',
  'sessions.form.timeSection': 'Session time',
  'sessions.form.closeTime': 'Close time',
  'sessions.form.openTimeRequired': 'Please choose the open time.',
  'sessions.form.closeTimeRequired': 'Please choose the close time.',
  'sessions.form.timeRangeInvalid':
    'The end time must be after the start time.',
  'sessions.form.participantCodes': 'Allowed participant codes',
  'sessions.form.participantCodesHint': 'Separate codes with commas',
  'sessions.form.participantCodesRequired':
    'Please select at least one participant criterion.',
  'sessions.form.participantCodesValid': '{count} valid codes',
  'sessions.form.useCurrentLocation': 'Use current location',
  'sessions.form.locationSuccess': 'Current coordinates captured successfully.',
  'sessions.form.locationError': 'Unable to get the current location.',
  'sessions.form.locationPermissionDenied':
    'Location permission was denied by the browser.',
  'sessions.form.locationUnavailable':
    'The device cannot determine a location right now.',
  'sessions.form.locationTimeout':
    'Getting the location took too long, please retry.',
  'sessions.form.submit': 'Create attendance session',
  'sessions.form.submitting': 'Creating...',
  'sessions.form.cancel': 'Cancel',

  // ---- Create-session wizard (`/sessions/new` page) ----
  'sessions.form.step.details.title': 'Session details',
  'sessions.form.step.details.description': 'Title, location and time',
  'sessions.form.step.participants.title': 'Participants',
  'sessions.form.step.participants.description':
    'Participant codes allowed to check in',
  'sessions.form.next': 'Continue',
  'sessions.form.back': 'Back',
  'sessions.form.locationModeLabel': 'Location entry mode',
  'sessions.form.locationMode.map': 'Pick on map',
  'sessions.form.locationMode.manual': 'Enter coordinates',
  'sessions.form.locating': 'Locating your current position...',
  'sessions.form.mapNeedsCoordinates':
    'Enter valid coordinates and a radius, or use your current location before opening the map.',
  'sessions.form.mapHint':
    'Drag the blue dot to move the center, drag the dot on the circle edge to resize the radius.',
  'sessions.form.participantsStepNote':
    'Select by unit, tag or code. Include and exclude rules can be combined.',
  'sessions.form.participantHeading': 'Who can check in?',
  'sessions.form.editDetails': 'Edit session details',
  'sessions.form.draftSummary': 'Session summary',
  'sessions.form.draftSummaryHint': 'Updates as you type',
  'sessions.form.participantsNextHint':
    'Next, choose participants by unit, tag or individual code.',
  'sessions.form.notSet': 'Not set',
  'sessions.form.untitled': 'Untitled session',

  'sessions.form.pickLocationTitle': 'Pick location on map',
  'sessions.form.confirmLocation': 'Confirm',
  'sessions.form.openMap': 'Pick on map',
  'sessions.form.geolocationPermissionDenied':
    'Location access permission was denied',
  'sessions.form.geolocationUnavailable':
    'Unable to determine your current location',
  'sessions.form.geolocationTimeout':
    'Timed out while retrieving your location',
  'sessions.form.unitInclude': 'Đơn vị (bao gồm)',
  'sessions.form.unitIncludeHint':
    'Nhập ID đơn vị, cách nhau dấu phẩy. VD: 1, 2, 3',
  'sessions.form.unitExclude': 'Đơn vị (loại trừ)',
  'sessions.form.unitExcludeHint': 'Nhập ID đơn vị cần loại trừ',
  'sessions.form.tagInclude': 'Tag (bao gồm)',
  'sessions.form.tagIncludeHint': 'Nhập ID tag, cách nhau dấu phẩy',
  'sessions.form.tagExclude': 'Tag (loại trừ)',
  'sessions.form.tagExcludeHint': 'Nhập ID tag cần loại trừ',
  'sessions.form.codeInclude': 'Mã người tham gia (bao gồm)',
  'sessions.form.codeIncludeHint': 'Mỗi dòng 1 mã, VD: 20210001, 20210002',
  'sessions.form.codeExclude': 'Mã người tham gia (loại trừ)',
  'sessions.form.codeExcludeHint': 'Mỗi dòng 1 mã cần loại trừ',

  'sessions.card.edit': 'Edit',
  'sessions.card.cancel': 'Cancel session',
  'sessions.card.cancelling': 'Cancelling...',
  'sessions.card.cancelConfirm': 'Cancel this session? It cannot be reopened.',
  'sessions.cancelSuccess': 'Session cancelled',
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
  'sessionDetail.autoRefresh': 'Auto refresh',
  'sessionDetail.autoRefreshAria': 'Turn automatic refresh on or off',
  'sessionDetail.autoRefreshIntervalAria':
    'Minutes between automatic refreshes',
  'sessionDetail.minutes': 'min',
  'sessionDetail.refreshError':
    'Unable to reload the participant list. Please try again.',
  'sessionDetail.emptyParticipants':
    'There is no participant in this attendance session yet.',
  'sessionDetail.plannedParticipantsNote':
    'Planned participants based on the current criteria; this list may change before roster initialization.',
  'sessionDetail.emptyPlannedParticipants':
    'No participants match the current criteria.',
  'sessionDetail.participantCode': 'Participant code',
  'sessionDetail.present': 'Checked in',
  'sessionDetail.absent': 'Not checked in',
  'sessionDetail.late': 'Late',
  'sessionDetail.excused': 'Excused',
  // ---- Units ----
  'units.title': 'Units',
  'units.description':
    'Manage the unit tree: browse list and tree, create and update units.',
  'units.treeTitle': 'Unit tree',
  'units.treeSubtitle': 'Hierarchy from the backend API',
  'units.listTitle': 'Unit list',
  'units.listSubtitle': 'Every unit currently on the system',
  'units.create': 'Create unit',
  'units.edit': 'Edit unit',
  'units.name': 'Unit name',
  'units.namePlaceholder': 'E.g. Operations team',
  'units.nameRequired': 'Please enter a unit name',
  'units.parent': 'Parent unit',
  'units.root': 'Root unit (no parent)',
  'units.children': 'child units',
  'units.empty': 'No units yet.',
  'units.treeEmpty': 'The unit tree is empty.',
  'units.loadError': 'Unable to load the unit list.',
  'units.treeLoadError': 'Unable to load the unit tree.',
  'units.searchPlaceholder': 'Search by unit name...',
  'units.searchEmpty': 'No unit matches the search keyword.',
  'units.cancel': 'Cancel',
  'units.save': 'Save changes',
  'units.creating': 'Creating...',
  'units.saving': 'Saving...',
  'units.createSuccess': 'Unit created successfully.',
  'units.updateSuccess': 'Unit updated successfully.',
  'units.createError': 'Unable to create the unit.',
  'units.updateError': 'Unable to update the unit.',
  'units.collapse': 'Collapse',
  'units.expand': 'Expand',
  'units.level': 'Level {level}',
  'units.editUnit': 'Edit unit {name}',
  'units.nameTooLong': 'Unit name must be at most {max} characters',
  'units.nameLength': '{current}/{max} characters',
  'units.noChanges': 'No changes yet',
  'units.error.notFound': 'Unit not found.',
  'units.error.parentNotFound': 'Parent unit does not exist.',
  'units.error.selfReference': 'A unit cannot be its own parent.',
  'units.error.cycleDetected':
    'A unit cannot be moved under one of its descendants.',
  'units.error.hierarchyCorrupted': 'The current unit tree contains a cycle.',
  'units.error.hasChildren': 'The unit still has child units.',
  // ---- Tags ----
  'tags.title': 'Tags',
  'tags.create': 'Create tag',
  'tags.name': 'Tag name',
  'tags.namePlaceholder': 'E.g. K16-IT',
  'tags.nameRequired': 'Please enter a tag name',
  'tags.nameTooLong': 'Tag name must be at most {max} characters',
  'tags.nameLength': '{current}/{max} characters',
  'tags.empty': 'No tags yet.',
  'tags.loadError': 'Unable to load the tag list.',
  'tags.createError': 'Unable to create the tag.',
  'tags.createSuccess': 'Tag created successfully.',
  'tags.delete': 'Delete',
  'tags.deleteTitle': 'Delete tag',
  'tags.deleteConfirm':
    'Delete tag “{name}”? Its assignments will be removed as well.',
  'tags.deleteError': 'Unable to delete the tag.',
  'tags.deleteSuccess': 'Tag deleted.',
  'tags.manageUsers': 'Manage users',
  'tags.users': 'Users in tag',
  'tags.usersEmpty': 'This tag is not assigned to any user yet.',
  'tags.userIdFallback': 'ID {id}',
  'tags.assignUser': 'Assign user',
  'tags.unassignUser': 'Remove from tag',
  'tags.userIdLabel': 'User ID',
  'tags.userIdPlaceholder': 'Enter a user ID, e.g. 12',
  'tags.userIdInvalid': 'Please enter a user ID as a positive integer',
  'tags.assignmentLoadError': 'Unable to load the tag user list.',
  'tags.assignmentError': 'Unable to update the tag assignment.',
  'tags.directoryLoadError': 'Unable to load the user list.',
  'tags.retry': 'Retry',
  'tags.cancel': 'Cancel',
  'tags.confirmDelete': 'Delete tag',
  'tags.creating': 'Creating...',
  'tags.deleting': 'Deleting...',
  'tags.loading': 'Loading tags...',
  'tags.closePanel': 'Close the user management panel',
  'tags.refreshError':
    'The change was saved but the tag list could not be reloaded.',
  'tags.error.validation': 'The submitted data is not valid.',
  'tags.error.unauthorized': 'Your session has expired.',
  'tags.error.forbidden': 'You do not have permission for this tag.',
  'tags.error.notFound': 'Tag not found.',
  'tags.error.conflict': 'The action conflicts with the current data.',
  'tags.error.tooManyRequests': 'Too many requests, please try again later.',
  'tags.error.internal': 'The server hit an error, please try again later.',
  'tags.error.unknown': 'Something went wrong, please try again.',

  // ---- Đăng nhập ----
  'login.title': 'GPS Attendance System',
  'login.heading': 'Sign in to your account',
  'login.subtitle': 'Welcome back! Please enter your details.',
  'login.username.label': 'Username',
  'login.username.placeholder': 'Enter username or student ID',
  'login.username.required': 'Please enter username or student ID',
  'login.password.label': 'Password',
  'login.password.required': 'Please enter password',
  'login.password.show': 'Show password',
  'login.password.hide': 'Hide password',
  'login.rememberMe': 'Remember this device',
  'login.forgotPassword': 'Forgot password?',
  'login.forgotPasswordHint':
    'Please contact the administrator to reset your password.',
  'login.submit': 'Sign in',
  'login.submitting': 'Signing in...',
  'login.success': 'Signed in successfully!',
  'login.footer': 'GPS Attendance System',
  'login.theme.light': 'Light mode',
  'login.theme.dark': 'Dark mode',
  'login.theme.toggleToLight': 'Switch to light mode',
  'login.theme.toggleToDark': 'Switch to dark mode',
  'login.theme.titleLight': 'Switch to light appearance',
  'login.theme.titleDark': 'Switch to dark appearance',
  'login.error.invalidCredentials': 'Invalid username or password',
  'login.error.accountNotLinked': 'Account not linked',
  'login.error.roleNotAllowed': 'You do not have permission to access',
  'login.error.generic': 'Sign in failed',
} as const;
