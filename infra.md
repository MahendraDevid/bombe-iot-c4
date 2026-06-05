# Struktur Database Firebase Realtime Database

## users

Menyimpan informasi pengguna aplikasi.

### Contoh

```json
{
  "uid_001": {
    "name": "Mahendra",
    "email": "mahendra@gmail.com"
  }
}
```

### Field

| Field | Tipe | Keterangan |
|---------|---------|---------|
| name | String | Nama pengguna |
| email | String | Email pengguna |

---

## devices

Menyimpan informasi perangkat IoT yang terdaftar.

### Contoh

```json
{
  "device_001": {
    "name": "ESP32 Fire Detector",
    "owner_uid": "uid_001",
    "camera_enabled": true,
    "sprinkler_enabled": true,
    "is_active": true
  }
}
```

### Field

| Field | Tipe | Keterangan |
|---------|---------|---------|
| name | String | Nama perangkat |
| owner_uid | String | UID pemilik perangkat |
| camera_enabled | Boolean | Status kamera |
| sprinkler_enabled | Boolean | Status sprinkler |
| is_active | Boolean | Status perangkat |

---

## device_members

Menentukan pengguna yang memiliki akses terhadap perangkat.

### Contoh

```json
{
  "device_001": {
    "uid_001": true,
    "uid_002": true
  }
}
```

### Field

| Field | Tipe | Keterangan |
|---------|---------|---------|
| uid_xxx | Boolean | Menandakan user memiliki akses |

---

## sensor_realtime

Menyimpan data terbaru yang dikirim oleh ESP32 secara realtime.

### Contoh

```json
{
  "device_001": {
    "gas_value": 350,
    "fire_detected": true,
    "fire_type": "normal_fire",
    "confidence": 0.92,
    "status": "AMAN",
    "buzzer": false,
    "relay": false,
    "updated_at": "2026-06-05T20:00:00"
  }
}
```

### Field

| Field | Tipe | Keterangan |
|---------|---------|---------|
| gas_value | Integer | Nilai sensor MQ2 |
| fire_detected | Boolean | Status deteksi api |
| fire_type | String | Jenis api hasil klasifikasi |
| confidence | Float | Tingkat keyakinan model AI |
| status | String | Status sistem |
| buzzer | Boolean | Status buzzer |
| relay | Boolean | Status relay/pompa |
| updated_at | String | Waktu pembaruan data |

---

## event_logs

Menyimpan riwayat kejadian yang terdeteksi sistem.

### Contoh

```json
{
  "device_001": {
    "log_001": {
      "gas_value": 850,
      "fire_detected": true,
      "fire_type": "fire_hazard",
      "confidence": 0.96,
      "status": "BAHAYA",
      "photo_url": "https://...",
      "timestamp": "2026-06-05T20:00:00"
    }
  }
}
```

### Field

| Field | Tipe | Keterangan |
|---------|---------|---------|
| gas_value | Integer | Nilai sensor MQ2 saat kejadian |
| fire_detected | Boolean | Status deteksi api |
| fire_type | String | Hasil klasifikasi AI |
| confidence | Float | Tingkat keyakinan model |
| status | String | Status sistem saat kejadian |
| photo_url | String | URL foto dari ESP32-CAM |
| timestamp | String | Waktu kejadian |

---

# Klasifikasi Api (fire_type)

## no_fire

Tidak terdapat api.

### Contoh

- Ruangan normal
- Tidak ada sumber api

---

## normal_fire

Api normal yang terkontrol.

### Contoh

- Api kompor
- Lilin
- Api pembakaran kecil yang aman

---

## fire_hazard

Api yang terindikasi sebagai kebakaran.

### Contoh

- Api membesar
- Api menyebar
- Api tidak terkontrol

---

# Status Sistem

## AMAN

### Kondisi

- Tidak ada api
- Api normal dan gas rendah

### Aksi

- Buzzer OFF
- Relay OFF
- Pompa OFF

---

## WASPADA

### Kondisi

- Api normal terdeteksi
- Nilai gas mulai meningkat

### Aksi

- Notifikasi dikirim
- Monitoring lebih lanjut
- Pompa OFF

---

## BAHAYA

### Kondisi

- Terdeteksi fire_hazard
- Nilai gas tinggi
- Potensi kebakaran

### Aksi

- Buzzer ON
- Relay ON
- Pompa Air ON
- Notifikasi ke pengguna

---

# Decision Engine (Processing Layer)

Decision Engine berjalan pada ESP32 sebagai Processing Layer.

### Rule Dasar

```text
IF fire_type = no_fire
    THEN status = AMAN

IF fire_type = normal_fire
   AND gas_value < 500
    THEN status = AMAN

IF fire_type = normal_fire
   AND gas_value >= 500
    THEN status = WASPADA

IF fire_type = fire_hazard
    THEN status = BAHAYA
```

### Output

```text
Status Sistem
↓
Kontrol Buzzer
↓
Kontrol Relay/Pompa
↓
Kirim Data ke Firebase
↓
Kirim Notifikasi ke Aplikasi
```

---

# Arsitektur 3-Tier IoT

## Tier 1 – Sensing Layer

Perangkat yang mengumpulkan data:

- Sensor MQ2 (Gas)
- ESP32-CAM (Deteksi Api)

Output:

```text
Data Sensor + Citra
```

---

## Tier 2 – Processing Layer

Perangkat yang memproses data dan mengambil keputusan:

- ESP32 Dev Module
- Model AI (Edge Impulse)
- Decision Engine

Fungsi:

- Klasifikasi api
- Analisis nilai gas
- Menentukan status sistem
- Mengontrol buzzer
- Mengontrol relay
- Mengontrol pompa air

---

## Tier 3 – Application Layer

Layanan monitoring dan penyimpanan data:

- MQTT Broker
- Firebase Realtime Database
- Firebase Storage
- Smartphone Application

Fungsi:

- Penyimpanan data realtime
- Penyimpanan histori kejadian
- Penyimpanan foto
- Pengiriman notifikasi
- Monitoring sistem