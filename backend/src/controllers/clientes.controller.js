import { query } from '../config/db.js';

// Listar clientes con paginación y búsqueda (Req #13, #16)
export const getClientes = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const buscar = req.query.buscar ? req.query.buscar.trim() : '';
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE activo = true';
    const params = [];

    if (buscar) {
      params.push(`%${buscar}%`);
      whereClause += ` AND (nombre ILIKE $${params.length} OR telefono ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM clientes ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const queryParams = [...params, limit, offset];
    const dataResult = await query(
      `SELECT id, nombre, telefono, email, direccion, rfc, notas, created_at
       FROM clientes
       ${whereClause}
       ORDER BY id DESC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    res.status(200).json({
      success: true,
      pagina: page,
      limite: limit,
      total,
      totalPaginas: Math.ceil(total / limit) || 1,
      datos: dataResult.rows,
    });
  } catch (error) {
    next(error);
  }
};

// Obtener un cliente con sus vehículos asociados
export const getClienteById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const clienteRes = await query(
      `SELECT * FROM clientes WHERE id = $1 AND activo = true`,
      [id]
    );

    if (clienteRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        mensaje: 'Cliente no encontrado.',
      });
    }

    const vehiculosRes = await query(
      `SELECT * FROM vehiculos WHERE cliente_id = $1 AND activo = true ORDER BY id DESC`,
      [id]
    );

    res.status(200).json({
      success: true,
      cliente: clienteRes.rows[0],
      vehiculos: vehiculosRes.rows,
    });
  } catch (error) {
    next(error);
  }
};

// Crear cliente
export const crearCliente = async (req, res, next) => {
  try {
    const { nombre, telefono, email, direccion, rfc, notas } = req.body;

    if (!nombre || !telefono) {
      return res.status(400).json({
        success: false,
        mensaje: 'El nombre y el teléfono son campos obligatorios.',
      });
    }

    const result = await query(
      `INSERT INTO clientes (nombre, telefono, email, direccion, rfc, notas)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [nombre, telefono, email || null, direccion || null, rfc ? rfc.toUpperCase() : null, notas || null]
    );

    res.status(201).json({
      success: true,
      mensaje: 'Cliente registrado correctamente.',
      cliente: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// Actualizar cliente
export const actualizarCliente = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, telefono, email, direccion, rfc, notas } = req.body;

    const result = await query(
      `UPDATE clientes
       SET nombre = COALESCE($1, nombre),
           telefono = COALESCE($2, telefono),
           email = COALESCE($3, email),
           direccion = COALESCE($4, direccion),
           rfc = COALESCE($5, rfc),
           notas = COALESCE($6, notas)
       WHERE id = $7 AND activo = true
       RETURNING *`,
      [nombre, telefono, email, direccion, rfc ? rfc.toUpperCase() : null, notas, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        mensaje: 'Cliente no encontrado o inactivo.',
      });
    }

    res.status(200).json({
      success: true,
      mensaje: 'Cliente actualizado correctamente.',
      cliente: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// Baja lógica de cliente (Req #22)
export const eliminarCliente = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE clientes SET activo = false WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        mensaje: 'Cliente no encontrado.',
      });
    }

    res.status(200).json({
      success: true,
      mensaje: 'Cliente desactivado exitosamente (baja lógica).',
    });
  } catch (error) {
    next(error);
  }
};

// Crear vehículo para un cliente
export const crearVehiculo = async (req, res, next) => {
  try {
    const { cliente_id, placas, vin, marca, modelo, anio, color, kilometraje, motor, transmision, combustible } = req.body;

    if (!cliente_id || !placas || !marca || !modelo || !anio) {
      return res.status(400).json({
        success: false,
        mensaje: 'cliente_id, placas, marca, modelo y año son campos obligatorios.',
      });
    }

    // Normalización y validación de placas
    const placaLimpia = placas.trim().toUpperCase();
    if (placaLimpia.length < 3 || placaLimpia.length > 10) {
      return res.status(400).json({
        success: false,
        mensaje: 'La placa debe tener entre 3 y 10 caracteres.',
      });
    }

    if (!/^[A-Z0-9-]+$/.test(placaLimpia)) {
      return res.status(400).json({
        success: false,
        mensaje: 'La placa solo puede contener letras, números y guiones.',
      });
    }

    // Normalización y validación de VIN (Número de Identificación Vehicular)
    let vinLimpio = null;
    if (vin && vin.trim()) {
      vinLimpio = vin.trim().toUpperCase();
      if (vinLimpio.length !== 17) {
        return res.status(400).json({
          success: false,
          mensaje: 'El número VIN debe contener exactamente 17 caracteres.',
        });
      }

      if (!/^[A-Z0-9]{17}$/.test(vinLimpio)) {
        return res.status(400).json({
          success: false,
          mensaje: 'El número VIN solo puede contener caracteres alfanuméricos válidos.',
        });
      }
    }

    // Validación de año
    const anioNum = parseInt(anio, 10);
    if (isNaN(anioNum) || anioNum < 1950 || anioNum > 2100) {
      return res.status(400).json({
        success: false,
        mensaje: 'El año del vehículo debe estar entre 1950 y 2100.',
      });
    }

    // Validación de kilometraje
    const kmNum = kilometraje !== undefined && kilometraje !== null ? parseInt(kilometraje, 10) : 0;
    if (isNaN(kmNum) || kmNum < 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'El kilometraje debe ser un valor numérico mayor o igual a cero.',
      });
    }

    const result = await query(
      `INSERT INTO vehiculos (cliente_id, placas, vin, marca, modelo, anio, color, kilometraje, motor, transmision, combustible)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        cliente_id,
        placaLimpia,
        vinLimpio,
        marca.trim(),
        modelo.trim(),
        anioNum,
        color ? color.trim() : null,
        kmNum,
        motor ? motor.trim() : null,
        transmision ? transmision.trim() : null,
        combustible ? combustible.trim() : null
      ]
    );

    res.status(201).json({
      success: true,
      mensaje: 'Vehículo registrado correctamente.',
      vehiculo: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};
