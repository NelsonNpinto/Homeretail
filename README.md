# Attendance System with Geofencing

React Native CLI app + Node.js backend for automatic attendance tracking via geofencing.

## Architecture

```
attendance-backend/   Node.js + Express + MongoDB
AttendanceApp/        React Native CLI
```

## Backend Setup

```bash
cd attendance-backend
npm install
# Edit .env — set MONGO_URI and JWT_SECRET
npm run dev
```

**API Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/signup | Register |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user |
| GET | /api/attendance/status | Today's record |
| POST | /api/attendance/checkin | Manual check-in |
| POST | /api/attendance/checkout | Manual check-out |
| GET | /api/attendance/history | Last 30 days |
| GET | /api/settings/geofence | Get geofence |
| PUT | /api/settings/geofence | Update geofence |

## Frontend Setup

```bash
# Init React Native project first:
npx react-native init AttendanceApp
# Then copy src/ App.js into it and install deps:

cd AttendanceApp
npm install \
  @react-native-async-storage/async-storage \
  @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs \
  react-native-screens react-native-safe-area-context \
  react-native-maps \
  react-native-geolocation-service \
  react-native-permissions \
  axios

# iOS
cd ios && pod install && cd ..
npx react-native run-ios

# Android
npx react-native run-android
```

**For Android emulator**, `API_BASE_URL` in `src/services/api.js` uses `10.0.2.2` (points to host machine localhost).
**For iOS simulator**, change to `localhost`.
**For real device**, use your machine's LAN IP.

## Screens

- **Login / Signup** — auth screens
- **Home** — live geofence status, today's check-in/out times, live map
- **History** — last 30 days attendance records
- **Settings** — tap map to set office location, pick zone radius (50m–1km)

## Geofencing Logic

- App watches GPS every 10s / 10m movement
- Enters zone → auto check-in (once per day)
- Leaves zone → auto check-out
- Uses Haversine formula for distance calculation
- Circle rendered on map shows exact zone

## Android Permissions (AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

## iOS Permissions (Info.plist)

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Used for geofence-based attendance tracking</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Used for background geofence-based attendance tracking</string>
```
