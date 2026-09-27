import { setStored, getStored, deleteStored } from './storage';

const TOKEN_KEY = 'accessToken';
let token: string | null = null;

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
