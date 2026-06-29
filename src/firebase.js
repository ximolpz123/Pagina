import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";

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
export const auth = getAuth(app);

// Configurar persistencia de sesión para que el usuario se desconecte al cerrar el navegador
setPersistence(auth, browserSessionPersistence).catch((error) => {
  console.error("Error configurando la persistencia de sesión:", error);
});