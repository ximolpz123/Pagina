import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const ISBNScanner = ({ onScanSuccess, onScanFailure }) => {
  const scannerRef = useRef(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    if (isMountedRef.current) return;
    isMountedRef.current = true;

    // Configurar escáner optimizado para código de barras (rectangular)
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 300, height: 150 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE
        ]
      },
      false
    );

    const handleSuccess = (decodedText, decodedResult) => {
      // Limpiamos la UI y detenemos la cámara de inmediato para no saturar
      scanner.clear().then(() => {
        if (onScanSuccess) {
          onScanSuccess(decodedText);
        }
      }).catch(error => {
        console.error("Failed to clear html5QrcodeScanner. ", error);
        // Aun si falla el clear, llamamos al success
        if (onScanSuccess) onScanSuccess(decodedText);
      });
    };

    scanner.render(handleSuccess, onScanFailure);
    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner. ", error);
        });
        scannerRef.current = null;
      }
      isMountedRef.current = false;
    };
  }, [onScanSuccess, onScanFailure]);

  return (
    <div className="scanner-container">
      <div id="qr-reader" style={{ width: '100%', maxWidth: '500px', margin: '0 auto', background: 'white', borderRadius: '12px', overflow: 'hidden' }}></div>
      <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Apunta la cámara al código de barras trasero (ISBN)
      </p>
    </div>
  );
};

export default ISBNScanner;
