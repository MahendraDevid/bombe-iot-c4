const mqtt = require('mqtt');
const axios = require('axios');

// Hubungkan ke Broker HiveMQ Publik
const mqttClient = mqtt.connect('mqtt://broker.hivemq.com:1883');

// URL Firebase Realtime Database kelompok kalian
const firebaseURL = 'https://bombeiotc4-default-rtdb.asia-southeast1.firebasedatabase.app/sensor_realtime/device_001.json';

mqttClient.on('connect', () => {
    console.log('🔄 Jembatan Terhubung ke HiveMQ Broker...');
    mqttClient.subscribe('home/safety/device_001', (err) => {
        if (!err) console.log('📥 Sukses mendengarkan topik: home/safety/device_001');
    });
});

// Setiap ada data masuk dari MQTT Explorer, langsung oper ke Firebase
mqttClient.on('message', async (topic, message) => {
    try {
        const payloadString = message.toString('utf-8');
        const payload = JSON.parse(payloadString);

        // Menghindari log string base64 yang sangat panjang ke terminal untuk mencegah Lag/OOM
        const logPayload = { ...payload };
        if (logPayload.image_base64) {
            logPayload.image_base64 = `[BASE64_DATA_TRUNCATED] (Len: ${logPayload.image_base64.length})`;
        }
        console.log(`📩 Menerima Paket dari MQTT:`, logPayload);

        // PUT akan menimpa data lama di Firebase
        // Gunakan maxBodyLength & maxContentLength Infinity untuk menghindari limit payload Axios
        await axios.put(firebaseURL, payload, {
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });
        console.log('✅ Data Sukses Diteruskan ke Firebase Console!');
    } catch (error) {
        console.error('❌ Gagal mengoper data:', error.message);
    }
});