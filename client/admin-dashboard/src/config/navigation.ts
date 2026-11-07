import type { TranslationKey } from '../i18n/translation-keys';
import { ROUTE_PATHS } from '../routes/paths';
import type { UserRole } from '../types/user-role';

export type NavigationItemId =
  | 'overview'
  | 'users'
  | 'units'
  | 'tags'
  | 'attendanceSessions'
  | 'attendanceReviews'
  | 'statistics';

export type NavigationItem = {
  id: NavigationItemId;
  /** Translation key cho label menu, đồng thời dùng làm tiêu đề page. */
  labelKey: TranslationKey;
  /**
   * Translation key cho mô tả ngắn dưới tiêu đề page.
   *
   * Bỏ trống khi page tự dựng heading theo role (vd Tổng quan).
   */
  descriptionKey?: TranslationKey;
  path: string;
  roles: readonly UserRole[];
};

/**
 * Menu theo vai trò.
 *
 * `path` đồng thời là route được phép truy cập, nên menu và route không thể
 * lệch nhau. Route con (vd `/sessions/:id`) kế thừa quyền của route cha.
 */
export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    id: 'overview',
    labelKey: 'navigation.overview',
    path: ROUTE_PATHS.overview,
    roles: ['admin'],
  },
  {
    id: 'users',
    labelKey: 'navigation.users',
    descriptionKey: 'pages.users.description',
    path: ROUTE_PATHS.users,
    roles: ['admin'],
  },
  {
    id: 'units',
    labelKey: 'navigation.units',
    descriptionKey: 'pages.units.description',
    path: ROUTE_PATHS.units,
    roles: ['admin'],
  },
  {
    id: 'tags',
    labelKey: 'navigation.tags',
    descriptionKey: 'pages.tags.description',
    path: ROUTE_PATHS.tags,
    roles: ['admin'],
  },
  {
    id: 'attendanceSessions',
    labelKey: 'navigation.attendanceSessions',
    descriptionKey: 'sessions.page.description',
    path: ROUTE_PATHS.attendanceSessions,
    roles: ['organizer'],
  },
  {
    id: 'attendanceReviews',
    labelKey: 'navigation.attendanceReviews',
    descriptionKey: 'pages.attendanceReviews.description',
    path: ROUTE_PATHS.attendanceReviews,
    roles: ['organizer'],
  },
  {
    id: 'statistics',
    labelKey: 'navigation.statistics',
    descriptionKey: 'pages.statistics.description',
    path: ROUTE_PATHS.statistics,
    roles: ['organizer'],
  },
];

export const NAVIGATION_GROUP_LABEL_KEYS: Record<UserRole, TranslationKey> = {
  admin: 'navigation.group.admin',
  organizer: 'navigation.group.organizer',
};

export const DEFAULT_ROUTE_BY_ROLE: Record<UserRole, string> = {
  admin: ROUTE_PATHS.overview,
  organizer: ROUTE_PATHS.attendanceSessions,
};

/**
 * Trang mặc định của vai trò. Nhận `string` vì vai trò từ API có thể nằm ngoài
 * `UserRole` (vd `participant` không dùng dashboard này); vai trò lạ về trang login.
 */
export const getDefaultRoute = (role: string | undefined): string =>
  role !== undefined && role in DEFAULT_ROUTE_BY_ROLE
    ? DEFAULT_ROUTE_BY_ROLE[role as UserRole]
    : ROUTE_PATHS.login;

export const getNavigationForRole = (
  role: UserRole,
): readonly NavigationItem[] =>
  NAVIGATION_ITEMS.filter((item) => item.roles.includes(role));

/** Route con của `itemPath` cũng được coi là đang active. */
export const isNavigationItemActive = (
  itemPath: string,
  pathname: string,
): boolean => pathname === itemPath || pathname.startsWith(`${itemPath}/`);

export const findNavigationItem = (
  pathname: string,
): NavigationItem | undefined =>
  NAVIGATION_ITEMS.find((item) => isNavigationItemActive(item.path, pathname));

export const isKnownPath = (pathname: string): boolean =>
  findNavigationItem(pathname) !== undefined;

export const isPathAllowedForRole = (
  pathname: string,
  role: UserRole,
): boolean =>
  getNavigationForRole(role).some((item) =>
    isNavigationItemActive(item.path, pathname),
  );
