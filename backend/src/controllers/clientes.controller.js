import { query } from '../config/db.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RFC_REGEX = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;

const normalizarBusquedaId = (texto) => {
  if (!texto) return null;
  const limpio = texto.replace(/^(id\s*#?|#)/i, '').trim();
  if (/^\d+$/.test(limpio)) {
    const num = parseInt(limpio, 10);
    return Number.isSafeInteger(num) && num > 0 ? num : null;
  }
  return null;
};

const validarDatosCliente = ({ nombre, telefono, email, rfc }, esParcial = false) => {
  const errores = {};

  if (!esParcial || nombre !== undefined) {
    const nom = typeof nombre === 'string' ? nombre.trim() : '';
    if (!nom) {
      errores.nombre = 'Ingresa el nombre completo o razón social del cliente.';
    } else if (nom.length < 3) {
      errores.nombre = 'El nombre debe tener al menos 3 caracteres.';
    } else if (nom.length > 120) {
      errores.nombre = 'El nombre no puede exceder 120 caracteres.';
    }
  }

  if (!esParcial || telefono !== undefined) {
    const tel = typeof telefono === 'string' ? telefono.trim() : '';
    const soloDigitos = tel.replace(/\D/g, '');
    if (!tel) {
      errores.telefono = 'Ingresa un número de teléfono de contacto.';
    } else if (!/^[0-9+\-() ]+$/.test(tel) || soloDigitos.length < 7 || tel.length > 20) {
      errores.telefono = 'Ingresa un teléfono válido (al menos 7 dígitos; solo números, espacios o guiones).';
    }
  }

  if (email !== undefined && email !== null && String(email).trim() !== '') {
    const mail = String(email).trim();
    if (!EMAIL_REGEX.test(mail) || mail.length > 120) {
      errores.email = 'Ingresa un correo electrónico válido (ejemplo: cliente@correo.com) o déjalo vacío.';
    }
  }

  if (rfc !== undefined && rfc !== null && String(rfc).trim() !== '') {
    const rfcLimpio = String(rfc).trim().toUpperCase();
    if (rfcLimpio.length < 12 || rfcLimpio.length > 13 || !/^[A-ZÑ&0-9]{12,13}$/.test(rfcLimpio)) {
      errores.rfc = 'El RFC debe tener 12 caracteres (persona moral) o 13 caracteres (persona física), solo letras y números.';
    } else if (!RFC_REGEX.test(rfcLimpio) && rfcLimpio.length >= 12) {
      // Permitimos alfanuméricos válidos de 12-13 caracteres compatibles con el CHECK de BD,
      // pero rechazamos cadenas con símbolos o espacios.
    }
  }

  const camposConError = Object.keys(errores);
  if (camposConError.length > 0) {
    const primerCampo = camposConError[0];
    return {
      valido: false,
      campo: primerCampo,
      mensaje: errores[primerCampo],
      errores,
    };
  }

  return { valido: true };
};

// Listar clientes con paginación, resumen de vehículos y búsqueda por nombre, teléfono, correo, RFC o ID
export const getClientes = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '10', 10) || 10));
    const buscar = req.query.buscar ? req.query.buscar.trim() : '';
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE c.activo = true';
    const params = [];

    if (buscar) {
      params.push(`%${buscar}%`);
      const idxTexto = params.length;
      const idBuscado = normalizarBusquedaId(buscar);

      if (idBuscado !== null) {
        params.push(idBuscado);
        const idxId = params.length;
        whereClause += ` AND (
          c.id = $${idxId}
          OR c.nombre ILIKE $${idxTexto}
          OR c.telefono ILIKE $${idxTexto}
          OR COALESCE(c.email, '') ILIKE $${idxTexto}
          OR COALESCE(c.rfc, '') ILIKE $${idxTexto}
          OR EXISTS (
            SELECT 1 FROM vehiculos vx
            WHERE vx.cliente_id = c.id AND vx.activo = true
              AND (vx.placas ILIKE $${idxTexto} OR vx.marca ILIKE $${idxTexto} OR vx.modelo ILIKE $${idxTexto})
          )
        )`;
      } else {
        whereClause += ` AND (
          c.nombre ILIKE $${idxTexto}
          OR c.telefono ILIKE $${idxTexto}
          OR COALESCE(c.email, '') ILIKE $${idxTexto}
          OR COALESCE(c.rfc, '') ILIKE $${idxTexto}
          OR EXISTS (
            SELECT 1 FROM vehiculos vx
            WHERE vx.cliente_id = c.id AND vx.activo = true
              AND (vx.placas ILIKE $${idxTexto} OR vx.marca ILIKE $${idxTexto} OR vx.modelo ILIKE $${idxTexto})
          )
        )`;
      }
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM clientes c ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const queryParams = [...params, limit, offset];
    const dataResult = await query(
      `SELECT c.id, c.nombre, c.telefono, c.email, c.direccion, c.rfc, c.notas, c.created_at,
              COALESCE(v_agg.total_vehiculos, 0)::INTEGER AS total_vehiculos,
              COALESCE(v_agg.vehiculos, '[]'::json) AS vehiculos
       FROM clientes c
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS total_vehiculos,
                json_agg(
                  json_build_object(
                    'id', v.id,
                    'placas', v.placas,
                    'vin', v.vin,
                    'marca', v.marca,
                    'modelo', v.modelo,
                    'anio', v.anio,
                    'color', v.color,
                    'kilometraje', v.kilometraje
                  ) ORDER BY v.id DESC
                ) AS vehiculos
         FROM vehiculos v
         WHERE v.cliente_id = c.id AND v.activo = true
       ) v_agg ON true
       ${whereClause}
       ORDER BY c.id DESC
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
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'El identificador de cliente no es válido.',
        campo: 'cliente_id',
      });
    }

    const clienteRes = await query(
      `SELECT * FROM clientes WHERE id = $1 AND activo = true`,
      [id]
    );

    if (clienteRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        mensaje: 'El cliente solicitado no existe o fue dado de baja.',
      });
    }

    const vehiculosRes = await query(
      `SELECT v.*,
              (SELECT COUNT(*)::INTEGER FROM ordenes_trabajo o WHERE o.vehiculo_id = v.id) AS total_ordenes
       FROM vehiculos v
       WHERE v.cliente_id = $1 AND v.activo = true
       ORDER BY v.id DESC`,
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
    const { nombre, telefono, email, direccion, rfc, notas } = req.body || {};

    const validacion = validarDatosCliente({ nombre, telefono, email, rfc }, false);
    if (!validacion.valido) {
      return res.status(400).json({
        success: false,
        mensaje: validacion.mensaje,
        campo: validacion.campo,
        errores: validacion.errores,
      });
    }

    const nombreLimpio = nombre.trim();
    const telefonoLimpio = telefono.trim();
    const emailLimpio = email && email.trim() ? email.trim().toLowerCase() : null;
    const rfcLimpio = rfc && rfc.trim() ? rfc.trim().toUpperCase() : null;
    const direccionLimpia = direccion && direccion.trim() ? direccion.trim() : null;
    const notasLimpias = notas && notas.trim() ? notas.trim() : null;

    // Verificar duplicado obvio de RFC activo para orientar al usuario
    if (rfcLimpio) {
      const dupRfc = await query(
        `SELECT id, nombre FROM clientes WHERE UPPER(rfc) = $1 AND activo = true LIMIT 1`,
        [rfcLimpio]
      );
      if (dupRfc.rows.length > 0) {
        return res.status(409).json({
          success: false,
          campo: 'rfc',
          errores: {
            rfc: `Este RFC ya está registrado para el cliente "${dupRfc.rows[0].nombre}" (ID #${dupRfc.rows[0].id}).`,
          },
          mensaje: `Este RFC ya pertenece a "${dupRfc.rows[0].nombre}" (ID #${dupRfc.rows[0].id}). Búscalo en el directorio para evitar duplicados.`,
        });
      }
    }

    const result = await query(
      `INSERT INTO clientes (nombre, telefono, email, direccion, rfc, notas)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [nombreLimpio, telefonoLimpio, emailLimpio, direccionLimpia, rfcLimpio, notasLimpias]
    );

    res.status(201).json({
      success: true,
      mensaje: 'Cliente registrado correctamente.',
      cliente: {
        ...result.rows[0],
        total_vehiculos: 0,
        vehiculos: [],
      },
    });
  } catch (error) {
    next(error);
  }
};

// Actualizar cliente
export const actualizarCliente = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'El identificador de cliente no es válido.',
      });
    }

    const { nombre, telefono, email, direccion, rfc, notas } = req.body || {};
    const validacion = validarDatosCliente({ nombre, telefono, email, rfc }, true);
    if (!validacion.valido) {
      return res.status(400).json({
        success: false,
        mensaje: validacion.mensaje,
        campo: validacion.campo,
        errores: validacion.errores,
      });
    }

    const result = await query(
      `UPDATE clientes
       SET nombre = COALESCE($1, nombre),
           telefono = COALESCE($2, telefono),
           email = CASE WHEN $3::TEXT IS NULL THEN email WHEN $3::TEXT = '' THEN NULL ELSE LOWER($3) END,
           direccion = COALESCE($4, direccion),
           rfc = CASE WHEN $5::TEXT IS NULL THEN rfc WHEN $5::TEXT = '' THEN NULL ELSE UPPER($5) END,
           notas = COALESCE($6, notas)
       WHERE id = $7 AND activo = true
       RETURNING *`,
      [
        nombre !== undefined ? nombre.trim() : null,
        telefono !== undefined ? telefono.trim() : null,
        email !== undefined ? String(email).trim() : null,
        direccion !== undefined ? String(direccion).trim() : null,
        rfc !== undefined ? String(rfc).trim() : null,
        notas !== undefined ? String(notas).trim() : null,
        id,
      ]
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

// Baja lógica de cliente (preserva órdenes y evidencia histórica)
export const eliminarCliente = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await query(
      `UPDATE clientes SET activo = false WHERE id = $1 AND activo = true RETURNING id, nombre`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        mensaje: 'Cliente no encontrado o ya desactivado.',
      });
    }

    await query(
      `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, datos_anteriores, ip)
       VALUES ($1, 'baja_logica_cliente', 'clientes', $2, $3, $4)`,
      [
        req.usuario.id,
        id,
        JSON.stringify({ nombre: result.rows[0].nombre }),
        req.ip || null,
      ]
    );

    res.status(200).json({
      success: true,
      mensaje: 'Cliente desactivado exitosamente (su historial de órdenes y evidencia se conserva).',
    });
  } catch (error) {
    next(error);
  }
};

// Listar y buscar vehículos con información reconocible de su cliente propietario
export const getVehiculos = async (req, res, next) => {
  try {
    const buscar = req.query.buscar ? req.query.buscar.trim() : '';
    const clienteIdRaw = req.query.cliente_id;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10) || 50));

    let whereClause = 'WHERE v.activo = true AND c.activo = true';
    const params = [];

    if (clienteIdRaw !== undefined && clienteIdRaw !== '') {
      const clienteId = parseInt(clienteIdRaw, 10);
      if (isNaN(clienteId) || clienteId <= 0) {
        return res.status(400).json({
          success: false,
          mensaje: 'El identificador de cliente para filtrar vehículos no es válido.',
          campo: 'cliente_id',
        });
      }
      params.push(clienteId);
      whereClause += ` AND v.cliente_id = $${params.length}`;
    }

    if (buscar) {
      params.push(`%${buscar}%`);
      const idxTexto = params.length;
      const idBuscado = normalizarBusquedaId(buscar);

      if (idBuscado !== null) {
        params.push(idBuscado);
        const idxId = params.length;
        whereClause += ` AND (
          v.id = $${idxId}
          OR v.cliente_id = $${idxId}
          OR v.placas ILIKE $${idxTexto}
          OR v.marca ILIKE $${idxTexto}
          OR v.modelo ILIKE $${idxTexto}
          OR COALESCE(v.vin, '') ILIKE $${idxTexto}
          OR c.nombre ILIKE $${idxTexto}
          OR c.telefono ILIKE $${idxTexto}
        )`;
      } else {
        whereClause += ` AND (
          v.placas ILIKE $${idxTexto}
          OR v.marca ILIKE $${idxTexto}
          OR v.modelo ILIKE $${idxTexto}
          OR (v.marca || ' ' || v.modelo) ILIKE $${idxTexto}
          OR COALESCE(v.vin, '') ILIKE $${idxTexto}
          OR c.nombre ILIKE $${idxTexto}
          OR c.telefono ILIKE $${idxTexto}
        )`;
      }
    }

    params.push(limit);
    const result = await query(
      `SELECT v.*,
              c.nombre AS cliente_nombre,
              c.telefono AS cliente_telefono,
              c.email AS cliente_email,
              (SELECT COUNT(*)::INTEGER FROM ordenes_trabajo o WHERE o.vehiculo_id = v.id) AS total_ordenes
       FROM vehiculos v
       JOIN clientes c ON c.id = v.cliente_id
       ${whereClause}
       ORDER BY v.id DESC
       LIMIT $${params.length}`,
      params
    );

    res.status(200).json({
      success: true,
      total: result.rows.length,
      datos: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// Crear vehículo para un cliente activo con validación exhaustiva de duplicados y formatos
export const crearVehiculo = async (req, res, next) => {
  try {
    const {
      cliente_id,
      placas,
      vin,
      marca,
      modelo,
      anio,
      color,
      kilometraje,
      motor,
      transmision,
      combustible,
    } = req.body || {};

    const errores = {};

    const clienteIdNum = parseInt(cliente_id, 10);
    if (!cliente_id || isNaN(clienteIdNum) || clienteIdNum <= 0) {
      errores.cliente_id = 'Selecciona el cliente propietario al que se asociará este vehículo.';
    }

    const placaLimpia = typeof placas === 'string' ? placas.trim().toUpperCase() : '';
    if (!placaLimpia) {
      errores.placas = 'Ingresa las placas del vehículo (ejemplo: ABC-123-A).';
    } else if (placaLimpia.length < 3 || placaLimpia.length > 10) {
      errores.placas = 'La placa debe tener entre 3 y 10 caracteres.';
    } else if (!/^[A-Z0-9-]+$/.test(placaLimpia)) {
      errores.placas = 'La placa solo puede contener letras, números y guiones (sin espacios).';
    }

    let vinLimpio = null;
    if (vin !== undefined && vin !== null && String(vin).trim() !== '') {
      vinLimpio = String(vin).trim().toUpperCase();
      if (vinLimpio.length !== 17) {
        errores.vin = `El número VIN debe contener exactamente 17 caracteres (capturaste ${vinLimpio.length}).`;
      } else if (!/^[A-Z0-9]{17}$/.test(vinLimpio)) {
        errores.vin = 'El número VIN solo puede contener letras y números (sin espacios ni guiones).';
      }
    }

    const marcaLimpia = typeof marca === 'string' ? marca.trim() : '';
    if (!marcaLimpia) {
      errores.marca = 'Indica la marca del vehículo (ejemplo: Toyota, Volkswagen, Nissan).';
    }

    const modeloLimpio = typeof modelo === 'string' ? modelo.trim() : '';
    if (!modeloLimpio) {
      errores.modelo = 'Indica el modelo del vehículo (ejemplo: Corolla, Jetta, Versa).';
    }

    const anioNum = parseInt(anio, 10);
    if (anio === undefined || anio === '' || isNaN(anioNum) || anioNum < 1950 || anioNum > 2100) {
      errores.anio = 'Ingresa un año válido entre 1950 y 2100.';
    }

    const kmNum =
      kilometraje !== undefined && kilometraje !== null && String(kilometraje).trim() !== ''
        ? parseInt(kilometraje, 10)
        : 0;
    if (isNaN(kmNum) || kmNum < 0) {
      errores.kilometraje = 'El kilometraje debe ser un número entero mayor o igual a 0.';
    }

    const camposConError = Object.keys(errores);
    if (camposConError.length > 0) {
      const primerCampo = camposConError[0];
      return res.status(400).json({
        success: false,
        campo: primerCampo,
        mensaje: errores[primerCampo],
        errores,
      });
    }

    // Regla RN-02: verificar que el cliente exista y esté activo
    const clienteRes = await query(
      `SELECT id, nombre, activo FROM clientes WHERE id = $1`,
      [clienteIdNum]
    );
    if (clienteRes.rows.length === 0 || !clienteRes.rows[0].activo) {
      return res.status(400).json({
        success: false,
        campo: 'cliente_id',
        errores: {
          cliente_id: 'El cliente seleccionado no existe o se encuentra inactivo. Elige un cliente activo.',
        },
        mensaje: 'El cliente seleccionado no existe o está inactivo. Selecciona un cliente activo para vincular el vehículo.',
      });
    }

    // Verificar duplicidad de placas antes de insertar para dar retroalimentación accionable
    const placaExistente = await query(
      `SELECT v.id, v.placas, v.marca, v.modelo, v.anio, v.cliente_id
       FROM vehiculos v
       WHERE UPPER(v.placas) = $1
       LIMIT 1`,
      [placaLimpia]
    );
    if (placaExistente.rows.length > 0) {
      const ex = placaExistente.rows[0];
      const mismoCliente = ex.cliente_id === clienteIdNum;
      const msg = mismoCliente
        ? `Este vehículo (${ex.marca} ${ex.modelo} ${ex.anio}, placas ${ex.placas}, ID #${ex.id}) ya está registrado para este mismo cliente. No es necesario darlo de alta de nuevo.`
        : `La placa ${ex.placas} ya está registrada en el sistema (${ex.marca} ${ex.modelo} ${ex.anio}, ID #${ex.id}). Verifica los caracteres de la placa.`;
      return res.status(409).json({
        success: false,
        campo: 'placas',
        errores: { placas: msg },
        mensaje: msg,
      });
    }

    // Verificar duplicidad de VIN si se proporcionó
    if (vinLimpio) {
      const vinExistente = await query(
        `SELECT v.id, v.placas, v.marca, v.modelo, v.anio, v.cliente_id
         FROM vehiculos v
         WHERE UPPER(v.vin) = $1
         LIMIT 1`,
        [vinLimpio]
      );
      if (vinExistente.rows.length > 0) {
        const ex = vinExistente.rows[0];
        const msg =
          ex.cliente_id === clienteIdNum
            ? `Este VIN ya pertenece al vehículo ${ex.marca} ${ex.modelo} (${ex.placas}, ID #${ex.id}) de este cliente.`
            : `Este número VIN ya está registrado en otro vehículo (${ex.marca} ${ex.modelo}, placas ${ex.placas}). Revisa los 17 caracteres del VIN.`;
        return res.status(409).json({
          success: false,
          campo: 'vin',
          errores: { vin: msg },
          mensaje: msg,
        });
      }
    }

    const result = await query(
      `INSERT INTO vehiculos (cliente_id, placas, vin, marca, modelo, anio, color, kilometraje, motor, transmision, combustible)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        clienteIdNum,
        placaLimpia,
        vinLimpio,
        marcaLimpia,
        modeloLimpio,
        anioNum,
        color && String(color).trim() ? String(color).trim() : null,
        kmNum,
        motor && String(motor).trim() ? String(motor).trim() : null,
        transmision && String(transmision).trim() ? String(transmision).trim() : null,
        combustible && String(combustible).trim() ? String(combustible).trim() : null,
      ]
    );

    res.status(201).json({
      success: true,
      mensaje: `Vehículo ${marcaLimpia} ${modeloLimpio} (${placaLimpia}) vinculado a ${clienteRes.rows[0].nombre}.`,
      vehiculo: {
        ...result.rows[0],
        cliente_nombre: clienteRes.rows[0].nombre,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Obtener expediente completo / historial de órdenes, servicios, piezas y evidencia fotográfica de un vehículo
export const getHistorialVehiculo = async (req, res, next) => {
  try {
    const vehiculoId = parseInt(req.params.vehiculoId, 10);
    if (isNaN(vehiculoId) || vehiculoId <= 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'El identificador del vehículo no es válido.',
      });
    }

    const vehRes = await query(
      `SELECT v.*,
              c.nombre AS cliente_nombre,
              c.telefono AS cliente_telefono,
              c.email AS cliente_email
       FROM vehiculos v
       JOIN clientes c ON c.id = v.cliente_id
       WHERE v.id = $1`,
      [vehiculoId]
    );

    if (vehRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        mensaje: 'Vehículo no encontrado.',
      });
    }

    const ordenesRes = await query(
      `SELECT o.*,
              m.nombre AS mecanico_nombre,
              u.nombre AS creador_nombre,
              s.pagado,
              s.saldo
       FROM ordenes_trabajo o
       LEFT JOIN mecanicos m ON m.id = o.mecanico_id
       JOIN usuarios u ON u.id = o.creado_por
       LEFT JOIN vw_ordenes_saldo s ON s.orden_id = o.id
       WHERE o.vehiculo_id = $1
       ORDER BY o.fecha_ingreso DESC, o.id DESC`,
      [vehiculoId]
    );

    const ordenIds = ordenesRes.rows.map((o) => o.id);
    let serviciosPorOrden = {};
    let refaccionesPorOrden = {};
    let evidenciasPorOrden = {};

    if (ordenIds.length > 0) {
      const [srvRes, refRes, evRes] = await Promise.all([
        query(
          `SELECT os.*, s.codigo, s.nombre
           FROM orden_servicios os
           JOIN servicios s ON s.id = os.servicio_id
           WHERE os.orden_id = ANY($1::INT[])
           ORDER BY os.id ASC`,
          [ordenIds]
        ),
        query(
          `SELECT orf.*, r.sku, r.nombre, r.marca
           FROM orden_refacciones orf
           JOIN refacciones r ON r.id = orf.refaccion_id
           WHERE orf.orden_id = ANY($1::INT[])
           ORDER BY orf.id ASC`,
          [ordenIds]
        ),
        query(
          `SELECT e.id, e.orden_id, e.orden_servicio_id, e.servicio_id, e.etapa,
                  e.descripcion, e.nombre_original, e.mime_type, e.tamano_bytes, e.created_at,
                  u.nombre AS autor_nombre,
                  r.nombre AS autor_rol,
                  s.nombre AS servicio_nombre,
                  s.codigo AS servicio_codigo
           FROM orden_evidencias e
           JOIN usuarios u ON u.id = e.subido_por
           JOIN roles r ON r.id = u.rol_id
           LEFT JOIN servicios s ON s.id = e.servicio_id
           WHERE e.orden_id = ANY($1::INT[]) AND e.activo = true
           ORDER BY e.created_at ASC, e.id ASC`,
          [ordenIds]
        ),
      ]);

      for (const s of srvRes.rows) {
        if (!serviciosPorOrden[s.orden_id]) serviciosPorOrden[s.orden_id] = [];
        serviciosPorOrden[s.orden_id].push(s);
      }
      for (const rf of refRes.rows) {
        if (!refaccionesPorOrden[rf.orden_id]) refaccionesPorOrden[rf.orden_id] = [];
        refaccionesPorOrden[rf.orden_id].push(rf);
      }
      for (const ev of evRes.rows) {
        if (!evidenciasPorOrden[ev.orden_id]) evidenciasPorOrden[ev.orden_id] = [];
        evidenciasPorOrden[ev.orden_id].push(ev);
      }
    }

    const ordenesConDetalle = ordenesRes.rows.map((o) => ({
      ...o,
      servicios: serviciosPorOrden[o.id] || [],
      refacciones: refaccionesPorOrden[o.id] || [],
      evidencias: evidenciasPorOrden[o.id] || [],
    }));

    const totalEvidencias = Object.values(evidenciasPorOrden).reduce((acc, arr) => acc + arr.length, 0);

    res.status(200).json({
      success: true,
      vehiculo: vehRes.rows[0],
      resumen: {
        totalVisitas: ordenesConDetalle.length,
        totalEvidencias,
      },
      ordenes: ordenesConDetalle,
    });
  } catch (error) {
    next(error);
  }
};
