import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { subscribeToBookById, addReservation, updateBookStock, subscribeToUserActiveReservations, getBookReviews, checkBannedCategory, deleteBook } from '../bookService.js';
import toast from 'react-hot-toast';
import { Heart, Star } from 'lucide-react';
import './DetalleLibro.css';
import { useAuth } from '../context/AuthContext';

const DetalleLibro = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isLibrarian = currentUser?.email === 'bibliotecario@santotomas.cl';

  const [book, setBook] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  
  const [reservasActivas, setReservasActivas] = useState([]);
  const [showCreditLimitModal, setShowCreditLimitModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [stockRequested, setStockRequested] = useState(false);

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
    if (stockRequested) return;
    setStockRequested(true);
    toast.success(`Se notificó a la biblioteca para reponer "${book.title}".`, { icon: '📨', duration: 4000 });
  };

  const handleStockUpdate = async () => {
    const stockInt = parseInt(newStock, 10);
    if (isNaN(stockInt) || stockInt < 0) {
      toast.error('El stock debe ser un número válido mayor o igual a 0');
      return;
    }
    const res = await updateBookStock(id, stockInt);
    if (res.success) {
      toast.success('Stock actualizado correctamente');
    } else {
      toast.error('Error al actualizar el stock');
    }
  };

  const handleDeleteBook = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteBook = async () => {
    const res = await deleteBook(id);
    if (res.success) {
      toast.success('Libro eliminado correctamente');
      navigate('/'); // Redirigir al inicio después de eliminar
    } else {
      toast.error('Error al eliminar el libro');
    }
    setShowDeleteModal(false);
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

  let statusClass = 'unavailable';
  let statusText = '🔴 Agotado / Prestado';
  if (stock > 1) {
    statusClass = 'available';
    statusText = `🟢 Disponible (${stock})`;
  } else if (stock === 1) {
    statusClass = 'last-copy';
    statusText = '🟡 Última copia';
  }

  return (
    <main>
      <div className="detalle-container">
        <button onClick={() => navigate(-1)} className="back-btn">← Volver</button>
        <div className="detalle-content glass-panel">
          <div className="detalle-cover-wrapper">
            <img src={book.coverUrl || 'https://via.placeholder.com/250x375.png?text=Sin+Portada'} alt={book.title} className="detalle-cover" />
            {!isLibrarian && (
              <button className={`detalle-favorite-btn ${isFavorite ? 'active' : ''}`} onClick={handleToggleFavorite}>
                <Heart fill={isFavorite ? '#ef4444' : 'transparent'} color={isFavorite ? '#ef4444' : 'white'} size={28} />
              </button>
            )}
          </div>
          <div className="detalle-info">
            <h1 className="detalle-title">{book.title}</h1>
            <p className="detalle-author">por {book.author}</p>
            <div className="detalle-rating">{renderStars()}</div>
            
            <span className={`status-badge ${statusClass}`}>
              {statusText}
            </span>
            
            <div className="detalle-synopsis">
              <h3>Sinopsis</h3>
              <p>{book.synopsis || 'Sinopsis no disponible en la base de datos.'}</p>
            </div>
            
            {!isLibrarian && (
              isAvailable ? (
                <div className="detalle-action-buttons">
                  <button className="reserve-btn-large" onClick={handleReserveClick}>
                    Reservar
                  </button>
                </div>
              ) : (
                <button 
                  className="request-stock-btn-large" 
                  onClick={handleRequestStock}
                  disabled={stockRequested}
                >
                  {stockRequested ? '✅ Ya solicitado' : '🔔 Solicitar Stock a Biblioteca'}
                </button>
              )
            )}

            {isLibrarian && (
              <div className="admin-section glass-panel" style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid var(--primary-color)' }}>
                <h4 style={{ color: 'var(--text-main)', marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 'bold' }}>Panel de Bibliotecario</h4>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>Actualizar stock:</label>
                    <input 
                      type="number" 
                      value={newStock} 
                      onChange={(e) => setNewStock(e.target.value)} 
                      style={{ 
                        width: '80px', 
                        padding: '0.6rem', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border-color)', 
                        background: 'var(--input-bg)', 
                        color: 'var(--text-main)',
                        outline: 'none'
                      }} 
                      min="0"
                    />
                    <button 
                      onClick={handleStockUpdate}
                      style={{ 
                        padding: '0.6rem 1.2rem', 
                        background: 'var(--primary-color)', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        fontWeight: 'bold',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.background = 'var(--primary-hover)'}
                      onMouseOut={(e) => e.target.style.background = 'var(--primary-color)'}
                    >
                      Actualizar
                    </button>
                  </div>
                  
                  <button 
                    onClick={handleDeleteBook}
                    style={{ 
                      padding: '0.6rem 1.2rem', 
                      background: 'var(--danger-color)', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '8px', 
                      cursor: 'pointer', 
                      fontWeight: 'bold', 
                      marginLeft: 'auto',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#b91c1c'}
                    onMouseOut={(e) => e.target.style.background = 'var(--danger-color)'}
                  >
                    Eliminar libro
                  </button>
                </div>
              </div>
            )}
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
      {showDeleteModal && (
        <div className="reservation-modal-overlay">
          <div className="reservation-modal-content danger-modal glass-panel">
            <span className="warning-icon" style={{ fontSize: '3rem', color: 'var(--danger-color)' }}>⚠️</span>
            <h3 style={{ color: 'var(--text-main)', marginTop: '1rem' }}>¿Eliminar este libro?</h3>
            <p style={{ color: 'var(--text-muted)' }}>Esta acción es permanente y no se puede deshacer. El libro desaparecerá del catálogo para todos los estudiantes.</p>
            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button className="cancel-btn" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
              <button className="confirm-btn" style={{ background: 'var(--danger-color)' }} onClick={confirmDeleteBook}>Sí, Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default DetalleLibro;