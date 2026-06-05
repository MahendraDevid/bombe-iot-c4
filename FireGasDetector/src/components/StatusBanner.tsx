import { StyleSheet, Text, View } from 'react-native';

import { SensorStatus } from '../types/sensor';

interface StatusBannerProps {
  status: SensorStatus;
}

function getStatusStyle(status: SensorStatus) {
  const normalized = status.toUpperCase();

  if (normalized === 'AMAN') {
    return { backgroundColor: '#DCFCE7', color: '#166534', borderColor: '#86EFAC' };
  }

  if (normalized === 'WASPADA') {
    return { backgroundColor: '#FEF9C3', color: '#854D0E', borderColor: '#FDE047' };
  }

  return { backgroundColor: '#FEE2E2', color: '#991B1B', borderColor: '#FCA5A5' };
}

export function StatusBanner({ status }: StatusBannerProps) {
  const statusStyle = getStatusStyle(status);

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: statusStyle.backgroundColor,
          borderColor: statusStyle.borderColor,
        },
      ]}
    >
      <Text style={[styles.label, { color: statusStyle.color }]}>Status Sistem</Text>
      <Text style={[styles.status, { color: statusStyle.color }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  status: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
