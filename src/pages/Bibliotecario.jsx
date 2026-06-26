import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addBook } from '../bookService.js';
import ISBNScanner from '../components/ISBNScanner.jsx';
import BookMetadataModal from '../components/BookMetadataModal.jsx';
import './Bibliotecario.css';

const Bibliotecario = () => {
  const [bookData, setBookData] = useState({
    title: '',
    author: '',
    category: 'Informática',
    stock: 1,
    coverUrl: '',
    synopsis: '',
    isbn: ''
  });
  const navigate = useNavigate();
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [showScanner, setShowScanner] = useState(false);
  const [isSearchingISBN, setIsSearchingISBN] = useState(false);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [isGeneratingSynopsis, setIsGeneratingSynopsis] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleOpenMetadataModal = () => {
    if (!bookData.title.trim()) {
      setNotification({ show: true, message: 'Primero escribe el título del libro para buscarlo en la web.', type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
      return;
    }
    setShowMetadataModal(true);
  };

  const handleSelectMetadata = (selectedBook) => {
    setBookData(prev => ({
      ...prev,
      title: selectedBook.title,
      author: selectedBook.author || prev.author,
      synopsis: selectedBook.synopsis || prev.synopsis,
      coverUrl: selectedBook.coverUrl || prev.coverUrl,
      category: selectedBook.category || prev.category
    }));
    setNotification({ show: true, message: '¡Datos importados con éxito! Revisa la portada y sinopsis.', type: 'success' });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const handleGenerateSynopsis = async () => {
    if (!bookData.title.trim()) {
      setNotification({ show: true, message: 'Escribe el título primero para generar su sinopsis.', type: 'error' });
      return;
    }
    
    setIsGeneratingSynopsis(true);
    try {
      // Paso 1: Buscar el título exacto en Wikipedia Español
      const searchRes = await fetch(`https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(bookData.title)}&utf8=&format=json&origin=*`);
      const searchData = await searchRes.json();
      
      if (searchData.query && searchData.query.search && searchData.query.search.length > 0) {
        // Obtenemos el título exacto del artículo en Wikipedia (ej: "El fantasma de Canterville")
        const exactTitle = searchData.query.search[0].title;
        
        // Paso 2: Extraer el resumen introductorio limpio
        const summaryRes = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(exactTitle)}`);
        const summaryData = await summaryRes.json();
        
        if (summaryData.extract) {
          setBookData(prev => ({ ...prev, synopsis: summaryData.extract }));
          setNotification({ show: true, message: 'Sinopsis generada con éxito.', type: 'success' });
        } else {
          setNotification({ show: true, message: 'No se pudo extraer el resumen de Wikipedia.', type: 'error' });
        }
      } else {
        setNotification({ show: true, message: 'No se encontró información automática para este título.', type: 'error' });
      }
    } catch (e) {
      console.error(e);
      setNotification({ show: true, message: 'Error al conectar con la IA de resúmenes.', type: 'error' });
    }
    setIsGeneratingSynopsis(false);
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const mapCategory = (categoriesArray) => {
    if (!categoriesArray || categoriesArray.length === 0) return 'Literatura';
    const catStr = categoriesArray.join(' ').toLowerCase();
    if (catStr.includes('science fiction') || catStr.includes('ciencia ficc')) return 'Ciencia Ficcion';
    if (catStr.includes('computer') || catStr.includes('informát') || catStr.includes('program')) return 'Informática';
    if (catStr.includes('medic') || catStr.includes('health')) return 'Medicina';
    if (catStr.includes('romance') || catStr.includes('love')) return 'Romance';
    if (catStr.includes('fantasy') || catStr.includes('fantas')) return 'Fantasia';
    if (catStr.includes('action') || catStr.includes('thriller')) return 'Thriller';
    if (catStr.includes('comic') || catStr.includes('graphic')) return 'Comics';
    return 'Literatura'; // Default fallback
  };

  const fetchBookByISBN = async (isbn) => {
    setIsSearchingISBN(true);
    setShowScanner(false);
    try {
      let foundTitle = '';
      let foundAuthor = '';
      let foundSynopsis = '';
      let foundCover = '';
      let foundCategory = 'Literatura';

      // Intento 1: Google Books por ISBN
      const responseGB = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      const dataGB = await responseGB.json();
      
      if (dataGB.items && dataGB.items.length > 0) {
        const vi = dataGB.items[0].volumeInfo;
        foundTitle = vi.title || '';
        foundAuthor = vi.authors ? vi.authors.join(', ') : '';
        foundSynopsis = vi.description || '';
        foundCover = vi.imageLinks?.thumbnail?.replace('http:', 'https:') || vi.imageLinks?.smallThumbnail?.replace('http:', 'https:') || '';
        foundCategory = mapCategory(vi.categories);
      } else {
        // Intento 2: OpenLibrary por ISBN si Google falla
        const responseOL = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
        const dataOL = await responseOL.json();
        const olKey = `ISBN:${isbn}`;
        
        if (dataOL[olKey]) {
          const bookOL = dataOL[olKey];
          foundTitle = bookOL.title || '';
          foundAuthor = bookOL.authors ? bookOL.authors.map(a => a.name).join(', ') : '';
          foundSynopsis = bookOL.notes || bookOL.excerpts?.[0]?.text || '';
          foundCover = bookOL.cover?.large || bookOL.cover?.medium || '';
          foundCategory = mapCategory(bookOL.subjects?.map(s => s.name));
        }
      }

      // Truco maestro: Si encontramos el título pero NO hay sinopsis o portada, buscamos por título para rellenar
      if (foundTitle && (!foundSynopsis || !foundCover)) {
        try {
          const cleanTitle = foundTitle.replace(/['"]/g, ''); // Remover comillas
          const resFallback = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(cleanTitle)}`);
          const dataFallback = await resFallback.json();
          
          if (dataFallback.items && dataFallback.items.length > 0) {
            // Buscamos el primer resultado que sí tenga descripción e imagen
            const bestMatch = dataFallback.items.find(item => item.volumeInfo.description && item.volumeInfo.imageLinks) || dataFallback.items[0];
            const vi2 = bestMatch.volumeInfo;
            
            if (!foundSynopsis) foundSynopsis = vi2.description || '';
            if (!foundCover) foundCover = vi2.imageLinks?.thumbnail?.replace('http:', 'https:') || vi2.imageLinks?.smallThumbnail?.replace('http:', 'https:') || '';
            
            // Actualizamos la categoría si era la por defecto y la nueva es mejor
            if (foundCategory === 'Literatura' && vi2.categories) {
              foundCategory = mapCategory(vi2.categories);
            }
          }
        } catch (e) {
          console.warn("Fallback por título falló", e);
        }
      }

      if (foundTitle) {
        setBookData(prev => ({
          ...prev,
          title: foundTitle,
          author: foundAuthor,
          synopsis: foundSynopsis,
          coverUrl: foundCover,
          category: foundCategory,
          isbn: isbn
        }));
        setNotification({ show: true, message: `¡Libro detectado y autocompletado!`, type: 'success' });
      } else {
        setNotification({ show: true, message: `Escáner exitoso (ISBN: ${isbn}), pero el libro no está en las bases de datos públicas.`, type: 'error' });
      }

    } catch (error) {
      console.error("Error fetching ISBN:", error);
      setNotification({ show: true, message: 'Error de conexión al buscar el ISBN.', type: 'error' });
    }
    setIsSearchingISBN(false);
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 6000);
  };

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
      setShowSuccessModal(true);
      // Ocultar modal y redirigir después de 2.5 segundos
      setTimeout(() => {
        setShowSuccessModal(false);
        navigate('/');
      }, 2500);
    } else {
      setNotification({ show: true, message: response.message || 'Hubo un error al añadir el libro.', type: 'error' });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
    }
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

          <div className="scanner-section" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '10px' }}>
              Puedes buscar el libro usando la cámara o escribiendo su título.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                className="scan-btn" 
                onClick={() => setShowScanner(!showScanner)}
                style={{ padding: '0.8rem 1.2rem', backgroundColor: 'var(--primary-color)', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '1rem', transition: 'background-color 0.2s' }}
              >
                📷 {showScanner ? 'Cerrar Cámara' : 'Escanear ISBN'}
              </button>
            </div>
            
            {isSearchingISBN && <p style={{ marginTop: '10px', color: 'var(--primary-color)', fontWeight: 'bold' }}>Buscando libro en la base de datos mundial...</p>}
            
            {showScanner && (
              <div style={{ marginTop: '1rem' }}>
                <ISBNScanner 
                  onScanSuccess={fetchBookByISBN}
                  onScanFailure={(err) => { /* Omitimos errores de que no encuentra QR aún */ }}
                />
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="add-book-form">
            <div className="input-group">
              <label htmlFor="title">Título del Libro</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" id="title" name="title" value={bookData.title} onChange={handleChange} required style={{ flex: 1 }} />
                <button type="button" onClick={handleOpenMetadataModal} 
                  style={{ 
                    padding: '0 1.25rem', 
                    backgroundColor: '#1e293b', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '10px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  ✨ Buscar Datos
                </button>
              </div>
            </div>
            <div className="input-group"><label htmlFor="author">Autor</label><input type="text" id="author" name="author" value={bookData.author} onChange={handleChange} required /></div>
            <div className="input-group"><label htmlFor="category">Categoría</label><select id="category" name="category" value={bookData.category} onChange={handleChange}><option value="Informática">Informática y Programación</option><option value="Ciencias Básicas">Ciencias Básicas</option><option value="Medicina">Medicina</option><option value="Literatura">Literatura</option><option value="Ciencia Ficcion">Ciencia Ficción</option><option value="Romance">Romance</option><option value="Fantasia">Fantasía</option><option value="Acción">Acción</option><option value="Comics">Comics</option><option value="Thriller">Thriller</option></select></div>
            <div className="input-group"><label htmlFor="stock">Stock (Cantidad)</label><input type="number" id="stock" name="stock" value={bookData.stock} onChange={handleChange} min="0" required /></div>
            <div className="input-group"><label htmlFor="coverUrl">URL de la Portada</label><input type="url" id="coverUrl" name="coverUrl" value={bookData.coverUrl} onChange={handleChange} placeholder="https://ejemplo.com/portada.jpg" /></div>
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                <label htmlFor="synopsis">Sinopsis</label>
                <button 
                  type="button" 
                  onClick={handleGenerateSynopsis}
                  disabled={isGeneratingSynopsis}
                  style={{ 
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', 
                    border: 'none', 
                    color: 'white', 
                    cursor: 'pointer', 
                    fontSize: '0.75rem', 
                    fontWeight: 'bold', 
                    padding: '0.4rem 0.8rem',
                    borderRadius: '999px',
                    boxShadow: '0 2px 4px rgba(139, 92, 246, 0.3)',
                    transition: 'all 0.2s ease',
                    opacity: isGeneratingSynopsis ? 0.7 : 1
                  }}
                  onMouseOver={(e) => { if(!isGeneratingSynopsis) e.currentTarget.style.transform = 'scale(1.05)' }}
                  onMouseOut={(e) => { if(!isGeneratingSynopsis) e.currentTarget.style.transform = 'scale(1)' }}
                >
                  {isGeneratingSynopsis ? '⏳ Generando...' : '🪄 Auto-Generar con IA'}
                </button>
              </div>
              <textarea id="synopsis" name="synopsis" value={bookData.synopsis} onChange={handleChange} rows="4"></textarea>
            </div>
            <button type="submit" className="submit-btn">Añadir Libro</button>
          </form>
        </div>
      </main>

      <BookMetadataModal 
        isOpen={showMetadataModal}
        onClose={() => setShowMetadataModal(false)}
        searchQuery={bookData.title}
        onSelectBook={handleSelectMetadata}
      />

      {showSuccessModal && (
        <div className="success-modal-overlay">
          <div className="success-modal-content">
            <div className="success-icon-container">
              <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
            <h3>¡Libro Agregado con Éxito!</h3>
            <p>El catálogo se ha actualizado correctamente.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bibliotecario;