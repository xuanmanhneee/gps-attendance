import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'token';
let token: string | null = null;

// Web chỉ dùng để dev/test nhanh, không phải target chính thức của app.
// expo-secure-store không hỗ trợ web nên fallback tạm sang localStorage.
async function setStored(key: string, value: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getStored(key: string) {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteStored(key: string) {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveToken(value: string) {
  token = value;
  await setStored(TOKEN_KEY, value);
}

export function getToken() {
  return token;
}

export async function restoreToken() {
  token = await getStored(TOKEN_KEY);
  return token;
}

export async function removeToken() {
  token = null;
  await deleteStored(TOKEN_KEY);
}
