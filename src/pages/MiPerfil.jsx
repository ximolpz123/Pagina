import React, { useState, useEffect } from 'react';
import { subscribeToActiveReservations, subscribeToHistoryReservations, returnReservation } from '../bookService.js';
import './MiPerfil.css';

const MiPerfil = () => {
  // 1. Estado del Perfil (Configuración)
  const [profile, setProfile] = useState({
    nombre: 'Tomás Álvarez',
    edad: 21,
    carrera: 'Ingeniería de Software',
    universidad: 'Universidad Nacional'
  });
  const [showConfigModal, setShowConfigModal] = useState(false);

  // 2. Estado de la Cuenta (KPIs)
  const maxCreditos = 5;
  const [multasActivas, setMultasActivas] = useState(0);

  // 3. Estado de los Libros
  const [reservasActivas, setReservasActivas] = useState([]);
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    const unsubActive = subscribeToActiveReservations((data) => {
      setReservasActivas(data);
      let multas = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Ignoramos la hora para calcular por día calendario
      data.forEach(res => {
        if (!res.returnDate) return;
        const [year, month, day] = res.returnDate.split('-');
        const returnD = new Date(year, month - 1, day);
        returnD.setHours(0, 0, 0, 0);
        
        if (today > returnD) {
          const diffTime = today - returnD;
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          multas += diffDays * 5000; // $5000 CLP de multa por día de atraso
        }
      });
      setMultasActivas(multas);
    });

    const unsubHistory = subscribeToHistoryReservations((data) => {
      setHistorial(data);
    });

    return () => { unsubActive(); unsubHistory(); };
  }, []);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleDevolver = async (reserva) => {
    await returnReservation(reserva.id, reserva.bookId);
    alert(`✅ Has devuelto "${reserva.bookTitle}".`);
  };

  // Formateador de fecha profesional
  const formatDatePro = (isoString) => {
    if (!isoString) return 'Fecha no registrada';
    const dateString = isoString.includes('T') ? isoString : `${isoString}T12:00:00`;
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Combinar y ordenar todas las reservas (activas e historial) por fecha de creación (más recientes primero)
  const allReservations = [...reservasActivas, ...historial].sort((a, b) => {
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  // Lógica visual para la fecha de devolución
  const getDueDateMessage = (dateString) => {
    if (!dateString) return { text: 'Fecha no registrada', color: 'var(--text-muted)' };
    const [year, month, day] = dateString.split('-');
    const returnD = new Date(year, month - 1, day);
    returnD.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (today > returnD) {
      return { text: `¡Atrasado! Fecha límite era: ${dateString}`, color: 'var(--danger-color)' };
    } else if (today.getTime() === returnD.getTime()) {
      return { text: `¡Debes devolverlo HOY!`, color: 'var(--danger-color)' };
    } else {
      return { text: `Devolver antes del: ${dateString}`, color: 'var(--text-muted)' };
    }
  };

  return (
    <div className="perfil-container">
      <header className="perfil-header">
        <h2>Mi Perfil 👤</h2>
        <button className="settings-btn" onClick={() => setShowConfigModal(true)}>⚙️</button>
      </header>

      <main className="perfil-main">
        {/* SECCIÓN 1: KPIs y Estado de Cuenta */}
        <section className="perfil-stats">
          <div className="stat-card">
            <h3>Créditos de Préstamo</h3>
            <p className="stat-value">{maxCreditos - reservasActivas.length} <span className="stat-max">/ {maxCreditos}</span></p>
            <p className="stat-desc">Libros que aún puedes pedir</p>
          </div>
          <div className={`stat-card ${multasActivas > 0 ? 'danger' : 'success'}`}>
            <h3>Multas Activas</h3>
            <p className="stat-value">${multasActivas.toLocaleString('es-CL')}</p>
            <p className="stat-desc">{multasActivas > 0 ? 'Tienes pagos pendientes' : 'Estás al día con la biblioteca'}</p>
          </div>
        </section>

        {/* SECCIÓN 2: Reservas Activas */}
        <section className="perfil-section">
          <h3 className="section-title">📚 Mis Reservas Activas</h3>
          {reservasActivas.length === 0 ? (
            <p className="empty-text">No tienes libros reservados actualmente.</p>
          ) : (
            <div className="book-list">
              {reservasActivas.map(libro => (
                <div key={libro.id} className="perfil-book-card">
                  <div className="book-info-basic">
                    <h4>{libro.bookTitle}</h4>
                    <span className="due-date" style={{ color: getDueDateMessage(libro.returnDate).color }}>
                      {getDueDateMessage(libro.returnDate).text}
                    </span>
                  </div>
                  <button className="return-btn" onClick={() => handleDevolver(libro)}>Devolver</button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECCIÓN 4: Historial de Préstamos */}
        <section className="perfil-section">
          <h3 className="section-title">📖 Historial Global de Préstamos</h3>
          <div className="book-list">
            {allReservations.length === 0 ? (
              <p className="empty-text">No hay registro de préstamos.</p>
            ) : (
              allReservations.map(libro => (
                <div key={libro.id} className="perfil-book-card history-card">
                  <div className="book-info-basic">
                    <h4>{libro.bookTitle}</h4>
                    <span className="history-date">Reservado el: {formatDatePro(libro.createdAt)}</span>
                    {libro.status === 'returned' && libro.returnedAt && (
                      <span className="return-date" style={{ display: 'block', marginTop: '0.2rem' }}>Devuelto el: {formatDatePro(libro.returnedAt)}</span>
                    )}
                  </div>
                  <div className={`history-status-badge ${libro.status === 'returned' ? 'returned' : 'active'}`}>
                    {libro.status === 'returned' ? 'Devuelto' : 'En Préstamo'}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {showConfigModal && (
        <div className="config-modal-overlay">
          <div className="config-modal-content">
            <h3 className="section-title">⚙️ Configuración de Cuenta</h3>
            <div className="config-grid">
              <div className="config-item"><label>Nombre Completo</label><input type="text" name="nombre" value={profile.nombre} onChange={handleChange} /></div>
              <div className="config-item"><label>Edad</label><input type="number" name="edad" value={profile.edad} onChange={handleChange} /></div>
              <div className="config-item"><label>Universidad</label><input type="text" name="universidad" value={profile.universidad} onChange={handleChange} /></div>
              <div className="config-item"><label>Carrera</label><input type="text" name="carrera" value={profile.carrera} onChange={handleChange} /></div>
            </div>
            <button className="save-config-btn" onClick={() => setShowConfigModal(false)}>Guardar Cambios</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiPerfil;