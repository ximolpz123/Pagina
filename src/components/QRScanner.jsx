import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QRScanner = ({ onScan, onClose }) => {
  const scannerRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        scanner.clear(); // Detener después de éxito
      },
      (error) => {
        // Errores ignorables de "código no encontrado"
      }
    );

    return () => {
      scanner.clear().catch(e => console.error(e));
    };
  }, [onScan]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', padding: '1.5rem', borderRadius: '16px', position: 'relative' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', textAlign: 'center' }}>Escanear QR de Estudiante</h3>
        
        <div id="qr-reader" ref={scannerRef} style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', background: 'white' }}></div>
        
        <button onClick={onClose} style={{ marginTop: '1.5rem', width: '100%', padding: '0.8rem', backgroundColor: 'var(--danger-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default QRScanner;
