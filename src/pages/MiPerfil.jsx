import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { subscribeToUserActiveReservations, subscribeToUserHistoryReservations, returnReservation } from '../bookService.js';
import './MiPerfil.css';

const MiPerfil = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [error, setError] = useState('');
  const [activeReservations, setActiveReservations] = useState([]);
  const [historyReservations, setHistoryReservations] = useState([]);
  const [finesPaid, setFinesPaid] = useState(false);

  // Helper para formato YYYY-MM-DD
  const getFormattedDate = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const calcularMulta = () => {
    if (finesPaid) return 0;

    let totalMulta = 0;
    const todayStr = getFormattedDate(new Date());

    // Multas por libros actualmente atrasados
    activeReservations.forEach(res => {
      if (res.returnDate && todayStr > res.returnDate) {
        totalMulta += 5000;
      }
    });

    return totalMulta;
  };

  const multasPendientes = calcularMulta();

  useEffect(() => {
    if (!currentUser?.email) return;
    const unsubActive = subscribeToUserActiveReservations(currentUser.email, setActiveReservations);
    const unsubHistory = subscribeToUserHistoryReservations(currentUser.email, setHistoryReservations);
    return () => {
      if (unsubActive) unsubActive();
      if (unsubHistory) unsubHistory();
    };
  }, [currentUser]);

  const handleReturn = async (reservationId, bookId) => {
    await returnReservation(reservationId, bookId);
  };

  const handleLogout = async () => {
    setError('');
    try {
      await logout();
      navigate('/login');
    } catch {
      setError('Error al cerrar sesión. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="perfil-container">
      <header className="perfil-header">
        <h2>Mi Perfil 👤</h2>
        <button className="settings-btn" onClick={() => setIsConfigOpen(true)} title="Configuración">
          ⚙️
        </button>
      </header>
      
      <main className="perfil-main">
        {/* KPIs de Cuenta */}
        <section className="perfil-stats">
          <div className="stat-card success">
            <h3>Créditos Disponibles</h3>
            <p className="stat-value">{5 - activeReservations.length} <span className="stat-max">/ 5</span></p>
            <p className="stat-desc">Puedes reservar 5 libros más</p>
          </div>
          <div className="stat-card">
            <h3>Libros Activos</h3>
            <p className="stat-value">{activeReservations.length}</p>
            <p className="stat-desc">En tu poder actualmente</p>
          </div>
          <div className={`stat-card ${multasPendientes > 0 ? 'danger' : 'success'}`}>
            <h3>Multas Pendientes</h3>
            <p className="stat-value">${multasPendientes.toLocaleString('es-CL')}</p>
            <p className="stat-desc">{multasPendientes > 0 ? 'Tienes multas por atrasos' : 'Al día sin deudas'}</p>
            {multasPendientes > 0 && (
              <button 
                onClick={() => {
                  alert('¡Multa pagada exitosamente! Recuerda devolver tus libros atrasados.');
                  setFinesPaid(true);
                }}
                style={{ marginTop: '10px', padding: '5px 10px', backgroundColor: 'var(--danger-color, #e74c3c)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}
              >
                Pagar multas
              </button>
            )}
          </div>
        </section>

        <section className="perfil-section">
          <h3 className="section-title">Mis Reservas Activas</h3>
          <div className="book-list">
            {activeReservations.length > 0 ? (
              activeReservations.map(res => (
                <div key={res.id} className="perfil-book-card">
                  <div className="book-info-basic">
                    <h4>{res.bookTitle}</h4>
                    <span className="due-date">Devolución: {res.returnDate}</span>
                  </div>
                  <button onClick={() => handleReturn(res.id, res.bookId)} className="return-btn">Devolver</button>
                </div>
              ))
            ) : (
              <p className="empty-text">No tienes libros reservados en este momento.</p>
            )}
          </div>
        </section>

        <section className="perfil-section">
          <h3 className="section-title">Historial de Devoluciones</h3>
          <div className="book-list">
            {historyReservations.length > 0 ? (
              historyReservations.map(res => (
                <div key={res.id} className="perfil-book-card history-card">
                  <div className="book-info-basic">
                    <h4>{res.bookTitle}</h4>
                    <span className="history-date">Entregado el: {res.returnedAt ? new Date(res.returnedAt).toLocaleDateString() : 'Desconocido'}</span>
                  </div>
                  <span className="history-status-badge returned">Devuelto</span>
                </div>
              ))
            ) : (
              <p className="empty-text">Aún no hay registros en tu historial.</p>
            )}
          </div>
        </section>
      </main>

      {/* Modal de Configuración */}
      {isConfigOpen && (
        <div className="config-modal-overlay">
          <div className="config-modal-content">
            <h3 style={{ color: 'var(--text-main)', marginBottom: '1.5rem' }}>Opciones de la Cuenta</h3>
            
            <div style={{ marginBottom: '2rem', textAlign: 'left', backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '8px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 'bold' }}>USUARIO AUTENTICADO:</p>
              <p style={{ color: 'var(--text-main)', fontSize: '1rem', wordBreak: 'break-all' }}>{currentUser?.email}</p>
            </div>

            {error && <p className="error-message" style={{ marginBottom: '1rem' }}>{error}</p>}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <button onClick={handleLogout} className="logout-btn">
                Cerrar Sesión
              </button>
              <button onClick={() => setIsConfigOpen(false)} className="save-config-btn" style={{ marginTop: 0, backgroundColor: 'var(--secondary-color)' }}>
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiPerfil;