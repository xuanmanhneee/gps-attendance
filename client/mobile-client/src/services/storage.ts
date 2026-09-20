import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Web chỉ dùng để dev/test nhanh, không phải target chính thức của app.
// expo-secure-store không hỗ trợ web nên fallback tạm sang localStorage.
export async function setStored(key: string, value: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function getStored(key: string) {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

export async function deleteStored(key: string) {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
