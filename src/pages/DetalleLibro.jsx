import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { subscribeToBookById, addReservation, updateBookStock, subscribeToUserActiveReservations } from '../bookService.js';
import { Heart } from 'lucide-react';
import './DetalleLibro.css';
import { useAuth } from '../context/AuthContext';

const DetalleLibro = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [book, setBook] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  
  const [reservasActivas, setReservasActivas] = useState([]);
  const [showCreditLimitModal, setShowCreditLimitModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [newStock, setNewStock] = useState('');

  useEffect(() => {
    const favKey = `fav_${currentUser?.email || 'guest'}`;
    const favs = JSON.parse(localStorage.getItem(favKey) || '[]');
    // eslint-disable-next-line
    setIsFavorite(favs.includes(id));

    const unsubscribeBook = subscribeToBookById(id, (data) => {
      if (data) {
        setBook({ ...data, rating: data.rating || ((data.title?.length % 3) + 3) });
        setNewStock(data.stock !== undefined ? data.stock : (data.available ? 1 : 0));
      } else {
        setError('No se pudo encontrar el libro.');
      }
      setIsLoading(false);
    });

    const unsubscribeReservations = subscribeToUserActiveReservations(currentUser?.email, setReservasActivas);

    return () => {
      if (typeof unsubscribeBook === 'function') unsubscribeBook();
      if (typeof unsubscribeReservations === 'function') unsubscribeReservations();
    };
  }, [id]);

  const handleReserveClick = async () => {
    const creditosDisponibles = 5 - (reservasActivas?.length || 0);
    if (creditosDisponibles <= 0) return setShowCreditLimitModal(true);
    
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const returnDay = nextWeek.toISOString().split('T')[0];
    
    const response = await addReservation(book, today, returnDay, currentUser?.email);
    if (response.success) {
      setShowSuccessModal(true);
      setTimeout(() => { setShowSuccessModal(false); navigate('/perfil'); }, 2000);
    } else {
      alert('Hubo un error al procesar la reserva.');
    }
  };

  const handleRequestStock = () => {
    alert(`🔔 Se ha notificado a la biblioteca para solicitar más stock de "${book.title}".`);
  };

  const handleStockUpdate = async () => {
    const stockNum = parseInt(newStock, 10);
    if (!isNaN(stockNum) && stockNum >= 0) {
      await updateBookStock(id, stockNum);
      alert('Stock actualizado correctamente.');
    } else {
      alert('Por favor, ingresa un número válido.');
    }
  };

  const handleToggleFavorite = () => {
    const favKey = `fav_${currentUser?.email || 'guest'}`;
    let favs = JSON.parse(localStorage.getItem(favKey) || '[]');
    
    if (isFavorite) {
      favs = favs.filter(favId => favId !== id);
      setIsFavorite(false);
    } else {
      favs.push(id);
      setIsFavorite(true);
    }
    
    localStorage.setItem(favKey, JSON.stringify(favs));
    window.dispatchEvent(new Event('favoritesUpdated'));
  };

  if (isLoading) return <div className="loading-state">Cargando la magia del libro...</div>;
  if (error || !book) return <div className="error-state">Libro no encontrado.</div>;

  const stock = book.stock !== undefined ? book.stock : (book.available ? 1 : 0);
  const isAvailable = stock > 0;
  const renderStars = () => '⭐'.repeat(book.rating) + '☆'.repeat(5 - book.rating);

  return (
    <>
      <div className="detalle-container">
        <button onClick={() => navigate(-1)} className="back-btn">← Volver</button>
        <div className="detalle-content glass-panel">
          <div className="detalle-cover-wrapper">
            <img src={book.coverUrl || 'https://via.placeholder.com/250x375.png?text=Sin+Portada'} alt={book.title} className="detalle-cover" />
            <button className={`detalle-favorite-btn ${isFavorite ? 'active' : ''}`} onClick={handleToggleFavorite}>
              <Heart fill={isFavorite ? '#ef4444' : 'transparent'} color={isFavorite ? '#ef4444' : 'white'} size={28} />
            </button>
          </div>
          <div className="detalle-info">
            <h1 className="detalle-title">{book.title}</h1>
            <p className="detalle-author">por {book.author}</p>
            <div className="detalle-rating">{renderStars()}</div>
            
            <span className={`status-badge ${isAvailable ? 'available' : 'unavailable'}`}>
              {isAvailable ? `Disponible (Quedan ${stock})` : 'Agotado'}
            </span>
            
            <div className="detalle-synopsis">
              <h3>Sinopsis</h3>
              <p>{book.synopsis || 'Sinopsis no disponible en la base de datos.'}</p>
            </div>
            
            {isAvailable ? (
              <div className="detalle-action-buttons">
                <button className="reserve-btn-large" onClick={handleReserveClick}>
                  Reservar
                </button>
              </div>
            ) : (
              <button className="request-stock-btn-large" onClick={handleRequestStock}>
                🔔 Solicitar Stock a Biblioteca
              </button>
            )}

            <div className="admin-section glass-panel">
              <h4>Panel de Bibliotecario</h4>
              <div className="stock-control">
                <input type="number" value={newStock} onChange={(e) => setNewStock(e.target.value)} />
                <button onClick={handleStockUpdate}>Actualizar</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSuccessModal && (
        <div className="success-modal-top">
          <div className="success-modal-icon">✅</div>
          <div className="success-modal-text">
            <span>¡Reserva Exitosa!</span>
            <p>Has reservado "{book.title}". Redirigiendo a tu perfil...</p>
          </div>
        </div>
      )}



      {showCreditLimitModal && (
        <div className="reservation-modal-overlay">
          <div className="reservation-modal-content warning-modal glass-panel">
            <span className="warning-icon">⚠️</span>
            <h3>Límite de Créditos Alcanzado</h3>
            <p>Has llegado al máximo de 5 préstamos activos.</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowCreditLimitModal(false)}>Entendido</button>
              <button className="confirm-btn" onClick={() => { setShowCreditLimitModal(false); navigate('/perfil'); }}>Ir a Mi Perfil</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DetalleLibro;