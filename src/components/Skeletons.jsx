import React from 'react';
import './Skeletons.css';

export const BookCardSkeleton = () => {
  return (
    <div className="book-card glass-panel skeleton-wrapper">
      <div className="cover-container skeleton-cover skeleton-animate"></div>
      <div className="book-info">
        <div className="skeleton-title skeleton-animate"></div>
        <div className="skeleton-author skeleton-animate"></div>
        <div className="skeleton-rating skeleton-animate"></div>
        <div className="skeleton-badge skeleton-animate"></div>
        <div className="skeleton-btn skeleton-animate"></div>
      </div>
    </div>
  );
};

export const DashboardSkeleton = () => {
  return (
    <div className="dashboard-skeleton">
      <div className="kpi-grid">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="kpi-card glass-panel skeleton-wrapper" style={{ height: '120px' }}>
             <div className="skeleton-title skeleton-animate" style={{ width: '40%', marginBottom: '1rem' }}></div>
             <div className="skeleton-title skeleton-animate" style={{ width: '80%', height: '2rem' }}></div>
          </div>
        ))}
      </div>
      <div className="charts-grid" style={{ marginTop: '2rem' }}>
        <div className="chart-card glass-panel skeleton-wrapper" style={{ minHeight: '480px' }}></div>
        <div className="chart-card glass-panel skeleton-wrapper" style={{ minHeight: '480px' }}></div>
      </div>
    </div>
  );
};
