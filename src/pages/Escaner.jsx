import React, { useState } from 'react';
import QRScanner from '../components/QRScanner.jsx';
import { verifyAndApproveReservation } from '../bookService.js';
import './Bibliotecario.css';

const Escaner = () => {
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [showScanner, setShowScanner] = useState(true);
  const [successModal, setSuccessModal] = useState({ show: false, bookTitle: '' });

  const handleStudentQRScan = async (decodedText) => {
    setShowScanner(false);
    if (!decodedText.startsWith('RETIRAR:')) {
      setNotification({ show: true, message: 'QR inválido. No pertenece a una reserva.', type: 'error' });
      return;
    }
    const reservationId = decodedText.split(':')[1];
    setNotification({ show: true, message: 'Verificando préstamo...', type: 'success' });
    
    const res = await verifyAndApproveReservation(reservationId);
    if (res.success) {
      setNotification({ show: false, message: '', type: '' });
      setSuccessModal({ show: true, bookTitle: res.bookTitle });
      
      // Ocultar modal después de 3.5 segundos y volver a mostrar escáner
      setTimeout(() => {
        setSuccessModal({ show: false, bookTitle: '' });
        setShowScanner(true);
      }, 3500);
    } else {
      setNotification({ show: true, message: res.message, type: 'error' });
    }
  };

  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h2 style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>📱 Escáner de Préstamos</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Escanea el código QR del estudiante para procesar su retiro de libro.</p>
      
      {notification.show && (
        <div style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '8px', backgroundColor: notification.type === 'error' ? '#fee2e2' : '#d1fae5', color: notification.type === 'error' ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
          {notification.message}
        </div>
      )}

      {!showScanner && !successModal.show ? (
        <button 
          onClick={() => { setShowScanner(true); setNotification({ show: false, message: '', type: '' }); }}
          style={{ padding: '1rem 2rem', backgroundColor: 'var(--primary-color)', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
        >
          Escanear Nuevo Código
        </button>
      ) : showScanner ? (
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px', border: '2px solid var(--border-color)', backgroundColor: 'var(--card-bg)', padding: '1rem' }}>
          <QRScanner 
            onScan={handleStudentQRScan} 
            onClose={() => setShowScanner(false)} 
          />
        </div>
      ) : null}

      {/* Modal de Éxito Animado */}
      {successModal.show && (
        <div className="success-modal-overlay" style={{ zIndex: 10000 }}>
          <div className="success-modal-content" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
            <div className="success-icon-container">
              <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
            <h3 style={{ color: 'var(--primary-color)' }}>¡Préstamo Verificado!</h3>
            <p style={{ color: 'var(--text-main)', marginTop: '0.5rem' }}>
              Reserva aprobada para el libro:<br/>
              <strong style={{ fontSize: '1.1rem', display: 'block', marginTop: '0.5rem' }}>"{successModal.bookTitle}"</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Escaner;
