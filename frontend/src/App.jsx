import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Car,
  Users,
  Package,
  FileText,
  BarChart3,
  LogOut,
  Plus,
  Search,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Calendar,
  X,
  RefreshCw,
  TrendingUp,
  Shield,
  ArrowRight,
  Phone,
  Mail,
  Hash,
  Clock,
  Check,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  Loader2,
  Filter,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  authService,
  dashboardService,
  clientesService,
  refaccionesService,
  ordenesService
} from './services/api';
import { toast, alertaError, alertaAdvertencia, confirmarAccion } from './utils/alertas';
import { LISTA_MARCAS, obtenerModelos, decodificarVin } from './services/vehiculosCatalog';

// Paleta de gráficas: Carmesí Deportivo, Vino profundo, Ámbar cálido, Esmeralda, Pizarra grafito
const CHART_COLORS = ['#e11d48', '#be123c', '#f59e0b', '#10b981', '#71717a', '#3f3f46'];

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('autopro_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');

  // Estado del Login
  const [loginEmail, setLoginEmail] = useState('admin@autopro.com');
  const [loginPassword, setLoginPassword] = useState('Password123!');
  const [loginError, setLoginError] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  // Estados de datos
  const [dashboardData, setDashboardData] = useState(null);
  const [clientesData, setClientesData] = useState({ datos: [], total: 0 });
  const [vehiculosDisponibles, setVehiculosDisponibles] = useState([]);
  const [refaccionesData, setRefaccionesData] = useState({ datos: [], total: 0 });
  const [ordenesData, setOrdenesData] = useState({
    datos: [],
    total: 0,
    conteos: { total: 0, pendientes: 0, completadas: 0, entregadas: 0, canceladas: 0 }
  });
  const [reporteVentas, setReporteVentas] = useState(null);

  // Buscadores y filtros
  const [searchClientes, setSearchClientes] = useState('');
  const [searchRefacciones, setSearchRefacciones] = useState('');
  const [filtroStockBajo, setFiltroStockBajo] = useState(false);
  const [searchOrdenes, setSearchOrdenes] = useState('');
  const [filtroEstadoOrden, setFiltroEstadoOrden] = useState('');
  const [fechaInicio, setFechaInicio] = useState('2026-01-01');
  const [fechaFin, setFechaFin] = useState('2026-12-31');

  // Modales
  const [modalCliente, setModalCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', telefono: '', email: '', direccion: '', rfc: '' });
  const [modalVehiculo, setModalVehiculo] = useState(null); // id del cliente
  const [nuevoVehiculo, setNuevoVehiculo] = useState({ placas: '', vin: '', marca: '', modelo: '', anio: 2022 });
  const [sugerenciasModelos, setSugerenciasModelos] = useState([]);
  const [cargandoModelos, setCargandoModelos] = useState(false);
  const [decodificandoVin, setDecodificandoVin] = useState(false);

  const [modalNuevaOrden, setModalNuevaOrden] = useState(false);
  const [nuevaOrden, setNuevaOrden] = useState({ vehiculo_id: '', motivo: '', km_entrada: 0 });

  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [detalleOrden, setDetalleOrden] = useState(null);
  const [agregarRefData, setAgregarRefData] = useState({ refaccion_id: '', cantidad: 1 });
  const [montoPago, setMontoPago] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');

  const [notificacion, setNotificacion] = useState(null);

  const notificar = (msg, tipo = 'success') => {
    setNotificacion({ msg, tipo });
    setTimeout(() => setNotificacion(null), 4000);
  };

  // Carga inicial
  useEffect(() => {
    if (user) {
      cargarDashboard();
      cargarClientes();
      cargarRefacciones();
      cargarOrdenes();
    }
  }, [user]);

  // Cargar Dashboard
  const cargarDashboard = async () => {
    try {
      const data = await dashboardService.getStats();
      setDashboardData(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Cargar Clientes con debounce implícito si se activa por efecto
  const cargarClientes = async () => {
    try {
      const data = await clientesService.getClientes(1, searchClientes);
      setClientesData(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Debounce para búsqueda de clientes
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      cargarClientes();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchClientes]);

  // Cargar Refacciones
  const cargarRefacciones = async () => {
    try {
      const data = await refaccionesService.getRefacciones(1, searchRefacciones, filtroStockBajo);
      setRefaccionesData(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Cargar Órdenes
  const cargarOrdenes = async (estadoSobrescrito = null, busquedaSobrescrita = null) => {
    try {
      const estadoActual = estadoSobrescrito !== null ? estadoSobrescrito : filtroEstadoOrden;
      const busquedaActual = busquedaSobrescrita !== null ? busquedaSobrescrita : searchOrdenes;
      const data = await ordenesService.getOrdenes(1, busquedaActual, estadoActual);
      setOrdenesData(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Debounce para búsqueda y filtro de órdenes
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      cargarOrdenes();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchOrdenes, filtroEstadoOrden]);

  const cargarReporte = async () => {
    try {
      const data = await dashboardService.getReporteVentas({ fecha_inicio: fechaInicio, fecha_fin: fechaFin });
      setReporteVentas(data);
    } catch (e) {
      notificar(e.message, 'error');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail.trim() || !loginPassword.trim()) {
      alertaAdvertencia('Campos requeridos', 'Por favor ingresa tanto tu correo como tu contraseña.');
      return;
    }

    setLoadingLogin(true);
    try {
      const res = await authService.login({ email: loginEmail, password: loginPassword });
      localStorage.setItem('autopro_token', res.token);
      localStorage.setItem('autopro_user', JSON.stringify(res.usuario));
      setUser(res.usuario);
      toast(`¡Bienvenido al sistema, ${res.usuario.nombre}!`, 'success');
    } catch (err) {
      const mensajeError = err.message || 'No fue posible iniciar sesión. Verifica tus credenciales o el estado del servidor.';
      setLoginError(mensajeError);
      alertaError('Error de autenticación', mensajeError);
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleLogout = async () => {
    const confirmar = await confirmarAccion({
      title: '¿Cerrar sesión?',
      text: 'Tendrás que iniciar sesión nuevamente para acceder al sistema.',
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Permanecer',
      icon: 'question',
    });

    if (confirmar) {
      localStorage.removeItem('autopro_token');
      localStorage.removeItem('autopro_user');
      setUser(null);
      toast('Sesión finalizada correctamente', 'info');
    }
  };

  const handleCrearCliente = async (e) => {
    e.preventDefault();
    try {
      await clientesService.crearCliente(nuevoCliente);
      notificar('Cliente registrado exitosamente');
      setModalCliente(false);
      setNuevoCliente({ nombre: '', telefono: '', email: '', direccion: '', rfc: '' });
      cargarClientes();
      cargarDashboard();
    } catch (err) {
      notificar(err.message, 'error');
    }
  };

  const cambiarMarcaVehiculo = async (marca) => {
    setNuevoVehiculo((prev) => ({ ...prev, marca }));
    if (!marca || marca.trim().length === 0) {
      setSugerenciasModelos([]);
      return;
    }
    setCargandoModelos(true);
    try {
      const modelos = await obtenerModelos(marca);
      setSugerenciasModelos(modelos);
    } catch (_err) {
      setSugerenciasModelos([]);
    } finally {
      setCargandoModelos(false);
    }
  };

  const handleDecodificarVin = async () => {
    if (!nuevoVehiculo.vin || nuevoVehiculo.vin.trim().length !== 17) {
      toast('El VIN debe contener exactamente 17 caracteres', 'warning');
      return;
    }
    setDecodificandoVin(true);
    try {
      const info = await decodificarVin(nuevoVehiculo.vin);
      const nuevaMarca = info.marca || nuevoVehiculo.marca;
      const nuevoModelo = info.modelo || nuevoVehiculo.modelo;
      const nuevoAnio = info.anio || nuevoVehiculo.anio;

      setNuevoVehiculo((prev) => ({
        ...prev,
        marca: nuevaMarca,
        modelo: nuevoModelo,
        anio: nuevoAnio
      }));

      if (nuevaMarca) {
        const modelos = await obtenerModelos(nuevaMarca);
        setSugerenciasModelos(modelos);
      }

      toast(`VIN decodificado (${info.origen}): ${nuevaMarca || 'Detectado'} ${nuevoModelo || ''}`, 'success');
    } catch (err) {
      toast(err.message || 'Error al decodificar VIN', 'error');
    } finally {
      setDecodificandoVin(false);
    }
  };

  const handleCrearVehiculo = async (e) => {
    e.preventDefault();
    try {
      await clientesService.crearVehiculo({ ...nuevoVehiculo, cliente_id: modalVehiculo });
      notificar('Vehículo vinculado con éxito');
      setModalVehiculo(null);
      setNuevoVehiculo({ placas: '', vin: '', marca: '', modelo: '', anio: 2022 });
      setSugerenciasModelos([]);
      cargarClientes();
      cargarDashboard();
    } catch (err) {
      notificar(err.message, 'error');
    }
  };

  const handleCrearOrden = async (e) => {
    e.preventDefault();
    try {
      await ordenesService.crearOrden(nuevaOrden);
      notificar('Orden de servicio generada');
      setModalNuevaOrden(false);
      setNuevaOrden({ vehiculo_id: '', motivo: '', km_entrada: 0 });
      cargarOrdenes();
      cargarDashboard();
    } catch (err) {
      notificar(err.message, 'error');
    }
  };

  const abrirModalNuevaOrden = async () => {
    setModalNuevaOrden(true);
    try {
      const data = await clientesService.getVehiculos();
      setVehiculosDisponibles(data.datos);
    } catch (err) {
      notificar(err.message, 'error');
    }
  };

  const verDetalleOrden = async (id) => {
    setOrdenSeleccionada(id);
    try {
      const data = await ordenesService.getOrdenById(id);
      setDetalleOrden(data);
    } catch (err) {
      notificar(err.message, 'error');
    }
  };

  const handleAgregarRefaccionAOrden = async () => {
    if (!agregarRefData.refaccion_id) return notificar('Selecciona una refacción', 'error');
    try {
      await ordenesService.agregarRefaccion(ordenSeleccionada, agregarRefData);
      notificar('Refacción agregada a la orden');
      verDetalleOrden(ordenSeleccionada);
      cargarOrdenes();
    } catch (err) {
      notificar(err.message, 'error');
    }
  };

  const handleFinalizarOrden = async () => {
    const confirmar = await confirmarAccion({
      title: '¿Finalizar orden?',
      text: 'Se facturará la orden y se validará la existencia de refacciones.',
      confirmButtonText: 'Sí, finalizar orden',
      cancelButtonText: 'Seguir revisando',
      icon: 'warning',
    });
    if (!confirmar) return;

    try {
      const res = await ordenesService.finalizarOrden(ordenSeleccionada, detalleOrden.orden.diagnostico || 'Servicio completado');
      notificar(res.mensaje);
      verDetalleOrden(ordenSeleccionada);
      cargarOrdenes();
      cargarDashboard();
      cargarRefacciones();
    } catch (err) {
      notificar(err.message, 'error');
    }
  };

  const handleRegistrarPago = async () => {
    if (!montoPago || montoPago <= 0) return notificar('Ingresa un monto válido', 'error');
    try {
      const res = await ordenesService.registrarPago(ordenSeleccionada, {
        monto: parseFloat(montoPago),
        metodo: metodoPago,
        tipo: 'liquidacion',
      });
      notificar(res.mensaje);
      setMontoPago('');
      verDetalleOrden(ordenSeleccionada);
      cargarOrdenes();
      cargarDashboard();
    } catch (err) {
      notificar(err.message, 'error');
    }
  };

  // Helper para badge de estado de orden
  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'entregada':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Entregada
          </span>
        );
      case 'completada':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Completada
          </span>
        );
      case 'en_reparacion':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> En Reparación
          </span>
        );
      case 'en_revision':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> En Revisión
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span> {estado || 'Programada'}
          </span>
        );
    }
  };

  // =========================================================================
  // 1. PANTALLA DE LOGIN - SPLIT-SCREEN STUDIO & FORMULARIO CLARO PRO
  // =========================================================================
  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col lg:flex-row font-sans selection:bg-rose-500 selection:text-white">
        {/* =========================================================================
            PANEL IZQUIERDO: ATMÓSFERA AUTOMOTRIZ DE MARCA & TELEMETRÍA (STUDIO DARK)
           ========================================================================= */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 bg-zinc-950 text-white p-12 flex-col justify-between relative overflow-hidden border-r border-zinc-800/80">
          {/* Fondo sutil con cuadrícula técnica y gradiente carmesí ambiental */}
          <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:22px_22px] opacity-30 pointer-events-none"></div>
          <div className="absolute -top-28 -left-28 w-96 h-96 bg-rose-600/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-rose-950/25 rounded-full blur-3xl pointer-events-none"></div>

          {/* Logo Superior */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-950/60 ring-1 ring-white/20">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white">
                Auto<span className="text-rose-500">Pro</span>
              </span>
              <span className="ml-2.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
                PRO v1.2
              </span>
            </div>
          </div>

          {/* Contenido Central: Mensaje y Telemetría Operativa */}
          <div className="relative z-10 my-auto py-8 space-y-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Motor Transaccional ACID en línea</span>
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Control operativo de alto rendimiento para tu taller mecánico.
              </h2>
              <p className="text-sm xl:text-base text-zinc-400 max-w-md leading-relaxed">
                Centraliza órdenes de servicio, historial vehicular, piezas en almacén y cobranza en una sola consola ágil.
              </p>
            </div>

            {/* Tarjetas flotantes estilo telemetría de taller */}
            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 backdrop-blur-md flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Flujo de Órdenes de Trabajo</p>
                    <p className="text-[11px] text-zinc-400">Diagnóstico, reparación y entrega controlada</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/50 px-2 py-1 rounded-lg border border-rose-900/60">
                  En Vivo
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 backdrop-blur-md flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Integridad de Inventario & Pagos</p>
                    <p className="text-[11px] text-zinc-400">Protección contra sobreventas y descuadre</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded-lg border border-emerald-900/60">
                  Auditado
                </span>
              </div>
            </div>
          </div>

          {/* Pie del Panel Izquierdo */}
          <div className="relative z-10 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
            <span>© 2026 AutoPro Systems</span>
            <span>Equipo 05 • Gestión Automotriz</span>
          </div>
        </div>

        {/* =========================================================================
            PANEL DERECHO: FORMULARIO CLARO & LIMPIO (CLEAN SAAS PRO)
           ========================================================================= */}
        <div className="flex-1 bg-slate-50/60 lg:bg-white flex items-center justify-center p-6 sm:p-12 lg:p-16">
          <div className="w-full max-w-md space-y-7">
            {/* Cabecera del formulario (visible en móvil con logo) */}
            <div>
              <div className="lg:hidden flex items-center gap-2.5 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-rose-700 text-white flex items-center justify-center shadow-md">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-lg font-black text-slate-900">
                    Auto<span className="text-rose-600">Pro</span>
                  </span>
                  <p className="text-[11px] text-slate-400">Sistema Automotriz</p>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Iniciar Sesión
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Ingresa tus credenciales para acceder al sistema.
              </p>
            </div>

            {/* Alerta de Error */}
            {loginError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2.5 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="usuario@autopro.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-rose-600 focus:ring-3 focus:ring-rose-500/15 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Contraseña
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    onKeyDown={(e) => setCapsLockActive(e.getModifierState && e.getModifierState('CapsLock'))}
                    onKeyUp={(e) => setCapsLockActive(e.getModifierState && e.getModifierState('CapsLock'))}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-rose-600 focus:ring-3 focus:ring-rose-500/15 transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((v) => !v)}
                    title={showLoginPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Notificación de Bloq Mayús activo */}
                {capsLockActive && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg animate-in fade-in">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>Bloq Mayús está activado</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loadingLogin}
                className="pro-btn-crimson w-full py-3 rounded-xl text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
              >
                {loadingLogin ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Verificando credenciales...
                  </>
                ) : (
                  <>
                    Iniciar Sesión <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Accesos rápidos de prueba con roles (Mantenidos tal como los solicitaste) */}
            <div className="pt-6 border-t border-slate-200/80">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Acceso Demo Rápido:
                </span>
                <span className="text-[11px] text-slate-400">Roles del sistema</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('admin@autopro.com');
                    setLoginPassword('Password123!');
                  }}
                  className="p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-rose-300 rounded-xl text-left transition-all group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-rose-600 transition-colors">
                      Admin
                    </span>
                    <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded font-mono font-bold">
                      Total
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 truncate">admin@autopro.com</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('recepcion@autopro.com');
                    setLoginPassword('Password123!');
                  }}
                  className="p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-rose-300 rounded-xl text-left transition-all group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-rose-600 transition-colors">
                      Recepción
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded font-mono font-bold">
                      Piso
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 truncate">recepcion@autopro.com</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. APLICACIÓN PRINCIPAL (AUTENTICADO)
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800 selection:bg-rose-500 selection:text-white">
      {/* Notificación Toast flotante */}
      {notificacion && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-white font-medium text-sm flex items-center gap-3 transition-all transform animate-in fade-in slide-in-from-bottom-3 ${
            notificacion.tipo === 'error'
              ? 'bg-zinc-900 border border-rose-500/50 text-rose-200'
              : 'bg-zinc-900 border border-emerald-500/50 text-emerald-200'
          }`}
        >
          {notificacion.tipo === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          )}
          <span>{notificacion.msg}</span>
        </div>
      )}

      {/* Barra Lateral / Sidebar - SaaS Clean Pro Carbón con desvanecido sutil rojo */}
      <aside className="w-full md:w-64 sidebar-crimson-subtle text-zinc-300 flex flex-col flex-shrink-0 relative z-20 md:min-h-screen">
        {/* Identidad de Marca */}
        <div className="p-3 md:p-5 border-b border-zinc-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-rose-700 text-white flex items-center justify-center shadow-md shadow-rose-950/50 ring-1 ring-white/10">
            <Wrench className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white tracking-tight">AutoPro</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate">Gestión de Taller</p>
          </div>
        </div>

        {/* Navegación Principal */}
        <nav className="flex flex-row md:flex-col flex-1 p-2 md:p-3.5 gap-1 md:space-y-1 overflow-x-auto md:overflow-y-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-auto md:w-full flex-shrink-0 flex items-center gap-2 md:gap-3 px-3 md:px-3.5 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'sidebar-item-active text-white font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80 font-medium'
            }`}
          >
            <BarChart3 className="w-4 h-4 flex-shrink-0" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('ordenes')}
            className={`w-auto md:w-full flex-shrink-0 flex items-center gap-2 md:gap-3 px-3 md:px-3.5 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'ordenes'
                ? 'sidebar-item-active text-white font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80 font-medium'
            }`}
          >
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span>Órdenes de Trabajo</span>
          </button>

          <button
            onClick={() => setActiveTab('clientes')}
            className={`w-auto md:w-full flex-shrink-0 flex items-center gap-2 md:gap-3 px-3 md:px-3.5 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'clientes'
                ? 'sidebar-item-active text-white font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80 font-medium'
            }`}
          >
            <Users className="w-4 h-4 flex-shrink-0" />
            <span>Clientes y Autos</span>
          </button>

          <button
            onClick={() => setActiveTab('inventario')}
            className={`w-auto md:w-full flex-shrink-0 flex items-center gap-2 md:gap-3 px-3 md:px-3.5 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'inventario'
                ? 'sidebar-item-active text-white font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80 font-medium'
            }`}
          >
            <Package className="w-4 h-4 flex-shrink-0" />
            <span>Inventario Repuestos</span>
          </button>

          {user.rol === 'admin' && (
            <button
              onClick={() => {
                setActiveTab('reportes');
                cargarReporte();
              }}
              className={`w-auto md:w-full flex-shrink-0 flex items-center gap-2 md:gap-3 px-3 md:px-3.5 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'reportes'
                  ? 'sidebar-item-active text-white font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80 font-medium'
              }`}
            >
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>Reportes & Fechas</span>
            </button>
          )}
        </nav>

        {/* Perfil del Usuario y Cierre de Sesión */}
        <div className="p-2 md:p-3.5 border-t border-zinc-800/80 bg-zinc-950/70 flex items-center gap-2 md:block">
          <div className="flex-1 min-w-0 flex items-center gap-3 px-2 py-2 mb-0 md:mb-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-700 to-rose-500 text-white flex items-center justify-center font-bold text-xs ring-1 ring-white/10 flex-shrink-0">
              {user.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-white truncate">{user.nombre}</p>
              <p className="text-[10px] text-zinc-400 font-mono font-medium uppercase tracking-wider">{user.rol}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-auto md:w-full flex-shrink-0 flex items-center justify-center gap-2 py-2 px-3 bg-zinc-900/80 hover:bg-rose-950/50 hover:text-rose-300 text-zinc-400 border border-zinc-800/80 hover:border-rose-900/50 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* =========================================================================
            VISTA 1: DASHBOARD
           ========================================================================= */}
        {activeTab === 'dashboard' && dashboardData && (
          <div className="space-y-6">
            {/* Header del Dashboard */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Panel de Control</h1>
                <p className="text-sm text-slate-500">Métricas operativas en tiempo real, flujo vehicular y refacciones</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={cargarDashboard}
                  title="Actualizar métricas"
                  className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  Actualizar datos
                </button>
              </div>
            </div>

            {/* Tarjetas de Contadores / KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Órdenes Activas */}
              <div className="pro-card p-5 pro-card-hover">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Órdenes Activas</span>
                  <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-900">{dashboardData.resumen.ordenesActivas}</h3>
                  <span className="text-xs font-semibold text-rose-600">en taller</span>
                </div>
              </div>

              {/* Ingresos Cobrados */}
              <div className="pro-card p-5 pro-card-hover">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ingresos Cobrados</span>
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-900">
                    ${dashboardData.resumen.ingresosTotales.toFixed(2)}
                  </h3>
                  <span className="text-xs font-semibold text-emerald-600">liquidado</span>
                </div>
              </div>

              {/* Vehículos Registrados */}
              <div className="pro-card p-5 pro-card-hover">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parque Vehicular</span>
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                    <Car className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-900">{dashboardData.resumen.totalVehiculos}</h3>
                  <span className="text-xs font-semibold text-slate-500">autos</span>
                </div>
              </div>

              {/* Alertas Stock Bajo */}
              <div className="pro-card p-5 pro-card-hover">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alertas de Stock</span>
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-amber-600">{dashboardData.resumen.alertasStock}</h3>
                  <span className="text-xs font-semibold text-amber-600">reabastecer</span>
                </div>
              </div>
            </div>

            {/* Gráficas Estadísticas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfica 1: Estados de Órdenes */}
              <div className="pro-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Distribución por Estado
                    </h3>
                    <p className="text-xs text-slate-500">Órdenes de servicio activas e históricas</p>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    Total: {dashboardData.resumen.ordenesActivas} activas
                  </span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardData.graficas.ordenesPorEstado}
                        dataKey="cantidad"
                        nameKey="estado"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={45}
                        paddingAngle={3}
                        label
                      >
                        {dashboardData.graficas.ordenesPorEstado.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#09090b',
                          borderColor: '#27272a',
                          color: '#ffffff',
                          borderRadius: '0.75rem',
                          fontSize: '12px'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfica 2: Ingresos por Mes (Barras Carmesí) */}
              <div className="pro-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Facturación Recaudada
                    </h3>
                    <p className="text-xs text-slate-500">Comportamiento financiero reciente</p>
                  </div>
                  <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                    Ingresos
                  </span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.graficas.ingresosMensuales}>
                      <XAxis dataKey="mes" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                        contentStyle={{
                          backgroundColor: '#09090b',
                          borderColor: '#27272a',
                          color: '#ffffff',
                          borderRadius: '0.75rem',
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey="total" fill="#e11d48" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Actividad Reciente */}
            <div className="pro-card overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Órdenes de Servicio Recientes
                  </h3>
                  <p className="text-xs text-slate-500">Últimos movimientos registrados en el taller</p>
                </div>
                <button
                  onClick={() => {
                    setFiltroEstadoOrden('');
                    setActiveTab('ordenes');
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  Ver todas <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3">Folio</th>
                      <th className="px-6 py-3">Vehículo</th>
                      <th className="px-6 py-3">Cliente</th>
                      <th className="px-6 py-3">Estado</th>
                      <th className="px-6 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dashboardData.ordenesRecientes.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-3.5 font-mono font-bold text-rose-600">{o.folio}</td>
                        <td className="px-6 py-3.5">
                          <span className="font-semibold text-slate-800">{o.marca} {o.modelo}</span>{' '}
                          <span className="license-plate ml-1 text-xs">{o.placas}</span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-700">{o.cliente_nombre}</td>
                        <td className="px-6 py-3.5">{getEstadoBadge(o.estado)}</td>
                        <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                          ${parseFloat(o.total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            VISTA 2: ÓRDENES DE TRABAJO
           ========================================================================= */}
        {activeTab === 'ordenes' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Órdenes de Trabajo</h1>
                <p className="text-sm text-slate-500">Manejo de diagnósticos, refacciones, mano de obra y facturación transaccional</p>
              </div>
              <button
                onClick={abrirModalNuevaOrden}
                className="pro-btn-crimson flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Nueva Orden
              </button>
            </div>

            {/* Pestañas de Filtro Rápido (Todas, Pendientes, Completadas, Entregadas) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltroEstadoOrden('')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filtroEstadoOrden === '' || filtroEstadoOrden === 'todas' || filtroEstadoOrden === 'todos'
                    ? 'bg-zinc-900 text-white shadow-sm ring-2 ring-zinc-900/10'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Todas</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                    filtroEstadoOrden === '' || filtroEstadoOrden === 'todas' || filtroEstadoOrden === 'todos'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {ordenesData.conteos?.total ?? ordenesData.total ?? 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstadoOrden('pendiente')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filtroEstadoOrden === 'pendiente' || filtroEstadoOrden === 'programada' || filtroEstadoOrden === 'en_revision' || filtroEstadoOrden === 'en_reparacion'
                    ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/20'
                    : 'bg-white hover:bg-amber-50/70 text-slate-700 border border-slate-200 hover:border-amber-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-500 group-hover:text-amber-600" />
                <span>Pendientes</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                    filtroEstadoOrden === 'pendiente' || filtroEstadoOrden === 'programada' || filtroEstadoOrden === 'en_revision' || filtroEstadoOrden === 'en_reparacion'
                      ? 'bg-white/25 text-white'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {ordenesData.conteos?.pendientes ?? 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstadoOrden('completada')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filtroEstadoOrden === 'completada'
                    ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/20'
                    : 'bg-white hover:bg-rose-50/70 text-slate-700 border border-slate-200 hover:border-rose-300'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>Completadas</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                    filtroEstadoOrden === 'completada'
                      ? 'bg-white/25 text-white'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {ordenesData.conteos?.completadas ?? 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroEstadoOrden('entregada')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filtroEstadoOrden === 'entregada'
                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                    : 'bg-white hover:bg-emerald-50/70 text-slate-700 border border-slate-200 hover:border-emerald-300'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Entregadas</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                    filtroEstadoOrden === 'entregada'
                      ? 'bg-white/25 text-white'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {ordenesData.conteos?.entregadas ?? 0}
                </span>
              </button>
            </div>

            {/* Buscador y Filtros Secundarios */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por folio, placas o cliente..."
                  value={searchOrdenes}
                  onChange={(e) => setSearchOrdenes(e.target.value)}
                  className="pro-input w-full pl-10 pr-10 py-2.5 text-sm"
                />
                {searchOrdenes && (
                  <button
                    type="button"
                    onClick={() => setSearchOrdenes('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={filtroEstadoOrden}
                  onChange={(e) => setFiltroEstadoOrden(e.target.value)}
                  className="pro-input px-4 py-2.5 text-sm cursor-pointer"
                >
                  <option value="">Todos los estados</option>
                  <option value="pendiente">⚡ Pendientes (activas)</option>
                  <option value="completada">✓ Completada</option>
                  <option value="entregada">✔ Entregada</option>
                  <option disabled>──────────</option>
                  <option value="programada">Programada</option>
                  <option value="en_revision">En Revisión</option>
                  <option value="en_reparacion">En Reparación</option>
                </select>
                {(filtroEstadoOrden || searchOrdenes) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFiltroEstadoOrden('');
                      setSearchOrdenes('');
                    }}
                    title="Restablecer filtros"
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Limpiar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tabla de Órdenes */}
            <div className="pro-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5">Folio</th>
                      <th className="px-6 py-3.5">Vehículo / Placa</th>
                      <th className="px-6 py-3.5">Cliente</th>
                      <th className="px-6 py-3.5">Mecánico</th>
                      <th className="px-6 py-3.5">Estado</th>
                      <th className="px-6 py-3.5 text-right">Saldo Pendiente</th>
                      <th className="px-6 py-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ordenesData.datos.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-3.5 font-mono font-bold text-rose-600">{o.folio}</td>
                        <td className="px-6 py-3.5">
                          <span className="font-semibold text-slate-800">{o.marca} {o.modelo}</span>{' '}
                          <span className="license-plate ml-1 text-xs">{o.placas}</span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-700">{o.cliente_nombre}</td>
                        <td className="px-6 py-3.5 text-slate-600">{o.mecanico_nombre || 'Sin asignar'}</td>
                        <td className="px-6 py-3.5">{getEstadoBadge(o.estado)}</td>
                        <td className="px-6 py-3.5 text-right font-bold">
                          {parseFloat(o.saldo || o.total) <= 0 ? (
                            <span className="text-emerald-600">$0.00 Liquidado</span>
                          ) : (
                            <span className="text-rose-600">
                              ${parseFloat(o.saldo || o.total).toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <button
                            onClick={() => verDetalleOrden(o.id)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-semibold text-slate-700 transition cursor-pointer"
                          >
                            Ver Detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                    {ordenesData.datos.length === 0 && (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400 space-y-2">
                            <Filter className="w-10 h-10 text-slate-300 stroke-[1.5]" />
                            <p className="font-semibold text-slate-700">No se encontraron órdenes</p>
                            <p className="text-xs text-slate-500">
                              {filtroEstadoOrden || searchOrdenes
                                ? `No se encontraron órdenes de servicio con los filtros aplicados.`
                                : 'No hay órdenes de servicio registradas.'}
                            </p>
                            {(filtroEstadoOrden || searchOrdenes) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFiltroEstadoOrden('');
                                  setSearchOrdenes('');
                                }}
                                className="mt-2 text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                              >
                                Limpiar filtros y ver todas
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DETALLE DE ORDEN (TRANSACCIÓN, REFACCIONES Y COBRANZA) */}
        {ordenSeleccionada && detalleOrden && (
          <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-6">
              {/* Header Modal */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black text-slate-900 font-mono tracking-tight">
                      Orden {detalleOrden.orden.folio}
                    </h2>
                    {getEstadoBadge(detalleOrden.orden.estado)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {detalleOrden.orden.marca} {detalleOrden.orden.modelo} (
                    <span className="font-mono font-bold text-slate-700">{detalleOrden.orden.placas}</span>) • Cliente: {detalleOrden.orden.cliente_nombre}
                  </p>
                </div>
                <button
                  onClick={() => setOrdenSeleccionada(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Refacciones asignadas a la orden */}
              <div>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Refacciones / Piezas Utilizadas
                  </h4>
                  {detalleOrden.orden.estado !== 'entregada' && detalleOrden.orden.estado !== 'completada' && (
                    <div className="flex gap-2">
                      <select
                        onChange={(e) => setAgregarRefData({ ...agregarRefData, refaccion_id: e.target.value })}
                        className="pro-input text-xs px-2 py-1.5"
                      >
                        <option value="">Seleccionar Refacción</option>
                        {refaccionesData.datos.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nombre} (Stock: {r.stock}) - ${r.precio_publico}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={agregarRefData.cantidad}
                        onChange={(e) => setAgregarRefData({ ...agregarRefData, cantidad: parseInt(e.target.value) })}
                        className="pro-input w-16 text-xs px-2 py-1.5"
                      />
                      <button
                        onClick={handleAgregarRefaccionAOrden}
                        className="pro-btn-crimson px-3 py-1.5 text-xs rounded-lg cursor-pointer"
                      >
                        + Asignar
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs">
                  {detalleOrden.refacciones.length === 0 ? (
                    <p className="text-slate-400 italic py-2 text-center">
                      No hay refacciones asignadas a esta orden de servicio.
                    </p>
                  ) : (
                    detalleOrden.refacciones.map((r) => (
                      <div key={r.id} className="flex justify-between items-center py-2 border-b border-slate-200/60 last:border-0">
                        <div>
                          <span className="font-semibold text-slate-800">{r.nombre}</span>{' '}
                          <span className="text-slate-400">×{r.cantidad}</span>
                        </div>
                        <span className="font-bold text-slate-900">${parseFloat(r.importe).toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Botón de Cierre Transaccional (ACID) */}
              {detalleOrden.orden.estado !== 'completada' && detalleOrden.orden.estado !== 'entregada' && (
                <div className="p-4 bg-zinc-950 text-white rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-zinc-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-rose-500" />
                      <h4 className="text-sm font-bold text-white">Finalizar Orden & Actualizar Inventario</h4>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Transacción SQL atómica: descuenta existencias en almacén y congela los precios finales.
                    </p>
                  </div>
                  <button
                    onClick={handleFinalizarOrden}
                    className="pro-btn-crimson px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap cursor-pointer shadow-md"
                  >
                    Finalizar y Facturar (ACID)
                  </button>
                </div>
              )}

              {/* Cobranza y Liquidación */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Cobranza y Liquidación
                    </h4>
                    <p className="text-xs text-slate-500">
                      Saldo restante actual:{' '}
                      <b className="text-rose-600 text-sm">
                        ${parseFloat(detalleOrden.orden.saldo || detalleOrden.orden.total).toFixed(2)}
                      </b>
                    </p>
                  </div>
                  {parseFloat(detalleOrden.orden.saldo || detalleOrden.orden.total) > 0 && (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Monto $"
                        value={montoPago}
                        onChange={(e) => setMontoPago(e.target.value)}
                        className="pro-input w-28 text-xs px-2.5 py-1.5"
                      />
                      <select
                        value={metodoPago}
                        onChange={(e) => setMetodoPago(e.target.value)}
                        className="pro-input text-xs px-2.5 py-1.5"
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="transferencia">Transferencia</option>
                      </select>
                      <button
                        onClick={handleRegistrarPago}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition cursor-pointer shadow-xs"
                      >
                        Cobrar
                      </button>
                    </div>
                  )}
                </div>

                {/* Historial de pagos */}
                <div className="space-y-1.5">
                  {detalleOrden.pagos.map((p) => (
                    <div
                      key={p.id}
                      className="text-xs flex justify-between items-center bg-slate-50 border border-slate-100 p-2.5 rounded-xl"
                    >
                      <span className="text-slate-700">
                        Folio Pago: <b className="font-mono text-rose-600">{p.folio}</b> ({p.metodo})
                      </span>
                      <span className="font-bold text-emerald-700">+${parseFloat(p.monto).toFixed(2)}</span>
                    </div>
                  ))}
                  {detalleOrden.pagos.length === 0 && (
                    <p className="text-xs text-slate-400 italic py-1">No se han registrado abonos ni pagos aún.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CREAR NUEVA ORDEN */}
        {modalNuevaOrden && (
          <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-4 border-b pb-3">
                <h3 className="text-lg font-bold text-slate-900">Nueva Orden de Servicio</h3>
                <button onClick={() => setModalNuevaOrden(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCrearOrden} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Vehículo</label>
                  <select
                    required
                    value={nuevaOrden.vehiculo_id}
                    onChange={(e) => setNuevaOrden({ ...nuevaOrden, vehiculo_id: e.target.value })}
                    className="pro-input w-full text-sm p-2.5"
                  >
                    <option value="">Selecciona un vehículo registrado</option>
                    {vehiculosDisponibles.map((vehiculo) => (
                      <option key={vehiculo.id} value={vehiculo.id}>
                        {vehiculo.marca} {vehiculo.modelo} · {vehiculo.placas} · {vehiculo.cliente_nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Motivo / Síntomas Reportados</label>
                  <textarea
                    required
                    rows="3"
                    placeholder="Falla en frenos, ruido en motor, servicio de afinación..."
                    value={nuevaOrden.motivo}
                    onChange={(e) => setNuevaOrden({ ...nuevaOrden, motivo: e.target.value })}
                    className="pro-input w-full text-sm p-2.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Kilometraje de Entrada</label>
                  <input
                    type="number"
                    value={nuevaOrden.km_entrada}
                    onChange={(e) => setNuevaOrden({ ...nuevaOrden, km_entrada: e.target.value })}
                    className="pro-input w-full text-sm p-2.5"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setModalNuevaOrden(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="pro-btn-crimson px-5 py-2 rounded-xl text-sm cursor-pointer">
                    Crear Orden
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            VISTA 3: CLIENTES Y VEHÍCULOS
           ========================================================================= */}
        {activeTab === 'clientes' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Directorio de Clientes</h1>
                <p className="text-sm text-slate-500">Gestión de contactos y vehículos vinculados al taller</p>
              </div>
              <button
                onClick={() => setModalCliente(true)}
                className="pro-btn-crimson flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Nuevo Cliente
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono o correo (búsqueda con debounce)..."
                value={searchClientes}
                onChange={(e) => setSearchClientes(e.target.value)}
                className="pro-input w-full pl-10 pr-4 py-2.5 text-sm"
              />
            </div>

            <div className="pro-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5">Nombre</th>
                      <th className="px-6 py-3.5">Teléfono</th>
                      <th className="px-6 py-3.5">Email</th>
                      <th className="px-6 py-3.5">RFC</th>
                      <th className="px-6 py-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clientesData.datos.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-rose-50 text-rose-600 font-bold text-xs flex items-center justify-center border border-rose-100">
                            {c.nombre.charAt(0)}
                          </div>
                          {c.nombre}
                        </td>
                        <td className="px-6 py-3.5 text-slate-700">{c.telefono}</td>
                        <td className="px-6 py-3.5 text-slate-600">{c.email || 'N/A'}</td>
                        <td className="px-6 py-3.5 font-mono text-xs text-slate-500">{c.rfc || 'N/A'}</td>
                        <td className="px-6 py-3.5 text-center">
                          <button
                            onClick={() => setModalVehiculo(c.id)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            + Vincular Auto
                          </button>
                        </td>
                      </tr>
                    ))}
                    {clientesData.datos.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                          No se encontraron clientes registrados con este criterio de búsqueda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CREAR CLIENTE */}
        {modalCliente && (
          <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-4 border-b pb-3">
                <h3 className="text-lg font-bold text-slate-900">Registrar Nuevo Cliente</h3>
                <button onClick={() => setModalCliente(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCrearCliente} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={nuevoCliente.nombre}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                    className="pro-input w-full text-sm p-2.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    required
                    value={nuevoCliente.telefono}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                    className="pro-input w-full text-sm p-2.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={nuevoCliente.email}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                    className="pro-input w-full text-sm p-2.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">RFC (Opcional)</label>
                  <input
                    type="text"
                    value={nuevoCliente.rfc}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, rfc: e.target.value })}
                    className="pro-input w-full text-sm p-2.5 font-mono uppercase"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setModalCliente(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="pro-btn-crimson px-5 py-2 rounded-xl text-sm cursor-pointer">
                    Guardar Cliente
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL VINCULAR VEHÍCULO */}
        {modalVehiculo && (
          <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-4 border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">Vincular Vehículo al Cliente</h3>
                    <p className="text-xs text-slate-500">Autocompletado inteligente con catálogo y modelos</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setModalVehiculo(null);
                    setSugerenciasModelos([]);
                  }}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCrearVehiculo} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Placas (Auto-mayúsculas)</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="ABC-123-A"
                    value={nuevoVehiculo.placas}
                    onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, placas: e.target.value.toUpperCase() })}
                    className="pro-input w-full text-sm p-2.5 font-mono uppercase"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Número VIN (Exactamente 17 caracteres)
                    </label>
                    <button
                      type="button"
                      onClick={handleDecodificarVin}
                      disabled={decodificandoVin || !nuevoVehiculo.vin || nuevoVehiculo.vin.length !== 17}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 disabled:text-slate-300 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed transition"
                      title="Decodificar marca, modelo y año con VIN"
                    >
                      {decodificandoVin ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" /> Decodificando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-amber-500" /> Auto-llenar con VIN
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={17}
                    placeholder="1HGCR2F83HA123456"
                    value={nuevoVehiculo.vin || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setNuevoVehiculo({ ...nuevoVehiculo, vin: val });
                      if (val.length === 17 && !nuevoVehiculo.marca) {
                        decodificarVin(val).then((info) => {
                          if (info.marca) {
                            cambiarMarcaVehiculo(info.marca);
                            setNuevoVehiculo((prev) => ({
                              ...prev,
                              marca: info.marca,
                              modelo: info.modelo || prev.modelo,
                              anio: info.anio || prev.anio
                            }));
                            toast(`VIN detectado: ${info.marca} ${info.modelo || ''}`, 'info');
                          }
                        }).catch(() => {});
                      }
                    }}
                    className="pro-input w-full text-sm p-2.5 font-mono uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Marca <span className="text-slate-400 text-[10px]">(Autocompleta)</span>
                    </label>
                    <input
                      type="text"
                      required
                      list="lista-marcas-autos"
                      placeholder="Toyota, Ford, Nissan..."
                      value={nuevoVehiculo.marca}
                      onChange={(e) => cambiarMarcaVehiculo(e.target.value)}
                      className="pro-input w-full text-sm p-2.5"
                    />
                    <datalist id="lista-marcas-autos">
                      {LISTA_MARCAS.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">Modelo</label>
                      {cargandoModelos && (
                        <span className="text-[10px] text-rose-600 font-medium animate-pulse flex items-center gap-0.5">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" /> Buscando...
                        </span>
                      )}
                      {!cargandoModelos && sugerenciasModelos.length > 0 && (
                        <span className="text-[10px] text-slate-400 font-normal">
                          {sugerenciasModelos.length} opciones
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      list="lista-modelos-autos"
                      placeholder={sugerenciasModelos.length > 0 ? 'Selecciona o escribe...' : 'Corolla, Sentra...'}
                      value={nuevoVehiculo.modelo}
                      onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, modelo: e.target.value })}
                      className="pro-input w-full text-sm p-2.5"
                    />
                    <datalist id="lista-modelos-autos">
                      {sugerenciasModelos.map((mod, idx) => (
                        <option key={`${mod}-${idx}`} value={mod} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Chips de modelos sugeridos */}
                {sugerenciasModelos.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Modelos sugeridos para {nuevoVehiculo.marca}:</p>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 border border-slate-100 rounded-xl">
                      {sugerenciasModelos.slice(0, 10).map((m, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setNuevoVehiculo((prev) => ({ ...prev, modelo: m }))}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                            nuevoVehiculo.modelo === m
                              ? 'bg-rose-600 text-white border-rose-600 font-bold shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300 hover:text-rose-600'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Año</label>
                  <input
                    type="number"
                    required
                    min={1950}
                    max={2100}
                    value={nuevoVehiculo.anio}
                    onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, anio: parseInt(e.target.value) || '' })}
                    className="pro-input w-full text-sm p-2.5"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setModalVehiculo(null);
                      setSugerenciasModelos([]);
                    }}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="pro-btn-crimson px-5 py-2 rounded-xl text-sm cursor-pointer">
                    Guardar Vehículo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            VISTA 4: INVENTARIO / REFACCIONES
           ========================================================================= */}
        {activeTab === 'inventario' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Catálogo de Repuestos & Refacciones</h1>
                <p className="text-sm text-slate-500">Control de existencias, alerta de stock mínimo y precios de lista</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por SKU, descripción o marca..."
                  value={searchRefacciones}
                  onChange={(e) => setSearchRefacciones(e.target.value)}
                  onKeyUp={(e) => e.key === 'Enter' && cargarRefacciones()}
                  className="pro-input w-full pl-10 pr-4 py-2.5 text-sm"
                />
              </div>
              <button
                onClick={() => {
                  setFiltroStockBajo(!filtroStockBajo);
                  setTimeout(cargarRefacciones, 50);
                }}
                className={`px-4 py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                  filtroStockBajo
                    ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4" /> Alertas Stock Bajo
              </button>
            </div>

            <div className="pro-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5">SKU</th>
                      <th className="px-6 py-3.5">Nombre Refacción</th>
                      <th className="px-6 py-3.5">Marca</th>
                      <th className="px-6 py-3.5">Categoría</th>
                      <th className="px-6 py-3.5 text-center">Stock</th>
                      <th className="px-6 py-3.5 text-right">Precio Público</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {refaccionesData.datos.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-3.5 font-mono text-xs font-bold text-rose-600">{r.sku}</td>
                        <td className="px-6 py-3.5 font-semibold text-slate-900">{r.nombre}</td>
                        <td className="px-6 py-3.5 text-slate-600">{r.marca || 'Genérica'}</td>
                        <td className="px-6 py-3.5 text-slate-600">{r.categoria_nombre}</td>
                        <td className="px-6 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full ${
                              r.stock <= r.stock_minimo
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {r.stock} uds {r.stock <= r.stock_minimo && '⚠️ Crítico'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                          ${parseFloat(r.precio_publico).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {refaccionesData.datos.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                          No se encontraron piezas en el inventario con los criterios seleccionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            VISTA 5: REPORTES POR RANGO DE FECHAS
           ========================================================================= */}
        {activeTab === 'reportes' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reportes Financieros y de Ventas</h1>
              <p className="text-sm text-slate-500">Filtrado dinámico por rango de fechas (Fecha Inicial y Fecha Final)</p>
            </div>

            <div className="pro-card p-5 flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Fecha Inicial
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="pro-input px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Fecha Final
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="pro-input px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={cargarReporte}
                className="pro-btn-crimson px-5 py-2.5 rounded-xl text-sm cursor-pointer shadow-sm"
              >
                Generar Reporte
              </button>
            </div>

            {reporteVentas && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="pro-card p-5">
                    <span className="text-xs uppercase text-slate-500 font-bold tracking-wider">
                      Total Recaudado en el Periodo
                    </span>
                    <h3 className="text-3xl font-black text-emerald-600 mt-1">
                      ${reporteVentas.resumen.totalRecaudado.toFixed(2)}
                    </h3>
                  </div>
                  <div className="pro-card p-5">
                    <span className="text-xs uppercase text-slate-500 font-bold tracking-wider">
                      Transacciones Realizadas
                    </span>
                    <h3 className="text-3xl font-black text-slate-900 mt-1">
                      {reporteVentas.resumen.totalTransacciones}
                    </h3>
                  </div>
                </div>

                <div className="pro-card overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Detalle de Pagos Recibidos
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-bold border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-3.5">Folio Pago</th>
                          <th className="px-6 py-3.5">Orden Asociada</th>
                          <th className="px-6 py-3.5">Cliente</th>
                          <th className="px-6 py-3.5">Método</th>
                          <th className="px-6 py-3.5">Fecha y Hora</th>
                          <th className="px-6 py-3.5 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reporteVentas.datos.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-6 py-3.5 font-mono font-bold text-rose-600">{p.folio}</td>
                            <td className="px-6 py-3.5 font-mono text-xs">{p.orden_folio}</td>
                            <td className="px-6 py-3.5 text-slate-800 font-medium">{p.cliente_nombre}</td>
                            <td className="px-6 py-3.5 uppercase text-xs font-semibold">{p.metodo}</td>
                            <td className="px-6 py-3.5 text-xs text-slate-500">
                              {new Date(p.fecha_pago).toLocaleString()}
                            </td>
                            <td className="px-6 py-3.5 text-right font-bold text-emerald-600">
                              +${parseFloat(p.monto).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        {reporteVentas.datos.length === 0 && (
                          <tr>
                            <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                              No hay cobros registrados en el rango de fechas seleccionado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
