import React, { useId, useState } from 'react';
import {
  Wrench,
  Cpu,
  Zap,
  Wind,
  Disc,
  ShieldCheck,
  Clock,
  CheckCircle,
  Plus,
  Search,
  RefreshCw,
  Phone,
  Edit3,
  LayoutGrid,
  Table2,
  X,
  ArrowRight,
  PauseCircle,
  Layers,
} from 'lucide-react';

const getEspecialidadIcon = (tipo, especialidad = '') => {
  if (tipo === 'general') return ShieldCheck;
  const esp = especialidad.toLowerCase();
  if (esp.includes('electrónica') || esp.includes('computadora') || esp.includes('diagnóstico')) {
    return Cpu;
  }
  if (esp.includes('eléctric') || esp.includes('híbrid')) {
    return Zap;
  }
  if (esp.includes('clima') || esp.includes('a/c') || esp.includes('aire')) {
    return Wind;
  }
  if (esp.includes('freno') || esp.includes('suspensión')) {
    return Disc;
  }
  return Wrench;
};

export const getDisponibilidadBadge = (estatus, ordenesPendientes = 0) => {
  if (estatus === 'descanso') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
        <PauseCircle className="w-3.5 h-3.5 text-slate-500" />
        No disponible (Descanso)
      </span>
    );
  }
  if (estatus === 'ocupado' || ordenesPendientes > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        Ocupado en bahía
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
      Disponible
    </span>
  );
};

