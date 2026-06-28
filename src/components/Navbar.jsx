import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, PlusCircle, User, Moon, Sun, Contrast, BookOpen, Bell, ScanLine } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeToUserActiveReservations, subscribeToUserNotifications, markNotificationAsRead, subscribeToLibrarianNotifications } from '../bookService.js';
import './Navbar.css';

const Navbar = () => {
  const { currentUser } = useAuth();
  const isLibrarian = currentUser?.email === 'bibliotecario@santotomas.cl';
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });
  const [activeReservations, setActiveReservations] = useState([]);
  const [stockNotifications, setStockNotifications] = useState([]);
  const [librarianNotifications, setLibrarianNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    if (currentUser?.email) {
      if (isLibrarian) {
        const unsub = subscribeToLibrarianNotifications(setLibrarianNotifications);
        return () => unsub();
      } else {
        const unsub1 = subscribeToUserActiveReservations(currentUser.email, setActiveReservations);
        const unsub2 = subscribeToUserNotifications(currentUser.email, setStockNotifications);
        return () => { unsub1(); unsub2(); };
      }
    }
  }, [currentUser, isLibrarian]);

  useEffect(() => {
    if (theme === 'dark' || theme === 'high-contrast') {
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('high-contrast');
    else setTheme('light');
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDueSoonReservations = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return activeReservations.filter(res => {
      if (!res.returnDate) return false;
      const returnD = new Date(res.returnDate + 'T00:00:00');
      const diffTime = returnD - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 2;
    });
  };

  const dueSoon = getDueSoonReservations();
  const totalAlerts = isLibrarian ? librarianNotifications.length : (dueSoon.length + stockNotifications.length);

  const handleMarkAsRead = async (e, notifId) => {
    e.stopPropagation();
    await markNotificationAsRead(notifId);
  };

  return (
    <nav className="bottom-navbar" aria-label="Navegación principal">
      <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} aria-label="Ir a Inicio">
        <Home className="nav-icon" />
        <span className="nav-label">Inicio</span>
      </NavLink>
      
      <NavLink to="/busqueda" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <Search className="nav-icon" />
        <span className="nav-label">Buscar</span>
      </NavLink>
      
      {isLibrarian && (
        <>
          <NavLink to="/bibliotecario" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <PlusCircle className="nav-icon" />
            <span className="nav-label">Añadir</span>
          </NavLink>
          <NavLink to="/escaner" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <ScanLine className="nav-icon" />
            <span className="nav-label">Escáner</span>
          </NavLink>
        </>
      )}

      {!isLibrarian && (
        <NavLink to="/perfil" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          {currentUser?.photoURL ? (
            <img src={currentUser.photoURL} alt="Perfil" className="nav-icon nav-avatar" style={{width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover'}} />
          ) : (
            <User className="nav-icon" />
          )}
          <span className="nav-label">{currentUser?.displayName ? currentUser.displayName.split(' ')[0] : 'Perfil'}</span>
        </NavLink>
      )}

      <div className="nav-item" ref={notifRef} style={{ position: 'relative' }} onClick={() => setShowNotifications(!showNotifications)}>
        <div style={{ position: 'relative' }}>
          <Bell className="nav-icon" />
          {totalAlerts > 0 && (
            <span style={{ position: 'absolute', top: '-5px', right: '-5px', backgroundColor: '#ef4444', color: 'white', fontSize: '0.6rem', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {totalAlerts}
            </span>
          )}
        </div>
        <span className="nav-label">Alertas</span>

          {showNotifications && (
            <div className="notifications-popup glass-panel" style={{ position: 'absolute', bottom: '100%', right: '0', marginBottom: '15px', width: '280px', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', zIndex: 100, boxShadow: '0 -4px 15px rgba(0,0,0,0.2)', textAlign: 'left', cursor: 'default' }} onClick={e => e.stopPropagation()}>
              <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '5px' }}>Notificaciones</h4>
              
            {totalAlerts === 0 && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                {isLibrarian ? 'No hay solicitudes de stock pendientes. 🎉' : 'No tienes libros por vencer pronto ni alertas. ¡Todo al día! 🎉'}
              </p>
            )}

            {!isLibrarian && dueSoon.length > 0 && dueSoon.map(res => {
              const returnD = new Date(res.returnDate + 'T00:00:00');
              const today = new Date();
              today.setHours(0,0,0,0);
              const diffDays = Math.ceil((returnD - today) / (1000 * 60 * 60 * 24));
              return (
                <div key={res.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(150,150,150,0.1)', fontSize: '0.85rem' }}>
                  <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>⚠️ Vence {diffDays === 0 ? 'HOY' : `en ${diffDays} día(s)`}</span>
                  <p style={{ margin: '3px 0 0 0', color: 'var(--text-main)' }}>Debes devolver <strong>{res.bookTitle}</strong> para evitar penalizaciones.</p>
                </div>
              );
            })}

            {!isLibrarian && stockNotifications.length > 0 && stockNotifications.map(notif => (
              <div key={notif.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(150,150,150,0.1)', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>🎉 ¡Ya disponible!</span>
                  <button onClick={(e) => handleMarkAsRead(e, notif.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>&times;</button>
                </div>
                <p style={{ margin: '3px 0 0 0', color: 'var(--text-main)' }}>El libro <strong>{notif.bookTitle}</strong> vuelve a tener stock. ¡Ve a reservarlo!</p>
              </div>
            ))}

            {isLibrarian && librarianNotifications.length > 0 && librarianNotifications.map(notif => (
              <div key={notif.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(150,150,150,0.1)', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>📚 Solicitud de Stock</span>
                  <button onClick={(e) => handleMarkAsRead(e, notif.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>&times;</button>
                </div>
                <p style={{ margin: '3px 0 0 0', color: 'var(--text-main)' }}>
                  El usuario <strong>{notif.userEmail}</strong> solicita que repongas stock del libro: <strong>{notif.bookTitle}</strong>.
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <button 
        className="nav-item theme-toggle" 
        onClick={cycleTheme}
        aria-label={`Cambiar tema. Tema actual: ${theme}`}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        {theme === 'light' && <Moon className="nav-icon" />}
        {theme === 'dark' && <Contrast className="nav-icon" />}
        {theme === 'high-contrast' && <Sun className="nav-icon" />}
        <span className="nav-label">
          {theme === 'light' ? 'Oscuro' : theme === 'dark' ? 'Contraste' : 'Claro'}
        </span>
      </button>
    </nav>
  );
};

export default Navbar;