import React, { useEffect, useId, useRef, useState } from 'react';
import {
  Wrench,
  Cpu,
  Check,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { mecanicosService } from '../services/api';
import { ModalDialog, ModalBanner, FieldError } from './ModalDialog';

const ESPECIALIDADES_BASE = [
  'Electrónica y Diagnóstico',
  'Motor y Transmisión',
  'Frenos y Suspensión',
  'Sistema Eléctrico e Híbridos',
  'Climatización y A/C',
  'Inyección Electrónica y Afinación',
  'Dirección y Geometría Vehicular',
];

const DESCRIPCIONES_SUGERIDAS = {
  'Electrónica y Diagnóstico':
    'Diagnóstico computarizado avanzado (OBD-II y osciloscopio), programación de módulos ECU/BCM, redes CAN-Bus, sensores e inyección electrónica.',
  'Motor y Transmisión':
    'Ajuste de motores gasolina y diésel, sincronización de distribución, reparación de transmisiones automáticas, CVT y embragues.',
  'Frenos y Suspensión':
    'Sistemas de frenado ABS/EBD, rectificado de discos, balatas cerámicas, dirección electroasistida, amortiguación y alineación.',
  'Sistema Eléctrico e Híbridos':
    'Diagnóstico y reparación de alternadores, motores de arranque, arneses eléctricos, cortos circuitos, baterías y sistemas de carga.',
  'Climatización y A/C':
    'Detección de fugas en sistema climático, compresores, evaporadores, vacío, recarga de gas refrigerante y controles electrónicos de A/C.',
  'Inyección Electrónica y Afinación':
    'Lavado ultrasónico de inyectores, calibración de cuerpos de aceleración electrónicos, bombas de combustible y emisiones.',
  'Dirección y Geometría Vehicular':
    'Reparación de cremalleras hidráulicas y electroasistidas, rótulas, terminales, horquillas y balanceo dinámico.',
};

export function ModalMecanicoForm({
  open,
  mecanicoEditar = null,
  especialidadesSugeridas = ESPECIALIDADES_BASE,
  onClose,
  onSaved,
}) {
  const esEdicion = Boolean(mecanicoEditar?.id);
  const [form, setForm] = useState({
    nombre: '',
    tipo: 'general',
    especialidad: 'Mecánica General Multimarca',
    descripcion_trabajo:
      'Apto para cualquier tarea del taller: mantenimiento preventivo y correctivo integral, afinaciones, frenos, fluidos e inspección multipunto.',
    telefono: '',
    tarifa_hora: 210,
    estatus: 'disponible',
  });
  const [errores, setErrores] = useState({});
  const [banner, setBanner] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const bannerRef = useRef(null);
  const baseId = useId();

  useEffect(() => {
    if (!open) return;
    setErrores({});
    setBanner(null);
    setSubmitting(false);

    if (mecanicoEditar) {
      setForm({
        nombre: mecanicoEditar.nombre || '',
        tipo: mecanicoEditar.tipo || 'general',
        especialidad:
          mecanicoEditar.especialidad ||
          (mecanicoEditar.tipo === 'general' ? 'Mecánica General Multimarca' : ''),
        descripcion_trabajo: mecanicoEditar.descripcion_trabajo || '',
        telefono: mecanicoEditar.telefono || '',
        tarifa_hora: mecanicoEditar.tarifa_hora ?? 210,
        estatus: mecanicoEditar.estatus || 'disponible',
      });
    } else {
      setForm({
        nombre: '',
        tipo: 'general',
        especialidad: 'Mecánica General Multimarca',
        descripcion_trabajo:
          'Apto para cualquier tarea del taller: mantenimiento preventivo y correctivo integral, afinaciones, frenos, fluidos e inspección multipunto.',
        telefono: '',
        tarifa_hora: 210,
        estatus: 'disponible',
      });
    }
  }, [open, mecanicoEditar]);

  const cambiarTipo = (nuevoTipo) => {
    setErrores((p) => ({ ...p, tipo: '', especialidad: '' }));
    if (nuevoTipo === 'general') {
      setForm((prev) => ({
        ...prev,
        tipo: 'general',
        especialidad:
          prev.tipo === 'especializado' || !prev.especialidad
            ? 'Mecánica General Multimarca'
            : prev.especialidad,
        descripcion_trabajo:
          prev.tipo === 'especializado' || !prev.descripcion_trabajo
            ? 'Apto para cualquier tarea del taller: mantenimiento preventivo y correctivo integral, afinaciones, frenos, fluidos e inspección multipunto.'
            : prev.descripcion_trabajo,
      }));
    } else {
      const espInicial = 'Electrónica y Diagnóstico';
      setForm((prev) => ({
        ...prev,
        tipo: 'especializado',
        especialidad:
          prev.tipo === 'general' ? espInicial : prev.especialidad || espInicial,
        descripcion_trabajo:
          prev.tipo === 'general'
            ? DESCRIPCIONES_SUGERIDAS[espInicial]
            : prev.descripcion_trabajo,
        tarifa_hora: prev.tipo === 'general' && Number(prev.tarifa_hora) === 210 ? 280 : prev.tarifa_hora,
      }));
    }
  };

  const elegirEspecialidadChip = (esp) => {
    setErrores((p) => ({ ...p, especialidad: '' }));
    setForm((prev) => ({
      ...prev,
      tipo: 'especializado',
      especialidad: esp,
      descripcion_trabajo: DESCRIPCIONES_SUGERIDAS[esp] || prev.descripcion_trabajo,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const errs = {};
    if (!form.nombre.trim() || form.nombre.trim().length < 3) {
      errs.nombre = 'Ingresa el nombre completo del mecánico (mínimo 3 caracteres).';
    }
    if (form.tipo === 'especializado' && (!form.especialidad.trim() || form.especialidad.trim().length < 3)) {
      errs.especialidad = 'Indica el área de especialización automotriz.';
    }
    const tarifa = form.tarifa_hora === '' ? 0 : parseFloat(form.tarifa_hora);
    if (isNaN(tarifa) || tarifa < 0) {
      errs.tarifa_hora = 'Ingresa una tarifa por hora válida (mayor o igual a $0).';
    }

    if (Object.keys(errs).length > 0) {
      setErrores(errs);
      setBanner({
        type: 'error',
        title: 'Revisa los datos del mecánico',
        message: errs.nombre || errs.especialidad || errs.tarifa_hora,
      });
      setTimeout(() => bannerRef.current?.focus(), 20);
      return;
    }

    setSubmitting(true);
    setBanner(null);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        tipo: form.tipo,
        especialidad:
          form.especialidad.trim() ||
          (form.tipo === 'general' ? 'Mecánica General Multimarca' : ''),
        descripcion_trabajo: form.descripcion_trabajo.trim(),
        telefono: form.telefono.trim() || null,
        tarifa_hora: tarifa,
        estatus: form.estatus,
      };

      const res = esEdicion
        ? await mecanicosService.actualizarMecanico(mecanicoEditar.id, payload)
        : await mecanicosService.crearMecanico(payload);

      if (onSaved) onSaved(res.mecanico, res.mensaje);
      if (onClose) onClose();
    } catch (err) {
      if (err.errores) {
        setErrores((prev) => ({ ...prev, ...err.errores }));
      } else if (err.campo) {
        setErrores((prev) => ({ ...prev, [err.campo]: err.message }));
      }
      setBanner({
        type: 'error',
        title: 'No se pudo guardar el mecánico',
        message: err.message || 'Verifica los campos e inténtalo nuevamente.',
      });
      setTimeout(() => bannerRef.current?.focus(), 20);
    } finally {
      setSubmitting(false);
    }
  };

  const listaEspecialidades =
    Array.isArray(especialidadesSugeridas) && especialidadesSugeridas.length > 0
      ? especialidadesSugeridas
      : ESPECIALIDADES_BASE;

  return (
    <ModalDialog
      open={open}
      onClose={() => !submitting && onClose && onClose()}
      title={esEdicion ? `Editar Mecánico #${mecanicoEditar.id}` : 'Registrar Mecánico en Taller'}
      subtitle="Define si es Mecánico General (apto para cualquier tarea) o Especializado en una rama automotriz."
      icon={Wrench}
      maxWidth="42rem"
      busy={submitting}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {banner && (
          <ModalBanner
            type={banner.type}
            title={banner.title}
            message={banner.message}
            bannerRef={bannerRef}
            onDismiss={() => setBanner(null)}
          />
        )}

        {/* Selector visual de los 2 tipos de mecánicos */}
        <fieldset className="space-y-2">
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Tipo de Mecánico <span className="text-rose-600">*</span>
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => cambiarTipo('general')}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                form.tipo === 'general'
                  ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-black text-sm text-slate-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  1. Mecánico General
                </span>
                {form.tipo === 'general' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                    Activo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-snug">
                <strong>Apto para cualquier tarea</strong> del taller: mantenimiento preventivo, afinaciones, frenos y apoyo general.
              </p>
            </button>

            <button
              type="button"
              onClick={() => cambiarTipo('especializado')}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                form.tipo === 'especializado'
                  ? 'bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-black text-sm text-slate-900">
                  <Cpu className="w-4 h-4 text-rose-600" />
                  2. Especializado
                </span>
                {form.tipo === 'especializado' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                    Activo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-snug">
                Enfocado en una <strong>rama técnica automotriz</strong>: Electrónica, Motor y Transmisión, Frenos, A/C o Sistema Eléctrico.
              </p>
            </button>
          </div>
        </fieldset>

        {/* Nombre y Teléfono */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="sm:col-span-2">
            <label htmlFor={`${baseId}-nombre`} className="text-xs font-bold text-slate-700 block mb-1">
              Nombre completo <span className="text-rose-600">*</span>
            </label>
            <input
              id={`${baseId}-nombre`}
              type="text"
              autoFocus
              required
              placeholder="Ej. Ricardo Mendoza"
              value={form.nombre}
              onChange={(e) => {
                setForm({ ...form, nombre: e.target.value });
                setErrores((p) => ({ ...p, nombre: '' }));
              }}
              aria-invalid={errores.nombre ? 'true' : undefined}
              className={`pro-input w-full text-sm p-2.5 ${errores.nombre ? 'pro-input-error' : ''}`}
            />
            <FieldError message={errores.nombre} />
          </div>

          <div>
            <label htmlFor={`${baseId}-tel`} className="text-xs font-bold text-slate-700 block mb-1">
              Teléfono
            </label>
            <input
              id={`${baseId}-tel`}
              type="tel"
              placeholder="555-000000"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="pro-input w-full text-sm p-2.5"
            />
          </div>
        </div>

        {/* Especialidad o Etiqueta General */}
        <div className="space-y-2">
          <label htmlFor={`${baseId}-esp`} className="text-xs font-bold text-slate-700 block">
            {form.tipo === 'especializado'
              ? 'Especialidad Automotriz *'
              : ' Perfil General (Apto para cualquier tarea)'}
          </label>

          {form.tipo === 'especializado' && (
            <div className="flex flex-wrap gap-1.5 pb-1">
              {listaEspecialidades.map((esp) => {
                const activa = form.especialidad === esp;
                return (
                  <button
                    key={esp}
                    type="button"
                    onClick={() => elegirEspecialidadChip(esp)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer inline-flex items-center gap-1 ${
                      activa
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-rose-50 text-slate-700 border-slate-200 hover:border-rose-200'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    {esp}
                  </button>
                );
              })}
            </div>
          )}

          <input
            id={`${baseId}-esp`}
            type="text"
            list={`${baseId}-esp-list`}
            placeholder={
              form.tipo === 'especializado'
                ? 'Ej. Electrónica y Diagnóstico, Motor y Transmisión...'
                : 'Mecánica General Multimarca'
            }
            value={form.especialidad}
            onChange={(e) => {
              setForm({ ...form, especialidad: e.target.value });
              setErrores((p) => ({ ...p, especialidad: '' }));
            }}
            className={`pro-input w-full text-sm p-2.5 ${
              errores.especialidad ? 'pro-input-error' : ''
            }`}
          />
          <datalist id={`${baseId}-esp-list`}>
            {listaEspecialidades.map((esp) => (
              <option key={esp} value={esp} />
            ))}
          </datalist>
          <FieldError message={errores.especialidad} />
        </div>

        {/* Descripción del trabajo que desempeña */}
        <div>
          <label htmlFor={`${baseId}-desc`} className="text-xs font-bold text-slate-700 block mb-1">
            Su trabajo / Funciones en el taller
          </label>
          <textarea
            id={`${baseId}-desc`}
            rows={2}
            placeholder="Describe las tareas, diagnósticos o reparaciones que realiza este mecánico..."
            value={form.descripcion_trabajo}
            onChange={(e) => setForm({ ...form, descripcion_trabajo: e.target.value })}
            className="pro-input w-full text-sm p-2.5"
          />
        </div>

        {/* Tarifa por hora y Disponibilidad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor={`${baseId}-tarifa`} className="text-xs font-bold text-slate-700 block mb-1">
              Tarifa mano de obra ($ / hora)
            </label>
            <input
              id={`${baseId}-tarifa`}
              type="number"
              min={0}
              step="10"
              value={form.tarifa_hora}
              onChange={(e) => {
                setForm({ ...form, tarifa_hora: e.target.value });
                setErrores((p) => ({ ...p, tarifa_hora: '' }));
              }}
              className={`pro-input w-full text-sm p-2.5 ${
                errores.tarifa_hora ? 'pro-input-error' : ''
              }`}
            />
            <FieldError message={errores.tarifa_hora} />
          </div>

          <div>
            <label htmlFor={`${baseId}-est`} className="text-xs font-bold text-slate-700 block mb-1">
              Disponibilidad actual
            </label>
            <select
              id={`${baseId}-est`}
              value={form.estatus}
              onChange={(e) => setForm({ ...form, estatus: e.target.value })}
              className="pro-input w-full text-sm p-2.5 cursor-pointer"
            >
              <option value="disponible">🟢 Disponible (listo para asignar)</option>
              <option value="ocupado">🟠 Ocupado en bahía</option>
              <option value="descanso">⚪ En descanso (no disponible)</option>
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="pro-btn-crimson px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {esEdicion ? 'Guardar Cambios' : 'Registrar Mecánico'}
              </>
            )}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
