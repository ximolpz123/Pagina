import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="bottom-navbar">
      <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">🏠</span>
        <span className="nav-label">Inicio</span>
      </NavLink>
      
      <NavLink to="/busqueda" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">🔍</span>
        <span className="nav-label">Buscar</span>
      </NavLink>
      
      <NavLink to="/bibliotecario" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">➕</span>
        <span className="nav-label">Añadir</span>
      </NavLink>

      <NavLink to="/perfil" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
        <span className="nav-icon">👤</span>
        <span className="nav-label">Perfil</span>
      </NavLink>
    </nav>
  );
};

export default Navbar;