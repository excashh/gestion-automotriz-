import React, { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Wrench,
  Package,
  Shield,
  ShieldCheck,
  DollarSign,
  Printer,
  History,
  Settings,
  Check,
  Loader2,
  Camera,
} from 'lucide-react';
import { ordenesService } from '../services/api';
import { ModalDialog, ModalBanner } from './ModalDialog';
import { EvidenciaOrdenSection } from './EvidenciaOrdenSection';
import { ETAPAS_CATALOGO } from './AuthImage';

const METODOS_LABELS = {
  efectivo: 'Efectivo',
  debito: 'Tarjeta de Débito',
  credito: 'Tarjeta de Crédito',
  transferencia: 'Transferencia',
};

export function ModalDetalleOrden({
  open,
  detalleOrden,
  catalogos = { servicios: [], mecanicos: [] },
  refaccionesCatalogo = [],
  currentUser,
  getEstadoBadge,
  onClose,
  onRefreshOrden,
  onRefreshCatalogos,
  onVerHistorialVehiculo,
  onAbrirReporteEntrega,
}) {
  const [servicioForm, setServicioForm] = useState({ servicio_id: '', cantidad: 1 });
  const [refaccionForm, setRefaccionForm] = useState({ refaccion_id: '', cantidad: 1 });
  const [diagnosticoTexto, setDiagnosticoTexto] = useState('');
  const [confirmandoCierreAcid, setConfirmandoCierreAcid] = useState(false);

  const [pagoForm, setPagoForm] = useState({
    monto: '',
    metodo: 'efectivo',
    tipo: 'liquidacion',
    referencia: '',
  });

  // Configurador de etapas obligatorias por servicio (solo Admin)
  const [mostrarConfigReglas, setMostrarConfigReglas] = useState(false);
  const [servicioConfigId, setServicioConfigId] = useState('');
  const [etapasConfigSel, setEtapasConfigSel] = useState([]);

  const [accionCargando, setAccionCargando] = useState(''); // 'servicio' | 'refaccion' | 'finalizar' | 'pago' | 'entregar' | 'regla' | 'mecanico'
  const [editandoMecanico, setEditandoMecanico] = useState(false);
  const [asignacionForm, setAsignacionForm] = useState({
    mecanico_id: '',
    bahia: '',
    estado: 'en_revision',
  });
  const [banner, setBanner] = useState(null);
  const bannerRef = useRef(null);

  const orden = detalleOrden?.orden;
  const servicios = detalleOrden?.servicios || [];
  const refacciones = detalleOrden?.refacciones || [];
  const pagos = detalleOrden?.pagos || [];
  const evidencias = detalleOrden?.evidencias || [];
  const validacionEvidencia = detalleOrden?.validacionEvidencia || null;

  useEffect(() => {
    if (orden) {
      setDiagnosticoTexto(orden.diagnostico || '');
      setConfirmandoCierreAcid(false);
      setEditandoMecanico(false);
      setAsignacionForm({
        mecanico_id: orden.mecanico_id ? String(orden.mecanico_id) : '',
        bahia: orden.bahia || '',
        estado: ['programada', 'en_revision', 'en_reparacion'].includes(orden.estado)
          ? orden.estado
          : 'en_revision',
      });
      setBanner(null);
    }
  }, [orden?.id, orden?.mecanico_id, orden?.bahia, orden?.estado]);

  useEffect(() => {
    if (open && (!catalogos?.servicios || catalogos.servicios.length === 0) && onRefreshCatalogos) {
      onRefreshCatalogos();
    }
  }, [open, catalogos?.servicios?.length]);

  useEffect(() => {
    if (mostrarConfigReglas && !servicioConfigId && catalogos?.servicios?.[0]) {
      seleccionarServicioParaConfig(String(catalogos.servicios[0].id));
    }
  }, [mostrarConfigReglas, servicioConfigId, catalogos?.servicios]);

  if (!open || !orden) return null;

  const esEditableItems = !['completada', 'entregada', 'cancelada'].includes(orden.estado);
  const puedeCobrarYFinalizar = ['admin', 'recepcion'].includes(currentUser?.rol);
  const esAdmin = currentUser?.rol === 'admin';

  // Cálculos dinámicos en vivo antes y después de finalizar
  const subtotalMoVivo = servicios.reduce((acc, s) => acc + parseFloat(s.importe || 0), 0);
  const subtotalRefVivo = refacciones.reduce((acc, r) => acc + parseFloat(r.importe || 0), 0);
  const ivaPct = parseFloat(orden.iva_porcentaje || 16);
  const totalEstimadoVivo = (subtotalMoVivo + subtotalRefVivo) * (1 + ivaPct / 100);

  const totalOficial =
    orden.estado === 'completada' || orden.estado === 'entregada'
      ? parseFloat(orden.total || 0)
      : totalEstimadoVivo;
  const pagadoTotal = parseFloat(orden.pagado || 0);
  const saldoPendiente =
    orden.estado === 'completada' || orden.estado === 'entregada'
      ? Math.max(0, parseFloat(orden.saldo ?? orden.total ?? 0))
      : Math.max(0, totalEstimadoVivo - pagadoTotal);

  const mostrarAlerta = (nuevoBanner) => {
    setBanner(nuevoBanner);
    if (nuevoBanner?.type === 'error' || nuevoBanner?.type === 'warning') {
      setTimeout(() => bannerRef.current?.focus(), 20);
    }
  };

  const handleAsignarServicio = async () => {
    if (!servicioForm.servicio_id) {
      return mostrarAlerta({
        type: 'error',
        title: 'Selecciona un servicio',
        message: 'Elige un trabajo o servicio del catálogo antes de hacer clic en Asignar.',
      });
    }

    setAccionCargando('servicio');
    setBanner(null);
    try {
      const res = await ordenesService.agregarServicio(orden.id, {
        servicio_id: parseInt(servicioForm.servicio_id, 10),
        cantidad: parseInt(servicioForm.cantidad, 10) || 1,
      });
      setServicioForm({ servicio_id: '', cantidad: 1 });
      mostrarAlerta({ type: 'success', message: res.mensaje });
      await onRefreshOrden();
    } catch (err) {
      mostrarAlerta({
        type: 'error',
        title: 'No se pudo asignar el servicio',
        message: err.message,
      });
    } finally {
      setAccionCargando('');
    }
  };

  const handleAsignarRefaccion = async () => {
    if (!refaccionForm.refaccion_id) {
      return mostrarAlerta({
        type: 'error',
        title: 'Selecciona una refacción',
        message: 'Elige una pieza del inventario e indica una cantidad válida.',
      });
    }

    setAccionCargando('refaccion');
    setBanner(null);
    try {
      const res = await ordenesService.agregarRefaccion(orden.id, {
        refaccion_id: parseInt(refaccionForm.refaccion_id, 10),
        cantidad: parseInt(refaccionForm.cantidad, 10) || 1,
      });
      setRefaccionForm({ refaccion_id: '', cantidad: 1 });
      mostrarAlerta({ type: 'success', message: res.mensaje });
      await onRefreshOrden();
    } catch (err) {
      mostrarAlerta({
        type: 'error',
        title: 'No se pudo asignar la refacción',
        message: err.message,
      });
    } finally {
      setAccionCargando('');
    }
  };

  const handleFinalizarOrden = async () => {
    setAccionCargando('finalizar');
    setBanner(null);
    try {
      const res = await ordenesService.finalizarOrden(
        orden.id,
        diagnosticoTexto.trim() || 'Servicio completado'
      );
      setConfirmandoCierreAcid(false);
      mostrarAlerta({
        type: 'success',
        title: 'Orden finalizada (ACID)',
        message: res.mensaje,
      });
      await onRefreshOrden(true);
    } catch (err) {
      mostrarAlerta({
        type: 'error',
        title: 'Transacción revertida (ROLLBACK)',
        message: err.message,
      });
    } finally {
      setAccionCargando('');
    }
  };

  const handleRegistrarPago = async () => {
    const montoNum = parseFloat(pagoForm.monto);
    if (!pagoForm.monto || isNaN(montoNum) || montoNum <= 0) {
      return mostrarAlerta({
        type: 'error',
        title: 'Monto de pago inválido',
        message: 'Ingresa una cantidad mayor a $0.00 para registrar el cobro.',
      });
    }

    setAccionCargando('pago');
    setBanner(null);
    try {
      const res = await ordenesService.registrarPago(orden.id, {
        monto: montoNum,
        metodo: pagoForm.metodo,
        tipo: pagoForm.tipo,
        referencia: pagoForm.referencia.trim() || null,
      });

      setPagoForm((prev) => ({ ...prev, monto: '', referencia: '' }));
      mostrarAlerta({
        type: res.entregaPendienteEvidencia ? 'warning' : 'success',
        title: res.entregaPendienteEvidencia
          ? 'Pago liquidado • Evidencia pendiente para entregar'
          : 'Cobro registrado',
        message: res.mensaje,
      });
      await onRefreshOrden(true);
    } catch (err) {
      mostrarAlerta({
        type: 'error',
        title: 'No se pudo registrar el cobro',
        message: err.message,
      });
    } finally {
      setAccionCargando('');
    }
  };

  const handleEntregarOrden = async () => {
    setAccionCargando('entregar');
    setBanner(null);
    try {
      const res = await ordenesService.entregarOrden(orden.id);
      mostrarAlerta({
        type: 'success',
        title: 'Vehículo entregado',
        message: res.mensaje,
      });
      await onRefreshOrden(true);
    } catch (err) {
      const detalles = Array.isArray(err.faltantes)
        ? err.faltantes.map(
            (f) => `Servicio "${f.servicio_nombre}": falta foto de etapa "${f.etapa_label}".`
          )
        : [];
      mostrarAlerta({
        type: 'error',
        title: 'No se puede cerrar como entregada aún',
        message: err.message,
        details: detalles,
      });
    } finally {
      setAccionCargando('');
    }
  };

  const seleccionarServicioParaConfig = (idStr) => {
    setServicioConfigId(idStr);
    const encontrado = catalogos.servicios.find((s) => String(s.id) === String(idStr));
    setEtapasConfigSel(encontrado?.etapas_evidencia_obligatorias || []);
  };

  const toggleEtapaObligatoria = (codigoEtapa) => {
    setEtapasConfigSel((prev) =>
      prev.includes(codigoEtapa)
        ? prev.filter((e) => e !== codigoEtapa)
        : [...prev, codigoEtapa]
    );
  };

  const guardarReglaServicio = async () => {
    if (!servicioConfigId) return;
    setAccionCargando('regla');
    try {
      const res = await ordenesService.actualizarConfigEvidenciaServicio(
        parseInt(servicioConfigId, 10),
        etapasConfigSel
      );
      mostrarAlerta({ type: 'success', message: res.mensaje });
      if (onRefreshCatalogos) await onRefreshCatalogos();
      await onRefreshOrden();
    } catch (err) {
      mostrarAlerta({
        type: 'error',
        title: 'No se pudo actualizar la regla',
        message: err.message,
      });
    } finally {
      setAccionCargando('');
    }
  };

  const handleGuardarMecanicoOrden = async () => {
    setAccionCargando('mecanico');
    setBanner(null);
    try {
      const res = await ordenesService.asignarMecanico(orden.id, {
        mecanico_id: asignacionForm.mecanico_id || null,
        bahia: asignacionForm.bahia.trim() || null,
        estado: asignacionForm.estado,
      });
      setEditandoMecanico(false);
      mostrarAlerta({ type: 'success', message: res.mensaje });
      if (onRefreshCatalogos) await onRefreshCatalogos();
      await onRefreshOrden(true);
    } catch (err) {
      mostrarAlerta({
        type: 'error',
        title: 'No se pudo asignar el mecánico',
        message: err.message,
      });
    } finally {
      setAccionCargando('');
    }
  };

  const listaMecanicos = Array.isArray(catalogos?.mecanicos) ? catalogos.mecanicos : [];
  const mecGenerales = listaMecanicos.filter((m) => m.tipo === 'general');
  const mecEspecializados = listaMecanicos.filter((m) => m.tipo !== 'general');

  return (
    <ModalDialog
      open={open}
      onClose={() => !accionCargando && onClose && onClose()}
      title={
        <span className="inline-flex items-center gap-2.5 flex-wrap">
          <span className="font-mono">Orden {orden.folio}</span>
          {getEstadoBadge && getEstadoBadge(orden.estado)}
        </span>
      }
      subtitle={
        <span>
          <strong>{orden.marca} {orden.modelo} {orden.anio}</strong> (
          <span className="font-mono font-bold text-slate-700">{orden.placas}</span> • ID #{orden.vehiculo_id})
          {' • '}Cliente: <strong>{orden.cliente_nombre}</strong> ({orden.cliente_telefono})
        </span>
      }
      icon={FileText}
      maxWidth="58rem"
      busy={Boolean(accionCargando)}
      headerActions={
        <div className="flex items-center gap-1.5">
          {onVerHistorialVehiculo && (
            <button
              type="button"
              onClick={() => onVerHistorialVehiculo(orden.vehiculo_id)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              title="Ver historial completo del vehículo"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Historial Auto</span>
            </button>
          )}
          {onAbrirReporteEntrega && (
            <button
              type="button"
              onClick={() => onAbrirReporteEntrega(detalleOrden)}
              className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
              title="Generar comprobante / reporte de entrega con evidencia"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reporte Entrega</span>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {banner && (
          <ModalBanner
            type={banner.type}
            title={banner.title}
            message={banner.message}
            details={banner.details}
            bannerRef={bannerRef}
            onDismiss={() => setBanner(null)}
          />
        )}

        {/* Resumen rápido de motivo, km y responsable */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Motivo de Ingreso
              </span>
              <p className="font-semibold text-slate-800 mt-0.5">{orden.motivo}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Recepción / Kilometraje
              </span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {Number(orden.km_entrada || 0).toLocaleString()} km
                {orden.bahia ? ` • Bahía ${orden.bahia}` : ''} •{' '}
                {new Date(orden.fecha_ingreso).toLocaleDateString()}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Mecánico Responsable
                </span>
                {esEditableItems && puedeCobrarYFinalizar && (
                  <button
                    type="button"
                    onClick={() => setEditandoMecanico((v) => !v)}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                  >
                    {editandoMecanico
                      ? 'Cancelar'
                      : orden.mecanico_id
                        ? 'Cambiar mecánico'
                        : '+ Asignar mecánico'}
                  </button>
                )}
              </div>
              {orden.mecanico_nombre ? (
                <div className="mt-0.5">
                  <span className="font-bold text-slate-900">{orden.mecanico_nombre}</span>
                  <span
                    className={`ml-1.5 inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      orden.mecanico_tipo === 'general'
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-rose-100 text-rose-900'
                    }`}
                  >
                    {orden.mecanico_tipo === 'general'
                      ? 'General (Apto p/ todo)'
                      : orden.mecanico_especialidad || 'Especializado'}
                  </span>
                </div>
              ) : (
                <p className="font-semibold text-amber-700 mt-0.5">Sin mecánico asignado</p>
              )}
            </div>
          </div>

          {editandoMecanico && esEditableItems && puedeCobrarYFinalizar && (
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-end gap-2.5">
              <div className="flex-1 min-w-52">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Mecánico (1. General o 2. Especializado)
                </label>
                <select
                  value={asignacionForm.mecanico_id}
                  onChange={(e) =>
                    setAsignacionForm({ ...asignacionForm, mecanico_id: e.target.value })
                  }
                  className="pro-input w-full text-xs px-2.5 py-2 bg-white"
                >
                  <option value="">— Dejar sin mecánico —</option>
                  {mecGenerales.length > 0 && (
                    <optgroup label="1. Generales (Aptos para cualquier tarea)">
                      {mecGenerales.map((m) => (
                        <option
                          key={m.id}
                          value={m.id}
                          disabled={m.estatus === 'descanso' && m.id !== orden.mecanico_id}
                        >
                          {m.nombre} — General •{' '}
                          {m.estatus === 'descanso'
                            ? 'En descanso'
                            : m.ordenes_pendientes > 0
                              ? `Ocupado (${m.ordenes_pendientes} pend.)`
                              : 'Disponible'}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {mecEspecializados.length > 0 && (
                    <optgroup label="2. Especializados (Por rama)">
                      {mecEspecializados.map((m) => (
                        <option
                          key={m.id}
                          value={m.id}
                          disabled={m.estatus === 'descanso' && m.id !== orden.mecanico_id}
                        >
                          {m.nombre} — {m.especialidad} •{' '}
                          {m.estatus === 'descanso'
                            ? 'En descanso'
                            : m.ordenes_pendientes > 0
                              ? `Ocupado (${m.ordenes_pendientes} pend.)`
                              : 'Disponible'}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="w-28">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Bahía</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="B-01"
                  value={asignacionForm.bahia}
                  onChange={(e) => setAsignacionForm({ ...asignacionForm, bahia: e.target.value })}
                  className="pro-input w-full text-xs px-2.5 py-2 bg-white"
                />
              </div>

              <div className="w-40">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Etapa en taller
                </label>
                <select
                  value={asignacionForm.estado}
                  onChange={(e) => setAsignacionForm({ ...asignacionForm, estado: e.target.value })}
                  className="pro-input w-full text-xs px-2.5 py-2 bg-white"
                >
                  <option value="programada">Programada</option>
                  <option value="en_revision">En Revisión</option>
                  <option value="en_reparacion">En Reparación</option>
                </select>
              </div>

              <button
                type="button"
                disabled={accionCargando === 'mecanico'}
                onClick={handleGuardarMecanicoOrden}
                className="pro-btn-crimson px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {accionCargando === 'mecanico' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Guardar asignación
              </button>
            </div>
          )}
        </div>

        {/* 1. SERVICIOS / MANO DE OBRA */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-rose-600" />
                Servicios / Mano de Obra
              </h4>
              {esAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    const next = !mostrarConfigReglas;
                    setMostrarConfigReglas(next);
                    if (next && !servicioConfigId && catalogos.servicios[0]) {
                      seleccionarServicioParaConfig(String(catalogos.servicios[0].id));
                    }
                  }}
                  className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 cursor-pointer"
                >
                  <Settings className="w-3 h-3" /> Reglas de fotos
                </button>
              )}
            </div>

            {esEditableItems && (
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label="Seleccionar servicio"
                  value={servicioForm.servicio_id}
                  onChange={(e) => setServicioForm({ ...servicioForm, servicio_id: e.target.value })}
                  className="pro-input text-xs px-2.5 py-1.5 max-w-xs"
                >
                  <option value="">Seleccionar Servicio...</option>
                  {catalogos.servicios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} - ${parseFloat(s.precio_base).toFixed(2)}
                      {s.etapas_evidencia_obligatorias?.length > 0 ? ' (Exige foto)' : ''}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  aria-label="Cantidad de servicios"
                  value={servicioForm.cantidad}
                  onChange={(e) => setServicioForm({ ...servicioForm, cantidad: e.target.value })}
                  className="pro-input w-16 text-xs px-2 py-1.5"
                />
                <button
                  type="button"
                  disabled={accionCargando === 'servicio'}
                  onClick={handleAsignarServicio}
                  className="pro-btn-crimson px-3 py-1.5 text-xs rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {accionCargando === 'servicio' ? '...' : '+ Agregar Servicio'}
                </button>
              </div>
            )}
          </div>

          {/* Panel de administrador para marcar qué etapas fotográficas exige un tipo de trabajo */}
          {esAdmin && mostrarConfigReglas && (
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-800">
                  Configurar etapas fotográficas obligatorias por tipo de servicio:
                </span>
                <select
                  value={servicioConfigId}
                  onChange={(e) => seleccionarServicioParaConfig(e.target.value)}
                  className="pro-input text-xs px-2.5 py-1.5 bg-white min-w-52"
                >
                  {catalogos.servicios.length === 0 && (
                    <option value="">Cargando servicios del catálogo...</option>
                  )}
                  {catalogos.servicios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} ({s.codigo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                {ETAPAS_CATALOGO.map((et) => {
                  const marcada = etapasConfigSel.includes(et.codigo);
                  return (
                    <label
                      key={et.codigo}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer select-none ${
                        marcada
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={marcada}
                        onChange={() => toggleEtapaObligatoria(et.codigo)}
                        className="accent-rose-600"
                      />
                      {et.nombre}
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">
                  Deja todas desmarcadas si ese servicio no requiere fotos obligatorias para entregar.
                </span>
                <button
                  type="button"
                  disabled={accionCargando === 'regla'}
                  onClick={guardarReglaServicio}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Guardar regla
                </button>
              </div>
            </div>
          )}

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs">
            {servicios.length === 0 ? (
              <p className="text-slate-400 italic py-2 text-center">
                No se han asignado servicios de mano de obra a esta orden aún.
              </p>
            ) : (
              servicios.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap justify-between items-center gap-2 py-2 border-b border-slate-200/60 last:border-0"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] text-rose-600 font-bold">{s.codigo}</span>
                    <span className="font-semibold text-slate-800">{s.nombre}</span>
                    <span className="text-slate-400">×{s.cantidad}</span>
                    {s.etapas_evidencia_obligatorias?.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                        <Camera className="w-3 h-3" /> Requiere evidencia
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-slate-900">${parseFloat(s.importe).toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 2. REFACCIONES / PIEZAS UTILIZADAS */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-4 h-4 text-rose-600" />
              Refacciones / Piezas Utilizadas
            </h4>
            {esEditableItems && (
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label="Seleccionar refacción"
                  value={refaccionForm.refaccion_id}
                  onChange={(e) =>
                    setRefaccionForm({ ...refaccionForm, refaccion_id: e.target.value })
                  }
                  className="pro-input text-xs px-2.5 py-1.5 max-w-xs"
                >
                  <option value="">Seleccionar Refacción...</option>
                  {refaccionesCatalogo.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre} (Stock: {r.stock}) - ${r.precio_publico}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  aria-label="Cantidad de refacciones"
                  value={refaccionForm.cantidad}
                  onChange={(e) => setRefaccionForm({ ...refaccionForm, cantidad: e.target.value })}
                  className="pro-input w-16 text-xs px-2 py-1.5"
                />
                <button
                  type="button"
                  disabled={accionCargando === 'refaccion'}
                  onClick={handleAsignarRefaccion}
                  className="pro-btn-crimson px-3 py-1.5 text-xs rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {accionCargando === 'refaccion' ? '...' : '+ Asignar Pieza'}
                </button>
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs">
            {refacciones.length === 0 ? (
              <p className="text-slate-400 italic py-2 text-center">
                No hay refacciones asignadas a esta orden de servicio.
              </p>
            ) : (
              refacciones.map((r) => (
                <div
                  key={r.id}
                  className="flex justify-between items-center py-2 border-b border-slate-200/60 last:border-0"
                >
                  <div>
                    <span className="font-mono text-[11px] text-slate-500 mr-1.5">{r.sku}</span>
                    <span className="font-semibold text-slate-800">{r.nombre}</span>{' '}
                    <span className="text-slate-400">×{r.cantidad}</span>
                  </div>
                  <span className="font-bold text-slate-900">${parseFloat(r.importe).toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 3. EVIDENCIA FOTOGRÁFICA POR ORDEN Y SERVICIO */}
        <EvidenciaOrdenSection
          orden={orden}
          serviciosOrden={servicios}
          evidencias={evidencias}
          validacionEvidencia={validacionEvidencia}
          currentUser={currentUser}
          onActualizado={() => onRefreshOrden(true)}
        />

        {/* 4. DIAGNÓSTICO Y CIERRE TRANSACCIONAL ACID */}
        {esEditableItems && puedeCobrarYFinalizar && (
          <section className="p-4 bg-zinc-950 text-white rounded-2xl border border-zinc-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-rose-500" />
                  <h4 className="text-sm font-bold text-white">
                    Diagnóstico Final y Cierre Transaccional (ACID)
                  </h4>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Descuenta existencias en almacén, calcula IVA ({ivaPct}%) y congela importes finales:
                  Estimado actual <strong className="text-white">${totalEstimadoVivo.toFixed(2)}</strong>.
                </p>
              </div>

              {!confirmandoCierreAcid ? (
                <button
                  type="button"
                  onClick={() => setConfirmandoCierreAcid(true)}
                  className="pro-btn-crimson px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer"
                >
                  Finalizar y Facturar Orden
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={accionCargando === 'finalizar'}
                    onClick={() => setConfirmandoCierreAcid(false)}
                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={accionCargando === 'finalizar'}
                    onClick={handleFinalizarOrden}
                    className="pro-btn-crimson px-4 py-2 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {accionCargando === 'finalizar' ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Procesando ACID...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Confirmar Cierre Definitivo
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                Diagnóstico técnico / Resumen de trabajos realizados
              </label>
              <textarea
                rows={2}
                placeholder="Describe el diagnóstico final y las reparaciones efectuadas..."
                value={diagnosticoTexto}
                onChange={(e) => setDiagnosticoTexto(e.target.value)}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 text-xs p-2.5 focus:outline-none focus:border-rose-500"
              />
            </div>
          </section>
        )}

        {/* 5. COBRANZA, LIQUIDACIÓN Y ENTREGA DEL VEHÍCULO */}
        <section className="border-t border-slate-200 pt-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
            <div>
              <span className="text-slate-500 block">Mano de obra</span>
              <strong className="text-slate-900 text-sm">${subtotalMoVivo.toFixed(2)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Refacciones</span>
              <strong className="text-slate-900 text-sm">${subtotalRefVivo.toFixed(2)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Total c/IVA ({ivaPct}%)</span>
              <strong className="text-slate-900 text-sm">${totalOficial.toFixed(2)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Saldo pendiente</span>
              <strong className={`text-sm ${saldoPendiente <= 0.01 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ${saldoPendiente.toFixed(2)}
              </strong>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-3">
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Cobranza y Liquidación
              </h4>
              <p className="text-xs text-slate-500">
                {orden.estado === 'completada' || orden.estado === 'entregada'
                  ? `Pagado: $${pagadoTotal.toFixed(2)} de $${totalOficial.toFixed(2)}`
                  : 'Finaliza la orden primero para habilitar la liquidación final del saldo.'}
              </p>
            </div>

            {puedeCobrarYFinalizar &&
              (orden.estado === 'completada' || parseFloat(orden.saldo || 0) > 0) &&
              parseFloat(orden.saldo || 0) > 0.009 && (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder={`Máx $${parseFloat(orden.saldo).toFixed(2)}`}
                    value={pagoForm.monto}
                    onChange={(e) => setPagoForm({ ...pagoForm, monto: e.target.value })}
                    className="pro-input w-32 text-xs px-2.5 py-2"
                  />
                  <select
                    aria-label="Método de pago"
                    value={pagoForm.metodo}
                    onChange={(e) => setPagoForm({ ...pagoForm, metodo: e.target.value })}
                    className="pro-input text-xs px-2.5 py-2"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="debito">Tarjeta de Débito</option>
                    <option value="credito">Tarjeta de Crédito</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                  <select
                    aria-label="Tipo de pago"
                    value={pagoForm.tipo}
                    onChange={(e) => setPagoForm({ ...pagoForm, tipo: e.target.value })}
                    className="pro-input text-xs px-2.5 py-2"
                  >
                    <option value="liquidacion">Liquidación</option>
                    <option value="abono">Abono parcial</option>
                    <option value="anticipo">Anticipo</option>
                  </select>
                  <button
                    type="button"
                    disabled={accionCargando === 'pago'}
                    onClick={handleRegistrarPago}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    {accionCargando === 'pago' ? 'Cobrando...' : 'Registrar Cobro'}
                  </button>
                </div>
              )}
          </div>

          {/* Historial de pagos */}
          <div className="space-y-1.5">
            {pagos.map((p) => (
              <div
                key={p.id}
                className="text-xs flex flex-wrap justify-between items-center gap-2 bg-slate-50 border border-slate-100 p-2.5 rounded-xl"
              >
                <span className="text-slate-700">
                  Recibo <b className="font-mono text-rose-600">{p.folio}</b> •{' '}
                  {METODOS_LABELS[p.metodo] || p.metodo} ({p.tipo}) •{' '}
                  <span className="text-slate-400">
                    {new Date(p.fecha_pago).toLocaleString()}
                  </span>
                </span>
                <span className="font-bold text-emerald-700">+${parseFloat(p.monto).toFixed(2)}</span>
              </div>
            ))}
            {pagos.length === 0 && (
              <p className="text-xs text-slate-400 italic py-1">
                No se han registrado abonos ni pagos en esta orden aún.
              </p>
            )}
          </div>

          {/* Bloque explícito de ENTREGA DEL VEHÍCULO (respeta regla de evidencia obligatoria) */}
          {orden.estado === 'completada' && puedeCobrarYFinalizar && (
            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h5 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Cerrar Orden como Entregada al Cliente
                </h5>
                <p className="text-xs text-emerald-900">
                  {saldoPendiente > 0.01
                    ? `Liquida primero el saldo pendiente ($${saldoPendiente.toFixed(2)}) para poder entregar el vehículo.`
                    : validacionEvidencia && !validacionEvidencia.cumple
                      ? `Falta cargar ${validacionEvidencia.faltantes.length} fotografía(s) obligatoria(s) arriba antes de poder entregar.`
                      : 'Saldo liquidado y requisitos completos. Lista para registrar la entrega de la unidad.'}
                </p>
              </div>
              <button
                type="button"
                disabled={accionCargando === 'entregar'}
                onClick={handleEntregarOrden}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold whitespace-nowrap cursor-pointer shadow-xs disabled:opacity-50"
              >
                {accionCargando === 'entregar' ? 'Procesando...' : 'Marcar como Entregada'}
              </button>
            </div>
          )}
        </section>
      </div>
    </ModalDialog>
  );
}
