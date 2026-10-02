import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query, queryOne, run, transaction } from './db.ts';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'autogestion_secret_jwt_key_2026_secure';

// Tipado de usuario autenticado
export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol: 'admin' | 'tecnico' | 'recepcionista';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// -------------------------------------------------------------
// Middlewares de Autenticación y Autorización (RBAC)
// -------------------------------------------------------------
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticación no proporcionado' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(401).json({ error: 'Sesión expirada o token inválido' });
    }
    req.user = decoded as AuthUser;
    next();
  });
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere uno de los siguientes roles: ${roles.join(', ')}`
      });
    }
    next();
  };
}

// Helper para registrar en auditoría
async function logAudit(
  req: Request,
  accion: 'CREACION' | 'ACTUALIZACION' | 'ELIMINACION' | 'CAMBIO_ESTADO' | 'LOGIN' | 'LOGOUT' | 'TRANSACCION',
  modulo: string,
  registro_id: string,
  detalles: string
) {
  try {
    const usuario_id = req.user ? req.user.id : null;
    const usuario_nombre = req.user ? req.user.nombre : 'Sistema / Anónimo';
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    await run(
      `INSERT INTO auditoria_logs (usuario_id, usuario_nombre, accion, modulo, registro_id, detalles, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [usuario_id, usuario_nombre, accion, modulo, registro_id, detalles, ip]
    );
  } catch (e) {
    console.error('Error registrando auditoría:', e);
  }
}

// =============================================================
// 1. AUTENTICACIÓN
// =============================================================
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Debe ingresar correo electrónico y contraseña' });
    }

    const user = await queryOne(
      'SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE email = ?',
      [email.trim().toLowerCase()]
    );

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas. Verifique su correo o contraseña.' });
    }

    if (!user.activo) {
      return res.status(403).json({ error: 'Su cuenta se encuentra inactiva. Contacte al administrador.' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas. Verifique su correo o contraseña.' });
    }

    const tokenPayload: AuthUser = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

    // Auditoría de login
    req.user = tokenPayload;
    await logAudit(req, 'LOGIN', 'AUTH', String(user.id), `Inicio de sesión exitoso como ${user.rol}`);

    return res.status(200).json({
      token,
      usuario: tokenPayload,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Error interno del servidor durante el inicio de sesión' });
  }
});

router.get('/auth/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await queryOne(
      'SELECT id, nombre, email, rol, telefono, activo, created_at FROM usuarios WHERE id = ?',
      [req.user!.id]
    );
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    return res.status(200).json({ usuario: user });
  } catch (error) {
    return res.status(500).json({ error: 'Error al recuperar información del usuario' });
  }
});

// =============================================================
// 2. DASHBOARD Y ESTADÍSTICAS EN TIEMPO REAL
// =============================================================
router.get('/dashboard/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    // 1. Total órdenes activas
    const activeOrdersRow = await queryOne(
      "SELECT COUNT(*) AS total FROM ordenes_servicio WHERE estado NOT IN ('finalizado', 'cancelado')"
    );
    const ordenesActivas = activeOrdersRow?.total || 0;

    // 2. Facturación del mes actual
    const revenueRow = await queryOne(
      `SELECT COALESCE(SUM(total), 0) AS total
       FROM ordenes_servicio
       WHERE estado = 'finalizado'
         AND strftime('%Y-%m', fecha_ingreso) = strftime('%Y-%m', 'now')`
    );
    const ingresosMes = revenueRow?.total || 0;

    // 3. Vehículos actualmente en taller
    const vehiclesRow = await queryOne(
      `SELECT COUNT(DISTINCT vehiculo_id) AS total
       FROM ordenes_servicio
       WHERE estado NOT IN ('finalizado', 'cancelado')`
    );
    const vehiculosEnTaller = vehiclesRow?.total || 0;

    // 4. Repuestos con stock crítico
    const lowStockRow = await queryOne(
      'SELECT COUNT(*) AS total FROM repuestos WHERE stock <= stock_minimo AND activo = 1'
    );
    const repuestosBajoStock = lowStockRow?.total || 0;

    // 5. Histórico de ingresos últimos 6 meses
    const ingresosMensuales = await query(
      `SELECT
         strftime('%Y-%m', fecha_ingreso) AS mes_key,
         CASE strftime('%m', fecha_ingreso)
           WHEN '01' THEN 'Ene' WHEN '02' THEN 'Feb' WHEN '03' THEN 'Mar'
           WHEN '04' THEN 'Abr' WHEN '05' THEN 'May' WHEN '06' THEN 'Jun'
           WHEN '07' THEN 'Jul' WHEN '08' THEN 'Ago' WHEN '09' THEN 'Sep'
           WHEN '10' THEN 'Oct' WHEN '11' THEN 'Nov' WHEN '12' THEN 'Dic'
         END AS mes,
         ROUND(COALESCE(SUM(total), 0), 2) AS total
       FROM ordenes_servicio
       WHERE estado = 'finalizado'
       GROUP BY mes_key
       ORDER BY mes_key DESC
       LIMIT 6`
    );

    // 6. Distribución de órdenes por estado
    const ordenesPorEstado = await query(
      `SELECT estado, COUNT(*) AS total
       FROM ordenes_servicio
       GROUP BY estado`
    );

    // 7. Últimas órdenes de servicio
    const ultimasOrdenes = await query(
      `SELECT o.id, o.folio, o.estado, o.total, o.fecha_ingreso,
              c.nombre AS cliente_nombre,
              v.marca, v.modelo, v.placa,
              u.nombre AS tecnico_nombre
       FROM ordenes_servicio o
       JOIN clientes c ON o.cliente_id = c.id
       JOIN vehiculos v ON o.vehiculo_id = v.id
       LEFT JOIN usuarios u ON o.tecnico_id = u.id
       ORDER BY o.fecha_ingreso DESC
       LIMIT 5`
    );

    // 8. Lista de alertas de repuestos críticos
    const alertasStock = await query(
      `SELECT r.id, r.codigo, r.nombre, r.marca, r.stock, r.stock_minimo, cr.nombre AS categoria
       FROM repuestos r
       JOIN categorias_repuestos cr ON r.categoria_id = cr.id
       WHERE r.stock <= r.stock_minimo AND r.activo = 1
       ORDER BY r.stock ASC
       LIMIT 5`
    );

    return res.status(200).json({
      ordenesActivas,
      ingresosMes,
      vehiculosEnTaller,
      repuestosBajoStock,
      ingresosMensuales: ingresosMensuales.reverse(),
      ordenesPorEstado,
      ultimasOrdenes,
      alertasStock,
    });
  } catch (error) {
    console.error('Error stats:', error);
    return res.status(500).json({ error: 'Error al generar indicadores del dashboard' });
  }
});

