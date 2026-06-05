# Panduan Agent: ESP32 → Firebase Realtime Database (BOMBE)

Dokumen ini untuk **agent/developer yang mengerjakan firmware ESP32**.  
Tujuan: mengirim data sensor ke path yang **sudah dibaca** oleh app React Native `FireGasDetector`.

---

## 1. Konteks sistem

| Komponen | Peran |
|----------|--------|
| **ESP32** | Baca sensor → tulis ke Firebase RTDB |
| **Firebase RTDB** | Penyimpan data real-time |
| **FireGasDetector (Expo)** | Subscribe `onValue` → tampilkan dashboard |

**Jangan ubah nama field JSON** tanpa koordinasi dengan tim app — TypeScript app memakai interface tetap.

---

## 2. Konstanta Firebase (project BOMBE)

| Konstanta | Nilai |
|-----------|--------|
| `projectId` | `bombeiotc4` |
| `databaseURL` | `https://bombeiotc4-default-rtdb.firebaseio.com` |
| `authDomain` | `bombeiotc4.firebaseapp.com` |
| `API_KEY` | Ambil dari Firebase Console → Project Settings (sama dengan `EXPO_PUBLIC_FIREBASE_API_KEY` di app) |

### Path wajib (realtime sensor)

```text
/sensor_realtime/device_001
```

**URL REST lengkap (write):**

```text
https://bombeiotc4-default-rtdb.firebaseio.com/sensor_realtime/device_001.json
```

> Ganti `device_001` hanya jika tim app setuju. Saat ini app hardcode ke `device_001` (`src/services/sensorService.ts`).

---

## 3. Format body JSON (WAJIB)

Kirim **satu objek JSON** dengan **8 field** berikut. Semua field harus ada di setiap pengiriman (gunakan `PUT` full replace) atau konsisten jika `PATCH`.

### 3.1 Schema

```json
{
  "gas_value": 0,
  "fire_detected": false,
  "fire_type": "no_fire",
  "confidence": 0.0,
  "status": "AMAN",
  "buzzer": false,
  "relay": false,
  "updated_at": "2026-06-05T20:00:00"
}
```

### 3.2 Spesifikasi field

| Field | Tipe | Wajib | Nilai / aturan |
|-------|------|-------|----------------|
| `gas_value` | `number` (integer) | Ya | Pembacaan sensor gas (ppm atau skala mentah ADC — dokumentasikan di firmware). Range disarankan: `0`–`4095` atau `0`–`1000`. |
| `fire_detected` | `boolean` | Ya | `true` jika api/flame terdeteksi, else `false`. |
| `fire_type` | `string` | Ya | Enum: `"no_fire"` \| `"smoke"` \| `"flame"`. Boleh string lain, tapi app menampilkan uppercase dengan underscore diganti spasi. |
| `confidence` | `number` (float) | Ya | `0.0` – `1.0`. Tingkat keyakinan deteksi api (dari ML/heuristic). |
| `status` | `string` | Ya | Enum: `"AMAN"` \| `"WASPADA"` \| `"BAHAYA"`. **Huruf besar.** App mengubah warna banner berdasarkan ini. |
| `buzzer` | `boolean` | Ya | `true` = buzzer aktif. |
| `relay` | `boolean` | Ya | `true` = relay aktif (mis. sprinkler/pompa). |
| `updated_at` | `string` | Ya | Timestamp **ISO 8601** tanpa timezone: `YYYY-MM-DDTHH:mm:ss`. Contoh: `"2026-06-05T20:30:45"`. |

### 3.3 Contoh payload per kondisi

**Aman (normal):**

```json
{
  "gas_value": 120,
  "fire_detected": false,
  "fire_type": "no_fire",
  "confidence": 0.12,
  "status": "AMAN",
  "buzzer": false,
  "relay": false,
  "updated_at": "2026-06-05T14:00:00"
}
```

**Waspada (gas tinggi, belum ada api):**

```json
{
  "gas_value": 650,
  "fire_detected": false,
  "fire_type": "no_fire",
  "confidence": 0.55,
  "status": "WASPADA",
  "buzzer": true,
  "relay": false,
  "updated_at": "2026-06-05T14:05:00"
}
```

**Bahaya (api terdeteksi):**

