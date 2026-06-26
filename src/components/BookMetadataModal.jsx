import React, { useState, useEffect } from 'react';
import './BookMetadataModal.css';

const BookMetadataModal = ({ isOpen, onClose, searchQuery, onSelectBook }) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && searchQuery) {
      fetchData(searchQuery);
    } else if (!isOpen) {
      setResults([]);
      setError('');
    }
  }, [isOpen, searchQuery]);

  const fetchData = async (query) => {
    setLoading(true);
    setError('');
    try {
      const cleanTitle = query.replace(/['"]/g, '');
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(cleanTitle)}&maxResults=6`);
      const data = await res.json();

      if (data.items && data.items.length > 0) {
        setResults(data.items);
      } else {
        // Fallback a OpenLibrary Search API
        const olRes = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(cleanTitle)}&limit=6`);
        const olData = await olRes.json();

        if (olData.docs && olData.docs.length > 0) {
          const mappedItems = olData.docs.map(doc => ({
            id: doc.key,
            volumeInfo: {
              title: doc.title || '',
              authors: doc.author_name || [],
              description: doc.first_sentence ? doc.first_sentence[0] : '',
              imageLinks: doc.cover_i ? { thumbnail: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` } : null,
              categories: doc.subject || []
            }
          }));
          setResults(mappedItems);
        } else {
          setError('No se encontraron resultados para ese título en ninguna base de datos.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Error al conectar con la base de datos.');
    }
    setLoading(false);
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
    return 'Literatura';
  };

  const handleSelect = (item) => {
    const vi = item.volumeInfo;
    const selectedData = {
      title: vi.title || '',
      author: vi.authors ? vi.authors.join(', ') : '',
      synopsis: vi.description || '',
      coverUrl: vi.imageLinks?.thumbnail?.replace('http:', 'https:') || vi.imageLinks?.smallThumbnail?.replace('http:', 'https:') || '',
      category: mapCategory(vi.categories)
    };
    onSelectBook(selectedData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="metadata-modal-overlay">
      <div className="metadata-modal-content">
        <div className="metadata-modal-header">
          <div>
            <h3>🔍 Buscador de Ediciones</h3>
            <p className="metadata-subtitle">Selecciona la portada que coincida con tu libro físico para extraer sus datos automáticamente.</p>
          </div>
          <button className="close-btn" onClick={onClose} title="Cerrar">&times;</button>
        </div>

        <div className="metadata-modal-body">
          {loading ? (
            <div className="loading-container">
              <div className="book-spinner">📖</div>
              <p>Explorando bibliotecas online...</p>
            </div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <div className="results-grid">
              {results.map((item) => {
                const vi = item.volumeInfo;
                const cover = vi.imageLinks?.thumbnail?.replace('http:', 'https:') || vi.imageLinks?.smallThumbnail?.replace('http:', 'https:');
                return (
                  <div key={item.id} className="result-card" onClick={() => handleSelect(item)}>
                    <div className="result-cover-container">
                      {cover ? <img src={cover} alt={vi.title} className="result-cover" /> : <div className="no-cover">Sin Portada</div>}
                    </div>
                    <div className="result-info">
                      <h4 className="result-title">{vi.title}</h4>
                      <p className="result-author">✍️ {vi.authors ? vi.authors.join(', ') : 'Autor desconocido'}</p>
                      <div className="result-category-badge">{mapCategory(vi.categories)}</div>
                      <p className="result-synopsis">{vi.description ? vi.description.substring(0, 90) + '...' : 'Sin sinopsis disponible.'}</p>
                    </div>
                    <div className="select-overlay">
                      <button className="select-btn">✨ Importar Datos</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookMetadataModal;
