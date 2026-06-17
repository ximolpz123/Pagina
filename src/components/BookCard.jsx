import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addReservation } from '../bookService.js';
import './BookCard.css';

const BookCard = ({ book }) => {
  const [isReserving, setIsReserving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showResModal, setShowResModal] = useState(false);
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnDate, setReturnDate] = useState('');
  const navigate = useNavigate();

  const confirmReservation = async () => {
    if (!pickupDate || !returnDate) {
      alert('Por favor selecciona las fechas.');
      return;
    }
    setIsReserving(true);
    const response = await addReservation(book, pickupDate, returnDate);
    setIsReserving(false);
    setShowResModal(false);
    
    if (response.success) {
      setShowModal(true);
      setTimeout(() => setShowModal(false), 3000);
    }
  };

  // Calculamos el stock actual asegurando compatibilidad con los libros que subiste antes
  const stockActual = book.stock !== undefined ? book.stock : (book.available ? 1 : 0);
  const isAvailable = stockActual > 0;

  return (
    <div className="book-card">
      <div 
        className="cover-container" 
        onClick={() => navigate(`/detalle/${book.id}`)} 
        style={{ cursor: 'pointer' }}
      >
        <img src={book.coverUrl} alt={`Portada de ${book.title}`} className="book-cover" />
      </div>
      <div className="book-info">
        <h3 
          className="book-title" 
          onClick={() => navigate(`/detalle/${book.id}`)} 
          style={{ cursor: 'pointer' }}
        >{book.title}</h3>
        <p className="book-author">{book.author}</p>
        
        <div className={`status-badge ${isAvailable ? 'available' : 'unavailable'}`}>
          {isAvailable ? `Disponible (${stockActual})` : 'Agotado'}
        </div>

        <button 
          className="reserve-btn" 
          onClick={() => setShowResModal(true)}
          disabled={!isAvailable || isReserving}
        >
          Reservar
        </button>
      </div>
      
      {showModal && (
        <div className="success-modal">
          <div className="modal-content">
            <span>✅ Confirmación Exitosa</span>
            <p>Se ha reservado "{book.title}".</p>
          </div>
        </div>
      )}

      {showResModal && (
        <div className="reservation-modal-overlay">
          <div className="reservation-modal-content">
            <h3>📅 Programar Reserva</h3>
            <div className="date-group">
              <label>Fecha de Retiro:</label>
              <input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="date-group">
              <label>Fecha de Devolución:</label>
              <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} min={pickupDate} />
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowResModal(false)}>Cancelar</button>
              <button className="confirm-btn" onClick={confirmReservation} disabled={isReserving}>{isReserving ? '...' : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookCard;