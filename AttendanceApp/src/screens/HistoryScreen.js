import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { attendanceAPI } from '../services/api';
import { Colors, Shadows } from '../theme';

const STATUS = {
  present: { color: Colors.success, bg: '#f0fdf4', label: 'Present' },
  partial:  { color: Colors.warning, bg: '#fffbeb', label: 'Partial' },
  absent:   { color: Colors.error,   bg: Colors.errorBg, label: 'Absent' },
};

export default function HistoryScreen() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    attendanceAPI.history()
      .then(res => setRecords(res.data.records))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatTime = (d) => d
    ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  const calcDuration = (ci, co) => {
    if (!ci || !co) return '--';
    const mins = Math.round((new Date(co) - new Date(ci)) / 60000);
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.pageHeader, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.pageTitle}>Attendance History</Text>
        <Text style={styles.pageSubtitle}>Last 30 days</Text>
      </View>

      {records.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No Records</Text>
          <Text style={styles.emptySubtitle}>Your attendance history will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const s = STATUS[item.status] || STATUS.absent;
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.dateText}>{item.date}</Text>
                  <View style={[styles.badge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.timeRow}>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>Check In</Text>
                    <Text style={styles.timeValue}>{formatTime(item.checkIn)}</Text>
                  </View>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>Check Out</Text>
                    <Text style={styles.timeValue}>{formatTime(item.checkOut)}</Text>
                  </View>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>Duration</Text>
                    <Text style={styles.timeValue}>{calcDuration(item.checkIn, item.checkOut)}</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.pageBg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageHeader: {
    paddingHorizontal: 24, paddingBottom: 16,
    backgroundColor: Colors.cardBg, ...Shadows.cardSmall,
  },
  pageTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  pageSubtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted },
  card: {
    backgroundColor: Colors.cardBg, borderRadius: 16, padding: 16,
    marginBottom: 12, ...Shadows.cardSmall,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateText: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: Colors.borderSubtle, marginBottom: 12 },
  timeRow: { flexDirection: 'row' },
  timeBlock: { flex: 1 },
  timeLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '500', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  timeValue: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
});
