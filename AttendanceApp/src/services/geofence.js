import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid } from 'react-native';

Geolocation.setRNConfiguration({
  skipPermissionRequests: false,
  authorizationLevel: 'auto',
  locationProvider: 'auto',
});

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
  console.log('[GEO] platform:', Platform.OS);
  if (Platform.OS !== 'android') return true;

  try {
    const fineGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission Required',
        message: 'This app needs location access to automatically track your attendance based on your office zone.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    const result = fineGranted === PermissionsAndroid.RESULTS.GRANTED;
    console.log('[GEO] fine location granted:', result);
    return result;
  } catch (err) {
    console.log('[GEO] permission error:', err);
    return false;
  }
};

export const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    console.log('[GEO] trying high accuracy...');
    Geolocation.getCurrentPosition(
      (pos) => {
        console.log('[GEO] high accuracy success:', pos.coords.latitude, pos.coords.longitude);
        resolve(pos.coords);
      },
      (err) => {
        console.log('[GEO] high accuracy failed, trying network:', err.message);
        Geolocation.getCurrentPosition(
          (pos) => {
            console.log('[GEO] network location success:', pos.coords.latitude, pos.coords.longitude);
            resolve(pos.coords);
          },
          (err2) => {
            console.log('[GEO] network location failed:', err2.message);
            reject(err2);
          },
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 10000 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  });

export const watchPosition = (onSuccess, onError) =>
  Geolocation.watchPosition(
    (pos) => {
      console.log('[GEO] watch update:', pos.coords.latitude, pos.coords.longitude);
      onSuccess(pos);
    },
    (err) => {
      console.log('[GEO] watch error:', err.message);
      if (onError) onError(err);
    },
    {
      enableHighAccuracy: true,
      distanceFilter: 5,
      interval: 5000,
      fastestInterval: 3000,
      forceRequestLocation: true,
      showLocationDialog: true,
    }
  );

export const clearWatch = (id) => Geolocation.clearWatch(id);