// =============================================================
// 3. MÓDULO DE CLIENTES (CRUD COMPLETO)
// =============================================================
router.get('/clientes', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { search = '', tipo = '', page = '1', limit = '10', sort = 'nombre', order = 'ASC' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, parseInt(limit as string) || 10);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE activo = 1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (nombre LIKE ? OR documento_identidad LIKE ? OR email LIKE ? OR telefono LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    if (tipo) {
      whereClause += ' AND tipo_cliente = ?';
      params.push(tipo);
    }

    // Total conteo
    const countRow = await queryOne(`SELECT COUNT(*) AS total FROM clientes ${whereClause}`, params);
    const total = countRow?.total || 0;

    // Orden válido
    const validSorts = ['nombre', 'documento_identidad', 'tipo_cliente', 'created_at'];
    const sortCol = validSorts.includes(sort as string) ? (sort as string) : 'nombre';
    const sortDir = (order as string).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const sql = `
      SELECT c.*,
             (SELECT COUNT(*) FROM vehiculos v WHERE v.cliente_id = c.id AND v.activo = 1) AS total_vehiculos,
             (SELECT COUNT(*) FROM ordenes_servicio o WHERE o.cliente_id = c.id) AS total_ordenes
      FROM clientes c
      ${whereClause}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ? OFFSET ?
    `;

    const datos = await query(sql, [...params, limitNum, offset]);

    return res.status(200).json({
      datos,
      total,
      pagina: pageNum,
      limite: limitNum,
      totalPaginas: Math.ceil(total / limitNum),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar clientes' });
  }
});

router.get('/clientes/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const cliente = await queryOne('SELECT * FROM clientes WHERE id = ?', [id]);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Vehículos del cliente
    const vehiculos = await query('SELECT * FROM vehiculos WHERE cliente_id = ? AND activo = 1', [id]);

    // Historial de órdenes
    const ordenes = await query(
      `SELECT o.id, o.folio, o.fecha_ingreso, o.estado, o.total, v.placa, v.marca, v.modelo
       FROM ordenes_servicio o
       JOIN vehiculos v ON o.vehiculo_id = v.id
       WHERE o.cliente_id = ?
       ORDER BY o.fecha_ingreso DESC`,
      [id]
    );

    return res.status(200).json({ cliente, vehiculos, ordenes });
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener detalles del cliente' });
  }
});

router.post('/clientes', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { nombre, documento_identidad, email, telefono, direccion, ciudad, tipo_cliente, notas } = req.body;

    // Validaciones
    if (!nombre || !documento_identidad || !email || !telefono) {
      return res.status(400).json({ error: 'Nombre, documento de identidad, correo y teléfono son obligatorios' });
    }

    // Email regex básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(422).json({ error: 'El formato de correo electrónico es inválido' });
    }

    // Unicidad de documento
    const existDoc = await queryOne('SELECT id FROM clientes WHERE documento_identidad = ?', [documento_identidad.trim()]);
    if (existDoc) {
      return res.status(409).json({ error: 'Ya existe un cliente registrado con ese documento de identidad / RFC' });
    }

    const { lastInsertRowid } = await run(
      `INSERT INTO clientes (nombre, documento_identidad, email, telefono, direccion, ciudad, tipo_cliente, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre.trim(),
        documento_identidad.trim().toUpperCase(),
        email.trim().toLowerCase(),
        telefono.trim(),
        direccion || '',
        ciudad || 'Ciudad de México',
        tipo_cliente || 'particular',
        notas || '',
      ]
    );

    await logAudit(req, 'CREACION', 'CLIENTES', String(lastInsertRowid), `Cliente ${nombre} registrado exitosamente`);

    const nuevoCliente = await queryOne('SELECT * FROM clientes WHERE id = ?', [lastInsertRowid]);
    return res.status(201).json(nuevoCliente);
  } catch (error: any) {
    return res.status(500).json({ error: 'Error al registrar cliente: ' + (error.message || 'Error de base de datos') });
  }
});

router.put('/clientes/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { nombre, documento_identidad, email, telefono, direccion, ciudad, tipo_cliente, notas } = req.body;

    const cliente = await queryOne('SELECT id FROM clientes WHERE id = ?', [id]);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    if (!nombre || !documento_identidad || !email || !telefono) {
      return res.status(400).json({ error: 'Nombre, documento, email y teléfono son obligatorios' });
    }

    // Verificar si el documento está en uso por otro
    const existDoc = await queryOne('SELECT id FROM clientes WHERE documento_identidad = ? AND id != ?', [
      documento_identidad.trim(),
      id,
    ]);
    if (existDoc) {
      return res.status(409).json({ error: 'Ese documento de identidad pertenece a otro cliente' });
    }

    await run(
      `UPDATE clientes
       SET nombre = ?, documento_identidad = ?, email = ?, telefono = ?,
           direccion = ?, ciudad = ?, tipo_cliente = ?, notas = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        nombre.trim(),
        documento_identidad.trim().toUpperCase(),
        email.trim().toLowerCase(),
        telefono.trim(),
        direccion || '',
        ciudad || 'Ciudad de México',
        tipo_cliente || 'particular',
        notas || '',
        id,
      ]
    );

    await logAudit(req, 'ACTUALIZACION', 'CLIENTES', String(id), `Actualización de datos para cliente ${nombre}`);

    const updated = await queryOne('SELECT * FROM clientes WHERE id = ?', [id]);
    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

router.delete('/clientes/:id', authenticateToken, requireRole('admin', 'recepcionista'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const cliente = await queryOne('SELECT id, nombre FROM clientes WHERE id = ?', [id]);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Regla de negocio: Verificar si tiene órdenes activas en proceso
    const activeOrders = await queryOne(
      "SELECT COUNT(*) AS total FROM ordenes_servicio WHERE cliente_id = ? AND estado NOT IN ('finalizado', 'cancelado')",
      [id]
    );
    if (activeOrders?.total > 0) {
      return res.status(422).json({
        error: 'No se puede dar de baja al cliente porque tiene órdenes de servicio en proceso en el taller.',
      });
    }

    // Baja lógica (Soft Delete) según requerimiento 22
    await run('UPDATE clientes SET activo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    await logAudit(req, 'ELIMINACION', 'CLIENTES', String(id), `Baja lógica del cliente ${cliente.nombre}`);

    return res.status(200).json({ message: 'Cliente dado de baja satisfactoriamente' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al dar de baja al cliente' });
  }
});

// =============================================================
// 4. MÓDULO DE VEHÍCULOS (CRUD COMPLETO)
// =============================================================
router.get('/vehiculos', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { search = '', marca = '', cliente_id = '', page = '1', limit = '10', sort = 'marca', order = 'ASC' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, parseInt(limit as string) || 10);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE v.activo = 1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (v.placa LIKE ? OR v.vin LIKE ? OR v.marca LIKE ? OR v.modelo LIKE ? OR c.nombre LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    if (marca) {
      whereClause += ' AND v.marca = ?';
      params.push(marca);
    }

    if (cliente_id) {
      whereClause += ' AND v.cliente_id = ?';
      params.push(parseInt(cliente_id as string));
    }

    const countRow = await queryOne(
      `SELECT COUNT(*) AS total
       FROM vehiculos v
       JOIN clientes c ON v.cliente_id = c.id
       ${whereClause}`,
      params
    );
    const total = countRow?.total || 0;

    const validSorts = ['marca', 'modelo', 'anio', 'kilometraje', 'placa', 'created_at'];
    const sortCol = validSorts.includes(sort as string) ? `v.${sort}` : 'v.marca';
    const sortDir = (order as string).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const sql = `
      SELECT v.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono, c.documento_identidad AS cliente_documento,
             (SELECT COUNT(*) FROM ordenes_servicio o WHERE o.vehiculo_id = v.id) AS total_servicios
      FROM vehiculos v
      JOIN clientes c ON v.cliente_id = c.id
      ${whereClause}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ? OFFSET ?
    `;

    const datos = await query(sql, [...params, limitNum, offset]);

    return res.status(200).json({
      datos,
      total,
      pagina: pageNum,
      limite: limitNum,
      totalPaginas: Math.ceil(total / limitNum),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar vehículos' });
  }
});

router.get('/vehiculos/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const vehiculo = await queryOne(
      `SELECT v.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono, c.email AS cliente_email
       FROM vehiculos v
       JOIN clientes c ON v.cliente_id = c.id
       WHERE v.id = ?`,
      [id]
    );

    if (!vehiculo) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }

    const historialOrdenes = await query(
      `SELECT o.id, o.folio, o.fecha_ingreso, o.fecha_completada, o.estado, o.total, o.motivo_ingreso, o.diagnostico,
              u.nombre AS tecnico_nombre
       FROM ordenes_servicio o
       LEFT JOIN usuarios u ON o.tecnico_id = u.id
       WHERE o.vehiculo_id = ?
       ORDER BY o.fecha_ingreso DESC`,
      [id]
    );

    return res.status(200).json({ vehiculo, historialOrdenes });
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener vehículo' });
  }
});

