import { getApps, initializeApp } from "firebase/app";
import * as auth from "firebase/auth";
import * as database from "firebase/database";

const { getAuth } = auth as any;
const { getDatabase } = database as any;

export const firebaseDatabaseUrl = "https://koerperkarte-default-rtdb.europe-west1.firebasedatabase.app";

const firebaseConfig = {
  apiKey: "AIzaSyB6aSjbGA4lLWNAxN7IeWItjK2xYTGTx5s",
  authDomain: "koerperkarte.firebaseapp.com",
  databaseURL: firebaseDatabaseUrl,
  projectId: "koerperkarte",
  storageBucket: "koerperkarte.firebasestorage.app",
  messagingSenderId: "1052880918256",
  appId: "1:1052880918256:web:aa00bca40bd643f69d9435"
};

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const realtimeDb = getDatabase(firebaseApp);
export const firebaseAuth = getAuth(firebaseApp);