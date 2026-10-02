import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AuditoriaLog, Usuario, RolUsuario } from '../../types';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  UserCheck,
  Plus,
  RefreshCw,
  Search,
  Filter,
  UserPlus,
  Shield,
  Key,
} from 'lucide-react';

export const AuditoriaView: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'auditoria' | 'usuarios'>('auditoria');

  // Logs
  const [logs, setLogs] = useState<AuditoriaLog[]>([]);
  const [moduloFilter, setModuloFilter] = useState('');
  const [accionFilter, setAccionFilter] = useState('');

  // Users
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  // Modal New User
  const [showUserModal, setShowUserModal] = useState(false);
  const [userData, setUserData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'tecnico' as RolUsuario,
    telefono: '',
  });

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await api.getAuditoria(60, moduloFilter || undefined);
      setLogs(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error cargando logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await api.getUsuarios();
      setUsuarios(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'auditoria') {
      fetchLogs();
    } else {
      fetchUsuarios();
    }
  }, [tab, moduloFilter, accionFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUsuario(userData);
      setShowUserModal(false);
      setUserData({
        nombre: '',
        email: '',
        password: '',
        rol: 'tecnico',
        telefono: '',
      });
      fetchUsuarios();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error registrando usuario');
    }
  };

  const getActionBadge = (accion: string) => {
    switch (accion) {
      case 'CREACION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">CREACIÓN</span>;
      case 'TRANSACCION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">TRANSACCIÓN</span>;
      case 'CAMBIO_ESTADO':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">ESTADO</span>;
      case 'ELIMINACION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">BAJA</span>;
      case 'LOGIN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">LOGIN</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{accion}</span>;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Seguridad, Personal & Auditoría</h2>
          <p className="text-xs text-slate-500 mt-1">
            Registro de operaciones críticas, control de acceso basado en roles (RBAC) y trazabilidad legal.
          </p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-slate-200/80 rounded-lg text-xs">
          <button
            onClick={() => setTab('auditoria')}
            className={`px-3 py-1.5 font-medium rounded-md transition-all ${
              tab === 'auditoria'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Logs de Auditoría
          </button>
          <button
            onClick={() => setTab('usuarios')}
            className={`px-3 py-1.5 font-medium rounded-md transition-all ${
              tab === 'usuarios'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Equipo y Usuarios
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">{errorMsg}</div>
      )}

      {tab === 'auditoria' ? (
        /* Sub-Tab 1: Auditoría */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-700">Filtrar Módulo:</span>
              <select
                value={moduloFilter}
                onChange={(e) => setModuloFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-slate-700 focus:outline-none"
              >
                <option value="">Todos los Módulos</option>
                <option value="ORDENES">Órdenes de Servicio</option>
                <option value="INVENTARIO">Inventario</option>
                <option value="CLIENTES">Clientes</option>
                <option value="VEHICULOS">Vehículos</option>
                <option value="AUTH">Autenticación</option>
              </select>
            </div>
            <button
              onClick={fetchLogs}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200"
              title="Refrescar logs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-4">Fecha y Hora</th>
                  <th className="py-2.5 px-4">Acción</th>
                  <th className="py-2.5 px-4">Módulo</th>
                  <th className="py-2.5 px-4">Operador Responsable</th>
                  <th className="py-2.5 px-4">Detalle de Operación</th>
                  <th className="py-2.5 px-4 font-mono text-[11px]">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                      Cargando historial de auditoría...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Sin eventos registrados en auditoría.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {l.fecha}
                      </td>
                      <td className="py-2.5 px-4">{getActionBadge(l.accion)}</td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-800">{l.modulo}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">{l.usuario_nombre}</td>
                      <td className="py-2.5 px-4 text-slate-600 max-w-md">{l.detalles}</td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">{l.ip || '127.0.0.1'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Sub-Tab 2: Personal y Usuarios */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Usuarios con Acceso al Sistema</h3>
              <p className="text-xs text-slate-500">Cuentas con credenciales encriptadas mediante Bcrypt</p>
            </div>
            <button
              onClick={() => setShowUserModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" /> Agregar Usuario
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-4">Nombre</th>
                  <th className="py-2.5 px-4">Correo Electrónico</th>
                  <th className="py-2.5 px-4">Rol en el Taller</th>
                  <th className="py-2.5 px-4">Teléfono</th>
                  <th className="py-2.5 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-semibold text-slate-900">{u.nombre}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="capitalize font-medium text-slate-800">
                        {u.rol === 'admin'
                          ? 'Administrador General'
                          : u.rol === 'tecnico'
                          ? 'Técnico Mecánico'
                          : 'Recepción y Caja'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{u.telefono || 'N/A'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Activo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Agregar Usuario */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="Crear Nuevo Usuario del Sistema"
        subtitle="Asignación de rol y contraseña protegida con hash Bcrypt"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs text-slate-700">
          <div>
            <label className="block font-semibold mb-1">Nombre Completo *</label>
            <input
              type="text"
              value={userData.nombre}
              onChange={(e) => setUserData({ ...userData, nombre: e.target.value })}
              required
              placeholder="Ej. Ing. Mateo Ramos"
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Correo Electrónico (Login) *</label>
            <input
              type="email"
              value={userData.email}
              onChange={(e) => setUserData({ ...userData, email: e.target.value })}
              required
              placeholder="mateo@autogestion.com"
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Contraseña *</label>
            <input
              type="password"
              value={userData.password}
              onChange={(e) => setUserData({ ...userData, password: e.target.value })}
              required
              placeholder="Mínimo 6 caracteres"
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Rol Operativo *</label>
              <select
                value={userData.rol}
                onChange={(e) => setUserData({ ...userData, rol: e.target.value as RolUsuario })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none"
              >
                <option value="tecnico">Técnico Mecánico</option>
                <option value="recepcionista">Recepción y Caja</option>
                <option value="admin">Administrador General</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Teléfono</label>
              <input
                type="text"
                value={userData.telefono}
                onChange={(e) => setUserData({ ...userData, telefono: e.target.value })}
                placeholder="55-0000-0000"
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowUserModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition-colors"
            >
              Registrar Usuario
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
