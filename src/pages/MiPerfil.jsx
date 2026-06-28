import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { subscribeToUserActiveReservations, subscribeToUserHistoryReservations, returnReservation, cancelReservation, addReview } from '../bookService.js';
import { QRCodeSVG } from 'qrcode.react';
import { useSwipeable } from 'react-swipeable';
import { Settings, LogOut, RefreshCcw, Edit2, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { formatDistanceToNowStrict, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import './MiPerfil.css';

const SwipeableReservation = ({ res, onReturn, onExpandQR, isPending }) => {
  const [swiped, setSwiped] = useState(false);

  const handlers = useSwipeable({
    onSwipedLeft: () => setSwiped(true),
    onSwipedRight: () => setSwiped(false),
    trackMouse: true,
    preventDefaultTouchmoveEvent: true,
  });

  const getRelativeDate = (dateStr) => {
    if (!dateStr) return <strong>Desconocida</strong>;
    try {
      const parts = dateStr.split('-');
      const date = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59);
      if (isToday(date)) return <strong style={{ color: '#f59e0b' }}>Hoy</strong>;
      if (isPast(date)) return <strong style={{ color: '#ef4444' }}>Hace {formatDistanceToNowStrict(date, { locale: es })} (Atrasado)</strong>;
      return <strong style={{ color: '#10b981' }}>En {formatDistanceToNowStrict(date, { locale: es })}</strong>;
    } catch {
      return <strong>{dateStr}</strong>;
    }
  };

  return (
    <div className="swipe-wrapper" {...handlers}>
      <div className={`swipe-content ${swiped ? 'swiped' : ''} glass-panel`}>
        <div className="desktop-return-box">
          <button onClick={() => onReturn(res.id, res.bookId, res.bookTitle, isPending)} className="desktop-return-btn" title={isPending ? "Cancelar reserva" : "Devolver libro"}>
            <RefreshCcw size={20} />
          </button>
        </div>
        <div className="res-info-main">
          <h4>{res.bookTitle}</h4>
          <span className="due-date">Devolución: {getRelativeDate(res.returnDate)}</span>
          <p className="swipe-hint">👈 Desliza para {isPending ? "cancelar" : "devolver"}</p>
        </div>
        {isPending && (
          <div className="qr-code-box" onClick={() => onExpandQR(res)} style={{ cursor: 'pointer' }} title="Ampliar Código QR">
            <QRCodeSVG value={`RETIRAR:${res.id}`} size={50} level="L" includeMargin={false} />
            <span>QR Retiro</span>
          </div>
        )}
      </div>
      
      <div className="swipe-action">
        <button onClick={() => onReturn(res.id, res.bookId, res.bookTitle, isPending)} className="btn-swipe-return">
          <RefreshCcw size={20} />
          {isPending ? "Cancelar" : "Devolver"}
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
  const [showFinesTooltip, setShowFinesTooltip] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [editCareer, setEditCareer] = useState('');
  const [userCareer, setUserCareer] = useState('Estudiante');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Reseñas
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewBook, setReviewBook] = useState(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  // QR Expandido
  const [expandedQRRes, setExpandedQRRes] = useState(null);

  useEffect(() => {
    // Para evitar advertencias de set-state-in-effect si es síncrono, lo manejamos limpiamente
    if (currentUser) {
      setTimeout(() => {
        setEditName(currentUser.displayName || '');
        setEditPhoto(currentUser.photoURL || '');
        const savedCareer = localStorage.getItem(`career_${currentUser.email}`);
        if (savedCareer) {
          setUserCareer(savedCareer);
          setEditCareer(savedCareer);
        } else {
          setEditCareer('Estudiante');
        }
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
      if (res.returnDate && todayStr > res.returnDate) totalMulta += 5; // 5 décimas por libro
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

  const handleReturn = async (reservationId, bookId, bookTitle, isPending = false) => {
    if (isPending) {
      await cancelReservation(reservationId, bookId);
      toast.success('Reserva cancelada', { icon: '🚫' });
      return; // No mostramos modal de reseña
    }

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
      localStorage.setItem(`career_${currentUser.email}`, editCareer);
      setUserCareer(editCareer);
      // Forzar recarga ligera para que los componentes lean los nuevos datos del Auth
      toast.success('Perfil actualizado correctamente', { id: tId });
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      toast.error('Hubo un error al actualizar el perfil', { id: tId });
      setIsSavingProfile(false);
    }
  };

  // Efecto para cerrar automáticamente el QR si el bibliotecario lo aprueba en tiempo real
  useEffect(() => {
    if (expandedQRRes) {
      const isStillPending = activeReservations.some(r => r.id === expandedQRRes.id && r.status === 'pending_pickup');
      if (!isStillPending) {
        setExpandedQRRes(null);
        toast.success('¡El bibliotecario ha verificado tu préstamo!', { icon: '🎉', duration: 4000 });
      }
    }
  }, [activeReservations, expandedQRRes]);

  // --- LOGICA DE GAMIFICACIÓN ---
  const xp = historyReservations.length * 50;
  let rankName = 'Lector Principiante';
  let xpProgress = xp;
  let xpMax = 250; // Requiere 5 libros para subir a Explorador
  let rankIcon = '🌱';

  if (xp >= 250 && xp < 750) {
    rankName = 'Explorador Literario';
    xpProgress = xp - 250;
    xpMax = 500; // 750 - 250 (10 libros adicionales)
    rankIcon = '🗺️';
  } else if (xp >= 750 && xp < 1500) {
    rankName = 'Ratón de Biblioteca';
    xpProgress = xp - 750;
    xpMax = 750; // 1500 - 750 (15 libros adicionales)
    rankIcon = '👑';
  } else if (xp >= 1500) {
    rankName = 'Erudito Máximo';
    xpProgress = xp - 1500;
    xpMax = 1000;
    rankIcon = '🧙‍♂️';
    if (xp >= 2500) {
        xpProgress = xpMax; // Max out
    }
  }
  const progressPercent = Math.min((xpProgress / xpMax) * 100, 100);

  const pendingPickups = activeReservations.filter(r => r.status === 'pending_pickup');
  const activeLoans = activeReservations.filter(r => r.status === 'active');

  return (
    <div className="perfil-container">
      <header className="perfil-header glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div className="header-user-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Avatar" style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-color)' }} />
            ) : (
              <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color), #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', color: 'white', fontWeight: 'bold' }}>
                {(currentUser?.displayName || currentUser?.email || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <h2>{currentUser?.displayName || 'Mi Perfil'}</h2>
              <p style={{ color: 'var(--text-muted)' }}>{userCareer}</p>
              
              <div className="gamification-badge" style={{ marginTop: '0.8rem', backgroundColor: 'var(--card-bg)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'inline-block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.3rem' }}>
                  <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-main)' }}>
                    {rankIcon} Nivel: {rankName}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{xp} XP Total</span>
                </div>
                <div className="progress-bar-bg" style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div className="progress-bar-fill" style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, var(--primary-color))', borderRadius: '999px', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', textAlign: 'right' }}>
                  {xpProgress} / {xpMax} XP al próximo nivel
                </div>
              </div>
            </div>
          </div>
          <button className="settings-btn" onClick={() => setIsConfigOpen(true)} style={{ height: 'fit-content' }}>
            <Settings size={24} />
          </button>
        </div>
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
          <div className={`stat-card glass-panel ${multasPendientes > 0 ? 'danger' : 'success'}`} style={{ position: 'relative', overflow: 'visible' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', cursor: 'pointer' }} onClick={() => setShowFinesTooltip(!showFinesTooltip)}>
              Multas
              <span className="info-icon" style={{ backgroundColor: '#3b82f6', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>i</span>
            </h3>
            {showFinesTooltip && (
              <div style={{ position: 'absolute', top: '40px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.8rem', borderRadius: '8px', zIndex: 10, width: '220px', fontSize: '0.8rem', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                <strong>Penalización Académica:</strong> Si te atrasas (más de 7 días), pierdes 5 décimas en tu próxima evaluación. Además, si entregas atrasado, no podrás reservar libros del mismo género por 1 semana.
                <button onClick={(e) => { e.stopPropagation(); setShowFinesTooltip(false); }} style={{ display: 'block', marginTop: '0.5rem', width: '100%', padding: '0.3rem', backgroundColor: 'var(--primary-color)', color: 'white', borderRadius: '4px', border: 'none' }}>Entendido</button>
              </div>
            )}
            <p className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{multasPendientes} décimas</p>
            {multasPendientes > 0 && (
              <button onClick={() => setFinesPaid(true)} className="pay-fine-btn">
                Justificar Atraso
              </button>
            )}
          </div>
        </section>

        {/* Pendientes de Retiro */}
        {pendingPickups.length > 0 && (
          <section className="perfil-section">
            <h3 className="section-title" style={{ color: '#f59e0b' }}>🕒 Pendientes de Retiro</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '10px' }}>Muestra este QR al bibliotecario para retirar tu libro.</p>
            <div className="book-list">
              {pendingPickups.map(res => (
                <SwipeableReservation key={res.id} res={res} onReturn={handleReturn} onExpandQR={setExpandedQRRes} isPending={true} />
              ))}
            </div>
          </section>
        )}

        {/* Reservas Activas */}
        <section className="perfil-section">
          <h3 className="section-title">📚 Libros Activos</h3>
          <div className="book-list">
            {activeLoans.length > 0 ? (
              activeLoans.map(res => (
                <SwipeableReservation key={res.id} res={res} onReturn={handleReturn} onExpandQR={setExpandedQRRes} isPending={false} />
              ))
            ) : (
              <div className="empty-state glass-panel">
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📚</span>
                <p>No tienes libros en préstamo activo.</p>
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
                  <p><strong>Carrera:</strong> {userCareer}</p>
                  <p><strong>Email:</strong> {currentUser?.email}</p>
                  <button className="btn-edit-profile" onClick={() => setIsEditingProfile(true)}>
                    <Edit2 size={16} /> Editar Perfil
                  </button>
                </div>
              ) : (
                <form className="profile-edit-form" onSubmit={handleUpdateProfile}>
                  <label>Nombre a mostrar</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Ej: Tomás" required />
                  
                  <label>Carrera / Especialidad</label>
                  <input type="text" value={editCareer} onChange={e => setEditCareer(e.target.value)} placeholder="Ej: Ing. Informática" required />
                  
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

      {/* Modal QR Expandido */}
      {expandedQRRes && (
        <div className="config-modal-overlay" onClick={() => setExpandedQRRes(null)}>
          <div className="config-modal-content glass-panel" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '0.5rem' }}>Código de Retiro</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Muestra este código al bibliotecario para retirar <br/><strong>"{expandedQRRes.bookTitle}"</strong>
            </p>
            
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              <QRCodeSVG value={`RETIRAR:${expandedQRRes.id}`} size={220} level="L" includeMargin={false} />
            </div>

            <div style={{ marginTop: '2rem' }}>
              <button onClick={() => setExpandedQRRes(null)} className="btn-save-profile" style={{ width: '100%' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MiPerfil;