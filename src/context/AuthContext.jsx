import React, { useContext, useState, useEffect, createContext } from 'react';
import { auth } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !user.displayName) {
        // Detectar nombre a partir del correo (ej: tomas.hujo@... -> Tomas Hujo)
        const namePart = user.email.split('@')[0];
        const formattedName = namePart.split('.').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        
        try {
          await updateProfile(user, { displayName: formattedName });
          // Actualizamos el usuario en el estado con el nuevo nombre
          setCurrentUser({ ...user, displayName: formattedName });
        } catch (e) {
          console.error("Error auto-generando nombre:", e);
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(user);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = { currentUser, signup, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}