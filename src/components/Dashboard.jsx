import React, { useState, useEffect } from 'react';
import BookCard from './BookCard';
import { subscribeToBooks } from '../bookService';
import './Dashboard.css';

const Dashboard = () => {
  const [books, setBooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Nos suscribimos a los datos en tiempo real
    const unsubscribe = subscribeToBooks((data) => {
      setBooks(data);
      setIsLoading(false);
    });
    
    // Limpiamos el "listener" cuando el componente se desmonta para no gastar memoria
    return () => unsubscribe();
  }, []);

  // Filtrado de libros en base a la barra de búsqueda (Título o Autor)
  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Biblioteca 📚</h1>
      </header>
      
      <main className="dashboard-main">
        <div className="search-section">
          <input 
            type="search" 
            className="global-search-bar" 
            placeholder="Buscar libros, autores..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="ai-autocomplete-placeholder">
            ✨ Autocompletado IA (Próximamente)
          </div>
        </div>

        <section className="books-grid">
          {isLoading ? (
            <p className="loading-text">Cargando catálogo...</p>
          ) : (
            filteredBooks.length > 0 ? (
              filteredBooks.map((book) => <BookCard key={book.id} book={book} />)
            ) : (
              <p className="loading-text">No se encontraron libros 🔎</p>
            )
          )}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;