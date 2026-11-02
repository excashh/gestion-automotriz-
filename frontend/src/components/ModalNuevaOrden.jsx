import React, { useEffect, useId, useRef, useState } from 'react';
import {
  FileText,
  Search,
  Users,
  Car,
  Plus,
  Check,
  Loader2,
  Phone,
  Wrench,
  Camera,
} from 'lucide-react';
import { clientesService, ordenesService } from '../services/api';
import { LISTA_MARCAS, obtenerModelos } from '../services/vehiculosCatalog';
import { ModalDialog, ModalBanner, FieldError } from './ModalDialog';

export function ModalNuevaOrden({
  open,
  preseleccion = null, // { cliente, vehiculo } opcional
  catalogos = { servicios: [], mecanicos: [] },
  onRefreshCatalogos,
  onClose,
  onOrdenCreada,
  onAbrirCrearCliente,
}) {
  // Paso 1: Selección de Cliente
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clientesLista, setClientesLista] = useState([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [clienteSel, setClienteSel] = useState(null);

  // Paso 2: Selección de Vehículo Existente vs Nuevo Vehículo
  const [modoVehiculo, setModoVehiculo] = useState('existente'); // 'existente' | 'nuevo'
  const [vehiculosCliente, setVehiculosCliente] = useState([]);
  const [cargandoVehiculos, setCargandoVehiculos] = useState(false);
  const [vehiculoSel, setVehiculoSel] = useState(null);

  // Sub-formulario para vehículo nuevo dentro del flujo
  const [nuevoVeh, setNuevoVeh] = useState({
    placas: '',
    vin: '',
    marca: '',
    modelo: '',
    anio: new Date().getFullYear(),
    color: '',
    kilometraje: 0,
  });
  const [modelosSugeridos, setModelosSugeridos] = useState([]);
  const [guardandoVehiculo, setGuardandoVehiculo] = useState(false);
  const [erroresVehiculo, setErroresVehiculo] = useState({});

  // Paso 3: Datos de la Orden
  const [ordenForm, setOrdenForm] = useState({
    motivo: '',
    km_entrada: 0,
    servicio_inicial_id: '',
    mecanico_id: '',
    bahia: '',
    fecha_estimada: '',
  });

  const [erroresOrden, setErroresOrden] = useState({});
  const [banner, setBanner] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const bannerRef = useRef(null);
  const baseId = useId();

  // Inicializar al abrir
  useEffect(() => {
    if (!open) return;
    setBanner(null);
    setErroresOrden({});
    setErroresVehiculo({});
    setSubmitting(false);

    if ((!catalogos?.servicios || catalogos.servicios.length === 0) && onRefreshCatalogos) {
      onRefreshCatalogos();
    }

    if (preseleccion?.mecanico?.id) {
      setOrdenForm((prev) => ({
        ...prev,
        mecanico_id: String(preseleccion.mecanico.id),
      }));
    }

    if (preseleccion?.cliente) {
      setClienteSel(preseleccion.cliente);
      cargarVehiculosDeCliente(preseleccion.cliente.id, preseleccion.vehiculo || null);
    } else {
      setClienteSel(null);
      setVehiculoSel(null);
      setVehiculosCliente([]);
      setModoVehiculo('existente');
    }
  }, [open, preseleccion]);

  // Buscar clientes en vivo cuando aún no hay cliente seleccionado
  useEffect(() => {
    if (!open || clienteSel) return;
    let activo = true;
    setBuscandoClientes(true);

    const timer = setTimeout(async () => {
      try {
        const res = await clientesService.getClientes(1, busquedaCliente, 15);
        if (activo) setClientesLista(res.datos || []);
      } catch (_e) {
        if (activo) setClientesLista([]);
      } finally {
        if (activo) setBuscandoClientes(false);
      }
    }, 220);

    return () => {
      activo = false;
      clearTimeout(timer);
    };
  }, [open, clienteSel, busquedaCliente]);

  const cargarVehiculosDeCliente = async (clienteId, vehiculoPreferido = null) => {
    setCargandoVehiculos(true);
    try {
      const res = await clientesService.getClienteById(clienteId);
      const lista = res.vehiculos || [];
      setVehiculosCliente(lista);
      setClienteSel(res.cliente);

      if (vehiculoPreferido) {
        setVehiculoSel(vehiculoPreferido);
        setModoVehiculo('existente');
        setOrdenForm((prev) => ({
          ...prev,
          km_entrada: vehiculoPreferido.kilometraje || 0,
        }));
      } else if (lista.length > 0) {
        setModoVehiculo('existente');
        setVehiculoSel(lista[0]);
        setOrdenForm((prev) => ({
          ...prev,
          km_entrada: lista[0].kilometraje || 0,
        }));
      } else {
        setVehiculoSel(null);
        setModoVehiculo('nuevo');
      }
    } catch (err) {
      setBanner({
        type: 'error',
        title: 'Error al consultar vehículos del cliente',
        message: err.message || 'No se pudieron obtener los vehículos asociados.',
      });
    } finally {
      setCargandoVehiculos(false);
    }
  };

  const elegirVehiculoExistente = (v) => {
    setVehiculoSel(v);
    setOrdenForm((prev) => ({
      ...prev,
      km_entrada: v.kilometraje || prev.km_entrada || 0,
    }));
    setErroresOrden((prev) => {
      const next = { ...prev };
      delete next.vehiculo_id;
      return next;
    });
    if (banner?.type === 'error') setBanner(null);
  };

  const handleGuardarVehiculoInline = async () => {
    if (!clienteSel || guardandoVehiculo) return;

    const errs = {};
    const placa = nuevoVeh.placas.trim().toUpperCase();
    if (!placa || placa.length < 3 || placa.length > 10 || !/^[A-Z0-9-]+$/.test(placa)) {
      errs.placas = 'Ingresa una placa válida de 3 a 10 caracteres (letras, números o guiones).';
    }
    if (nuevoVeh.vin.trim() && !/^[A-Z0-9]{17}$/.test(nuevoVeh.vin.trim().toUpperCase())) {
      errs.vin = 'El VIN debe contener exactamente 17 caracteres alfanuméricos.';
    }
    if (!nuevoVeh.marca.trim()) errs.marca = 'Indica la marca.';
    if (!nuevoVeh.modelo.trim()) errs.modelo = 'Indica el modelo.';
    const anioNum = parseInt(nuevoVeh.anio, 10);
    if (isNaN(anioNum) || anioNum < 1950 || anioNum > 2100) {
      errs.anio = 'Ingresa un año válido (1950–2100).';
    }

    if (Object.keys(errs).length > 0) {
      setErroresVehiculo(errs);
      setBanner({
        type: 'error',
        title: 'Datos incompletos del vehículo nuevo',
        message: 'Revisa los campos señalados del vehículo antes de registrarlo.',
      });
      setTimeout(() => bannerRef.current?.focus(), 20);
      return;
    }

    setGuardandoVehiculo(true);
    setBanner(null);
    try {
      const res = await clientesService.crearVehiculo({
        cliente_id: clienteSel.id,
        placas: placa,
        vin: nuevoVeh.vin.trim().toUpperCase() || null,
        marca: nuevoVeh.marca.trim(),
        modelo: nuevoVeh.modelo.trim(),
        anio: anioNum,
        color: nuevoVeh.color.trim() || null,
        kilometraje: nuevoVeh.kilometraje === '' ? 0 : parseInt(nuevoVeh.kilometraje, 10) || 0,
      });

      const creado = res.vehiculo;
      setVehiculosCliente((prev) => [creado, ...prev]);
      setVehiculoSel(creado);
      setModoVehiculo('existente');
      setOrdenForm((prev) => ({
        ...prev,
        km_entrada: creado.kilometraje || 0,
      }));
      setNuevoVeh({
        placas: '',
        vin: '',
        marca: '',
        modelo: '',
        anio: new Date().getFullYear(),
        color: '',
        kilometraje: 0,
      });
      setErroresVehiculo({});
      setBanner({
        type: 'success',
        title: 'Vehículo registrado y seleccionado',
        message: `${creado.marca} ${creado.modelo} (${creado.placas}) quedó asociado a ${clienteSel.nombre} y listo para la orden.`,
      });
    } catch (err) {
      if (err.errores) {
        setErroresVehiculo((prev) => ({ ...prev, ...err.errores }));
      } else if (err.campo) {
        setErroresVehiculo((prev) => ({ ...prev, [err.campo]: err.message }));
      }
      setBanner({
        type: 'error',
        title: 'No se pudo registrar el vehículo',
        message: err.message || 'Verifica que las placas no estén duplicadas.',
      });
      setTimeout(() => bannerRef.current?.focus(), 20);
    } finally {
      setGuardandoVehiculo(false);
    }
  };

  const handleSubmitOrden = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const errs = {};
    if (!clienteSel) {
      errs.cliente_id = 'Selecciona primero al cliente propietario.';
    }
    if (!vehiculoSel || modoVehiculo === 'nuevo') {
      errs.vehiculo_id =
        modoVehiculo === 'nuevo'
          ? 'Confirma primero el botón "Registrar y usar este vehículo" o cambia a la pestaña de vehículo existente.'
          : 'Selecciona uno de los vehículos del cliente para abrir la orden.';
    }
    if (!ordenForm.motivo.trim() || ordenForm.motivo.trim().length < 4) {
      errs.motivo = 'Describe el motivo de ingreso o los síntomas reportados (al menos 4 caracteres).';
    }
    const km = ordenForm.km_entrada === '' ? 0 : parseInt(ordenForm.km_entrada, 10);
    if (isNaN(km) || km < 0) {
      errs.km_entrada = 'El kilometraje de entrada debe ser mayor o igual a 0.';
    }

    if (Object.keys(errs).length > 0) {
      setErroresOrden(errs);
      setBanner({
        type: 'error',
        title: 'Faltan datos para abrir la orden',
        message: errs.cliente_id || errs.vehiculo_id || errs.motivo || errs.km_entrada,
      });
      setTimeout(() => bannerRef.current?.focus(), 20);
      return;
    }

    setSubmitting(true);
    setBanner(null);
    try {
      const res = await ordenesService.crearOrden({
        vehiculo_id: vehiculoSel.id,
        motivo: ordenForm.motivo.trim(),
        km_entrada: km,
        servicio_inicial_id: ordenForm.servicio_inicial_id || null,
        mecanico_id: ordenForm.mecanico_id || null,
        bahia: ordenForm.bahia.trim() || null,
        fecha_estimada: ordenForm.fecha_estimada || null,
      });

      setOrdenForm({
        motivo: '',
        km_entrada: 0,
        servicio_inicial_id: '',
        mecanico_id: '',
        bahia: '',
        fecha_estimada: '',
      });
      if (onOrdenCreada) onOrdenCreada(res.orden, res.mensaje);
      if (onClose) onClose();
    } catch (err) {
      if (err.errores) {
        setErroresOrden((prev) => ({ ...prev, ...err.errores }));
      } else if (err.campo) {
        setErroresOrden((prev) => ({ ...prev, [err.campo]: err.message }));
      }
      setBanner({
        type: 'error',
        title: 'No se pudo generar la orden de servicio',
        message: err.message || 'Verifica los datos capturados e inténtalo nuevamente.',
      });
      setTimeout(() => bannerRef.current?.focus(), 20);
    } finally {
      setSubmitting(false);
    }
  };

  const servicioSeleccionadoObj = catalogos.servicios.find(
    (s) => String(s.id) === String(ordenForm.servicio_inicial_id)
  );
  const mecanicoSeleccionadoObj = catalogos.mecanicos.find(
    (m) => String(m.id) === String(ordenForm.mecanico_id)
  );
  const mecanicosGenerales = catalogos.mecanicos.filter((m) => m.tipo === 'general');
  const mecanicosEspecializados = catalogos.mecanicos.filter((m) => m.tipo !== 'general');

  const formatearOpcionMecanico = (m) => {
    const etiquetaDisp =
      m.estatus === 'descanso'
        ? '⚪ En descanso (No disponible)'
        : m.estatus === 'ocupado' || Number(m.ordenes_pendientes) > 0
          ? `🟠 Ocupado (${m.ordenes_pendientes || 1} pend.)`
          : '🟢 Disponible';
    return m.tipo === 'general'
      ? `${m.nombre} — General (Apto p/ todo) • ${etiquetaDisp}`
      : `${m.nombre} — ${m.especialidad} • ${etiquetaDisp}`;
  };

  return (
    <ModalDialog
      open={open}
      onClose={() => !submitting && !guardandoVehiculo && onClose && onClose()}
      title="Nueva Orden de Servicio"
      subtitle="Selecciona al cliente y su vehículo de forma guiada; el sistema resuelve los identificadores automáticamente."
      icon={FileText}
      maxWidth="46rem"
      busy={submitting || guardandoVehiculo}
    >
      <form onSubmit={handleSubmitOrden} noValidate className="space-y-5">
        {banner && (
          <ModalBanner
            type={banner.type}
            title={banner.title}
            message={banner.message}
            bannerRef={bannerRef}
            onDismiss={() => setBanner(null)}
          />
        )}

        {/* PASO 1: CLIENTE */}
        <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-rose-600" />
              1. Cliente propietario
            </span>
            {clienteSel && (
              <button
                type="button"
                onClick={() => {
                  setClienteSel(null);
                  setVehiculoSel(null);
                  setVehiculosCliente([]);
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline cursor-pointer"
              >
                Cambiar cliente
              </button>
            )}
          </div>

          {!clienteSel ? (
            <div className="space-y-2.5">
              <label htmlFor={`${baseId}-q-cli`} className="text-xs font-semibold text-slate-600 block">
                Busca por nombre, teléfono, placa del auto o número de cliente (ID)
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  id={`${baseId}-q-cli`}
                  type="search"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Ej. Beatriz, 555-2233, XYZ-987 o #2..."
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                  className="pro-input w-full pl-9 pr-4 py-2 text-sm bg-white"
                />
              </div>

              <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                {buscandoClientes ? (
                  <div className="p-4 text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-rose-600" /> Buscando...
                  </div>
                ) : clientesLista.length === 0 ? (
                  <div className="p-4 text-center space-y-2">
                    <p className="text-xs font-semibold text-slate-700">
                      {busquedaCliente
                        ? `Sin coincidencias para "${busquedaCliente}".`
                        : 'No hay clientes disponibles.'}
                    </p>
                    {onAbrirCrearCliente && (
                      <button
                        type="button"
                        onClick={onAbrirCrearCliente}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Registrar cliente nuevo
                      </button>
                    )}
                  </div>
                ) : (
                  clientesLista.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => cargarVehiculosDeCliente(c.id)}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-rose-50/60 transition flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 truncate">{c.nombre}</span>
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            ID #{c.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          Tel: {c.telefono}
                          {Array.isArray(c.vehiculos) && c.vehiculos.length > 0
                            ? ` • Autos: ${c.vehiculos.map((v) => `${v.marca} ${v.modelo} (${v.placas})`).join(', ')}`
                            : ' • Sin vehículos aún'}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-rose-600 whitespace-nowrap">
                        Seleccionar →
                      </span>
                    </button>
                  ))
                )}
              </div>
              <FieldError id={`${baseId}-err-cli`} message={erroresOrden.cliente_id} />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900">{clienteSel.nombre}</span>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                    ID #{clienteSel.id}
                  </span>
                </div>
                <p className="text-xs text-slate-600 flex items-center gap-2 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {clienteSel.telefono}
                  {clienteSel.email ? ` • ${clienteSel.email}` : ''}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* PASO 2: VEHÍCULO DEL CLIENTE (EXISTENTE VS NUEVO CLARAMENTE SEPARADOS) */}
        {clienteSel && (
          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-rose-600" />
                2. Vehículo para la orden
              </span>

              {/* Selector claro de modo: Existente vs Registrar Nuevo */}
              <div className="inline-flex rounded-xl bg-slate-200/80 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setModoVehiculo('existente')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    modoVehiculo === 'existente'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Vehículo existente ({vehiculosCliente.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModoVehiculo('nuevo')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    modoVehiculo === 'nuevo'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Plus className="w-3 h-3" /> Registrar nuevo
                </button>
              </div>
            </div>

            {modoVehiculo === 'existente' ? (
              cargandoVehiculos ? (
                <div className="p-4 text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-rose-600" /> Consultando vehículos...
                </div>
              ) : vehiculosCliente.length === 0 ? (
                <div className="p-4 rounded-xl bg-white border border-dashed border-slate-300 text-center space-y-2">
                  <p className="text-xs font-semibold text-slate-700">
                    {clienteSel.nombre} aún no tiene vehículos registrados.
                  </p>
                  <button
                    type="button"
                    onClick={() => setModoVehiculo('nuevo')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Registrar su primer vehículo aquí
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {vehiculosCliente.map((v) => {
                    const activo = vehiculoSel?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => elegirVehiculoExistente(v)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                          activo
                            ? 'bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20'
                            : 'bg-white border-slate-200 hover:border-rose-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-sm text-slate-900">
                            {v.marca} {v.modelo} {v.anio}
                          </span>
                          <span className="license-plate text-[11px]">{v.placas}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span>
                            ID #{v.id}
                            {v.color ? ` • ${v.color}` : ''} • {Number(v.kilometraje || 0).toLocaleString()} km
                          </span>
                          {activo && (
                            <span className="text-rose-700 font-sans font-bold inline-flex items-center gap-0.5">
                              <Check className="w-3.5 h-3.5" /> Seleccionado
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              /* Sub-formulario para dar de alta vehículo nuevo asociado al cliente actual */
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <p className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                  Nuevo vehículo asociado directamente a: <strong>{clienteSel.nombre}</strong> (ID #{clienteSel.id})
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Placas *</label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="ABC-123-A"
                      value={nuevoVeh.placas}
                      onChange={(e) => {
                        setNuevoVeh({ ...nuevoVeh, placas: e.target.value.toUpperCase() });
                        setErroresVehiculo((p) => ({ ...p, placas: '' }));
                      }}
                      className={`pro-input w-full text-xs p-2 font-mono uppercase ${
                        erroresVehiculo.placas ? 'pro-input-error' : ''
                      }`}
                    />
                    <FieldError message={erroresVehiculo.placas} />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Marca *</label>
                    <input
                      type="text"
                      list={`${baseId}-ord-marcas`}
                      placeholder="Nissan, Ford..."
                      value={nuevoVeh.marca}
                      onChange={async (e) => {
                        const marca = e.target.value;
                        setNuevoVeh({ ...nuevoVeh, marca });
                        setErroresVehiculo((p) => ({ ...p, marca: '' }));
                        if (marca.trim()) {
                          const mods = await obtenerModelos(marca);
                          setModelosSugeridos(mods);
                        }
                      }}
                      className={`pro-input w-full text-xs p-2 ${
                        erroresVehiculo.marca ? 'pro-input-error' : ''
                      }`}
                    />
                    <datalist id={`${baseId}-ord-marcas`}>
                      {LISTA_MARCAS.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                    <FieldError message={erroresVehiculo.marca} />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Modelo *</label>
                    <input
                      type="text"
                      list={`${baseId}-ord-modelos`}
                      placeholder="Versa, Lobo..."
                      value={nuevoVeh.modelo}
                      onChange={(e) => {
                        setNuevoVeh({ ...nuevoVeh, modelo: e.target.value });
                        setErroresVehiculo((p) => ({ ...p, modelo: '' }));
                      }}
                      className={`pro-input w-full text-xs p-2 ${
                        erroresVehiculo.modelo ? 'pro-input-error' : ''
                      }`}
                    />
                    <datalist id={`${baseId}-ord-modelos`}>
                      {modelosSugeridos.map((m, i) => (
                        <option key={`${m}-${i}`} value={m} />
                      ))}
                    </datalist>
                    <FieldError message={erroresVehiculo.modelo} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Año *</label>
                    <input
                      type="number"
                      min={1950}
                      max={2100}
                      value={nuevoVeh.anio}
                      onChange={(e) => setNuevoVeh({ ...nuevoVeh, anio: e.target.value })}
                      className={`pro-input w-full text-xs p-2 ${
                        erroresVehiculo.anio ? 'pro-input-error' : ''
                      }`}
                    />
                    <FieldError message={erroresVehiculo.anio} />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">VIN (Opcional)</label>
                    <input
                      type="text"
                      maxLength={17}
                      placeholder="17 caracteres"
                      value={nuevoVeh.vin}
                      onChange={(e) => {
                        setNuevoVeh({ ...nuevoVeh, vin: e.target.value.toUpperCase() });
                        setErroresVehiculo((p) => ({ ...p, vin: '' }));
                      }}
                      className={`pro-input w-full text-xs p-2 font-mono uppercase ${
                        erroresVehiculo.vin ? 'pro-input-error' : ''
                      }`}
                    />
                    <FieldError message={erroresVehiculo.vin} />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Kilometraje</label>
                    <input
                      type="number"
                      min={0}
                      value={nuevoVeh.kilometraje}
                      onChange={(e) => setNuevoVeh({ ...nuevoVeh, kilometraje: e.target.value })}
                      className="pro-input w-full text-xs p-2"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={guardandoVehiculo}
                    onClick={handleGuardarVehiculoInline}
                    className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {guardandoVehiculo ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Registrando unidad...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Registrar y usar este vehículo
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <FieldError id={`${baseId}-err-veh`} message={erroresOrden.vehiculo_id} />
          </section>
        )}

        {/* PASO 3: DATOS DE LA ORDEN DE REPARACIÓN */}
        <section className="space-y-3.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-rose-600" />
            3. Detalles de ingreso al taller
          </span>

          {clienteSel && vehiculoSel && modoVehiculo === 'existente' && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex flex-wrap items-center justify-between gap-2">
              <span>
                Orden para: <strong>{vehiculoSel.marca} {vehiculoSel.modelo} {vehiculoSel.anio}</strong>{' '}
                (<span className="font-mono font-bold">{vehiculoSel.placas}</span> • Vehículo ID #{vehiculoSel.id})
                — Cliente: <strong>{clienteSel.nombre}</strong>
              </span>
            </div>
          )}

          <div>
            <label htmlFor={`${baseId}-motivo`} className="text-xs font-bold text-slate-700 block mb-1">
              Motivo de ingreso / Síntomas reportados <span className="text-rose-600">*</span>
            </label>
            <textarea
              id={`${baseId}-motivo`}
              rows={3}
              required
              placeholder="Ej. Chillido al frenar en ruedas delanteras, revisión y cambio de balatas..."
              value={ordenForm.motivo}
              onChange={(e) => {
                setOrdenForm({ ...ordenForm, motivo: e.target.value });
                setErroresOrden((p) => ({ ...p, motivo: '' }));
              }}
              aria-invalid={erroresOrden.motivo ? 'true' : undefined}
              className={`pro-input w-full text-sm p-2.5 ${erroresOrden.motivo ? 'pro-input-error' : ''}`}
            />
            <FieldError message={erroresOrden.motivo} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor={`${baseId}-srv-ini`} className="text-xs font-bold text-slate-700 block mb-1">
                Servicio principal inicial <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
              <select
                id={`${baseId}-srv-ini`}
                value={ordenForm.servicio_inicial_id}
                onChange={(e) => setOrdenForm({ ...ordenForm, servicio_inicial_id: e.target.value })}
                className="pro-input w-full text-sm p-2.5"
              >
                <option value="">— Asignar después en el detalle —</option>
                {catalogos.servicios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} (${parseFloat(s.precio_base).toFixed(2)})
                    {s.area_especialidad ? ` • [${s.area_especialidad}]` : ' • [General]'}
                    {s.etapas_evidencia_obligatorias?.length > 0 ? ' 📷' : ''}
                  </option>
                ))}
              </select>
              {servicioSeleccionadoObj?.area_especialidad && (
                <p className="mt-1 text-[11px] text-slate-600 font-medium">
                  Área sugerida: <strong className="text-rose-700">{servicioSeleccionadoObj.area_especialidad}</strong> (o Mecánico General).
                </p>
              )}
              {servicioSeleccionadoObj?.etapas_evidencia_obligatorias?.length > 0 && (
                <p className="mt-1 text-[11px] text-amber-800 flex items-center gap-1 font-medium">
                  <Camera className="w-3 h-3 text-amber-600 flex-shrink-0" />
                  Este servicio solicitará evidencia fotográfica antes de entregar el vehículo.
                </p>
              )}
            </div>

            <div>
              <label htmlFor={`${baseId}-mec`} className="text-xs font-bold text-slate-700 block mb-1">
                Mecánico responsable <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
              <select
                id={`${baseId}-mec`}
                value={ordenForm.mecanico_id}
                onChange={(e) => {
                  setOrdenForm({ ...ordenForm, mecanico_id: e.target.value });
                  setErroresOrden((p) => ({ ...p, mecanico_id: '' }));
                }}
                className={`pro-input w-full text-sm p-2.5 ${
                  erroresOrden.mecanico_id ? 'pro-input-error' : ''
                }`}
              >
                <option value="">— Sin asignar aún —</option>
                {mecanicosGenerales.length > 0 && (
                  <optgroup label="1. Mecánicos Generales (Aptos para cualquier tarea)">
                    {mecanicosGenerales.map((m) => (
                      <option key={m.id} value={m.id} disabled={m.estatus === 'descanso'}>
                        {formatearOpcionMecanico(m)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {mecanicosEspecializados.length > 0 && (
                  <optgroup label="2. Mecánicos Especializados (Por rama automotriz)">
                    {mecanicosEspecializados.map((m) => (
                      <option key={m.id} value={m.id} disabled={m.estatus === 'descanso'}>
                        {formatearOpcionMecanico(m)}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <FieldError message={erroresOrden.mecanico_id} />

              {mecanicoSeleccionadoObj && (
                <div className="mt-1.5 text-[11px] leading-snug">
                  {mecanicoSeleccionadoObj.tipo === 'general' ? (
                    <span className="text-emerald-700 font-semibold">
                      ✓ Mecánico General: apto para cualquier tarea del taller ({mecanicoSeleccionadoObj.ordenes_entregadas || 0} entregadas).
                    </span>
                  ) : servicioSeleccionadoObj?.area_especialidad &&
                    servicioSeleccionadoObj.area_especialidad !== mecanicoSeleccionadoObj.especialidad ? (
                    <span className="text-amber-700 font-semibold">
                      ⚠️ Especializado en {mecanicoSeleccionadoObj.especialidad} (el servicio sugiere {servicioSeleccionadoObj.area_especialidad} o un Mecánico General).
                    </span>
                  ) : (
                    <span className="text-rose-700 font-semibold">
                      ★ Especialista en {mecanicoSeleccionadoObj.especialidad} ({mecanicoSeleccionadoObj.ordenes_entregadas || 0} entregadas).
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label htmlFor={`${baseId}-km-ent`} className="text-xs font-bold text-slate-700 block mb-1">
                Kilometraje de entrada
              </label>
              <input
                id={`${baseId}-km-ent`}
                type="number"
                min={0}
                value={ordenForm.km_entrada}
                onChange={(e) => {
                  setOrdenForm({ ...ordenForm, km_entrada: e.target.value });
                  setErroresOrden((p) => ({ ...p, km_entrada: '' }));
                }}
                className={`pro-input w-full text-sm p-2.5 ${
                  erroresOrden.km_entrada ? 'pro-input-error' : ''
                }`}
              />
              <FieldError message={erroresOrden.km_entrada} />
            </div>

            <div>
              <label htmlFor={`${baseId}-bahia`} className="text-xs font-bold text-slate-700 block mb-1">
                Bahía / Rampa <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
              <input
                id={`${baseId}-bahia`}
                type="text"
                maxLength={10}
                placeholder="Ej. B-01"
                value={ordenForm.bahia}
                onChange={(e) => setOrdenForm({ ...ordenForm, bahia: e.target.value })}
                className="pro-input w-full text-sm p-2.5"
              />
            </div>

            <div>
              <label htmlFor={`${baseId}-fecha-est`} className="text-xs font-bold text-slate-700 block mb-1">
                Entrega estimada <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
              <input
                id={`${baseId}-fecha-est`}
                type="date"
                value={ordenForm.fecha_estimada}
                onChange={(e) => setOrdenForm({ ...ordenForm, fecha_estimada: e.target.value })}
                className="pro-input w-full text-sm p-2.5"
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting || guardandoVehiculo}
            className="pro-btn-crimson px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Creando orden...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> Crear Orden de Servicio
              </>
            )}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
