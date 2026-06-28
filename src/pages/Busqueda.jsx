import React, { useState, useEffect } from 'react';
import BookCard from '../components/BookCard.jsx';
import { subscribeToBooks, subscribeToUserActiveReservations } from '../bookService.js';
import { BookCardSkeleton } from '../components/Skeletons.jsx';
import ISBNScanner from '../components/ISBNScanner.jsx';
import { Mic, ScanBarcode, Search as SearchIcon, SlidersHorizontal, LayoutGrid, List } from 'lucide-react';
import toast from 'react-hot-toast';
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
  
  const clean = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, '').trim();
  
  const qWords = clean(query).split(/\s+/);
  const tWords = clean(text).split(/\s+/);
  
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
  const [availabilityFilter, setAvailabilityFilter] = useState('Todos'); // Todos, Disponibles, Agotados
  const [maxRating, setMaxRating] = useState(5);
  const [showFilters, setShowFilters] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  
  const [isLoading, setIsLoading] = useState(true);

  const MAIN_CATEGORIES = [
    'Todas', 'Acción', 'Ciencia Ficcion', 'Ciencias Básicas', 
    'Comics', 'Fantasia', 'Informática', 'Literatura', 
    'Medicina', 'Psicología', 'Romance', 'Thriller'
  ];

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

  const handleVoiceSearch = (e) => {
    e.preventDefault(); // Evitar comportamientos por defecto del botón
    
    if (isListening) {
      // Si ya está escuchando y hace clic, lo apagamos
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.interimResults = true;
      
      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (e) => {
        const transcript = Array.from(e.results)
          .map(result => result[0].transcript)
          .join('');
        
        setSearchQuery(transcript);
        setShowSuggestions(true);
      };

      recognition.onerror = (e) => {
        console.error("Error en reconocimiento de voz: ", e.error);
        setIsListening(false);
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          toast.error("El navegador bloqueó el micrófono. Por favor, dale permisos a la página para usar el micrófono (icono de candado en la barra de direcciones).", { duration: 6000 });
        } else if (e.error !== 'no-speech') {
          toast.error("Error con el micrófono: " + e.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      try {
        recognition.start();
      } catch (err) {
        console.error(err);
        setIsListening(false);
      }
    } else {
      toast.error("Tu navegador no soporta búsqueda por voz nativa. Te sugerimos usar Chrome o Edge.");
    }
  };

  const handleScannerClick = () => {
    setShowScanner(!showScanner);
  };

  const handleScanSuccess = (isbn) => {
    setSearchQuery(isbn);
    setShowScanner(false);
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
    const matchesRating = book.rating <= maxRating;

    // 4. Filtro de Disponibilidad
    const stock = book.stock !== undefined ? book.stock : (book.available ? 1 : 0);
    const isAvailable = stock > 0;
    let matchesAvailability = true;
    if (availabilityFilter === 'Disponibles') matchesAvailability = isAvailable;
    else if (availabilityFilter === 'Agotados') matchesAvailability = !isAvailable;

    return matchesSearch && matchesCategory && matchesRating && matchesAvailability;
  });

  return (
    <div className="busqueda-container">
      <header className="busqueda-header glass-panel">
        <h2>Busca tu libro favorito 🔍</h2>
        <p>Encuentra por título, por filtros o escanea el ISBN</p>
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

          {/* ESCÁNER */}
          {showScanner && (
            <div style={{ marginTop: '1rem', width: '100%', maxWidth: '500px', margin: '1rem auto' }}>
              <ISBNScanner 
                onScanSuccess={handleScanSuccess} 
                onScanFailure={() => {}} 
              />
            </div>
          )}
          
          {/* FILTROS VISUALES AVANZADOS (CHIPS Y SLIDERS) */}
          <div className={`advanced-filters ${showFilters ? 'open' : ''}`}>
            
            <div className="filter-block">
              <span className="filter-label">Disponibilidad</span>
              <div className="chips-container" style={{ marginBottom: '1rem' }}>
                {['Todos', 'Disponibles', 'Agotados'].map(av => (
                  <button 
                    key={av} 
                    className={`chip ${availabilityFilter === av ? 'active' : ''}`}
                    onClick={() => setAvailabilityFilter(av)}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-block">
              <span className="filter-label">Categoría</span>
              <div className="select-container" style={{ position: 'relative', display: 'inline-block', minWidth: '220px', maxWidth: '300px' }}>
                <select 
                  style={{ 
                    width: '100%', 
                    cursor: 'pointer', 
                    appearance: 'none', 
                    background: 'var(--input-bg)', 
                    border: '1px solid var(--border-color)', 
                    color: 'var(--text-main)',
                    fontSize: '1rem',
                    padding: '0.6rem 2.5rem 0.6rem 1rem',
                    outline: 'none',
                    fontWeight: '500',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                  }}
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary-color)';
                    e.target.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-color)';
                    e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  }}
                >
                  {MAIN_CATEGORIES.map(cat => (
                    <option key={cat} value={cat} style={{ background: 'var(--bg-color)', color: 'var(--text-main)' }}>{cat}</option>
                  ))}
                </select>
                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--primary-color)', fontSize: '0.8rem' }}>
                  ▼
                </div>
              </div>
            </div>

            <div className="filter-block">
              <span className="filter-label">Calificación Máxima: {maxRating < 5 ? (maxRating === 1 ? 'Solo 1 ⭐' : `Hasta ${maxRating} ⭐`) : 'Todas (Hasta 5 ⭐)'}</span>
              <div className="slider-container">
                <input 
                  type="range" 
                  min="1" max="5" 
                  value={maxRating} 
                  onChange={(e) => setMaxRating(parseInt(e.target.value))}
                  className="rating-slider"
                />
                <div className="slider-marks">
                  <span>1 ⭐</span>
                  <span>⭐⭐⭐⭐⭐</span>
                </div>
              </div>
            </div>

          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '0.5rem', padding: '0 1rem' }}>
          <button 
            onClick={() => setViewMode('grid')} 
            style={{ background: viewMode === 'grid' ? 'var(--primary-color)' : 'transparent', color: viewMode === 'grid' ? 'white' : 'var(--text-muted)', border: '1px solid var(--border-color)', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Vista de Cuadrícula"
          >
            <LayoutGrid size={20} />
          </button>
          <button 
            onClick={() => setViewMode('list')} 
            style={{ background: viewMode === 'list' ? 'var(--primary-color)' : 'transparent', color: viewMode === 'list' ? 'white' : 'var(--text-muted)', border: '1px solid var(--border-color)', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Vista de Lista"
          >
            <List size={20} />
          </button>
        </div>

        <section className={`books-grid ${viewMode}-view`}>
          {isLoading ? (
            [...Array(8)].map((_, i) => <BookCardSkeleton key={i} />)
          ) : (
            filteredBooks.length > 0 ? (
              filteredBooks.map((book) => <BookCard key={book.id} book={book} creditosDisponibles={5 - reservasActivas.length} reservasActivas={reservasActivas} hideDetailsButton={true} />)
            ) : (
              <div className="no-results glass-panel">
                <span className="no-results-icon">😕</span>
                <h3>Oops... No está el libro que buscas.</h3>
                <p>Intenta buscar por voz o con filtros diferentes.</p>
              </div>
            )
          )}
        </section>
      </main>
    </div>
  );
};

export default Busqueda;