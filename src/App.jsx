import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';

import Dashboard from './components/Dashboard.jsx';
import Busqueda from './pages/Busqueda.jsx';
import DetalleLibro from './pages/DetalleLibro.jsx';
import MiPerfil from './pages/MiPerfil.jsx';
import Bibliotecario from './pages/Bibliotecario.jsx';
import GuiaBibliotecario from './pages/GuiaBibliotecario.jsx';
import Escaner from './pages/Escaner.jsx';
import Navbar from './components/Navbar.jsx';
import Login from './pages/Login.jsx';

// Layout principal que incluye la Navbar
const MainLayout = () => (
  <div className="app-container">
    <Outlet /> {/* Aquí se renderizarán las páginas protegidas */}
    <Navbar />
    <Toaster 
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'rgba(30, 41, 59, 0.9)',
          color: '#f8fafc',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(150, 150, 150, 0.2)',
          padding: '16px',
          borderRadius: '12px'
        },
        success: { iconTheme: { primary: '#10b981', secondary: '#fff' } }
      }}
    />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/busqueda" element={<Busqueda />} />
            <Route path="/perfil" element={<MiPerfil />} />
            <Route path="/bibliotecario" element={<Bibliotecario />} />
            <Route path="/guia" element={<GuiaBibliotecario />} />
            <Route path="/escaner" element={<Escaner />} />
            <Route path="/libro/:id" element={<DetalleLibro />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;