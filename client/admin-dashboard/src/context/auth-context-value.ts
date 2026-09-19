import { createContext } from 'react';

import type { LoginRequest, UserProfileResponse } from '@gps-attendance/shared';

export interface AuthContextValue {
  user: UserProfileResponse | null;
  isLoading: boolean;
  login: (request: LoginRequest) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);