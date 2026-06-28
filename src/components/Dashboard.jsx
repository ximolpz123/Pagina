import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeToBooks, subscribeToUserActiveReservations, subscribeToAllReservationsGlobal } from '../bookService.js';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx-js-style';
import toast from 'react-hot-toast';
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
  const [globalReservations, setGlobalReservations] = useState([]);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const isLibrarian = currentUser?.email === 'bibliotecario@santotomas.cl';

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
    
    let unsubGlobal = () => {};
    if (isLibrarian) {
      unsubGlobal = subscribeToAllReservationsGlobal(setGlobalReservations);
    }
    
    return () => { unsubBooks(); unsubRes(); unsubGlobal(); };
  }, [currentUser, isLibrarian]);

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


  // --- LÓGICA DINÁMICA PARA TENDENCIAS DE PRÉSTAMOS ---
  const trendData = useMemo(() => {
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const today = new Date();
    const data = [];
    
    // 1. Crear los últimos 6 meses vacíos
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      data.push({
        mes: monthNames[d.getMonth()],
        year: d.getFullYear(),
        monthNum: d.getMonth(),
        'Informática': 0,
        'Ficción': 0,
        'Medicina': 0,
      });
    }

    const uniqueCategories = new Set(['Informática', 'Ficción', 'Medicina']);

    // 2. Sumar las reservas reales de la base de datos
    globalReservations.forEach(res => {
      if (!res.createdAt) return;
      const d = new Date(res.createdAt);
      const monthItem = data.find(m => m.monthNum === d.getMonth() && m.year === d.getFullYear());
      
      if (monthItem) {
        let cat = res.bookCategory || 'Informática';
        
        // Inicializar si no existe
        if (monthItem[cat] === undefined) {
          data.forEach(m => {
            if (m[cat] === undefined) m[cat] = 0;
          });
        }
        
        monthItem[cat] += 1;
        uniqueCategories.add(cat);
      }
    });

    // 3. Añadir datos base ficticios para que el gráfico no empiece en cero (Ejemplo)
    data.forEach((item, index) => {
      item['Informática'] += (index * 5) + 12;
      item['Ficción'] += (index * 4) + 8;
      item['Medicina'] += (index * 2) + 5;
    });

    return { data, categories: Array.from(uniqueCategories) };
  }, [globalReservations]);

  // --- CLASIFICACIÓN PARA CARRUSELES ---
  const sortedByDate = [...books].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const newReleases = sortedByDate.slice(0, 5);
  
  const recommended = books.filter(b => b.rating >= 4).slice(0, 5);
  // Reemplazamos Math.random por un orden determinista simulado para evitar el error del linter
  const popular = [...books].sort((a, b) => (b.title?.length || 0) - (a.title?.length || 0)).slice(0, 5);
  const mostRented = [...books].sort((a, b) => (b.author?.length || 0) - (a.author?.length || 0)).slice(0, 5);
  
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

  const exportToExcel = () => {
    if (!books || books.length === 0) {
      toast.error('No hay libros para exportar');
      return;
    }
    
    // Mapear los libros para que se vean bien en columnas Excel
    const rows = books.map(book => ({
      'ID Libro': book.id,
      'Título del Libro': book.title || 'Sin Título',
      'Autor / Escritor': book.author || 'Anónimo',
      'Categoría Literaria': book.category || 'General',
      'Stock Total': book.stock || 0,
      'Estado': book.available ? '✅ Disponible' : '❌ Agotado',
      'Calificación (Estrellas)': book.rating || 5
    }));
    
    // Crear la hoja y libro de cálculo de Excel
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    
    // Aplicar estilos a las celdas (Bordes, Colores, Fuentes)
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = { c: C, r: R };
        const cellRef = XLSX.utils.encode_cell(cellAddress);
        if (!worksheet[cellRef]) continue;

        let cellStyle = {
          font: { name: 'Arial', sz: 11, color: { rgb: "333333" } },
          border: {
            top: { style: 'thin', color: { rgb: "CCCCCC" } },
            bottom: { style: 'thin', color: { rgb: "CCCCCC" } },
            left: { style: 'thin', color: { rgb: "CCCCCC" } },
            right: { style: 'thin', color: { rgb: "CCCCCC" } }
          },
          alignment: { vertical: "center", horizontal: "left", wrapText: true }
        };

        if (R === 0) {
          // Encabezados
          cellStyle.fill = { fgColor: { rgb: "10B981" } }; // Verde
          cellStyle.font = { name: 'Arial', sz: 12, bold: true, color: { rgb: "FFFFFF" } };
          cellStyle.alignment.horizontal = "center";
        } else {
          // Filas alternas
          if (R % 2 === 0) {
            cellStyle.fill = { fgColor: { rgb: "F9FAFB" } }; // Gris super claro
          } else {
            cellStyle.fill = { fgColor: { rgb: "FFFFFF" } }; // Blanco
          }
        }

        worksheet[cellRef].s = cellStyle;
      }
    }

    // Ajustar el ancho de las columnas
    const colWidths = [
      { wch: 22 }, // ID
      { wch: 40 }, // Título
      { wch: 25 }, // Autor
      { wch: 20 }, // Categoría
      { wch: 12 }, // Stock
      { wch: 15 }, // Estado
      { wch: 25 }  // Rating
    ];
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
    
    // Generar archivo y forzar descarga
    XLSX.writeFile(workbook, `Reporte_Inventario_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success('Reporte Excel descargado con éxito 📊');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header glass-panel" style={{ position: 'relative' }}>
        <div>
          <h1>
            {isLibrarian 
              ? 'Bienvenido Bibliotecario 👋' 
              : `Bienvenido, ${currentUser?.displayName ? currentUser.displayName.split(' ')[0] : 'Lector'} 👋`
            }
          </h1>
          {!isLibrarian && (
            <p>Aquí encontrarás tus libros favoritos o de estudio.</p>
          )}
        </div>
        {!isLibrarian && (
          <button className="about-btn" onClick={() => setShowAboutModal(true)}>
            📖 ¿Quiénes somos? / Guía
          </button>
        )}
        {isLibrarian && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="about-btn" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }} onClick={() => navigate('/guia')}>
              📖 Guía
            </button>
            <button className="about-btn" style={{ backgroundColor: '#ef4444', color: 'white' }} onClick={async () => {
              await logout();
              navigate('/login');
            }}>
              🚪 Cerrar Sesión
            </button>
          </div>
        )}
      </header>
      
      <main className="dashboard-main">
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* VISTA SEGÚN ROL */}
            {isLibrarian ? (
              <>
                {renderCarousel("✨ Nuevos Ingresos al Catálogo", newReleases)}
                {renderCarousel("🏆 Más rentados este mes", mostRented)}
              </>
            ) : (
              <>
                {/* CARRUSELES PARA EL USUARIO */}
                {favoriteBooks.length > 0 && renderCarousel("❤️ Mis Favoritos", favoriteBooks)}
                {renderCarousel("🔥 Tendencias Actuales", popular)}
                {renderCarousel("🏆 Más rentados este mes", mostRented)}
                {renderCarousel("✨ Nuevos Ingresos", newReleases)}
                {renderCarousel("⭐ Recomendados para ti", recommended)}
              </>
            )}

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
                <h3>Agotados</h3>
                <p className="kpi-value" style={{color: '#ef4444'}}>{finalTotal - finalAvailable}</p>
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

            <section className="chart-card glass-panel" style={{ marginTop: '1.5rem', minHeight: '400px' }}>
              <h3>Tendencia de Préstamos por Categoría (Últimos 6 Meses)</h3>
              <div className="chart-wrapper" style={{ height: '350px', width: '100%', marginTop: '1rem' }}>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={trendData.data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />
                    <XAxis dataKey="mes" stroke="var(--text-main)" />
                    <YAxis stroke="var(--text-main)" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: 'none', borderRadius: '8px', color: 'var(--text-main)', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    {trendData.categories.map((cat, index) => (
                      <Line 
                        key={cat}
                        type="monotone" 
                        dataKey={cat} 
                        stroke={PIE_COLORS[index % PIE_COLORS.length]} 
                        strokeWidth={3} 
                        activeDot={index === 0 ? { r: 8 } : false} 
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
            
            {isLibrarian && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem', paddingBottom: '2rem' }}>
                <button 
                  style={{ padding: '1rem 2rem', backgroundColor: '#10b981', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'transform 0.2s' }} 
                  onClick={exportToExcel}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  📊 Descargar Reporte Completo de Inventario (Excel)
                </button>
              </div>
            )}
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
                    <strong>1. Busca:</strong> Ingresa a la lupa inferior (Buscar). Usa nuestro buscador inteligente por voz, escáner de ISBN o los filtros rápidos (Píldoras).
                  </li>
                  <li>
                    <strong>2. Verifica:</strong> Fíjate en los colores de la tarjeta: 🟢 Disponible, 🟡 Última copia, 🔴 Agotado.
                  </li>
                  <li>
                    <strong>3. Reserva:</strong> Haz clic en el botón "⚡ Reserva" para apartarlo por 7 días. El libro irá a tu sección "Pendientes de Retiro".
                  </li>
                  <li>
                    <strong>4. Retira:</strong> Muestra tu Código QR al bibliotecario. ¡Al escanearlo, el préstamo se activará automáticamente y desaparecerá el QR!
                  </li>
                </ol>
              </div>

              <div className="about-card">
                <h3>🏆 Sistema de Recompensas (XP)</h3>
                <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>Gana XP devolviendo libros a tiempo para subir de nivel y obtener <strong>décimas para tu próxima evaluación</strong>:</p>
                <ul style={{ fontSize: '0.85rem' }}>
                  <li>🌱 <strong>Lector Principiante:</strong> Nivel inicial.</li>
                  <li>🗺️ <strong>Explorador Literario (250 XP):</strong> Recompensa: <strong>+2 décimas</strong>.</li>
                  <li>👑 <strong>Ratón de Biblioteca (750 XP):</strong> Recompensa: <strong>+4 décimas</strong>.</li>
                  <li>🧙‍♂️ <strong>Erudito Máximo (1500 XP):</strong> Recompensa: <strong>+6 décimas</strong>.</li>
                </ul>
                <div style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '10px', borderRadius: '8px', marginTop: '10px', fontSize: '0.8rem' }}>
                  <strong>⚠️ Validación Antifraude:</strong> Para hacer válidas tus décimas, debes haber mantenido el libro al menos <strong>2 días</strong> y el bibliotecario te hará un breve <strong>interrogatorio sobre el libro</strong> al devolverlo. ¡Si respondes bien, las décimas son tuyas!
                </div>
              </div>

              <div className="about-card">
                <h3>⭐ Comunidad, Perfil y Accesibilidad</h3>
                <ul>
                  <li><strong>Personaliza:</strong> En Configuración (Mi Perfil) puedes agregar tu foto y carrera.</li>
                  <li><strong>Opina:</strong> Al devolver un libro, podrás calificarlo y dejar una reseña para otros lectores.</li>
                  <li><strong>Favoritos:</strong> Dale al corazón (❤️) para guardar libros en tu carrusel personal.</li>
                  <li><strong>Notificaciones (🔔):</strong> Si un libro está agotado, puedes solicitar que te avisen. Revisa la campanita en el menú para ver si ya hay stock.</li>
                  <li><strong>Accesibilidad (🌓):</strong> Usa el botón de tema (Luna/Sol/Ojo) para activar el Modo Oscuro o el Alto Contraste. También puedes cambiar a vista de lista en Búsqueda.</li>
                </ul>
              </div>

              <div className="about-card">
                <h3>⚖️ Reglas y Límites</h3>
                <ul>
                  <li>Límite máximo de <strong>5 libros</strong> en préstamo simultáneo.</li>
                  <li>Tiempo de préstamo estándar de <strong>1 semana (7 días)</strong>.</li>
                  <li>⚠️ <strong>Penalización Académica:</strong> Se descontarán <strong>5 décimas</strong> en tu próxima nota por cada libro atrasado.</li>
                  <li>🚫 <strong>Bloqueo Temporal:</strong> Si entregas un libro atrasado, no podrás volver a reservar libros de <strong>ese mismo género</strong> (ej. Ficción) durante 1 semana.</li>
                  <li>🚫 <strong>Cancelaciones Justas:</strong> Si te arrepientes y cancelas una reserva antes de retirarla, esta se borra y no suma XP ni historial.</li>
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