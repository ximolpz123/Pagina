import React, { useState } from 'react';
import { addBook } from '../bookService.js';
import './Bibliotecario.css';

const Bibliotecario = () => {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    category: 'Informática',
    coverUrl: '',
    synopsis: '',
    stock: Math.floor(Math.random() * 10) + 1 // Stock aleatorio del 1 al 10 por defecto
  });
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Preparamos los datos asegurando que el stock sea un número
    const newBook = {
      ...formData,
      stock: Number(formData.stock),
      available: Number(formData.stock) > 0
    };

    const response = await addBook(newBook);
    setIsLoading(false);

    if (response.success) {
      setNotification({ type: 'success', message: '¡Libro añadido exitosamente! 📚' });
      // Limpiamos el formulario y generamos un nuevo stock aleatorio
      setFormData({ title: '', author: '', category: 'Informática', coverUrl: '', synopsis: '', stock: Math.floor(Math.random() * 10) + 1 });
      setTimeout(() => setNotification(null), 4000);
    } else {
      setNotification({ type: 'error', message: 'Error al añadir el libro.' });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <div className="bibliotecario-container">
      <header className="bibliotecario-header">
        <h2>Gestión de Biblioteca 💼</h2>
      </header>
      
      <main className="bibliotecario-main">
        <div className="form-card">
          <h3>Añadir Nuevo Libro</h3>
          <p className="form-subtitle">Ingresa los detalles para registrar un libro en Firestore.</p>
          
          {notification && (
            <div className={`notification ${notification.type}`}>
              {notification.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="add-book-form">
            <div className="input-group">
              <label>Título del Libro *</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} required placeholder="Ej: Clean Code" />
            </div>
            <div className="input-group">
              <label>Autor *</label>
              <input type="text" name="author" value={formData.author} onChange={handleChange} required placeholder="Ej: Robert C. Martin" />
            </div>
            <div className="input-group">
              <label>Categoría</label>
              <select name="category" value={formData.category} onChange={handleChange}>
                <option value="Informática">Informática y Programación</option>
                <option value="Ciencias Básicas">Ciencias Básicas</option>
                <option value="Medicina">Medicina</option>
                <option value="Literatura">Literatura</option>
              </select>
            </div>
            <div className="input-group">
              <label>Cantidad en Stock</label>
              <input type="number" name="stock" value={formData.stock} onChange={handleChange} min="0" required />
            </div>
            <div className="input-group">
              <label>URL de la Portada (Imagen)</label>
              <input type="url" name="coverUrl" value={formData.coverUrl} onChange={handleChange} placeholder="https://ejemplo.com/imagen.jpg" />
            </div>
            <div className="input-group">
              <label>Sinopsis *</label>
              <textarea name="synopsis" value={formData.synopsis} onChange={handleChange} required rows="4" placeholder="Breve descripción del libro..."></textarea>
            </div>
            <button type="submit" className="submit-btn" disabled={isLoading}>{isLoading ? 'Guardando...' : 'Guardar Libro en Base de Datos'}</button>
          </form>
        </div>
      </main>
    </div>
  );
};
export default Bibliotecario;