```json
{
  "gas_value": 820,
  "fire_detected": true,
  "fire_type": "flame",
  "confidence": 0.91,
  "status": "BAHAYA",
  "buzzer": true,
  "relay": true,
  "updated_at": "2026-06-05T14:06:00"
}
```

### 3.4 Logika status (disarankan — bisa disesuaikan threshold)

```text
Jika fire_detected == true ATAU fire_type != "no_fire":
    status = "BAHAYA"
    buzzer = true
    relay = true   (opsional: aktifkan sprinkler)

Else jika gas_value >= GAS_WASPADA_THRESHOLD:
    status = "WASPADA"
    buzzer = true
    relay = false

Else:
    status = "AMAN"
    buzzer = false
    relay = false
```

**Threshold contoh (kalibrasi di lapangan):**

| Konstanta | Nilai awal | Keterangan |
|-----------|------------|------------|
| `GAS_WASPADA_THRESHOLD` | `500` | Gas mulai waspada |
| `GAS_BAHAYA_THRESHOLD` | `800` | Gas sangat tinggi (bisa pakai bersama fire sensor) |

Mapping `fire_type`:

| Kondisi hardware | `fire_type` | `fire_detected` |
|------------------|-------------|-----------------|
| Tidak ada api/asap | `no_fire` | `false` |
| Sensor asap | `smoke` | `true` |
| Sensor api/flame | `flame` | `true` |

---

## 4. Cara kirim data (HTTP REST)

### 4.1 Autentikasi

Realtime Database **menolak write tanpa auth** jika rules memakai `auth != null`.

**Alur wajib:**

1. ESP login Firebase Auth (akun khusus device).
2. Ambil `idToken` dari response.
3. Setiap request write tambahkan query: `?auth=<idToken>`.

**Buat akun device di Firebase Console → Authentication → Add user:**

```text
Email:    device_001@bombe.local
Password: <password_kuat_min_6_karakter>
```

Simpan kredensial di `secrets.h` / `config.h` — **jangan commit ke Git**.

### 4.2 Login — dapat `idToken`

```http
POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}
Content-Type: application/json
```

**Body:**

```json
{
  "email": "device_001@bombe.local",
  "password": "PASSWORD_DEVICE",
  "returnSecureToken": true
}
```

**Response (ambil):**

```json
{
  "idToken": "eyJhbGciOi...",
  "refreshToken": "...",
  "expiresIn": "3600"
}
```

- Simpan `idToken` di variabel global.
- Refresh token sebelum expired (~55 menit sekali) dengan endpoint `securetoken.googleapis.com` + `refreshToken`, atau login ulang.

### 4.3 Write sensor data

```http
PUT https://bombeiotc4-default-rtdb.firebaseio.com/sensor_realtime/device_001.json?auth={idToken}
Content-Type: application/json
```

**Body:** objek JSON sesuai §3.

**Response sukses:** HTTP `200` dengan body berisi data yang ditulis.

**Alternatif partial update:**

```http
PATCH .../sensor_realtime/device_001.json?auth={idToken}
```

Hanya kirim field yang berubah — tetap pastikan app menerima objek lengkap saat dibaca (PATCH merge di RTDB).

### 4.4 Interval pengiriman

| Mode | Interval disarankan |
|------|---------------------|
| Normal (`AMAN`) | 5–10 detik |
| `WASPADA` / `BAHAYA` | 1–2 detik |

Jangan kirim lebih cepat dari 500 ms (hindari throttling / boros bandwidth).

---

## 5. Template firmware ESP32 (Arduino)

### 5.1 Dependensi

- `WiFi.h` (built-in ESP32)
- `HTTPClient.h` (built-in ESP32)
- `ArduinoJson.h` (disarankan, v6+) — optional tapi membantu

### 5.2 Struktur file

```text
firmware/
├── secrets.h          # WIFI_SSID, WIFI_PASS, DEVICE_EMAIL, DEVICE_PASS, API_KEY
├── firebase_client.h  # login(), sendSensorData()
├── sensors.h          # baca gas + flame
└── main.ino           # setup(), loop()
```

### 5.3 Pseudocode `sendSensorData`

