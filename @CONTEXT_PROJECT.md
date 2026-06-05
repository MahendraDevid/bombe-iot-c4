# Konteks Proyek IoT - Kelompok 4

## Arsitektur Sistem (Three-Tier)
- **Tier 1 (Sensing):** ESP32-CAM, Sensor MQ2, Buzzer, Relay, Pompa Sprinkler.
- **Tier 2 (Processing/Broker):** ESP32-CAM mengirim data berbasis JSON melalui MQTT Protokol ke Broker HiveMQ (`broker.hivemq.com` port `1883`) dengan topik `home/safety/device_001`.
- **Tier 3 (Application):** Firebase Realtime Database (Server: asia-southeast1) & Aplikasi Android React Native (`com.firegasdetector.app`).

## Struktur Firebase Realtime Database Target
URL Database: `https://bombeiotc4-default-rtdb.asia-southeast1.firebasedatabase.app/`
Data disimpan langsung di bawah node `sensor_realtime/device_001` dengan struktur JSON berikut:
{
  "gas_value": 150,
  "fire_detected": false,
  "fire_type": "no_fire",
  "confidence": 0.05,
  "status": "AMAN",
  "buzzer": false,
  "relay": false,
  "updated_at": "2026-06-05T23:00:47"
}

## Masalah Saat Ini
Data dari MQTT Explorer/ESP32-CAM sudah ter-publish ke HiveMQ, tetapi belum otomatis masuk ke Firebase Realtime Database karena membutuhkan script jembatan (bridge) perantara di Tier 2 ke Tier 3.