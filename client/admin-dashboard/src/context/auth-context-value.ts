import { createContext } from 'react';

import type { LoginRequest, UserProfileResponse } from '@gps-attendance/shared';

/**
 * Hợp đồng dữ liệu và hành vi dùng chung của AuthContext.
 *
 * File này tách context object/type khỏi AuthProvider để file provider chỉ
 * export component, tương thích với Fast Refresh và rule
 * `react-refresh/only-export-components`.
 */
export interface AuthContextValue {
  user: UserProfileResponse | null;
  isLoading: boolean;
  login: (request: LoginRequest, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
}

/** Context được AuthProvider cung cấp cho toàn bộ admin dashboard. */
export const AuthContext = createContext<AuthContextValue | null>(null);
