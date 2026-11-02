import React, { useEffect, useId, useRef, useState } from 'react';
import {
  Car,
  Search,
  Users,
  Phone,
  Mail,
  Sparkles,
  Loader2,
  Check,
  History,
  Plus,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { clientesService } from '../services/api';
import { LISTA_MARCAS, obtenerModelos, decodificarVin } from '../services/vehiculosCatalog';
import { ModalDialog, ModalBanner, FieldError } from './ModalDialog';

const VEHICULO_INICIAL = {
  placas: '',
  vin: '',
  marca: '',
  modelo: '',
  anio: new Date().getFullYear(),
  color: '',
  kilometraje: 0,
};

export function ModalVehiculoCliente({
  open,
  clienteInicial = null,
  canEdit = true,
  onClose,
  onVehiculoCreado,
  onVerHistorialVehiculo,
  onAbrirNuevaOrdenConVehiculo,
  onAbrirCrearCliente,
}) {
  const [clienteActual, setClienteActual] = useState(clienteInicial);
  const [vehiculosCliente, setVehiculosCliente] = useState([]);
  const [cargandoExpediente, setCargandoExpediente] = useState(false);

  // Buscador de clientes dentro del modal (por nombre, teléfono o ID)
  const [modoCambiarCliente, setModoCambiarCliente] = useState(!clienteInicial);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [resultadosClientes, setResultadosClientes] = useState([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);

  // Formulario de vehículo nuevo
  const [form, setForm] = useState(VEHICULO_INICIAL);
  const [sugerenciasModelos, setSugerenciasModelos] = useState([]);
  const [cargandoModelos, setCargandoModelos] = useState(false);
  const [decodificandoVin, setDecodificandoVin] = useState(false);
  const [vinNotice, setVinNotice] = useState(null);

  const [fieldErrors, setFieldErrors] = useState({});
  const [banner, setBanner] = useState(null); // { type, title, message }
  const [submitting, setSubmitting] = useState(false);

  const bannerRef = useRef(null);
  const baseId = useId();

  // Sincronizar cuando se abre el modal con un cliente específico o sin cliente
  useEffect(() => {
    if (!open) return;
    setFieldErrors({});
    setBanner(null);
    setVinNotice(null);
    setSubmitting(false);

    if (clienteInicial && clienteInicial.id) {
      setClienteActual(clienteInicial);
      setModoCambiarCliente(false);
      cargarDetalleCliente(clienteInicial.id);
    } else {
      setClienteActual(null);
      setVehiculosCliente([]);
      setModoCambiarCliente(true);
    }
  }, [open, clienteInicial]);

  const cargarDetalleCliente = async (clienteId) => {
    setCargandoExpediente(true);
    try {
      const res = await clientesService.getClienteById(clienteId);
      setClienteActual(res.cliente);
      setVehiculosCliente(res.vehiculos || []);
    } catch (err) {
      setBanner({
        type: 'error',
        title: 'Error al consultar el cliente',
        message: err.message || 'No se pudo cargar la lista de vehículos del cliente.',
      });
    } finally {
      setCargandoExpediente(false);
    }
  };

  // Búsqueda interactiva de clientes cuando el selector está desplegado
  useEffect(() => {
    if (!open || !modoCambiarCliente) return;
    let activo = true;
    setBuscandoClientes(true);

    const timer = setTimeout(async () => {
      try {
        const res = await clientesService.getClientes(1, busquedaCliente, 15);
        if (activo) {
          setResultadosClientes(res.datos || []);
        }
      } catch (_e) {
        if (activo) setResultadosClientes([]);
      } finally {
        if (activo) setBuscandoClientes(false);
      }
    }, 220);

    return () => {
      activo = false;
      clearTimeout(timer);
    };
  }, [open, modoCambiarCliente, busquedaCliente]);

  const seleccionarCliente = (c) => {
    setClienteActual(c);
    setModoCambiarCliente(false);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.cliente_id;
      return next;
    });
    setBanner(null);
    cargarDetalleCliente(c.id);
  };

  const cambiarMarca = async (marca) => {
    handleChange('marca', marca);
    if (!marca || !marca.trim()) {
      setSugerenciasModelos([]);
      return;
    }
    setCargandoModelos(true);
    try {
      const mods = await obtenerModelos(marca);
      setSugerenciasModelos(mods);
    } catch (_e) {
      setSugerenciasModelos([]);
    } finally {
      setCargandoModelos(false);
    }
  };

  const ejecutarDecodificacionVin = async (vinTexto, silencioso = false) => {
    const vinLimpio = (vinTexto || '').trim().toUpperCase();
    if (vinLimpio.length !== 17) {
      if (!silencioso) {
        setFieldErrors((prev) => ({
          ...prev,
          vin: `El número VIN debe tener exactamente 17 caracteres alfanuméricos (actualmente tiene ${vinLimpio.length}).`,
        }));
      }
      return;
    }

    setDecodificandoVin(true);
    setVinNotice(null);
    try {
      const info = await decodificarVin(vinLimpio);
      const nuevaMarca = info.marca || form.marca;
      const nuevoModelo = info.modelo || form.modelo;
      const nuevoAnio = info.anio || form.anio;

      setForm((prev) => ({
        ...prev,
        marca: nuevaMarca,
        modelo: nuevoModelo,
        anio: nuevoAnio,
      }));

      if (nuevaMarca) {
        const mods = await obtenerModelos(nuevaMarca);
        setSugerenciasModelos(mods);
      }

      setVinNotice(
        nuevaMarca
          ? `VIN decodificado (${info.origen}): ${nuevaMarca} ${nuevoModelo || ''} ${nuevoAnio || ''}`.trim()
          : `Año detectado por VIN (${info.origen}): ${nuevoAnio}. Selecciona la marca y modelo.`
      );
    } catch (err) {
      if (!silencioso) {
        setFieldErrors((prev) => ({
          ...prev,
          vin: err.message || 'No fue posible decodificar el número VIN.',
        }));
      }
    } finally {
      setDecodificandoVin(false);
    }
  };

  const validarCampo = (campo, valor) => {
    if (campo === 'placas') {
      const p = String(valor || '').trim().toUpperCase();
      if (!p) return 'Ingresa las placas del vehículo (ejemplo: ABC-123-A).';
      if (p.length < 3 || p.length > 10) return 'La placa debe tener entre 3 y 10 caracteres.';
      if (!/^[A-Z0-9-]+$/.test(p)) return 'Usa únicamente letras, números y guiones (sin espacios).';
    }

    if (campo === 'vin' && String(valor || '').trim() !== '') {
      const v = String(valor).trim().toUpperCase();
      if (v.length !== 17) return `El VIN debe tener exactamente 17 caracteres (capturaste ${v.length}).`;
      if (!/^[A-Z0-9]{17}$/.test(v)) return 'El VIN solo permite letras y números sin espacios ni guiones.';
    }

    if (campo === 'marca' && !String(valor || '').trim()) {
      return 'Indica la marca del vehículo.';
    }

    if (campo === 'modelo' && !String(valor || '').trim()) {
      return 'Indica el modelo del vehículo.';
    }

    if (campo === 'anio') {
      const n = parseInt(valor, 10);
      if (isNaN(n) || n < 1950 || n > 2100) {
        return 'Ingresa un año válido entre 1950 y 2100.';
      }
    }

    if (campo === 'kilometraje') {
      const km = valor === '' ? 0 : parseInt(valor, 10);
      if (isNaN(km) || km < 0) return 'El kilometraje no puede ser negativo.';
    }

    return '';
  };

  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (fieldErrors[campo]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[campo];
        return next;
      });
    }
    if (banner?.type === 'error') setBanner(null);
  };

  const handleBlur = (campo) => {
    const err = validarCampo(campo, form[campo]);
    if (err) {
      setFieldErrors((prev) => ({ ...prev, [campo]: err }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const errores = {};
    if (!clienteActual?.id) {
      errores.cliente_id = 'Selecciona primero el cliente propietario al que pertenecerá este vehículo.';
    }
    for (const campo of ['placas', 'vin', 'marca', 'modelo', 'anio', 'kilometraje']) {
      const msg = validarCampo(campo, form[campo]);
      if (msg) errores[campo] = msg;
    }

    if (Object.keys(errores).length > 0) {
      setFieldErrors(errores);
      setBanner({
        type: 'error',
        title: 'Corrige los datos señalados antes de guardar',
        message: errores.cliente_id || 'Revisa los campos marcados en rojo en el formulario.',
      });
      setTimeout(() => bannerRef.current?.focus(), 20);
      return;
    }

    setSubmitting(true);
    setBanner(null);
    try {
      const res = await clientesService.crearVehiculo({
        cliente_id: clienteActual.id,
        placas: form.placas.trim().toUpperCase(),
        vin: form.vin.trim().toUpperCase() || null,
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        anio: parseInt(form.anio, 10),
        color: form.color.trim() || null,
        kilometraje: form.kilometraje === '' ? 0 : parseInt(form.kilometraje, 10),
      });

      setForm(VEHICULO_INICIAL);
      setSugerenciasModelos([]);
      setVinNotice(null);
      setFieldErrors({});
      setBanner({
        type: 'success',
        title: 'Vehículo registrado y vinculado',
        message: res.mensaje,
      });

      await cargarDetalleCliente(clienteActual.id);
      if (onVehiculoCreado) onVehiculoCreado(res.vehiculo, clienteActual);
    } catch (err) {
      if (err.errores && typeof err.errores === 'object') {
        setFieldErrors((prev) => ({ ...prev, ...err.errores }));
      } else if (err.campo) {
        setFieldErrors((prev) => ({ ...prev, [err.campo]: err.message }));
      }
      setBanner({
        type: 'error',
        title: 'No se pudo registrar el vehículo',
        message:
          err.message || 'Verifica que las placas y el VIN no estén duplicados e inténtalo de nuevo.',
      });
      setTimeout(() => bannerRef.current?.focus(), 20);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalDialog
      open={open}
      onClose={() => !submitting && onClose && onClose()}
      title="Vehículos del Cliente y Vinculación"
      subtitle="Consulta los autos actuales del propietario o registra una nueva unidad sin memorizar IDs."
      icon={Car}
      maxWidth="46rem"
      busy={submitting}
    >
      <div className="space-y-5">
        {banner && (
          <ModalBanner
            type={banner.type}
            title={banner.title}
            message={banner.message}
            bannerRef={bannerRef}
            onDismiss={() => setBanner(null)}
          />
        )}

        {/* 1. BLOQUE DE SELECCIÓN / VISUALIZACIÓN DEL CLIENTE PROPIETARIO */}
        <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-rose-600" />
              Propietario del vehículo
            </span>

            {clienteActual && !modoCambiarCliente && (
              <button
                type="button"
                onClick={() => setModoCambiarCliente(true)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline cursor-pointer"
              >
                Buscar otro cliente
              </button>
            )}
          </div>

          {modoCambiarCliente ? (
            <div className="space-y-2.5">
              <label htmlFor={`${baseId}-buscar-cli`} className="text-xs font-semibold text-slate-700 block">
                Busca por nombre, teléfono, correo, placa o número de cliente (ID)
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  id={`${baseId}-buscar-cli`}
                  type="search"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Ej. Alejandro, 555-7788, ABC-123 o #1..."
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                  className="pro-input w-full pl-9 pr-4 py-2 text-sm bg-white"
                />
              </div>

              <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                {buscandoClientes ? (
                  <div className="p-4 text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-rose-600" /> Buscando clientes...
                  </div>
                ) : resultadosClientes.length === 0 ? (
                  <div className="p-4 text-center space-y-2">
                    <p className="text-xs font-semibold text-slate-700">
                      {busquedaCliente
                        ? `No se encontraron clientes para "${busquedaCliente}".`
                        : 'Aún no hay clientes activos registrados.'}
                    </p>
                    {canEdit && onAbrirCrearCliente && (
                      <button
                        type="button"
                        onClick={onAbrirCrearCliente}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Registrar nuevo cliente
                      </button>
                    )}
                  </div>
                ) : (
                  resultadosClientes.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => seleccionarCliente(c)}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-rose-50/60 transition flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 truncate">{c.nombre}</span>
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            ID #{c.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          Tel: {c.telefono} {c.email ? `• ${c.email}` : ''}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-rose-600 whitespace-nowrap">
                        {c.total_vehiculos || 0} auto(s) →
                      </span>
                    </button>
                  ))
                )}
              </div>

              {clienteActual && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setModoCambiarCliente(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Mantener a {clienteActual.nombre}
                  </button>
                </div>
              )}
              <FieldError id={`${baseId}-err-cli`} message={fieldErrors.cliente_id} />
            </div>
          ) : clienteActual ? (
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-black text-slate-900">{clienteActual.nombre}</span>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                    Cliente ID #{clienteActual.id}
                  </span>
                  {clienteActual.rfc && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      RFC: {clienteActual.rfc}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {clienteActual.telefono}
                  </span>
                  {clienteActual.email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> {clienteActual.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {/* 2. VEHÍCULOS YA REGISTRADOS PARA ESTE CLIENTE */}
        {clienteActual && (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Vehículos registrados de {clienteActual.nombre} ({vehiculosCliente.length})
              </h3>
              <button
                type="button"
                onClick={() => cargarDetalleCliente(clienteActual.id)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${cargandoExpediente ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>

            {cargandoExpediente ? (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-rose-600" /> Cargando vehículos...
              </div>
            ) : vehiculosCliente.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 text-center">
                <p className="text-xs font-semibold text-slate-700">
                  Este cliente aún no tiene vehículos vinculados en el sistema.
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Completa el formulario inferior para asociarle su primer vehículo.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                {vehiculosCliente.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col justify-between gap-2.5 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {v.marca} {v.modelo} {v.anio}
                        </span>
                        <span className="license-plate text-[11px]">{v.placas}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 font-mono">
                        ID #{v.id}
                        {v.color ? ` • ${v.color}` : ''}
                        {v.kilometraje !== undefined ? ` • ${Number(v.kilometraje).toLocaleString()} km` : ''}
                      </p>
                      {v.vin && (
                        <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                          VIN: {v.vin}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
                      {onVerHistorialVehiculo && (
                        <button
                          type="button"
                          onClick={() => onVerHistorialVehiculo(v.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <History className="w-3 h-3" /> Historial y Fotos
                        </button>
                      )}
                      {canEdit && onAbrirNuevaOrdenConVehiculo && (
                        <button
                          type="button"
                          onClick={() => onAbrirNuevaOrdenConVehiculo(clienteActual, v)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 text-[11px] font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                        >
                          <FileText className="w-3 h-3" /> Nueva Orden
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 3. FORMULARIO PARA REGISTRAR UN VEHÍCULO NUEVO AL CLIENTE SELECCIONADO */}
        {canEdit && (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="pt-4 border-t border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-600" />
                Registrar nuevo vehículo
              </h3>
              <span className="text-[11px] text-slate-500">Campos con * son obligatorios</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor={`${baseId}-placas`} className="text-xs font-bold text-slate-700 block mb-1">
                  Placas <span className="text-rose-600">*</span>
                </label>
                <input
                  id={`${baseId}-placas`}
                  name="placas"
                  type="text"
                  required
                  maxLength={10}
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="ABC-123-A"
                  value={form.placas}
                  onChange={(e) => handleChange('placas', e.target.value.toUpperCase())}
                  onBlur={() => handleBlur('placas')}
                  aria-invalid={fieldErrors.placas ? 'true' : undefined}
                  aria-describedby={fieldErrors.placas ? `${baseId}-err-placas` : undefined}
                  className={`pro-input w-full text-sm p-2.5 font-mono uppercase ${
                    fieldErrors.placas ? 'pro-input-error' : ''
                  }`}
                />
                <FieldError id={`${baseId}-err-placas`} message={fieldErrors.placas} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor={`${baseId}-vin`} className="text-xs font-bold text-slate-700">
                    VIN <span className="text-slate-400 font-normal">(17 car., opcional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => ejecutarDecodificacionVin(form.vin, false)}
                    disabled={decodificandoVin || !form.vin}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 disabled:text-slate-400 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {decodificandoVin ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> Decodificando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-amber-500" /> Auto-llenar VIN
                      </>
                    )}
                  </button>
                </div>
                <input
                  id={`${baseId}-vin`}
                  name="vin"
                  type="text"
                  maxLength={17}
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="1HGCR2F83HA123456"
                  value={form.vin}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    handleChange('vin', val);
                    if (val.length === 17 && !form.marca) {
                      ejecutarDecodificacionVin(val, true);
                    }
                  }}
                  onBlur={() => handleBlur('vin')}
                  aria-invalid={fieldErrors.vin ? 'true' : undefined}
                  aria-describedby={fieldErrors.vin ? `${baseId}-err-vin` : undefined}
                  className={`pro-input w-full text-sm p-2.5 font-mono uppercase ${
                    fieldErrors.vin ? 'pro-input-error' : ''
                  }`}
                />
                <FieldError id={`${baseId}-err-vin`} message={fieldErrors.vin} />
                {vinNotice && !fieldErrors.vin && (
                  <p className="mt-1 text-[11px] font-medium text-emerald-700">{vinNotice}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor={`${baseId}-marca`} className="text-xs font-bold text-slate-700 block mb-1">
                  Marca <span className="text-rose-600">*</span>
                </label>
                <input
                  id={`${baseId}-marca`}
                  name="marca"
                  type="text"
                  required
                  list={`${baseId}-lista-marcas`}
                  placeholder="Toyota, Volkswagen, Nissan..."
                  value={form.marca}
                  onChange={(e) => cambiarMarca(e.target.value)}
                  onBlur={() => handleBlur('marca')}
                  aria-invalid={fieldErrors.marca ? 'true' : undefined}
                  aria-describedby={fieldErrors.marca ? `${baseId}-err-marca` : undefined}
                  className={`pro-input w-full text-sm p-2.5 ${fieldErrors.marca ? 'pro-input-error' : ''}`}
                />
                <datalist id={`${baseId}-lista-marcas`}>
                  {LISTA_MARCAS.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
                <FieldError id={`${baseId}-err-marca`} message={fieldErrors.marca} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor={`${baseId}-modelo`} className="text-xs font-bold text-slate-700">
                    Modelo <span className="text-rose-600">*</span>
                  </label>
                  {cargandoModelos && (
                    <span className="text-[10px] text-rose-600 font-medium flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Cargando modelos...
                    </span>
                  )}
                </div>
                <input
                  id={`${baseId}-modelo`}
                  name="modelo"
                  type="text"
                  required
                  list={`${baseId}-lista-modelos`}
                  placeholder="Corolla, Jetta, Versa..."
                  value={form.modelo}
                  onChange={(e) => handleChange('modelo', e.target.value)}
                  onBlur={() => handleBlur('modelo')}
                  aria-invalid={fieldErrors.modelo ? 'true' : undefined}
                  aria-describedby={fieldErrors.modelo ? `${baseId}-err-modelo` : undefined}
                  className={`pro-input w-full text-sm p-2.5 ${fieldErrors.modelo ? 'pro-input-error' : ''}`}
                />
                <datalist id={`${baseId}-lista-modelos`}>
                  {sugerenciasModelos.map((mod, idx) => (
                    <option key={`${mod}-${idx}`} value={mod} />
                  ))}
                </datalist>
                <FieldError id={`${baseId}-err-modelo`} message={fieldErrors.modelo} />
              </div>
            </div>

            {sugerenciasModelos.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-1.5">
                  Modelos rápidos para {form.marca}:
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                  {sugerenciasModelos.slice(0, 12).map((m, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleChange('modelo', m)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                        form.modelo === m
                          ? 'bg-rose-600 text-white border-rose-600 font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label htmlFor={`${baseId}-anio`} className="text-xs font-bold text-slate-700 block mb-1">
                  Año <span className="text-rose-600">*</span>
                </label>
                <input
                  id={`${baseId}-anio`}
                  name="anio"
                  type="number"
                  required
                  min={1950}
                  max={2100}
                  value={form.anio}
                  onChange={(e) => handleChange('anio', e.target.value)}
                  onBlur={() => handleBlur('anio')}
                  aria-invalid={fieldErrors.anio ? 'true' : undefined}
                  aria-describedby={fieldErrors.anio ? `${baseId}-err-anio` : undefined}
                  className={`pro-input w-full text-sm p-2.5 ${fieldErrors.anio ? 'pro-input-error' : ''}`}
                />
                <FieldError id={`${baseId}-err-anio`} message={fieldErrors.anio} />
              </div>

              <div>
                <label htmlFor={`${baseId}-color`} className="text-xs font-bold text-slate-700 block mb-1">
                  Color <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  id={`${baseId}-color`}
                  name="color"
                  type="text"
                  placeholder="Blanco, Gris, Rojo..."
                  value={form.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                  className="pro-input w-full text-sm p-2.5"
                />
              </div>

              <div>
                <label htmlFor={`${baseId}-km`} className="text-xs font-bold text-slate-700 block mb-1">
                  Kilometraje actual
                </label>
                <input
                  id={`${baseId}-km`}
                  name="kilometraje"
                  type="number"
                  min={0}
                  value={form.kilometraje}
                  onChange={(e) => handleChange('kilometraje', e.target.value)}
                  onBlur={() => handleBlur('kilometraje')}
                  aria-invalid={fieldErrors.kilometraje ? 'true' : undefined}
                  aria-describedby={fieldErrors.kilometraje ? `${baseId}-err-km` : undefined}
                  className={`pro-input w-full text-sm p-2.5 ${
                    fieldErrors.kilometraje ? 'pro-input-error' : ''
                  }`}
                />
                <FieldError id={`${baseId}-err-km`} message={fieldErrors.kilometraje} />
              </div>
            </div>

            {/* Confirmación explícita de vinculación antes de guardar */}
            {clienteActual && (
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between gap-2">
                <span>
                  Asociación confirmada: este vehículo se vinculará a{' '}
                  <strong>{clienteActual.nombre}</strong> (Tel. {clienteActual.telefono} • ID #{clienteActual.id}).
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="pro-btn-crimson px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Vinculando vehículo...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Guardar y Vincular Vehículo
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalDialog>
  );
}
