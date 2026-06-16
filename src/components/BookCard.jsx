import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reserveBookById } from '../bookService.js';
import './BookCard.css';

const BookCard = ({ book }) => {
  const [isReserving, setIsReserving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const handleReserve = async () => {
    setIsReserving(true);
    // Llamada simulada a la base de datos
    const response = await reserveBookById(book.id);
    setIsReserving(false);
    
    if (response.success) {
      setShowModal(true);
      setTimeout(() => setShowModal(false), 3000); // Ocultar alerta en 3 seg
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
          onClick={handleReserve}
          disabled={!isAvailable || isReserving}
        >
          {isReserving ? 'Procesando...' : 'Reservar en 1 Clic'}
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
    </div>
  );
};

export default BookCard;