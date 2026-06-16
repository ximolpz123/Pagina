import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [userName, setUserName] = useState('');
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDoc = null;
    
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Usamos onSnapshot para detectar cambios de nombre/rol en tiempo real
        unsubscribeDoc = onSnapshot(doc(db, 'users', currentUser.uid), (userDoc) => {
          if (userDoc.exists()) {
            const data = userDoc.data();
            setRole(data.role);
            setUserName(data.name || currentUser.email);
            setPermissions(data.permissions || null);
          } else {
            if (currentUser.email.toLowerCase() === 'admin@gmail.com') {
              setRole('admin');
              setUserName(currentUser.email);
              setPermissions(null);
            } else {
              // Si no existe el documento y no es el admin base, significa que fue eliminado
              signOut(auth);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Error al obtener datos del usuario:", error);
          setRole('analista');
          setUserName(currentUser.email);
          setLoading(false);
        });
      } else {
        setUser(null);
        setRole(null);
        setUserName('');
        setPermissions(null);
        setLoading(false);
        if (unsubscribeDoc) unsubscribeDoc();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, userName, permissions, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
