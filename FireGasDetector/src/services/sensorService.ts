import { off, onValue, ref } from 'firebase/database';

import { database } from '../config/firebase';
import { SensorData } from '../types/sensor';

export const SENSOR_DEVICE_PATH = 'sensor_realtime/device_001';

export function subscribeToSensor(
  onData: (data: SensorData | null) => void,
  onError?: (error: Error) => void,
): () => void {
  const sensorRef = ref(database, SENSOR_DEVICE_PATH);

  const unsubscribe = onValue(
    sensorRef,
    (snapshot) => {
      onData(snapshot.val() as SensorData | null);
    },
    (error) => {
      onError?.(error);
    },
  );

  return () => {
    unsubscribe();
    off(sensorRef);
  };
}
