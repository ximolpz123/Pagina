import React, { useState, useEffect } from 'react';
import BookCard from '../components/BookCard.jsx';
import { subscribeToBooks } from '../bookService.js';
import './Busqueda.css';

const Busqueda = () => {
  const [books, setBooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToBooks((data) => {
      setBooks(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredBooks = books.filter(book => {
    const title = book.title || '';
    const author = book.author || '';
    return title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           author.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="busqueda-container">
      <header className="busqueda-header">
        <h2>Búsqueda Avanzada 🔍</h2>
      </header>
      <main className="busqueda-main">
        <div className="search-section">
          <input 
            type="search" 
            className="global-search-bar" 
            placeholder="Buscar libros, autores..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <section className="books-grid">
          {isLoading ? (
            <p className="loading-text">Buscando en el catálogo...</p>
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

export default Busqueda;