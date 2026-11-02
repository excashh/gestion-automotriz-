import React, { useState, useEffect, useRef } from 'react';
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
  ArrowRight,
  Phone,
  Mail,
  Clock,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
  Filter,
  Layers,
  Camera,
  History,
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
  Legend,
} from 'recharts';
import {
  authService,
  dashboardService,
  clientesService,
  refaccionesService,
  ordenesService,
  mecanicosService,
  limpiarCacheEvidencias,
} from './services/api';
import { toast, confirmarAccion } from './utils/alertas';
import { ModalClienteForm } from './components/ModalClienteForm';
import { ModalVehiculoCliente } from './components/ModalVehiculoCliente';
import { ModalNuevaOrden } from './components/ModalNuevaOrden';
import { ModalDetalleOrden } from './components/ModalDetalleOrden';
import { ModalHistorialVehiculo } from './components/ModalHistorialVehiculo';
import { ModalReporteEntrega } from './components/ModalReporteEntrega';
import { VistaMecanicos } from './components/VistaMecanicos';
import { ModalMecanicoForm } from './components/ModalMecanicoForm';

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

  // Estados de datos principales
  const [dashboardData, setDashboardData] = useState(null);
  const [clientesData, setClientesData] = useState({ datos: [], total: 0 });
  const [refaccionesData, setRefaccionesData] = useState({ datos: [], total: 0 });
  const [catalogoRefacciones, setCatalogoRefacciones] = useState([]);
  const [catalogosOrden, setCatalogosOrden] = useState({
    servicios: [],
    mecanicos: [],
    etapasEvidencia: [],
  });
  const [ordenesData, setOrdenesData] = useState({
    datos: [],
    total: 0,
    conteos: { total: 0, pendientes: 0, completadas: 0, entregadas: 0 },
  });
  const [mecanicosData, setMecanicosData] = useState({
    datos: [],
    resumen: {
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
    },
    especialidadesSugeridas: [],
  });
  const [loadingMecanicos, setLoadingMecanicos] = useState(false);
  const [cambiandoDisponibilidadId, setCambiandoDisponibilidadId] = useState(null);
  const [reporteVentas, setReporteVentas] = useState(null);

  // Buscadores y filtros
  const [searchClientes, setSearchClientes] = useState('');
  const [searchRefacciones, setSearchRefacciones] = useState('');
  const [filtroStockBajo, setFiltroStockBajo] = useState(false);
  const [searchOrdenes, setSearchOrdenes] = useState('');
  const [filtroEstadoOrden, setFiltroEstadoOrden] = useState('');
  const [filtroMecanicoOrden, setFiltroMecanicoOrden] = useState(null); // { id, nombre } | null
  const [searchMecanicos, setSearchMecanicos] = useState('');
  const [filtroRapidoMecanico, setFiltroRapidoMecanico] = useState('todos');
  const [fechaInicio, setFechaInicio] = useState('2026-01-01');
  const [fechaFin, setFechaFin] = useState('2026-12-31');

  // Estados de Modales modulares (Top-Layer <dialog>)
  const [modalCliente, setModalCliente] = useState(false);
  const [clienteVehiculoModal, setClienteVehiculoModal] = useState({
    open: false,
    cliente: null,
  });
  const [modalNuevaOrden, setModalNuevaOrden] = useState(false);
  const [preseleccionOrden, setPreseleccionOrden] = useState(null);
  const [modalMecanico, setModalMecanico] = useState({ open: false, mecanico: null });

  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [detalleOrden, setDetalleOrden] = useState(null);
  const [cargandoDetalleId, setCargandoDetalleId] = useState(null);

  const [historialVehiculoId, setHistorialVehiculoId] = useState(null);
  const [reporteEntregaData, setReporteEntregaData] = useState(null);

  // Continuación opcional de flujo tras crear un cliente desde otro modal
  const postClienteOrigenRef = useRef(null); // 'vehiculo' | 'orden' | null

  const [notificacion, setNotificacion] = useState(null);
  const notifTimerRef = useRef(null);

  const notificar = (msg, tipo = 'success') => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    setNotificacion({ msg, tipo });
    notifTimerRef.current = setTimeout(() => setNotificacion(null), 4200);
  };

  const canEditOperacion = Boolean(user && ['admin', 'recepcion'].includes(user.rol));
  const canCambiarDisponibilidad = Boolean(
    user && ['admin', 'recepcion', 'mecanico'].includes(user.rol)
  );

  // Sincronización ante expiración de sesión JWT (401)
  useEffect(() => {
    const handleAuthChange = () => {
      const saved = localStorage.getItem('autopro_user');
      if (!saved) {
        setUser(null);
        setOrdenSeleccionada(null);
        setDetalleOrden(null);
        setModalCliente(false);
        setClienteVehiculoModal({ open: false, cliente: null });
        setModalNuevaOrden(false);
        setModalMecanico({ open: false, mecanico: null });
        setHistorialVehiculoId(null);
        setReporteEntregaData(null);
      }
    };
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  // Carga inicial al autenticar
  useEffect(() => {
    if (user) {
      cargarDashboard();
      cargarClientes();
      cargarRefacciones();
      cargarCatalogoRefacciones();
      cargarCatalogosOrden();
      cargarOrdenes();
      cargarMecanicos();
    }
  }, [user]);

  const cargarDashboard = async () => {
    try {
      const data = await dashboardService.getStats();
      setDashboardData(data);
    } catch (e) {
      console.error(e);
    }
  };

  const cargarClientes = async (busquedaManual = null) => {
    try {
      const termino = busquedaManual !== null ? busquedaManual : searchClientes;
      const data = await clientesService.getClientes(1, termino, 20);
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

  const cargarRefacciones = async () => {
    try {
      const data = await refaccionesService.getRefacciones(1, searchRefacciones, filtroStockBajo, 20);
      setRefaccionesData(data);
    } catch (e) {
      console.error(e);
    }
  };

  const cargarCatalogoRefacciones = async () => {
    try {
      const data = await refaccionesService.getRefacciones(1, '', false, 100);
      setCatalogoRefacciones(data.datos || []);
    } catch (e) {
      console.error(e);
    }
  };

  const cargarCatalogosOrden = async () => {
    try {
      const data = await ordenesService.getCatalogos();
      setCatalogosOrden({
        servicios: data.servicios || [],
        mecanicos: data.mecanicos || [],
        etapasEvidencia: data.etapasEvidencia || [],
      });
    } catch (e) {
      console.error(e);
    }
  };

  const cargarOrdenes = async (
    estadoSobrescrito = null,
    busquedaSobrescrita = null,
    mecanicoIdSobrescrito = null
  ) => {
    try {
      const estadoActual = estadoSobrescrito !== null ? estadoSobrescrito : filtroEstadoOrden;
      const busquedaActual = busquedaSobrescrita !== null ? busquedaSobrescrita : searchOrdenes;
      const mecActual =
        mecanicoIdSobrescrito !== null
          ? mecanicoIdSobrescrito
          : filtroMecanicoOrden?.id || '';
      const data = await ordenesService.getOrdenes(1, busquedaActual, estadoActual, 50, mecActual);
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
  }, [searchOrdenes, filtroEstadoOrden, filtroMecanicoOrden]);

  const cargarMecanicos = async (
    filtroSobrescrito = null,
    busquedaSobrescrita = null
  ) => {
    setLoadingMecanicos(true);
    try {
      const filtro = filtroSobrescrito !== null ? filtroSobrescrito : filtroRapidoMecanico;
      const q = busquedaSobrescrita !== null ? busquedaSobrescrita : searchMecanicos;

      const opciones = { buscar: q };
      if (filtro === 'general' || filtro === 'especializado') {
        opciones.tipo = filtro;
      } else if (filtro === 'disponible') {
        opciones.estatus = 'disponible';
      } else if (filtro === 'pendientes') {
        opciones.conPendientes = true;
      }

      const data = await mecanicosService.getMecanicos(opciones);
      setMecanicosData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMecanicos(false);
    }
  };

  // Debounce para filtros y búsqueda de mecánicos
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      cargarMecanicos();
    }, 220);
    return () => clearTimeout(timer);
  }, [searchMecanicos, filtroRapidoMecanico]);

  const handleCambiarDisponibilidadMecanico = async (mecanico, nuevoEstatus) => {
    setCambiandoDisponibilidadId(mecanico.id);
    try {
      const res = await mecanicosService.cambiarDisponibilidad(mecanico.id, nuevoEstatus);
      notificar(res.mensaje);
      cargarMecanicos();
      cargarCatalogosOrden();
    } catch (err) {
      notificar(err.message || 'No se pudo cambiar la disponibilidad.', 'error');
    } finally {
      setCambiandoDisponibilidadId(null);
    }
  };

  const cargarReporte = async () => {
    try {
      const data = await dashboardService.getReporteVentas({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      });
      setReporteVentas(data);
    } catch (e) {
      notificar(e.message, 'error');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Ingresa tanto tu correo electrónico como tu contraseña para continuar.');
      return;
    }

    setLoadingLogin(true);
    try {
      const res = await authService.login({ email: loginEmail.trim(), password: loginPassword });
      localStorage.setItem('autopro_token', res.token);
      localStorage.setItem('autopro_user', JSON.stringify(res.usuario));
      setUser(res.usuario);
      toast(`¡Bienvenido al sistema, ${res.usuario.nombre}!`, 'success');
    } catch (err) {
      const mensajeError =
        err.message ||
        'No fue posible iniciar sesión. Verifica tus credenciales o el estado del servidor.';
      setLoginError(mensajeError);
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
      limpiarCacheEvidencias();
      setUser(null);
      toast('Sesión finalizada correctamente', 'info');
    }
  };

  const verDetalleOrden = async (id) => {
    setCargandoDetalleId(id);
    try {
      const data = await ordenesService.getOrdenById(id);
      setOrdenSeleccionada(id);
      setDetalleOrden(data);
    } catch (err) {
      notificar(err.message || 'No fue posible abrir el detalle de la orden.', 'error');
    } finally {
      setCargandoDetalleId(null);
    }
  };

  const refrescarOrdenActiva = async (recargarMetricas = false) => {
    if (!ordenSeleccionada) return;
    try {
      const data = await ordenesService.getOrdenById(ordenSeleccionada);
      setDetalleOrden(data);
      cargarOrdenes();
      cargarMecanicos();
      cargarCatalogosOrden();
      if (recargarMetricas) {
        cargarDashboard();
        cargarRefacciones();
        cargarCatalogoRefacciones();
      }
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
        {/* PANEL IZQUIERDO: ATMÓSFERA AUTOMOTRIZ DE MARCA & TELEMETRÍA (STUDIO DARK) */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 bg-zinc-950 text-white p-12 flex-col justify-between relative overflow-hidden border-r border-zinc-800/80">
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
                PRO v1.3
              </span>
            </div>
          </div>

          {/* Contenido Central: Mensaje y Telemetría Operativa */}
          <div className="relative z-10 my-auto py-8 space-y-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Motor Transaccional ACID & Evidencia Visual en línea</span>
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Control operativo de alto rendimiento para tu taller mecánico.
              </h2>
              <p className="text-sm xl:text-base text-zinc-400 max-w-md leading-relaxed">
                Centraliza órdenes de servicio, expediente fotográfico antes/después, historial vehicular, piezas en almacén y cobranza en una sola consola ágil.
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
                    <p className="text-xs font-semibold text-white">Flujo de Órdenes & Evidencia Fotográfica</p>
                    <p className="text-[11px] text-zinc-400">Diagnóstico, reparación, fotos por etapa y entrega controlada</p>
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

        {/* PANEL DERECHO: FORMULARIO CLARO & LIMPIO (CLEAN SAAS PRO) */}
        <div className="flex-1 bg-slate-50/60 lg:bg-white flex items-center justify-center p-6 sm:p-12 lg:p-16">
          <div className="w-full max-w-md space-y-7">
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

            {/* Alerta de Error Accesible */}
            {loginError && (
              <div
                role="alert"
                aria-live="assertive"
                className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl flex items-center gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleLogin} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    required
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      if (loginError) setLoginError('');
                    }}
                    placeholder="usuario@autopro.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-rose-600 focus:ring-3 focus:ring-rose-500/15 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Contraseña
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (loginError) setLoginError('');
                    }}
                    onKeyDown={(e) => setCapsLockActive(e.getModifierState && e.getModifierState('CapsLock'))}
                    onKeyUp={(e) => setCapsLockActive(e.getModifierState && e.getModifierState('CapsLock'))}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-rose-600 focus:ring-3 focus:ring-rose-500/15 transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((v) => !v)}
                    title={showLoginPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    aria-label={showLoginPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {capsLockActive && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
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

            {/* Accesos rápidos de prueba con los 3 roles */}
            <div className="pt-6 border-t border-slate-200/80">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Acceso Demo Rápido:
                </span>
                <span className="text-[11px] text-slate-400">Roles del sistema</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('admin@autopro.com');
                    setLoginPassword('Password123!');
                    setLoginError('');
                  }}
                  className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-rose-300 rounded-xl text-left transition-all group cursor-pointer shadow-xs"
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
                    setLoginError('');
                  }}
                  className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-rose-300 rounded-xl text-left transition-all group cursor-pointer shadow-xs"
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

                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('mecanico@autopro.com');
                    setLoginPassword('Password123!');
                    setLoginError('');
                  }}
                  className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-rose-300 rounded-xl text-left transition-all group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-rose-600 transition-colors">
                      Técnico
                    </span>
                    <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-mono font-bold">
                      Bahía
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 truncate">mecanico@autopro.com</p>
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
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800 selection:bg-rose-500 selection:text-white">
      {/* Notificación Toast flotante global (sobre vistas principales) */}
      {notificacion && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-[90] px-4 py-3 rounded-xl shadow-2xl text-white font-medium text-sm flex items-center gap-3 transition-all ${
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
      <aside className="w-64 sidebar-crimson-subtle text-zinc-300 flex flex-col flex-shrink-0 relative z-20">
        {/* Identidad de Marca */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center gap-3">
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
        <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
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
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
              activeTab === 'ordenes'
                ? 'sidebar-item-active text-white font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80 font-medium'
            }`}
          >
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span>Órdenes de Trabajo</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('mecanicos');
              cargarMecanicos();
            }}
            className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
              activeTab === 'mecanicos'
                ? 'sidebar-item-active text-white font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80 font-medium'
            }`}
          >
            <span className="flex items-center gap-3">
              <Wrench className="w-4 h-4 flex-shrink-0" />
              <span>Mecánicos</span>
            </span>
            {mecanicosData.resumen?.totalMecanicos > 0 && (
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                  activeTab === 'mecanicos'
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                }`}
                title="Mecánicos disponibles actualmente"
              >
                {mecanicosData.resumen.disponibles}/{mecanicosData.resumen.totalMecanicos}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('clientes')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
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
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
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
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
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
        <div className="p-3.5 border-t border-zinc-800/80 bg-zinc-950/70">
          <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-700 to-rose-500 text-white flex items-center justify-center font-bold text-xs ring-1 ring-white/10 flex-shrink-0">
              {user.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-white truncate">{user.nombre}</p>
              <p className="text-[10px] text-zinc-400 font-mono font-medium uppercase tracking-wider">
                {user.rol}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-zinc-900/80 hover:bg-rose-950/50 hover:text-rose-300 text-zinc-400 border border-zinc-800/80 hover:border-rose-900/50 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 overflow-y-auto p-6 sm:p-8 max-w-7xl mx-auto w-full">
        {/* =========================================================================
            VISTA 1: DASHBOARD
           ========================================================================= */}
        {activeTab === 'dashboard' && dashboardData && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Panel de Control</h1>
                <p className="text-sm text-slate-500">
                  Métricas operativas en tiempo real, flujo vehicular y refacciones
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={cargarDashboard}
                  title="Actualizar métricas"
                  className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  Actualizar datos
                </button>
              </div>
            </div>

            {/* Tarjetas de Contadores / KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="pro-card p-5 pro-card-hover">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Órdenes Activas
                  </span>
                  <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-900">
                    {dashboardData.resumen.ordenesActivas}
                  </h3>
                  <span className="text-xs font-semibold text-rose-600">en taller</span>
                </div>
              </div>

              <div className="pro-card p-5 pro-card-hover">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Ingresos Cobrados
                  </span>
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

              <div className="pro-card p-5 pro-card-hover">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Parque Vehicular
                  </span>
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                    <Car className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-slate-900">
                    {dashboardData.resumen.totalVehiculos}
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">autos</span>
                </div>
              </div>

              <div className="pro-card p-5 pro-card-hover">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Alertas de Stock
                  </span>
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-amber-600">
                    {dashboardData.resumen.alertasStock}
                  </h3>
                  <span className="text-xs font-semibold text-amber-600">reabastecer</span>
                </div>
              </div>
            </div>

            {/* Gráficas Estadísticas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

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
                          fontSize: '12px',
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
                      <tr
                        key={o.id}
                        onClick={() => verDetalleOrden(o.id)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-3.5 font-mono font-bold text-rose-600">{o.folio}</td>
                        <td className="px-6 py-3.5">
                          <span className="font-semibold text-slate-800">
                            {o.marca} {o.modelo}
                          </span>{' '}
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
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Órdenes de Trabajo
                </h1>
                <p className="text-sm text-slate-500">
                  Servicios, refacciones, evidencia fotográfica antes/después y cierre transaccional
                </p>
              </div>
              {canEditOperacion && (
                <button
                  onClick={() => {
                    setPreseleccionOrden(null);
                    setModalNuevaOrden(true);
                  }}
                  className="pro-btn-crimson flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Nueva Orden
                </button>
              )}
            </div>

            {/* Pestañas de Filtro Rápido */}
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
                  ['pendiente', 'programada', 'en_revision', 'en_reparacion'].includes(filtroEstadoOrden)
                    ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/20'
                    : 'bg-white hover:bg-amber-50/70 text-slate-700 border border-slate-200 hover:border-amber-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pendientes</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                    ['pendiente', 'programada', 'en_revision', 'en_reparacion'].includes(filtroEstadoOrden)
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
                <CheckCircle className="w-3.5 h-3.5" />
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
                <ShieldCheck className="w-3.5 h-3.5" />
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
                  placeholder="Buscar por folio, placas, marca/modelo o cliente..."
                  value={searchOrdenes}
                  onChange={(e) => setSearchOrdenes(e.target.value)}
                  className="pro-input w-full pl-10 pr-10 py-2.5 text-sm"
                />
                {searchOrdenes && (
                  <button
                    type="button"
                    onClick={() => setSearchOrdenes('')}
                    aria-label="Limpiar búsqueda de órdenes"
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
                {(filtroEstadoOrden || searchOrdenes || filtroMecanicoOrden) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFiltroEstadoOrden('');
                      setSearchOrdenes('');
                      setFiltroMecanicoOrden(null);
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

            {filtroMecanicoOrden && (
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                <span>
                  Mostrando órdenes asignadas al mecánico:{' '}
                  <strong>{filtroMecanicoOrden.nombre}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setFiltroMecanicoOrden(null)}
                  className="font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                >
                  Quitar filtro ×
                </button>
              </div>
            )}

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
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-rose-600">{o.folio}</span>
                            {Number(o.total_evidencias) > 0 && (
                              <span
                                title={`${o.total_evidencias} fotografía(s) registrada(s)`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700"
                              >
                                <Camera className="w-3 h-3 text-rose-600" />
                                {o.total_evidencias}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-800">
                              {o.marca} {o.modelo} {o.anio ? `(${o.anio})` : ''}
                            </span>
                            <span className="license-plate text-xs">{o.placas}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-slate-700">{o.cliente_nombre}</td>
                        <td className="px-6 py-3.5 text-slate-600">
                          {o.mecanico_nombre ? (
                            <div>
                              <span className="font-semibold text-slate-800 block">
                                {o.mecanico_nombre}
                              </span>
                              <span
                                className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 ${
                                  o.mecanico_tipo === 'general'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {o.mecanico_tipo === 'general'
                                  ? 'General'
                                  : o.mecanico_especialidad || 'Especializado'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Sin asignar</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">{getEstadoBadge(o.estado)}</td>
                        <td className="px-6 py-3.5 text-right font-bold">
                          {parseFloat(o.saldo ?? o.total) <= 0 ? (
                            <span className="text-emerald-600">$0.00 Liquidado</span>
                          ) : (
                            <span className="text-rose-600">
                              ${parseFloat(o.saldo ?? o.total).toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => verDetalleOrden(o.id)}
                              disabled={cargandoDetalleId === o.id}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-semibold text-slate-700 transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60"
                            >
                              {cargandoDetalleId === o.id && (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              )}
                              Ver Detalle
                            </button>
                            <button
                              type="button"
                              onClick={() => setHistorialVehiculoId(o.vehiculo_id)}
                              title="Ver historial del vehículo"
                              aria-label={`Ver historial del vehículo ${o.placas}`}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition cursor-pointer"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
                                ? 'No se encontraron órdenes de servicio con los filtros aplicados.'
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

        {/* =========================================================================
            VISTA: EQUIPO DE MECÁNICOS (GENERALES Y ESPECIALIZADOS)
           ========================================================================= */}
        {activeTab === 'mecanicos' && (
          <VistaMecanicos
            mecanicosData={mecanicosData}
            loading={loadingMecanicos}
            filtroRapido={filtroRapidoMecanico}
            onChangeFiltroRapido={setFiltroRapidoMecanico}
            busqueda={searchMecanicos}
            onChangeBusqueda={setSearchMecanicos}
            canEditOperacion={canEditOperacion}
            canCambiarDisponibilidad={canCambiarDisponibilidad}
            cambiandoId={cambiandoDisponibilidadId}
            onRefresh={() => {
              cargarMecanicos();
              cargarCatalogosOrden();
            }}
            onAbrirNuevoMecanico={() => setModalMecanico({ open: true, mecanico: null })}
            onEditarMecanico={(mec) => setModalMecanico({ open: true, mecanico: mec })}
            onCambiarDisponibilidad={handleCambiarDisponibilidadMecanico}
            onAsignarNuevaOrden={(mec) => {
              setPreseleccionOrden({ mecanico: mec });
              setModalNuevaOrden(true);
            }}
            onVerOrden={(ordenId) => verDetalleOrden(ordenId)}
            onFiltrarOrdenesPorMecanico={(mec) => {
              setFiltroMecanicoOrden({ id: mec.id, nombre: mec.nombre });
              setFiltroEstadoOrden('');
              setActiveTab('ordenes');
            }}
          />
        )}

        {/* =========================================================================
            VISTA 3: CLIENTES Y VEHÍCULOS
           ========================================================================= */}
        {activeTab === 'clientes' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Directorio de Clientes y Vehículos
                </h1>
                <p className="text-sm text-slate-500">
                  Consulta propietarios, revisa sus autos vinculados e historial o asocia unidades nuevas sin memorizar IDs
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setClienteVehiculoModal({ open: true, cliente: null })}
                  className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition cursor-pointer"
                >
                  <Car className="w-4 h-4 text-rose-600" />
                  {canEditOperacion ? 'Buscar Cliente / Vincular Auto' : 'Consultar Autos por Cliente'}
                </button>
                {canEditOperacion && (
                  <button
                    type="button"
                    onClick={() => {
                      postClienteOrigenRef.current = null;
                      setModalCliente(true);
                    }}
                    className="pro-btn-crimson flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Nuevo Cliente
                  </button>
                )}
              </div>
            </div>

            {/* Buscador unificado de clientes */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar cliente por nombre, teléfono, correo, RFC, placa de auto o ID (ej. #1)..."
                value={searchClientes}
                onChange={(e) => setSearchClientes(e.target.value)}
                className="pro-input w-full pl-10 pr-10 py-2.5 text-sm"
              />
              {searchClientes && (
                <button
                  type="button"
                  onClick={() => setSearchClientes('')}
                  aria-label="Limpiar búsqueda de clientes"
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="pro-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5">Cliente / ID</th>
                      <th className="px-6 py-3.5">Contacto</th>
                      <th className="px-6 py-3.5">Vehículos Registrados</th>
                      <th className="px-6 py-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clientesData.datos.map((c) => {
                      const listaVehiculos = Array.isArray(c.vehiculos) ? c.vehiculos : [];
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors align-top">
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 font-bold text-xs flex items-center justify-center border border-rose-100 flex-shrink-0 mt-0.5">
                                {c.nombre.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900">{c.nombre}</span>
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                    ID #{c.id}
                                  </span>
                                </div>
                                {c.rfc && (
                                  <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                                    RFC: {c.rfc}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="space-y-1 text-xs">
                              <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                {c.telefono}
                              </p>
                              {c.email && (
                                <p className="text-slate-500 flex items-center gap-1.5">
                                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                                  {c.email}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            {listaVehiculos.length === 0 ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 italic">
                                Sin vehículos asociados
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {listaVehiculos.map((v) => (
                                  <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => setHistorialVehiculoId(v.id)}
                                    title="Haz clic para ver historial completo y fotos de este vehículo"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-xs transition cursor-pointer group"
                                  >
                                    <Car className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600" />
                                    <span className="font-semibold text-slate-800">
                                      {v.marca} {v.modelo} ({v.anio})
                                    </span>
                                    <span className="license-plate text-[10px]">{v.placas}</span>
                                    <span className="text-[10px] font-mono text-slate-400">
                                      #{v.id}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-4 text-center">
                            <div className="inline-flex flex-wrap items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setClienteVehiculoModal({ open: true, cliente: c })
                                }
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                              >
                                {canEditOperacion
                                  ? `Autos (${listaVehiculos.length}) / + Vincular`
                                  : `Ver Autos (${listaVehiculos.length})`}
                              </button>

                              {canEditOperacion && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreseleccionOrden({
                                      cliente: c,
                                      vehiculo: listaVehiculos[0] || null,
                                    });
                                    setModalNuevaOrden(true);
                                  }}
                                  title="Abrir nueva orden para este cliente"
                                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                                >
                                  + Orden
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {clientesData.datos.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-12 text-center">
                          <div className="max-w-sm mx-auto space-y-2">
                            <Users className="w-9 h-9 text-slate-300 mx-auto" />
                            <p className="text-sm font-semibold text-slate-700">
                              {searchClientes
                                ? `Sin resultados para "${searchClientes}"`
                                : 'Aún no hay clientes registrados'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {searchClientes
                                ? 'Prueba buscando por nombre, número telefónico, placas o identificador numérico.'
                                : 'Registra el primer cliente para asociar sus vehículos y órdenes de servicio.'}
                            </p>
                            <div className="flex items-center justify-center gap-3 pt-2">
                              {searchClientes && (
                                <button
                                  type="button"
                                  onClick={() => setSearchClientes('')}
                                  className="text-xs font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                                >
                                  Limpiar búsqueda
                                </button>
                              )}
                              {canEditOperacion && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    postClienteOrigenRef.current = null;
                                    setModalCliente(true);
                                  }}
                                  className="text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                                >
                                  + Registrar nuevo cliente
                                </button>
                              )}
                            </div>
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

        {/* =========================================================================
            VISTA 4: INVENTARIO / REFACCIONES
           ========================================================================= */}
        {activeTab === 'inventario' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Catálogo de Repuestos & Refacciones
                </h1>
                <p className="text-sm text-slate-500">
                  Control de existencias, alerta de stock mínimo y precios de lista
                </p>
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
                        <td className="px-6 py-3.5 font-mono text-xs font-bold text-rose-600">
                          {r.sku}
                        </td>
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
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Reportes Financieros y de Ventas
              </h1>
              <p className="text-sm text-slate-500">
                Filtrado dinámico por rango de fechas (Fecha Inicial y Fecha Final)
              </p>
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
                            <td className="px-6 py-3.5 font-mono font-bold text-rose-600">
                              {p.folio}
                            </td>
                            <td className="px-6 py-3.5 font-mono text-xs">{p.orden_folio}</td>
                            <td className="px-6 py-3.5 text-slate-800 font-medium">
                              {p.cliente_nombre}
                            </td>
                            <td className="px-6 py-3.5 uppercase text-xs font-semibold">
                              {p.metodo}
                            </td>
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

        {/* =========================================================================
            VENTANAS MODALES ACCESIBLES EN TOP-LAYER (<dialog>)
           ========================================================================= */}

        {/* 1. Modal Registrar Nuevo Cliente */}
        <ModalClienteForm
          open={modalCliente}
          onClose={() => {
            postClienteOrigenRef.current = null;
            setModalCliente(false);
          }}
          onSaved={(clienteCreado, mensaje) => {
            notificar(mensaje || 'Cliente registrado exitosamente.');
            cargarClientes();
            cargarDashboard();

            const origen = postClienteOrigenRef.current;
            postClienteOrigenRef.current = null;

            if (origen === 'vehiculo' && clienteCreado) {
              setClienteVehiculoModal({ open: true, cliente: clienteCreado });
            } else if (origen === 'orden' && clienteCreado) {
              setPreseleccionOrden({ cliente: clienteCreado, vehiculo: null });
              setModalNuevaOrden(true);
            }
          }}
        />

        {/* 2. Modal Selección de Cliente, Expediente Vehicular y Vinculación de Vehículo */}
        <ModalVehiculoCliente
          open={clienteVehiculoModal.open}
          clienteInicial={clienteVehiculoModal.cliente}
          canEdit={canEditOperacion}
          onClose={() => setClienteVehiculoModal({ open: false, cliente: null })}
          onVehiculoCreado={() => {
            cargarClientes();
            cargarDashboard();
          }}
          onVerHistorialVehiculo={(vehiculoId) => {
            setHistorialVehiculoId(vehiculoId);
          }}
          onAbrirNuevaOrdenConVehiculo={(cliente, vehiculo) => {
            if (!canEditOperacion) return;
            setClienteVehiculoModal({ open: false, cliente: null });
            setPreseleccionOrden({ cliente, vehiculo });
            setModalNuevaOrden(true);
          }}
          onAbrirCrearCliente={() => {
            postClienteOrigenRef.current = 'vehiculo';
            setModalCliente(true);
          }}
        />

        {/* 3. Modal Crear Nueva Orden (Cliente -> Vehículo Existente o Nuevo -> Orden) */}
        <ModalNuevaOrden
          open={modalNuevaOrden}
          preseleccion={preseleccionOrden}
          catalogos={catalogosOrden}
          onRefreshCatalogos={cargarCatalogosOrden}
          onClose={() => {
            setModalNuevaOrden(false);
            setPreseleccionOrden(null);
          }}
          onOrdenCreada={(ordenCreada, mensaje) => {
            notificar(mensaje || `Orden ${ordenCreada?.folio || ''} generada exitosamente.`);
            cargarOrdenes();
            cargarMecanicos();
            cargarCatalogosOrden();
            cargarClientes();
            cargarDashboard();
            if (ordenCreada?.id) {
              verDetalleOrden(ordenCreada.id);
            }
          }}
          onAbrirCrearCliente={() => {
            postClienteOrigenRef.current = 'orden';
            setModalCliente(true);
          }}
        />

        {/* 4. Modal Detalle de Orden (Servicios, Refacciones, Evidencia Fotográfica, Cierre ACID, Pagos y Entrega) */}
        <ModalDetalleOrden
          open={Boolean(ordenSeleccionada && detalleOrden)}
          detalleOrden={detalleOrden}
          catalogos={catalogosOrden}
          refaccionesCatalogo={
            catalogoRefacciones.length > 0 ? catalogoRefacciones : refaccionesData.datos
          }
          currentUser={user}
          getEstadoBadge={getEstadoBadge}
          onClose={() => {
            setOrdenSeleccionada(null);
            setDetalleOrden(null);
          }}
          onRefreshOrden={refrescarOrdenActiva}
          onRefreshCatalogos={cargarCatalogosOrden}
          onVerHistorialVehiculo={(vehiculoId) => setHistorialVehiculoId(vehiculoId)}
          onAbrirReporteEntrega={(datos) => setReporteEntregaData(datos)}
        />

        {/* 5. Modal Historial Completo del Vehículo (Visitas, Servicios, Piezas y Fotos) */}
        <ModalHistorialVehiculo
          open={Boolean(historialVehiculoId)}
          vehiculoId={historialVehiculoId}
          getEstadoBadge={getEstadoBadge}
          onClose={() => setHistorialVehiculoId(null)}
          onAbrirOrden={(ordenId) => {
            setHistorialVehiculoId(null);
            verDetalleOrden(ordenId);
          }}
        />

        {/* 6. Modal Reporte Imprimible de Entrega con Evidencia Relevante */}
        <ModalReporteEntrega
          open={Boolean(reporteEntregaData)}
          detalleOrden={reporteEntregaData}
          onClose={() => setReporteEntregaData(null)}
        />

        {/* 7. Modal Alta / Edición de Mecánico (General o Especializado) */}
        <ModalMecanicoForm
          open={modalMecanico.open}
          mecanicoEditar={modalMecanico.mecanico}
          especialidadesSugeridas={mecanicosData.especialidadesSugeridas}
          onClose={() => setModalMecanico({ open: false, mecanico: null })}
          onSaved={(_mec, mensaje) => {
            notificar(mensaje || 'Mecánico guardado correctamente.');
            cargarMecanicos();
            cargarCatalogosOrden();
            cargarOrdenes();
          }}
        />
      </main>
    </div>
  );
}
