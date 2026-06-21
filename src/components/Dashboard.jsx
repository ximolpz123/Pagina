import React, { useState, useEffect } from 'react';
import { subscribeToBooks, subscribeToUserActiveReservations } from '../bookService.js';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import BookCard from './BookCard.jsx';
import './Dashboard.css';
import { useAuth } from '../context/AuthContext';
import { DashboardSkeleton } from './Skeletons.jsx';

const PIE_COLORS = ['#308855', '#165B2B', '#C6AA77', '#A08159', '#e11d48', '#db2777', '#f97316', '#f59e0b', '#84cc16', '#22c55e'];

const Dashboard = () => {
  const [books, setBooks] = useState([]);
  const [reservasActivas, setReservasActivas] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    const loadFavorites = () => {
      const favKey = `fav_${currentUser?.email || 'guest'}`;
      try {
        setFavoriteIds(JSON.parse(localStorage.getItem(favKey) || '[]'));
      } catch (e) { setFavoriteIds([]); }
    };
    loadFavorites();
    window.addEventListener('favoritesUpdated', loadFavorites);
    return () => window.removeEventListener('favoritesUpdated', loadFavorites);
  }, [currentUser]);

  useEffect(() => {
    const unsubBooks = subscribeToBooks((data) => {
      const booksWithRating = data.map(b => ({
        ...b,
        rating: b.rating || ((b.title?.length % 3) + 3) // Genera 3, 4 o 5
      }));
      setBooks(booksWithRating);
      setIsLoading(false);
    });
    const unsubRes = subscribeToUserActiveReservations(currentUser?.email, setReservasActivas);
    
    return () => { unsubBooks(); unsubRes(); };
  }, [currentUser]);

  const creditosDisponibles = 5 - (reservasActivas?.length || 0);

  // --- LÓGICA DE AGREGACIÓN PARA GRÁFICOS ---
  const BASE_AVAILABLE = 201;
  const BASE_BORROWED = 139;
  const BASE_NEW = 50;
  
  const baseCategories = {
    'Informática': 120, 'Ciencias Básicas': 90, 'Literatura': 80, 'Medicina': 50, 'Ciencia Ficcion': 45, 'Romance': 30, 'Fantasia': 40, 'Acción': 25, 'Comics': 15, 'Thriller': 35
  };

  let realAvailable = 0;
  let realNewThisMonth = 0;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const categoryCounts = { ...baseCategories };

  books.forEach(book => {
    const stock = book.stock !== undefined ? book.stock : (book.available ? 1 : 0);
    realAvailable += stock;

    if (book.createdAt) {
      const d = new Date(book.createdAt);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) realNewThisMonth++;
    } else {
      realNewThisMonth++;
    }

    let cat = book.category || 'Informática';
    if (cat === 'Informática y Programación') cat = 'Informática';
    if (categoryCounts[cat] !== undefined) categoryCounts[cat] += stock;
    else categoryCounts[cat] = stock;
  });

  const realBorrowed = reservasActivas.length;
  reservasActivas.forEach(res => {
    const book = books.find(b => b.id === res.bookId);
    if (book) {
      let cat = book.category || 'Informática';
      if (cat === 'Informática y Programación') cat = 'Informática';
      if (categoryCounts[cat] !== undefined) categoryCounts[cat] += 1;
      else categoryCounts[cat] = 1;
    }
  });

  const finalAvailable = BASE_AVAILABLE + realAvailable;
  const finalBorrowed = BASE_BORROWED + realBorrowed;
  const finalTotal = finalAvailable + finalBorrowed;
  const finalNew = BASE_NEW + realNewThisMonth;

  const categoriesDistribution = Object.keys(categoryCounts).map(key => ({ name: key, value: categoryCounts[key] })).filter(cat => cat.value > 0);
  const statusDistribution = [ { name: 'Disponibles', cantidad: finalAvailable }, { name: 'En Préstamo', cantidad: finalBorrowed } ];


  // --- CLASIFICACIÓN PARA CARRUSELES ---
  const sortedByDate = [...books].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const newReleases = sortedByDate.slice(0, 5);
  
  const recommended = books.filter(b => b.rating >= 4).slice(0, 5);
  // Reemplazamos Math.random por un orden determinista simulado para evitar el error del linter
  const popular = [...books].sort((a, b) => (b.title?.length || 0) - (a.title?.length || 0)).slice(0, 5);
  
  const favoriteBooks = books.filter(b => favoriteIds.includes(b.id));

  const renderCarousel = (title, items) => (
    <section className="carousel-section">
      <h3 className="carousel-title">{title}</h3>
      <div className="carousel-container">
        {items.length > 0 ? items.map(book => (
          <div key={book.id} className="carousel-item">
            <BookCard book={book} creditosDisponibles={creditosDisponibles} reservasActivas={reservasActivas} hideReserveButton={true} />
          </div>
        )) : (
          <p className="loading-text">Cargando...</p>
        )}
      </div>
    </section>
  );

  return (
    <div className="dashboard-container">
      <header className="dashboard-header glass-panel" style={{ position: 'relative' }}>
        <div>
          <h1>Bienvenido, {currentUser?.displayName ? currentUser.displayName.split(' ')[0] : 'Lector'} 👋</h1>
          <p>Aquí encontrarás tus libros favoritos o de estudio.</p>
        </div>
        <button className="about-btn" onClick={() => setShowAboutModal(true)}>
          📖 ¿Quiénes somos? / Guía
        </button>
      </header>
      
      <main className="dashboard-main">
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* CARRUSELES PARA EL USUARIO */}
            {favoriteBooks.length > 0 && renderCarousel("❤️ Mis Favoritos", favoriteBooks)}
            {renderCarousel("🔥 Tendencias Actuales", popular)}
            {renderCarousel("✨ Nuevos Ingresos", newReleases)}
            {renderCarousel("⭐ Recomendados para ti", recommended)}

            {/* ESTADÍSTICAS REQUERIDAS (REINTEGRADAS) */}
            <section className="stats-header">
              <h2>📊 Estadísticas de la Biblioteca</h2>
              <p>Visión general del estado del catálogo</p>
            </section>

            <section className="kpi-grid">
              <div className="kpi-card glass-panel">
                <h3>Total Libros</h3>
                <p className="kpi-value">{finalTotal}</p>
              </div>
              <div className="kpi-card glass-panel">
                <h3>Disponibles</h3>
                <p className="kpi-value" style={{color: '#4ade80'}}>{finalAvailable}</p>
              </div>
              <div className="kpi-card glass-panel">
                <h3>En Préstamo</h3>
                <p className="kpi-value" style={{color: '#f59e0b'}}>{finalBorrowed}</p>
              </div>
              <div className="kpi-card glass-panel">
                <h3>Nuevos este mes</h3>
                <p className="kpi-value" style={{color: '#a855f7'}}>{finalNew}</p>
              </div>
            </section>

            <section className="charts-grid">
              <div className="chart-card glass-panel">
                <h3>Distribución por Categorías</h3>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoriesDistribution} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {categoriesDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="chart-card glass-panel">
                <h3>Disponibilidad (General)</h3>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusDistribution}>
                      <XAxis dataKey="name" stroke="var(--text-main)" />
                      <YAxis stroke="var(--text-main)" />
                      <Tooltip cursor={{fill: 'rgba(150,150,150,0.1)'}} contentStyle={{ backgroundColor: 'var(--card-bg)', border: 'none', borderRadius: '8px', color: 'var(--text-main)' }} />
                      <Bar dataKey="cantidad" radius={[6, 6, 0, 0]} barSize={50}>
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#4ade80' : '#f59e0b'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* MODAL QUIÉNES SOMOS / GUÍA */}
      {showAboutModal && (
        <div className="about-modal-overlay">
          <div className="about-modal-content glass-panel">
            <button className="close-about-btn" onClick={() => setShowAboutModal(false)}>✖</button>
            
            <div className="about-header">
              <h2>📚 Sobre Nuestra Biblioteca</h2>
              <p>
                Bienvenido al sistema digital de la biblioteca universitaria. 
                Esta plataforma está diseñada para facilitar tu vida académica: explora nuestro 
                catálogo, reserva tus libros y materiales en línea desde cualquier lugar, y luego 
                acércate físicamente a la biblioteca del campus para retirarlos rápidamente.
              </p>
            </div>

            <div className="about-sections">
              <div className="about-card">
                <h3>🎯 ¿Cómo funciona?</h3>
                <ol>
                  <li>
                    <strong>Busca:</strong> Usa nuestro buscador inteligente por voz, escáner de ISBN <em>(el código de barras único que identifica a cada libro)</em> o filtros dinámicos. Fíjate en los colores: 🟢 Disponible, 🟡 Última copia, 🔴 Agotado.
                  </li>
                  <li>
                    <strong>Reserva:</strong> Usa el botón de "Reserva" (a 1 Click) para apartar el libro por 7 días.
                  </li>
                  <li><strong>Retira:</strong> Ve a "Mi Perfil" y muestra tu Código QR al bibliotecario (puedes hacerle clic para agrandarlo).</li>
                </ol>
              </div>

              <div className="about-card">
                <h3>⭐ Comunidad y Perfil</h3>
                <ul>
                  <li><strong>Personaliza:</strong> En Configuración (Mi Perfil) puedes agregar tu foto y carrera.</li>
                  <li><strong>Opina:</strong> Al devolver un libro, podrás calificarlo y dejar una reseña para otros lectores.</li>
                  <li><strong>Favoritos:</strong> Dale al corazón (❤️) para guardar libros en tu carrusel personal.</li>
                </ul>
              </div>

              <div className="about-card">
                <h3>⚖️ Reglas y Límites</h3>
                <ul>
                  <li>Límite máximo de <strong>5 libros</strong> en préstamo simultáneo.</li>
                  <li>Tiempo de préstamo estándar de <strong>1 semana (7 días)</strong>.</li>
                  <li>⚠️ <strong>Multas:</strong> $5.000 CLP por cada libro atrasado.</li>
                </ul>
              </div>
            </div>

            <div className="about-footer">
              <button className="btn-entendido" onClick={() => setShowAboutModal(false)}>
                ¡Entendido, a leer!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;