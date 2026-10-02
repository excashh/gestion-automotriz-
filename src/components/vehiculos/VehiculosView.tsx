import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Vehiculo, Cliente, TipoCombustible, TipoTransmision } from '../../types';
import { Pagination } from '../common/Pagination';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import {
  Car,
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  History,
  AlertCircle,
  Wrench,
  CheckCircle2,
  ArrowUpDown,
} from 'lucide-react';

export const VehiculosView: React.FC = () => {
  const { isAdmin, isRecepcionista } = useAuth();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(10);
  const [totalPaginas, setTotalPaginas] = useState(1);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [marcaFilter, setMarcaFilter] = useState('');
  const [sortCol, setSortCol] = useState('marca');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal Create / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehiculo, setEditingVehiculo] = useState<Vehiculo | null>(null);
  const [formData, setFormData] = useState({
    cliente_id: '',
    vin: '',
    placa: '',
    marca: '',
    modelo: '',
    anio: new Date().getFullYear(),
    kilometraje: 0,
    color: '',
    combustible: 'Gasolina' as TipoCombustible,
    transmision: 'Automática' as TipoTransmision,
    notas: '',
  });

  // Modal History
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedVehicleHistory, setSelectedVehicleHistory] = useState<{
    vehiculo: Vehiculo;
    historialOrdenes: any[];
  } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal Delete
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [vehiculoToDelete, setVehiculoToDelete] = useState<Vehiculo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchVehiculos = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.getVehiculos({
        search: search.trim(),
        marca: marcaFilter || undefined,
        page: pagina,
        limit: limite,
        sort: sortCol,
        order: sortOrder,
      });
      setVehiculos(res.datos);
      setTotal(res.total);
      setTotalPaginas(res.totalPaginas);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar vehículos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehiculos();
  }, [pagina, limite, marcaFilter, sortCol, sortOrder]);

  useEffect(() => {
    async function loadClientes() {
      try {
        const res = await api.getClientes({ limit: 100 });
        setClientes(res.datos);
      } catch (e) {
        console.error(e);
      }
    }
    loadClientes();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPagina(1);
    fetchVehiculos();
  };

  const handleOpenCreate = () => {
    setEditingVehiculo(null);
    setFormData({
      cliente_id: clientes.length > 0 ? String(clientes[0].id) : '',
      vin: '',
      placa: '',
      marca: '',
      modelo: '',
      anio: new Date().getFullYear(),
      kilometraje: 0,
      color: 'Gris Plata',
      combustible: 'Gasolina',
      transmision: 'Automática',
      notas: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (v: Vehiculo) => {
    setEditingVehiculo(v);
    setFormData({
      cliente_id: String(v.cliente_id),
      vin: v.vin,
      placa: v.placa,
      marca: v.marca,
      modelo: v.modelo,
      anio: v.anio,
      kilometraje: v.kilometraje,
      color: v.color || '',
      combustible: v.combustible,
      transmision: v.transmision,
      notas: v.notas || '',
    });
    setModalOpen(true);
  };

  const handleSaveVehiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      const payload = {
        ...formData,
        cliente_id: Number(formData.cliente_id),
      };
      if (editingVehiculo) {
        await api.updateVehiculo(editingVehiculo.id, payload);
      } else {
        await api.createVehiculo(payload);
      }
      setModalOpen(false);
      fetchVehiculos();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error guardando vehículo');
    }
  };

  const handleOpenHistory = async (id: number) => {
    try {
      setLoadingHistory(true);
      setHistoryModalOpen(true);
      const res = await api.getVehiculo(id);
      setSelectedVehicleHistory(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error cargando historial');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!vehiculoToDelete) return;
    try {
      setDeleting(true);
      await api.deleteVehiculo(vehiculoToDelete.id);
      setDeleteModalOpen(false);
      setVehiculoToDelete(null);
      fetchVehiculos();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error eliminando vehículo');
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

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Registro y Catálogo de Vehículos</h2>
          <p className="text-xs text-slate-500 mt-1">
            Control de unidades, VINs, odómetros, inspecciones y libro de mantenimiento por placas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchVehiculos}
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
            <span>Registrar Vehículo</span>
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
              placeholder="Buscar por placa, VIN, marca, modelo o nombre del propietario..."
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
          <span className="text-slate-500 font-medium">Filtrar por marca:</span>
          <select
            value={marcaFilter}
            onChange={(e) => {
              setMarcaFilter(e.target.value);
              setPagina(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-700 focus:outline-none"
          >
            <option value="">Todas las Marcas</option>
            <option value="Volkswagen">Volkswagen</option>
            <option value="Toyota">Toyota</option>
            <option value="Ford">Ford</option>
            <option value="Nissan">Nissan</option>
            <option value="Honda">Honda</option>
            <option value="Audi">Audi</option>
            <option value="BMW">BMW</option>
            <option value="Chevrolet">Chevrolet</option>
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
                  onClick={() => handleSort('placa')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Placa</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('marca')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Vehículo</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">VIN / Serie</th>
                <th
                  onClick={() => handleSort('kilometraje')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Odómetro</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Propietario / Cliente</th>
                <th className="py-3 px-4 text-center">Servicios</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                    Cargando vehículos desde la base de datos...
                  </td>
                </tr>
              ) : vehiculos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Car className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No se encontraron vehículos registrados.
                  </td>
                </tr>
              ) : (
                vehiculos.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 bg-slate-50/50">
                      {v.placa}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {v.marca} {v.modelo}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {v.anio} · {v.color} · {v.combustible} ({v.transmision})
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{v.vin}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900 tabular-nums">
                      {v.kilometraje.toLocaleString()} km
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{v.cliente_nombre}</div>
                      <div className="text-[11px] text-slate-400">{v.cliente_telefono}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 font-mono text-[11px] font-bold bg-slate-100 text-slate-700 rounded">
                        {v.total_servicios || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenHistory(v.id)}
                          className="p-1 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded transition-colors"
                          title="Ver Libro de Mantenimiento"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(v)}
                          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                          title="Editar Vehículo"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {(isAdmin || isRecepcionista) && (
                          <button
                            onClick={() => {
                              setVehiculoToDelete(v);
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
        title={editingVehiculo ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}
        subtitle="Verificación de placas, número de serie (VIN) y datos técnicos"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveVehiculo} className="space-y-4 text-xs text-slate-700">
          <div>
            <label className="block font-semibold mb-1">Propietario / Cliente *</label>
            <select
              value={formData.cliente_id}
              onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
              required
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="">-- Seleccione Cliente --</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.documento_identidad})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Placas *</label>
              <input
                type="text"
                value={formData.placa}
                onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                required
                placeholder="Ej. NLX-78-45"
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono uppercase text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Número de Serie (VIN) *</label>
              <input
                type="text"
                value={formData.vin}
                onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                required
                placeholder="17 caracteres alfanuméricos"
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono uppercase text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">Marca *</label>
              <input
                type="text"
                value={formData.marca}
                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                required
                placeholder="Ej. Toyota"
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Modelo *</label>
              <input
                type="text"
                value={formData.modelo}
                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                required
                placeholder="Ej. Corolla LE"
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Año *</label>
              <input
                type="number"
                min="1970"
                max="2030"
                value={formData.anio}
                onChange={(e) => setFormData({ ...formData, anio: Number(e.target.value) })}
                required
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">Kilometraje *</label>
              <input
                type="number"
                min={editingVehiculo ? editingVehiculo.kilometraje : 0}
                value={formData.kilometraje}
                onChange={(e) => setFormData({ ...formData, kilometraje: Number(e.target.value) })}
                required
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Combustible</label>
              <select
                value={formData.combustible}
                onChange={(e) => setFormData({ ...formData, combustible: e.target.value as TipoCombustible })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none"
              >
                <option value="Gasolina">Gasolina</option>
                <option value="Diésel">Diésel</option>
                <option value="Híbrido">Híbrido</option>
                <option value="Eléctrico">Eléctrico</option>
                <option value="Gas">Gas</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Transmisión</label>
              <select
                value={formData.transmision}
                onChange={(e) => setFormData({ ...formData, transmision: e.target.value as TipoTransmision })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none"
              >
                <option value="Automática">Automática</option>
                <option value="Manual">Manual</option>
                <option value="CVT">CVT</option>
                <option value="Doble Embrague">Doble Embrague</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Color de Carrocería</label>
            <input
              type="text"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              placeholder="Ej. Blanco Perla"
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Notas / Particularidades Mecánicas</label>
            <textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              rows={2}
              placeholder="Observaciones como aceite específico, modificaciones OEM..."
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
              {editingVehiculo ? 'Guardar Cambios' : 'Registrar Vehículo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Historial / Libro de Mantenimiento */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title="Libro de Mantenimiento Vehicular"
        subtitle={
          selectedVehicleHistory
            ? `${selectedVehicleHistory.vehiculo.marca} ${selectedVehicleHistory.vehiculo.modelo} · Placa ${selectedVehicleHistory.vehiculo.placa}`
            : 'Historial de Servicios'
        }
        maxWidth="2xl"
      >
        {loadingHistory ? (
          <div className="py-8 text-center text-slate-400 italic text-xs animate-pulse">
            Consultando historial de servicios previos...
          </div>
        ) : selectedVehicleHistory ? (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
              <div>
                <span className="font-semibold text-slate-900">
                  {selectedVehicleHistory.vehiculo.marca} {selectedVehicleHistory.vehiculo.modelo} (
                  {selectedVehicleHistory.vehiculo.anio})
                </span>
                <span className="text-slate-400 ml-2 font-mono">VIN: {selectedVehicleHistory.vehiculo.vin}</span>
              </div>
              <div className="font-mono font-bold text-slate-800">
                {selectedVehicleHistory.vehiculo.kilometraje.toLocaleString()} km
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Historial de Órdenes Realizadas ({selectedVehicleHistory.historialOrdenes.length})
              </h4>
              {selectedVehicleHistory.historialOrdenes.length === 0 ? (
                <p className="text-slate-400 italic py-4 text-center">
                  Este vehículo aún no cuenta con mantenimientos previos registrados.
                </p>
              ) : (
                selectedVehicleHistory.historialOrdenes.map((ord) => (
                  <div key={ord.id} className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">{ord.folio}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{ord.fecha_ingreso}</span>
                    </div>
                    <p className="text-slate-700">
                      <strong>Motivo:</strong> {ord.motivo_ingreso}
                    </p>
                    {ord.diagnostico && (
                      <p className="text-slate-600 text-[11px]">
                        <strong>Diagnóstico:</strong> {ord.diagnostico}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-500">Mecánico: {ord.tecnico_nombre || 'N/A'}</span>
                      <span className="font-mono font-bold text-slate-900">
                        ${ord.total.toFixed(2)} ({ord.estado})
                      </span>
                    </div>
                  </div>
                ))
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
        title="Dar de Baja Vehículo"
        message={`¿Está seguro de que desea dar de baja el vehículo con placa "${vehiculoToDelete?.placa}"? Esta acción aplicará una baja lógica sin borrar los registros históricos.`}
        confirmText="Confirmar Baja"
        isDestructive={true}
        isLoading={deleting}
      />
    </div>
  );
};
