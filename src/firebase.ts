import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCQZpR0XjSVTfbR4kpsT-x9KPMyr9igjMU",
  authDomain: "nexa-growth-studio.firebaseapp.com",
  databaseURL: "https://nexa-growth-studio-default-rtdb.firebaseio.com",
  projectId: "nexa-growth-studio",
  storageBucket: "nexa-growth-studio.firebasestorage.app",
  messagingSenderId: "1041308945872",
  appId: "1:1041308945872:web:9ed3b79b0df00cc857fdd5",
  measurementId: "G-1PPCHGHWH7"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export { app as firebaseApp };
