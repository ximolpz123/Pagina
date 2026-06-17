import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const allowedDomains = ['@santotomas.cl', '@alumnos.santotomas.cl'];
    return allowedDomains.some(domain => email.endsWith(domain));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Error: Solo se permiten correos institucionales de Santo Tomás.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate('/'); // Redirige al dashboard después de un login exitoso
    } catch (err) {
      switch (err.code) {
        case 'auth/user-not-found':
          setError('No existe un usuario registrado con este correo.');
          break;
        case 'auth/wrong-password':
          setError('La contraseña es incorrecta.');
          break;
        default:
          setError('Ocurrió un error. Por favor, inténtalo de nuevo.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>📚 Biblioteca Online</h1>
          <p>Acceso para comunidad Santo Tomás</p>
        </div>

        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="email">Correo Institucional</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre.apellido@..."
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Cargando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;