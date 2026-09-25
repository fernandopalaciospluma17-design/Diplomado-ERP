import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
export const STORAGE_KEY = 'nodara:session';

export type ApiEnvelope<T> = { success: boolean; message: string; data: T; error?: { code: string; details: unknown[] } };

export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly code?: string) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success) {
    throw new ApiError(response.status, payload?.message ?? 'No se pudo completar la solicitud', payload?.error?.code);
  }
  return payload.data;
}

export async function readSessionToken() {
  return AsyncStorage.getItem(STORAGE_KEY);
}

export async function writeSessionToken(token: string) {
  await AsyncStorage.setItem(STORAGE_KEY, token);
}

export async function clearSessionToken() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
