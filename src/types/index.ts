export type RolUsuario = 'admin' | 'tecnico' | 'recepcionista';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  telefono?: string;
  activo?: number;
  created_at?: string;
}

export type TipoCliente = 'particular' | 'flotilla' | 'corporativo';

export interface Cliente {
  id: number;
  nombre: string;
  documento_identidad: string;
  email: string;
  telefono: string;
  direccion?: string;
  ciudad?: string;
  tipo_cliente: TipoCliente;
  notas?: string;
  activo: number;
  total_vehiculos?: number;
  total_ordenes?: number;
  created_at: string;
}

export type TipoCombustible = 'Gasolina' | 'Diésel' | 'Híbrido' | 'Eléctrico' | 'Gas';
export type TipoTransmision = 'Automática' | 'Manual' | 'CVT' | 'Doble Embrague';

export interface Vehiculo {
  id: number;
  cliente_id: number;
  vin: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  kilometraje: number;
  color?: string;
  combustible: TipoCombustible;
  transmision: TipoTransmision;
  notas?: string;
  activo: number;
  cliente_nombre?: string;
  cliente_telefono?: string;
  cliente_documento?: string;
  cliente_email?: string;
  total_servicios?: number;
  created_at: string;
}

export interface CategoriaRepuesto {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: number;
}

export interface Repuesto {
  id: number;
  categoria_id: number;
  categoria_nombre?: string;
  codigo: string;
  nombre: string;
  marca: string;
  descripcion?: string;
  precio_compra: number;
  precio_venta: number;
  stock: number;
  stock_minimo: number;
  ubicacion?: string;
  activo: number;
  created_at: string;
}

export interface MovimientoInventario {
  id: number;
  repuesto_id: number;
  tipo: 'entrada' | 'salida_orden' | 'ajuste';
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  orden_id?: number;
  orden_folio?: string;
  motivo: string;
  usuario_id: number;
  usuario_nombre?: string;
  created_at: string;
}

export type EstadoOrden =
  | 'pendiente'
  | 'en_diagnostico'
  | 'en_reparacion'
  | 'espera_repuestos'
  | 'finalizado'
  | 'cancelado';

export interface OrdenDetalleRepuesto {
  id?: number;
  orden_id?: number;
  repuesto_id: number;
  codigo?: string;
  nombre?: string;
  marca?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  stock_actual_almacen?: number;
}

export interface OrdenServicioManoObra {
  id?: number;
  orden_id?: number;
  descripcion: string;
  horas: number;
  costo_hora: number;
  subtotal: number;
}

export interface OrdenServicio {
  id: number;
  folio: string;
  cliente_id: number;
  vehiculo_id: number;
  tecnico_id?: number | null;
  recepcionista_id: number;
  fecha_ingreso: string;
  fecha_estimada_entrega?: string | null;
  fecha_completada?: string | null;
  kilometraje_ingreso: number;
  nivel_combustible: string;
  motivo_ingreso: string;
  diagnostico?: string;
  observaciones?: string;
  estado: EstadoOrden;
  mano_obra_costo: number;
  repuestos_costo: number;
  subtotal: number;
  iva: number;
  total: number;
  metodo_pago?: string;
  pagado: number;
  justificacion_cancelacion?: string;
  cliente_nombre?: string;
  cliente_documento?: string;
  cliente_telefono?: string;
  cliente_email?: string;
  cliente_direccion?: string;
  marca?: string;
  modelo?: string;
  placa?: string;
  vin?: string;
  anio?: number;
  color?: string;
  combustible?: string;
  vehiculo_km_actual?: number;
  tecnico_nombre?: string;
  tecnico_email?: string;
  recepcionista_nombre?: string;
  created_at: string;
}

export interface DashboardStats {
  ordenesActivas: number;
  ingresosMes: number;
  vehiculosEnTaller: number;
  repuestosBajoStock: number;
  ingresosMensuales: Array<{ mes_key: string; mes: string; total: number }>;
  ordenesPorEstado: Array<{ estado: EstadoOrden; total: number }>;
  ultimasOrdenes: Array<{
    id: number;
    folio: string;
    estado: EstadoOrden;
    total: number;
    fecha_ingreso: string;
    cliente_nombre: string;
    marca: string;
    modelo: string;
    placa: string;
    tecnico_nombre?: string;
  }>;
  alertasStock: Array<{
    id: number;
    codigo: string;
    nombre: string;
    marca: string;
    stock: number;
    stock_minimo: number;
    categoria: string;
  }>;
}

export interface ReporteFinanciero {
  resumen: {
    total_ordenes: number;
    facturacion_total: number;
    subtotal_total: number;
    iva_total: number;
    total_mano_obra: number;
    total_repuestos: number;
    ticket_promedio: number;
  };
  porMetodoPago: Array<{ metodo_pago: string; cantidad: number; monto: number }>;
  porFecha: Array<{ fecha: string; total: number; cantidad: number }>;
  ordenes: Array<{
    id: number;
    folio: string;
    fecha_ingreso: string;
    fecha_completada?: string;
    total: number;
    metodo_pago: string;
    cliente: string;
    placa: string;
    marca: string;
    modelo: string;
    mano_obra_costo: number;
    repuestos_costo: number;
    iva: number;
  }>;
}

export interface ReporteProductividad {
  rendimientoTecnicos: Array<{
    tecnico_id: number;
    tecnico_nombre: string;
    ordenes_totales: number;
    ordenes_finalizadas: number;
    ordenes_en_proceso: number;
    facturado_mano_obra: number;
  }>;
  topRepuestos: Array<{
    codigo: string;
    nombre: string;
    marca: string;
    total_consumido: number;
    total_facturado: number;
  }>;
}

export interface AuditoriaLog {
  id: number;
  fecha: string;
  usuario_id?: number;
  usuario_nombre: string;
  accion: string;
  modulo: string;
  registro_id?: string;
  detalles: string;
  ip?: string;
}

export interface ApiResponsePaginada<T> {
  datos: T[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}
