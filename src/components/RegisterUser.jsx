import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, updateDoc, deleteDoc, collection, addDoc, serverTimestamp, query, onSnapshot } from 'firebase/firestore';
import { secondaryAuth, db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const RegisterUser = () => {
  const { user, userName } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('analista');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState({
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canExport: false
  });

  // Estados para CRUD de usuarios
  const [activeTab, setActiveTab] = useState('create');
  const [users, setUsers] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('analista');
  const [editPermissions, setEditPermissions] = useState({ canCreate: false, canEdit: false, canDelete: false, canExport: false });

  // Estados para el modal de confirmación de seguridad
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState(null); // { user, type: 'edit' | 'delete' }
  const [confirmationPassword, setConfirmationPassword] = useState('');
  const [confirmationError, setConfirmationError] = useState('');
  const CONFIRMATION_PASSWORD = 'Confirmacion123_';

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    });
    return () => unsubscribe();
  }, []);

  const logAuditEvent = async (action, status, details = '') => {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        user_email: user.email, 
        user_name: userName || user.email,
        action: action,
        status: status,
        details: details,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.error('Error registrando auditoría:', e);
    }
  };

  const validatePasswordPolicy = (pass) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return regex.test(pass);
  };

  const handlePermissionChange = (perm) => {
    setPermissions(prev => ({ ...prev, [perm]: !prev[perm] }));
  };

  const handleEditPermissionChange = (perm) => {
    setEditPermissions(prev => ({ ...prev, [perm]: !prev[perm] }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password || !name) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    if (!validatePasswordPolicy(password)) {
      setError('La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUser = userCredential.user;
      
      const userData = {
        email: newUser.email,
        name: name,
        role: role,
        createdAt: serverTimestamp(),
        createdBy: userName || user.email
      };

      // Si es analista, guardamos sus permisos específicos
      if (role === 'analista') {
        userData.permissions = permissions;
      }

      await setDoc(doc(db, 'users', newUser.uid), userData);

      await logAuditEvent('creacion_usuario', 'exito', `Usuario creado: ${name} (${email}) con rol: ${role}`);
      
      setSuccess(`Usuario ${name} registrado correctamente como ${role}.`);
      setName('');
      setEmail('');
      setPassword('');
      setRole('analista');
      setPermissions({ canCreate: true, canEdit: true, canDelete: false, canExport: false });
      
      await secondaryAuth.signOut();
    } catch (err) {
      await logAuditEvent('creacion_usuario', 'fallo', `Fallo al crear ${email}. Error: ${err.code}`);
      setError('Hubo un error al crear el usuario. Verifica que el correo no esté ya registrado.');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (u) => {
    setUserToEdit(u);
    setEditName(u.name || '');
    setEditRole(u.role || 'analista');
    setEditPermissions(u.permissions || { canCreate: false, canEdit: false, canDelete: false, canExport: false });
    setEditModalOpen(true);
  };

  const handleUpdateUser = async () => {
    setLoading(true);
    try {
      const updateData = { name: editName, role: editRole };
      if (editRole === 'analista') updateData.permissions = editPermissions;
      else updateData.permissions = null;
      
      await updateDoc(doc(db, 'users', userToEdit.id), updateData);
      await logAuditEvent('edicion_usuario', 'exito', `Usuario editado: ${editName} (${userToEdit.email}) a rol: ${editRole}`);
      setEditModalOpen(false);
      setUserToEdit(null);
      setSuccess(`Usuario ${editName} actualizado correctamente.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch(err) {
      console.error(err);
      setError('Error al actualizar el usuario.');
      setTimeout(() => setError(''), 4000);
    } finally { setLoading(false); }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'users', userToDelete.id));
      await logAuditEvent('eliminacion_usuario', 'exito', `Usuario eliminado: ${userToDelete.name} (${userToDelete.email})`);
      setDeleteModalOpen(false);
      const name = userToDelete.name;
      setUserToDelete(null);
      setSuccess(`Usuario ${name} revocado del sistema.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch(err) { setError('Error al eliminar usuario.'); setTimeout(() => setError(''), 4000); } 
    finally { setLoading(false); }
  };

  const handleEditRequest = (user) => {
    setActionToConfirm({ user, type: 'edit' });
    setSecurityModalOpen(true);
  };

  const handleDeleteRequest = (user) => {
    setActionToConfirm({ user, type: 'delete' });
    setSecurityModalOpen(true);
  };

  const closeSecurityModal = () => {
    setSecurityModalOpen(false);
    setConfirmationPassword('');
    setConfirmationError('');
    setActionToConfirm(null);
  };

  const handleSecurityConfirm = () => {
    if (confirmationPassword === CONFIRMATION_PASSWORD) {
      if (actionToConfirm?.type === 'edit') {
        openEditModal(actionToConfirm.user);
      } else if (actionToConfirm?.type === 'delete') {
        setUserToDelete(actionToConfirm.user);
        setDeleteModalOpen(true);
      }
      closeSecurityModal();
    } else {
      setConfirmationError('Contraseña de confirmación incorrecta.');
      setConfirmationPassword('');
    }
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          .form-input {
            padding: 0.8rem 1rem;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            font-size: 0.95rem;
            outline: none;
            transition: all 0.2s ease;
            background-color: #f8fafc;
            color: #334155;
          }
          .form-input:focus {
            border-color: #006837;
            background-color: #ffffff;
            box-shadow: 0 0 0 3px rgba(0, 104, 55, 0.1);
          }
          .submit-btn {
            margin-top: 1.5rem;
            padding: 0.9rem;
            background: linear-gradient(135deg, #008f4c 0%, #006837 100%);
            color: white;
            border: none;
            borderRadius: 8px;
            font-size: 1.05rem;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 104, 55, 0.2);
            transition: all 0.3s ease;
            letter-spacing: 0.5px;
          }
          .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 15px rgba(0, 104, 55, 0.3);
          }
          .submit-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
          }
          /* Switch Toggle CSS */
          .switch { position: relative; display: inline-block; width: 40px; height: 22px; }
          .switch input { opacity: 0; width: 0; height: 0; }
          .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .3s; border-radius: 22px; }
          .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
          input:checked + .slider { background-color: #10b981; }
          input:checked + .slider:before { transform: translateX(18px); }
          
          .permissions-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-top: 0.5rem;
          }

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
          .action-btn:hover { transform: translateY(-2px); }
          .action-btn:active { transform: translateY(0) scale(0.95); }
          .action-btn-edit { color: #006837; background-color: #e8f5e9; }
          .action-btn-edit:hover { background-color: #c8e6c9; box-shadow: 0 4px 8px rgba(0, 104, 55, 0.2); }
          .action-btn-delete { color: #c0392b; background-color: #fdedec; }
          .action-btn-delete:hover { background-color: #fadbd8; box-shadow: 0 4px 8px rgba(192, 57, 43, 0.2); }
          
          .tab-btn {
            display: inline-flex;
            align-items: center;
            background-color: transparent;
            color: #64748b;
            border: 2px solid transparent;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 700;
            transition: all 0.3s ease;
          }
          .tab-btn:hover { background-color: #f1f5f9; color: #334155; }
          .tab-btn.active { background-color: #e8f5e9; color: #006837; border-color: #006837; }
          .modern-table-row:hover { background-color: #f8fafc !important; }

          .modal-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(0, 0, 0, 0.4); backdrop-filter: blur(3px);
            display: flex; justify-content: center; align-items: center; z-index: 1000;
          }
          .modal-content {
            background-color: white; padding: 2.5rem 2rem; border-radius: 12px;
            max-width: 400px; width: 90%; text-align: center;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); animation: modalSlideIn 0.3s ease-out;
          }
          .modal-cancel-btn { padding: 0.6rem 1.5rem; background-color: #f3f4f6; color: #4b5563; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: all 0.2s; }
          .modal-cancel-btn:hover { background-color: #e5e7eb; }
          .modal-delete-btn { padding: 0.6rem 1.5rem; background-color: #e74c3c; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px rgba(231, 76, 60, 0.2); }
          .modal-delete-btn:hover { background-color: #c0392b; transform: translateY(-1px); }
          
          @keyframes modalSlideIn { from { opacity: 0; transform: translateY(-20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        `}
      </style>

      {securityModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
            <h3 style={{ color: '#d97706', fontSize: '1.5rem', margin: '0 0 0.8rem 0', fontWeight: '800' }}>Confirmación Requerida</h3>
            <p style={{ color: '#4b5563', fontSize: '1.05rem', margin: 0, lineHeight: '1.5' }}>
              Para {actionToConfirm?.type === 'edit' ? 'modificar' : 'eliminar'} al usuario <strong>{actionToConfirm?.user?.name}</strong>, por favor ingresa la contraseña de seguridad.
            </p>
            <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
              <label style={{...styles.label, color: '#4b5563'}}>Contraseña de Confirmación</label>
              <input 
                type="password"
                value={confirmationPassword}
                onChange={(e) => { setConfirmationPassword(e.target.value); setConfirmationError(''); }}
                className="form-input"
                style={{ width: '100%', boxSizing: 'border-box', borderColor: confirmationError ? '#ef4444' : '#cbd5e1' }}
                onKeyPress={(e) => e.key === 'Enter' && handleSecurityConfirm()}
                autoFocus
              />
              {confirmationError && <small style={{ color: '#ef4444', marginTop: '0.5rem', fontWeight: '600', display: 'block' }}>{confirmationError}</small>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
              <button onClick={closeSecurityModal} className="modal-cancel-btn">Cancelar</button>
              <button onClick={handleSecurityConfirm} className="submit-btn" style={{ marginTop: 0, padding: '0.6rem 1.5rem', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <h3 style={{ color: '#e74c3c', fontSize: '1.5rem', margin: '0 0 0.8rem 0', fontWeight: '800' }}>Eliminar Usuario</h3>
            <p style={{ color: '#4b5563', fontSize: '1.05rem', margin: 0, lineHeight: '1.5' }}>
              ¿Estás seguro que quieres eliminar el acceso del usuario <strong>{userToDelete?.name}</strong>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
              <button onClick={() => setDeleteModalOpen(false)} className="modal-cancel-btn">Cancelar</button>
              <button onClick={confirmDeleteUser} className="modal-delete-btn" disabled={loading}>
                {loading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', textAlign: 'left' }}>
            <h3 style={{ color: '#006837', marginTop: 0, marginBottom: '1.5rem', fontSize: '1.4rem', fontWeight: '800' }}>Modificar Usuario</h3>
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nombre Completo</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="form-input" disabled={loading} />
            </div>
            
            <div style={{...styles.inputGroup, marginTop: '1.2rem'}}>
              <label style={styles.label}>Rol en el Sistema</label>
              <select value={editRole} onChange={e => setEditRole(e.target.value)} className="form-input" disabled={loading}>
                <option value="admin">Administrador</option>
                <option value="analista">Analista</option>
              </select>
            </div>
            
            {editRole === 'analista' && (
              <div style={styles.permissionsContainer}>
                <h4 style={styles.permissionsTitle}>Permisos del Analista</h4>
                <div className="permissions-grid">
                  <label style={styles.permissionCard}>
                    <span style={styles.permissionLabel}>Crear Hallazgos</span>
                    <div className="switch"><input type="checkbox" checked={editPermissions.canCreate} onChange={() => handleEditPermissionChange('canCreate')} disabled={loading} /><span className="slider"></span></div>
                  </label>
                  <label style={styles.permissionCard}>
                    <span style={styles.permissionLabel}>Editar Hallazgos</span>
                    <div className="switch"><input type="checkbox" checked={editPermissions.canEdit} onChange={() => handleEditPermissionChange('canEdit')} disabled={loading} /><span className="slider"></span></div>
                  </label>
                  <label style={styles.permissionCard}>
                    <span style={styles.permissionLabel}>Eliminar Hallazgos</span>
                    <div className="switch"><input type="checkbox" checked={editPermissions.canDelete} onChange={() => handleEditPermissionChange('canDelete')} disabled={loading} /><span className="slider"></span></div>
                  </label>
                  <label style={styles.permissionCard}>
                    <span style={styles.permissionLabel}>Descargar Reportes</span>
                    <div className="switch"><input type="checkbox" checked={editPermissions.canExport} onChange={() => handleEditPermissionChange('canExport')} disabled={loading} /><span className="slider"></span></div>
                  </label>
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button onClick={() => setEditModalOpen(false)} className="modal-cancel-btn">Cancelar</button>
              <button onClick={handleUpdateUser} className="submit-btn" style={{ marginTop: 0, padding: '0.6rem 1.5rem' }} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: activeTab === 'manage' ? '900px' : '500px', transition: 'max-width 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')} style={{ padding: '0.8rem 1.5rem', fontSize: '0.95rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
            Crear Usuario Nuevo
          </button>
          <button className={`tab-btn ${activeTab === 'manage' ? 'active' : ''}`} onClick={() => setActiveTab('manage')} style={{ padding: '0.8rem 1.5rem', fontSize: '0.95rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            Modificar / Eliminar Usuarios
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        {activeTab === 'create' && (
          <div style={styles.card}>
            <div style={styles.header}>
              <div style={styles.iconWrapper}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#006837" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg></div>
              <h2 style={styles.title}>Registrar Nuevo Usuario</h2>
              <p style={styles.subtitle}>Panel exclusivo para Administradores</p>
            </div>
            <form onSubmit={handleRegister} style={styles.form}>
              <div style={styles.inputGroup}><label style={styles.label}>Nombre Completo</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="form-input" placeholder="Ej: Ana María García" disabled={loading}/></div>
              <div style={styles.inputGroup}><label style={styles.label}>Correo Electrónico</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" placeholder="nuevo_usuario@stthomas.edu" disabled={loading}/></div>
              <div style={styles.inputGroup}><label style={styles.label}>Contraseña</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" placeholder="••••••••" disabled={loading}/><small style={styles.helperText}>Min. 8 caracteres, 1 mayúscula, 1 número, 1 símbolo.</small></div>
              <div style={styles.inputGroup}><label style={styles.label}>Rol en el Sistema</label><select value={role} onChange={(e) => setRole(e.target.value)} className="form-input" disabled={loading}><option value="admin">Administrador</option><option value="analista">Analista</option></select></div>
              {role === 'analista' && (
                <div style={styles.permissionsContainer}>
                  <h4 style={styles.permissionsTitle}>Permisos del Analista</h4>
                  <div className="permissions-grid">
                    <label style={styles.permissionCard}><span style={styles.permissionLabel}>Crear Hallazgos</span><div className="switch"><input type="checkbox" checked={permissions.canCreate} onChange={() => handlePermissionChange('canCreate')} disabled={loading} /><span className="slider"></span></div></label>
                    <label style={styles.permissionCard}><span style={styles.permissionLabel}>Editar Hallazgos</span><div className="switch"><input type="checkbox" checked={permissions.canEdit} onChange={() => handlePermissionChange('canEdit')} disabled={loading} /><span className="slider"></span></div></label>
                    <label style={styles.permissionCard}><span style={styles.permissionLabel}>Eliminar Hallazgos</span><div className="switch"><input type="checkbox" checked={permissions.canDelete} onChange={() => handlePermissionChange('canDelete')} disabled={loading} /><span className="slider"></span></div></label>
                    <label style={styles.permissionCard}><span style={styles.permissionLabel}>Descargar Reportes</span><div className="switch"><input type="checkbox" checked={permissions.canExport} onChange={() => handlePermissionChange('canExport')} disabled={loading} /><span className="slider"></span></div></label>
                  </div>
                </div>
              )}
              <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Creando usuario...' : 'Crear Cuenta'}</button>
              <div style={{ textAlign: 'center', marginTop: '1rem' }}><a href="/dashboard" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '600' }}>← Volver al Panel de Control</a></div>
            </form>
          </div>
        )}

        {activeTab === 'manage' && (
          <div style={{ ...styles.card, maxWidth: '100%' }}>
            <div style={styles.header}>
              <div style={styles.iconWrapper}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#006837" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
              <h2 style={styles.title}>Gestión de Usuarios</h2>
              <p style={styles.subtitle}>Modifica roles, permisos o elimina accesos del sistema.</p>
            </div>
            <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr><th style={styles.th}>Nombre</th><th style={styles.th}>Correo</th><th style={styles.th}>Rol</th><th style={styles.th}>Acciones</th></tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="modern-table-row" style={{ transition: 'background-color 0.2s ease', borderBottom: '1px solid #f1f5f9' }}>
                      <td style={styles.td}><strong>{u.name || 'Sin nombre'}</strong></td>
                      <td style={styles.td}>{u.email}</td>
                      <td style={styles.td}><span style={getRoleBadgeStyle(u.role)}>{u.role?.toUpperCase()}</span></td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleEditRequest(u)} className="action-btn action-btn-edit" title="Editar Usuario"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                          <button onClick={() => handleDeleteRequest(u)} className="action-btn action-btn-delete" title="Eliminar Usuario"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No se encontraron usuarios registrados.</td></tr>}
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}><a href="/dashboard" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '600' }}>← Volver al Panel de Control</a></div>
          </div>
        )}
      </div>
    </div>
  );
};

const getRoleBadgeStyle = (role) => {
  if (role === 'admin') return { backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' };
  return { backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' };
};

const styles = {
  container: {
    padding: '4rem 2rem',
    display: 'flex',
    justifyContent: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  th: {
    padding: '1.2rem 1rem',
    borderBottom: '2px solid #e2e8f0',
    color: '#475569',
    fontWeight: '700',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    textAlign: 'left'
  },
  td: {
    padding: '1.2rem 1rem',
    color: '#334155',
    fontSize: '0.95rem',
    verticalAlign: 'middle'
  },
  card: {
    backgroundColor: 'white',
    padding: '2.5rem',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.02)',
    width: '100%',
    maxWidth: '500px',
    borderTop: '5px solid #F4B41A' // Acento amarillo
  },
  header: {
    marginBottom: '2rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  iconWrapper: {
    backgroundColor: '#ecfdf5',
    padding: '1rem',
    borderRadius: '50%',
    marginBottom: '1rem',
    border: '4px solid #d1fae5'
  },
  title: {
    color: '#0f172a',
    marginBottom: '0.25rem',
    marginTop: '0',
    fontSize: '1.5rem',
    fontWeight: '800'
  },
  subtitle: {
    color: '#64748b',
    margin: '0',
    fontSize: '0.9rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem'
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  helperText: {
    color: '#94a3b8', 
    fontSize: '0.75rem',
    marginTop: '0.3rem'
  },
  permissionsContainer: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    padding: '1.2rem',
    borderRadius: '8px',
    marginTop: '0.5rem'
  },
  permissionsTitle: {
    margin: '0 0 0.2rem 0',
    color: '#0f172a',
    fontSize: '0.95rem'
  },
  permissionsSubtitle: {
    margin: '0 0 1rem 0',
    color: '#64748b',
    fontSize: '0.8rem'
  },
  permissionCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: '0.8rem 1rem',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer'
  },
  permissionLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#334155'
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '0.8rem',
    borderRadius: '6px',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
    border: '1px solid #fca5a5'
  },
  success: {
    backgroundColor: '#d1fae5',
    color: '#047857',
    padding: '0.8rem',
    borderRadius: '6px',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
    border: '1px solid #6ee7b7'
  }
};

export default RegisterUser;
