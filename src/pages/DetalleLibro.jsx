import React from 'react';
import { useParams } from 'react-router-dom';

const DetalleLibro = () => {
  // Extraemos el ID dinámico de la URL
  const { id } = useParams();

  return (
    <div style={{ padding: '2rem 1rem', paddingBottom: '6rem' }}>
      <h2>Detalle del Libro 📖</h2>
      <p style={{ marginTop: '1rem' }}>Mostrando la información del libro con ID: <strong>{id}</strong></p>
      <p style={{ color: '#64748b', marginTop: '1rem' }}>Aquí cargaremos la portada, sinopsis y el botón de reservar de Firebase.</p>
    </div>
  );
};

export default DetalleLibro;