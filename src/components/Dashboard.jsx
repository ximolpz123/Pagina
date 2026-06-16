import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dashboardStats } from '../mockData.js';
import './Dashboard.css';

// Colores modernos para nuestros gráficos
const PIE_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#8b5cf6'];

const Dashboard = () => {
  // Extraemos la data del mockData
  const { metrics, categoriesDistribution, statusDistribution, recentBooks } = dashboardStats;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Panel de Control 📊</h1>
      </header>
      
      <main className="dashboard-main">
        {/* Fila 1: KPIs (Key Performance Indicators) */}
        <section className="kpi-grid">
          <div className="kpi-card">
            <h3>Total Libros</h3>
            <p className="kpi-value">{metrics.totalBooks}</p>
          </div>
          <div className="kpi-card">
            <h3>Disponibles</h3>
            <p className="kpi-value" style={{color: '#16a34a'}}>{metrics.available}</p>
          </div>
          <div className="kpi-card">
            <h3>En Préstamo</h3>
            <p className="kpi-value" style={{color: '#ea580c'}}>{metrics.borrowed}</p>
          </div>
          <div className="kpi-card">
            <h3>Nuevos este mes</h3>
            <p className="kpi-value" style={{color: '#8b5cf6'}}>{metrics.newThisMonth}</p>
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
                  <Bar dataKey="cantidad" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Fila 3: Últimos Ingresos */}
        <section className="recent-books-section">
          <h3>Últimos Ingresos a la Biblioteca</h3>
          <div className="recent-books-list">
            {recentBooks.map(book => (
              <div key={book.id} className="recent-book-card">
                <div className="recent-book-info">
                  <h4>{book.title}</h4>
                  <p>{book.author}</p>
                </div>
                <span className="recent-book-category">{book.category}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;