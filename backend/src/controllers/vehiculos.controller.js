import { query } from '../config/db.js';

// Estados de una orden que se consideran "abiertas" (la orden sigue en proceso).
const ESTADOS_ABIERTOS = ['programada', 'en_revision', 'en_reparacion'];

// Campos de texto opcionales con su longitud máxima en la base de datos.
const TEXTOS = { marca: 50, modelo: 60, color: 30, motor: 60, transmision: 30, combustible: 30 };

// Un valor "no enviado" (undefined, null o texto vacío) deja el campo sin cambios.
const dato = (v) => (v === undefined || v === null || (typeof v === 'string' && v.trim() === '') ? undefined : v);

const respuestaError = (res, status, mensaje) => res.status(status).json({ success: false, mensaje });

// Valida y normaliza solo los campos que vienen en el cuerpo (mismas reglas que crearVehiculo).
const normalizarVehiculo = (body) => {
  const out = {};

  const placas = dato(body.placas);
  if (placas !== undefined) {
    if (typeof placas !== 'string') return { error: 'Las placas deben ser texto.' };
    const placa = placas.trim().toUpperCase();
    if (placa.length < 3 || placa.length > 10) return { error: 'La placa debe tener entre 3 y 10 caracteres.' };
    if (!/^[A-Z0-9-]+$/.test(placa)) return { error: 'La placa solo puede contener letras, números y guiones.' };
    out.placas = placa;
  }

  const vin = dato(body.vin);
  if (vin !== undefined) {
    const vinLimpio = String(vin).trim().toUpperCase();
    if (vinLimpio.length !== 17) return { error: 'El número VIN debe contener exactamente 17 caracteres.' };
    if (!/^[A-Z0-9]{17}$/.test(vinLimpio)) return { error: 'El número VIN solo puede contener caracteres alfanuméricos válidos.' };
    out.vin = vinLimpio;
  }

  for (const [campo, max] of Object.entries(TEXTOS)) {
    const valor = dato(body[campo]);
    if (valor !== undefined) {
      if (typeof valor !== 'string') return { error: `${campo} debe ser texto.` };
      const limpio = valor.trim();
      if (limpio.length > max) return { error: `${campo} no puede tener más de ${max} caracteres.` };
      out[campo] = limpio;
    }
  }

  const anio = dato(body.anio);
  if (anio !== undefined) {
    const n = Number(anio);
    if (!Number.isInteger(n) || n < 1950 || n > 2100) return { error: 'El año del vehículo debe estar entre 1950 y 2100.' };
    out.anio = n;
  }

  const km = dato(body.kilometraje);
  if (km !== undefined) {
    const n = Number(km);
    if (!Number.isInteger(n) || n < 0) return { error: 'El kilometraje debe ser un número entero mayor o igual a cero.' };
    out.kilometraje = n;
  }

  const clienteId = dato(body.cliente_id);
  if (clienteId !== undefined) {
    const n = Number(clienteId);
    if (!Number.isInteger(n) || n < 1) return { error: 'cliente_id debe ser un número entero válido.' };
    out.cliente_id = n;
  }

  return { valores: out };
};

