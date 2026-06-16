import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import RegisterUser from './components/RegisterUser';
import VulnerabilityForm from './components/VulnerabilityForm';
import Traceability from './components/Traceability';

const Layout = ({ children }) => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: isLoginPage ? 'transparent' : '#F8FAF8', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {!isLoginPage && <Navbar />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/vulnerabilities/new" element={
              <ProtectedRoute>
                <VulnerabilityForm />
              </ProtectedRoute>
            } />
            
            <Route path="/vulnerabilities/edit/:id" element={
              <ProtectedRoute>
                <VulnerabilityForm />
              </ProtectedRoute>
            } />
            
            <Route path="/traceability" element={
              <ProtectedRoute>
                <Traceability />
              </ProtectedRoute>
            } />
            
            {/* Solo administradores pueden registrar usuarios */}
            <Route path="/admin/register" element={
              <ProtectedRoute requireAdmin={true}>
                <RegisterUser />
              </ProtectedRoute>
            } />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;