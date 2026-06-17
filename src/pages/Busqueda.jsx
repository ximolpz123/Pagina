import React, { useState, useEffect } from 'react';
import BookCard from '../components/BookCard.jsx';
import { subscribeToBooks } from '../bookService.js';
import './Busqueda.css';

const Busqueda = () => {
  const [books, setBooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estados para los nuevos filtros
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [filterAvailability, setFilterAvailability] = useState('Todos');
  const [sortOrder, setSortOrder] = useState('Relevancia');

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToBooks((data) => {
      setBooks(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Lógica Predictiva: Generar sugerencias basadas en lo que el usuario escribe
  const getSuggestions = () => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const optionsMap = new Map(); // Usamos Map para guardar el texto y su categoría
    
    books.forEach(book => {
      if (book.title && book.title.toLowerCase().includes(query)) {
        if (!optionsMap.has(book.title)) optionsMap.set(book.title, book.category);
      }
      if (book.author && book.author.toLowerCase().includes(query)) {
        if (!optionsMap.has(book.author)) optionsMap.set(book.author, book.category);
      }
    });
    return Array.from(optionsMap, ([text, category]) => ({ text, category })).slice(0, 5); // Máximo 5 sugerencias
  };

  const suggestions = getSuggestions();
  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
  };

  // Asignar un icono visual basado en la categoría
  const getCategoryIcon = (category) => {
    if (!category) return '📚';
    const cat = category.toLowerCase();
    if (cat.includes('informática') || cat.includes('programación') || cat.includes('informatica')) return '💻';
    if (cat.includes('ciencias')) return '🧪';
    if (cat.includes('medicina')) return '🩺';
    if (cat.includes('literatura')) return '📖';
    return '📚'; // Icono por defecto para cualquier otra categoría
  };

  const filteredBooks = books.filter(book => {
    // 1. Filtro por Texto (Buscador general)
    const title = book.title || '';
    const author = book.author || '';
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          author.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 2. Filtro por Categoría
    let matchesCategory = true;
    if (filterCategory !== 'Todas') {
      const category = book.category === 'Informática y Programación' ? 'Informática' : (book.category || 'General');
      matchesCategory = category.includes(filterCategory) || filterCategory.includes(category);
    }

    // 3. Filtro por Disponibilidad
    let matchesAvailability = true;
    const stockActual = book.stock !== undefined ? book.stock : (book.available ? 1 : 0);
    if (filterAvailability === 'Disponibles') matchesAvailability = stockActual > 0;
    if (filterAvailability === 'Agotados') matchesAvailability = stockActual === 0;

    return matchesSearch && matchesCategory && matchesAvailability;
  }).sort((a, b) => {
    // 4. Ordenamiento
    if (sortOrder === 'A-Z') return (a.title || '').localeCompare(b.title || '');
    if (sortOrder === 'Z-A') return (b.title || '').localeCompare(a.title || '');
    return 0; // Orden por defecto (Relevancia/Recientes)
  });

  return (
    <div className="busqueda-container">
      <header className="busqueda-header">
        <h2>Búsqueda Avanzada 🔍</h2>
      </header>
      <main className="busqueda-main">
        <div className="search-section">
          {/* Contenedor relativo para posicionar la ventanita de autocompletado */}
          <div className="search-input-wrapper">
            <input 
              type="search" 
              className="global-search-bar" 
              placeholder="Buscar libros, autores..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // Delay para permitir el clic
            />
            
            {/* Ventanita de sugerencias */}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="autocomplete-dropdown">
                {suggestions.map((suggestion, index) => (
                  <li key={index} onMouseDown={() => handleSuggestionClick(suggestion.text)}>
                    <span className="category-icon">{getCategoryIcon(suggestion.category)}</span> {suggestion.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="filters-section">
            <div className="filter-group">
              <label>Asignatura / Categoría</label>
              <select className="filter-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="Todas">Todas las categorías</option>
                <option value="Informática">Informática y Programación</option>
                <option value="Ciencias Básicas">Ciencias Básicas</option>
                <option value="Medicina">Medicina</option>
                <option value="Literatura">Literatura</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Disponibilidad</label>
              <select className="filter-select" value={filterAvailability} onChange={(e) => setFilterAvailability(e.target.value)}>
                <option value="Todos">Todos</option>
                <option value="Disponibles">Disponibles</option>
                <option value="Agotados">Agotados</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Ordenar por</label>
              <select className="filter-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                <option value="Relevancia">Relevancia</option>
                <option value="A-Z">Alfabético (A-Z)</option>
                <option value="Z-A">Alfabético (Z-A)</option>
              </select>
            </div>
          </div>
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