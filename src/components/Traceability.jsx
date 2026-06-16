import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const formatFieldName = (key) => {
  const names = {
    identificador: 'Identificador',
    fecha: 'Fecha de Detección',
    activoAfectado: 'Activo Afectado',
    tipo: 'Tipo de Vulnerabilidad',
    severidad: 'Severidad',
    estado: 'Estado',
    descripcionTecnica: 'Descripción Técnica',
    recomendacion: 'Recomendación / Solución',
    evidencia: 'Evidencia Adicional (Texto)',
    archivosEvidencia: 'Documentos Adjuntos',
    createdAt: 'Fecha de Creación',
    updatedAt: 'Fecha de Actualización',
    createdBy: 'Creado Por',
    updatedBy: 'Actualizado Por'
  };
  return names[key] || key.charAt(0).toUpperCase() + key.slice(1);
};

const formatChangeValue = (val) => {
  if (val === undefined || val === null || val === '') return 'N/A';
  if (val instanceof Date) return val.toLocaleString();
  if (typeof val === 'object') {
    // Convertir el Timestamp de Firebase a una fecha local legible (números)
    if (typeof val.toDate === 'function') return val.toDate().toLocaleString();
    if (val.seconds !== undefined) return new Date(val.seconds * 1000).toLocaleString();
    
    // Si el valor es una lista de archivos (registros antiguos), mostrar la cantidad
    if (Array.isArray(val)) return `${val.length} documento(s)`;
  }
  return String(val);
};

