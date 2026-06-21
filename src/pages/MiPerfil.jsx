import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { subscribeToUserActiveReservations, subscribeToUserHistoryReservations, returnReservation } from '../bookService.js';
import { QRCodeSVG } from 'qrcode.react';
import { useSwipeable } from 'react-swipeable';
import { Settings, LogOut, RefreshCcw } from 'lucide-react';
import './MiPerfil.css';

const SwipeableReservation = ({ res, onReturn }) => {
  const [swiped, setSwiped] = useState(false);

  const handlers = useSwipeable({
    onSwipedLeft: () => setSwiped(true),
    onSwipedRight: () => setSwiped(false),
    trackMouse: true,
    preventDefaultTouchmoveEvent: true,
  });

  return (
    <div className="swipe-wrapper" {...handlers}>
      <div className={`swipe-content ${swiped ? 'swiped' : ''} glass-panel`}>
        <div className="desktop-return-box">
          <button onClick={() => onReturn(res.id, res.bookId)} className="desktop-return-btn" title="Devolver libro">
            <RefreshCcw size={20} />
          </button>
        </div>
        <div className="res-info-main">
          <h4>{res.bookTitle}</h4>
          <span className="due-date">Devolución: <strong>{res.returnDate}</strong></span>
          <p className="swipe-hint">👈 Desliza para devolver</p>
        </div>
        <div className="qr-code-box">
          <QRCodeSVG value={`RETIRAR:${res.id}`} size={50} level="L" includeMargin={false} />
          <span>QR Retiro</span>
        </div>
      </div>
      
      <div className="swipe-action">
        <button onClick={() => onReturn(res.id, res.bookId)} className="btn-swipe-return">
          <RefreshCcw size={20} />
          Devolver
        </button>
      </div>
    </div>
  );
};

const MiPerfil = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [error, setError] = useState('');
  const [activeReservations, setActiveReservations] = useState([]);
  const [historyReservations, setHistoryReservations] = useState([]);
  const [finesPaid, setFinesPaid] = useState(false);

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
    activeReservations.forEach(res => {
      if (res.returnDate && todayStr > res.returnDate) totalMulta += 5000;
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
      <header className="perfil-header glass-panel">
        <div className="header-user-info">
          <h2>Mi perfil</h2>
          <p>{currentUser?.email}</p>
        </div>
        <button className="settings-btn" onClick={() => setIsConfigOpen(true)}>
          <Settings size={24} />
        </button>
      </header>
      
      <main className="perfil-main">
        {/* KPIs */}
        <section className="perfil-stats">
          <div className="stat-card glass-panel success">
            <h3>Créditos</h3>
            <p className="stat-value">{5 - activeReservations.length} <span className="stat-max">/ 5</span></p>
          </div>
          <div className="stat-card glass-panel">
            <h3>Activos</h3>
            <p className="stat-value">{activeReservations.length}</p>
          </div>
          <div className={`stat-card glass-panel ${multasPendientes > 0 ? 'danger' : 'success'}`}>
            <h3>Multas</h3>
            <p className="stat-value">${multasPendientes.toLocaleString('es-CL')}</p>
            {multasPendientes > 0 && (
              <button onClick={() => setFinesPaid(true)} className="pay-fine-btn">
                Pagar Deuda
              </button>
            )}
          </div>
        </section>

        {/* Reservas Activas (SWIPEABLES) */}
        <section className="perfil-section">
          <h3 className="section-title">Reservas Activas</h3>
          <div className="book-list">
            {activeReservations.length > 0 ? (
              activeReservations.map(res => (
                <SwipeableReservation key={res.id} res={res} onReturn={handleReturn} />
              ))
            ) : (
              <div className="empty-state glass-panel">
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📚</span>
                <p>No tienes libros en préstamo.</p>
              </div>
            )}
          </div>
        </section>

        {/* Historial */}
        <section className="perfil-section">
          <h3 className="section-title">Historial</h3>
          <div className="book-list">
            {historyReservations.length > 0 ? (
              [...historyReservations]
                .sort((a, b) => new Date(b.returnedAt || 0) - new Date(a.returnedAt || 0))
                .slice(0, 10) // Mostrar solo los últimos 10 para no saturar móvil
                .map(res => (
                <div key={res.id} className="history-card glass-panel">
                  <div className="history-info">
                    <h4>{res.bookTitle}</h4>
                    <span>Devuelto: {res.returnedAt ? new Date(res.returnedAt).toLocaleDateString() : 'Ok'}</span>
                  </div>
                  <span className="badge-returned">✓</span>
                </div>
              ))
            ) : (
              <div className="empty-state glass-panel">
                <p>Aún no hay registros en tu historial.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Modal Config */}
      {isConfigOpen && (
        <div className="config-modal-overlay">
          <div className="config-modal-content glass-panel">
            <h3>Configuración</h3>
            <div className="config-user-box">
              <p className="label">CUENTA CONECTADA</p>
              <p className="email">{currentUser?.email}</p>
            </div>
            {error && <p className="error-message">{error}</p>}
            
            <div className="config-actions">
              <button onClick={handleLogout} className="logout-btn">
                <LogOut size={18} /> Cerrar Sesión
              </button>
              <button onClick={() => setIsConfigOpen(false)} className="close-config-btn">
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