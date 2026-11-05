import type { LoginResponse } from '@gps-attendance/shared';

import { deleteStored, getStored, setStored } from './storage';

const AUTH_TOKENS_KEY = 'auth_tokens';
const LEGACY_TOKEN_KEY = 'token';

type TokenListener = (accessToken: string | null) => void;

let tokens: LoginResponse | null = null;
const listeners = new Set<TokenListener>();

function isLoginResponse(value: unknown): value is LoginResponse {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<LoginResponse>;
  return (
    typeof candidate.accessToken === 'string' &&
    candidate.accessToken.length > 0 &&
    typeof candidate.refreshToken === 'string' &&
    candidate.refreshToken.length > 0
  );
}

function notifyTokenChanged() {
  for (const listener of listeners) listener(tokens?.accessToken ?? null);
}

export async function saveTokens(value: LoginResponse): Promise<void> {
  await setStored(AUTH_TOKENS_KEY, JSON.stringify(value));
  tokens = value;
  notifyTokenChanged();
}

export function getAccessToken(): string | null {
  return tokens?.accessToken ?? null;
}

export function getRefreshToken(): string | null {
  return tokens?.refreshToken ?? null;
}

export async function restoreTokens(): Promise<LoginResponse | null> {
  const stored = await getStored(AUTH_TOKENS_KEY);

  try {
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    tokens = isLoginResponse(parsed) ? parsed : null;
  } catch {
    tokens = null;
  }

  if (!tokens && stored) await deleteStored(AUTH_TOKENS_KEY);

  // Bản cũ chỉ lưu access token nên không thể phục hồi an toàn sau khi token
  // hết hạn. Xóa key cũ để người dùng đăng nhập lại và nhận đủ cặp token.
  await deleteStored(LEGACY_TOKEN_KEY);
  notifyTokenChanged();
  return tokens;
}

export async function removeTokens(): Promise<void> {
  tokens = null;
  notifyTokenChanged();
  await Promise.all([
    deleteStored(AUTH_TOKENS_KEY),
    deleteStored(LEGACY_TOKEN_KEY),
  ]);
}

export function subscribeToAccessToken(listener: TokenListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
