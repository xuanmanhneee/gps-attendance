import { setStored, getStored, deleteStored } from './storage';

const DEV_MODE_KEY = 'devMode';
const MOCK_LOCATION_KEY = 'devMockLocation';

// Cache trong bộ nhớ (giống token.ts) để sau lần khôi phục đầu tiên đọc được
// ngay (đồng bộ) mà không cần await.
let devMode = false;
let mockLocationForced = false;

export function getDevMode() {
  return devMode;
}

/** Cờ này được đọc bởi platform adapter lúc dựng payload điểm danh. */
export function isMockLocationForced() {
  return mockLocationForced;
}

export async function restoreDevMode() {
  const [mode, mock] = await Promise.all([
    getStored(DEV_MODE_KEY),
    getStored(MOCK_LOCATION_KEY),
  ]);

  devMode = mode === 'true';
  mockLocationForced = mock === 'true';

  return devMode;
}

export async function setDevMode(enabled: boolean) {
  devMode = enabled;

  if (!enabled) {
    // Tắt dev mode thì bỏ luôn override, tránh việc điểm danh thật bị ép
    // mock location mà người dùng không biết.
    await setMockLocationForced(false);
    // Xoá hẳn key để không để lại rác trong secure storage.
    await deleteStored(DEV_MODE_KEY);
    return;
  }

  await setStored(DEV_MODE_KEY, 'true');
}

/**
 * Ép `isMockLocation = true` trong payload điểm danh để thử nhánh server từ
 * chối (REJECTED / MOCK_LOCATION) mà không cần app giả lập GPS.
 */
export async function setMockLocationForced(enabled: boolean) {
  mockLocationForced = enabled;

  if (enabled) {
    await setStored(MOCK_LOCATION_KEY, 'true');
    return;
  }

  await deleteStored(MOCK_LOCATION_KEY);
}