router.post('/vehiculos', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { cliente_id, vin, placa, marca, modelo, anio, kilometraje, color, combustible, transmision, notas } = req.body;

    if (!cliente_id || !vin || !placa || !marca || !modelo || !anio) {
      return res.status(400).json({ error: 'Cliente, VIN, placa, marca, modelo y año son obligatorios' });
    }

    const anioNum = parseInt(anio);
    if (isNaN(anioNum) || anioNum < 1970 || anioNum > 2030) {
      return res.status(422).json({ error: 'El año del vehículo debe estar comprendido entre 1970 y 2030' });
    }

    const kmNum = parseInt(kilometraje) || 0;
    if (kmNum < 0) {
      return res.status(422).json({ error: 'El kilometraje no puede ser un número negativo' });
    }

    // Validar duplicados de placa o VIN
    const existPlaca = await queryOne('SELECT id FROM vehiculos WHERE placa = ?', [placa.trim().toUpperCase()]);
    if (existPlaca) {
      return res.status(409).json({ error: 'Ya existe un vehículo registrado con esta placa' });
    }

    const existVin = await queryOne('SELECT id FROM vehiculos WHERE vin = ?', [vin.trim().toUpperCase()]);
    if (existVin) {
      return res.status(409).json({ error: 'Ya existe un vehículo registrado con este número VIN' });
    }

    const { lastInsertRowid } = await run(
      `INSERT INTO vehiculos (cliente_id, vin, placa, marca, modelo, anio, kilometraje, color, combustible, transmision, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parseInt(cliente_id),
        vin.trim().toUpperCase(),
        placa.trim().toUpperCase(),
        marca.trim(),
        modelo.trim(),
        anioNum,
        kmNum,
        color || 'No especificado',
        combustible || 'Gasolina',
        transmision || 'Automática',
        notas || '',
      ]
    );

    await logAudit(req, 'CREACION', 'VEHICULOS', String(lastInsertRowid), `Vehículo registrado: ${marca} ${modelo} (${placa})`);

    const nuevo = await queryOne('SELECT * FROM vehiculos WHERE id = ?', [lastInsertRowid]);
    return res.status(201).json(nuevo);
  } catch (error: any) {
    return res.status(500).json({ error: 'Error al registrar vehículo: ' + error.message });
  }
});

router.put('/vehiculos/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { cliente_id, vin, placa, marca, modelo, anio, kilometraje, color, combustible, transmision, notas } = req.body;

    const exist = await queryOne('SELECT id, kilometraje FROM vehiculos WHERE id = ?', [id]);
    if (!exist) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }

    const anioNum = parseInt(anio);
    const kmNum = parseInt(kilometraje);

    // Regla de consistencia: Kilometraje no puede disminuir arbitrariamente
    if (kmNum < exist.kilometraje) {
      return res.status(422).json({
        error: `El nuevo kilometraje (${kmNum} km) no puede ser inferior al registrado previamente (${exist.kilometraje} km).`,
      });
    }

    // Validar placa única
    const dupPlaca = await queryOne('SELECT id FROM vehiculos WHERE placa = ? AND id != ?', [placa.trim().toUpperCase(), id]);
    if (dupPlaca) {
      return res.status(409).json({ error: 'La placa indicada ya pertenece a otro vehículo' });
    }

    await run(
      `UPDATE vehiculos
       SET cliente_id = ?, vin = ?, placa = ?, marca = ?, modelo = ?, anio = ?,
           kilometraje = ?, color = ?, combustible = ?, transmision = ?, notas = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        parseInt(cliente_id),
        vin.trim().toUpperCase(),
        placa.trim().toUpperCase(),
        marca.trim(),
        modelo.trim(),
        anioNum,
        kmNum,
        color || 'No especificado',
        combustible || 'Gasolina',
        transmision || 'Automática',
        notas || '',
        id,
      ]
    );

    await logAudit(req, 'ACTUALIZACION', 'VEHICULOS', String(id), `Actualización de vehículo ${placa}`);

    const updated = await queryOne('SELECT * FROM vehiculos WHERE id = ?', [id]);
    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: 'Error al actualizar vehículo' });
  }
});

router.delete('/vehiculos/:id', authenticateToken, requireRole('admin', 'recepcionista'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const vehiculo = await queryOne('SELECT id, placa FROM vehiculos WHERE id = ?', [id]);
    if (!vehiculo) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }

    // Verificar si tiene orden activa
    const active = await queryOne(
      "SELECT COUNT(*) AS total FROM ordenes_servicio WHERE vehiculo_id = ? AND estado NOT IN ('finalizado', 'cancelado')",
      [id]
    );
    if (active?.total > 0) {
      return res.status(422).json({
        error: 'No se puede dar de baja el vehículo porque tiene una orden de trabajo abierta.',
      });
    }

    await run('UPDATE vehiculos SET activo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    await logAudit(req, 'ELIMINACION', 'VEHICULOS', String(id), `Baja lógica de vehículo ${vehiculo.placa}`);

    return res.status(200).json({ message: 'Vehículo dado de baja correctamente' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar vehículo' });
  }
});

// =============================================================
// 5. MÓDULO DE INVENTARIO Y REPUESTOS (CRUD + KÁRDEX)
// =============================================================
router.get('/repuestos/categorias', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const categorias = await query('SELECT * FROM categorias_repuestos WHERE activo = 1 ORDER BY nombre ASC');
    return res.status(200).json(categorias);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

router.get('/repuestos', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { search = '', categoria_id = '', stock_bajo = '', page = '1', limit = '10', sort = 'nombre', order = 'ASC' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, parseInt(limit as string) || 10);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE r.activo = 1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (r.codigo LIKE ? OR r.nombre LIKE ? OR r.marca LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    if (categoria_id) {
      whereClause += ' AND r.categoria_id = ?';
      params.push(parseInt(categoria_id as string));
    }

    if (stock_bajo === 'true') {
      whereClause += ' AND r.stock <= r.stock_minimo';
    }

    const countRow = await queryOne(`SELECT COUNT(*) AS total FROM repuestos r ${whereClause}`, params);
    const total = countRow?.total || 0;

    const validSorts = ['codigo', 'nombre', 'marca', 'precio_venta', 'stock', 'created_at'];
    const sortCol = validSorts.includes(sort as string) ? `r.${sort}` : 'r.nombre';
    const sortDir = (order as string).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const sql = `
      SELECT r.*, cr.nombre AS categoria_nombre
      FROM repuestos r
      JOIN categorias_repuestos cr ON r.categoria_id = cr.id
      ${whereClause}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ? OFFSET ?
    `;

    const datos = await query(sql, [...params, limitNum, offset]);

    return res.status(200).json({
      datos,
      total,
      pagina: pageNum,
      limite: limitNum,
      totalPaginas: Math.ceil(total / limitNum),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar inventario de repuestos' });
  }
});

router.get('/repuestos/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const repuesto = await queryOne(
      `SELECT r.*, cr.nombre AS categoria_nombre
       FROM repuestos r
       JOIN categorias_repuestos cr ON r.categoria_id = cr.id
       WHERE r.id = ?`,
      [id]
    );

    if (!repuesto) {
      return res.status(404).json({ error: 'Repuesto no encontrado' });
    }

    // Kárdex de movimientos
    const movimientos = await query(
      `SELECT m.*, u.nombre AS usuario_nombre, o.folio AS orden_folio
       FROM movimientos_inventario m
       JOIN usuarios u ON m.usuario_id = u.id
       LEFT JOIN ordenes_servicio o ON m.orden_id = o.id
       WHERE m.repuesto_id = ?
       ORDER BY m.created_at DESC
       LIMIT 30`,
      [id]
    );

    return res.status(200).json({ repuesto, movimientos });
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar repuesto' });
  }
});

router.post('/repuestos', authenticateToken, requireRole('admin', 'recepcionista'), async (req: Request, res: Response) => {
  try {
    const { categoria_id, codigo, nombre, marca, descripcion, precio_compra, precio_venta, stock, stock_minimo, ubicacion } = req.body;

    if (!categoria_id || !codigo || !nombre || !marca || precio_compra === undefined || precio_venta === undefined) {
      return res.status(400).json({ error: 'Categoría, código, nombre, marca, precio de compra y precio de venta son obligatorios' });
    }

    const pCompra = parseFloat(precio_compra);
    const pVenta = parseFloat(precio_venta);
    const st = parseInt(stock) || 0;
    const stMin = parseInt(stock_minimo) || 5;

    // Regla de negocio: Margen de ganancia no negativo
    if (pVenta < pCompra) {
      return res.status(422).json({ error: 'El precio de venta no puede ser inferior al precio de costo de compra' });
    }

    const existCod = await queryOne('SELECT id FROM repuestos WHERE codigo = ?', [codigo.trim().toUpperCase()]);
    if (existCod) {
      return res.status(409).json({ error: 'Ya existe un repuesto con ese código' });
    }

    const result = await transaction(async () => {
      const { lastInsertRowid } = await run(
        `INSERT INTO repuestos (categoria_id, codigo, nombre, marca, descripcion, precio_compra, precio_venta, stock, stock_minimo, ubicacion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parseInt(categoria_id),
          codigo.trim().toUpperCase(),
          nombre.trim(),
          marca.trim(),
          descripcion || '',
          pCompra,
          pVenta,
          st,
          stMin,
          ubicacion || 'Almacén Central',
        ]
      );

      // Si se inicializó con stock > 0, registrar en kárdex
      if (st > 0) {
        await run(
          `INSERT INTO movimientos_inventario (repuesto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
           VALUES (?, 'entrada', ?, 0, ?, 'Inventario inicial al crear registro', ?)`,
          [lastInsertRowid, st, st, req.user!.id]
        );
      }

      return lastInsertRowid;
    });

    await logAudit(req, 'CREACION', 'INVENTARIO', String(result), `Alta de repuesto: ${nombre} (${codigo})`);

    const nuevo = await queryOne('SELECT * FROM repuestos WHERE id = ?', [result]);
    return res.status(201).json(nuevo);
  } catch (error: any) {
    return res.status(500).json({ error: 'Error al registrar repuesto: ' + error.message });
  }
});

router.put('/repuestos/:id', authenticateToken, requireRole('admin', 'recepcionista'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { categoria_id, codigo, nombre, marca, descripcion, precio_compra, precio_venta, stock_minimo, ubicacion } = req.body;

    const repuesto = await queryOne('SELECT id FROM repuestos WHERE id = ?', [id]);
    if (!repuesto) {
      return res.status(404).json({ error: 'Repuesto no encontrado' });
    }

    const pCompra = parseFloat(precio_compra);
    const pVenta = parseFloat(precio_venta);

    if (pVenta < pCompra) {
      return res.status(422).json({ error: 'El precio de venta no puede ser menor al precio de compra' });
    }

    const dupCod = await queryOne('SELECT id FROM repuestos WHERE codigo = ? AND id != ?', [codigo.trim().toUpperCase(), id]);
    if (dupCod) {
      return res.status(409).json({ error: 'El código ingresado ya está asignado a otro repuesto' });
    }

    await run(
      `UPDATE repuestos
       SET categoria_id = ?, codigo = ?, nombre = ?, marca = ?, descripcion = ?,
           precio_compra = ?, precio_venta = ?, stock_minimo = ?, ubicacion = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        parseInt(categoria_id),
        codigo.trim().toUpperCase(),
        nombre.trim(),
        marca.trim(),
        descripcion || '',
        pCompra,
        pVenta,
        parseInt(stock_minimo) || 5,
        ubicacion || 'Almacén Central',
        id,
      ]
    );

    await logAudit(req, 'ACTUALIZACION', 'INVENTARIO', String(id), `Actualización de repuesto ${codigo}`);

    const updated = await queryOne('SELECT * FROM repuestos WHERE id = ?', [id]);
    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: 'Error al actualizar repuesto' });
  }
});

// Ajuste manual de stock transaccional con kárdex
router.post('/repuestos/:id/ajuste-stock', authenticateToken, requireRole('admin', 'recepcionista'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { tipo, cantidad, motivo } = req.body;

    if (!tipo || !cantidad || !motivo) {
      return res.status(400).json({ error: 'Tipo de ajuste, cantidad y motivo son obligatorios' });
    }

    const cant = parseInt(cantidad);
    if (cant <= 0) {
      return res.status(422).json({ error: 'La cantidad a ajustar debe ser mayor a 0' });
    }

    const result = await transaction(async () => {
      const repuesto = await queryOne('SELECT id, nombre, stock FROM repuestos WHERE id = ?', [id]);
      if (!repuesto) {
        throw new Error('Repuesto no encontrado');
      }

      let stockNuevo = repuesto.stock;
      if (tipo === 'entrada') {
        stockNuevo = repuesto.stock + cant;
      } else if (tipo === 'salida' || tipo === 'ajuste') {
        if (repuesto.stock < cant) {
          throw new Error(`Stock insuficiente. Solo hay ${repuesto.stock} unidades disponibles.`);
        }
        stockNuevo = repuesto.stock - cant;
      } else {
        throw new Error('Tipo de movimiento inválido (use "entrada" o "ajuste")');
      }

      await run('UPDATE repuestos SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [stockNuevo, id]);

      await run(
        `INSERT INTO movimientos_inventario (repuesto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, tipo, cant, repuesto.stock, stockNuevo, motivo.trim(), req.user!.id]
      );

      return { stockNuevo, repuesto };
    });

    await logAudit(
      req,
      'TRANSACCION',
      'INVENTARIO',
      String(id),
      `Ajuste de stock (${tipo} de ${cant} uds) en ${result.repuesto.nombre}. Nuevo stock: ${result.stockNuevo}`
    );

    return res.status(200).json({
      message: 'Ajuste de inventario procesado correctamente en el kárdex',
      stockActual: result.stockNuevo,
    });
  } catch (error: any) {
    return res.status(422).json({ error: error.message || 'Error al procesar ajuste de inventario' });
  }
});

router.delete('/repuestos/:id', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const repuesto = await queryOne('SELECT id, codigo, nombre FROM repuestos WHERE id = ?', [id]);
    if (!repuesto) {
      return res.status(404).json({ error: 'Repuesto no encontrado' });
    }

    // Baja lógica
    await run('UPDATE repuestos SET activo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    await logAudit(req, 'ELIMINACION', 'INVENTARIO', String(id), `Baja lógica de repuesto ${repuesto.codigo}`);

    return res.status(200).json({ message: 'Repuesto desactivado correctamente' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al desactivar repuesto' });
  }
});

// =============================================================
// 6. MÓDULO DE ÓRDENES DE SERVICIO Y POS AUTOMOTRIZ
// =============================================================
router.get('/ordenes', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      search = '',
      estado = '',
      tecnico_id = '',
      cliente_id = '',
      vehiculo_id = '',
      fecha_inicio = '',
      fecha_fin = '',
      page = '1',
      limit = '10',
      sort = 'fecha_ingreso',
      order = 'DESC',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, parseInt(limit as string) || 10);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (o.folio LIKE ? OR c.nombre LIKE ? OR v.placa LIKE ? OR v.modelo LIKE ? OR o.motivo_ingreso LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    if (estado) {
      whereClause += ' AND o.estado = ?';
      params.push(estado);
    }

    if (tecnico_id) {
      whereClause += ' AND o.tecnico_id = ?';
      params.push(parseInt(tecnico_id as string));
    }

    if (cliente_id) {
      whereClause += ' AND o.cliente_id = ?';
      params.push(parseInt(cliente_id as string));
    }

    if (vehiculo_id) {
      whereClause += ' AND o.vehiculo_id = ?';
      params.push(parseInt(vehiculo_id as string));
    }

    if (fecha_inicio) {
      whereClause += ' AND date(o.fecha_ingreso) >= date(?)';
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      whereClause += ' AND date(o.fecha_ingreso) <= date(?)';
      params.push(fecha_fin);
    }

    const countRow = await queryOne(
      `SELECT COUNT(*) AS total
       FROM ordenes_servicio o
       JOIN clientes c ON o.cliente_id = c.id
       JOIN vehiculos v ON o.vehiculo_id = v.id
       ${whereClause}`,
      params
    );
    const total = countRow?.total || 0;

    const validSorts = ['folio', 'fecha_ingreso', 'total', 'estado', 'kilometraje_ingreso'];
    const sortCol = validSorts.includes(sort as string) ? `o.${sort}` : 'o.fecha_ingreso';
    const sortDir = (order as string).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const sql = `
      SELECT o.*,
             c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
             v.marca, v.modelo, v.placa, v.anio,
             u.nombre AS tecnico_nombre,
             r.nombre AS recepcionista_nombre
      FROM ordenes_servicio o
      JOIN clientes c ON o.cliente_id = c.id
      JOIN vehiculos v ON o.vehiculo_id = v.id
      LEFT JOIN usuarios u ON o.tecnico_id = u.id
      JOIN usuarios r ON o.recepcionista_id = r.id
      ${whereClause}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ? OFFSET ?
    `;

    const datos = await query(sql, [...params, limitNum, offset]);

    return res.status(200).json({
      datos,
      total,
      pagina: pageNum,
      limite: limitNum,
      totalPaginas: Math.ceil(total / limitNum),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar órdenes de servicio' });
  }
});

router.get('/ordenes/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const orden = await queryOne(
      `SELECT o.*,
              c.nombre AS cliente_nombre, c.documento_identidad AS cliente_documento, c.email AS cliente_email, c.telefono AS cliente_telefono, c.direccion AS cliente_direccion,
              v.marca, v.modelo, v.placa, v.vin, v.anio, v.color, v.combustible, v.kilometraje AS vehiculo_km_actual,
              u.nombre AS tecnico_nombre, u.email AS tecnico_email,
              r.nombre AS recepcionista_nombre
       FROM ordenes_servicio o
       JOIN clientes c ON o.cliente_id = c.id
       JOIN vehiculos v ON o.vehiculo_id = v.id
       LEFT JOIN usuarios u ON o.tecnico_id = u.id
       JOIN usuarios r ON o.recepcionista_id = r.id
       WHERE o.id = ?`,
      [id]
    );

    if (!orden) {
      return res.status(404).json({ error: 'Orden de servicio no encontrada' });
    }

    // Detalle de repuestos
    const repuestos = await query(
      `SELECT d.*, r.codigo, r.nombre, r.marca, r.stock AS stock_actual_almacen
       FROM orden_detalles_repuestos d
       JOIN repuestos r ON d.repuesto_id = r.id
       WHERE d.orden_id = ?`,
      [id]
    );

    // Detalle de mano de obra
    const manoObra = await query(
      `SELECT * FROM orden_servicios_mano_obra WHERE orden_id = ?`,
      [id]
    );

    return res.status(200).json({
      orden,
      repuestos,
      manoObra,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener orden de servicio' });
  }
});

// Crear nueva orden con folio único y validaciones de negocio
router.post('/ordenes', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      cliente_id,
      vehiculo_id,
      tecnico_id,
      kilometraje_ingreso,
      nivel_combustible,
      motivo_ingreso,
      diagnostico,
      observaciones,
      fecha_estimada_entrega,
      repuestos = [],
      mano_obra = [],
    } = req.body;

    if (!cliente_id || !vehiculo_id || !kilometraje_ingreso || !motivo_ingreso) {
      return res.status(400).json({ error: 'Cliente, vehículo, kilometraje y motivo de ingreso son obligatorios' });
    }

    // Regla de negocio 6: Kilometraje no puede ser inferior al odómetro histórico
    const vehiculo = await queryOne('SELECT kilometraje, marca, modelo, placa FROM vehiculos WHERE id = ?', [vehiculo_id]);
    if (!vehiculo) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }

    const kmIngreso = parseInt(kilometraje_ingreso);
    if (kmIngreso < vehiculo.kilometraje) {
      return res.status(422).json({
        error: `El kilometraje de ingreso (${kmIngreso} km) no puede ser menor al kilometraje registrado anteriormente en el vehículo (${vehiculo.kilometraje} km).`,
      });
    }

    // Regla de negocio 1: Verificar existencias de repuestos
    for (const item of repuestos) {
      const rep = await queryOne('SELECT nombre, stock FROM repuestos WHERE id = ? AND activo = 1', [item.repuesto_id]);
      if (!rep) {
        return res.status(422).json({ error: `El repuesto con ID ${item.repuesto_id} no existe o está inactivo.` });
      }
      if (rep.stock < item.cantidad) {
        return res.status(422).json({
          error: `Stock insuficiente para "${rep.nombre}". Solicitado: ${item.cantidad}, Disponible: ${rep.stock}.`,
        });
      }
    }

    // Regla de negocio 4: Cálculo estricto en backend de costos, IVA y total
    let repuestosCosto = 0;
    const repuestosCalculados: Array<{ repuesto_id: number; cantidad: number; precio_unitario: number; subtotal: number }> = [];
    for (const item of repuestos) {
      const rep = await queryOne('SELECT precio_venta FROM repuestos WHERE id = ?', [item.repuesto_id]);
      const precioUnitario = parseFloat(item.precio_unitario || rep.precio_venta);
      const cant = parseInt(item.cantidad);
      const subtotalItem = Math.round(precioUnitario * cant * 100) / 100;
      repuestosCosto += subtotalItem;
      repuestosCalculados.push({
        repuesto_id: item.repuesto_id,
        cantidad: cant,
        precio_unitario: precioUnitario,
        subtotal: subtotalItem,
      });
    }

    let manoObraCosto = 0;
    const manoObraCalculada: Array<{ descripcion: string; horas: number; costo_hora: number; subtotal: number }> = [];
    for (const serv of mano_obra) {
      const horas = parseFloat(serv.horas) || 1;
      const costoHora = parseFloat(serv.costo_hora) || 0;
      const subtotalServ = Math.round(horas * costoHora * 100) / 100;
      manoObraCosto += subtotalServ;
      manoObraCalculada.push({
        descripcion: serv.descripcion || 'Servicio mecánico',
        horas,
        costo_hora: costoHora,
        subtotal: subtotalServ,
      });
    }

    const subtotal = Math.round((repuestosCosto + manoObraCosto) * 100) / 100;
    const iva = Math.round(subtotal * 0.16 * 100) / 100;
    const total = Math.round((subtotal + iva) * 100) / 100;

    // Generar folio único
    const year = new Date().getFullYear();
    const countOrdersRow = await queryOne(
      "SELECT COUNT(*) AS total FROM ordenes_servicio WHERE strftime('%Y', fecha_ingreso) = ?",
      [String(year)]
    );
    const folioNum = String((countOrdersRow?.total || 0) + 1).padStart(4, '0');
    const folio = `ORD-${year}-${folioNum}`;

    const newOrderId = await transaction(async () => {
      const { lastInsertRowid } = await run(
        `INSERT INTO ordenes_servicio (
          folio, cliente_id, vehiculo_id, tecnico_id, recepcionista_id,
          kilometraje_ingreso, nivel_combustible, motivo_ingreso, diagnostico, observaciones,
          fecha_estimada_entrega, estado, mano_obra_costo, repuestos_costo, subtotal, iva, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?, ?, ?, ?)`,
        [
          folio,
          parseInt(cliente_id),
          parseInt(vehiculo_id),
          tecnico_id ? parseInt(tecnico_id) : null,
          req.user!.id,
          kmIngreso,
          nivel_combustible || '1/2',
          motivo_ingreso.trim(),
          diagnostico || '',
          observaciones || '',
          fecha_estimada_entrega || null,
          manoObraCosto,
          repuestosCosto,
          subtotal,
          iva,
          total,
        ]
      );

      // Insertar repuestos
      for (const item of repuestosCalculados) {
        await run(
          `INSERT INTO orden_detalles_repuestos (orden_id, repuesto_id, cantidad, precio_unitario, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [lastInsertRowid, item.repuesto_id, item.cantidad, item.precio_unitario, item.subtotal]
        );
      }

      // Insertar servicios de mano de obra
      for (const serv of manoObraCalculada) {
        await run(
          `INSERT INTO orden_servicios_mano_obra (orden_id, descripcion, horas, costo_hora, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [lastInsertRowid, serv.descripcion, serv.horas, serv.costo_hora, serv.subtotal]
        );
      }

      return lastInsertRowid;
    });

    await logAudit(
      req,
      'CREACION',
      'ORDENES',
      folio,
      `Creación de orden de servicio ${folio} para vehículo ${vehiculo.placa}. Total: $${total}`
    );

    const ordenCreada = await queryOne('SELECT * FROM ordenes_servicio WHERE id = ?', [newOrderId]);
    return res.status(201).json(ordenCreada);
  } catch (error: any) {
    return res.status(500).json({ error: 'Error al crear orden de servicio: ' + (error.message || 'Error de base de datos') });
  }
});

// Actualizar contenido de la orden (si sigue abierta)
router.put('/ordenes/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { tecnico_id, diagnostico, observaciones, nivel_combustible, fecha_estimada_entrega, repuestos = [], mano_obra = [] } = req.body;

    const orden = await queryOne('SELECT * FROM ordenes_servicio WHERE id = ?', [id]);
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    // Regla de negocio 3: Inmutabilidad de órdenes finalizadas o canceladas
    if (orden.estado === 'finalizado' || orden.estado === 'cancelado') {
      return res.status(422).json({
        error: `No es posible modificar una orden con estado "${orden.estado}". La información está sellada por trazabilidad contable.`,
      });
    }

    // Validar stock de repuestos
    for (const item of repuestos) {
      const rep = await queryOne('SELECT nombre, stock FROM repuestos WHERE id = ?', [item.repuesto_id]);
      if (rep && rep.stock < item.cantidad) {
        return res.status(422).json({
          error: `Stock insuficiente para "${rep.nombre}". Existencias actuales: ${rep.stock}.`,
        });
      }
    }

    // Recalcular montos
    let repuestosCosto = 0;
    const repuestosCalculados: Array<{ repuesto_id: number; cantidad: number; precio_unitario: number; subtotal: number }> = [];
    for (const item of repuestos) {
      const rep = await queryOne('SELECT precio_venta FROM repuestos WHERE id = ?', [item.repuesto_id]);
      const precioUnitario = parseFloat(item.precio_unitario || rep?.precio_venta || 0);
      const cant = parseInt(item.cantidad);
      const subtotalItem = Math.round(precioUnitario * cant * 100) / 100;
      repuestosCosto += subtotalItem;
      repuestosCalculados.push({
        repuesto_id: item.repuesto_id,
        cantidad: cant,
        precio_unitario: precioUnitario,
        subtotal: subtotalItem,
      });
    }

    let manoObraCosto = 0;
    const manoObraCalculada: Array<{ descripcion: string; horas: number; costo_hora: number; subtotal: number }> = [];
    for (const serv of mano_obra) {
      const horas = parseFloat(serv.horas) || 1;
      const costoHora = parseFloat(serv.costo_hora) || 0;
      const subtotalServ = Math.round(horas * costoHora * 100) / 100;
      manoObraCosto += subtotalServ;
      manoObraCalculada.push({
        descripcion: serv.descripcion || 'Servicio mecánico',
        horas,
        costo_hora: costoHora,
        subtotal: subtotalServ,
      });
    }

    const subtotal = Math.round((repuestosCosto + manoObraCosto) * 100) / 100;
    const iva = Math.round(subtotal * 0.16 * 100) / 100;
    const total = Math.round((subtotal + iva) * 100) / 100;

    await transaction(async () => {
      await run(
        `UPDATE ordenes_servicio
         SET tecnico_id = ?, diagnostico = ?, observaciones = ?, nivel_combustible = ?,
             fecha_estimada_entrega = ?, mano_obra_costo = ?, repuestos_costo = ?,
             subtotal = ?, iva = ?, total = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          tecnico_id ? parseInt(tecnico_id) : null,
          diagnostico || '',
          observaciones || '',
          nivel_combustible || orden.nivel_combustible,
          fecha_estimada_entrega || orden.fecha_estimada_entrega,
          manoObraCosto,
          repuestosCosto,
          subtotal,
          iva,
          total,
          id,
        ]
      );

      // Reemplazar detalles
      await run('DELETE FROM orden_detalles_repuestos WHERE orden_id = ?', [id]);
      for (const item of repuestosCalculados) {
        await run(
          `INSERT INTO orden_detalles_repuestos (orden_id, repuesto_id, cantidad, precio_unitario, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [id, item.repuesto_id, item.cantidad, item.precio_unitario, item.subtotal]
        );
      }

      await run('DELETE FROM orden_servicios_mano_obra WHERE orden_id = ?', [id]);
      for (const serv of manoObraCalculada) {
        await run(
          `INSERT INTO orden_servicios_mano_obra (orden_id, descripcion, horas, costo_hora, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [id, serv.descripcion, serv.horas, serv.costo_hora, serv.subtotal]
        );
      }
    });

    await logAudit(req, 'ACTUALIZACION', 'ORDENES', orden.folio, `Actualización de orden ${orden.folio}`);

    const updated = await queryOne('SELECT * FROM ordenes_servicio WHERE id = ?', [id]);
    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: 'Error al actualizar orden' });
  }
});

// Cambio de estado de la orden (con Operación Transaccional crítica de inventario al finalizar)
router.patch('/ordenes/:id/estado', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { nuevo_estado, metodo_pago = 'efectivo' } = req.body;

    const estadosValidos = ['pendiente', 'en_diagnostico', 'en_reparacion', 'espera_repuestos', 'finalizado', 'cancelado'];
    if (!estadosValidos.includes(nuevo_estado)) {
      return res.status(400).json({ error: 'Estado de orden no válido' });
    }

    const orden = await queryOne('SELECT * FROM ordenes_servicio WHERE id = ?', [id]);
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    if (orden.estado === 'finalizado') {
      return res.status(422).json({ error: 'La orden ya se encuentra finalizada y liquidada.' });
    }

    if (orden.estado === 'cancelado') {
      return res.status(422).json({ error: 'Una orden cancelada no puede cambiar de estado.' });
    }

    // -------------------------------------------------------------
    // TRANSACCIÓN ATÓMICA DE CIERRE / FINALIZACIÓN DE ORDEN (POS)
    // -------------------------------------------------------------
    if (nuevo_estado === 'finalizado') {
      await transaction(async () => {
        // 1. Obtener repuestos usados en la orden
        const repuestosUsados = await query(
          'SELECT repuesto_id, cantidad FROM orden_detalles_repuestos WHERE orden_id = ?',
          [id]
        );

        // 2. Descontar stock y registrar en kárdex
        for (const item of repuestosUsados) {
          const repuesto = await queryOne('SELECT id, nombre, stock FROM repuestos WHERE id = ?', [item.repuesto_id]);
          if (!repuesto) {
            throw new Error(`Repuesto con ID ${item.repuesto_id} no existe en inventario`);
          }
          if (repuesto.stock < item.cantidad) {
            throw new Error(
              `Imposible finalizar la orden. No hay stock suficiente para "${repuesto.nombre}". Necesarios: ${item.cantidad}, Disponibles: ${repuesto.stock}`
            );
          }

          const stockNuevo = repuesto.stock - item.cantidad;
          await run('UPDATE repuestos SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [stockNuevo, repuesto.id]);

          await run(
            `INSERT INTO movimientos_inventario (repuesto_id, tipo, cantidad, stock_anterior, stock_nuevo, orden_id, motivo, usuario_id)
             VALUES (?, 'salida_orden', ?, ?, ?, ?, ?, ?)`,
            [
              repuesto.id,
              item.cantidad,
              repuesto.stock,
              stockNuevo,
              id,
              `Salida por finalización de orden ${orden.folio}`,
              req.user!.id,
            ]
          );
        }

        // 3. Actualizar odómetro del vehículo si el de la orden es superior
        await run(
          `UPDATE vehiculos
           SET kilometraje = MAX(kilometraje, ?), updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [orden.kilometraje_ingreso, orden.vehiculo_id]
        );

        // 4. Cerrar orden y marcar pagada
        await run(
          `UPDATE ordenes_servicio
           SET estado = 'finalizado', fecha_completada = CURRENT_TIMESTAMP,
               metodo_pago = ?, pagado = 1, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [metodo_pago, id]
        );
      });

      await logAudit(
        req,
        'TRANSACCION',
        'ORDENES',
        orden.folio,
        `Orden ${orden.folio} finalizada exitosamente. Total cobrado: $${orden.total} vía ${metodo_pago}. Inventario descontado.`
      );

      const ordenFinalizada = await queryOne('SELECT * FROM ordenes_servicio WHERE id = ?', [id]);
      return res.status(200).json({
        message: 'Orden finalizada con éxito. Inventario actualizado y facturación cerrada.',
        orden: ordenFinalizada,
      });
    }

    // Cambio regular de estado intermedio
    await run(
      'UPDATE ordenes_servicio SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [nuevo_estado, id]
    );

    await logAudit(
      req,
      'CAMBIO_ESTADO',
      'ORDENES',
      orden.folio,
      `Estado de orden ${orden.folio} cambiado de ${orden.estado} a ${nuevo_estado}`
    );

    const ordenActualizada = await queryOne('SELECT * FROM ordenes_servicio WHERE id = ?', [id]);
    return res.status(200).json({
      message: `Estado actualizado a "${nuevo_estado}"`,
      orden: ordenActualizada,
    });
  } catch (error: any) {
    return res.status(422).json({ error: error.message || 'Error al actualizar estado de la orden' });
  }
});

// Cancelar orden bajo permisos de Administrador
router.post('/ordenes/:id/cancelar', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { justificacion } = req.body;

    if (!justificacion || justificacion.trim().length < 5) {
      return res.status(400).json({ error: 'Debe ingresar una justificación detallada para cancelar la orden' });
    }

    const orden = await queryOne('SELECT * FROM ordenes_servicio WHERE id = ?', [id]);
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    if (orden.estado === 'cancelado') {
      return res.status(422).json({ error: 'La orden ya está cancelada' });
    }

    // Si estaba finalizada y se cancela, revertir inventario dentro de una transacción
    if (orden.estado === 'finalizado') {
      await transaction(async () => {
        const repuestosUsados = await query(
          'SELECT repuesto_id, cantidad FROM orden_detalles_repuestos WHERE orden_id = ?',
          [id]
        );
        for (const item of repuestosUsados) {
          const rep = await queryOne('SELECT id, stock FROM repuestos WHERE id = ?', [item.repuesto_id]);
          if (rep) {
            const stockNuevo = rep.stock + item.cantidad;
            await run('UPDATE repuestos SET stock = ? WHERE id = ?', [stockNuevo, rep.id]);
            await run(
              `INSERT INTO movimientos_inventario (repuesto_id, tipo, cantidad, stock_anterior, stock_nuevo, orden_id, motivo, usuario_id)
               VALUES (?, 'entrada', ?, ?, ?, ?, ?, ?)`,
              [rep.id, item.cantidad, rep.stock, stockNuevo, id, `Reversión por cancelación de orden ${orden.folio}`, req.user!.id]
            );
          }
        }
        await run(
          `UPDATE ordenes_servicio
           SET estado = 'cancelado', justificacion_cancelacion = ?, pagado = 0, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [justificacion.trim(), id]
        );
      });
    } else {
      await run(
        `UPDATE ordenes_servicio
         SET estado = 'cancelado', justificacion_cancelacion = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [justificacion.trim(), id]
      );
    }

    await logAudit(
      req,
      'CAMBIO_ESTADO',
      'ORDENES',
      orden.folio,
      `Cancelación de orden ${orden.folio}. Motivo: ${justificacion.trim()}`
    );

    return res.status(200).json({ message: 'Orden cancelada correctamente', folio: orden.folio });
  } catch (error: any) {
    return res.status(500).json({ error: 'Error al cancelar la orden: ' + error.message });
  }
});

// =============================================================
// 7. REPORTES Y ESTADÍSTICAS AVANZADAS
// =============================================================
// Reporte 1: Financiero y de Facturación con Rango de Fechas
router.get('/reportes/financiero', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;

    let whereSql = "WHERE o.estado = 'finalizado'";
    const params: any[] = [];

    if (fecha_inicio) {
      whereSql += ' AND date(o.fecha_ingreso) >= date(?)';
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      whereSql += ' AND date(o.fecha_ingreso) <= date(?)';
      params.push(fecha_fin);
    }

    // Totales agregados
    const resumen = await queryOne(
      `SELECT
         COUNT(*) AS total_ordenes,
         ROUND(COALESCE(SUM(total), 0), 2) AS facturacion_total,
         ROUND(COALESCE(SUM(subtotal), 0), 2) AS subtotal_total,
         ROUND(COALESCE(SUM(iva), 0), 2) AS iva_total,
         ROUND(COALESCE(SUM(mano_obra_costo), 0), 2) AS total_mano_obra,
         ROUND(COALESCE(SUM(repuestos_costo), 0), 2) AS total_repuestos,
         ROUND(COALESCE(AVG(total), 0), 2) AS ticket_promedio
       FROM ordenes_servicio o
       ${whereSql}`,
      params
    );

    // Desglose por método de pago
    const porMetodoPago = await query(
      `SELECT metodo_pago, COUNT(*) AS cantidad, ROUND(SUM(total), 2) AS monto
       FROM ordenes_servicio o
       ${whereSql}
       GROUP BY metodo_pago`,
      params
    );

    // Desglose por fecha (para gráfica)
    const porFecha = await query(
      `SELECT date(o.fecha_ingreso) AS fecha, ROUND(SUM(o.total), 2) AS total, COUNT(*) AS cantidad
       FROM ordenes_servicio o
       ${whereSql}
       GROUP BY date(o.fecha_ingreso)
       ORDER BY fecha ASC`,
      params
    );

    // Listado detallado de órdenes para tabla y exportación CSV
    const ordenes = await query(
      `SELECT o.id, o.folio, o.fecha_ingreso, o.fecha_completada, o.total, o.metodo_pago,
              c.nombre AS cliente, v.placa, v.marca, v.modelo,
              o.mano_obra_costo, o.repuestos_costo, o.iva
       FROM ordenes_servicio o
       JOIN clientes c ON o.cliente_id = c.id
       JOIN vehiculos v ON o.vehiculo_id = v.id
       ${whereSql}
       ORDER BY o.fecha_ingreso DESC`,
      params
    );

    return res.status(200).json({
      resumen,
      porMetodoPago,
      porFecha,
      ordenes,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al generar reporte financiero' });
  }
});

// Reporte 2: Productividad de Taller, Rendimiento de Mecánicos y Consumo de Repuestos
router.get('/reportes/productividad', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;

    let dateFilter = '';
    const params: any[] = [];

    if (fecha_inicio) {
      dateFilter += ' AND date(o.fecha_ingreso) >= date(?)';
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      dateFilter += ' AND date(o.fecha_ingreso) <= date(?)';
      params.push(fecha_fin);
    }

    // Desempeño por técnico
    const rendimientoTecnicos = await query(
      `SELECT
         u.id AS tecnico_id,
         u.nombre AS tecnico_nombre,
         COUNT(o.id) AS ordenes_totales,
         SUM(CASE WHEN o.estado = 'finalizado' THEN 1 ELSE 0 END) AS ordenes_finalizadas,
         SUM(CASE WHEN o.estado NOT IN ('finalizado', 'cancelado') THEN 1 ELSE 0 END) AS ordenes_en_proceso,
         ROUND(COALESCE(SUM(o.mano_obra_costo), 0), 2) AS facturado_mano_obra
       FROM usuarios u
       LEFT JOIN ordenes_servicio o ON u.id = o.tecnico_id ${dateFilter}
       WHERE u.rol = 'tecnico' AND u.activo = 1
       GROUP BY u.id, u.nombre`,
      params
    );

    // Top 5 repuestos más utilizados
    const topRepuestos = await query(
      `SELECT r.codigo, r.nombre, r.marca,
              SUM(d.cantidad) AS total_consumido,
              ROUND(SUM(d.subtotal), 2) AS total_facturado
       FROM orden_detalles_repuestos d
       JOIN repuestos r ON d.repuesto_id = r.id
       JOIN ordenes_servicio o ON d.orden_id = o.id
       WHERE o.estado = 'finalizado' ${dateFilter}
       GROUP BY r.id, r.codigo, r.nombre, r.marca
       ORDER BY total_consumido DESC
       LIMIT 6`,
      params
    );

    return res.status(200).json({
      rendimientoTecnicos,
      topRepuestos,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al generar reporte de productividad' });
  }
});

// =============================================================
// 8. USUARIOS Y ADMINISTRACIÓN DE PERSONAL (RBAC)
// =============================================================
router.get('/usuarios', authenticateToken, async (req: Request, res: Response) => {
  try {
    const usuarios = await query(
      'SELECT id, nombre, email, rol, telefono, activo, created_at FROM usuarios ORDER BY nombre ASC'
    );
    return res.status(200).json(usuarios);
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar usuarios' });
  }
});

router.post('/usuarios', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { nombre, email, password, rol, telefono } = req.body;

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ error: 'Nombre, email, contraseña y rol son obligatorios' });
    }

    if (!['admin', 'tecnico', 'recepcionista'].includes(rol)) {
      return res.status(422).json({ error: 'Rol inválido. Roles permitidos: admin, tecnico, recepcionista' });
    }

    const exist = await queryOne('SELECT id FROM usuarios WHERE email = ?', [email.trim().toLowerCase()]);
    if (exist) {
      return res.status(409).json({ error: 'Ya existe un usuario con este correo electrónico' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const { lastInsertRowid } = await run(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, telefono, activo)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [nombre.trim(), email.trim().toLowerCase(), passwordHash, rol, telefono || '']
    );

    await logAudit(req, 'CREACION', 'USUARIOS', String(lastInsertRowid), `Alta de usuario ${nombre} con rol ${rol}`);

    const nuevo = await queryOne(
      'SELECT id, nombre, email, rol, telefono, activo, created_at FROM usuarios WHERE id = ?',
      [lastInsertRowid]
    );
    return res.status(201).json(nuevo);
  } catch (error: any) {
    return res.status(500).json({ error: 'Error al registrar usuario: ' + error.message });
  }
});

// =============================================================
// 9. AUDITORÍA Y TRAZABILIDAD DEL SISTEMA
// =============================================================
router.get('/auditoria', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { modulo = '', accion = '', limit = '50' } = req.query;
    let whereSql = 'WHERE 1=1';
    const params: any[] = [];

    if (modulo) {
      whereSql += ' AND modulo = ?';
      params.push(modulo);
    }
    if (accion) {
      whereSql += ' AND accion = ?';
      params.push(accion);
    }

    const logs = await query(
      `SELECT * FROM auditoria_logs
       ${whereSql}
       ORDER BY fecha DESC
       LIMIT ?`,
      [...params, parseInt(limit as string) || 50]
    );

    return res.status(200).json(logs);
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar logs de auditoría' });
  }
});

export default router;
