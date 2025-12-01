// src/api/axios.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// envs (Expo PUBLIC)
const mobileEnv = process.env.EXPO_PUBLIC_API_MOBILE || 'http://10.0.2.2:8000';
const pcEnv = process.env.EXPO_PUBLIC_API_PC || 'http://127.0.0.1:8000';
const targetEnv = (process.env.EXPO_PUBLIC_API_TARGET || 'auto').toLowerCase();

function decideRawBase() {
  if (targetEnv === 'mobile') return mobileEnv;
  if (targetEnv === 'pc') return pcEnv;
  // auto:
  if (Platform.OS === 'android') return mobileEnv; // emulator
  if (Platform.OS === 'web') return pcEnv;        // browser
  return pcEnv;
}

const rawBase = decideRawBase();
const trimmed = rawBase.replace(/\/+$/, '');
const baseURL = trimmed.includes('/api') ? trimmed : `${trimmed}/api`;

console.log('[axios] resolved baseURL =', baseURL, 'Platform=', Platform.OS);

const api = axios.create({
  baseURL,
  timeout: 15000,
  // If you later use cookie-based auth for web, you may need withCredentials true
  // withCredentials: Platform.OS === 'web', 
});

// attach token
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('userToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

export default api;
