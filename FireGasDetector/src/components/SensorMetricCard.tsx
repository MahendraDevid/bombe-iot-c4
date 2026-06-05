import { StyleSheet, Text, View } from 'react-native';

interface SensorMetricCardProps {
  label: string;
  value: string;
  accentColor?: string;
}

export function SensorMetricCard({
  label,
  value,
  accentColor = '#1E293B',
}: SensorMetricCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 6,
    fontWeight: '500',
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
  },
});
