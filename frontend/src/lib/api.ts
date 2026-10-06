import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const productionBuild = process.env.NODE_ENV === 'production';

function resolveApiUrl() {
  if (!configuredApiUrl) {
    if (productionBuild) {
      throw new Error('EXPO_PUBLIC_API_URL debe configurarse para compilar el frontend de producción.');
    }
    return 'http://localhost:3000';
  }

  let url: URL;
  try {
    url = new URL(configuredApiUrl);
  } catch {
    throw new Error('EXPO_PUBLIC_API_URL debe ser una URL absoluta válida.');
  }

  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error('EXPO_PUBLIC_API_URL debe contener solo el origen del backend, sin /api/v1.');
  }
  if (productionBuild && url.protocol !== 'https:') {
    throw new Error('EXPO_PUBLIC_API_URL debe usar HTTPS en producción.');
  }

  return url.origin;
}

export const API_URL = resolveApiUrl();
export const STORAGE_KEY = 'nodara:session';

export type ApiEnvelope<T> = { success: boolean; message: string; data: T; error?: { code: string; details: unknown[] } };

const unauthorizedListeners = new Set<() => void>();

export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly code?: string) {
    super(message);
  }
}

export function subscribeToUnauthorized(handler: () => void) {
  unauthorizedListeners.add(handler);
  return () => {
    unauthorizedListeners.delete(handler);
  };
}

function makeIdempotencyKey() {
  const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `erp-${randomPart}`;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string, notifyUnauthorized = true): Promise<T> {
  const headers = new Headers(options.headers);
  const method = (options.method ?? 'GET').toUpperCase();

  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (method !== 'GET' && method !== 'HEAD' && !headers.has('idempotency-key')) {
    headers.set('idempotency-key', makeIdempotencyKey());
  }
  if (token) headers.set('Authorization', 'Bearer ' + token);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success) {
    if (response.status === 401) {
      await clearSessionToken();
      if (notifyUnauthorized) unauthorizedListeners.forEach((handler) => handler());
    }
    throw new ApiError(response.status, payload?.message ?? 'No se pudo completar la solicitud', payload?.error?.code);
  }
  return payload.data;
}

export async function readSessionToken() {
  return Platform.OS === 'web'
    ? AsyncStorage.getItem(STORAGE_KEY)
    : SecureStore.getItemAsync(STORAGE_KEY);
}

export async function writeSessionToken(token: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(STORAGE_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, token);
}

export async function clearSessionToken() {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}