export function VistaMecanicos({
  mecanicosData,
  loading = false,
  filtroRapido,
  onChangeFiltroRapido,
  busqueda,
  onChangeBusqueda,
  canEditOperacion,
  canCambiarDisponibilidad,
  cambiandoId = null,
  onRefresh,
  onAbrirNuevoMecanico,
  onEditarMecanico,
  onCambiarDisponibilidad,
  onAsignarNuevaOrden,
  onVerOrden,
  onFiltrarOrdenesPorMecanico,
}) {
  const [modoVista, setModoVista] = useState('tarjetas'); // 'tarjetas' | 'tabla'
  const captionId = useId();

  const resumen = mecanicosData?.resumen || {
    totalMecanicos: 0,
    generales: 0,
    especializados: 0,
    disponibles: 0,
    ocupados: 0,
    enDescanso: 0,
    conOrdenesPendientes: 0,
    totalOrdenesPendientes: 0,
    totalOrdenesCompletadas: 0,
    totalOrdenesEntregadas: 0,
  };
  const lista = mecanicosData?.datos || [];

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Equipo de Mecánicos y Especialidades
          </h1>
          <p className="text-sm text-slate-500">
            1. Mecánicos Generales (aptos para cualquier tarea) • 2. Especializados por rama automotriz, órdenes pendientes, entregadas y disponibilidad
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Modo de visualización de mecánicos"
            className="inline-flex rounded-xl bg-white border border-slate-200 p-1 shadow-xs"
          >
            <button
              type="button"
              onClick={() => setModoVista('tarjetas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                modoVista === 'tarjetas'
                  ? 'bg-zinc-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Tarjetas
            </button>
            <button
              type="button"
              onClick={() => setModoVista('tabla')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                modoVista === 'tabla'
                  ? 'bg-zinc-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              Tabla
            </button>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            title="Actualizar estado del equipo"
            className="px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          {canEditOperacion && (
            <button
              type="button"
              onClick={onAbrirNuevoMecanico}
              className="pro-btn-crimson px-4 py-2.5 rounded-xl text-sm shadow-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nuevo Mecánico
            </button>
          )}
        </div>
      </div>

      {/* KPIs superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="pro-card p-5 pro-card-hover">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Plantilla Técnica
            </span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-slate-900">{resumen.totalMecanicos}</h3>
            <span className="text-xs font-semibold text-slate-500">activos</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
            <span className="text-emerald-700 font-bold">{resumen.generales} Generales</span> •{' '}
            <span className="text-rose-700 font-bold">{resumen.especializados} Especializados</span>
          </p>
        </div>

        <div className="pro-card p-5 pro-card-hover">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Disponibles Ahora
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-emerald-600">{resumen.disponibles}</h3>
            <span className="text-xs font-semibold text-emerald-700">libres en piso</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
            {resumen.ocupados} ocupados en bahía • {resumen.enDescanso} en descanso
          </p>
        </div>

        <div className="pro-card p-5 pro-card-hover">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Órdenes Pendientes
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-amber-600">{resumen.totalOrdenesPendientes}</h3>
            <span className="text-xs font-semibold text-amber-700">en proceso</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
            Atendidas por {resumen.conOrdenesPendientes} mecánico(s) actualmente
          </p>
        </div>

        <div className="pro-card p-5 pro-card-hover">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Órdenes Entregadas
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-slate-900">{resumen.totalOrdenesEntregadas}</h3>
            <span className="text-xs font-semibold text-emerald-600">entregadas</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
            {resumen.totalOrdenesCompletadas > 0
              ? `+ ${resumen.totalOrdenesCompletadas} completada(s) lista(s) p/ entregar`
              : 'Trabajos concluidos y entregados al cliente'}
          </p>
        </div>
      </div>

      {/* Filtros rápidos por tipo y disponibilidad */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          {
            key: 'todos',
            label: 'Todos',
            count: resumen.totalMecanicos,
            Icon: Layers,
            activeCls: 'bg-zinc-900 text-white ring-2 ring-zinc-900/10',
          },
          {
            key: 'general',
            label: '1. Generales (Aptos p/ cualquier tarea)',
            count: resumen.generales,
            Icon: ShieldCheck,
            activeCls: 'bg-emerald-600 text-white ring-2 ring-emerald-600/20',
          },
          {
            key: 'especializado',
            label: '2. Especializados (Por rama)',
            count: resumen.especializados,
            Icon: Cpu,
            activeCls: 'bg-rose-600 text-white ring-2 ring-rose-600/20',
          },
          {
            key: 'disponible',
            label: 'Disponibles',
            count: resumen.disponibles,
            Icon: CheckCircle,
            activeCls: 'bg-teal-600 text-white ring-2 ring-teal-600/20',
          },
          {
            key: 'pendientes',
            label: 'Con órdenes pendientes',
            count: resumen.conOrdenesPendientes,
            Icon: Clock,
            activeCls: 'bg-amber-500 text-white ring-2 ring-amber-500/20',
          },
        ].map((tab) => {
          const activo = filtroRapido === tab.key;
          const IconComp = tab.Icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChangeFiltroRapido(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activo
                  ? `${tab.activeCls} shadow-sm`
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <IconComp className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                  activo ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
        <input
          type="search"
          placeholder="Buscar mecánico por nombre, especialidad (ej. Electrónica, Motor, Frenos) o actividad que realiza..."
          value={busqueda}
          onChange={(e) => onChangeBusqueda(e.target.value)}
          className="pro-input w-full pl-10 pr-10 py-2.5 text-sm"
        />
        {busqueda && (
          <button
            type="button"
            onClick={() => onChangeBusqueda('')}
            aria-label="Limpiar búsqueda de mecánicos"
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Estado vacío */}
      {lista.length === 0 ? (
        <div className="pro-card p-12 text-center space-y-3">
          <Wrench className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-700">
            No se encontraron mecánicos con los filtros seleccionados.
          </p>
          <button
            type="button"
            onClick={() => {
              onChangeFiltroRapido('todos');
              onChangeBusqueda('');
            }}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
          >
            Restablecer filtros y ver todo el equipo
          </button>
        </div>
      ) : modoVista === 'tarjetas' ? (
        /* =====================================================================
           MODO 1: TARJETAS OPERATIVAS DETALLADAS
           ===================================================================== */
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {lista.map((m) => {
            const IconEsp = getEspecialidadIcon(m.tipo, m.especialidad);
            const esGeneral = m.tipo === 'general';
            const activas = Array.isArray(m.ordenes_activas) ? m.ordenes_activas : [];

            return (
              <article
                key={m.id}
                className="pro-card p-5 flex flex-col justify-between gap-4 pro-card-hover"
              >
                {/* Cabecera: Quién es + Tipo + Disponibilidad */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
                          esGeneral
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-rose-50 border-rose-200 text-rose-600'
                        }`}
                      >
                        <IconEsp className="w-5 h-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-black text-slate-900 leading-tight">
                            {m.nombre}
                          </h2>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            ID #{m.id}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {esGeneral ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100/80 text-emerald-900 border border-emerald-200">
                              1. Mecánico General • Apto p/ cualquier tarea
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-100/80 text-rose-900 border border-rose-200">
                              2. Especializado • {m.especialidad}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {getDisponibilidadBadge(m.estatus, m.ordenes_pendientes)}
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        {m.telefono && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" /> {m.telefono}
                          </span>
                        )}
                        <span className="font-mono font-bold text-slate-700">
                          ${Number(m.tarifa_hora || 0).toFixed(0)}/hr
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Su trabajo / Funciones */}
                  <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Su trabajo y funciones
                      </span>
                      {esGeneral && (
                        <span className="text-[10px] font-semibold text-emerald-700">
                          ✓ Multitarea sin restricción
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {m.descripcion_trabajo}
                    </p>
                  </div>

                  {/* Métricas de órdenes: Pendientes vs Completadas vs Entregadas */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div
                      className={`p-2.5 rounded-xl border text-center ${
                        m.ordenes_pendientes > 0
                          ? 'bg-amber-50/80 border-amber-200'
                          : 'bg-slate-50/70 border-slate-200/80'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Pendientes
                      </span>
                      <span
                        className={`text-lg font-black ${
                          m.ordenes_pendientes > 0 ? 'text-amber-700' : 'text-slate-700'
                        }`}
                      >
                        {m.ordenes_pendientes}
                      </span>
                      <span className="text-[10px] block font-semibold text-slate-500">
                        {m.ordenes_pendientes > 0 ? 'Sí tiene activas' : 'Sin pendientes'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl border bg-slate-50/70 border-slate-200/80 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Por Entregar
                      </span>
                      <span
                        className={`text-lg font-black ${
                          m.ordenes_completadas > 0 ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        {m.ordenes_completadas}
                      </span>
                      <span className="text-[10px] block font-semibold text-slate-500">
                        Completadas
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl border bg-emerald-50/60 border-emerald-200/80 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                        Entregadas
                      </span>
                      <span className="text-lg font-black text-emerald-700">
                        {m.ordenes_entregadas}
                      </span>
                      <span className="text-[10px] block font-semibold text-emerald-700">
                        Concluidas
                      </span>
                    </div>
                  </div>

                  {/* Detalle de órdenes activas si tiene pendientes */}
                  {activas.length > 0 ? (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Trabajando actualmente en ({activas.length}):
                      </span>
                      <div className="space-y-1.5">
                        {activas.map((ot) => (
                          <button
                            key={ot.id}
                            type="button"
                            onClick={() => onVerOrden && onVerOrden(ot.id)}
                            className="w-full p-2.5 rounded-xl bg-amber-50/50 hover:bg-amber-100/70 border border-amber-200/80 text-left transition flex items-center justify-between gap-2 cursor-pointer group"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-rose-600">
                                  {ot.folio}
                                </span>
                                <span className="text-xs font-bold text-slate-900">
                                  {ot.marca} {ot.modelo}
                                </span>
                                <span className="license-plate text-[10px]">{ot.placas}</span>
                                {ot.bahia && (
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-amber-300 text-amber-900">
                                    Bahía {ot.bahia}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 truncate mt-0.5">
                                {ot.motivo}
                              </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-amber-700 group-hover:translate-x-0.5 transition flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="px-3 py-2 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                      <span>
                        {m.estatus === 'descanso'
                          ? 'Fuera de turno / en descanso actualmente.'
                          : 'Libre sin órdenes pendientes en este momento.'}
                      </span>
                      {m.ordenes_entregadas > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            onFiltrarOrdenesPorMecanico && onFiltrarOrdenesPorMecanico(m)
                          }
                          className="text-rose-600 hover:text-rose-700 font-bold underline cursor-pointer whitespace-nowrap ml-2"
                        >
                          Ver historial ({m.ordenes_entregadas})
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Pie de tarjeta: Control de disponibilidad + Acciones */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  {canCambiarDisponibilidad ? (
                    <div className="flex items-center gap-1.5">
                      <label
                        htmlFor={`disp-${m.id}`}
                        className="text-[11px] font-bold text-slate-500"
                      >
                        Estatus:
                      </label>
                      <select
                        id={`disp-${m.id}`}
                        disabled={cambiandoId === m.id}
                        value={m.estatus}
                        onChange={(e) => onCambiarDisponibilidad(m, e.target.value)}
                        className="pro-input text-xs py-1.5 px-2.5 font-semibold cursor-pointer"
                      >
                        <option value="disponible">🟢 Disponible</option>
                        <option value="ocupado">🟠 Ocupado</option>
                        <option value="descanso">⚪ En descanso</option>
                      </select>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Estatus operativo</span>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5">
                    {m.total_ordenes > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          onFiltrarOrdenesPorMecanico && onFiltrarOrdenesPorMecanico(m)
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                      >
                        Sus órdenes ({m.total_ordenes})
                      </button>
                    )}

                    {canEditOperacion && (
                      <>
                        <button
                          type="button"
                          onClick={() => onEditarMecanico(m)}
                          title="Editar perfil o especialidad"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition cursor-pointer"
                          aria-label={`Editar mecánico ${m.nombre}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          disabled={m.estatus === 'descanso'}
                          onClick={() => onAsignarNuevaOrden(m)}
                          title={
                            m.estatus === 'descanso'
                              ? 'En descanso: cambia su estatus a Disponible para asignarle una orden'
                              : 'Abrir nueva orden asignada a este mecánico'
                          }
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          + Asignar Orden
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* =====================================================================
           MODO 2: TABLA COMPARATIVA RESPONSIVA (@container + encabezados sticky)
           ===================================================================== */
        <div className="pro-card overflow-hidden">
          <div
            tabIndex={0}
            role="region"
            aria-labelledby={captionId}
            className="mecanicos-table-wrapper"
          >
            <table className="text-left text-sm text-slate-600">
              <caption id={captionId} className="visually-hidden">
                Plantilla de mecánicos generales y especializados, carga de órdenes pendientes, entregadas y disponibilidad
              </caption>
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-bold">
                <tr>
                  <th scope="col" className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
                    Mecánico
                  </th>
                  <th scope="col" className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
                    Tipo / Especialidad
                  </th>
                  <th scope="col" className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
                    Su Trabajo / Orden Activa
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3.5 border-b border-slate-200 bg-slate-50 text-center"
                  >
                    Pendientes
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3.5 border-b border-slate-200 bg-slate-50 text-center"
                  >
                    Entregadas
                  </th>
                  <th scope="col" className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
                    Disponibilidad
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 text-center"
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((m) => {
                  const esGeneral = m.tipo === 'general';
                  const activas = Array.isArray(m.ordenes_activas) ? m.ordenes_activas : [];
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors align-top">
                      <th scope="row" className="px-5 py-4 font-bold text-slate-900">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span>{m.nombre}</span>
                            <span className="text-[10px] font-mono text-slate-500">#{m.id}</span>
                          </div>
                          <p className="text-[11px] font-normal text-slate-500 mt-0.5">
                            {m.telefono || 'Sin tel.'} • ${Number(m.tarifa_hora || 0).toFixed(0)}/hr
                          </p>
                        </div>
                      </th>

                      <td className="px-5 py-4">
                        {esGeneral ? (
                          <div>
                            <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-900">
                              1. General
                            </span>
                            <p className="text-xs text-slate-600 mt-1">
                              Apto para cualquier tarea ({m.especialidad})
                            </p>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-900">
                              2. Especializado
                            </span>
                            <p className="text-xs font-semibold text-slate-800 mt-1">
                              {m.especialidad}
                            </p>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 max-w-xs">
                        <p className="text-xs text-slate-700 line-clamp-2">
                          {m.descripcion_trabajo}
                        </p>
                        {activas.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {activas.map((ot) => (
                              <button
                                key={ot.id}
                                type="button"
                                onClick={() => onVerOrden && onVerOrden(ot.id)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[11px] font-mono font-bold text-rose-600 cursor-pointer"
                              >
                                {ot.folio} ({ot.placas})
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-black ${
                            m.ordenes_pendientes > 0
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {m.ordenes_pendientes > 0
                            ? `Sí (${m.ordenes_pendientes})`
                            : '0'}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {m.ordenes_entregadas}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1.5">
                          {getDisponibilidadBadge(m.estatus, m.ordenes_pendientes)}
                          {canCambiarDisponibilidad && (
                            <div>
                              <select
                                aria-label={`Cambiar disponibilidad de ${m.nombre}`}
                                disabled={cambiandoId === m.id}
                                value={m.estatus}
                                onChange={(e) => onCambiarDisponibilidad(m, e.target.value)}
                                className="pro-input text-xs py-1 px-2 cursor-pointer"
                              >
                                <option value="disponible">Disponible</option>
                                <option value="ocupado">Ocupado</option>
                                <option value="descanso">En descanso</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex flex-wrap items-center justify-center gap-1.5">
                          {canEditOperacion && (
                            <>
                              <button
                                type="button"
                                disabled={m.estatus === 'descanso'}
                                onClick={() => onAsignarNuevaOrden(m)}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-40"
                              >
                                + Orden
                              </button>
                              <button
                                type="button"
                                onClick={() => onEditarMecanico(m)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                              >
                                Editar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
