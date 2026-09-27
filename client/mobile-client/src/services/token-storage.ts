import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';
const LAST_LOGIN_KEY = 'lastLoginAt';

// Helper bọc SecureStore để tương thích cả Web và Mobile Native
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.error(`[LocalStorage] Lỗi lấy dữ liệu ${key}:`, e);
        return null;
      }
    }
    return await SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.error(`[LocalStorage] Lỗi lưu dữ liệu ${key}:`, e);
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error(`[LocalStorage] Lỗi xóa dữ liệu ${key}:`, e);
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export async function saveToken(token: string) {
  await storage.setItem(ACCESS_TOKEN_KEY, token);
}

export async function getToken() {
  return await storage.getItem(ACCESS_TOKEN_KEY);
}

export async function removeToken() {
  await Promise.all([
    storage.deleteItem(ACCESS_TOKEN_KEY),
    storage.deleteItem(REFRESH_TOKEN_KEY),
    storage.deleteItem(USER_KEY),
    storage.deleteItem(LAST_LOGIN_KEY),
  ]);
}

export async function saveSession(
  accessToken: string,
  refreshToken: string,
  user: unknown,
  lastLoginAt: string,
) {
  await Promise.all([
    storage.setItem(ACCESS_TOKEN_KEY, accessToken),
    storage.setItem(REFRESH_TOKEN_KEY, refreshToken),
    storage.setItem(USER_KEY, JSON.stringify(user)),
    storage.setItem(LAST_LOGIN_KEY, lastLoginAt),
  ]);
}

export async function getSession() {
  const [accessToken, refreshToken, savedUser, lastLoginAt] = await Promise.all([
    storage.getItem(ACCESS_TOKEN_KEY),
    storage.getItem(REFRESH_TOKEN_KEY),
    storage.getItem(USER_KEY),
    storage.getItem(LAST_LOGIN_KEY),
  ]);

  let parsedUser = null;
  if (savedUser) {
    try {
      parsedUser = JSON.parse(savedUser);
    } catch (e) {
      console.error('[Session] Lỗi parse JSON user:', e);
    }
  }

  return {
    accessToken,
    refreshToken,
    user: parsedUser,
    lastLoginAt,
  };
}