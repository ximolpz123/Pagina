import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, PlusCircle, User, Moon, Sun, BookOpen, Bell, ScanLine } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeToUserActiveReservations } from '../bookService.js';
import './Navbar.css';

const Navbar = () => {
  const { currentUser } = useAuth();
  const isLibrarian = currentUser?.email === 'bibliotecario@santotomas.cl';
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [activeReservations, setActiveReservations] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    if (currentUser?.email && !isLibrarian) {
      const unsub = subscribeToUserActiveReservations(currentUser.email, setActiveReservations);
      return () => unsub();
    }
  }, [currentUser, isLibrarian]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

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

  return (
    <nav className="bottom-navbar">
      <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
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

      {!isLibrarian && (
        <div className="nav-item" ref={notifRef} style={{ position: 'relative' }} onClick={() => setShowNotifications(!showNotifications)}>
          <div style={{ position: 'relative' }}>
            <Bell className="nav-icon" />
            {dueSoon.length > 0 && (
              <span style={{ position: 'absolute', top: '-5px', right: '-5px', backgroundColor: '#ef4444', color: 'white', fontSize: '0.6rem', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {dueSoon.length}
              </span>
            )}
          </div>
          <span className="nav-label">Alertas</span>

          {showNotifications && (
            <div className="notifications-popup glass-panel" style={{ position: 'absolute', bottom: '100%', right: '0', marginBottom: '15px', width: '280px', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', zIndex: 100, boxShadow: '0 -4px 15px rgba(0,0,0,0.2)', textAlign: 'left', cursor: 'default' }} onClick={e => e.stopPropagation()}>
              <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '5px' }}>Notificaciones</h4>
              {dueSoon.length > 0 ? (
                dueSoon.map(res => {
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
                })
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>No tienes libros por vencer pronto. ¡Todo al día! 🎉</p>
              )}
            </div>
          )}
        </div>
      )}

      <button className="nav-item theme-toggle" onClick={() => setIsDark(!isDark)}>
        {isDark ? <Sun className="nav-icon" /> : <Moon className="nav-icon" />}
        <span className="nav-label">{isDark ? 'Claro' : 'Oscuro'}</span>
      </button>
    </nav>
  );
};

export default Navbar;