```cpp
bool sendSensorData(const SensorPayload& p, const String& idToken) {
  String url = String(FIREBASE_DB_URL) + "?auth=" + idToken;

  // Bangun JSON manual atau pakai ArduinoJson
  String body = "{";
  body += "\"gas_value\":" + String(p.gas_value) + ",";
  body += "\"fire_detected\":" + String(p.fire_detected ? "true" : "false") + ",";
  body += "\"fire_type\":\"" + p.fire_type + "\",";
  body += "\"confidence\":" + String(p.confidence, 2) + ",";
  body += "\"status\":\"" + p.status + "\",";
  body += "\"buzzer\":" + String(p.buzzer ? "true" : "false") + ",";
  body += "\"relay\":" + String(p.relay ? "true" : "false") + ",";
  body += "\"updated_at\":\"" + p.updated_at + "\"";
  body += "}";

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  int code = http.PUT(body);
  http.end();

  return code == 200;
}
```

### 5.4 `updated_at` di ESP32

Format tanpa NTP (placeholder — **disarankan pakai NTP**):

```cpp
// Ideal: sync NTP lalu snprintf ISO 8601
// Minimal untuk tes: hardcode atau RTC
char updated_at[32];
snprintf(updated_at, sizeof(updated_at), "2026-06-05T%02d:%02d:%02d", hour, min, sec);
```

---

## 6. Database Rules (referensi)

Rules minimal agar ESP (auth) bisa write dan user app bisa read:

```json
{
  "rules": {
    "sensor_realtime": {
      "$deviceId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

**Jangan** set `.write": true` di production.

---

## 7. Path lain (opsional, bukan untuk dashboard utama)

App **saat ini hanya subscribe** `sensor_realtime/device_001`.

| Path | Fungsi | Prioritas firmware |
|------|--------|-------------------|
| `sensor_realtime/device_001` | Dashboard real-time | **WAJIB** |
| `event_logs/device_001/{logId}` | Riwayat kejadian | Opsional fase 2 |
| `devices/device_001` | Metadata device | Jangan ditulis ESP kecuali diminta |

Struktur `event_logs` (referensi):

```json
{
  "gas_value": 0,
  "fire_detected": false,
  "fire_type": "no_fire",
  "confidence": 0.0,
  "status": "AMAN",
  "photo_url": "",
  "timestamp": "2026-06-05T20:00:00"
}
```

---

## 8. Checklist verifikasi

- [ ] ESP connect WiFi
- [ ] Login Auth berhasil (`idToken` tidak kosong)
- [ ] `PUT` ke path benar → HTTP 200
- [ ] Firebase Console → RTDB → `sensor_realtime/device_001` ter-update
- [ ] App dashboard menampilkan nilai baru tanpa refresh
- [ ] Ubah `status` ke `BAHAYA` → banner merah di app
- [ ] Field boolean dikirim sebagai `true`/`false` (bukan `"true"` string di dalam tanda kutip salah)

---

## 9. Kesalahan umum

| Gejala | Penyebab | Solusi |
|--------|----------|--------|
| HTTP 401 | `idToken` invalid/expired | Login ulang / refresh token |
| HTTP 403 | Rules menolak | Pastikan akun device terdaftar & rules `auth != null` |
| App kosong | Path salah | Harus `sensor_realtime/device_001` |
| App crash parse | Tipe salah | `gas_value` number, bukan string `"120"` |
| Status tidak berubah warna | Huruf kecil | Pakai `"AMAN"` bukan `"aman"` |
| `confidence` aneh di UI | Skala salah | Kirim `0.0`–`1.0`, bukan `0`–`100` |

---

## 10. Referensi kode app (consumer)

Agent app membaca dari:

- **Path:** `sensor_realtime/device_001` → `FireGasDetector/src/services/sensorService.ts`
- **Type:** `SensorData` → `FireGasDetector/src/types/sensor.ts`
- **UI:** `FireGasDetector/src/screens/DashboardScreen.tsx`

---

## 11. Ringkasan perintah untuk agent ESP

1. Implementasi WiFi + Firebase Auth login (device account).
2. Baca sensor → hitung `status`, `fire_type`, `confidence`, `buzzer`, `relay`.
3. Bangun JSON **8 field** persis seperti §3.
4. `PUT` ke `https://bombeiotc4-default-rtdb.firebaseio.com/sensor_realtime/device_001.json?auth={idToken}`.
5. Ulangi setiap 5–10 detik (1–2 detik saat bahaya).
6. Verifikasi lewat Firebase Console + app dashboard.

**Jangan** mengubah nama field atau path tanpa update app React Native.
