import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, RefreshControl, Platform, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Circle, Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { useAuth } from '../context/AuthContext';
import { settingsAPI } from '../services/api';
import { getCurrentPosition, requestLocationPermission } from '../services/geofence';
import { Colors, Shadows } from '../theme';

const RADIUS_OPTIONS = [50, 100, 200, 300, 500, 1000];

export default function SettingsScreen() {
  const { user, updateUser } = useAuth();
  const geofence = user?.geofence;
  const insets = useSafeAreaInsets();

  const [radius, setRadius] = useState(geofence?.radius || 100);
  const [center, setCenter] = useState(
    geofence?.latitude ? { latitude: geofence.latitude, longitude: geofence.longitude } : null
  );
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRadius(user?.geofence?.radius || 100);
    setCenter(user?.geofence?.latitude ? { latitude: user.geofence.latitude, longitude: user.geofence.longitude } : null);
    setRefreshing(false);
  }, [user]);

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const granted = await requestLocationPermission();
      if (!granted) { Alert.alert('Permission denied', 'Location permission is required'); return; }
      const coords = await getCurrentPosition();
      const region = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      };
      setCenter({ latitude: coords.latitude, longitude: coords.longitude });
      mapRef.current?.animateToRegion(region, 800);
    } catch (err) {
      console.log('[SETTINGS] location error:', err);
      Alert.alert('Error', 'Could not get current location. Make sure location is enabled.');
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    if (!center) { Alert.alert('No location', 'Set zone center before saving'); return; }
    setSaving(true);
    try {
      const res = await settingsAPI.updateGeofence({ latitude: center.latitude, longitude: center.longitude, radius });
      updateUser({ geofence: res.data.geofence });
      Alert.alert('Saved', 'Geofence updated successfully');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.cardBg} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
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
        <View style={[styles.pageHeader, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.pageTitle}>Geofence Settings</Text>
          <Text style={styles.pageSubtitle}>Define your office zone for automatic attendance</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Office Location</Text>
          <Text style={styles.sectionHint}>Tap anywhere on the map to place the zone center</Text>
          <MapView
            ref={mapRef}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
            style={styles.map}
            showsUserLocation={true}
            showsMyLocationButton={false}
            initialRegion={{
              latitude: center?.latitude || 37.78825,
              longitude: center?.longitude || -122.4324,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onPress={e => setCenter(e.nativeEvent.coordinate)}>
            {center && (
              <>
                <Marker coordinate={center} title="Office" pinColor={Colors.error} />
                <Circle
                  center={center}
                  radius={radius}
                  fillColor="rgba(239,145,33,0.12)"
                  strokeColor={Colors.primary}
                  strokeWidth={2}
                />
              </>
            )}
          </MapView>
          <TouchableOpacity
            style={styles.locBtn}
            onPress={useCurrentLocation}
            disabled={locating}
            activeOpacity={0.7}>
            {locating
              ? <ActivityIndicator color={Colors.primary} size="small" />
              : <Text style={styles.locBtnText}>Use Current Location</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Zone Radius</Text>
          <View style={styles.radiusGrid}>
            {RADIUS_OPTIONS.map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.chip, radius === r && styles.chipActive]}
                onPress={() => setRadius(r)}
                activeOpacity={0.7}>
                <Text style={[styles.chipText, radius === r && styles.chipTextActive]}>
                  {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.selectedRow}>
            <Text style={styles.selectedLabel}>Selected radius</Text>
            <Text style={styles.selectedValue}>{radius} meters</Text>
          </View>
        </View>

        {center && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Zone Center Coordinates</Text>
            <View style={styles.coordRow}>
              <View style={styles.coordBlock}>
                <Text style={styles.coordLabel}>Latitude</Text>
                <Text style={styles.coordValue}>{center.latitude.toFixed(6)}</Text>
              </View>
              <View style={styles.coordDivider} />
              <View style={styles.coordBlock}>
                <Text style={styles.coordLabel}>Longitude</Text>
                <Text style={styles.coordValue}>{center.longitude.toFixed(6)}</Text>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={save}
          disabled={saving}
          activeOpacity={0.8}>
          {saving
            ? <ActivityIndicator color={Colors.textWhite} />
            : <Text style={styles.saveBtnText}>Save Geofence</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.pageBg },
  container: { flex: 1 },
  pageHeader: {
    paddingHorizontal: 24, paddingBottom: 16,
    backgroundColor: Colors.cardBg, ...Shadows.cardSmall,
  },
  pageTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  pageSubtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  card: {
    backgroundColor: Colors.cardBg, marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, padding: 18, ...Shadows.cardSmall,
  },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  sectionHint: { fontSize: 12, color: Colors.textMuted, marginBottom: 12 },
  map: { height: 240, borderRadius: 12 },
  locBtn: {
    marginTop: 12, padding: 12, backgroundColor: Colors.pageBg,
    borderRadius: 10, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.primary,
  },
  locBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  radiusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 100,
    borderWidth: 1.5, borderColor: Colors.borderMedium, backgroundColor: Colors.inputBg,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.textMuted, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: Colors.textWhite },
  selectedRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.borderSubtle,
  },
  selectedLabel: { fontSize: 13, color: Colors.textMuted },
  selectedValue: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  coordRow: { flexDirection: 'row', marginTop: 8 },
  coordBlock: { flex: 1, alignItems: 'center' },
  coordDivider: { width: 1, backgroundColor: Colors.borderSubtle },
  coordLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  coordValue: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  saveBtn: {
    backgroundColor: Colors.primary, marginHorizontal: 16, marginTop: 16,
    borderRadius: 14, padding: 16, alignItems: 'center', ...Shadows.cardSmall,
  },
  saveBtnText: { color: Colors.textWhite, fontWeight: '700', fontSize: 16 },
});
