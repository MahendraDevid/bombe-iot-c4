# Konteks Pembaruan Integrasi Proyek - Kelompok 4

## Perubahan Sistem Terbaru:
1. ESP32-CAM sekarang mengirimkan payload JSON tambahan bernama `image_base64` yang berisi data gambar berformat string teks panjang ketika kondisi "BAHAYA".
2. Ukuran paket data MQTT sekarang jauh lebih besar dari sebelumnya (bisa mencapai ~6 KB hingga ~8 KB).

## Target Tugas untuk Cursor AI:
Tolong perbarui file `bridge.js` agar memiliki kemampuan berikut:
1. Menangani payload berukuran besar (menghindari error out of memory saat melakukan parsing string JSON).
2. Meneruskan seluruh properti termasuk string `image_base64` secara utuh menggunakan HTTP PUT ke Firebase Realtime Database.

## Referensi Struktur JSON Baru dari MQTT:
{
  "gas_value": 0,
  "fire_detected": true,
  "fire_type": "flame",
  "confidence": 0.85,
  "status": "BAHAYA",
  "buzzer": true,
  "relay": true,
  "image_base64": "/9j/4AAQSkZJRgABAQEASABIAAD...",
  "updated_at": "2026-06-07T23:45:00"
}