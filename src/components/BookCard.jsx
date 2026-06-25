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
          <img src={book.coverUrl || 'https://via.placeholder.com/200x300.png?text=Sin+Portada'} alt={`Portada de ${book.title}`} className="book-cover" />
          <button className={`favorite-btn ${isFavorite ? 'active' : ''}`} onClick={toggleFavorite}>
            <Heart fill={isFavorite ? '#ef4444' : 'transparent'} color={isFavorite ? '#ef4444' : 'white'} />
          </button>
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
    </>
  );
};

export default BookCard;