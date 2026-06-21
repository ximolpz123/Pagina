import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { subscribeToBookById, addReservation, updateBookStock, subscribeToUserActiveReservations, getBookReviews } from '../bookService.js';
import toast from 'react-hot-toast';
import { Heart, Star } from 'lucide-react';
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
  const [reviews, setReviews] = useState([]);

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
    
    getBookReviews(id).then(data => setReviews(data));

    return () => {
      if (typeof unsubscribeBook === 'function') unsubscribeBook();
      if (typeof unsubscribeReservations === 'function') unsubscribeReservations();
    };
    // eslint-disable-next-line
  }, [id, currentUser?.email]);

  const handleReserveClick = async () => {
    const creditosDisponibles = 5 - (reservasActivas?.length || 0);
    if (creditosDisponibles <= 0) return setShowCreditLimitModal(true);
    
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
      setTimeout(() => navigate('/perfil'), 2000);
    } else {
      toast.error('Hubo un error al procesar la reserva.', { id: toastId });
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
    <main>
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

        <section className="reviews-section" style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Comentarios de los Lectores</h3>
          {reviews.length > 0 ? (
            <div className="reviews-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reviews.map(review => (
                <div key={review.id} className="review-card glass-panel" style={{ padding: '1rem', borderRadius: '12px' }}>
                  <div className="review-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {review.userPhoto ? (
                        <img src={review.userPhoto} alt="Avatar" style={{ width: 24, height: 24, borderRadius: '50%' }} />
                      ) : (
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                          {(review.userDisplayName || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{review.userDisplayName}</span>
                    </div>
                    <div className="stars">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill={i < review.rating ? '#f59e0b' : 'transparent'} color={i < review.rating ? '#f59e0b' : 'var(--text-muted)'} />
                      ))}
                    </div>
                  </div>
                  {review.text && <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>"{review.text}"</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', borderRadius: '12px', color: 'var(--text-muted)' }}>
              Aún no hay reseñas para este libro. ¡Sé el primero en pedirlo y dar tu opinión!
            </div>
          )}
        </section>
      </div>

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
    </main>
  );
};

export default DetalleLibro;