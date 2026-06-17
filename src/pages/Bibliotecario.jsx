import React, { useState } from 'react';
import { addBook } from '../bookService.js';
import './Bibliotecario.css';

const Bibliotecario = () => {
  const [bookData, setBookData] = useState({
    title: '',
    author: '',
    category: 'Informática',
    stock: 1,
    coverUrl: '',
    synopsis: ''
  });
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBookData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bookData.title || !bookData.author) {
      setNotification({ show: true, message: 'El título y el autor son obligatorios.', type: 'error' });
      return;
    }

    const dataToSave = {
      ...bookData,
      stock: parseInt(bookData.stock, 10),
      available: parseInt(bookData.stock, 10) > 0
    };

    const response = await addBook(dataToSave);
    if (response.success) {
      setNotification({ show: true, message: `¡Libro "${bookData.title}" añadido con éxito!`, type: 'success' });
      // Reset form
      setBookData({
        title: '',
        author: '',
        category: 'Informática',
        stock: 1,
        coverUrl: '',
        synopsis: ''
      });
    } else {
      setNotification({ show: true, message: response.message || 'Hubo un error al añadir el libro.', type: 'error' });
    }

    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  return (
    <div className="bibliotecario-container">
      <header className="bibliotecario-header">
        <h2>Panel del Bibliotecario 🧑‍🏫</h2>
      </header>
      <main className="bibliotecario-main">
        <div className="form-card">
          <h3>Añadir Nuevo Libro al Catálogo</h3>
          <p className="form-subtitle">Completa los datos para registrar un nuevo ejemplar.</p>
          
          {notification.show && (
            <div className={`notification ${notification.type}`}>
              {notification.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="add-book-form">
            <div className="input-group"><label htmlFor="title">Título del Libro</label><input type="text" id="title" name="title" value={bookData.title} onChange={handleChange} required /></div>
            <div className="input-group"><label htmlFor="author">Autor</label><input type="text" id="author" name="author" value={bookData.author} onChange={handleChange} required /></div>
            <div className="input-group"><label htmlFor="category">Categoría</label><select id="category" name="category" value={bookData.category} onChange={handleChange}><option value="Informática">Informática y Programación</option><option value="Ciencias Básicas">Ciencias Básicas</option><option value="Medicina">Medicina</option><option value="Literatura">Literatura</option><option value="Ciencia Ficcion">Ciencia Ficción</option><option value="Romance">Romance</option><option value="Fantasia">Fantasía</option><option value="Acción">Acción</option><option value="Comics">Comics</option><option value="Thriller">Thriller</option></select></div>
            <div className="input-group"><label htmlFor="stock">Stock (Cantidad)</label><input type="number" id="stock" name="stock" value={bookData.stock} onChange={handleChange} min="0" required /></div>
            <div className="input-group"><label htmlFor="coverUrl">URL de la Portada</label><input type="url" id="coverUrl" name="coverUrl" value={bookData.coverUrl} onChange={handleChange} placeholder="https://ejemplo.com/portada.jpg" /></div>
            <div className="input-group"><label htmlFor="synopsis">Sinopsis</label><textarea id="synopsis" name="synopsis" value={bookData.synopsis} onChange={handleChange} rows="4"></textarea></div>
            <button type="submit" className="submit-btn">Añadir Libro</button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Bibliotecario;