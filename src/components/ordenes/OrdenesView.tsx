import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { OrdenServicio, EstadoOrden, Usuario } from '../../types';
import { Pagination } from '../common/Pagination';
import { NuevaOrdenModal } from './NuevaOrdenModal';
import { DetalleOrdenModal } from './DetalleOrdenModal';
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  ClipboardList,
  Eye,
  CheckCircle2,
  Clock,
  ArrowUpDown,
} from 'lucide-react';

export const OrdenesView: React.FC = () => {
  const [ordenes, setOrdenes] = useState<OrdenServicio[]>([]);
  const [tecnicos, setTecnicos] = useState<Usuario[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(10);
  const [totalPaginas, setTotalPaginas] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [tecnicoFilter, setTecnicoFilter] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [sortCol, setSortCol] = useState('fecha_ingreso');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const fetchOrdenes = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.getOrdenes({
        search: search.trim(),
        estado: estadoFilter || undefined,
        tecnico_id: tecnicoFilter ? Number(tecnicoFilter) : undefined,
        fecha_inicio: fechaInicio || undefined,
        fecha_fin: fechaFin || undefined,
        page: pagina,
        limit: limite,
        sort: sortCol,
        order: sortOrder,
      });
      setOrdenes(res.datos);
      setTotal(res.total);
      setTotalPaginas(res.totalPaginas);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error cargando órdenes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdenes();
  }, [pagina, limite, estadoFilter, tecnicoFilter, fechaInicio, fechaFin, sortCol, sortOrder]);

  // Load technicians once for filter dropdown
  useEffect(() => {
    async function loadTecnicos() {
      try {
        const users = await api.getUsuarios();
        setTecnicos(users.filter((u) => u.rol === 'tecnico'));
      } catch (e) {
        console.error(e);
      }
    }
    loadTecnicos();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPagina(1);
    fetchOrdenes();
  };

  const handleSort = (column: string) => {
    if (sortCol === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortCol(column);
      setSortOrder('DESC');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const getStatusBadge = (st: EstadoOrden) => {
    switch (st) {
      case 'pendiente':
        return <span className="px-2 py-0.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded">Pendiente</span>;
      case 'en_diagnostico':
        return <span className="px-2 py-0.5 text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded">Diagnóstico</span>;
      case 'en_reparacion':
        return <span className="px-2 py-0.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded">En Reparación</span>;
      case 'espera_repuestos':
        return <span className="px-2 py-0.5 text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded">Espera Repuestos</span>;
      case 'finalizado':
        return <span className="px-2 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded">Finalizado</span>;
      case 'cancelado':
        return <span className="px-2 py-0.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded">Cancelado</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded">{st}</span>;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & New Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Órdenes de Servicio & Punto de Venta (POS)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gestión integral de ingresos a taller, refacciones, mano de obra, facturación y cobro.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrdenes}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 bg-white transition-colors"
            title="Refrescar datos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg shadow-xs text-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Orden de Servicio</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por folio, cliente, placas, modelo o motivo..."
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

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Filtrar por Estado:</label>
            <select
              value={estadoFilter}
              onChange={(e) => {
                setEstadoFilter(e.target.value);
                setPagina(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 focus:outline-none"
            >
              <option value="">Todos los Estados</option>
              <option value="pendiente">En Espera</option>
              <option value="en_diagnostico">En Diagnóstico</option>
              <option value="en_reparacion">En Reparación</option>
              <option value="espera_repuestos">En Espera de Repuestos</option>
              <option value="finalizado">Finalizados / Cobrados</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Técnico Mecánico:</label>
            <select
              value={tecnicoFilter}
              onChange={(e) => {
                setTecnicoFilter(e.target.value);
                setPagina(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 focus:outline-none"
            >
              <option value="">Cualquier Técnico</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Fecha Desde:</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => {
                setFechaInicio(e.target.value);
                setPagina(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Fecha Hasta:</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => {
                setFechaFin(e.target.value);
                setPagina(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {errorMsg && (
          <div className="p-4 bg-red-50 text-red-700 text-xs border-b border-red-200">{errorMsg}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th
                  onClick={() => handleSort('folio')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Folio</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('fecha_ingreso')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Fecha</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Vehículo & Placas</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Mecánico Asignado</th>
                <th
                  onClick={() => handleSort('estado')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Estado</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('total')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Facturado</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                    Consultando órdenes de servicio en la base de datos...
                  </td>
                </tr>
              ) : ordenes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No se encontraron órdenes con los criterios especificados.
                  </td>
                </tr>
              ) : (
                ordenes.map((ord) => (
                  <tr
                    key={ord.id}
                    onClick={() => setSelectedOrderId(ord.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{ord.folio}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {ord.fecha_ingreso ? ord.fecha_ingreso.substring(0, 16) : ''}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {ord.marca} {ord.modelo}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">{ord.placa}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 truncate max-w-[150px]">
                        {ord.cliente_nombre}
                      </div>
                      <div className="text-[11px] text-slate-400">{ord.cliente_telefono}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {ord.tecnico_nombre ? (
                        <span className="font-medium">{ord.tecnico_nombre}</span>
                      ) : (
                        <span className="text-slate-400 italic">Sin asignar</span>
                      )}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(ord.estado)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(ord.total)}
                    </td>
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedOrderId(ord.id)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded transition-colors"
                        title="Ver detalle / cobrar"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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

      {/* Modal Nueva Orden */}
      <NuevaOrdenModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSuccess={() => {
          fetchOrdenes();
        }}
      />

      {/* Modal Detalle / Cobro de Orden */}
      <DetalleOrdenModal
        ordenId={selectedOrderId}
        isOpen={selectedOrderId !== null}
        onClose={() => setSelectedOrderId(null)}
        onOrderUpdated={() => {
          fetchOrdenes();
        }}
      />
    </div>
  );
};
