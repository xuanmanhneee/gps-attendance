import { createContext } from 'react';
import type { LoginRequest, UserProfileDto } from '@gps-attendance/shared';

export interface AuthContextValue {
  user: UserProfileDto | null;
  isLoading: boolean;
  login: (request: LoginRequest) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
