import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { subscribeToBooks, subscribeToActiveReservations } from '../bookService.js';
import './Dashboard.css';

// Colores modernos para nuestros gráficos
const PIE_COLORS = ['#308855', '#165B2B', '#C6AA77', '#A08159', '#6b705c', '#8a9a5b'];

const Dashboard = () => {
  const [books, setBooks] = useState([]);
  const [activeReservations, setActiveReservations] = useState([]);

  useEffect(() => {
    // Suscripciones en tiempo real a Firebase
    const unsubBooks = subscribeToBooks(setBooks);
    const unsubRes = subscribeToActiveReservations(setActiveReservations);
    return () => { unsubBooks(); unsubRes(); };
  }, []);

  // --- LÓGICA DE AGREGACIÓN (BASE + TIEMPO REAL) ---
  // Valores base solicitados para simular una biblioteca grande
  const BASE_AVAILABLE = 201;
  const BASE_BORROWED = 139;
  const BASE_NEW = 50;
  
  const baseCategories = {
    'Informática': 120,
    'Ciencias Básicas': 90,
    'Literatura': 80,
    'Medicina': 50
  };

  let realAvailable = 0;
  let realNewThisMonth = 0;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const categoryCounts = { ...baseCategories };

  // Contabilizar libros y stock actual
  books.forEach(book => {
    const stock = book.stock !== undefined ? book.stock : (book.available ? 1 : 0);
    realAvailable += stock;

    if (book.createdAt) {
      const d = new Date(book.createdAt);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) realNewThisMonth++;
    } else {
      realNewThisMonth++; // Por defecto contamos los libros que subiste anteriormente
    }

    let cat = book.category || 'Informática';
    if (cat === 'Informática y Programación') cat = 'Informática';
    if (categoryCounts[cat] !== undefined) categoryCounts[cat] += stock;
    else categoryCounts[cat] = stock;
  });

  // Contabilizar libros en préstamo actualmente
  const realBorrowed = activeReservations.length;
  activeReservations.forEach(res => {
    const book = books.find(b => b.id === res.bookId);
    if (book) {
      let cat = book.category || 'Informática';
      if (cat === 'Informática y Programación') cat = 'Informática';
      if (categoryCounts[cat] !== undefined) categoryCounts[cat] += 1;
      else categoryCounts[cat] = 1;
    }
  });

  // Cálculo Final Combinado
  const finalAvailable = BASE_AVAILABLE + realAvailable;
  const finalBorrowed = BASE_BORROWED + realBorrowed;
  const finalTotal = finalAvailable + finalBorrowed; // (Ej: 201 + 139 = 340 + los reales)
  const finalNew = BASE_NEW + realNewThisMonth;

  const categoriesDistribution = Object.keys(categoryCounts).map(key => ({ name: key, value: categoryCounts[key] })).filter(cat => cat.value > 0);
  const statusDistribution = [ { name: 'Disponibles', cantidad: finalAvailable }, { name: 'En Préstamo', cantidad: finalBorrowed } ];
  
  // Extraer los 3 libros más recientes
  const sortedBooks = [...books].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const recentBooks = sortedBooks.slice(0, 3);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>📚 Biblioteca Online</h1>
      </header>
      
      <main className="dashboard-main">
        {/* Fila 1: KPIs (Key Performance Indicators) */}
        <section className="kpi-grid">
          <div className="kpi-card">
            <h3>Total Libros</h3>
            <p className="kpi-value">{finalTotal}</p>
          </div>
          <div className="kpi-card">
            <h3>Disponibles</h3>
            <p className="kpi-value" style={{color: '#16a34a'}}>{finalAvailable}</p>
          </div>
          <div className="kpi-card">
            <h3>En Préstamo</h3>
            <p className="kpi-value" style={{color: '#ea580c'}}>{finalBorrowed}</p>
          </div>
          <div className="kpi-card">
            <h3>Nuevos este mes</h3>
            <p className="kpi-value" style={{color: '#8b5cf6'}}>{finalNew}</p>
          </div>
        </section>

        {/* Fila 2: Gráficos de Análisis */}
        <section className="charts-grid">
          <div className="chart-card">
            <h3>Distribución por Categorías</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoriesDistribution} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {categoriesDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="chart-card">
            <h3>Disponibilidad (General)</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusDistribution}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="cantidad" radius={[6, 6, 0, 0]} barSize={50}>
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#16a34a' : '#ea580c'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Fila 3: Últimos Ingresos */}
        <section className="recent-books-section">
          <h3>Últimos Ingresos a la Biblioteca</h3>
          <div className="recent-books-list">
            {recentBooks.length > 0 ? recentBooks.map(book => (
              <div key={book.id} className="recent-book-card">
                <div className="recent-book-info">
                  <h4>{book.title}</h4>
                  <p>{book.author}</p>
                </div>
                <span className="recent-book-category">{book.category || 'General'}</span>
              </div>
            )) : (
              <p style={{color: 'var(--text-muted)'}}>Cargando últimos ingresos...</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;