const API_URL = 'http://localhost:4000/api';

export const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('autopro_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('autopro_token');
      localStorage.removeItem('autopro_user');
      window.dispatchEvent(new Event('auth-change'));
    }
    throw new Error(data.mensaje || 'Error en la petición');
  }

  return data;
};

// Endpoints agrupados
export const authService = {
  login: (credentials) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getPerfil: () => request('/auth/perfil'),
};

export const dashboardService = {
  getStats: () => request('/dashboard/stats'),
  getReporteVentas: (fechas) => {
    const params = fechas ? `?fecha_inicio=${fechas.fecha_inicio}&fecha_fin=${fechas.fecha_fin}` : '';
    return request(`/dashboard/reportes/ventas${params}`);
  },
  getReporteRefaccionesTop: () => request('/dashboard/reportes/refacciones-top'),
};

export const clientesService = {
  getClientes: (page = 1, buscar = '') =>
    request(`/clientes?page=${page}&limit=10&buscar=${encodeURIComponent(buscar)}`),
  getClienteById: (id) => request(`/clientes/${id}`),
  crearCliente: (cliente) =>
    request('/clientes', { method: 'POST', body: JSON.stringify(cliente) }),
  actualizarCliente: (id, cliente) =>
    request(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(cliente) }),
  eliminarCliente: (id) => request(`/clientes/${id}`, { method: 'DELETE' }),
  crearVehiculo: (vehiculo) =>
    request('/clientes/vehiculos', { method: 'POST', body: JSON.stringify(vehiculo) }),
};

export const refaccionesService = {
  getRefacciones: (page = 1, buscar = '', stockBajo = false) =>
    request(
      `/refacciones?page=${page}&limit=10&buscar=${encodeURIComponent(buscar)}&stock_bajo=${stockBajo}`
    ),
  crearRefaccion: (refaccion) =>
    request('/refacciones', { method: 'POST', body: JSON.stringify(refaccion) }),
  actualizarRefaccion: (id, refaccion) =>
    request(`/refacciones/${id}`, { method: 'PUT', body: JSON.stringify(refaccion) }),
  eliminarRefaccion: (id) => request(`/refacciones/${id}`, { method: 'DELETE' }),
};

export const ordenesService = {
  getOrdenes: (page = 1, buscar = '', estado = '') => {
    let url = `/ordenes?page=${page}&limit=10`;
    if (buscar) url += `&buscar=${encodeURIComponent(buscar)}`;
    if (estado) url += `&estado=${encodeURIComponent(estado)}`;
    return request(url);
  },
  getOrdenById: (id) => request(`/ordenes/${id}`),
  crearOrden: (orden) =>
    request('/ordenes', { method: 'POST', body: JSON.stringify(orden) }),
  agregarRefaccion: (ordenId, data) =>
    request(`/ordenes/${ordenId}/refacciones`, { method: 'POST', body: JSON.stringify(data) }),
  agregarServicio: (ordenId, data) =>
    request(`/ordenes/${ordenId}/servicios`, { method: 'POST', body: JSON.stringify(data) }),
  finalizarOrden: (ordenId, diagnostico) =>
    request(`/ordenes/${ordenId}/finalizar`, {
      method: 'PUT',
      body: JSON.stringify({ diagnostico }),
    }),
  registrarPago: (ordenId, pago) =>
    request(`/ordenes/${ordenId}/pagos`, { method: 'POST', body: JSON.stringify(pago) }),
};