const idValido = (valor) => {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// Listar vehículos con paginación, búsqueda y filtros
export const getVehiculos = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10) || 10, 1), 100);
    const buscar = req.query.buscar ? req.query.buscar.trim() : '';
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE v.activo = true';
    const params = [];

    if (buscar) {
      params.push(`%${buscar}%`);
      const p = `$${params.length}`;
      whereClause += ` AND (v.placas ILIKE ${p} OR v.vin ILIKE ${p} OR v.marca ILIKE ${p} OR v.modelo ILIKE ${p} OR c.nombre ILIKE ${p})`;
    }

    if (req.query.cliente_id) {
      const clienteId = idValido(req.query.cliente_id);
      if (!clienteId) return respuestaError(res, 400, 'cliente_id debe ser un número entero válido.');
      params.push(clienteId);
      whereClause += ` AND v.cliente_id = $${params.length}`;
    }

    if (req.query.marca) {
      params.push(req.query.marca.trim());
      whereClause += ` AND v.marca ILIKE $${params.length}`;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM vehiculos v JOIN clientes c ON c.id = v.cliente_id ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const queryParams = [...params, limit, offset];
    const dataResult = await query(
      `SELECT v.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono
       FROM vehiculos v
       JOIN clientes c ON c.id = v.cliente_id
       ${whereClause}
       ORDER BY v.id DESC
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

// Obtener un vehículo con los datos de su propietario
export const getVehiculoById = async (req, res, next) => {
  try {
    const id = idValido(req.params.id);
    if (!id) return respuestaError(res, 400, 'El id del vehículo no es válido.');

    const result = await query(
      `SELECT v.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono, c.email AS cliente_email,
              (SELECT COUNT(*)::int FROM ordenes_trabajo o WHERE o.vehiculo_id = v.id) AS ordenes_total
       FROM vehiculos v
       JOIN clientes c ON c.id = v.cliente_id
       WHERE v.id = $1 AND v.activo = true`,
      [id]
    );

    if (result.rows.length === 0) return respuestaError(res, 404, 'Vehículo no encontrado.');

    res.status(200).json({ success: true, vehiculo: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// Actualizar un vehículo (edición parcial: solo cambian los campos enviados)
export const actualizarVehiculo = async (req, res, next) => {
  try {
    const id = idValido(req.params.id);
    if (!id) return respuestaError(res, 400, 'El id del vehículo no es válido.');

    const { error, valores } = normalizarVehiculo(req.body || {});
    if (error) return respuestaError(res, 400, error);
    if (Object.keys(valores).length === 0) {
      return respuestaError(res, 400, 'No se enviaron campos válidos para actualizar.');
    }

    if (valores.cliente_id !== undefined) {
      const cliente = await query(`SELECT id FROM clientes WHERE id = $1 AND activo = true`, [valores.cliente_id]);
      if (cliente.rows.length === 0) {
        return respuestaError(res, 400, 'El cliente indicado no existe o está inactivo.');
      }
    }

    const v = valores;
    const result = await query(
      `UPDATE vehiculos
       SET cliente_id = COALESCE($1, cliente_id),
           placas = COALESCE($2, placas),
           vin = COALESCE($3, vin),
           marca = COALESCE($4, marca),
           modelo = COALESCE($5, modelo),
           anio = COALESCE($6, anio),
           color = COALESCE($7, color),
           kilometraje = COALESCE($8, kilometraje),
           motor = COALESCE($9, motor),
           transmision = COALESCE($10, transmision),
           combustible = COALESCE($11, combustible),
           updated_at = NOW()
       WHERE id = $12 AND activo = true
       RETURNING *`,
      [v.cliente_id, v.placas, v.vin, v.marca, v.modelo, v.anio, v.color, v.kilometraje, v.motor, v.transmision, v.combustible, id]
    );

    if (result.rows.length === 0) return respuestaError(res, 404, 'Vehículo no encontrado o inactivo.');

    res.status(200).json({
      success: true,
      mensaje: 'Vehículo actualizado correctamente.',
      vehiculo: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// Baja lógica de un vehículo (no se permite si tiene órdenes abiertas)
export const eliminarVehiculo = async (req, res, next) => {
  try {
    const id = idValido(req.params.id);
    if (!id) return respuestaError(res, 400, 'El id del vehículo no es válido.');

    const abiertas = await query(
      `SELECT COUNT(*)::int AS total FROM ordenes_trabajo WHERE vehiculo_id = $1 AND estado = ANY($2)`,
      [id, ESTADOS_ABIERTOS]
    );
    if (abiertas.rows[0].total > 0) {
      return respuestaError(
        res,
        422,
        `No se puede dar de baja el vehículo: tiene ${abiertas.rows[0].total} orden(es) de trabajo abierta(s).`
      );
    }

    const result = await query(
      `UPDATE vehiculos SET activo = false, updated_at = NOW() WHERE id = $1 AND activo = true RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) return respuestaError(res, 404, 'Vehículo no encontrado.');

    res.status(200).json({
      success: true,
      mensaje: 'Vehículo dado de baja exitosamente (baja lógica).',
    });
  } catch (error) {
    next(error);
  }
};
