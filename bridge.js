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
        console.log(`📩 Menerima Paket dari MQTT: ${message.toString()}`);
        const payload = JSON.parse(message.toString());

        // PUT akan menimpa data lama di Firebase
        await axios.put(firebaseURL, payload);
        console.log('✅ Data Sukses Diteruskan ke Firebase Console!');
    } catch (error) {
        console.error('❌ Gagal mengoper data:', error.message);
    }
});