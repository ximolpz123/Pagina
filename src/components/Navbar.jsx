import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, PlusCircle, User, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { currentUser } = useAuth();
  const isLibrarian = currentUser?.email === 'bibliotecario@santotomas.cl';
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

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
        <NavLink to="/bibliotecario" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <PlusCircle className="nav-icon" />
          <span className="nav-label">Añadir</span>
        </NavLink>
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

      <button className="nav-item theme-toggle" onClick={() => setIsDark(!isDark)}>
        {isDark ? <Sun className="nav-icon" /> : <Moon className="nav-icon" />}
        <span className="nav-label">{isDark ? 'Claro' : 'Oscuro'}</span>
      </button>
    </nav>
  );
};

export default Navbar;