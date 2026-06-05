require('dotenv').config();

const express = require('express');
const mqtt = require('mqtt');
const axios = require('axios');

// ─── Konfigurasi ─────────────────────────────────────────────────────────────

const CONFIG = {
  mqtt: {
    broker: process.env.MQTT_BROKER || 'mqtt://broker.hivemq.com:1883',
    topic: process.env.MQTT_TOPIC || 'home/safety/device_001',
    clientId: process.env.MQTT_CLIENT_ID || `bombe-bridge-${Date.now()}`,
  },
  firebase: {
    databaseUrl:
      process.env.FIREBASE_DATABASE_URL ||
      'https://bombeiotc4-default-rtdb.asia-southeast1.firebasedatabase.app',
    deviceId: process.env.DEVICE_ID || 'device_001',
    apiKey:
      process.env.FIREBASE_API_KEY ||
      process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
      '',
    email: process.env.FIREBASE_EMAIL || '',
    password: process.env.FIREBASE_PASSWORD || '',
  },
  server: {
    port: Number(process.env.PORT) || 3000,
  },
};

const FIREBASE_SENSOR_PATH = `sensor_realtime/${CONFIG.firebase.deviceId}`;

const PLACEHOLDER_VALUES = new Set([
  'your_api_key_here',
  'your_password_here',
  'your_email_here',
]);

function isPlaceholder(value) {
  return !value || PLACEHOLDER_VALUES.has(value.trim());
}

// ─── State bridge (untuk endpoint monitoring) ──────────────────────────────

const bridgeState = {
  startedAt: new Date().toISOString(),
  mqttConnected: false,
  lastMqttMessageAt: null,
  lastFirebaseSyncAt: null,
  messagesReceived: 0,
  messagesForwarded: 0,
  errors: 0,
  lastError: null,
  lastPayload: null,
};

let firebaseIdToken = null;
let firebaseTokenExpiresAt = 0;

// ─── Normalisasi & validasi payload sensor ─────────────────────────────────

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  if (typeof value === 'number') return value !== 0;
  return fallback;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nowIsoTimestamp() {
  return new Date().toISOString().slice(0, 19);
}

function normalizeSensorPayload(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Payload MQTT harus berupa objek JSON');
  }

  const gasValue = toNumber(raw.gas_value, 0);
  const fireDetected = toBoolean(raw.fire_detected, false);
  const fireType =
    typeof raw.fire_type === 'string' && raw.fire_type.trim()
      ? raw.fire_type.trim()
      : 'no_fire';
  const confidence = toNumber(raw.confidence, 0);
  const status =
    typeof raw.status === 'string' && raw.status.trim()
      ? raw.status.trim().toUpperCase()
      : 'AMAN';

  return {
    gas_value: Math.round(gasValue),
    fire_detected: fireDetected,
    fire_type: fireType,
    confidence: Math.min(1, Math.max(0, confidence)),
    status,
    buzzer: toBoolean(raw.buzzer, false),
    relay: toBoolean(raw.relay, false),
    updated_at:
      typeof raw.updated_at === 'string' && raw.updated_at.trim()
        ? raw.updated_at.trim()
        : nowIsoTimestamp(),
  };
}

// ─── Firebase Auth (REST API) ────────────────────────────────────────────────

async function refreshFirebaseToken() {
  const { apiKey, email, password } = CONFIG.firebase;

  if (!apiKey || !email || !password) {
    return null;
  }

  const now = Date.now();
  if (firebaseIdToken && now < firebaseTokenExpiresAt - 60_000) {
    return firebaseIdToken;
  }

  const response = await axios.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      email,
      password,
      returnSecureToken: true,
    },
    { timeout: 10_000 },
  );

  firebaseIdToken = response.data.idToken;
  const expiresInSec = Number(response.data.expiresIn) || 3600;
  firebaseTokenExpiresAt = now + expiresInSec * 1000;

  console.log('🔐 Token Firebase berhasil diperbarui');
  return firebaseIdToken;
}

function buildFirebaseWriteUrl() {
  const base = CONFIG.firebase.databaseUrl.replace(/\/$/, '');
  return `${base}/${FIREBASE_SENSOR_PATH}.json`;
}

async function forwardToFirebase(payload) {
  const url = buildFirebaseWriteUrl();
  const token = await refreshFirebaseToken();
  const requestUrl = token ? `${url}?auth=${token}` : url;

  const response = await axios.put(requestUrl, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10_000,
  });

  return response.data;
}

// ─── MQTT Client ───────────────────────────────────────────────────────────

