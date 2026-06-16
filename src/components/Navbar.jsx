import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Navbar = () => {
  const { user, role, userName } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      if (user) {
        // Se busca el nombre más actualizado del usuario antes de registrar el cierre de sesión
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const currentUserName = userDoc.exists() ? userDoc.data().name : userName;

        await addDoc(collection(db, 'audit_logs'), {
          user_email: user.email,
          user_name: currentUserName || user.email,
          action: 'cierre_sesion',
          status: 'exito',
          timestamp: serverTimestamp(),
        });
      }
      
      await signOut(auth);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }
  };

  return (
    <nav style={styles.nav}>
      <style>
        {`
          .nav-link {
            position: relative;
            color: rgba(255, 255, 255, 0.85);
            text-decoration: none;
            font-size: 0.95rem;
            font-weight: 500;
            letter-spacing: 0.3px;
            padding: 0.4rem 0;
            transition: color 0.3s ease;
          }
          .nav-link::after {
            content: '';
            position: absolute;
            width: 0;
            height: 2px;
            bottom: 0;
            left: 0;
            background-color: #F4B41A;
            transition: width 0.3s ease-out;
            border-radius: 2px;
          }
          .nav-link:hover {
            color: #ffffff;
          }
          .nav-link:hover::after {
            width: 100%;
          }
          
          .nav-admin-link {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            color: #F4B41A;
            text-decoration: none;
            font-size: 0.85rem;
            font-weight: 600;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            border: 1px solid rgba(244, 180, 26, 0.4);
            padding: 0.4rem 1.2rem;
            border-radius: 20px;
            transition: all 0.3s ease;
            background-color: rgba(244, 180, 26, 0.05);
          }
          .nav-admin-link:hover {
            background-color: #F4B41A;
            color: #004d28;
            box-shadow: 0 4px 12px rgba(244, 180, 26, 0.25);
            transform: translateY(-1px);
          }

          .btn-logout {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            background-color: transparent;
            color: rgba(255, 255, 255, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 0.4rem 0.8rem;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            font-size: 0.85rem;
            transition: all 0.3s ease;
          }
          .btn-logout:hover {
            background-color: #e74c3c;
            color: white;
            border-color: #e74c3c;
            box-shadow: 0 4px 8px rgba(231, 76, 60, 0.3);
            transform: translateY(-1px);
          }

          .brand-hover {
            transition: all 0.3s ease;
          }
          .brand-hover:hover {
            transform: translateY(-1px);
          }
          .brand-hover:hover .logo-icon {
            background-color: #F4B41A !important;
            color: #004d28 !important;
            box-shadow: 0 0 12px rgba(244, 180, 26, 0.5);
            transform: scale(1.05) rotate(-8deg);
          }
          .brand-hover:hover .brand-text {
            text-shadow: 0 4px 8px rgba(0,0,0,0.4);
          }
        `}
      </style>
      <div style={styles.brand}>
        <Link to="/dashboard" style={styles.linkBrand} className="brand-hover">
          <div style={styles.logoIcon} className="logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <span className="brand-text">
            Reportes <span style={{ color: '#F4B41A' }}>InfoPunto</span>
          </span>
        </Link>
      </div>
      <div style={styles.menu}>
        <Link to="/dashboard" className="nav-link">Dashboard</Link>
        <Link to="/traceability" className="nav-link">Trazabilidad</Link>
        
        {/* Solo administradores pueden registrar usuarios */}
        {role === 'admin' && (
          <Link to="/admin/register" className="nav-admin-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            Usuarios
          </Link>
        )}
        
        <div style={styles.userSection}>
          <div style={styles.userInfo}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4B41A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <strong style={{ fontSize: '0.95rem', letterSpacing: '0.3px', fontWeight: '600' }}>{userName || user?.email}</strong>
            </div>
            <span style={styles.badge}>{role?.toUpperCase()}</span>
          </div>
          <button onClick={handleLogout} className="btn-logout" title="Cerrar Sesión">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Salir
          </button>
        </div>
      </div>
    </nav>
  );
};

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.8rem 2.5rem',
    backgroundColor: '#005a2f',
    backgroundImage: 'linear-gradient(to right, #004d28, #006837, #004d28)',
    color: 'white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    borderBottom: '3px solid #F4B41A',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  brand: {
    display: 'flex',
    alignItems: 'center'
  },
  linkBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
    color: 'white',
    textDecoration: 'none',
    fontSize: '1.35rem',
    fontWeight: '800',
    letterSpacing: '0.5px',
    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
  },
  logoIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#F4B41A',
    padding: '0.5rem',
    borderRadius: '8px',
    border: '1px solid rgba(244, 180, 26, 0.3)',
    transition: 'all 0.3s ease',
  },
  menu: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.2rem',
    borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
    paddingLeft: '1.5rem',
    marginLeft: '0.5rem'
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    lineHeight: '1.2'
  },
  badge: {
    backgroundColor: 'rgba(244, 180, 26, 0.15)',
    color: '#F4B41A',
    border: '1px solid rgba(244, 180, 26, 0.3)',
    padding: '0.15rem 0.6rem',
    borderRadius: '12px',
    fontSize: '0.65rem',
    fontWeight: 'bold',
    letterSpacing: '0.5px'
  }
};

export default Navbar;
