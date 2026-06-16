import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, addDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, userName, role, permissions } = useAuth(); // Importamos al usuario para la auditoría

  // Filtros
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [vulnToDelete, setVulnToDelete] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [expandedVulnId, setExpandedVulnId] = useState(null);
  const [unauthModalOpen, setUnauthModalOpen] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'vulnerabilities'), orderBy('fecha', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVulnerabilities(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (role === 'admin') {
      const unsubscribeUsers = onSnapshot(query(collection(db, 'users')), (snapshot) => {
        setUsersList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribeUsers();
    }
  }, [role]);

  const filteredVulnerabilities = vulnerabilities.filter(v => {
    let match = true;
    if (filterSeverity && v.severidad !== filterSeverity) match = false;
    if (filterStatus && v.estado !== filterStatus) match = false;
    return match;
  });

  // --- Lógica de cálculo para Gráficos ---
  const totalVulnerabilities = filteredVulnerabilities.length;
  
  const sevCounts = { 'Baja': 0, 'Media': 0, 'Alta': 0, 'Crítica': 0 };
  const statusCounts = { 'Nuevo': 0, 'En Análisis': 0, 'En Remediación': 0, 'Mitigado': 0, 'Cerrado': 0 };

  filteredVulnerabilities.forEach(v => {
    if (sevCounts[v.severidad] !== undefined) sevCounts[v.severidad]++;
    if (statusCounts[v.estado] !== undefined) statusCounts[v.estado]++;
  });

  const severityConfig = [
    { name: 'Baja', value: sevCounts['Baja'], color: '#3498db', gradient: 'linear-gradient(180deg, #5dade2 0%, #2980b9 100%)' },
    { name: 'Media', value: sevCounts['Media'], color: '#f39c12', gradient: 'linear-gradient(180deg, #f5b041 0%, #d68910 100%)' },
    { name: 'Alta', value: sevCounts['Alta'], color: '#e67e22', gradient: 'linear-gradient(180deg, #eb984e 0%, #ca6f1e 100%)' },
    { name: 'Crítica', value: sevCounts['Crítica'], color: '#c0392b', gradient: 'linear-gradient(180deg, #e74c3c 0%, #a93226 100%)' }
  ];
  const maxSevValue = Math.max(...severityConfig.map(c => c.value), 1); // Para escalar las barras

  const statusConfig = [
    { name: 'Nuevo', value: statusCounts['Nuevo'], color: '#2c3e50' },
    { name: 'En Análisis', value: statusCounts['En Análisis'], color: '#8e44ad' },
    { name: 'En Remediación', value: statusCounts['En Remediación'], color: '#d35400' },
    { name: 'Mitigado', value: statusCounts['Mitigado'], color: '#006837' },
    { name: 'Cerrado', value: statusCounts['Cerrado'], color: '#7f8c8d' }
  ];

  let pieGradients = '#f1f5f9 0deg 360deg'; // Fondo gris si está vacío
  if (totalVulnerabilities > 0) {
    let currentPieAngle = 0;
    pieGradients = statusConfig.filter(s => s.value > 0).map(s => {
      const percentage = (s.value / totalVulnerabilities) * 100;
      const angle = (percentage / 100) * 360;
      const start = currentPieAngle;
      currentPieAngle += angle;
      return `${s.color} ${start}deg ${currentPieAngle}deg`;
    }).join(', ');
  }
  // --- Fin Lógica de Gráficos ---

  // Función para escapar texto en HTML y mantener los saltos de línea
  const formatForExcel = (str) => {
    let safeStr = String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
      
    // Prevención contra Inyección de Fórmulas (CSV/Excel Injection)
    if (/^[=+\-@]/.test(safeStr)) {
      safeStr = "'" + safeStr; // Un apóstrofe al inicio obliga a Excel a tratarlo como texto, neutralizando la inyección
    }
    return safeStr;
  };

  // Generador de tabla HTML que Excel procesa como hoja de cálculo formateada
  const generateExcelHTML = (dataArray) => {
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; font-family: sans-serif; }
          th { background-color: #006837; color: white; font-weight: bold; border: 1px solid #aaaaaa; padding: 8px; text-align: left; }
          td { border: 1px solid #aaaaaa; padding: 8px; vertical-align: top; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th>Identificador</th>
              <th>Fecha</th>
              <th>Activo Afectado</th>
              <th>Tipo</th>
              <th>Severidad</th>
              <th>Estado</th>
              <th>Descripción Técnica</th>
              <th>Recomendación</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    dataArray.forEach(v => {
      html += `
        <tr>
          <td>${formatForExcel(v.identificador)}</td>
          <td>${formatForExcel(v.fecha)}</td>
          <td>${formatForExcel(v.activoAfectado)}</td>
          <td>${formatForExcel(v.tipo)}</td>
          <td>${formatForExcel(v.severidad)}</td>
          <td>${formatForExcel(v.estado)}</td>
          <td>${formatForExcel(v.descripcionTecnica)}</td>
          <td>${formatForExcel(v.recomendacion)}</td>
        </tr>
      `;
    });

    html += '</tbody></table></body></html>';
    return html;
  };

  const handleExportExcel = () => {
    if (filteredVulnerabilities.length === 0) return;
    
    const html = generateExcelHTML(filteredVulnerabilities);
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const excelUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = excelUrl;
    link.download = `reporte_vulnerabilidades_${new Date().getTime()}.xls`;
    link.click();
  };

  const handleExportSingle = (vuln) => {
    const html = generateExcelHTML([vuln]);
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const excelUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = excelUrl;
    link.download = `hallazgo_${vuln.identificador}.xls`;
    link.click();
  };

  const hasPermission = (perm) => role === 'admin' || (permissions && permissions[perm]);

  const handleProtectedAction = (perm, actionFunc) => {
    if (hasPermission(perm)) {
      actionFunc();
    } else {
      setUnauthModalOpen(true);
    }
  };

  const handleOpenProfile = () => {
    const currentUserData = usersList.find(u => u.email === user?.email);
    if (currentUserData) {
      setSelectedUserId(currentUserData.id);
      setProfileNameInput(currentUserData.name || '');
    } else {
      setSelectedUserId('');
      setProfileNameInput('');
    }
    setProfileModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedUserId) return;
    const targetUser = usersList.find(u => u.id === selectedUserId);
    if (!targetUser) return;

    try {
      await updateDoc(doc(db, 'users', targetUser.id), { name: profileNameInput });
      
      if (user) {
        await addDoc(collection(db, 'audit_logs'), {
          user_email: user.email,
          user_name: userName || user.email,
          action: 'edicion_perfil',
          details: `Actualizó el nombre de ${targetUser.email} a ${profileNameInput}`,
          timestamp: serverTimestamp()
        });
      }
      setProfileModalOpen(false);
      setProfileNameInput('');
      setSelectedUserId('');
    } catch (error) {
      console.error("Error actualizando perfil:", error);
      alert("Hubo un error al actualizar el perfil.");
    }
  };

  const handleDeleteClick = (vuln) => {
    setVulnToDelete(vuln);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!vulnToDelete) return;
    const vuln = vulnToDelete;
    setDeleteModalOpen(false);
    setVulnToDelete(null);

    try {
      await deleteDoc(doc(db, 'vulnerabilities', vuln.id));
      
      if (user) {
        await addDoc(collection(db, 'audit_logs'), {
          user_email: user.email,
          user_name: userName || user.email,
          action: 'eliminacion_hallazgo',
          details: `Eliminó el hallazgo ${vuln.identificador} (${vuln.activoAfectado})`,
          deletedData: vuln,
          timestamp: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('Hubo un error al intentar eliminar el hallazgo.');
    }
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          .action-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 34px;
            height: 34px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .action-btn:hover {
            transform: translateY(-2px);
          }
          .action-btn:active {
            transform: translateY(0) scale(0.95);
          }
          .action-btn-download { color: #2980b9; background-color: #ebf5fb; }
          .action-btn-download:hover { background-color: #d6eaf8; box-shadow: 0 4px 8px rgba(41, 128, 185, 0.2); }
          
          .action-btn-edit { color: #006837; background-color: #e8f5e9; }
          .action-btn-edit:hover { background-color: #c8e6c9; box-shadow: 0 4px 8px rgba(0, 104, 55, 0.2); }
          
          .action-btn-delete { color: #c0392b; background-color: #fdedec; }
          .action-btn-delete:hover { background-color: #fadbd8; box-shadow: 0 4px 8px rgba(192, 57, 43, 0.2); }
          
          @keyframes shake {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-15deg); }
            75% { transform: rotate(15deg); }
          }
          .action-btn-delete:hover svg {
            animation: shake 0.4s ease-in-out;
          }

          .action-btn-view { color: #8e44ad; background-color: #f4ecf7; }
          .action-btn-view:hover, .action-btn-view.active { background-color: #d2b4de; box-shadow: 0 4px 8px rgba(142, 68, 173, 0.2); }
          
          .details-expand-anim {
            animation: slideDown 0.3s ease-out forwards;
            transform-origin: top;
          }
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .doc-link-hover {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            background-color: white;
            border: 1px solid #cbd5e1;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            text-decoration: none;
            color: #2980b9;
            font-size: 0.85rem;
            font-weight: 600;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            cursor: pointer;
          }
          .doc-link-hover:hover {
            background-color: #f0f8ff;
            border-color: #2980b9;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(41, 128, 185, 0.15);
          }
          
          /* Estilos para los botones del Modal */
          .modal-cancel-btn {
            padding: 0.6rem 1.5rem; background-color: #f3f4f6; color: #4b5563; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: all 0.2s;
          }
          .modal-cancel-btn:hover { background-color: #e5e7eb; }
          
          .modal-delete-btn {
            padding: 0.6rem 1.5rem; background-color: #e74c3c; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px rgba(231, 76, 60, 0.2);
          }
          .modal-delete-btn:hover { background-color: #c0392b; transform: translateY(-1px); }
          
          @keyframes modalSlideIn {
            from { opacity: 0; transform: translateY(-20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          
          .btn-export, .btn-add {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            color: white;
            border: none;
            padding: 0.6rem 1.1rem;
            border-radius: 8px;
            font-weight: 700;
            font-size: 0.85rem;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            overflow: hidden;
            position: relative;
          }
          .btn-export::before, .btn-add::before {
            content: '';
            position: absolute;
            top: 0; left: -100%; width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            transition: all 0.6s ease;
          }
          .btn-export:hover, .btn-add:hover {
            transform: translateY(-3px) scale(1.02);
          }
          .btn-export:hover::before, .btn-add:hover::before {
            left: 100%;
          }
          .btn-export:active, .btn-add:active {
            transform: translateY(0) scale(0.98);
          }

          .btn-export {
            background: linear-gradient(135deg, #F4B41A 0%, #d69a10 100%);
            box-shadow: 0 4px 12px rgba(244, 180, 26, 0.3);
          }
          .btn-export:hover {
            box-shadow: 0 8px 20px rgba(244, 180, 26, 0.4);
          }
          .btn-export:active {
            box-shadow: 0 2px 6px rgba(244, 180, 26, 0.2);
          }
          .btn-add {
            background: linear-gradient(135deg, #008f4c 0%, #006837 100%);
            box-shadow: 0 4px 12px rgba(0, 104, 55, 0.3);
          }
          .btn-add:hover {
            box-shadow: 0 8px 20px rgba(0, 104, 55, 0.4);
          }
          .btn-add:active {
            box-shadow: 0 2px 6px rgba(0, 104, 55, 0.2);
          }
        
          .btn-floating-profile {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background-color: transparent;
            color: #64748b;
            border: 1px solid #cbd5e1;
            padding: 0.5rem 1.2rem;
            border-radius: 20px;
            cursor: pointer;
            font-weight: 700;
            font-size: 0.85rem;
            transition: all 0.3s ease;
          }
          .btn-floating-profile:hover {
            color: #2980b9;
            border-color: #2980b9;
            background-color: #f0f8ff;
            transform: translateY(-2px);
            box-shadow: 0 4px 10px rgba(41, 128, 185, 0.15);
          }

        .pie-chart-3d {
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .pie-chart-3d:hover {
          transform: scale(1.08) rotate(3deg);
        }
        .bar-3d {
          transition: filter 0.3s;
        }
        .bar-3d:hover {
          filter: brightness(1.15);
        }

          /* --- Estilos Modernos para Filtros y Tabla --- */
          .filter-wrapper {
            display: flex;
            align-items: center;
            gap: 1.5rem;
            background: #f8fafc;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            margin-bottom: 1.5rem;
            border: 1px solid #e2e8f0;
          }
          .filter-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: #475569;
            font-weight: 700;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .modern-select {
            appearance: none;
            background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E");
            background-repeat: no-repeat;
            background-position: right 0.7rem top 50%;
            background-size: 1.1rem auto;
            padding: 0.65rem 2.5rem 0.65rem 1rem;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            background-color: white;
            color: #334155;
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 1px 2px rgba(0,0,0,0.02);
            min-width: 180px;
          }
          .modern-select:hover { border-color: #94a3b8; }
          .modern-select:focus { outline: none; border-color: #006837; box-shadow: 0 0 0 3px rgba(0, 104, 55, 0.1); }
          
          .modern-table-row { transition: background-color 0.2s ease; }
          .modern-table-row:hover { background-color: #f1f5f9 !important; }
        `}
      </style>

      {deleteModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <h3 style={styles.modalTitle}>Eliminación</h3>
            <p style={styles.modalText}>
              ¿Estás seguro que quieres eliminar el hallazgo <strong>{vulnToDelete?.identificador}</strong>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
              <button onClick={() => setDeleteModalOpen(false)} className="modal-cancel-btn">Cancelar</button>
              <button onClick={confirmDelete} className="modal-delete-btn">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {profileModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2980b9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <h3 style={{...styles.modalTitle, color: '#2980b9'}}>Gestión de Nombres</h3>
            <p style={styles.modalText}>Modifica el nombre de los perfiles del sistema.</p>
            
            <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#4b5563', fontSize: '0.9rem' }}>Seleccionar Usuario</label>
              <select 
                value={selectedUserId} 
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  const u = usersList.find(user => user.id === e.target.value);
                  if (u) setProfileNameInput(u.name || '');
                }}
                style={{ width: '100%', boxSizing: 'border-box', padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem', marginBottom: '1rem', backgroundColor: 'white' }}
              >
                <option value="">-- Selecciona un usuario --</option>
                {usersList.map(u => (
                  <option key={u.id} value={u.id}>{u.email} ({u.role})</option>
                ))}
              </select>

              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#4b5563', fontSize: '0.9rem' }}>Nombre Completo</label>
              <input 
                type="text" 
                value={profileNameInput} 
                onChange={(e) => setProfileNameInput(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem' }}
                placeholder="Ej: Ana María García"
                disabled={!selectedUserId}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
              <button onClick={() => setProfileModalOpen(false)} className="modal-cancel-btn">Cancelar</button>
              <button onClick={handleSaveProfile} className="modal-delete-btn" style={{ backgroundColor: '#2980b9', boxShadow: '0 4px 6px rgba(41, 128, 185, 0.2)' }} disabled={!selectedUserId || !profileNameInput}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {unauthModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
              <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <h3 style={styles.modalTitle}>Acceso Denegado</h3>
            <p style={styles.modalText}>
              No tienes permisos suficientes para realizar esta acción. <br/><br/>
              Comunícate con el administrador del sistema.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button onClick={() => setUnauthModalOpen(false)} className="modal-delete-btn">Entendido</button>
            </div>
          </div>
        </div>
      )}

      {role === 'admin' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '0.5rem' }}>
          <button onClick={handleOpenProfile} className="btn-floating-profile" title="Modificar Nombres de Perfiles">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            Perfiles
          </button>
        </div>
      )}

      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Panel de Control</h2>
          <p style={styles.subtitle}>Gestión de vulnerabilidades de infopuntos</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => handleProtectedAction('canCreate', () => navigate('/vulnerabilities/new'))} className="btn-add" title="Agregar Nuevo Hallazgo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            Agregar Hallazgo
          </button>
          <button onClick={() => handleProtectedAction('canExport', handleExportExcel)} className="btn-export" title="Descargar Reportes en Excel">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Reportes
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <div className="filter-wrapper">
          <div className="filter-label">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            Filtros
          </div>
          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="modern-select">
            <option value="">🟢 Todas las Severidades</option>
            <option value="Baja">Baja</option>
            <option value="Media">Media</option>
            <option value="Alta">Alta</option>
            <option value="Crítica">Crítica</option>
          </select>
          
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="modern-select">
            <option value="">📋 Todos los Estados</option>
            <option value="Nuevo">Nuevo</option>
            <option value="En Análisis">En Análisis</option>
            <option value="En Remediación">En Remediación</option>
            <option value="Mitigado">Mitigado</option>
            <option value="Cerrado">Cerrado</option>
          </select>
        </div>

        {loading ? (
          <div style={{textAlign: 'center', padding: '3rem', color: '#666'}}>Cargando datos de Firestore...</div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHead}>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Activo</th>
                  <th style={styles.th}>Tipo</th>
                  <th style={styles.th}>Severidad</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredVulnerabilities.map(vuln => (
                  <React.Fragment key={vuln.id}>
                    <tr className="modern-table-row" style={{ backgroundColor: expandedVulnId === vuln.id ? '#f8fafc' : 'transparent' }}>
                      <td style={styles.td}><strong>{vuln.identificador}</strong></td>
                      <td style={styles.td}>{vuln.fecha}</td>
                      <td style={styles.td}>{vuln.activoAfectado}</td>
                      <td style={styles.td}>{vuln.tipo}</td>
                      <td style={styles.td}>
                        <span style={getSeverityStyle(vuln.severidad)}>{vuln.severidad}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={getStatusStyle(vuln.estado)}>{vuln.estado}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => setExpandedVulnId(expandedVulnId === vuln.id ? null : vuln.id)} className={`action-btn action-btn-view ${expandedVulnId === vuln.id ? 'active' : ''}`} title={expandedVulnId === vuln.id ? "Ocultar Detalles" : "Ver Detalles"}>
                            {expandedVulnId === vuln.id ? (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                            ) : (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            )}
                          </button>
                          <button onClick={() => handleProtectedAction('canExport', () => handleExportSingle(vuln))} className="action-btn action-btn-download" title="Descargar Excel">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                          </button>
                          <button onClick={() => handleProtectedAction('canEdit', () => navigate(`/vulnerabilities/edit/${vuln.id}`))} className="action-btn action-btn-edit" title="Editar">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </button>
                          <button onClick={() => handleProtectedAction('canDelete', () => handleDeleteClick(vuln))} className="action-btn action-btn-delete" title="Eliminar">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {expandedVulnId === vuln.id && (
                      <tr>
                        <td colSpan="7" style={{ padding: 0 }}>
                          <div className="details-expand-anim" style={{ padding: '1.5rem 2.5rem', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.02)' }}>
                            <h4 style={{ margin: '0 0 1.2rem 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8e44ad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                              Detalles del Hallazgo
                            </h4>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                              <div>
                                <strong style={{ display: 'block', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Descripción Técnica</strong>
                                <p style={{ margin: 0, color: '#334155', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{vuln.descripcionTecnica || 'No especificada.'}</p>
                              </div>
                              <div>
                                <strong style={{ display: 'block', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Recomendación / Solución</strong>
                                <p style={{ margin: 0, color: '#334155', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{vuln.recomendacion || 'No especificada.'}</p>
                              </div>
                              <div>
                                <strong style={{ display: 'block', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Evidencia (Texto/Enlaces)</strong>
                                <p style={{ margin: 0, color: '#334155', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{vuln.evidencia || 'No hay evidencia en texto registrada.'}</p>
                              </div>
                            </div>
                            
                            {/* Archivos adjuntos */}
                            {vuln.archivosEvidencia && Array.isArray(vuln.archivosEvidencia) && vuln.archivosEvidencia.length > 0 && (
                              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #cbd5e1' }}>
                                <strong style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0f172a', fontSize: '0.95rem', marginBottom: '1rem' }}>
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                                  Documentos Adjuntos ({vuln.archivosEvidencia.length})
                                </strong>
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                  {vuln.archivosEvidencia.map((file, idx) => (
                                    <button 
                                      key={idx} 
                                      onClick={() => handleProtectedAction('canExport', () => {
                                        const link = document.createElement('a');
                                        link.href = file.dataUrl;
                                        link.download = file.name;
                                        link.click();
                                      })} 
                                      className="doc-link-hover"
                                      style={{ fontFamily: 'inherit' }}
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                      {file.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {filteredVulnerabilities.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{textAlign: 'center', padding: '2rem', color: '#777'}}>No se encontraron vulnerabilidades que coincidan con los filtros.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- SECCIÓN DE GRÁFICOS 3D --- */}
      {!loading && (
        <div style={styles.chartsContainer}>
          {/* Gráfico de Barras: Severidad */}
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Vulnerabilidades por Severidad</h3>
            <div style={styles.barChartWrapper}>
              {severityConfig.map(sev => (
                <div key={sev.name} style={styles.barColumn}>
                  <span style={styles.barValue}>{sev.value}</span>
                  <div style={styles.barTrack}>
                    <div 
                      className="bar-3d"
                      style={{
                        ...styles.barFill, 
                        height: `${(sev.value / maxSevValue) * 100}%`,
                        backgroundImage: sev.gradient,
                        boxShadow: sev.value > 0 ? 'inset -3px 0 5px rgba(0,0,0,0.15), 0 4px 6px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      {/* Tapa 3D de la barra */}
                      {sev.value > 0 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '6px 6px 0 0' }}></div>}
                    </div>
                  </div>
                  <span style={styles.barLabel}>{sev.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Gráfico de Pastel/Donut: Estado */}
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>Distribución por Estado</h3>
            <div style={styles.pieChartWrapper}>
              <div className="pie-chart-3d" style={{ ...styles.pieChart, background: `conic-gradient(${pieGradients})` }}>
                <div style={styles.pieInner}>
                  <span style={{ fontSize: '1.6rem', fontWeight: '900', color: '#1e293b' }}>{totalVulnerabilities}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Total</span>
                </div>
              </div>
              <div style={styles.pieLegend}>
                {statusConfig.map(st => (
                  <div key={st.name} style={styles.legendItem}>
                    <span style={{...styles.legendColor, backgroundColor: st.color}}></span>
                    <span style={styles.legendText}>{st.name} <strong style={{color: '#1e293b'}}>({st.value})</strong></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const getSeverityStyle = (severity) => {
  const baseStyle = { padding: '0.3rem 0.6rem', borderRadius: '20px', color: 'white', fontWeight: 'bold', fontSize: '0.75rem', display: 'inline-block' };
  switch (severity) {
    case 'Baja': return { ...baseStyle, backgroundColor: '#3498db' };
    case 'Media': return { ...baseStyle, backgroundColor: '#f39c12' };
    case 'Alta': return { ...baseStyle, backgroundColor: '#e67e22' };
    case 'Crítica': return { ...baseStyle, backgroundColor: '#c0392b' };
    default: return baseStyle;
  }
};

const getStatusStyle = (status) => {
  const baseStyle = { padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid', fontWeight: 'bold', fontSize: '0.75rem', display: 'inline-block' };
  switch (status) {
    case 'Nuevo': return { ...baseStyle, color: '#2c3e50', borderColor: '#2c3e50', backgroundColor: '#ecf0f1' };
    case 'En Análisis': return { ...baseStyle, color: '#8e44ad', borderColor: '#8e44ad', backgroundColor: '#f4ecf7' };
    case 'En Remediación': return { ...baseStyle, color: '#d35400', borderColor: '#d35400', backgroundColor: '#fbeee6' };
    case 'Mitigado': return { ...baseStyle, color: '#006837', borderColor: '#006837', backgroundColor: '#e8f5e9' };
    case 'Cerrado': return { ...baseStyle, color: '#7f8c8d', borderColor: '#7f8c8d', backgroundColor: '#f2f4f4' };
    default: return baseStyle;
  }
}

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  title: {
    color: '#006837',
    margin: 0,
    fontSize: '1.8rem'
  },
  subtitle: {
    color: '#666',
    margin: '0.2rem 0 0 0',
    fontSize: '1rem'
  },
  headerActions: {
    display: 'flex',
    gap: '1rem'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 20px rgba(0,0,0,0.04)',
    padding: '2rem',
    border: '1px solid #f1f5f9'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHead: {
    backgroundColor: '#f8fafc',
  },
  th: {
    padding: '1.2rem 1rem',
    borderBottom: '2px solid #e2e8f0',
    color: '#475569',
    fontWeight: '700',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    textAlign: 'left',
    whiteSpace: 'nowrap'
  },
  td: {
    padding: '1.2rem 1rem',
    borderBottom: '1px solid #f1f5f9',
    color: '#334155',
    fontSize: '0.95rem',
    verticalAlign: 'middle'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'white',
    padding: '2.5rem 2rem',
    borderRadius: '12px',
    maxWidth: '400px',
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    animation: 'modalSlideIn 0.3s ease-out'
  },
  modalTitle: {
    color: '#e74c3c', fontSize: '1.5rem', margin: '0 0 0.8rem 0', fontWeight: '800'
  },
  modalText: {
    color: '#4b5563', fontSize: '1.05rem', margin: 0, lineHeight: '1.5'
  },
  chartsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '1.5rem',
    marginTop: '2rem'
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
    padding: '1.8rem',
    borderTop: '4px solid #F4B41A',
    display: 'flex',
    flexDirection: 'column'
  },
  chartTitle: {
    margin: '0 0 1.5rem 0',
    color: '#2c3e50',
    fontSize: '1.2rem',
    fontWeight: '800',
    textAlign: 'center'
  },
  barChartWrapper: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: '200px',
    padding: '0 1rem',
    marginTop: 'auto'
  },
  barColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '45px',
    height: '100%'
  },
  barValue: {
    marginBottom: '0.5rem',
    fontWeight: 'bold',
    color: '#4b5563',
    fontSize: '0.95rem'
  },
  barTrack: {
    flex: 1,
    width: '100%',
    backgroundColor: '#f1f5f9',
    borderRadius: '6px 6px 0 0',
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-end',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
  },
  barFill: {
    width: '100%',
    borderRadius: '6px 6px 0 0',
    position: 'relative'
  },
  barLabel: {
    marginTop: '0.8rem',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#64748b'
  },
  pieChartWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2.5rem',
    flex: 1,
    marginTop: '1rem'
  },
  pieChart: {
    width: '170px',
    height: '170px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 20px rgba(0,0,0,0.15), inset -5px -5px 15px rgba(0,0,0,0.1), inset 5px 5px 15px rgba(255,255,255,0.4)'
  },
  pieInner: {
    width: '100px',
    height: '100px',
    backgroundColor: 'white',
    borderRadius: '50%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.1)'
  },
  pieLegend: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem'
  },
  legendColor: {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  legendText: {
    fontSize: '0.9rem',
    color: '#4b5563',
    fontWeight: '500'
  }
};

export default Dashboard;
