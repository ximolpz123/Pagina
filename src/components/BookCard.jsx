import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addReservation, checkBannedCategory } from '../bookService.js';
import toast from 'react-hot-toast';
import './BookCard.css';
import { useAuth } from '../context/AuthContext';
import { Heart } from 'lucide-react';

const BookCard = ({ book, creditosDisponibles, hideReserveButton, hideDetailsButton, reservasActivas = [] }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isLibrarian = currentUser?.email === 'bibliotecario@santotomas.cl';
  const [showCreditLimitModal, setShowCreditLimitModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [stockRequested, setStockRequested] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isReserving, setIsReserving] = useState(false);

  const stock = book.stock !== undefined ? book.stock : (book.available ? 1 : 0);
  const isAvailable = stock > 0;
  const rating = book.rating || 4;

  let statusClass = 'unavailable';
  let statusText = '🔴 Agotado / Prestado';
  if (stock > 1) {
    statusClass = 'available';
    statusText = `🟢 Disponible (${stock})`;
  } else if (stock === 1) {
    statusClass = 'last-copy';
    statusText = '🟡 Última copia';
  }

  useEffect(() => {
    const favKey = `fav_${currentUser?.email || 'guest'}`;
    const favs = JSON.parse(localStorage.getItem(favKey) || '[]');
    // eslint-disable-next-line
    setIsFavorite(favs.includes(book.id));
  }, [book.id, currentUser]);

  const handleReserveClick = async () => {
    if (!isAvailable) {
      toast.error('Este libro está agotado y no se puede reservar.');
      return;
    }
    if (creditosDisponibles <= 0) return setShowCreditLimitModal(true);

    const isBanned = await checkBannedCategory(currentUser?.email, book.category || 'General');
    if (isBanned) {
      toast.error(`Tienes una penalización activa. No puedes reservar libros de género '${book.category || 'General'}' durante 1 semana.`);
      return;
    }
    
    const isDuplicate = reservasActivas.some(r => r.bookId === book.id);
    if (isDuplicate) {
      setShowDuplicateModal(true);
      return;
    }
    
    await executeReservation();
  };

  const executeReservation = async () => {
    setShowDuplicateModal(false);
    setIsReserving(true);
    
    // Simular un pequeño tiempo de procesamiento de red (1.5s) para UX
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Reserva Express (1-Click)
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const returnDay = nextWeek.toISOString().split('T')[0];
    
    const toastId = toast.loading('Procesando reserva...');
    const response = await addReservation(book, today, returnDay, currentUser?.email);
    
    if (response.success) {
      toast.success(
        <div>
          <b>¡Reserva Exitosa!</b><br/>
          Has reservado "{book.title}".<br/>
          <span style={{ fontSize: '0.8rem', color: '#f59e0b' }}>⚠️ Recuerda devolverlo en máximo 1 semana.</span>
        </div>,
        { id: toastId, duration: 5000 }
      );
    } else {
      toast.error('Hubo un error al procesar la reserva.', { id: toastId });
    }
    
    setIsReserving(false);
  };

  const handleCoverClick = () => {
    navigate(`/libro/${book.id}`);
  };

  const handleRequestStock = () => {
    if (stockRequested) return;
    setStockRequested(true);
    toast.success(`Se notificó a la biblioteca para reponer "${book.title}".`, { icon: '📨', duration: 4000 });
  };

  const toggleFavorite = (e) => {
    e.stopPropagation();
    const favKey = `fav_${currentUser?.email || 'guest'}`;
    let favs = JSON.parse(localStorage.getItem(favKey) || '[]');
    
    if (isFavorite) {
      favs = favs.filter(id => id !== book.id);
      setIsFavorite(false);
      toast('Eliminado de favoritos', { icon: '💔' });
    } else {
      favs.push(book.id);
      setIsFavorite(true);
      toast('Añadido a favoritos', { icon: '❤️' });
    }
    
    localStorage.setItem(favKey, JSON.stringify(favs));
    window.dispatchEvent(new Event('favoritesUpdated'));
  };

  const renderStars = () => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <>
      <div className="book-card glass-panel">
        <div className="cover-container" onClick={handleCoverClick} style={{ cursor: 'pointer' }}>
          <div className="cover-inner">
            <div className="cover-front">
              <img src={book.coverUrl || 'https://via.placeholder.com/200x300.png?text=Sin+Portada'} alt={`Portada de ${book.title}`} className="book-cover" />
            </div>
            <div className="cover-back">
              <div className="cover-back-content">
                <h4>Sinopsis</h4>
                <p>{book.synopsis || 'Resumen no disponible para esta obra. Explora más en los detalles.'}</p>
              </div>
            </div>
          </div>
          {!isLibrarian && (
            <button className={`favorite-btn ${isFavorite ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleFavorite(); }}>
              <Heart fill={isFavorite ? '#ef4444' : 'transparent'} color={isFavorite ? '#ef4444' : 'white'} />
            </button>
          )}
        </div>
        <div className="book-info">
          <h3 className="book-title">{book.title}</h3>
          <p className="book-author">{book.author}</p>
          <div className="book-rating">{renderStars()}</div>
          
          <span className={`status-badge ${statusClass}`}>
            {statusText}
          </span>
          
          <div className="book-actions">
            {!isLibrarian && !hideReserveButton && isAvailable && (
              <button className="reserve-btn" onClick={handleReserveClick} title="Reserva rápida por 1 semana">
                ⚡ Reserva
              </button>
            )}
            {!isLibrarian && !isAvailable && !hideReserveButton && (
              <button 
                className="request-stock-btn" 
                onClick={handleRequestStock}
                disabled={stockRequested}
              >
                {stockRequested ? '✅ Ya solicitado' : '🔔 Solicitar Stock'}
              </button>
            )}
            {!hideDetailsButton && (
              <button className="details-btn" onClick={() => navigate(`/libro/${book.id}`)}>
                Ver Detalles
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal de Límite de Créditos */}
      {showCreditLimitModal && (
        <div className="reservation-modal-overlay">
          <div className="reservation-modal-content warning-modal glass-panel">
            <span className="warning-icon">⚠️</span>
            <h3>Límite de Créditos Alcanzado</h3>
            <p>Has llegado al máximo de 5 préstamos activos. Debes devolver un libro para poder reservar otro.</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowCreditLimitModal(false)}>Entendido</button>
              <button className="confirm-btn" onClick={() => { setShowCreditLimitModal(false); navigate('/perfil'); }}>Ir a Mi Perfil</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Reserva Duplicada */}
      {showDuplicateModal && (
        <div className="reservation-modal-overlay">
          <div className="reservation-modal-content warning-modal glass-panel">
            <span className="warning-icon" style={{ color: 'var(--tertiary-color)' }}>🔄</span>
            <h3 style={{ color: 'var(--text-main)' }}>¿Reservar otra copia?</h3>
            <p>Ya tienes una reserva activa de este libro. ¿Estás seguro de que quieres volver a reservarlo?</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowDuplicateModal(false)}>Cancelar</button>
              <button className="confirm-btn" style={{ background: 'var(--tertiary-color)' }} onClick={executeReservation}>Sí, Reservar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Carga Procesando Reserva */}
      {isReserving && (
        <div className="reservation-modal-overlay">
          <div className="reservation-modal-content glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1.5rem auto', width: '50px', height: '50px', border: '5px solid var(--border-color)', borderTop: '5px solid var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <h3 style={{ color: 'var(--text-main)' }}>Procesando Reserva...</h3>
            <p style={{ color: 'var(--text-muted)' }}>Conectando con la biblioteca y apartando tu copia física.</p>
          </div>
        </div>
      )}
    </>
  );
};

export default BookCard;