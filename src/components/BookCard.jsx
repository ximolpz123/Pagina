import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addReservation } from '../bookService.js';
import './BookCard.css';
import { useAuth } from '../context/AuthContext';

const BookCard = ({ book, creditosDisponibles }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCreditLimitModal, setShowCreditLimitModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnDate, setReturnDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7); // Por defecto 7 días de préstamo
    return date.toISOString().split('T')[0];
  });

  const stock = book.stock !== undefined ? book.stock : (book.available ? 1 : 0);
  const isAvailable = stock > 0;

  const handleReserveClick = () => {
    // 1. Verificamos si el libro tiene stock
    if (!isAvailable) {
      alert('Este libro está agotado y no se puede reservar.');
      return;
    }

    // 2. ¡NUEVA VALIDACIÓN! Verificamos los créditos de préstamo.
    if (creditosDisponibles <= 0) {
      setShowCreditLimitModal(true);
      return;
    }

    // 3. Si todo está bien, mostramos el modal de confirmación.
    setShowReservationModal(true);
  };

  const handleConfirmReservation = async () => {
    const response = await addReservation(book, pickupDate, returnDate, currentUser?.email);
    if (response.success) {
      setShowReservationModal(false);
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 3000);
    } else {
      alert('Hubo un error al procesar la reserva.');
    }
  };

  // Navegar al detalle del libro al hacer clic en la portada
  const handleCoverClick = () => {
    navigate(`/libro/${book.id}`);
  };

  // Solicitar stock a la biblioteca
  const handleRequestStock = () => {
    setShowRequestModal(true);
    setTimeout(() => setShowRequestModal(false), 3000);
  };

  return (
    <>
      <div className="book-card">
        <div className="cover-container" onClick={handleCoverClick} style={{ cursor: 'pointer' }}>
          <img src={book.coverUrl || 'https://via.placeholder.com/200x300.png?text=Sin+Portada'} alt={`Portada de ${book.title}`} className="book-cover" />
        </div>
        <div className="book-info">
          <h3 className="book-title">{book.title}</h3>
          <p className="book-author">{book.author}</p>
          <span className={`status-badge ${isAvailable ? 'available' : 'unavailable'}`}>
            {isAvailable ? `Disponible (${stock})` : 'Agotado'}
          </span>
          {isAvailable ? (
            <button className="reserve-btn" onClick={handleReserveClick}>
              Reservar
            </button>
          ) : (
            <button className="request-stock-btn" onClick={handleRequestStock}>
              🔔 Solicitar Stock
            </button>
          )}
        </div>
      </div>

      {/* Modal de Éxito */}
      {showSuccessModal && (
        <div className="success-modal">
          <span>¡Reserva Exitosa! ✅</span>
          <p>Has reservado "{book.title}".</p>
        </div>
      )}

      {/* Modal de Solicitud de Stock */}
      {showRequestModal && (
        <div className="success-modal request-modal">
          <span>¡Solicitud Enviada! 📨</span>
          <p>Se ha notificado a la biblioteca para reponer "{book.title}".</p>
        </div>
      )}

      {/* Modal de Confirmación de Reserva */}
      {showReservationModal && (
        <div className="reservation-modal-overlay">
          <div className="reservation-modal-content">
            <h3>Confirmar Reserva</h3>
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

      {/* Modal de Límite de Créditos */}
      {showCreditLimitModal && (
        <div className="reservation-modal-overlay">
          <div className="reservation-modal-content warning-modal">
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
    </>
  );
};

export default BookCard;