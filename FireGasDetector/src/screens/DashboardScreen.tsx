import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SensorMetricCard } from '../components/SensorMetricCard';
import { StatusBanner } from '../components/StatusBanner';
import { useAuth } from '../context/AuthContext';
import { subscribeToSensor } from '../services/sensorService';
import { SensorData } from '../types/sensor';

function formatFireType(fireType: string): string {
  return fireType.replace(/_/g, ' ').toUpperCase();
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatBooleanState(value: boolean): string {
  return value ? 'AKTIF' : 'NONAKTIF';
}

export function DashboardScreen() {
  const { user, signOut } = useAuth();
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSensor(
      (data) => {
        setSensorData(data);
        setIsConnected(data !== null);
        setConnectionError(null);
      },
      (error) => {
        setConnectionError(error.message);
        setIsConnected(false);
      },
    );

    return unsubscribe;
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // Auth state listener will handle UI transition
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dashboard Sensor</Text>
          <Text style={styles.headerSubtitle}>Device: device_001</Text>
        </View>
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Keluar</Text>
        </Pressable>
      </View>

      <Text style={styles.userEmail}>{user?.email}</Text>

      <View
        style={[
          styles.connectionBadge,
          isConnected ? styles.connected : styles.disconnected,
        ]}
      >
        <Text style={styles.connectionText}>
          {isConnected ? '● Terhubung ke Firebase' : '● Menunggu data sensor...'}
        </Text>
      </View>

      {connectionError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{connectionError}</Text>
        </View>
      )}

      {sensorData ? (
        <>
          <StatusBanner status={sensorData.status} />

          <View style={styles.grid}>
            <SensorMetricCard
              label="Gas Value"
              value={`${sensorData.gas_value} ppm`}
              accentColor="#0F766E"
            />
            <SensorMetricCard
              label="Fire Type"
              value={formatFireType(sensorData.fire_type)}
              accentColor={sensorData.fire_detected ? '#DC2626' : '#1E293B'}
            />
            <SensorMetricCard
              label="Confidence"
              value={`${(sensorData.confidence * 100).toFixed(1)}%`}
              accentColor="#7C3AED"
            />
            <SensorMetricCard
              label="Buzzer"
              value={formatBooleanState(sensorData.buzzer)}
              accentColor={sensorData.buzzer ? '#DC2626' : '#64748B'}
            />
            <SensorMetricCard
              label="Relay"
              value={formatBooleanState(sensorData.relay)}
              accentColor={sensorData.relay ? '#EA580C' : '#64748B'}
            />
            <SensorMetricCard
              label="Last Update"
              value={formatDateTime(sensorData.updated_at)}
              accentColor="#1E293B"
            />
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Belum ada data sensor</Text>
          <Text style={styles.emptySubtitle}>
            Pastikan path sensor_realtime/device_001 tersedia di Firebase.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  signOutButton: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signOutText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
  },
  userEmail: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 16,
  },
  connectionBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  connected: {
    backgroundColor: '#DCFCE7',
  },
  disconnected: {
    backgroundColor: '#F1F5F9',
  },
  connectionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});
