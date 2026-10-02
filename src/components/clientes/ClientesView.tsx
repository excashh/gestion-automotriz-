import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Cliente, TipoCliente, Vehiculo } from '../../types';
import { Pagination } from '../common/Pagination';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Car,
  Briefcase,
  AlertCircle,
  Eye,
  ArrowUpDown,
} from 'lucide-react';

export const ClientesView: React.FC = () => {
  const { isAdmin, isRecepcionista } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(10);
  const [totalPaginas, setTotalPaginas] = useState(1);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [sortCol, setSortCol] = useState('nombre');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal Create / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    documento_identidad: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: 'Ciudad de México',
    tipo_cliente: 'particular' as TipoCliente,
    notas: '',
  });

  // Modal Detail (Vehicles and Orders)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedClientDetail, setSelectedClientDetail] = useState<{
    cliente: Cliente;
    vehiculos: Vehiculo[];
    ordenes: any[];
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal Delete
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.getClientes({
        search: search.trim(),
        tipo: tipoFilter || undefined,
        page: pagina,
        limit: limite,
        sort: sortCol,
        order: sortOrder,
      });
      setClientes(res.datos);
      setTotal(res.total);
      setTotalPaginas(res.totalPaginas);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, [pagina, limite, tipoFilter, sortCol, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPagina(1);
    fetchClientes();
  };

  const handleOpenCreate = () => {
    setEditingCliente(null);
    setFormData({
      nombre: '',
      documento_identidad: '',
      email: '',
      telefono: '',
      direccion: '',
      ciudad: 'Ciudad de México',
      tipo_cliente: 'particular',
      notas: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (c: Cliente) => {
    setEditingCliente(c);
    setFormData({
      nombre: c.nombre,
      documento_identidad: c.documento_identidad,
      email: c.email,
      telefono: c.telefono,
      direccion: c.direccion || '',
      ciudad: c.ciudad || 'Ciudad de México',
      tipo_cliente: c.tipo_cliente,
      notas: c.notas || '',
    });
    setModalOpen(true);
  };

  const handleSaveCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      if (editingCliente) {
        await api.updateCliente(editingCliente.id, formData);
      } else {
        await api.createCliente(formData);
      }
      setModalOpen(false);
      fetchClientes();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error guardando cliente');
    }
  };

  const handleOpenDetail = async (id: number) => {
    try {
      setLoadingDetail(true);
      setDetailModalOpen(true);
      const res = await api.getCliente(id);
      setSelectedClientDetail(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error cargando detalle');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!clienteToDelete) return;
    try {
      setDeleting(true);
      await api.deleteCliente(clienteToDelete.id);
      setDeleteModalOpen(false);
      setClienteToDelete(null);
      fetchClientes();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al dar de baja al cliente');
      setDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortCol === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortCol(column);
      setSortOrder('ASC');
    }
  };

  const getTipoBadge = (tipo: TipoCliente) => {
    switch (tipo) {
      case 'particular':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">Particular</span>;
      case 'flotilla':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Flotilla</span>;
      case 'corporativo':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">Corporativo</span>;
      default:
        return <span>{tipo}</span>;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Directorio de Clientes & Flotillas</h2>
          <p className="text-xs text-slate-500 mt-1">
            Gestión de propietarios particulares, empresas flotilleras y convenios corporativos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchClientes}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 bg-white transition-colors"
            title="Refrescar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg shadow-xs text-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Cliente</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, RFC / identificación, correo electrónico o teléfono..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Buscar
          </button>
        </form>

        <div className="flex items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium">Filtrar por tipo:</span>
          <select
            value={tipoFilter}
            onChange={(e) => {
              setTipoFilter(e.target.value);
              setPagina(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-700 focus:outline-none"
          >
            <option value="">Todos los Clientes</option>
            <option value="particular">Particulares</option>
            <option value="flotilla">Flotillas Comerciales</option>
            <option value="corporativo">Corporativos</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {errorMsg && (
          <div className="p-4 bg-red-50 text-red-700 text-xs border-b border-red-200">{errorMsg}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th
                  onClick={() => handleSort('nombre')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Nombre / Razón Social</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('documento_identidad')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>RFC / Documento</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Contacto</th>
                <th
                  onClick={() => handleSort('tipo_cliente')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Tipo</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Vehículos</th>
                <th className="py-3 px-4 text-center">Órdenes</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                    Consultando directorio de clientes en la base de datos...
                  </td>
                </tr>
              ) : clientes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No se encontraron clientes registrados.
                  </td>
                </tr>
              ) : (
                clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{c.nombre}</div>
                      <div className="text-[11px] text-slate-400">{c.direccion || 'Sin dirección registrada'}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">{c.documento_identidad}</td>
                    <td className="py-3 px-4">
                      <div className="text-slate-900">{c.telefono}</div>
                      <div className="text-[11px] text-slate-400">{c.email}</div>
                    </td>
                    <td className="py-3 px-4">{getTipoBadge(c.tipo_cliente)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 font-mono text-[11px] font-bold bg-slate-100 text-slate-800 rounded">
                        {c.total_vehiculos || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 font-mono text-[11px] font-bold bg-slate-100 text-slate-800 rounded">
                        {c.total_ordenes || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(c.id)}
                          className="p-1 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded transition-colors"
                          title="Ver Ficha y Flotilla"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                          title="Editar Cliente"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {(isAdmin || isRecepcionista) && (
                          <button
                            onClick={() => {
                              setClienteToDelete(c);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Dar de baja"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={pagina}
          totalPages={totalPaginas}
          totalItems={total}
          pageSize={limite}
          onPageChange={setPagina}
          onPageSizeChange={(newLimit) => {
            setLimite(newLimit);
            setPagina(1);
          }}
        />
      </div>

      {/* Modal Crear / Editar */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCliente ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
        subtitle="Información fiscal, datos de contacto y clasificación"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveCliente} className="space-y-4 text-xs text-slate-700">
          <div>
            <label className="block font-semibold mb-1">Nombre Completo / Razón Social *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
              placeholder="Ej. Rodrigo Salgado Gómez"
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">RFC / Documento Identidad *</label>
              <input
                type="text"
                value={formData.documento_identidad}
                onChange={(e) => setFormData({ ...formData, documento_identidad: e.target.value.toUpperCase() })}
                required
                placeholder="Ej. SAGR850412-1A1"
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono uppercase text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Tipo de Cliente *</label>
              <select
                value={formData.tipo_cliente}
                onChange={(e) => setFormData({ ...formData, tipo_cliente: e.target.value as TipoCliente })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              >
                <option value="particular">Particular</option>
                <option value="flotilla">Flotilla Comercial</option>
                <option value="corporativo">Corporativo</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Correo Electrónico *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="cliente@ejemplo.com"
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Teléfono Móvil / Fijo *</label>
              <input
                type="text"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                required
                placeholder="Ej. 55-1234-5678"
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Dirección Fiscal / Residencia</label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                placeholder="Calle, número, colonia"
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Ciudad</label>
              <input
                type="text"
                value={formData.ciudad}
                onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                placeholder="Ciudad"
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Notas / Condiciones Especiales</label>
            <textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              rows={2}
              placeholder="Preferencias de contacto, descuentos acordados, etc."
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition-colors"
            >
              {editingCliente ? 'Guardar Cambios' : 'Registrar Cliente'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Ficha de Cliente y Flotilla */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Ficha Integral de Cliente"
        subtitle={selectedClientDetail ? selectedClientDetail.cliente.nombre : 'Detalle'}
        maxWidth="2xl"
      >
        {loadingDetail ? (
          <div className="py-8 text-center text-slate-400 italic text-xs animate-pulse">
            Consultando ficha y flotilla del cliente...
          </div>
        ) : selectedClientDetail ? (
          <div className="space-y-6 text-xs">
            {/* Info Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">
                  {selectedClientDetail.cliente.nombre}
                </span>
                {getTipoBadge(selectedClientDetail.cliente.tipo_cliente)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  RFC: <strong className="font-mono text-slate-800">{selectedClientDetail.cliente.documento_identidad}</strong>
                </div>
                <div>
                  Teléfono: <strong className="text-slate-800">{selectedClientDetail.cliente.telefono}</strong>
                </div>
                <div>
                  Correo: <strong className="text-slate-800">{selectedClientDetail.cliente.email}</strong>
                </div>
                <div>
                  Ciudad: <strong className="text-slate-800">{selectedClientDetail.cliente.ciudad}</strong>
                </div>
              </div>
              {selectedClientDetail.cliente.direccion && (
                <div className="text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                  Dirección: {selectedClientDetail.cliente.direccion}
                </div>
              )}
            </div>

            {/* Vehículos del Cliente */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-amber-600" /> Vehículos / Flotilla Registrada ({selectedClientDetail.vehiculos.length})
              </h4>
              {selectedClientDetail.vehiculos.length === 0 ? (
                <p className="text-slate-400 italic py-2 text-center">
                  Este cliente no tiene vehículos dados de alta actualmente.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedClientDetail.vehiculos.map((v) => (
                    <div key={v.id} className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <div className="font-semibold text-slate-900">
                        {v.marca} {v.modelo} ({v.anio})
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                        <span className="font-mono font-bold text-slate-800">{v.placa}</span>
                        <span className="font-mono">{v.kilometraje.toLocaleString()} km</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historial de Órdenes */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Historial de Órdenes de Servicio ({selectedClientDetail.ordenes.length})
              </h4>
              {selectedClientDetail.ordenes.length === 0 ? (
                <p className="text-slate-400 italic py-2 text-center">
                  Sin órdenes previas registradas.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selectedClientDetail.ordenes.map((ord: any) => (
                    <div key={ord.id} className="p-2 bg-slate-50 rounded border border-slate-200 flex justify-between items-center text-[11px]">
                      <div>
                        <strong className="font-mono text-slate-900">{ord.folio}</strong> · {ord.marca} {ord.modelo} ({ord.placa})
                      </div>
                      <div className="font-mono font-bold text-slate-800">
                        ${ord.total.toFixed(2)} ({ord.estado})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Dar de Baja Cliente"
        message={`¿Está seguro de que desea dar de baja al cliente "${clienteToDelete?.nombre}"? Se verificará que no tenga órdenes activas en el taller.`}
        confirmText="Confirmar Baja"
        isDestructive={true}
        isLoading={deleting}
      />
    </div>
  );
};