const mqttClient = mqtt.connect(CONFIG.mqtt.broker, {
  clientId: CONFIG.mqtt.clientId,
  clean: true,
  reconnectPeriod: 5_000,
});

mqttClient.on('connect', () => {
  bridgeState.mqttConnected = true;
  console.log(`🔄 Terhubung ke MQTT broker: ${CONFIG.mqtt.broker}`);

  mqttClient.subscribe(CONFIG.mqtt.topic, { qos: 0 }, (err) => {
    if (err) {
      bridgeState.errors += 1;
      bridgeState.lastError = err.message;
      console.error('❌ Gagal subscribe topik MQTT:', err.message);
      return;
    }
    console.log(`📥 Mendengarkan topik: ${CONFIG.mqtt.topic}`);
  });
});

mqttClient.on('reconnect', () => {
  console.log('♻️  Mencoba reconnect ke MQTT broker...');
});

mqttClient.on('close', () => {
  bridgeState.mqttConnected = false;
});

mqttClient.on('error', (err) => {
  bridgeState.errors += 1;
  bridgeState.lastError = err.message;
  console.error('❌ Error MQTT:', err.message);
});

mqttClient.on('message', async (topic, message) => {
  bridgeState.messagesReceived += 1;
  bridgeState.lastMqttMessageAt = new Date().toISOString();

  const rawText = message.toString();
  console.log(`📩 [${topic}] ${rawText}`);

  try {
    const parsed = JSON.parse(rawText);
    const payload = normalizeSensorPayload(parsed);

    await forwardToFirebase(payload);

    bridgeState.messagesForwarded += 1;
    bridgeState.lastFirebaseSyncAt = new Date().toISOString();
    bridgeState.lastPayload = payload;
    bridgeState.lastError = null;

    console.log(
      `✅ Forward ke Firebase: ${FIREBASE_SENSOR_PATH} | status=${payload.status} gas=${payload.gas_value}`,
    );
  } catch (error) {
    bridgeState.errors += 1;
    bridgeState.lastError = error.response?.data?.error || error.message;
    console.error('❌ Gagal forward ke Firebase:', bridgeState.lastError);
  }
});

// ─── Express HTTP Server (monitoring & health check) ───────────────────────

const app = express();
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    service: 'BOMBE MQTT → Firebase Bridge',
    kelompok: 4,
    deviceId: CONFIG.firebase.deviceId,
    mqttTopic: CONFIG.mqtt.topic,
    firebasePath: FIREBASE_SENSOR_PATH,
    endpoints: {
      health: '/health',
      status: '/status',
    },
  });
});

app.get('/health', (_req, res) => {
  const healthy = bridgeState.mqttConnected;
  res.status(healthy ? 200 : 503).json({
    ok: healthy,
    mqttConnected: bridgeState.mqttConnected,
    uptimeSince: bridgeState.startedAt,
  });
});

app.get('/status', (_req, res) => {
  res.json({
    ...bridgeState,
    config: {
      mqttBroker: CONFIG.mqtt.broker,
      mqttTopic: CONFIG.mqtt.topic,
      firebaseDatabaseUrl: CONFIG.firebase.databaseUrl,
      firebasePath: FIREBASE_SENSOR_PATH,
      firebaseAuthConfigured: Boolean(
        CONFIG.firebase.apiKey &&
          CONFIG.firebase.email &&
          CONFIG.firebase.password,
      ),
    },
  });
});

app.listen(CONFIG.server.port, () => {
  console.log(`🌐 HTTP server aktif di http://localhost:${CONFIG.server.port}`);
  console.log(`🎯 Target Firebase: ${buildFirebaseWriteUrl()}`);

  const authProblems = [];

  if (isPlaceholder(CONFIG.firebase.apiKey)) {
    authProblems.push(
      'FIREBASE_API_KEY masih placeholder — salin dari FireGasDetector/.env (EXPO_PUBLIC_FIREBASE_API_KEY)',
    );
  }
  if (isPlaceholder(CONFIG.firebase.email)) {
    authProblems.push('FIREBASE_EMAIL belum diisi');
  }
  if (isPlaceholder(CONFIG.firebase.password)) {
    authProblems.push(
      'FIREBASE_PASSWORD masih placeholder — isi password akun Firebase Authentication (mis. admin@gmail.com)',
    );
  }

  if (authProblems.length > 0) {
    console.warn('⚠️  Konfigurasi Firebase belum lengkap:');
    authProblems.forEach((msg) => console.warn(`   • ${msg}`));
  }
});
