import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ReporteFinanciero, ReporteProductividad } from '../../types';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  DollarSign,
  TrendingUp,
  Wrench,
  Package,
  Users,
  CreditCard,
  RefreshCw,
} from 'lucide-react';

export const ReportesView: React.FC = () => {
  const [tab, setTab] = useState<'financiero' | 'productividad'>('financiero');

  // Dates (default to current year-to-date or last 30 days)
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const [fechaInicio, setFechaInicio] = useState(firstDay);
  const [fechaFin, setFechaFin] = useState(today);

  // Data
  const [financiero, setFinanciero] = useState<ReporteFinanciero | null>(null);
  const [productividad, setProductividad] = useState<ReporteProductividad | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchReporte = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      if (tab === 'financiero') {
        const data = await api.getReporteFinanciero({
          fecha_inicio: fechaInicio || undefined,
          fecha_fin: fechaFin || undefined,
        });
        setFinanciero(data);
      } else {
        const data = await api.getReporteProductividad({
          fecha_inicio: fechaInicio || undefined,
          fecha_fin: fechaFin || undefined,
        });
        setProductividad(data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error cargando datos del reporte');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReporte();
  }, [tab, fechaInicio, fechaFin]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  const handleExportCSV = () => {
    if (!financiero || financiero.ordenes.length === 0) return;
    const headers = ['Folio', 'Fecha', 'Cliente', 'Placa', 'Marca', 'Modelo', 'Mano de Obra', 'Repuestos', 'IVA', 'Total', 'Metodo Pago'];
    const rows = financiero.ordenes.map((o) => [
      o.folio,
      o.fecha_ingreso,
      `"${o.cliente}"`,
      o.placa,
      o.marca,
      o.modelo,
      o.mano_obra_costo,
      o.repuestos_costo,
      o.iva,
      o.total,
      o.metodo_pago,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_financiero_${fechaInicio}_${fechaFin}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Reportes de Gestión & Métricas de Taller</h2>
          <p className="text-xs text-slate-500 mt-1">
            Análisis financiero consolidado, facturación por periodo y desempeño operativo de técnicos.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg text-xs">
          <button
            onClick={() => setTab('financiero')}
            className={`px-3 py-1.5 font-medium rounded-md transition-all ${
              tab === 'financiero'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Reporte Financiero
          </button>
          <button
            onClick={() => setTab('productividad')}
            className={`px-3 py-1.5 font-medium rounded-md transition-all ${
              tab === 'productividad'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Productividad & Técnicos
          </button>
        </div>
      </div>

      {/* Date Range Picker (Requirement 25) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-amber-600" /> Rango de Fechas:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
            />
            <span className="text-slate-400">a</span>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
            />
          </div>
          <button
            onClick={fetchReporte}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Actualizar rango"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {tab === 'financiero' && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir Reporte
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 italic text-xs animate-pulse">
          Generando reporte a partir de las transacciones en base de datos...
        </div>
      ) : errorMsg ? (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">{errorMsg}</div>
      ) : tab === 'financiero' && financiero ? (
        /* TAB 1: REPORTE FINANCIERO */
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Facturación Bruta Total</span>
              <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {formatCurrency(financiero.resumen.facturacion_total)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {financiero.resumen.total_ordenes} órdenes liquidadas
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Mano de Obra Facturada</span>
              <div className="mt-2 text-2xl font-bold text-indigo-700 font-mono tabular-nums">
                {formatCurrency(financiero.resumen.total_mano_obra)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Servicios mecánicos técnicos</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Venta de Refacciones</span>
              <div className="mt-2 text-2xl font-bold text-emerald-700 font-mono tabular-nums">
                {formatCurrency(financiero.resumen.total_repuestos)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Insumos y refacciones aplicadas</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Ticket Promedio</span>
              <div className="mt-2 text-2xl font-bold text-amber-600 font-mono tabular-nums">
                {formatCurrency(financiero.resumen.ticket_promedio)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Gasto promedio por vehículo</div>
            </div>
          </div>

          {/* Desglose por Método de Pago */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Distribución por Método de Pago</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {financiero.porMetodoPago.map((m) => (
                <div key={m.metodo_pago} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                  <div className="text-[11px] uppercase font-bold text-slate-500">{m.metodo_pago.replace('_', ' ')}</div>
                  <div className="text-base font-bold text-slate-900 font-mono mt-1 tabular-nums">
                    {formatCurrency(m.monto)}
                  </div>
                  <div className="text-[10px] text-slate-400">{m.cantidad} transacciones</div>
                </div>
              ))}
            </div>
          </div>

          {/* Table of Orders */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Desglose de Órdenes Facturadas en el Periodo</h3>
                <p className="text-xs text-slate-500">Información detallada para auditoría contable y fiscal</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-800">
                {financiero.ordenes.length} registros
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-4">Folio</th>
                    <th className="py-2.5 px-4">Fecha</th>
                    <th className="py-2.5 px-4">Cliente</th>
                    <th className="py-2.5 px-4">Vehículo</th>
                    <th className="py-2.5 px-4 text-right">Mano Obra</th>
                    <th className="py-2.5 px-4 text-right">Refacciones</th>
                    <th className="py-2.5 px-4 text-right">IVA</th>
                    <th className="py-2.5 px-4 text-right font-bold">Total</th>
                    <th className="py-2.5 px-4 text-center">Método</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {financiero.ordenes.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{ord.folio}</td>
                      <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                        {ord.fecha_ingreso ? ord.fecha_ingreso.substring(0, 10) : ''}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">{ord.cliente}</td>
                      <td className="py-2.5 px-4">
                        {ord.marca} {ord.modelo} <span className="text-slate-400 font-mono">({ord.placa})</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                        {formatCurrency(ord.mano_obra_costo)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                        {formatCurrency(ord.repuestos_costo)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-400">
                        {formatCurrency(ord.iva)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatCurrency(ord.total)}
                      </td>
                      <td className="py-2.5 px-4 text-center capitalize text-[11px] text-slate-600">
                        {ord.metodo_pago.replace('_', ' ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : tab === 'productividad' && productividad ? (
        /* TAB 2: PRODUCTIVIDAD & TÉCNICOS */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Técnicos */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Rendimiento por Técnico Mecánico</h3>
              <p className="text-xs text-slate-500 mb-4">Órdenes finalizadas y monto generado en mano de obra</p>

              <div className="space-y-3">
                {productividad.rendimientoTecnicos.map((tec) => (
                  <div key={tec.tecnico_id} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 text-sm">{tec.tecnico_nombre}</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {formatCurrency(tec.facturado_mano_obra)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-500">
                      <div>
                        Totales: <strong className="text-slate-800 font-mono">{tec.ordenes_totales}</strong>
                      </div>
                      <div>
                        Finalizadas: <strong className="text-emerald-700 font-mono">{tec.ordenes_finalizadas}</strong>
                      </div>
                      <div>
                        En Proceso: <strong className="text-amber-700 font-mono">{tec.ordenes_en_proceso}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Repuestos */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Top Refacciones Más Consumidas</h3>
              <p className="text-xs text-slate-500 mb-4">Insumos de mayor rotación y recaudación</p>

              <div className="space-y-2.5">
                {productividad.topRepuestos.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{item.nombre}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {item.codigo} · {item.marca}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-900 tabular-nums">
                        {item.total_consumido} uds. consumidas
                      </div>
                      <div className="text-[11px] font-mono text-emerald-700 font-semibold">
                        {formatCurrency(item.total_facturado)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
