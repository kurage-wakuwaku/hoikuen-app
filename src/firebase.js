import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCURNGAN_dcOwiDV79kPaUQ7Z7XfgS2Ztc",
  authDomain: "hoikuen-app-70679.firebaseapp.com",
  projectId: "hoikuen-app-70679",
  storageBucket: "hoikuen-app-70679.firebasestorage.app",
  messagingSenderId: "514626256094",
  appId: "1:514626256094:web:3541318eb2085a22fc564f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
