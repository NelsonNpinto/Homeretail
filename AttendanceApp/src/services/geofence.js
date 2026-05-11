import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid } from 'react-native';

// Haversine formula — returns distance in meters
export const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const isInsideGeofence = (userLat, userLon, centerLat, centerLon, radius) => {
  return getDistance(userLat, userLon, centerLat, centerLon) <= radius;
};

export const requestLocationPermission = async () => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  // iOS: permission requested automatically on first getCurrentPosition call
  return true;
};

export const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  });

export const watchPosition = (callback) =>
  Geolocation.watchPosition(callback, null, {
    enableHighAccuracy: true,
    distanceFilter: 10,
    interval: 10000,
    fastestInterval: 5000,
  });

export const clearWatch = (id) => Geolocation.clearWatch(id);
