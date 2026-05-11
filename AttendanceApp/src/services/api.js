import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_URL_IOS, API_URL_ANDROID } from '@env';

const BASE_URL = Platform.OS === 'android'
  ? (API_URL_ANDROID || 'http://10.0.2.2:3001/api')
  : (API_URL_IOS || 'http://localhost:3001/api');

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const attendanceAPI = {
  checkIn: (location) => api.post('/attendance/checkin', location),
  checkOut: (location) => api.post('/attendance/checkout', location),
  status: () => api.get('/attendance/status'),
  history: () => api.get('/attendance/history'),
};

export const settingsAPI = {
  getGeofence: () => api.get('/settings/geofence'),
  updateGeofence: (data) => api.put('/settings/geofence', data),
};

export default api;
