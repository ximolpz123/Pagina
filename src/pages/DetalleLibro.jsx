import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { subscribeToBookById, addReservation, updateBookStock, subscribeToActiveReservations } from '../bookService.js';
import './DetalleLibro.css';

const DetalleLibro = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para la reserva y validación de créditos
  const [reservasActivas, setReservasActivas] = useState([]);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnDate, setReturnDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  });

  // Estados para el control de stock del bibliotecario
  const [newStock, setNewStock] = useState('');

  useEffect(() => {
    const unsubscribeBook = subscribeToBookById(id, (data) => {
      if (data) {
        setBook(data);
        setNewStock(data.stock !== undefined ? data.stock : (data.available ? 1 : 0));
      } else {
        setError('No se pudo encontrar el libro.');
      }
      setIsLoading(false);
    });

    // Nos suscribimos a las reservas activas para contar los créditos
    const unsubscribeReservations = subscribeToActiveReservations(setReservasActivas);

    return () => {
      unsubscribeBook();
      unsubscribeReservations();
    };
  }, [id]);

  const handleReserveClick = () => {
    const creditosDisponibles = 5 - reservasActivas.length;
    
    if (creditosDisponibles <= 0) {
      alert('⚠️ ¡Límite de créditos alcanzado! Has llegado al máximo de 5 préstamos activos. Debes devolver un libro para poder reservar otro.');
      return;
    }
    setShowReservationModal(true);
  };

  const handleConfirmReservation = async () => {
    const response = await addReservation(book, pickupDate, returnDate);
    if (response.success) {
      setShowReservationModal(false);
      alert(`✅ ¡Has reservado "${book.title}" con éxito!`);
      navigate('/perfil'); // Redirigir al perfil para ver la reserva
    } else {
      alert('Hubo un error al procesar la reserva.');
    }
  };

  const handleStockUpdate = async () => {
    const stockNum = parseInt(newStock, 10);
    if (!isNaN(stockNum) && stockNum >= 0) {
      await updateBookStock(id, stockNum);
      alert('Stock actualizado correctamente.');
    } else {
      alert('Por favor, ingresa un número de stock válido.');
    }
  };

  if (isLoading) return <p className="loading-state">Cargando detalles del libro...</p>;
  if (error) return <p className="error-state">{error}</p>;
  if (!book) return <p className="error-state">Libro no encontrado.</p>;

  const stock = book.stock !== undefined ? book.stock : (book.available ? 1 : 0);
  const isAvailable = stock > 0;

  return (
    <>
      <div className="detalle-container">
        <button onClick={() => navigate(-1)} className="back-btn">← Volver</button>
        <div className="detalle-content">
          <div className="detalle-cover-wrapper">
            <img src={book.coverUrl || 'https://via.placeholder.com/250x375.png?text=Sin+Portada'} alt={`Portada de ${book.title}`} className="detalle-cover" />
          </div>
          <div className="detalle-info">
            <h1 className="detalle-title">{book.title}</h1>
            <p className="detalle-author">por {book.author}</p>
            <span className={`status-badge ${isAvailable ? 'available' : 'unavailable'}`}>
              {isAvailable ? `Disponible (Quedan ${stock})` : 'Agotado'}
            </span>
            <div className="detalle-synopsis">
              <h3>Sinopsis</h3>
              <p>{book.synopsis || 'No hay sinopsis disponible para este libro.'}</p>
            </div>
            <button className="reserve-btn-large" onClick={handleReserveClick} disabled={!isAvailable}>
              Reservar Libro
            </button>

            {/* Sección de Admin para editar stock */}
            <div className="admin-section">
              <h4>Panel de Bibliotecario</h4>
              <div className="stock-control">
                <input type="number" value={newStock} onChange={(e) => setNewStock(e.target.value)} />
                <button onClick={handleStockUpdate}>Actualizar Stock</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación de Reserva */}
      {showReservationModal && (
        <div className="reservation-modal-overlay">
          <div className="reservation-modal-content">
            <h3>Confirmar Reserva</h3>
            <p>Estás a punto de reservar "{book.title}".</p>
            <div className="date-group">
              <label>Fecha de Retiro</label>
              <input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
            </div>
            <div className="date-group">
              <label>Fecha de Devolución</label>
              <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowReservationModal(false)}>Cancelar</button>
              <button className="confirm-btn" onClick={handleConfirmReservation}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DetalleLibro;