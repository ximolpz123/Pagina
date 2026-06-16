import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { subscribeToBookById, reserveBookById, updateBookStock } from '../bookService.js';
import './DetalleLibro.css';

const DetalleLibro = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReserving, setIsReserving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Estados para modificar el stock
  const [newStock, setNewStock] = useState('');
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToBookById(id, (data) => {
      setBook(data);
      if (data) {
        const current = data.stock !== undefined ? data.stock : (data.available ? 1 : 0);
        setNewStock(current);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  const handleReserve = async () => {
    setIsReserving(true);
    const response = await reserveBookById(book.id);
    setIsReserving(false);
    
    if (response.success) {
      setShowModal(true);
      setTimeout(() => setShowModal(false), 3000);
    }
  };

  const handleUpdateStock = async () => {
    setIsUpdatingStock(true);
    await updateBookStock(book.id, Number(newStock));
    setIsUpdatingStock(false);
    alert('✅ Stock actualizado correctamente en la base de datos.');
  };

  if (isLoading) return <div className="loading-state">Cargando detalles del libro...</div>;
  if (!book) return <div className="error-state">No pudimos encontrar este libro 😕</div>;

  const stockActual = book.stock !== undefined ? book.stock : (book.available ? 1 : 0);
  const isAvailable = stockActual > 0;

  return (
    <div className="detalle-container">
      <button className="back-btn" onClick={() => navigate(-1)}>← Volver</button>
      
      <div className="detalle-content">
        <div className="detalle-cover-wrapper">
          <img src={book.coverUrl || 'https://placehold.co/300x450/e2e8f0/64748b?text=Sin+Portada'} alt={`Portada de ${book.title}`} className="detalle-cover" />
        </div>
        
        <div className="detalle-info">
          <h2 className="detalle-title">{book.title}</h2>
          <p className="detalle-author">{book.author}</p>
          
          <div className={`status-badge ${isAvailable ? 'available' : 'unavailable'}`}>
            {isAvailable ? `Disponible (${stockActual} en inventario)` : 'Agotado'}
          </div>

          <div className="detalle-synopsis">
            <h3>Sinopsis</h3>
            <p>{book.synopsis || 'No hay sinopsis disponible para este libro en este momento.'}</p>
          </div>

          <button 
            className="reserve-btn-large" 
            onClick={handleReserve}
            disabled={!isAvailable || isReserving}
          >
            {isReserving ? 'Procesando...' : 'Reservar Libro en 1 Clic'}
          </button>

          {/* Controles de Administrador */}
          <div className="admin-section">
            <h4>⚙️ Administrar Inventario</h4>
            <div className="stock-control">
              <input 
                type="number" 
                min="0" 
                value={newStock} 
                onChange={(e) => setNewStock(e.target.value)} 
              />
              <button onClick={handleUpdateStock} disabled={isUpdatingStock}>
                {isUpdatingStock ? 'Guardando...' : 'Actualizar Stock'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="success-modal">
          <div className="modal-content">
            <span>✅ Confirmación Exitosa</span>
            <p>Has reservado "{book.title}" con éxito.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetalleLibro;