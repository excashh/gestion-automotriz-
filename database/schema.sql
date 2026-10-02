-- =====================================================================
-- AutoGestión Pro - Base de Datos Relacional Normalizada (3FN)
-- Motor: SQLite / SQL Compatible
-- =====================================================================

PRAGMA foreign_keys = ON;

-- 1. Tabla de Usuarios y Autenticación (RBAC)
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL CHECK(rol IN ('admin', 'tecnico', 'recepcionista')),
    telefono TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);

-- 2. Tabla de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    documento_identidad TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    telefono TEXT NOT NULL,
    direccion TEXT,
    ciudad TEXT DEFAULT 'Ciudad de México',
    tipo_cliente TEXT NOT NULL DEFAULT 'particular' CHECK(tipo_cliente IN ('particular', 'flotilla', 'corporativo')),
    notas TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clientes_documento ON clientes(documento_identidad);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);

-- 3. Tabla de Vehículos (Relación con Clientes)
CREATE TABLE IF NOT EXISTS vehiculos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    vin TEXT UNIQUE NOT NULL,
    placa TEXT UNIQUE NOT NULL,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    anio INTEGER NOT NULL CHECK(anio >= 1970 AND anio <= 2030),
    kilometraje INTEGER NOT NULL DEFAULT 0 CHECK(kilometraje >= 0),
    color TEXT,
    combustible TEXT NOT NULL DEFAULT 'Gasolina' CHECK(combustible IN ('Gasolina', 'Diésel', 'Híbrido', 'Eléctrico', 'Gas')),
    transmision TEXT NOT NULL DEFAULT 'Automática' CHECK(transmision IN ('Automática', 'Manual', 'CVT', 'Doble Embrague')),
    notas TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_vehiculos_placa ON vehiculos(placa);
CREATE INDEX IF NOT EXISTS idx_vehiculos_vin ON vehiculos(vin);
CREATE INDEX IF NOT EXISTS idx_vehiculos_cliente ON vehiculos(cliente_id);

-- 4. Categorías de Repuestos e Insumos
CREATE TABLE IF NOT EXISTS categorias_repuestos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    activo INTEGER NOT NULL DEFAULT 1
);

-- 5. Catálogo de Repuestos e Inventario
CREATE TABLE IF NOT EXISTS repuestos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria_id INTEGER NOT NULL,
    codigo TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    marca TEXT NOT NULL,
    descripcion TEXT,
    precio_compra REAL NOT NULL CHECK(precio_compra >= 0),
    precio_venta REAL NOT NULL CHECK(precio_venta >= precio_compra),
    stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
    stock_minimo INTEGER NOT NULL DEFAULT 5 CHECK(stock_minimo >= 0),
    ubicacion TEXT DEFAULT 'Almacén Central',
    activo INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias_repuestos(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_repuestos_codigo ON repuestos(codigo);
CREATE INDEX IF NOT EXISTS idx_repuestos_categoria ON repuestos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_repuestos_stock ON repuestos(stock);

-- 6. Órdenes de Servicio / Mantenimiento
CREATE TABLE IF NOT EXISTS ordenes_servicio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folio TEXT UNIQUE NOT NULL,
    cliente_id INTEGER NOT NULL,
    vehiculo_id INTEGER NOT NULL,
    tecnico_id INTEGER,
    recepcionista_id INTEGER NOT NULL,
    fecha_ingreso DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_estimada_entrega DATETIME,
    fecha_completada DATETIME,
    kilometraje_ingreso INTEGER NOT NULL CHECK(kilometraje_ingreso >= 0),
    nivel_combustible TEXT DEFAULT '1/2' CHECK(nivel_combustible IN ('Reserva', '1/4', '1/2', '3/4', 'Lleno')),
    motivo_ingreso TEXT NOT NULL,
    diagnostico TEXT,
    observaciones TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'en_diagnostico', 'en_reparacion', 'espera_repuestos', 'finalizado', 'cancelado')),
    mano_obra_costo REAL NOT NULL DEFAULT 0 CHECK(mano_obra_costo >= 0),
    repuestos_costo REAL NOT NULL DEFAULT 0 CHECK(repuestos_costo >= 0),
    subtotal REAL NOT NULL DEFAULT 0 CHECK(subtotal >= 0),
    iva REAL NOT NULL DEFAULT 0 CHECK(iva >= 0),
    total REAL NOT NULL DEFAULT 0 CHECK(total >= 0),
    metodo_pago TEXT DEFAULT 'efectivo' CHECK(metodo_pago IN ('efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'pendiente')),
    pagado INTEGER NOT NULL DEFAULT 0 CHECK(pagado IN (0, 1)),
    justificacion_cancelacion TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (tecnico_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL,
    FOREIGN KEY (recepcionista_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_ordenes_folio ON ordenes_servicio(folio);
CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes_servicio(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_fecha ON ordenes_servicio(fecha_ingreso);
CREATE INDEX IF NOT EXISTS idx_ordenes_vehiculo ON ordenes_servicio(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_cliente ON ordenes_servicio(cliente_id);

-- 7. Detalle de Repuestos Utilizados en la Orden
CREATE TABLE IF NOT EXISTS orden_detalles_repuestos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orden_id INTEGER NOT NULL,
    repuesto_id INTEGER NOT NULL,
    cantidad INTEGER NOT NULL CHECK(cantidad > 0),
    precio_unitario REAL NOT NULL CHECK(precio_unitario >= 0),
    subtotal REAL NOT NULL CHECK(subtotal >= 0),
    FOREIGN KEY (orden_id) REFERENCES ordenes_servicio(id) ON DELETE CASCADE,
    FOREIGN KEY (repuesto_id) REFERENCES repuestos(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_orden_repuestos_orden ON orden_detalles_repuestos(orden_id);

-- 8. Detalle de Servicios y Mano de Obra en la Orden
CREATE TABLE IF NOT EXISTS orden_servicios_mano_obra (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orden_id INTEGER NOT NULL,
    descripcion TEXT NOT NULL,
    horas REAL NOT NULL CHECK(horas > 0),
    costo_hora REAL NOT NULL CHECK(costo_hora >= 0),
    subtotal REAL NOT NULL CHECK(subtotal >= 0),
    FOREIGN KEY (orden_id) REFERENCES ordenes_servicio(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orden_servicios_orden ON orden_servicios_mano_obra(orden_id);

-- 9. Kárdex / Movimientos de Inventario (Trazabilidad)
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repuesto_id INTEGER NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'salida_orden', 'ajuste')),
    cantidad INTEGER NOT NULL,
    stock_anterior INTEGER NOT NULL,
    stock_nuevo INTEGER NOT NULL,
    orden_id INTEGER,
    motivo TEXT NOT NULL,
    usuario_id INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repuesto_id) REFERENCES repuestos(id) ON DELETE RESTRICT,
    FOREIGN KEY (orden_id) REFERENCES ordenes_servicio(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_movimientos_repuesto ON movimientos_inventario(repuesto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos_inventario(created_at);

-- 10. Auditoría de Operaciones del Sistema
CREATE TABLE IF NOT EXISTS auditoria_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER,
    usuario_nombre TEXT NOT NULL,
    accion TEXT NOT NULL CHECK(accion IN ('CREACION', 'ACTUALIZACION', 'ELIMINACION', 'CAMBIO_ESTADO', 'LOGIN', 'LOGOUT', 'TRANSACCION')),
    modulo TEXT NOT NULL,
    registro_id TEXT,
    detalles TEXT NOT NULL,
    ip TEXT DEFAULT '127.0.0.1'
);

CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria_logs(fecha);
CREATE INDEX IF NOT EXISTS idx_auditoria_modulo ON auditoria_logs(modulo);
