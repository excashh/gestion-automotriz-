import React, { useEffect, useId, useRef, useState } from 'react';
import {
  Camera,
  Upload,
  ZoomIn,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Check,
  Clock,
  User,
  Wrench,
  Columns,
  Grid,
  X,
} from 'lucide-react';
import { ordenesService } from '../services/api';
import { ModalBanner } from './ModalDialog';
import {
  AuthImage,
  ETAPAS_CATALOGO,
  EtapaBadge,
  EvidenciaLightboxModal,
} from './AuthImage';

const MAX_BYTES = 8 * 1024 * 1024;
const FORMATOS_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function EvidenciaOrdenSection({
  orden,
  serviciosOrden = [],
  evidencias = [],
  validacionEvidencia = null,
  currentUser,
  onActualizado,
}) {
  const [borradores, setBorradores] = useState([]);
  const [vistaGaleria, setVistaGaleria] = useState('comparativa'); // 'comparativa' | 'todas'
  const [filtroEtapa, setFiltroEtapa] = useState('todas');
  const [etapaPorDefecto, setEtapaPorDefecto] = useState('antes_diagnostico');
  const [servicioPorDefecto, setServicioPorDefecto] = useState('');

  const [subiendo, setSubiendo] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [confirmarEliminarId, setConfirmarEliminarId] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type, title, message }
  const [lightboxItem, setLightboxItem] = useState(null);

  const borradoresRef = useRef([]);
  borradoresRef.current = borradores;

  const camaraInputId = useId();
  const galeriaInputId = useId();

  const ordenCerradaDefinitiva = ['entregada', 'cancelada'].includes(orden?.estado);

  // Limpiar ObjectURLs temporales al desmontar
  useEffect(() => {
    return () => {
      for (const b of borradoresRef.current) {
        if (b.previewUrl) URL.revokeObjectURL(b.previewUrl);
      }
    };
  }, []);

  // Preseleccionar servicio si solo hay uno en la orden
  useEffect(() => {
    if (serviciosOrden.length === 1 && !servicioPorDefecto) {
      setServicioPorDefecto(String(serviciosOrden[0].id));
    }
  }, [serviciosOrden]);

  const agregarArchivosABandeja = (fileList, etapaSugerida = null, ordenServicioSugerido = null) => {
    if (!fileList || fileList.length === 0) return;

    const erroresSeleccion = [];
    const nuevos = [];

    const espacioRestante = Math.max(0, 8 - borradores.length);
    const lista = Array.from(fileList);

    if (lista.length > espacioRestante) {
      erroresSeleccion.push(
        `Solo puedes preparar hasta 8 fotografías por envío (espacio disponible: ${espacioRestante}).`
      );
    }

    for (const file of lista.slice(0, espacioRestante)) {
      if (!FORMATOS_PERMITIDOS.has(file.type)) {
        erroresSeleccion.push(
          `"${file.name}": formato no permitido. Usa imágenes JPG, PNG o WEBP.`
        );
        continue;
      }
      if (file.size <= 0) {
        erroresSeleccion.push(`"${file.name}": el archivo está vacío.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        erroresSeleccion.push(
          `"${file.name}": pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB y excede el máximo de 8 MB.`
        );
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      nuevos.push({
        uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        nombreArchivo: file.name,
        tamanoBytes: file.size,
        previewUrl,
        etapa: etapaSugerida || etapaPorDefecto || 'antes_diagnostico',
        orden_servicio_id:
          ordenServicioSugerido !== null
            ? String(ordenServicioSugerido)
            : servicioPorDefecto || (serviciosOrden[0] ? String(serviciosOrden[0].id) : ''),
        descripcion: '',
      });
    }

    if (nuevos.length > 0) {
      setBorradores((prev) => [...prev, ...nuevos]);
    }

    if (erroresSeleccion.length > 0) {
      setFeedback({
        type: 'warning',
        title: 'Algunos archivos no se agregaron',
        message: erroresSeleccion.join(' '),
      });
    } else if (nuevos.length > 0) {
      setFeedback(null);
    }
  };

  const actualizarBorrador = (uid, campo, valor) => {
    setBorradores((prev) =>
      prev.map((b) => (b.uid === uid ? { ...b, [campo]: valor } : b))
    );
  };

  const quitarBorrador = (uid) => {
    setBorradores((prev) => {
      const target = prev.find((b) => b.uid === uid);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((b) => b.uid !== uid);
    });
  };

  const limpiarBandeja = () => {
    for (const b of borradores) {
      if (b.previewUrl) URL.revokeObjectURL(b.previewUrl);
    }
    setBorradores([]);
  };

  const handleConfirmarSubida = async () => {
    if (borradores.length === 0 || subiendo) return;

    setSubiendo(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      const metadata = borradores.map((b) => ({
        etapa: b.etapa,
        orden_servicio_id: b.orden_servicio_id ? parseInt(b.orden_servicio_id, 10) : null,
        descripcion: b.descripcion.trim() || null,
      }));

      formData.append('metadata', JSON.stringify(metadata));
      for (const b of borradores) {
        formData.append('fotos', b.file);
      }

      const res = await ordenesService.subirEvidencias(orden.id, formData);
      limpiarBandeja();
      setFeedback({
        type: 'success',
        title: 'Evidencia registrada',
        message: res.mensaje,
      });
      if (onActualizado) onActualizado();
    } catch (err) {
      setFeedback({
        type: 'error',
        title: 'Error al subir fotografías',
        message:
          err.message || 'No se pudieron guardar las imágenes. Tus fotos siguen en la bandeja para reintentar.',
      });
    } finally {
      setSubiendo(false);
    }
  };

  const puedeEliminarEvidencia = (ev) => {
    if (ordenCerradaDefinitiva) return false;
    if (currentUser?.rol === 'admin') return true;
    return ev.subido_por === currentUser?.id && orden?.estado !== 'completada';
  };

  const handleEliminarEvidencia = async (evidenciaId) => {
    if (eliminandoId) return;
    setEliminandoId(evidenciaId);
    setFeedback(null);
    try {
      const res = await ordenesService.eliminarEvidencia(
        orden.id,
        evidenciaId,
        'Retirada desde detalle de orden'
      );
      setConfirmarEliminarId(null);
      setFeedback({
        type: 'info',
        title: 'Fotografía retirada',
        message: res.mensaje,
      });
      if (onActualizado) onActualizado();
    } catch (err) {
      setFeedback({
        type: 'error',
        title: 'No se pudo retirar la fotografía',
        message: err.message || 'No cuentas con permisos para retirar esta evidencia.',
      });
    } finally {
      setEliminandoId(null);
    }
  };

  // Agrupaciones para distinguir Antes vsProceso vs Después
  const fotosAntes = evidencias.filter((e) => e.etapa === 'antes_diagnostico');
  const fotosProceso = evidencias.filter((e) =>
    ['durante_trabajo', 'pieza_retirada'].includes(e.etapa)
  );
  const fotosDespues = evidencias.filter((e) =>
    ['despues_instalacion', 'entrega'].includes(e.etapa)
  );

  const evidenciasFiltradas =
    filtroEtapa === 'todas'
      ? evidencias
      : evidencias.filter((e) => e.etapa === filtroEtapa);

  const renderTarjetaFotoGuardada = (ev) => (
    <div
      key={ev.id}
      className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col shadow-2xs group"
    >
      <div className="relative h-36 bg-slate-100 overflow-hidden">
        <button
          type="button"
          onClick={() => setLightboxItem(ev)}
          className="w-full h-full block cursor-pointer focus:outline-none"
          title="Ver fotografía ampliada"
        >
          <AuthImage
            ordenId={orden.id}
            evidenciaId={ev.id}
            alt={ev.descripcion || ev.etapa_label}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        </button>
        <div className="absolute top-2 left-2">
          <EtapaBadge etapa={ev.etapa} />
        </div>
        <button
          type="button"
          onClick={() => setLightboxItem(ev)}
          aria-label="Ampliar fotografía"
          className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-zinc-950/75 text-white hover:bg-rose-600 transition cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 flex-1 flex flex-col justify-between gap-2 text-xs">
        <div className="space-y-1">
          {ev.servicio_nombre ? (
            <p className="font-bold text-slate-900 flex items-center gap-1 truncate" title={ev.servicio_nombre}>
              <Wrench className="w-3 h-3 text-rose-600 flex-shrink-0" />
              <span className="truncate">{ev.servicio_nombre}</span>
            </p>
          ) : (
            <p className="text-[11px] font-semibold text-slate-500">Evidencia general de orden</p>
          )}

          {ev.descripcion ? (
            <p className="text-slate-700 line-clamp-2 leading-snug">{ev.descripcion}</p>
          ) : (
            <p className="text-slate-400 italic text-[11px]">Sin nota descriptiva</p>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
          <div className="flex items-center justify-between gap-1">
            <span className="inline-flex items-center gap-1 truncate">
              <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span className="truncate">{ev.autor_nombre}</span>
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <Clock className="w-3 h-3 text-slate-400" />
              {new Date(ev.created_at).toLocaleString([], {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {puedeEliminarEvidencia(ev) && (
            <div className="pt-1 flex justify-end">
              {confirmarEliminarId === ev.id ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-rose-700">¿Retirar foto?</span>
                  <button
                    type="button"
                    disabled={eliminandoId === ev.id}
                    onClick={() => handleEliminarEvidencia(ev.id)}
                    className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                  >
                    {eliminandoId === ev.id ? '...' : 'Sí'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmarEliminarId(null)}
                    className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-semibold cursor-pointer"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmarEliminarId(ev.id)}
                  className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Retirar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <section className="border-t border-slate-200 pt-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Camera className="w-4 h-4 text-rose-600" />
            Evidencia Fotográfica ({evidencias.length})
          </h4>
          <p className="text-xs text-slate-500">
            Respaldo visual de diagnóstico, piezas retiradas, instalación y entrega del vehículo
          </p>
        </div>

        {/* Botones de captura (cámara o archivos del dispositivo) */}
        {!ordenCerradaDefinitiva && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={camaraInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={(e) => {
                agregarArchivosABandeja(e.target.files);
                e.target.value = '';
              }}
              className="visually-hidden"
            />
            <label
              htmlFor={camaraInputId}
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition"
            >
              <Camera className="w-3.5 h-3.5 text-rose-400" /> Tomar Foto
            </label>

            <input
              id={galeriaInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => {
                agregarArchivosABandeja(e.target.files);
                e.target.value = '';
              }}
              className="visually-hidden"
            />
            <label
              htmlFor={galeriaInputId}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition"
            >
              <Upload className="w-3.5 h-3.5 text-rose-600" /> Seleccionar Archivos
            </label>
          </div>
        )}
      </div>

      {feedback && (
        <ModalBanner
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      )}

      {/* CHECKLIST DE EVIDENCIA OBLIGATORIA (CUANDO ALGÚN SERVICIO TIENE REGLAS HABILITADAS) */}
      {validacionEvidencia?.tieneReglasActivas && (
        <div
          className={`p-3.5 rounded-xl border text-xs space-y-2 ${
            validacionEvidencia.cumple
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/80 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold flex items-center gap-1.5">
              {validacionEvidencia.cumple ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Evidencia obligatoria completa para los servicios de esta orden
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Evidencia fotográfica requerida antes de entregar el vehículo
                </>
              )}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {validacionEvidencia.requisitos.map((req, idx) => (
              <div
                key={`${req.orden_servicio_id}-${req.etapa}-${idx}`}
                className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-2 ${
                  req.cumplida
                    ? 'bg-white border-emerald-200 text-emerald-800'
                    : 'bg-white border-amber-300 text-amber-900'
                }`}
              >
                {req.cumplida ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                )}
                <span>
                  <strong>{req.servicio_nombre}:</strong> {req.etapa_label}
                </span>
                {!req.cumplida && !ordenCerradaDefinitiva && (
                  <button
                    type="button"
                    onClick={() => {
                      setEtapaPorDefecto(req.etapa);
                      setServicioPorDefecto(String(req.orden_servicio_id));
                      document.getElementById(galeriaInputId)?.click();
                    }}
                    className="ml-1 px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold cursor-pointer"
                  >
                    + Cargar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BANDEJA DE PREVISUALIZACIÓN ANTES DE CONFIRMAR Y GUARDAR */}
      {borradores.length > 0 && (
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/30 p-4 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h5 className="text-xs font-black uppercase tracking-wider text-rose-900">
                Previsualización antes de guardar ({borradores.length} foto{borradores.length > 1 ? 's' : ''})
              </h5>
              <p className="text-[11px] text-slate-600">
                Revisa las miniaturas, ajusta la etapa o el servicio vinculado y agrega notas antes de confirmar.
              </p>
            </div>
            <button
              type="button"
              disabled={subiendo}
              onClick={limpiarBandeja}
              className="text-xs font-semibold text-slate-500 hover:text-rose-700 cursor-pointer"
            >
              Descartar todas
            </button>
          </div>

          <div className={`grid grid-cols-1 ${borradores.length > 1 ? 'lg:grid-cols-2' : ''} gap-3`}>
            {borradores.map((b) => {
              const srvNombre =
                serviciosOrden.find((s) => String(s.id) === String(b.orden_servicio_id))?.nombre ||
                null;
              return (
                <div
                  key={b.uid}
                  className="bg-white rounded-xl border border-slate-200 p-3 flex gap-3 shadow-xs"
                >
                  {/* Miniatura con opción de ampliar antes de guardar */}
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-100 relative flex-shrink-0 border border-slate-200">
                    <img
                      src={b.previewUrl}
                      alt={b.nombreArchivo}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxItem({
                          esBorrador: true,
                          previewUrl: b.previewUrl,
                          nombreArchivo: b.nombreArchivo,
                          etapa: b.etapa,
                          servicio_nombre: srvNombre,
                          descripcion: b.descripcion,
                        })
                      }
                      title="Ver tamaño completo"
                      className="absolute bottom-1 right-1 p-1 rounded bg-zinc-950/75 text-white hover:bg-rose-600 cursor-pointer"
                    >
                      <ZoomIn className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Controles de metadatos de cada foto */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] font-semibold text-slate-600 truncate" title={b.nombreArchivo}>
                        {b.nombreArchivo} ({(b.tamanoBytes / 1024).toFixed(0)} KB)
                      </p>
                      <button
                        type="button"
                        disabled={subiendo}
                        onClick={() => quitarBorrador(b.uid)}
                        title="Quitar esta imagen"
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        aria-label="Etapa de la fotografía"
                        value={b.etapa}
                        onChange={(e) => actualizarBorrador(b.uid, 'etapa', e.target.value)}
                        className="pro-input w-full text-xs pl-2.5 pr-7 py-1.5 font-semibold"
                      >
                        {ETAPAS_CATALOGO.map((et) => (
                          <option key={et.codigo} value={et.codigo}>
                            {et.nombre}
                          </option>
                        ))}
                      </select>

                      <select
                        aria-label="Servicio relacionado"
                        value={b.orden_servicio_id}
                        onChange={(e) =>
                          actualizarBorrador(b.uid, 'orden_servicio_id', e.target.value)
                        }
                        className="pro-input w-full text-xs pl-2.5 pr-7 py-1.5"
                      >
                        <option value="">General de la orden</option>
                        {serviciosOrden.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <input
                      type="text"
                      maxLength={300}
                      placeholder="Nota opcional (ej. balata desgastada / pieza nueva instalada)..."
                      value={b.descripcion}
                      onChange={(e) => actualizarBorrador(b.uid, 'descripcion', e.target.value)}
                      className="pro-input w-full text-xs px-2.5 py-1.5"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={subiendo}
              onClick={handleConfirmarSubida}
              className="pro-btn-crimson px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {subiendo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Subiendo fotografías...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Confirmar y guardar {borradores.length} fotografía(s)
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* GALERÍA DE EVIDENCIAS GUARDADAS */}
      {evidencias.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-center space-y-1">
          <p className="text-xs font-semibold text-slate-600">
            Aún no se han registrado fotografías en esta orden.
          </p>
          <p className="text-[11px] text-slate-400">
            Usa &ldquo;Tomar Foto&rdquo; o &ldquo;Seleccionar Archivos&rdquo; para documentar el antes, proceso o después del trabajo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Selector de modo de visualización */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 gap-1">
              <button
                type="button"
                onClick={() => setVistaGaleria('comparativa')}
                className={`px-3 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                  vistaGaleria === 'comparativa'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Columns className="w-3.5 h-3.5 text-rose-600" /> Antes vs. Después
              </button>
              <button
                type="button"
                onClick={() => setVistaGaleria('todas')}
                className={`px-3 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                  vistaGaleria === 'todas'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid className="w-3.5 h-3.5 text-rose-600" /> Filtrar por etapa
              </button>
            </div>

            {vistaGaleria === 'todas' && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setFiltroEtapa('todas')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer ${
                    filtroEtapa === 'todas'
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Todas ({evidencias.length})
                </button>
                {ETAPAS_CATALOGO.map((et) => {
                  const count = evidencias.filter((e) => e.etapa === et.codigo).length;
                  return (
                    <button
                      key={et.codigo}
                      type="button"
                      onClick={() => setFiltroEtapa(et.codigo)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer ${
                        filtroEtapa === et.codigo
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {et.corto} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {vistaGaleria === 'comparativa' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Columna ANTES / DIAGNÓSTICO */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                      Antes / Diagnóstico ({fotosAntes.length})
                    </span>
                    <span className="text-[11px] text-amber-700 font-medium">Recepción y estado inicial</span>
                  </div>
                  {fotosAntes.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">
                      Sin fotografías de diagnóstico inicial.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {fotosAntes.map(renderTarjetaFotoGuardada)}
                    </div>
                  )}
                </div>

                {/* Columna DESPUÉS / INSTALACIÓN Y ENTREGA */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-900">
                      Después / Instalación y Entrega ({fotosDespues.length})
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium">Trabajo terminado</span>
                  </div>
                  {fotosDespues.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">
                      Sin fotografías finales o de entrega aún.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {fotosDespues.map(renderTarjetaFotoGuardada)}
                    </div>
                  )}
                </div>
              </div>

              {/* Bloque intermedio: Durante el trabajo y Piezas retiradas */}
              {fotosProceso.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                    Durante el trabajo y Piezas retiradas ({fotosProceso.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {fotosProceso.map(renderTarjetaFotoGuardada)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {evidenciasFiltradas.map(renderTarjetaFotoGuardada)}
            </div>
          )}
        </div>
      )}

      <EvidenciaLightboxModal item={lightboxItem} onClose={() => setLightboxItem(null)} />
    </section>
  );
}
