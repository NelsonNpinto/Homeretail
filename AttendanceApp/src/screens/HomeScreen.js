import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView, ActivityIndicator, RefreshControl, Platform, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Circle, Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
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
  const [refreshing, setRefreshing] = useState(false);

  const watchId = useRef(null);
  const prevInsideZone = useRef(null);
  const mapRef = useRef(null);

  // Refs to avoid stale closures in the continuous watch callback
  const geofenceRef = useRef(user?.geofence);
  const hasGeofenceRef = useRef(!!(user?.geofence?.latitude && user?.geofence?.longitude));
  const todayRecordRef = useRef(null);

  const geofence = user?.geofence;
  const hasGeofence = !!(geofence?.latitude && geofence?.longitude);

  // Keep refs in sync with latest state/props
  useEffect(() => {
    geofenceRef.current = geofence;
    hasGeofenceRef.current = hasGeofence;
  }, [geofence, hasGeofence]);

  useEffect(() => {
    todayRecordRef.current = todayRecord;
  }, [todayRecord]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await attendanceAPI.status();
      setTodayRecord(res.data.record);
    } catch {}
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  }, [fetchStatus]);

  const handleAutoAttendance = useCallback(async (inside, coords) => {
    try {
      const record = todayRecordRef.current;
      if (inside) {
        // Only check in if not already checked in (or already checked out — new session)
        if (record?.checkIn && !record?.checkOut) {
          console.log('[HOME] already checked in for this session, skipping');
          return;
        }
        console.log('[HOME] entered zone — auto check-in at', coords.latitude, coords.longitude);
        await attendanceAPI.checkIn({ latitude: coords.latitude, longitude: coords.longitude });
      } else {
        // Only check out if currently checked in without a checkout
        if (!record?.checkIn || record?.checkOut) {
          console.log('[HOME] not checked in or already checked out, skipping');
          return;
        }
        console.log('[HOME] left zone — auto check-out at', coords.latitude, coords.longitude);
        await attendanceAPI.checkOut({ latitude: coords.latitude, longitude: coords.longitude });
      }
      await fetchStatus();
    } catch (err) {
      console.log('[HOME] auto attendance error:', err);
    }
  }, [fetchStatus]);

  // Animate map to follow live location
  useEffect(() => {
    if (mapRef.current && userLocation) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
    }
  }, [userLocation]);

  useEffect(() => {
    let cancelled = false;
    prevInsideZone.current = null;

    const init = async () => {
      const granted = await requestLocationPermission();
      console.log('[HOME] permission granted:', granted);
      if (!granted) Alert.alert('Permission Required', 'Location permission is needed for automatic attendance tracking');

      await fetchStatus();
      if (!cancelled) setLoading(false);

      if (!granted) return;

      try {
        const coords = await getCurrentPosition();
        console.log('[HOME] initial location:', coords.latitude, coords.longitude);
        if (!cancelled) setUserLocation(coords);
      } catch (err) {
        console.log('[HOME] initial location error:', err.message);
      }

      watchId.current = watchPosition(
        (pos) => {
          if (cancelled) return;
          const coords = pos.coords;
          setUserLocation(coords);

          const gf = geofenceRef.current;
          const gfActive = hasGeofenceRef.current;
          console.log('[HOME] watch coords:', coords.latitude, coords.longitude, 'hasGeofence:', gfActive);
          if (!gfActive || !gf) return;

          const inside = isInsideGeofence(
            coords.latitude, coords.longitude,
            gf.latitude, gf.longitude, gf.radius
          );
          console.log('[HOME] inside zone:', inside, 'prev:', prevInsideZone.current);
          setInsideZone(inside);

          if (prevInsideZone.current === null) {
            // First detection after start — check in if inside and not already checked in
            if (inside) {
              handleAutoAttendance(inside, coords);
            }
          } else if (prevInsideZone.current !== inside) {
            // Zone boundary crossed
            handleAutoAttendance(inside, coords);
          }
          prevInsideZone.current = inside;
        },
        (err) => {
          console.log('[HOME] watch error:', err.message);
        }
      );
      console.log('[HOME] watch started, id:', watchId.current);
    };

    init();
    return () => {
      cancelled = true;
      if (watchId.current !== null) {
        clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [fetchStatus, handleAutoAttendance]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.pageBg} />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.cardBg} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View>
            <Text style={styles.greeting}>Good day, {user?.name}</Text>
            <Text style={styles.date}>{new Date().toDateString()}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn} activeOpacity={0.7}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

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

        <View style={styles.mapCard}>
          <Text style={styles.cardTitle}>Live Location</Text>
          {userLocation ? (
            <MapView
              ref={mapRef}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
              style={styles.map}
              showsUserLocation={true}
              showsMyLocationButton={false}
              initialRegion={{
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}>
              <Marker
                coordinate={{ latitude: userLocation.latitude, longitude: userLocation.longitude }}
                title="You"
                pinColor={Colors.primary}
              />
              {hasGeofence && (
                <>
                  <Marker
                    coordinate={{ latitude: geofence.latitude, longitude: geofence.longitude }}
                    title="Office"
                    pinColor={Colors.error}
                  />
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
          ) : (
            <View style={styles.mapPlaceholder}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.mapPlaceholderText}>Acquiring location...</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.pageBg },
  container: { flex: 1 },
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
    margin: 16, marginTop: 16, borderRadius: 16, padding: 18, borderWidth: 1,
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
  autoNoteRow: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: Colors.borderSubtle },
  autoNote: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
  mapCard: {
    backgroundColor: Colors.cardBg, marginHorizontal: 16, marginBottom: 16,
    borderRadius: 16, padding: 16, ...Shadows.cardSmall,
  },
  map: { height: 220, borderRadius: 12 },
  mapPlaceholder: {
    height: 220, borderRadius: 12, backgroundColor: Colors.inputBg,
    justifyContent: 'center', alignItems: 'center', gap: 10,
  },
  mapPlaceholderText: { fontSize: 13, color: Colors.textMuted, marginTop: 8 },
});
