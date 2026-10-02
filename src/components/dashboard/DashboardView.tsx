import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  DollarSign,
  Car,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { DashboardStats, EstadoOrden } from '../../types';

interface DashboardViewProps {
  onNavigateToModule: (module: any) => void;
  onSelectOrder?: (orderId: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToModule,
  onSelectOrder,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Error cargando datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const getStatusLabel = (st: EstadoOrden) => {
    switch (st) {
      case 'pendiente':
        return { text: 'En Espera', color: 'text-amber-700 bg-amber-50 border-amber-200' };
      case 'en_diagnostico':
        return { text: 'En Diagnóstico', color: 'text-sky-700 bg-sky-50 border-sky-200' };
      case 'en_reparacion':
        return { text: 'En Reparación', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
      case 'espera_repuestos':
        return { text: 'Espera Repuestos', color: 'text-purple-700 bg-purple-50 border-purple-200' };
      case 'finalizado':
        return { text: 'Finalizado', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'cancelado':
        return { text: 'Cancelado', color: 'text-rose-700 bg-rose-50 border-rose-200' };
      default:
        return { text: st, color: 'text-slate-700 bg-slate-50 border-slate-200' };
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-slate-200 rounded-xl"></div>
          <div className="h-72 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-xl flex items-center justify-between">
          <p className="text-sm">{error || 'No se pudieron recuperar las estadísticas.'}</p>
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-800 rounded-lg text-xs font-semibold hover:bg-red-200"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Cálculos para Gráfica 1: Ingresos Mensuales
  const maxMonthlyRevenue = Math.max(...stats.ingresosMensuales.map((m) => m.total), 1);

  // Cálculos para Gráfica 2: Estados de Órdenes
  const totalOrdersCount = stats.ordenesPorEstado.reduce((acc, curr) => acc + curr.total, 0) || 1;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Panel de Control de Taller</h2>
          <p className="text-xs text-slate-500 mt-1">
            Métricas de productividad, órdenes activas y estado de inventario en tiempo real.
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Actualizar Métricas</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Órdenes Activas</span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {stats.ordenesActivas}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>En proceso o diagnóstico</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Facturación del Mes</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {formatCurrency(stats.ingresosMes)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-slate-500">Servicios liquidados</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Vehículos en Taller</span>
            <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {stats.vehiculosEnTaller}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span>Bahías ocupadas actualmente</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Stock Crítico</span>
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                stats.repuestosBajoStock > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                stats.repuestosBajoStock > 0 ? 'text-red-600' : 'text-slate-900'
              }`}
            >
              {stats.repuestosBajoStock}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span>Repuestos por debajo del mínimo</span>
          </div>
        </div>
      </div>

      {/* Dynamic Charts Section (Requirement 24: Minimum 2 dynamic charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfica 1: Facturación Mensual Histórica */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Evolución de Ingresos de Taller</h3>
              <p className="text-xs text-slate-500">Ingresos brutos por órdenes de servicio finalizadas</p>
            </div>
            <button
              onClick={() => onNavigateToModule('reportes')}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              Ver reporte detallado <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-6 h-56 flex items-end gap-3 sm:gap-6 px-2">
            {stats.ingresosMensuales.map((item, idx) => {
              const heightPercent = Math.max(8, Math.round((item.total / maxMonthlyRevenue) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative">
                  {/* Tooltip on Hover */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[11px] font-mono py-1 px-2 rounded pointer-events-none whitespace-nowrap z-20 shadow-md">
                    {formatCurrency(item.total)}
                  </div>
                  {/* Value label */}
                  <span className="text-[10px] font-mono text-slate-400 mb-1.5 hidden sm:inline tabular-nums">
                    ${Math.round(item.total / 1000)}k
                  </span>
                  {/* Bar */}
                  <div className="w-full max-w-[48px] bg-slate-100 rounded-t-md h-full flex items-end overflow-hidden">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-gradient-to-t from-slate-900 to-slate-700 rounded-t-md group-hover:from-amber-600 group-hover:to-amber-500 transition-all duration-300"
                    ></div>
                  </div>
                  {/* Month name */}
                  <span className="text-xs font-medium text-slate-600 mt-2">{item.mes}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gráfica 2: Distribución de Órdenes por Estado */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Estado del Flujo Operativo</h3>
            <p className="text-xs text-slate-500">Distribución de órdenes de servicio registradas</p>
          </div>

          <div className="my-6 space-y-3">
            {stats.ordenesPorEstado.map((row) => {
              const info = getStatusLabel(row.estado);
              const percent = Math.round((row.total / totalOrdersCount) * 100);
              return (
                <div key={row.estado} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{info.text}</span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {row.total} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${percent}%` }}
                      className={`h-full rounded-full ${
                        row.estado === 'finalizado'
                          ? 'bg-emerald-500'
                          : row.estado === 'cancelado'
                          ? 'bg-rose-500'
                          : row.estado === 'en_reparacion'
                          ? 'bg-indigo-500'
                          : 'bg-amber-500'
                      }`}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total de órdenes:</span>
            <span className="font-mono font-bold text-slate-800 tabular-nums">{totalOrdersCount}</span>
          </div>
        </div>
      </div>

      {/* Two columns: Recent Orders & Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Recent Orders */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Últimas Órdenes Ingresadas</h3>
              <p className="text-xs text-slate-500">Control directo de vehículos y órdenes activas</p>
            </div>
            <button
              onClick={() => onNavigateToModule('ordenes')}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500">
                  <th className="py-2.5 px-4 font-semibold">Folio</th>
                  <th className="py-2.5 px-4 font-semibold">Vehículo</th>
                  <th className="py-2.5 px-4 font-semibold">Cliente</th>
                  <th className="py-2.5 px-4 font-semibold">Estado</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {stats.ultimasOrdenes.map((ord) => {
                  const status = getStatusLabel(ord.estado);
                  return (
                    <tr
                      key={ord.id}
                      onClick={() => onSelectOrder && onSelectOrder(ord.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">{ord.folio}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">
                          {ord.marca} {ord.modelo}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">{ord.placa}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 truncate max-w-[140px]">{ord.cliente_nombre}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded border ${status.color}`}
                        >
                          {status.text}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(ord.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Column 2: Low Stock Alerts */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Alerta de Insumos</h3>
                <p className="text-xs text-slate-500">Repuestos en nivel mínimo</p>
              </div>
              <button
                onClick={() => onNavigateToModule('inventario')}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700"
              >
                Inventario
              </button>
            </div>

            <div className="p-4 space-y-3">
              {stats.alertasStock.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  No hay repuestos con stock crítico. Inventario al día.
                </div>
              ) : (
                stats.alertasStock.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-red-100 bg-red-50/40 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-900">{item.nombre}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {item.codigo} · {item.marca}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-red-600 font-mono tabular-nums">
                        {item.stock} / {item.stock_minimo} mín
                      </div>
                      <div className="text-[10px] text-red-500 uppercase font-semibold">Bajo Stock</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100">
            <button
              onClick={() => onNavigateToModule('inventario')}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Gestionar y Reabastecer Almacén</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
