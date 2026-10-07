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
  Clock,
  DollarSign,
  Calendar,
  X,
  RefreshCw
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

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

  // Estados de datos
  const [dashboardData, setDashboardData] = useState(null);
  const [clientesData, setClientesData] = useState({ datos: [], total: 0 });
  const [refaccionesData, setRefaccionesData] = useState({ datos: [], total: 0 });
  const [ordenesData, setOrdenesData] = useState({ datos: [], total: 0 });
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

  const [modalNuevaOrden, setModalNuevaOrden] = useState(false);
  const [nuevaOrden, setNuevaOrden] = useState({ vehiculo_id: '', motivo: '', km_entrada: 0 });

  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [detalleOrden, setDetalleOrden] = useState(null);
  const [agregarRefData, setAgregarRefData] = useState({ refaccion_id: '', cantidad: 1 });
  const [agregarSrvData, setAgregarSrvData] = useState({ servicio_id: 1, cantidad: 1 });
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

  // Cargar Clientes
  const cargarClientes = async () => {
    try {
      const data = await clientesService.getClientes(1, searchClientes);
      setClientesData(data);
    } catch (e) {
      console.error(e);
    }
  };

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
  const cargarOrdenes = async () => {
    try {
      const data = await ordenesService.getOrdenes(1, searchOrdenes, filtroEstadoOrden);
      setOrdenesData(data);
    } catch (e) {
      console.error(e);
    }
  };

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
    setLoadingLogin(true);
    try {
      const res = await authService.login({ email: loginEmail, password: loginPassword });
      localStorage.setItem('autopro_token', res.token);
      localStorage.setItem('autopro_user', JSON.stringify(res.usuario));
      setUser(res.usuario);
      notificar(`¡Bienvenido, ${res.usuario.nombre}!`);
    } catch (err) {
      setLoginError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('autopro_token');
    localStorage.removeItem('autopro_user');
    setUser(null);
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

  const handleCrearVehiculo = async (e) => {
    e.preventDefault();
    try {
      await clientesService.crearVehiculo({ ...nuevoVehiculo, cliente_id: modalVehiculo });
      notificar('Vehículo vinculado con éxito');
      setModalVehiculo(null);
      setNuevoVehiculo({ placas: '', vin: '', marca: '', modelo: '', anio: 2022 });
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
    if (!window.confirm('¿Confirmas finalizar y facturar esta orden? Se validará el stock en una transacción ACID.')) return;
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

  // PANTALLA DE LOGIN
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/30">
              <Wrench className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">AutoPro</h1>
              <p className="text-xs text-slate-500 font-medium">Gestión Automotriz & POS</p>
            </div>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Contraseña</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loadingLogin}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition disabled:opacity-50 text-sm"
            >
              {loadingLogin ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-2">Usuarios demo con RBAC:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => { setLoginEmail('admin@autopro.com'); setLoginPassword('Password123!'); }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium text-left"
              >
                👑 <b>Admin</b> (Total)
              </button>
              <button
                type="button"
                onClick={() => { setLoginEmail('recepcion@autopro.com'); setLoginPassword('Password123!'); }}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium text-left"
              >
                📋 <b>Recepción</b>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PANTALLA PRINCIPAL CON AUTENTICACIÓN
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Notificación Toast */}
      {notificacion && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-white font-medium text-sm flex items-center gap-2 transition ${
            notificacion.tipo === 'error' ? 'bg-red-600' : 'bg-emerald-600'
          }`}
        >
          {notificacion.tipo === 'error' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span>{notificacion.msg}</span>
        </div>
      )}

      {/* Barra Lateral / Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">Gestion Automotriz</h2>
            <span className="text-xs text-blue-400 font-medium uppercase tracking-wider">{user.rol}</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Dashboard
          </button>

          <button
            onClick={() => setActiveTab('ordenes')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'ordenes' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" /> Órdenes de Trabajo
          </button>

          <button
            onClick={() => setActiveTab('clientes')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'clientes' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" /> Clientes y Autos
          </button>

          <button
            onClick={() => setActiveTab('inventario')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'inventario' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" /> Inventario Repuestos
          </button>

          {user.rol === 'admin' && (
            <button
              onClick={() => { setActiveTab('reportes'); cargarReporte(); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'reportes' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" /> Reportes & Fechas
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="mb-3 px-2">
            <p className="text-xs text-slate-400 font-semibold">{user.nombre}</p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-red-600/80 hover:text-white text-slate-400 rounded-lg text-xs font-semibold transition"
          >
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 overflow-y-auto p-8">
        {/* VISTA 1: DASHBOARD */}
        {activeTab === 'dashboard' && dashboardData && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">Panel de Control General</h1>
                <p className="text-sm text-slate-500">Métricas en tiempo real, órdenes activas y estado de inventario</p>
              </div>
              <button
                onClick={cargarDashboard}
                className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Tarjetas de Contadores (Req #12) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Órdenes Activas</span>
                  <h3 className="text-2xl font-black text-slate-800">{dashboardData.resumen.ordenesActivas}</h3>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Ingresos Cobrados</span>
                  <h3 className="text-2xl font-black text-slate-800">${dashboardData.resumen.ingresosTotales.toFixed(2)}</h3>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Vehículos Registrados</span>
                  <h3 className="text-2xl font-black text-slate-800">{dashboardData.resumen.totalVehiculos}</h3>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Alertas Stock Bajo</span>
                  <h3 className="text-2xl font-black text-amber-600">{dashboardData.resumen.alertasStock}</h3>
                </div>
              </div>
            </div>

            {/* Gráficas Dinámicas Reales (Req #24) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gráfica 1: Estados de Órdenes */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 mb-4">Órdenes de Trabajo por Estado</h3>
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
                        label
                      >
                        {dashboardData.graficas.ordenesPorEstado.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfica 2: Ingresos por Mes */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 mb-4">Ingresos Recaudados (Últimos Periodos)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.graficas.ingresosMensuales}>
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Actividad Reciente */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-base font-bold text-slate-800">Órdenes de Servicio Recientes</h3>
              </div>
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-400 font-semibold">
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
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3.5 font-bold text-blue-600">{o.folio}</td>
                      <td className="px-6 py-3.5">{o.marca} {o.modelo} ({o.placas})</td>
                      <td className="px-6 py-3.5">{o.cliente_nombre}</td>
                      <td className="px-6 py-3.5">
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                          {o.estado}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-slate-800">${parseFloat(o.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VISTA 2: ÓRDENES DE TRABAJO */}
        {activeTab === 'ordenes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">Órdenes de Trabajo</h1>
                <p className="text-sm text-slate-500">Manejo de diagnósticos, refacciones, mano de obra y facturación transaccional</p>
              </div>
              <button
                onClick={() => setModalNuevaOrden(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm text-sm"
              >
                <Plus className="w-4 h-4" /> Nueva Orden
              </button>
            </div>

            {/* Filtros y Buscador */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por folio, placa o cliente..."
                  value={searchOrdenes}
                  onChange={(e) => setSearchOrdenes(e.target.value)}
                  onKeyUp={(e) => e.key === 'Enter' && cargarOrdenes()}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filtroEstadoOrden}
                onChange={(e) => { setFiltroEstadoOrden(e.target.value); setTimeout(cargarOrdenes, 50); }}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none"
              >
                <option value="">Todos los estados</option>
                <option value="programada">Programada</option>
                <option value="en_revision">En Revisión</option>
                <option value="en_reparacion">En Reparación</option>
                <option value="completada">Completada</option>
                <option value="entregada">Entregada</option>
              </select>
            </div>

            {/* Tabla de Órdenes */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-400 font-semibold">
                  <tr>
                    <th className="px-6 py-3">Folio</th>
                    <th className="px-6 py-3">Vehículo / Placa</th>
                    <th className="px-6 py-3">Cliente</th>
                    <th className="px-6 py-3">Mecánico</th>
                    <th className="px-6 py-3">Estado</th>
                    <th className="px-6 py-3 text-right">Saldo Pendiente</th>
                    <th className="px-6 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ordenesData.datos.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3.5 font-bold text-blue-600">{o.folio}</td>
                      <td className="px-6 py-3.5">{o.marca} {o.modelo} <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">{o.placas}</span></td>
                      <td className="px-6 py-3.5">{o.cliente_nombre}</td>
                      <td className="px-6 py-3.5">{o.mecanico_nombre || 'Sin asignar'}</td>
                      <td className="px-6 py-3.5">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                          o.estado === 'entregada' ? 'bg-emerald-100 text-emerald-700' :
                          o.estado === 'completada' ? 'bg-blue-100 text-blue-700' :
                          o.estado === 'en_reparacion' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {o.estado}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-slate-800">
                        ${o.saldo ? parseFloat(o.saldo).toFixed(2) : parseFloat(o.total).toFixed(2)}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <button
                          onClick={() => verDetalleOrden(o.id)}
                          className="px-3 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold text-slate-700 transition"
                        >
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL DETALLE DE ORDEN (TRANSACCIÓN Y COBRO) */}
        {ordenSeleccionada && detalleOrden && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-800">Orden {detalleOrden.orden.folio}</h2>
                  <p className="text-xs text-slate-500">
                    {detalleOrden.orden.marca} {detalleOrden.orden.modelo} ({detalleOrden.orden.placas}) • Cliente: {detalleOrden.orden.cliente_nombre}
                  </p>
                </div>
                <button onClick={() => setOrdenSeleccionada(null)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Refacciones asignadas a la orden */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-bold text-slate-800">Refacciones / Piezas Utilizadas</h4>
                  {detalleOrden.orden.estado !== 'entregada' && (
                    <div className="flex gap-2">
                      <select
                        onChange={(e) => setAgregarRefData({ ...agregarRefData, refaccion_id: e.target.value })}
                        className="text-xs border p-1 rounded"
                      >
                        <option value="">Seleccionar Refacción</option>
                        {refaccionesData.datos.map((r) => (
                          <option key={r.id} value={r.id}>{r.nombre} (Stock: {r.stock}) - ${r.precio_publico}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={agregarRefData.cantidad}
                        onChange={(e) => setAgregarRefData({ ...agregarRefData, cantidad: parseInt(e.target.value) })}
                        className="w-16 text-xs border p-1 rounded"
                      />
                      <button
                        onClick={handleAgregarRefaccionAOrden}
                        className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700"
                      >
                        + Asignar
                      </button>
                    </div>
                  )}
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-xs">
                  {detalleOrden.refacciones.length === 0 ? (
                    <p className="text-slate-400 italic">No hay refacciones asignadas a esta orden.</p>
                  ) : (
                    detalleOrden.refacciones.map((r) => (
                      <div key={r.id} className="flex justify-between py-1 border-b last:border-0">
                        <span>{r.nombre} (x{r.cantidad})</span>
                        <span className="font-semibold">${parseFloat(r.importe).toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Botón de Cierre Transaccional (ACID) */}
              {detalleOrden.orden.estado !== 'completada' && detalleOrden.orden.estado !== 'entregada' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-blue-900">Finalizar Orden & Actualizar Inventario</h4>
                    <p className="text-xs text-blue-700">Ejecuta la transacción SQL: descuenta stock, fija importes y bloquea para entrega.</p>
                  </div>
                  <button
                    onClick={handleFinalizarOrden}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow"
                  >
                    Finalizar y Facturar (ACID)
                  </button>
                </div>
              )}

              {/* Cobranza y Pagos */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Pagos y Liquidación</h4>
                    <p className="text-xs text-slate-500">Saldo pendiente actual: <b className="text-slate-800">${parseFloat(detalleOrden.orden.saldo || detalleOrden.orden.total).toFixed(2)}</b></p>
                  </div>
                  {parseFloat(detalleOrden.orden.saldo || detalleOrden.orden.total) > 0 && (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Monto $"
                        value={montoPago}
                        onChange={(e) => setMontoPago(e.target.value)}
                        className="w-24 text-xs border p-1 rounded"
                      />
                      <select
                        value={metodoPago}
                        onChange={(e) => setMetodoPago(e.target.value)}
                        className="text-xs border p-1 rounded"
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="transferencia">Transferencia</option>
                      </select>
                      <button
                        onClick={handleRegistrarPago}
                        className="px-3 py-1 bg-emerald-600 text-white font-semibold text-xs rounded hover:bg-emerald-700"
                      >
                        Cobrar
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  {detalleOrden.pagos.map((p) => (
                    <div key={p.id} className="text-xs flex justify-between bg-slate-50 p-2 rounded">
                      <span>Folio: <b>{p.folio}</b> ({p.metodo})</span>
                      <span className="font-bold text-emerald-700">+${parseFloat(p.monto).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CREAR NUEVA ORDEN */}
        {modalNuevaOrden && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Nueva Orden de Servicio</h3>
              <form onSubmit={handleCrearOrden} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">ID del Vehículo (Registrado)</label>
                  <input
                    type="number"
                    required
                    placeholder="Ej. 1"
                    value={nuevaOrden.vehiculo_id}
                    onChange={(e) => setNuevaOrden({ ...nuevaOrden, vehiculo_id: e.target.value })}
                    className="w-full text-sm border p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Motivo / Síntomas</label>
                  <textarea
                    required
                    placeholder="Falla en frenos, ruido en motor, etc."
                    value={nuevaOrden.motivo}
                    onChange={(e) => setNuevaOrden({ ...nuevaOrden, motivo: e.target.value })}
                    className="w-full text-sm border p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Kilometraje de Entrada</label>
                  <input
                    type="number"
                    value={nuevaOrden.km_entrada}
                    onChange={(e) => setNuevaOrden({ ...nuevaOrden, km_entrada: e.target.value })}
                    className="w-full text-sm border p-2 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setModalNuevaOrden(false)}
                    className="px-4 py-2 border rounded-lg text-sm"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg text-sm">
                    Crear Orden
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* VISTA 3: CLIENTES Y VEHÍCULOS */}
        {activeTab === 'clientes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">Directorio de Clientes</h1>
                <p className="text-sm text-slate-500">Gestión de datos de contacto y parque vehicular vinculado</p>
              </div>
              <button
                onClick={() => setModalCliente(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm text-sm"
              >
                <Plus className="w-4 h-4" /> Nuevo Cliente
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono o correo..."
                value={searchClientes}
                onChange={(e) => setSearchClientes(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && cargarClientes()}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-400 font-semibold">
                  <tr>
                    <th className="px-6 py-3">Nombre</th>
                    <th className="px-6 py-3">Teléfono</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">RFC</th>
                    <th className="px-6 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientesData.datos.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3.5 font-bold text-slate-800">{c.nombre}</td>
                      <td className="px-6 py-3.5">{c.telefono}</td>
                      <td className="px-6 py-3.5">{c.email || 'N/A'}</td>
                      <td className="px-6 py-3.5 font-mono text-xs">{c.rfc || 'N/A'}</td>
                      <td className="px-6 py-3.5 text-center">
                        <button
                          onClick={() => setModalVehiculo(c.id)}
                          className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold transition"
                        >
                          + Vincular Auto
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL CREAR CLIENTE */}
        {modalCliente && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Registrar Nuevo Cliente</h3>
              <form onSubmit={handleCrearCliente} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={nuevoCliente.nombre}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                    className="w-full text-sm border p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Teléfono</label>
                  <input
                    type="text"
                    required
                    value={nuevoCliente.telefono}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                    className="w-full text-sm border p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Email</label>
                  <input
                    type="email"
                    value={nuevoCliente.email}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                    className="w-full text-sm border p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">RFC (Opcional)</label>
                  <input
                    type="text"
                    value={nuevoCliente.rfc}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, rfc: e.target.value })}
                    className="w-full text-sm border p-2 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button type="button" onClick={() => setModalCliente(false)} className="px-4 py-2 border rounded-lg text-sm">
                    Cancelar
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg text-sm">
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL VINCULAR VEHÍCULO */}
        {modalVehiculo && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Vincular Vehículo al Cliente</h3>
              <form onSubmit={handleCrearVehiculo} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Placas</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="ABC-123-A"
                    value={nuevoVehiculo.placas}
                    onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, placas: e.target.value.toUpperCase() })}
                    className="w-full text-sm border p-2 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Número VIN (17 caracteres, opcional)</label>
                  <input
                    type="text"
                    maxLength={17}
                    placeholder="1HGCR2F83HA123456"
                    value={nuevoVehiculo.vin || ''}
                    onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, vin: e.target.value.toUpperCase() })}
                    className="w-full text-sm border p-2 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Marca</label>
                  <input
                    type="text"
                    required
                    placeholder="Toyota, Ford, etc."
                    value={nuevoVehiculo.marca}
                    onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, marca: e.target.value })}
                    className="w-full text-sm border p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Modelo</label>
                  <input
                    type="text"
                    required
                    placeholder="Corolla, Fiesta, etc."
                    value={nuevoVehiculo.modelo}
                    onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, modelo: e.target.value })}
                    className="w-full text-sm border p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Año</label>
                  <input
                    type="number"
                    required
                    value={nuevoVehiculo.anio}
                    onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, anio: parseInt(e.target.value) })}
                    className="w-full text-sm border p-2 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button type="button" onClick={() => setModalVehiculo(null)} className="px-4 py-2 border rounded-lg text-sm">
                    Cancelar
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg text-sm">
                    Guardar Vehículo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* VISTA 4: INVENTARIO / REFACCIONES */}
        {activeTab === 'inventario' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">Catálogo de Repuestos & Refacciones</h1>
                <p className="text-sm text-slate-500">Control de existencias, alerta de stock mínimo y precios</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por SKU, nombre o marca..."
                  value={searchRefacciones}
                  onChange={(e) => setSearchRefacciones(e.target.value)}
                  onKeyUp={(e) => e.key === 'Enter' && cargarRefacciones()}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => {
                  setFiltroStockBajo(!filtroStockBajo);
                  setTimeout(cargarRefacciones, 50);
                }}
                className={`px-4 py-2.5 rounded-lg border text-sm font-semibold flex items-center gap-2 transition ${
                  filtroStockBajo ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                <AlertTriangle className="w-4 h-4" /> Alertas Stock Bajo
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-400 font-semibold">
                  <tr>
                    <th className="px-6 py-3">SKU</th>
                    <th className="px-6 py-3">Nombre Refacción</th>
                    <th className="px-6 py-3">Marca</th>
                    <th className="px-6 py-3">Categoría</th>
                    <th className="px-6 py-3 text-center">Stock</th>
                    <th className="px-6 py-3 text-right">Precio Público</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {refaccionesData.datos.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3.5 font-mono text-xs font-bold text-blue-600">{r.sku}</td>
                      <td className="px-6 py-3.5 font-semibold text-slate-800">{r.nombre}</td>
                      <td className="px-6 py-3.5">{r.marca || 'Genérica'}</td>
                      <td className="px-6 py-3.5">{r.categoria_nombre}</td>
                      <td className="px-6 py-3.5 text-center">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                          r.stock <= r.stock_minimo ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {r.stock} uds {r.stock <= r.stock_minimo && '⚠️ Bajo'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-slate-800">${parseFloat(r.precio_publico).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VISTA 5: REPORTES POR RANGO DE FECHAS (Req #23, #25) */}
        {activeTab === 'reportes' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Reportes Financieros y de Ventas</h1>
              <p className="text-sm text-slate-500">Filtrado dinámico por rango de fechas (Fecha Inicial y Fecha Final)</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-end gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha Inicial</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha Final</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border rounded-lg text-sm"
                />
              </div>
              <button
                onClick={cargarReporte}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm"
              >
                Generar Reporte
              </button>
            </div>

            {reporteVentas && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-200">
                    <span className="text-xs uppercase text-slate-400 font-bold">Total Recaudado en el Periodo</span>
                    <h3 className="text-3xl font-black text-emerald-600">${reporteVentas.resumen.totalRecaudado.toFixed(2)}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200">
                    <span className="text-xs uppercase text-slate-400 font-bold">Transacciones Realizadas</span>
                    <h3 className="text-3xl font-black text-slate-800">{reporteVentas.resumen.totalTransacciones}</h3>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b">
                    <h3 className="text-base font-bold text-slate-800">Detalle de Pagos Recibidos</h3>
                  </div>
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-400 font-semibold">
                      <tr>
                        <th className="px-6 py-3">Folio Pago</th>
                        <th className="px-6 py-3">Orden Asociada</th>
                        <th className="px-6 py-3">Cliente</th>
                        <th className="px-6 py-3">Método</th>
                        <th className="px-6 py-3">Fecha y Hora</th>
                        <th className="px-6 py-3 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reporteVentas.datos.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-6 py-3 font-bold text-blue-600">{p.folio}</td>
                          <td className="px-6 py-3">{p.orden_folio}</td>
                          <td className="px-6 py-3">{p.cliente_nombre}</td>
                          <td className="px-6 py-3 uppercase text-xs font-semibold">{p.metodo}</td>
                          <td className="px-6 py-3 text-xs">{new Date(p.fecha_pago).toLocaleString()}</td>
                          <td className="px-6 py-3 text-right font-bold text-emerald-600">${parseFloat(p.monto).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
