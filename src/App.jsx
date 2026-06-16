import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard.jsx';
import Busqueda from './pages/Busqueda.jsx';
import DetalleLibro from './pages/DetalleLibro.jsx';
import MiPerfil from './pages/MiPerfil.jsx';
import Navbar from './components/Navbar.jsx';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/busqueda" element={<Busqueda />} />
          <Route path="/detalle/:id" element={<DetalleLibro />} />
          <Route path="/perfil" element={<MiPerfil />} />
        </Routes>
        <Navbar />
      </div>
    </BrowserRouter>
  );
}

export default App;