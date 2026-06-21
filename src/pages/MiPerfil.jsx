import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { subscribeToUserActiveReservations, subscribeToUserHistoryReservations, returnReservation, addReview } from '../bookService.js';
import { QRCodeSVG } from 'qrcode.react';
import { useSwipeable } from 'react-swipeable';
import { Settings, LogOut, RefreshCcw, Edit2, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '../firebase';
import { updateProfile } from 'firebase/auth';
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
          <button onClick={() => onReturn(res.id, res.bookId, res.bookTitle)} className="desktop-return-btn" title="Devolver libro">
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
        <button onClick={() => onReturn(res.id, res.bookId, res.bookTitle)} className="btn-swipe-return">
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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Reseñas
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewBook, setReviewBook] = useState(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    // Para evitar advertencias de set-state-in-effect si es síncrono, lo manejamos limpiamente
    if (currentUser) {
      setTimeout(() => {
        setEditName(currentUser.displayName || '');
        setEditPhoto(currentUser.photoURL || '');
      }, 0);
    }
  }, [currentUser]);

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

  const handleReturn = async (reservationId, bookId, bookTitle) => {
    await returnReservation(reservationId, bookId);
    toast.success('Libro devuelto correctamente', { icon: '📚' });
    setReviewBook({ id: bookId, title: bookTitle });
    setRating(5);
    setReviewText('');
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewBook) return;
    setIsSubmittingReview(true);
    const res = await addReview(
      reviewBook.id, 
      currentUser?.displayName, 
      currentUser?.photoURL, 
      rating, 
      reviewText
    );
    if (res.success) {
      toast.success('¡Gracias por tu reseña!');
    } else {
      toast.error('No se pudo guardar la reseña');
    }
    setReviewModalOpen(false);
    setIsSubmittingReview(false);
    setReviewBook(null);
  };

  const handleLogout = async () => {
    setError('');
    try {
      await logout();
      navigate('/login');
    } catch {
      toast.error('Error al cerrar sesión. Inténtalo de nuevo.');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    const tId = toast.loading('Guardando perfil...');
    try {
      await updateProfile(auth.currentUser, {
        displayName: editName,
        photoURL: editPhoto
      });
      // Forzar recarga ligera para que los componentes lean los nuevos datos del Auth
      toast.success('Perfil actualizado correctamente', { id: tId });
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      toast.error('Hubo un error al actualizar el perfil', { id: tId });
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="perfil-container">
      <header className="perfil-header glass-panel">
        <div className="header-user-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {currentUser?.photoURL ? (
            <img src={currentUser.photoURL} alt="Avatar" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
              {(currentUser?.displayName || currentUser?.email || '?')[0].toUpperCase()}
            </div>
          )}
          <div>
            <h2>{currentUser?.displayName || 'Mi Perfil'}</h2>
            <p>{currentUser?.email}</p>
          </div>
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
          <div className="config-modal-content glass-panel" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Settings size={20}/> Configuración</h3>
            
            <div className="config-section">
              <h4>Perfil de Usuario</h4>
              {!isEditingProfile ? (
                <div className="profile-view-box">
                  <p><strong>Nombre:</strong> {currentUser?.displayName || 'No establecido'}</p>
                  <p><strong>Email:</strong> {currentUser?.email}</p>
                  <button className="btn-edit-profile" onClick={() => setIsEditingProfile(true)}>
                    <Edit2 size={16} /> Editar Perfil
                  </button>
                </div>
              ) : (
                <form className="profile-edit-form" onSubmit={handleUpdateProfile}>
                  <label>Nombre a mostrar</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Ej: Tomás" />
                  
                  <label>URL de tu foto de perfil</label>
                  <input type="url" value={editPhoto} onChange={e => setEditPhoto(e.target.value)} placeholder="https://..." />
                  
                  <div className="form-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button type="submit" disabled={isSavingProfile} className="btn-save-profile">
                      {isSavingProfile ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button type="button" onClick={() => setIsEditingProfile(false)} className="btn-cancel-profile">
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>

            <hr style={{ margin: '1.5rem 0', borderColor: 'rgba(150,150,150,0.1)' }} />
            
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

      {/* Modal de Reseña */}
      {reviewModalOpen && reviewBook && (
        <div className="config-modal-overlay">
          <div className="config-modal-content glass-panel review-modal" style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>¡Gracias por devolverlo!</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              ¿Qué te pareció "{reviewBook.title}"?
            </p>
            
            <div className="star-rating" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {[1,2,3,4,5].map(star => (
                <Star 
                  key={star} 
                  size={32} 
                  fill={star <= rating ? '#f59e0b' : 'transparent'} 
                  color={star <= rating ? '#f59e0b' : 'var(--text-muted)'} 
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => setRating(star)}
                />
              ))}
            </div>

            <textarea 
              placeholder="Escribe un breve comentario (opcional)..." 
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              className="review-textarea"
            />

            <div className="form-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button onClick={handleSubmitReview} disabled={isSubmittingReview} className="btn-save-profile">
                {isSubmittingReview ? 'Enviando...' : 'Enviar Reseña'}
              </button>
              <button onClick={() => setReviewModalOpen(false)} className="btn-cancel-profile">
                Omitir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MiPerfil;