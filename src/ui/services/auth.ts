import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const AUTH_TOKEN_KEY = 'auth_token';

// Use localStorage for web, SecureStore for native
const isWeb = Platform.OS === 'web';

export async function getAuthToken(): Promise<string | null> {
  try {
    if (isWeb) {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('[Auth] Помилка отримання токену:', error);
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  try {
    if (isWeb) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  } catch (error) {
    console.error('[Auth] Помилка збереження токену:', error);
    throw error;
  }
}

export async function clearAuthToken(): Promise<void> {
  try {
    if (isWeb) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('[Auth] Помилка видалення токену:', error);
  }
}

