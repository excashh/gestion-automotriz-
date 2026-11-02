export const API_URL = 'http://localhost:4000/api';

// Caché en memoria de ObjectURLs para imágenes de evidencia autenticadas
const cacheImagenesEvidencia = new Map();

const construirErrorApi = (status, data, fallbackMsg) => {
  const err = new Error((data && data.mensaje) || fallbackMsg || 'Error en la petición');
  err.mensaje = err.message;
  err.status = status;
  err.campo = data?.campo || null;
  err.errores = data?.errores || null;
  err.faltantes = data?.faltantes || null;
  return err;
};

export const limpiarCacheEvidencias = () => {
  for (const url of cacheImagenesEvidencia.values()) {
    try {
      URL.revokeObjectURL(url);
    } catch (_e) {
      // Ignorar
    }
  }
  cacheImagenesEvidencia.clear();
};

export const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('autopro_token');
  const esFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    ...(esFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (_networkErr) {
    throw construirErrorApi(
      0,
      null,
      'No se pudo conectar con el servidor. Verifica tu conexión o que el backend de AutoPro esté activo en el puerto 4000.'
    );
  }

  let data = null;
  try {
    data = await response.json();
  } catch (_parseErr) {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401 && endpoint !== '/auth/login') {
      localStorage.removeItem('autopro_token');
      localStorage.removeItem('autopro_user');
      limpiarCacheEvidencias();
      window.dispatchEvent(new Event('auth-change'));
    }
    throw construirErrorApi(response.status, data, 'No fue posible completar la solicitud.');
  }

  return data;
};

/**
 * Obtiene de forma segura una imagen privada del servidor usando el token JWT
 * en cabecera (sin exponer tokens en query params) y la almacena en caché local de sesión.
 */
export const obtenerUrlEvidencia = async (ordenId, evidenciaId) => {
  const cacheKey = `${ordenId}:${evidenciaId}`;
  if (cacheImagenesEvidencia.has(cacheKey)) {
    return cacheImagenesEvidencia.get(cacheKey);
  }

  const token = localStorage.getItem('autopro_token');
  let response;
  try {
    response = await fetch(`${API_URL}/ordenes/${ordenId}/evidencias/${evidenciaId}/archivo`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch (_err) {
    throw new Error('Error de conexión al cargar la imagen.');
  }

  if (!response.ok) {
    throw new Error('No se pudo cargar la fotografía.');
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  cacheImagenesEvidencia.set(cacheKey, objectUrl);
  return objectUrl;
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
  getClientes: (page = 1, buscar = '', limit = 10) =>
    request(`/clientes?page=${page}&limit=${limit}&buscar=${encodeURIComponent(buscar)}`),
  getClienteById: (id) => request(`/clientes/${id}`),
  crearCliente: (cliente) =>
    request('/clientes', { method: 'POST', body: JSON.stringify(cliente) }),
  actualizarCliente: (id, cliente) =>
    request(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(cliente) }),
  eliminarCliente: (id) => request(`/clientes/${id}`, { method: 'DELETE' }),
  getVehiculos: ({ buscar = '', clienteId = '', limit = 50 } = {}) => {
    const params = new URLSearchParams();
    if (buscar) params.set('buscar', buscar);
    if (clienteId !== undefined && clienteId !== null && clienteId !== '') {
      params.set('cliente_id', String(clienteId));
    }
    params.set('limit', String(limit));
    return request(`/clientes/vehiculos?${params.toString()}`);
  },
  crearVehiculo: (vehiculo) =>
    request('/clientes/vehiculos', { method: 'POST', body: JSON.stringify(vehiculo) }),
  getHistorialVehiculo: (vehiculoId) =>
    request(`/clientes/vehiculos/${vehiculoId}/historial`),
};

export const refaccionesService = {
  getRefacciones: (page = 1, buscar = '', stockBajo = false, limit = 10) =>
    request(
      `/refacciones?page=${page}&limit=${limit}&buscar=${encodeURIComponent(buscar)}&stock_bajo=${stockBajo}`
    ),
  crearRefaccion: (refaccion) =>
    request('/refacciones', { method: 'POST', body: JSON.stringify(refaccion) }),
  actualizarRefaccion: (id, refaccion) =>
    request(`/refacciones/${id}`, { method: 'PUT', body: JSON.stringify(refaccion) }),
  eliminarRefaccion: (id) => request(`/refacciones/${id}`, { method: 'DELETE' }),
};

export const ordenesService = {
  getCatalogos: () => request('/ordenes/catalogos'),
  actualizarConfigEvidenciaServicio: (servicioId, etapasObligatorias) =>
    request(`/ordenes/servicios/${servicioId}/evidencia-config`, {
      method: 'PUT',
      body: JSON.stringify({ etapas_obligatorias: etapasObligatorias }),
    }),
  getOrdenes: (page = 1, buscar = '', estado = '', limit = 50, mecanicoId = '') => {
    let url = `/ordenes?page=${page}&limit=${limit}`;
    if (buscar) url += `&buscar=${encodeURIComponent(buscar)}`;
    if (estado) url += `&estado=${encodeURIComponent(estado)}`;
    if (mecanicoId) url += `&mecanico_id=${encodeURIComponent(mecanicoId)}`;
    return request(url);
  },
  getOrdenById: (id) => request(`/ordenes/${id}`),
  crearOrden: (orden) =>
    request('/ordenes', { method: 'POST', body: JSON.stringify(orden) }),
  asignarMecanico: (ordenId, data) =>
    request(`/ordenes/${ordenId}/mecanico`, { method: 'PUT', body: JSON.stringify(data) }),
  agregarRefaccion: (ordenId, data) =>
    request(`/ordenes/${ordenId}/refacciones`, { method: 'POST', body: JSON.stringify(data) }),
  agregarServicio: (ordenId, data) =>
    request(`/ordenes/${ordenId}/servicios`, { method: 'POST', body: JSON.stringify(data) }),
  getEvidencias: (ordenId) => request(`/ordenes/${ordenId}/evidencias`),
  subirEvidencias: (ordenId, formData) =>
    request(`/ordenes/${ordenId}/evidencias`, {
      method: 'POST',
      body: formData,
    }),
  eliminarEvidencia: (ordenId, evidenciaId, motivo = '') =>
    request(`/ordenes/${ordenId}/evidencias/${evidenciaId}`, {
      method: 'DELETE',
      body: JSON.stringify({ motivo }),
    }),
  finalizarOrden: (ordenId, diagnostico) =>
    request(`/ordenes/${ordenId}/finalizar`, {
      method: 'PUT',
      body: JSON.stringify({ diagnostico }),
    }),
  entregarOrden: (ordenId) =>
    request(`/ordenes/${ordenId}/entregar`, {
      method: 'PUT',
    }),
  registrarPago: (ordenId, pago) =>
    request(`/ordenes/${ordenId}/pagos`, { method: 'POST', body: JSON.stringify(pago) }),
};

export const mecanicosService = {
  getMecanicos: ({ tipo = '', estatus = '', conPendientes = false, buscar = '' } = {}) => {
    const params = new URLSearchParams();
    if (tipo) params.set('tipo', tipo);
    if (estatus) params.set('estatus', estatus);
    if (conPendientes) params.set('con_pendientes', 'true');
    if (buscar) params.set('buscar', buscar);
    const qs = params.toString();
    return request(`/mecanicos${qs ? `?${qs}` : ''}`);
  },
  getMecanicoById: (id) => request(`/mecanicos/${id}`),
  crearMecanico: (mecanico) =>
    request('/mecanicos', { method: 'POST', body: JSON.stringify(mecanico) }),
  actualizarMecanico: (id, mecanico) =>
    request(`/mecanicos/${id}`, { method: 'PUT', body: JSON.stringify(mecanico) }),
  cambiarDisponibilidad: (id, estatus) =>
    request(`/mecanicos/${id}/disponibilidad`, {
      method: 'PATCH',
      body: JSON.stringify({ estatus }),
    }),
};
