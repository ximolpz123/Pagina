import React, { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const logAuditEvent = async (email, name, action, status, details = '') => {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        user_email: email,
        user_name: name,
        action: action,
        status: status,
        details: details,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.error('Error registrando auditoría:', e);
    }
  };

  const validateInput = () => {
    if (!email || !password) {
      setError('Por favor, complete todos los campos.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Formato de correo inválido.');
      return false;
    }
    return true;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateInput()) return;

    setLoading(true);
    try {
      const userCreds = await signInWithEmailAndPassword(auth, email, password);
      
      let fetchedName = email;
      try {
        const userDoc = await getDoc(doc(db, 'users', userCreds.user.uid));
        if (userDoc.exists()) {
          if (userDoc.data().name) fetchedName = userDoc.data().name;
        } else if (email.toLowerCase() !== 'admin@gmail.com') {
          // El usuario fue eliminado de la base de datos por el administrador
          await signOut(auth);
          throw new Error('cuenta_eliminada');
        }
      } catch (fetchErr) {
        if (fetchErr.message === 'cuenta_eliminada') throw fetchErr;
        console.error('Error al obtener el nombre del usuario:', fetchErr);
      }

      await logAuditEvent(email, fetchedName, 'inicio_sesion', 'exito');
      navigate('/dashboard');
    } catch (err) {
      const isDeleted = err.message === 'cuenta_eliminada';
      await logAuditEvent(email, email, 'inicio_sesion', 'fallo', isDeleted ? 'cuenta_eliminada' : err.code);
      setError(isDeleted ? 'Tu acceso ha sido revocado o eliminado por el administrador.' : 'Credenciales inválidas o cuenta no autorizada.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          .login-input {
            padding: 0.8rem 1rem;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            font-size: 0.95rem;
            outline: none;
            transition: all 0.2s ease;
            background-color: #f8fafc;
            color: #334155;
          }
          .login-input:focus {
            border-color: #006837;
            background-color: #ffffff;
            box-shadow: 0 0 0 3px rgba(0, 104, 55, 0.1);
          }
          .login-btn {
            margin-top: 0.5rem;
            padding: 0.9rem;
            background: linear-gradient(135deg, #008f4c 0%, #006837 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1.05rem;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 104, 55, 0.2);
            transition: all 0.3s ease;
            letter-spacing: 0.5px;
          }
          .login-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 15px rgba(0, 104, 55, 0.3);
          }
          .login-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
          }
        `}
      </style>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconWrapper}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#006837" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h2 style={styles.title}>Iniciar Sesión</h2>
          <h3 style={styles.subtitle}>Gestión de Vulnerabilidades (Infopuntos)</h3>
        </div>
        
        {error && <div style={styles.error}>{error}</div>}
        
        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              placeholder="Usuario@gmail.com"
              disabled={loading}
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="password">Contraseña</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                style={{ width: '100%', paddingRight: '2.5rem', boxSizing: 'border-box' }}
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onMouseDown={() => setShowPassword(true)}
                onMouseUp={() => setShowPassword(false)}
                onMouseLeave={() => setShowPassword(false)}
                onTouchStart={() => setShowPassword(true)}
                onTouchEnd={() => setShowPassword(false)}
                style={styles.eyeButton}
                title="Mantener presionado para ver"
                tabIndex="-1"
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                )}
              </button>
            </div>
          </div>
          
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Verificando...' : 'Acceder al Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#006837', // Verde institucional
    backgroundImage: 'linear-gradient(135deg, #006837 0%, #004d28 100%)',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  card: {
    backgroundColor: 'white',
    padding: '2.5rem',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
    width: '100%',
    maxWidth: '420px',
    borderTop: '5px solid #F4B41A',
    margin: '2rem'
  },
  header: {
    marginBottom: '2rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  iconWrapper: {
    backgroundColor: '#ecfdf5',
    padding: '1rem',
    borderRadius: '50%',
    marginBottom: '1rem',
    border: '4px solid #d1fae5'
  },
  title: {
    color: '#0f172a',
    fontSize: '1.8rem',
    marginBottom: '0.25rem',
    marginTop: '0',
    fontWeight: '800'
  },
  subtitle: {
    color: '#64748b',
    margin: '0',
    fontSize: '0.9rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem'
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  eyeButton: {
    position: 'absolute',
    right: '0.8rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8'
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '0.75rem',
    borderRadius: '6px',
    marginBottom: '1rem',
    fontSize: '0.875rem',
    textAlign: 'center',
    border: '1px solid #fca5a5'
  }
};

export default Login;
