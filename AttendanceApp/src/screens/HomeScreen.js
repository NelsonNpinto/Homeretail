import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Circle, Marker } from 'react-native-maps';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI } from '../services/api';
import {
  requestLocationPermission, getCurrentPosition,
  watchPosition, clearWatch, isInsideGeofence,
} from '../services/geofence';
import { Colors, Shadows } from '../theme';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [todayRecord, setTodayRecord] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [insideZone, setInsideZone] = useState(false);
  const [loading, setLoading] = useState(true);
  const watchId = useRef(null);
  const autoActioned = useRef({ checkedIn: false, checkedOut: false });

  const geofence = user?.geofence;
  const hasGeofence = geofence?.latitude && geofence?.longitude;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await attendanceAPI.status();
      setTodayRecord(res.data.record);
      if (res.data.record?.checkIn && !res.data.record?.checkOut) {
        autoActioned.current.checkedIn = true;
      }
    } catch {}
  }, []);

  useEffect(() => {
    const init = async () => {
      const granted = await requestLocationPermission();
      if (!granted) Alert.alert('Permission Required', 'Location permission needed for geofencing');
      await fetchStatus();
      setLoading(false);
      if (granted) {
        try { const coords = await getCurrentPosition(); setUserLocation(coords); } catch {}
        watchId.current = watchPosition((pos) => {
          const coords = pos.coords;
          setUserLocation(coords);
          if (!hasGeofence) return;
          const inside = isInsideGeofence(coords.latitude, coords.longitude, geofence.latitude, geofence.longitude, geofence.radius);
          setInsideZone(inside);
          handleAutoAttendance(inside, coords);
        });
      }
    };
    init();
    return () => { if (watchId.current !== null) clearWatch(watchId.current); };
  }, [hasGeofence]);

  const handleAutoAttendance = async (inside, coords) => {
    try {
      if (inside && !autoActioned.current.checkedIn) {
        autoActioned.current.checkedIn = true;
        await attendanceAPI.checkIn({ latitude: coords.latitude, longitude: coords.longitude });
        await fetchStatus();
      } else if (!inside && autoActioned.current.checkedIn && !autoActioned.current.checkedOut) {
        autoActioned.current.checkedOut = true;
        await attendanceAPI.checkOut({ latitude: coords.latitude, longitude: coords.longitude });
        await fetchStatus();
      }
    } catch {}
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={styles.greeting}>Good day, {user?.name}</Text>
          <Text style={styles.date}>{new Date().toDateString()}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Status Card */}
      <View style={[styles.statusCard, insideZone ? styles.cardIn : styles.cardOut]}>
        <View style={[styles.statusDot, { backgroundColor: insideZone ? Colors.success : Colors.error }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.statusLabel}>Zone Status</Text>
          <Text style={[styles.statusValue, { color: insideZone ? Colors.success : Colors.error }]}>
            {insideZone ? 'Inside Attendance Zone' : 'Outside Attendance Zone'}
          </Text>
          <Text style={styles.statusSub}>
            {hasGeofence ? `Zone radius: ${geofence.radius}m` : 'No geofence configured — visit Settings'}
          </Text>
        </View>
      </View>

      {/* Today Attendance */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Attendance</Text>
        <View style={styles.timeRow}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>Check In</Text>
            <Text style={styles.timeValue}>{formatTime(todayRecord?.checkIn)}</Text>
          </View>
          <View style={styles.timeDivider} />
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>Check Out</Text>
            <Text style={styles.timeValue}>{formatTime(todayRecord?.checkOut)}</Text>
          </View>
        </View>
        <View style={styles.autoNoteRow}>
          <Text style={styles.autoNote}>Attendance recorded automatically via geofence</Text>
        </View>
      </View>

      {/* Map */}
      {userLocation && (
        <View style={styles.mapCard}>
          <Text style={styles.cardTitle}>Live Location</Text>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}>
            <Marker coordinate={{ latitude: userLocation.latitude, longitude: userLocation.longitude }} title="You" pinColor={Colors.primary} />
            {hasGeofence && (
              <>
                <Marker coordinate={{ latitude: geofence.latitude, longitude: geofence.longitude }} title="Office" pinColor={Colors.error} />
                <Circle
                  center={{ latitude: geofence.latitude, longitude: geofence.longitude }}
                  radius={geofence.radius}
                  fillColor="rgba(239,145,33,0.12)"
                  strokeColor={Colors.primary}
                  strokeWidth={2}
                />
              </>
            )}
          </MapView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.pageBg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.pageBg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingBottom: 16, backgroundColor: Colors.cardBg,
    ...Shadows.cardSmall,
  },
  greeting: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  date: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  logoutBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1.5, borderColor: Colors.borderMedium,
  },
  logoutText: { color: Colors.textMuted, fontWeight: '600', fontSize: 13 },
  statusCard: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, marginTop: 16, borderRadius: 16, padding: 18,
    borderWidth: 1,
  },
  cardIn: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  cardOut: { backgroundColor: Colors.errorBg, borderColor: '#fecaca' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 14, marginTop: 2 },
  statusLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  statusValue: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  statusSub: { fontSize: 12, color: Colors.textMuted },
  card: {
    backgroundColor: Colors.cardBg, marginHorizontal: 16, marginBottom: 16,
    borderRadius: 16, padding: 20, ...Shadows.cardSmall,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  timeBlock: { flex: 1, alignItems: 'center' },
  timeLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 6, fontWeight: '500' },
  timeValue: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  timeDivider: { width: 1, height: 48, backgroundColor: Colors.borderSubtle },
  autoNoteRow: {
    marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: Colors.borderSubtle,
  },
  autoNote: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
  mapCard: {
    backgroundColor: Colors.cardBg, marginHorizontal: 16, marginBottom: 28,
    borderRadius: 16, padding: 16, ...Shadows.cardSmall,
  },
  map: { height: 220, borderRadius: 12 },
});
