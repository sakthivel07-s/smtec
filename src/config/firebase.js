import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCAf0NE4ZuUg8h4HKcVc5DD8tAIg4xbfaM",
  authDomain: "smtec-9b0af.firebaseapp.com",
  projectId: "smtec-9b0af",
  storageBucket: "smtec-9b0af.firebasestorage.app",
  messagingSenderId: "5029205260",
  appId: "1:5029205260:web:6cd0f566c2075cb84ee529"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
