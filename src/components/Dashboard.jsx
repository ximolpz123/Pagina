import React, { useState, useEffect } from 'react';
import BookCard from './BookCard';
import { getBooks } from '../services/bookService';
import './Dashboard.css';

const Dashboard = () => {
  const [books, setBooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLibraryData = async () => {
      const data = await getBooks();
      setBooks(data);
      setIsLoading(false);
    };
    fetchLibraryData();
  }, []);

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
            books.map((book) => <BookCard key={book.id} book={book} />)
          )}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;