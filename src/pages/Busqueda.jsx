import React, { useState, useEffect } from 'react';
import BookCard from '../components/BookCard.jsx';
import { subscribeToBooks, subscribeToUserActiveReservations } from '../bookService.js';
import { BookCardSkeleton } from '../components/Skeletons.jsx';
import { Mic, ScanBarcode, Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import './Busqueda.css';
import { useAuth } from '../context/AuthContext';

// --- UTILIDAD PARA FUZZY SEARCH ---
const levenshteinDistance = (s1, s2) => {
  const m = s1.length, n = s2.length;
  const dp = Array.from({length: m + 1}, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
};

const isFuzzyMatch = (query, text) => {
  if (!query) return true;
  if (!text) return false;
  const qWords = query.toLowerCase().trim().split(/\s+/);
  const tWords = text.toLowerCase().trim().split(/\s+/);
  return qWords.every(qw => 
    tWords.some(tw => {
      if (tw.includes(qw)) return true;
      const dist = levenshteinDistance(qw, tw);
      return dist <= 2 && qw.length > 3; // Tolerar 2 errores solo en palabras largas
    })
  );
};

const Busqueda = () => {
  const [books, setBooks] = useState([]);
  const { currentUser } = useAuth();
  const [reservasActivas, setReservasActivas] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);

  const MAIN_CATEGORIES = ['Todas', 'Informática', 'Medicina', 'Literatura', 'Ciencia Ficcion', 'Romance'];

  useEffect(() => {
    const unsubscribeBooks = subscribeToBooks((data) => {
      // Agregamos rating ficticio si no existe para la demo
      const booksWithRating = data.map(b => ({
        ...b,
        rating: b.rating || ((b.title.length % 3) + 3) // Genera 3, 4 o 5 de forma determinista
      }));
      setBooks(booksWithRating);
      setIsLoading(false);
    });

    const unsubscribeReservations = subscribeToUserActiveReservations(currentUser?.email, setReservasActivas);

    return () => {
      unsubscribeBooks();
      unsubscribeReservations();
    };
  }, [currentUser?.email]);

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      
      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (e) => {
        setSearchQuery(e.results[0][0].transcript);
        setShowSuggestions(true);
      };

      recognition.onerror = (e) => {
        console.error("Error en reconocimiento de voz: ", e.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      alert("Tu navegador (ej. Firefox sin banderas activadas o navegador antiguo) no soporta búsqueda por voz nativa. Te sugerimos usar Chrome o Edge.");
    }
  };

  const handleScannerClick = () => {
    const isbn = prompt("Simulador de Escáner:\nApunta tu cámara o ingresa un ISBN manualmente:");
    if (isbn) setSearchQuery(isbn);
  };

  const getSuggestions = () => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const optionsMap = new Map(); 
    
    books.forEach(book => {
      if (isFuzzyMatch(query, book.title)) {
        if (!optionsMap.has(book.title)) optionsMap.set(book.title, book.category);
      }
    });
    return Array.from(optionsMap, ([text, category]) => ({ text, category })).slice(0, 5);
  };

  const suggestions = getSuggestions();
  
  const filteredBooks = books.filter(book => {
    // 1. Fuzzy Search por Título, Autor o ISBN (simulado si meten un número largo)
    const textToSearch = `${book.title} ${book.author} ${book.isbn || ''}`;
    const matchesSearch = isFuzzyMatch(searchQuery, textToSearch);
    
    // 2. Filtro de Categoría por Chips
    let matchesCategory = true;
    if (filterCategory !== 'Todas') {
      const category = book.category || 'General';
      matchesCategory = category.includes(filterCategory) || filterCategory.includes(category);
    }

    // 3. Filtro visual de Rating (Estrellas)
    const matchesRating = book.rating >= minRating;

    return matchesSearch && matchesCategory && matchesRating;
  });

  return (
    <div className="busqueda-container">
      <header className="busqueda-header glass-panel">
        <h2>Busca tu libro favorito 🔍</h2>
        <p>Encuentra por título, autor o escanea el ISBN</p>
      </header>
      
      <main className="busqueda-main">
        <div className="search-section">
          
          {/* BARRA DE BÚSQUEDA MODERNA */}
          <div className="search-bar-modern">
            <SearchIcon className="search-icon-left" />
            <input 
              type="search" 
              className="global-search-input" 
              placeholder={isListening ? "🔴 Escuchando... Habla ahora" : "Ej: 'Gari poter', ISBN, o Título..."}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            <button className={`icon-btn ${isListening ? 'listening-pulse' : ''}`} onClick={handleVoiceSearch} title="Búsqueda por Voz">
              <Mic color={isListening ? '#ef4444' : 'currentColor'} />
            </button>
            <button className="icon-btn" onClick={handleScannerClick} title="Escanear ISBN">
              <ScanBarcode />
            </button>
            <button className={`icon-btn toggle-filters ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal />
            </button>

            {/* SUGERENCIAS */}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="autocomplete-dropdown glass-panel">
                {suggestions.map((suggestion, index) => (
                  <li key={index} onMouseDown={() => { setSearchQuery(suggestion.text); setShowSuggestions(false); }}>
                    <SearchIcon size={14} /> {suggestion.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* FILTROS VISUALES AVANZADOS (CHIPS Y SLIDERS) */}
          <div className={`advanced-filters ${showFilters ? 'open' : ''}`}>
            
            <div className="filter-block">
              <span className="filter-label">Categorías Rápidas</span>
              <div className="chips-container">
                {MAIN_CATEGORIES.map(cat => (
                  <button 
                    key={cat} 
                    className={`chip ${filterCategory === cat ? 'active' : ''}`}
                    onClick={() => setFilterCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-block">
              <span className="filter-label">Calificación Mínima: {minRating > 0 ? `${minRating} ⭐` : 'Cualquiera'}</span>
              <div className="slider-container">
                <input 
                  type="range" 
                  min="0" max="5" 
                  value={minRating} 
                  onChange={(e) => setMinRating(parseInt(e.target.value))}
                  className="rating-slider"
                />
                <div className="slider-marks">
                  <span>Todas</span>
                  <span>⭐⭐⭐⭐⭐</span>
                </div>
              </div>
            </div>

          </div>
        </div>
        
        <section className="books-grid">
          {isLoading ? (
            [...Array(8)].map((_, i) => <BookCardSkeleton key={i} />)
          ) : (
            filteredBooks.length > 0 ? (
              filteredBooks.map((book) => <BookCard key={book.id} book={book} creditosDisponibles={5 - reservasActivas.length} />)
            ) : (
              <div className="no-results glass-panel">
                <span className="no-results-icon">👻</span>
                <h3>Oops... No encontramos nada</h3>
                <p>Intenta buscar por voz o relajando los filtros.</p>
              </div>
            )
          )}
        </section>
      </main>
    </div>
  );
};

export default Busqueda;