const Traceability = () => {
  const [events, setEvents] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [recoverModalOpen, setRecoverModalOpen] = useState(false);
  const [vulnToRecover, setVulnToRecover] = useState(null);
  const [notificationModal, setNotificationModal] = useState({ open: false, message: '', type: 'success' });
  const { role, user, userName, permissions } = useAuth(); // Para verificar si es admin
  const [activeTab, setActiveTab] = useState('Todos');
  const [unauthModalOpen, setUnauthModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Escuchar Historial de Ediciones
    const qHistory = query(collection(db, 'vulnerability_history'), orderBy('timestamp', 'desc'));
    const unsubHistory = onSnapshot(qHistory, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({ id: doc.id, type: 'history', ...doc.data() }));
      
      // Escuchar Logs de Auditoría
      const qAudit = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
      const unsubAudit = onSnapshot(qAudit, (auditSnap) => {
        const auditData = auditSnap.docs.map(doc => ({ id: doc.id, type: 'audit', ...doc.data() }));
        
        // Combinar, filtrar eventos repetidos y ordenar
        // Excluimos las creaciones/ediciones de audit_logs porque ya están detalladas en history
        const filteredAudit = auditData.filter(a => !['edicion_hallazgo', 'creacion_hallazgo'].includes(a.action));
        
        const combined = [...historyData, ...filteredAudit].sort((a, b) => {
          const timeA = a.timestamp?.toMillis() || 0;
          const timeB = b.timestamp?.toMillis() || 0;
          return timeB - timeA;
        });

        setEvents(combined);
      });
      
      return () => unsubAudit();
    });

    return () => {
      unsubHistory();
    };
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleString();
  };

  const hasPermission = (perm) => role === 'admin' || (permissions && permissions[perm]);

  const handleProtectedDownload = (file) => {
    if (hasPermission('canExport')) {
      const link = document.createElement('a');
      link.href = file.dataUrl;
      link.download = file.name;
      link.click();
    } else {
      setUnauthModalOpen(true);
    }
  };

  const handleRecoverClick = (item) => {
    setVulnToRecover(item);
    setRecoverModalOpen(true);
  };

  const confirmRecover = async () => {
    if (!vulnToRecover) return;
    const { deletedData, id: auditLogId } = vulnToRecover;
    setRecoverModalOpen(false);
    setVulnToRecover(null);

    try {
      // 1. Restaurar el hallazgo
      await setDoc(doc(db, 'vulnerabilities', deletedData.id), deletedData);
      
      try {
        // 2. Marcar el log de eliminación como recuperado para quitar el botón
        await updateDoc(doc(db, 'audit_logs', auditLogId), { recovered: true });

        // 3. Registrar el evento en el control de cambios
        await addDoc(collection(db, 'audit_logs'), {
          user_email: user.email,
          user_name: userName || user.email,
          action: 'recuperacion_hallazgo',
          details: `Recuperó el hallazgo ${deletedData.identificador}`,
          identificador: deletedData.identificador,
          timestamp: serverTimestamp()
        });
      } catch (logError) {
        console.warn('El hallazgo se recuperó, pero Firebase bloqueó la actualización de la auditoría. Revisa tus Reglas de Seguridad.', logError);
      }
      
      setNotificationModal({ open: true, message: 'Hallazgo recuperado correctamente.', type: 'success' });
    } catch (error) {
      console.error('Error al recuperar:', error);
      setNotificationModal({ open: true, message: 'Error al intentar recuperar el hallazgo.', type: 'error' });
    }
  };

  const renderHistoryChanges = (changes) => {
    if (!changes) return <span style={{ color: '#7f8c8d' }}>Sin detalles</span>;
    return (
      <div style={styles.changesGrid}>
        {Object.keys(changes).map(key => {
          return (
            <div key={key} style={styles.changeCard}>
              <div style={styles.changeField}>{formatFieldName(key)}</div>
              <div style={styles.changeValues}>
                <div style={styles.oldValueBox}>
                  <span style={styles.changeLabel}>Antes</span>
                  <span style={styles.oldText}>{formatChangeValue(changes[key].from)}</span>
                </div>
                <div style={styles.changeIcon}>➔</div>
                <div style={styles.newValueBox}>
                  <span style={styles.changeLabel}>Después</span>
                  <span style={styles.newText}>{formatChangeValue(changes[key].to)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    );
  };

  const renderRecoverableDocuments = (archivos) => {
    // Prevenir el error que hace que el programa "explote" comprobando que sea una lista real
    if (!archivos || !Array.isArray(archivos) || archivos.length === 0) return null;
    return (
      <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#166534', fontSize: '0.9rem' }}>Documentos Adjuntos (Recuperables)</h4>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {archivos.map((file, idx) => (
            <button 
              key={idx} 
              onClick={() => handleProtectedDownload(file)} 
              style={{ ...styles.downloadDocBtn, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ⬇ Descargar {file.name}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const getActionName = (item) => {
    if (item.type === 'history') return item.action.toUpperCase();
    return item.action.replace(/_/g, ' ').toUpperCase();
  };

  const getIdentifier = (item) => {
    if (item.type === 'history') {
      // 1. Usar el identificador explícito si existe y es válido (formato nuevo)
      if (item.identificador && item.identificador !== 'Desconocido') {
        return item.identificador;
      }
      if (item.identificador) return item.identificador;
      // 2. Si es una creación antigua, intentar leer de sus datos internos
      if (item.action === 'creacion' && item.changes?.identificador) {
        return item.changes.identificador;
      }
      // 3. Si es una edición antigua donde se modificó el identificador, tomar el valor nuevo
      if (item.action === 'edicion' && item.changes?.identificador?.to) {
        return item.changes.identificador.to;
      }
      // 4. Último recurso: ID de la base de datos
      return item.vulnerabilityId;
    }
    if (item.deletedData) return item.deletedData.identificador;
    if (item.details && item.details.includes('hallazgo ')) {
      return item.details.split('hallazgo ')[1];
    }
    return '-';
  };

  const getEventCategory = (action) => {
    if (!action) return 'Otros';
    if (action.includes('sesion') || action.includes('usuario') || action.includes('perfil')) return 'Usuarios & Accesos';
    if (action.includes('eliminacion') || action.includes('recuperacion')) return 'Eliminados & Recuperados';
    if (action.includes('creacion') || action.includes('edicion')) return 'Vulnerabilidades';
    return 'Otros';
  };

  // Filtramos los eventos para que los analistas no vean nada de la gestión de usuarios
  const visibleEvents = events.filter(item => {
    if (role !== 'admin' && getEventCategory(item.action) === 'Usuarios & Accesos') {
      return false;
    }
    return true;
  });

  const tabs = ['Todos', 'Vulnerabilidades', 'Eliminados & Recuperados'];
  if (role === 'admin') {
    tabs.push('Usuarios & Accesos');
  }
  
  if (visibleEvents.some(item => getEventCategory(item.action) === 'Otros') && !tabs.includes('Otros')) {
    tabs.push('Otros');
  }

  const getTabCount = (tabName) => {
    if (tabName === 'Todos') return visibleEvents.length;
    return visibleEvents.filter(item => getEventCategory(item.action) === tabName).length;
  };

  const filteredEvents = visibleEvents.filter(item => {
    // Filtro por pestaña
    if (activeTab !== 'Todos' && getEventCategory(item.action) !== activeTab) {
      return false;
    }
    
    // Filtro por identificador de hallazgo
    if (searchTerm) {
      const identifier = getIdentifier(item).toLowerCase();
      if (!identifier.includes(searchTerm.toLowerCase())) return false;
    }
    
    return true;
  });

  const tabIcons = {
    'Todos': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
    'Vulnerabilidades': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M16 13H8"></path><path d="M16 17H8"></path><path d="M10 9H8"></path></svg>,
    'Eliminados & Recuperados': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
    'Usuarios & Accesos': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
    'Otros': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          /* Estilos para los botones del Modal de Recuperación */
          .modal-cancel-btn {
            padding: 0.6rem 1.5rem; background-color: #f3f4f6; color: #4b5563; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: all 0.2s;
          }
          .modal-cancel-btn:hover { background-color: #e5e7eb; }
          
          .modal-recover-btn {
            padding: 0.6rem 1.5rem; background-color: #10b981; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);
          }
          .modal-recover-btn:hover { background-color: #059669; transform: translateY(-1px); }
          
          @keyframes modalSlideIn {
            from { opacity: 0; transform: translateY(-20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }

          /* Tabs CSS */
          .tabs-wrapper {
            background-color: #f8fafc;
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
          }
          .tabs-container {
            display: flex;
            gap: 0.8rem;
            overflow-x: auto;
            scrollbar-width: none;
          }
          .tabs-container::-webkit-scrollbar { display: none; }
          .tab-btn {
            padding: 0.6rem 1.2rem;
            background-color: white;
            color: #475569;
            border: 1px solid #cbd5e1;
            border-radius: 30px;
            font-size: 0.85rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .tab-btn:hover {
            background-color: #f1f5f9;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          .tab-btn.active {
            background-color: #006837;
            color: white;
            border-color: #006837;
            box-shadow: 0 4px 12px rgba(0, 104, 55, 0.25);
          }
          .tab-badge {
            background-color: #e2e8f0;
            color: #334155;
            padding: 0.15rem 0.6rem;
            border-radius: 20px;
            font-size: 0.7rem;
            font-weight: 800;
            transition: all 0.3s ease;
          }
          .tab-badge.active-badge {
            background-color: rgba(255,255,255,0.2);
            color: white;
          }

          /* Buscador CSS */
          .search-container {
            position: relative;
            display: flex;
            align-items: center;
          }
          .search-input {
            padding: 0.6rem 1rem 0.6rem 2.2rem;
            border-radius: 20px;
            border: 1px solid #cbd5e1;
            font-size: 0.85rem;
            outline: none;
            transition: all 0.2s ease;
            width: 240px;
          }
          .search-input:focus {
            border-color: #006837;
            box-shadow: 0 0 0 3px rgba(0, 104, 55, 0.1);
          }
          .search-icon {
            position: absolute;
            left: 0.7rem;
            color: #94a3b8;
            pointer-events: none;
          }
        `}
      </style>

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
            <h3 style={{...styles.modalTitle, color: '#e74c3c'}}>Acceso Denegado</h3>
            <p style={styles.modalText}>
              No tienes permisos suficientes para realizar esta acción. <br/><br/>
              Comunícate con el administrador del sistema.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button onClick={() => setUnauthModalOpen(false)} style={{ padding: '0.6rem 1.5rem', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(231, 76, 60, 0.2)' }}>Entendido</button>
            </div>
          </div>
        </div>
      )}

      {recoverModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <polyline points="3 3 3 8 8 8"></polyline>
              </svg>
            </div>
            <h3 style={styles.modalTitle}>Recuperación</h3>
            <p style={styles.modalText}>
              ¿Estás seguro que quieres recuperar el hallazgo <strong>{vulnToRecover?.deletedData?.identificador}</strong>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
              <button onClick={() => setRecoverModalOpen(false)} className="modal-cancel-btn">Cancelar</button>
              <button onClick={confirmRecover} className="modal-recover-btn">Recuperar</button>
            </div>
          </div>
        </div>
      )}

      {notificationModal.open && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
              {notificationModal.type === 'success' ? (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              ) : (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              )}
            </div>
            <h3 style={{...styles.modalTitle, color: notificationModal.type === 'success' ? '#10b981' : '#e74c3c'}}>
              {notificationModal.type === 'success' ? '¡Éxito!' : 'Error'}
            </h3>
            <p style={styles.modalText}>{notificationModal.message}</p>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button 
                onClick={() => setNotificationModal({ open: false, message: '', type: 'success' })} 
                className="modal-recover-btn"
                style={notificationModal.type === 'error' ? { backgroundColor: '#e74c3c', boxShadow: '0 4px 6px rgba(231, 76, 60, 0.2)' } : {}}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.header}>
        <h2 style={styles.title}>Trazabilidad</h2>
        <p style={styles.subtitle}>Seguimiento y registro del control de cambios en el sistema, modificaciones y filtros</p>
      </div>

      <div style={styles.card}>
        <div className="tabs-wrapper">
          <div className="tabs-container">
            {tabs.map(tab => (
              <button 
                key={tab} 
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tabIcons[tab]}
                {tab}
                <span className={`tab-badge ${activeTab === tab ? 'active-badge' : ''}`}>
                  {getTabCount(tab)}
                </span>
              </button>
            ))}
          </div>
          <div className="search-container">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              placeholder="Buscar por identificador..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        <div style={{overflowX: 'auto'}}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHead}>
                <th style={styles.th}>Fecha y Hora</th>
                <th style={styles.th}>Usuario</th>
                <th style={styles.th}>Evento</th>
                <th style={styles.th}>Identificador</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map(item => (
                <React.Fragment key={item.id}>
                  <tr style={styles.tableRow}>
                    <td style={styles.td}>{formatDate(item.timestamp)}</td>
                    <td style={styles.td}><strong>{item.user_name || item.user_email}</strong></td>
                    <td style={styles.td}>
                      <span style={getUnifiedActionBadge(item.action, item.type)}>{getActionName(item)}</span>
                    </td>
                    <td style={styles.td}>{getIdentifier(item)}</td>
                    <td style={styles.td}>
                      {item.type === 'audit' && item.action === 'eliminacion_hallazgo' && role === 'admin' ? (
                        item.recovered ? (
                          <span style={styles.recoveredBadge}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Recuperado
                          </span>
                        ) : (
                          <button 
                            style={{ ...styles.recoverBtn, padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            onClick={() => handleRecoverClick(item)}
                          >
                            ↺ Recuperar Hallazgo
                          </button>
                        )
                      ) : item.type === 'history' && item.action === 'edicion' ? (
                        <button 
                          style={styles.expandBtn}
                          onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        >
                          {expandedId === item.id ? 'Ocultar Detalles' : 'Ver Detalles'}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                  
                  {expandedId === item.id && (
                    <tr>
                      <td colSpan="5" style={styles.expandedPane}>
                        
                        {/* Detalles para ediciones */}
                        {item.type === 'history' && item.action === 'edicion' && (
                          <div>
                            <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '1.2rem' }}>📝</span> Detalle de Cambios Realizados
                            </h4>
                            {renderHistoryChanges(item.changes)}
                            
                            {/* Mostrar documentos anteriores si cambiaron (por si borró alguno al editar) */}
                            {item.changes?.archivosEvidencia && item.changes.archivosEvidencia.from && Array.isArray(item.changes.archivosEvidencia.from) && (
                              <div style={{ marginTop: '1rem' }}>
                                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>* Se detectaron cambios en los documentos adjuntos. Documentos anteriores:</p>
                                {renderRecoverableDocuments(item.changes.archivosEvidencia.from)}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Otros eventos (Logins, Creaciones, etc) */}
                        {(item.type === 'audit' && item.action !== 'eliminacion_hallazgo') && (
                          <div style={{ color: '#555' }}>
                            <strong>Detalles:</strong> {item.details || 'Sin detalles extra.'}
                          </div>
                        )}
                        
                        {(item.type === 'history' && item.action === 'creacion') && (
                          <div style={{ color: '#065f46' }}>
                            Creación inicial del hallazgo.
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              
              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan="5" style={styles.empty}>No hay registros en esta categoría.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const getUnifiedActionBadge = (action, type) => {
  const base = { padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-block' };
  
  if (action === 'creacion' || action.includes('creacion')) return { ...base, backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #34d399' };
  if (action === 'edicion' || action.includes('edicion')) return { ...base, backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fbbf24' };
  if (action.includes('perfil')) return { ...base, backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd' };
  if (action.includes('recuperacion')) return { ...base, backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #6ee7b7' };
  if (action.includes('eliminacion')) return { ...base, backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f87171' };
  if (action.includes('inicio_sesion')) return { ...base, backgroundColor: '#e0e7ff', color: '#1e40af', border: '1px solid #93c5fd' };
  
  return { ...base, backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #9ca3af' };
};

const styles = {
  container: { padding: '2.5rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' },
  header: { marginBottom: '1.5rem' },
  title: { color: '#006837', margin: 0, fontSize: '1.8rem' },
  subtitle: { color: '#666', margin: '0.2rem 0 0 0', fontSize: '1rem' },
  card: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
  th: { padding: '1.2rem 1rem', color: '#334155', textAlign: 'left', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' },
  td: { padding: '1.2rem 1rem', borderBottom: '1px solid #f1f5f9', color: '#475569', verticalAlign: 'middle', fontSize: '0.95rem' },
  tableRow: { transition: 'all 0.2s ease', ':hover': { backgroundColor: '#f8fafc' } },
  changesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginTop: '0.5rem' },
  changeCard: { backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  changeField: { fontWeight: '700', color: '#1e293b', marginBottom: '0.8rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' },
  changeValues: { display: 'flex', alignItems: 'stretch', gap: '0.5rem', justifyContent: 'space-between' },
  oldValueBox: { flex: 1, backgroundColor: '#fef2f2', padding: '0.75rem', borderRadius: '6px', border: '1px solid #fee2e2', display: 'flex', flexDirection: 'column' },
  newValueBox: { flex: 1, backgroundColor: '#f0fdf4', padding: '0.75rem', borderRadius: '6px', border: '1px solid #dcfce3', display: 'flex', flexDirection: 'column' },
  changeLabel: { display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold', marginBottom: '0.4rem', textTransform: 'uppercase' },
  oldText: { color: '#991b1b', fontSize: '0.85rem', wordBreak: 'break-word', textDecoration: 'line-through' },
  newText: { color: '#166534', fontSize: '0.85rem', wordBreak: 'break-word', fontWeight: '500' },
  changeIcon: { color: '#94a3b8', fontSize: '1.2rem', display: 'flex', alignItems: 'center', padding: '0 0.2rem' },
  expandedPane: { padding: '1.5rem 2rem', borderBottom: '1px solid #eee', backgroundColor: '#f8fafc', boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.02)' },
  empty: { textAlign: 'center', padding: '4rem', color: '#94a3b8', fontSize: '1.1rem' },
  expandBtn: { backgroundColor: 'transparent', border: '1px solid #cbd5e1', color: '#475569', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', transition: 'all 0.2s', ':hover': { backgroundColor: '#f1f5f9' } },
  recoveredBadge: { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#f0fdf4', color: '#15803d', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '700', border: '1px solid #bbf7d0' },
  recoverBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)', transition: 'transform 0.1s', ':active': { transform: 'scale(0.98)' } },
  downloadDocBtn: { display: 'inline-flex', alignItems: 'center', backgroundColor: 'white', color: '#166534', border: '1px solid #86efac', padding: '0.5rem 1rem', borderRadius: '6px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '600', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'background-color 0.2s', ':hover': { backgroundColor: '#f0fdf4' } },
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
    color: '#10b981', fontSize: '1.5rem', margin: '0 0 0.8rem 0', fontWeight: '800'
  },
  modalText: {
    color: '#4b5563', fontSize: '1.05rem', margin: 0, lineHeight: '1.5'
  }
};

export default Traceability;