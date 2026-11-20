import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import {
  ApiError,
  isRetryableApiError,
  type UserProfileResponse,
} from '@gps-attendance/shared';

import { authApi } from '../api/auth.api';
import { userApi } from '../api/user.api';
import {
  removeTokens,
  restoreTokens,
  saveTokens,
  subscribeToAccessToken,
} from '../services/token';

interface AuthContextType {
  user: UserProfileResponse | null;
  token: string | null;
  isLoading: boolean;
  isSignedIn: boolean;
  /** Còn token nhưng chưa tải được profile (lỗi tạm thời): hiện màn hình thử lại. */
  profileUnavailable: boolean;
  retryProfile: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: UserProfileResponse | null) => void;
}

const PROFILE_MAX_ATTEMPTS = 3;
const PROFILE_BASE_DELAY_MS = 500;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Backoff luỹ thừa + jitter để nhiều máy cùng mở app lúc server quá tải
// không thử lại đồng loạt.
const backoffDelay = (attempt: number) =>
  PROFILE_BASE_DELAY_MS * 2 ** attempt * (0.5 + Math.random());

function isAuthFailure(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileUnavailable, setProfileUnavailable] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAccessToken((accessToken) => {
      setToken(accessToken);
      if (!accessToken) {
        setUser(null);
        setProfileUnavailable(false);
      }
    });

    void restoreAuth();
    return unsubscribe;
  }, []);

  // Chỉ lỗi xác thực (401 sau khi refresh thất bại, http.ts đã xoá token) mới
  // làm mất phiên. Lỗi tạm thời / lỗi khác giữ token và báo "chưa tải được
  // profile" để người dùng thử lại.
  const loadProfile = async () => {
    setProfileUnavailable(false);

    for (let attempt = 0; attempt < PROFILE_MAX_ATTEMPTS; attempt++) {
      try {
        setUser(await userApi.getProfile());
        return;
      } catch (error) {
        console.error('Failed to load profile:', error);

        if (isAuthFailure(error)) {
          await removeTokens();
          setToken(null);
          setUser(null);
          return;
        }

        const canRetry =
          isRetryableApiError(error) && attempt < PROFILE_MAX_ATTEMPTS - 1;
        if (!canRetry) {
          setProfileUnavailable(true);
          return;
        }
        await sleep(backoffDelay(attempt));
      }
    }
  };

  const restoreAuth = async () => {
    try {
      const savedTokens = await restoreTokens();
      if (savedTokens) await loadProfile();
    } finally {
      setIsLoading(false);
    }
  };

  const retryProfile = async () => {
    setIsLoading(true);
    try {
      await loadProfile();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);

      const response = await authApi.login(username, password);

      await saveTokens(response);

      const profile = await userApi.getProfile();
      setUser(profile);
    } catch (error) {
      console.error('Login error:', error);

      await removeTokens();
      setToken(null);
      setUser(null);

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);

      // TODO(tạm thời): chưa gọi endpoint logout (/v0/user/auth/logout).
      // Bật lại khi cần: await authApi.logout();

      setUser(null);
      setToken(null);

      await removeTokens();
    } catch (error) {
      console.error('Logout error:', error);

      setUser(null);
      setToken(null);

      await removeTokens();

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isSignedIn: !!user,
    profileUnavailable,
    retryProfile,
    login,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
