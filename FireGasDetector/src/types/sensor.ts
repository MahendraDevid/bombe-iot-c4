export type FireType = 'no_fire' | 'smoke' | 'flame' | string;

export type SensorStatus = 'AMAN' | 'WASPADA' | 'BAHAYA' | string;

export interface SensorData {
  gas_value: number;
  fire_detected: boolean;
  fire_type: FireType;
  confidence: number;
  status: SensorStatus;
  buzzer: boolean;
  relay: boolean;
  updated_at: string;
}
