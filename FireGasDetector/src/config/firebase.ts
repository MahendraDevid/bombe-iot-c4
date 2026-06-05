import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

function requireEnv(key: keyof NodeJS.ProcessEnv): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(
      `Environment variable "${key}" belum diisi. Periksa file .env Anda.`,
    );
  }

  return value;
}

const firebaseConfig = {
  apiKey: requireEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: 'bombeiotc4.firebaseapp.com',
  projectId: 'bombeiotc4',
  storageBucket: 'bombeiotc4.firebasestorage.app',
  messagingSenderId: '614987403428',
  appId: requireEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
  databaseURL: 'https://bombeiotc4-default-rtdb.firebaseio.com',
};

const app = initializeApp(firebaseConfig);

// getAuth() di React Native otomatis memakai AsyncStorage untuk persistensi sesi.
export const auth = getAuth(app);
export const database = getDatabase(app);

export default app;
