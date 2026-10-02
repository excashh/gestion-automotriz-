import {
  Usuario,
  Cliente,
  Vehiculo,
  Repuesto,
  CategoriaRepuesto,
  OrdenServicio,
  OrdenDetalleRepuesto,
  OrdenServicioManoObra,
  DashboardStats,
  ReporteFinanciero,
  ReporteProductividad,
  AuditoriaLog,
  ApiResponsePaginada,
  EstadoOrden,
} from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('autogestion_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = 'Error en la solicitud al servidor';
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; usuario: Usuario }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async getMe(): Promise<{ usuario: Usuario }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/dashboard/stats`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Clientes
  async getClientes(params?: {
    search?: string;
    tipo?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'ASC' | 'DESC';
  }): Promise<ApiResponsePaginada<Cliente>> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.tipo) query.set('tipo', params.tipo);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.sort) query.set('sort', params.sort);
    if (params?.order) query.set('order', params.order);

    const res = await fetch(`${API_BASE}/clientes?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getCliente(id: number): Promise<{ cliente: Cliente; vehiculos: Vehiculo[]; ordenes: any[] }> {
    const res = await fetch(`${API_BASE}/clientes/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createCliente(data: Partial<Cliente>): Promise<Cliente> {
    const res = await fetch(`${API_BASE}/clientes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateCliente(id: number, data: Partial<Cliente>): Promise<Cliente> {
    const res = await fetch(`${API_BASE}/clientes/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteCliente(id: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/clientes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Vehículos
  async getVehiculos(params?: {
    search?: string;
    marca?: string;
    cliente_id?: number;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'ASC' | 'DESC';
  }): Promise<ApiResponsePaginada<Vehiculo>> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.marca) query.set('marca', params.marca);
    if (params?.cliente_id) query.set('cliente_id', String(params.cliente_id));
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.sort) query.set('sort', params.sort);
    if (params?.order) query.set('order', params.order);

    const res = await fetch(`${API_BASE}/vehiculos?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getVehiculo(id: number): Promise<{ vehiculo: Vehiculo; historialOrdenes: any[] }> {
    const res = await fetch(`${API_BASE}/vehiculos/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createVehiculo(data: Partial<Vehiculo>): Promise<Vehiculo> {
    const res = await fetch(`${API_BASE}/vehiculos`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateVehiculo(id: number, data: Partial<Vehiculo>): Promise<Vehiculo> {
    const res = await fetch(`${API_BASE}/vehiculos/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteVehiculo(id: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/vehiculos/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Repuestos
  async getCategorias(): Promise<CategoriaRepuesto[]> {
    const res = await fetch(`${API_BASE}/repuestos/categorias`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getRepuestos(params?: {
    search?: string;
    categoria_id?: number;
    stock_bajo?: boolean;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'ASC' | 'DESC';
  }): Promise<ApiResponsePaginada<Repuesto>> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.categoria_id) query.set('categoria_id', String(params.categoria_id));
    if (params?.stock_bajo) query.set('stock_bajo', 'true');
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.sort) query.set('sort', params.sort);
    if (params?.order) query.set('order', params.order);

    const res = await fetch(`${API_BASE}/repuestos?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getRepuesto(id: number): Promise<{ repuesto: Repuesto; movimientos: any[] }> {
    const res = await fetch(`${API_BASE}/repuestos/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createRepuesto(data: Partial<Repuesto>): Promise<Repuesto> {
    const res = await fetch(`${API_BASE}/repuestos`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateRepuesto(id: number, data: Partial<Repuesto>): Promise<Repuesto> {
    const res = await fetch(`${API_BASE}/repuestos/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async ajustarStock(
    id: number,
    data: { tipo: 'entrada' | 'salida' | 'ajuste'; cantidad: number; motivo: string }
  ): Promise<{ message: string; stockActual: number }> {
    const res = await fetch(`${API_BASE}/repuestos/${id}/ajuste-stock`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteRepuesto(id: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/repuestos/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Órdenes de Servicio
  async getOrdenes(params?: {
    search?: string;
    estado?: string;
    tecnico_id?: number;
    cliente_id?: number;
    vehiculo_id?: number;
    fecha_inicio?: string;
    fecha_fin?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'ASC' | 'DESC';
  }): Promise<ApiResponsePaginada<OrdenServicio>> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.estado) query.set('estado', params.estado);
    if (params?.tecnico_id) query.set('tecnico_id', String(params.tecnico_id));
    if (params?.cliente_id) query.set('cliente_id', String(params.cliente_id));
    if (params?.vehiculo_id) query.set('vehiculo_id', String(params.vehiculo_id));
    if (params?.fecha_inicio) query.set('fecha_inicio', params.fecha_inicio);
    if (params?.fecha_fin) query.set('fecha_fin', params.fecha_fin);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.sort) query.set('sort', params.sort);
    if (params?.order) query.set('order', params.order);

    const res = await fetch(`${API_BASE}/ordenes?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getOrden(id: number): Promise<{
    orden: OrdenServicio;
    repuestos: OrdenDetalleRepuesto[];
    manoObra: OrdenServicioManoObra[];
  }> {
    const res = await fetch(`${API_BASE}/ordenes/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createOrden(data: any): Promise<OrdenServicio> {
    const res = await fetch(`${API_BASE}/ordenes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateOrden(id: number, data: any): Promise<OrdenServicio> {
    const res = await fetch(`${API_BASE}/ordenes/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async cambiarEstadoOrden(
    id: number,
    nuevo_estado: EstadoOrden,
    metodo_pago?: string
  ): Promise<{ message: string; orden: OrdenServicio }> {
    const res = await fetch(`${API_BASE}/ordenes/${id}/estado`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ nuevo_estado, metodo_pago }),
    });
    return handleResponse(res);
  },

  async cancelarOrden(id: number, justificacion: string): Promise<{ message: string; folio: string }> {
    const res = await fetch(`${API_BASE}/ordenes/${id}/cancelar`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ justificacion }),
    });
    return handleResponse(res);
  },

  // Reportes
  async getReporteFinanciero(params?: { fecha_inicio?: string; fecha_fin?: string }): Promise<ReporteFinanciero> {
    const query = new URLSearchParams();
    if (params?.fecha_inicio) query.set('fecha_inicio', params.fecha_inicio);
    if (params?.fecha_fin) query.set('fecha_fin', params.fecha_fin);
    const res = await fetch(`${API_BASE}/reportes/financiero?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getReporteProductividad(params?: {
    fecha_inicio?: string;
    fecha_fin?: string;
  }): Promise<ReporteProductividad> {
    const query = new URLSearchParams();
    if (params?.fecha_inicio) query.set('fecha_inicio', params.fecha_inicio);
    if (params?.fecha_fin) query.set('fecha_fin', params.fecha_fin);
    const res = await fetch(`${API_BASE}/reportes/productividad?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Usuarios y Auditoría
  async getUsuarios(): Promise<Usuario[]> {
    const res = await fetch(`${API_BASE}/usuarios`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createUsuario(data: any): Promise<Usuario> {
    const res = await fetch(`${API_BASE}/usuarios`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getAuditoria(limit = 50, modulo?: string): Promise<AuditoriaLog[]> {
    const query = new URLSearchParams({ limit: String(limit) });
    if (modulo) query.set('modulo', modulo);
    const res = await fetch(`${API_BASE}/auditoria?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};
