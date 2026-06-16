import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBFIMom1V_WKZmQtmqqi_TYJBvWClZ780w",
  authDomain: "sistemabiblioteca-85644.firebaseapp.com",
  projectId: "sistemabiblioteca-85644",
  storageBucket: "sistemabiblioteca-85644.firebasestorage.app",
  messagingSenderId: "169557372347",
  appId: "1:169557372347:web:ed1730d63d250dcda9289e",
  measurementId: "G-C37WPX4GZ8"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);