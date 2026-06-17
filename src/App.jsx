import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Dashboard from './components/Dashboard.jsx';
import Busqueda from './pages/Busqueda.jsx';
import DetalleLibro from './pages/DetalleLibro.jsx';
import MiPerfil from './pages/MiPerfil.jsx';
import Bibliotecario from './pages/Bibliotecario.jsx';
import Navbar from './components/Navbar.jsx';
import Login from './pages/Login.jsx';

// Layout principal que incluye la Navbar
const MainLayout = () => (
  <div className="app-container">
    <Outlet /> {/* Aquí se renderizarán las páginas protegidas */}
    <Navbar />
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
            <Route path="/libro/:id" element={<DetalleLibro />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;