import { pool, query } from '../config/db.js';
import {
  obtenerEvidenciasActivasOrden,
  evaluarEvidenciaObligatoria,
} from './evidencias.controller.js';
import { sincronizarEstatusMecanico } from './mecanicos.controller.js';

const METODOS_PAGO_VALIDOS = new Set(['efectivo', 'debito', 'credito', 'transferencia']);
const TIPOS_PAGO_VALIDOS = new Set(['anticipo', 'abono', 'liquidacion']);

// Listar órdenes con paginación, filtros de estado y búsqueda
export const getOrdenes = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10) || 50));
    const rawEstado = req.query.estado ? req.query.estado.trim().toLowerCase() : '';
    const buscar = req.query.buscar ? req.query.buscar.trim() : '';
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (rawEstado && rawEstado !== 'todos' && rawEstado !== 'todas') {
      if (rawEstado === 'pendiente' || rawEstado === 'pendientes') {
        whereClause += ` AND o.estado IN ('programada', 'en_revision', 'en_reparacion')`;
      } else if (
        rawEstado === 'completado' ||
        rawEstado === 'completada' ||
        rawEstado === 'completados' ||
        rawEstado === 'completadas'
      ) {
        whereClause += ` AND o.estado = 'completada'`;
      } else if (
        rawEstado === 'entregado' ||
        rawEstado === 'entregada' ||
        rawEstado === 'entregados' ||
        rawEstado === 'entregadas'
      ) {
        whereClause += ` AND o.estado = 'entregada'`;
      } else {
        params.push(rawEstado);
        whereClause += ` AND o.estado = $${params.length}`;
      }
    }

    if (buscar) {
      params.push(`%${buscar}%`);
      whereClause += ` AND (o.folio ILIKE $${params.length} OR v.placas ILIKE $${params.length} OR c.nombre ILIKE $${params.length} OR (v.marca || ' ' || v.modelo) ILIKE $${params.length} OR COALESCE(m.nombre, '') ILIKE $${params.length})`;
    }

    if (req.query.mecanico_id && String(req.query.mecanico_id).trim() !== '') {
      const mecFiltroId = parseInt(req.query.mecanico_id, 10);
      if (!isNaN(mecFiltroId) && mecFiltroId > 0) {
        params.push(mecFiltroId);
        whereClause += ` AND o.mecanico_id = $${params.length}`;
      }
    }

    const countResult = await query(
      `SELECT COUNT(*)
       FROM ordenes_trabajo o
       JOIN vehiculos v ON v.id = o.vehiculo_id
       JOIN clientes c ON c.id = v.cliente_id
       LEFT JOIN mecanicos m ON m.id = o.mecanico_id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const contadoresRes = await query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE estado IN ('programada', 'en_revision', 'en_reparacion')) AS pendientes,
         COUNT(*) FILTER (WHERE estado = 'completada') AS completadas,
         COUNT(*) FILTER (WHERE estado = 'entregada') AS entregadas
       FROM ordenes_trabajo`
    );
    const conteosRow = contadoresRes.rows[0] || {};

    const queryParams = [...params, limit, offset];
    const dataResult = await query(
      `SELECT o.*,
              v.placas, v.marca, v.modelo, v.anio,
              c.id AS cliente_id, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
              m.nombre AS mecanico_nombre, m.tipo AS mecanico_tipo, m.especialidad AS mecanico_especialidad, m.estatus AS mecanico_estatus,
              u.nombre AS creador_nombre,
              s.pagado, s.saldo,
              (SELECT COUNT(*)::INTEGER FROM orden_evidencias e WHERE e.orden_id = o.id AND e.activo = true) AS total_evidencias
       FROM ordenes_trabajo o
       JOIN vehiculos v ON v.id = o.vehiculo_id
       JOIN clientes c ON c.id = v.cliente_id
       LEFT JOIN mecanicos m ON m.id = o.mecanico_id
       JOIN usuarios u ON u.id = o.creado_por
       LEFT JOIN vw_ordenes_saldo s ON s.orden_id = o.id
       ${whereClause}
       ORDER BY o.id DESC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    res.status(200).json({
      success: true,
      pagina: page,
      limite: limit,
      total,
      totalPaginas: Math.ceil(total / limit) || 1,
      conteos: {
        total: parseInt(conteosRow.total || 0, 10),
        pendientes: parseInt(conteosRow.pendientes || 0, 10),
        completadas: parseInt(conteosRow.completadas || 0, 10),
        entregadas: parseInt(conteosRow.entregadas || 0, 10),
      },
      datos: dataResult.rows,
    });
  } catch (error) {
    next(error);
  }
};

// Obtener detalle completo de una orden (incluyendo servicios, refacciones, pagos y evidencia fotográfica)
export const getOrdenById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'El identificador de la orden no es válido.',
      });
    }

    const ordenRes = await query(
      `SELECT o.*,
              v.placas, v.marca, v.modelo, v.anio, v.color, v.vin, v.kilometraje AS vehiculo_kilometraje,
              c.id AS cliente_id, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
              c.email AS cliente_email, c.direccion AS cliente_direccion, c.rfc AS cliente_rfc,
              m.nombre AS mecanico_nombre, m.tipo AS mecanico_tipo, m.especialidad AS mecanico_especialidad,
              m.estatus AS mecanico_estatus, m.descripcion_trabajo AS mecanico_trabajo,
              u.nombre AS creador_nombre,
              s.pagado, s.saldo
       FROM ordenes_trabajo o
       JOIN vehiculos v ON v.id = o.vehiculo_id
       JOIN clientes c ON c.id = v.cliente_id
       LEFT JOIN mecanicos m ON m.id = o.mecanico_id
       JOIN usuarios u ON u.id = o.creado_por
       LEFT JOIN vw_ordenes_saldo s ON s.orden_id = o.id
       WHERE o.id = $1`,
      [id]
    );

    if (ordenRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        mensaje: 'Orden de trabajo no encontrada.',
      });
    }

    const [serviciosRes, refaccionesRes, pagosRes, evidencias, validacionEvidencia] =
      await Promise.all([
        query(
          `SELECT os.*, s.codigo, s.nombre, s.descripcion, s.area_especialidad,
                  COALESCE(s.etapas_evidencia_obligatorias, '{}'::TEXT[]) AS etapas_evidencia_obligatorias
           FROM orden_servicios os
           JOIN servicios s ON s.id = os.servicio_id
           WHERE os.orden_id = $1
           ORDER BY os.id ASC`,
          [id]
        ),
        query(
          `SELECT orf.*, r.sku, r.nombre, r.marca
           FROM orden_refacciones orf
           JOIN refacciones r ON r.id = orf.refaccion_id
           WHERE orf.orden_id = $1
           ORDER BY orf.id ASC`,
          [id]
        ),
        query(
          `SELECT p.*, u.nombre AS cobrador_nombre
           FROM pagos p
           JOIN usuarios u ON u.id = p.usuario_id
           WHERE p.orden_id = $1
           ORDER BY p.fecha_pago DESC`,
          [id]
        ),
        obtenerEvidenciasActivasOrden(query, id),
        evaluarEvidenciaObligatoria(query, id),
      ]);

    res.status(200).json({
      success: true,
      orden: ordenRes.rows[0],
      servicios: serviciosRes.rows,
      refacciones: refaccionesRes.rows,
      pagos: pagosRes.rows,
      evidencias,
      validacionEvidencia,
    });
  } catch (error) {
    next(error);
  }
};

// Crear nueva orden con validación de vehículo/cliente activo y servicio inicial opcional
export const crearOrden = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      vehiculo_id,
      mecanico_id,
      bahia,
      km_entrada,
      motivo,
      fecha_estimada,
      servicio_inicial_id,
    } = req.body || {};

    const errores = {};

    const vehiculoIdNum = parseInt(vehiculo_id, 10);
    if (!vehiculo_id || isNaN(vehiculoIdNum) || vehiculoIdNum <= 0) {
      errores.vehiculo_id = 'Selecciona un vehículo válido para abrir la orden de servicio.';
    }

    const motivoLimpio = typeof motivo === 'string' ? motivo.trim() : '';
    if (!motivoLimpio) {
      errores.motivo = 'Describe el motivo de ingreso o los síntomas reportados por el cliente.';
    } else if (motivoLimpio.length < 4) {
      errores.motivo = 'Describe con un poco más de detalle el motivo de ingreso (al menos 4 caracteres).';
    }

    const kmNum =
      km_entrada !== undefined && km_entrada !== null && String(km_entrada).trim() !== ''
        ? parseInt(km_entrada, 10)
        : 0;
    if (isNaN(kmNum) || kmNum < 0) {
      errores.km_entrada = 'El kilometraje de entrada debe ser un número entero mayor o igual a 0.';
    }

    let mecanicoIdNum = null;
    if (mecanico_id !== undefined && mecanico_id !== null && String(mecanico_id).trim() !== '') {
      mecanicoIdNum = parseInt(mecanico_id, 10);
      if (isNaN(mecanicoIdNum) || mecanicoIdNum <= 0) {
        errores.mecanico_id = 'El mecánico seleccionado no es válido.';
      }
    }

    let fechaEstimadaVal = null;
    if (fecha_estimada && String(fecha_estimada).trim() !== '') {
      const f = String(fecha_estimada).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) {
        errores.fecha_estimada = 'La fecha estimada debe tener formato AAAA-MM-DD.';
      } else {
        fechaEstimadaVal = f;
      }
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

    await client.query('BEGIN');

    // Verificar vehículo y cliente activos
    const vehCheck = await client.query(
      `SELECT v.id, v.placas, v.marca, v.modelo, v.kilometraje, v.activo,
              c.id AS cliente_id, c.nombre AS cliente_nombre, c.activo AS cliente_activo
       FROM vehiculos v
       JOIN clientes c ON c.id = v.cliente_id
       WHERE v.id = $1`,
      [vehiculoIdNum]
    );

    if (vehCheck.rows.length === 0 || !vehCheck.rows[0].activo) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        campo: 'vehiculo_id',
        errores: { vehiculo_id: 'El vehículo seleccionado no existe o está inactivo.' },
        mensaje: 'El vehículo seleccionado no existe o se encuentra inactivo. Elige un vehículo registrado válido.',
      });
    }

    if (!vehCheck.rows[0].cliente_activo) {
      await client.query('ROLLBACK');
      return res.status(422).json({
        success: false,
        campo: 'vehiculo_id',
        mensaje: `El propietario (${vehCheck.rows[0].cliente_nombre}) de este vehículo se encuentra dado de baja.`,
      });
    }

    // Validar disponibilidad del mecánico si fue seleccionado
    if (mecanicoIdNum) {
      const mecCheck = await client.query(
        `SELECT id, nombre, estatus, activo FROM mecanicos WHERE id = $1`,
        [mecanicoIdNum]
      );
      if (mecCheck.rows.length === 0 || !mecCheck.rows[0].activo) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          campo: 'mecanico_id',
          errores: { mecanico_id: 'El mecánico seleccionado no existe o está inactivo.' },
          mensaje: 'El mecánico seleccionado no existe o se encuentra inactivo.',
        });
      }
      if (mecCheck.rows[0].estatus === 'descanso') {
        await client.query('ROLLBACK');
        return res.status(422).json({
          success: false,
          campo: 'mecanico_id',
          errores: {
            mecanico_id: `${mecCheck.rows[0].nombre} se encuentra en descanso y no está disponible.`,
          },
          mensaje: `No se puede asignar a ${mecCheck.rows[0].nombre} porque actualmente se encuentra en descanso.`,
        });
      }
    }

    const estadoInicial = mecanicoIdNum ? 'en_revision' : 'programada';

    const result = await client.query(
      `INSERT INTO ordenes_trabajo (vehiculo_id, mecanico_id, creado_por, estado, bahia, km_entrada, motivo, fecha_estimada)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        vehiculoIdNum,
        mecanicoIdNum,
        req.usuario.id,
        estadoInicial,
        bahia && String(bahia).trim() ? String(bahia).trim().slice(0, 10) : null,
        kmNum,
        motivoLimpio,
        fechaEstimadaVal,
      ]
    );

    const nuevaOrden = result.rows[0];

    // Si el kilometraje de entrada supera el registrado, actualizar odómetro del vehículo
    if (kmNum > (vehCheck.rows[0].kilometraje || 0)) {
      await client.query(
        `UPDATE vehiculos SET kilometraje = $1 WHERE id = $2`,
        [kmNum, vehiculoIdNum]
      );
    }

    // Si se seleccionó un servicio inicial al crear la orden, vincularlo en la misma transacción
    if (
      servicio_inicial_id !== undefined &&
      servicio_inicial_id !== null &&
      String(servicio_inicial_id).trim() !== ''
    ) {
      const srvIdNum = parseInt(servicio_inicial_id, 10);
      if (!isNaN(srvIdNum) && srvIdNum > 0) {
        const srvRes = await client.query(
          `SELECT id, horas_estandar, precio_base FROM servicios WHERE id = $1 AND activo = true`,
          [srvIdNum]
        );
        if (srvRes.rows.length > 0) {
          await client.query(
            `INSERT INTO orden_servicios (orden_id, servicio_id, cantidad, horas, precio_unitario)
             VALUES ($1, $2, 1, $3, $4)`,
            [nuevaOrden.id, srvIdNum, srvRes.rows[0].horas_estandar, srvRes.rows[0].precio_base]
          );
        }
      }
    }

    if (mecanicoIdNum) {
      await sincronizarEstatusMecanico(client.query.bind(client), mecanicoIdNum);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      mensaje: `Orden ${nuevaOrden.folio} creada para ${vehCheck.rows[0].marca} ${vehCheck.rows[0].modelo} (${vehCheck.rows[0].placas}).`,
      orden: nuevaOrden,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// Agregar o actualizar refacción a la orden
export const agregarRefaccion = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { refaccion_id, cantidad } = req.body || {};

    const refIdNum = parseInt(refaccion_id, 10);
    const cantNum = parseInt(cantidad, 10);

    if (!refaccion_id || isNaN(refIdNum) || refIdNum <= 0) {
      return res.status(400).json({
        success: false,
        campo: 'refaccion_id',
        mensaje: 'Selecciona una refacción del catálogo antes de asignarla.',
      });
    }

    if (isNaN(cantNum) || cantNum <= 0) {
      return res.status(400).json({
        success: false,
        campo: 'cantidad',
        mensaje: 'Ingresa una cantidad entera mayor a 0.',
      });
    }

    // Regla RN-04: no modificar órdenes finalizadas, entregadas o canceladas
    const orden = await query(`SELECT estado FROM ordenes_trabajo WHERE id = $1`, [id]);
    if (orden.rows.length === 0) {
      return res.status(404).json({ success: false, mensaje: 'Orden no encontrada.' });
    }
    if (['completada', 'entregada', 'cancelada'].includes(orden.rows[0].estado)) {
      return res.status(422).json({
        success: false,
        mensaje: `No se pueden agregar ni modificar refacciones en una orden ${orden.rows[0].estado}.`,
      });
    }

    const ref = await query(
      `SELECT nombre, costo, precio_publico, stock FROM refacciones WHERE id = $1 AND activo = true`,
      [refIdNum]
    );
    if (ref.rows.length === 0) {
      return res.status(404).json({
        success: false,
        campo: 'refaccion_id',
        mensaje: 'La refacción seleccionada no está disponible.',
      });
    }

    if (ref.rows[0].stock < cantNum) {
      return res.status(422).json({
        success: false,
        campo: 'cantidad',
        mensaje: `Stock insuficiente para "${ref.rows[0].nombre}". Disponibles: ${ref.rows[0].stock}, solicitadas: ${cantNum}.`,
      });
    }

    const result = await query(
      `INSERT INTO orden_refacciones (orden_id, refaccion_id, cantidad, costo_unitario, precio_unitario)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (orden_id, refaccion_id)
       DO UPDATE SET cantidad = EXCLUDED.cantidad,
                     costo_unitario = EXCLUDED.costo_unitario,
                     precio_unitario = EXCLUDED.precio_unitario
       RETURNING *`,
      [id, refIdNum, cantNum, ref.rows[0].costo, ref.rows[0].precio_publico]
    );

    res.status(200).json({
      success: true,
      mensaje: `Refacción "${ref.rows[0].nombre}" (×${cantNum}) asignada a la orden.`,
      detalle: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// Agregar servicio/mano de obra a la orden
export const agregarServicio = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { servicio_id, cantidad } = req.body || {};

    const srvIdNum = parseInt(servicio_id, 10);
    if (!servicio_id || isNaN(srvIdNum) || srvIdNum <= 0) {
      return res.status(400).json({
        success: false,
        campo: 'servicio_id',
        mensaje: 'Selecciona un servicio del catálogo antes de asignarlo.',
      });
    }

    const cantNum = cantidad !== undefined && cantidad !== '' ? parseInt(cantidad, 10) : 1;
    if (isNaN(cantNum) || cantNum <= 0) {
      return res.status(400).json({
        success: false,
        campo: 'cantidad',
        mensaje: 'La cantidad del servicio debe ser un entero mayor a 0.',
      });
    }

    // Regla RN-04: no modificar órdenes finalizadas, entregadas o canceladas
    const orden = await query(`SELECT estado FROM ordenes_trabajo WHERE id = $1`, [id]);
    if (orden.rows.length === 0) {
      return res.status(404).json({ success: false, mensaje: 'Orden no encontrada.' });
    }
    if (['completada', 'entregada', 'cancelada'].includes(orden.rows[0].estado)) {
      return res.status(422).json({
        success: false,
        mensaje: `No se pueden agregar servicios a una orden ${orden.rows[0].estado}.`,
      });
    }

    const srv = await query(
      `SELECT nombre, horas_estandar, precio_base, etapas_evidencia_obligatorias
       FROM servicios
       WHERE id = $1 AND activo = true`,
      [srvIdNum]
    );
    if (srv.rows.length === 0) {
      return res.status(404).json({
        success: false,
        campo: 'servicio_id',
        mensaje: 'Servicio no encontrado en el catálogo.',
      });
    }

    const result = await query(
      `INSERT INTO orden_servicios (orden_id, servicio_id, cantidad, horas, precio_unitario)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (orden_id, servicio_id)
       DO UPDATE SET cantidad = EXCLUDED.cantidad
       RETURNING *`,
      [id, srvIdNum, cantNum, srv.rows[0].horas_estandar, srv.rows[0].precio_base]
    );

    const validacionEvidencia = await evaluarEvidenciaObligatoria(query, id);

    res.status(200).json({
      success: true,
      mensaje: `Servicio "${srv.rows[0].nombre}" asignado a la orden.`,
      detalle: result.rows[0],
      validacionEvidencia,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================================
// REGLA CRÍTICA Y TRANSACCIÓN ACID: Cierre / Liquidación de Orden
// =====================================================================
export const finalizarOrden = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = parseInt(req.params.id, 10);
    const { diagnostico } = req.body || {};

    await client.query('BEGIN');

    const ordenRes = await client.query(
      `SELECT * FROM ordenes_trabajo WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (ordenRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, mensaje: 'Orden no encontrada.' });
    }

    const orden = ordenRes.rows[0];
    if (['completada', 'entregada', 'cancelada'].includes(orden.estado)) {
      await client.query('ROLLBACK');
      return res.status(422).json({
        success: false,
        mensaje: `La orden ya se encuentra en estado "${orden.estado}".`,
      });
    }

    // Verificar que la orden tenga al menos un servicio o refacción para evitar órdenes en $0 accidentales?
    // Nota: permitimos revisión sin costo si aplica, pero calculamos ambos rubros con precisión.
    const refaccionesOrden = await client.query(
      `SELECT orf.refaccion_id, orf.cantidad, r.stock, r.nombre
       FROM orden_refacciones orf
       JOIN refacciones r ON r.id = orf.refaccion_id
       WHERE orf.orden_id = $1`,
      [id]
    );

    for (const item of refaccionesOrden.rows) {
      if (item.stock < item.cantidad) {
        await client.query('ROLLBACK');
        return res.status(422).json({
          success: false,
          mensaje: `No se pudo finalizar la orden: stock insuficiente para "${item.nombre}". En almacén: ${item.stock}, requeridas: ${item.cantidad}.`,
        });
      }

      const nuevoStock = item.stock - item.cantidad;
      await client.query(
        `UPDATE refacciones SET stock = $1 WHERE id = $2`,
        [nuevoStock, item.refaccion_id]
      );

      await client.query(
        `INSERT INTO movimientos_inventario (refaccion_id, orden_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
         VALUES ($1, $2, $3, 'salida', $4, $5, $6, $7)`,
        [
          item.refaccion_id,
          id,
          req.usuario.id,
          -item.cantidad,
          item.stock,
          nuevoStock,
          `Consumo en Orden ${orden.folio}`,
        ]
      );
    }

    const subMoRes = await client.query(
      `SELECT COALESCE(SUM(importe), 0) AS sub_mo FROM orden_servicios WHERE orden_id = $1`,
      [id]
    );
    const subRefRes = await client.query(
      `SELECT COALESCE(SUM(importe), 0) AS sub_ref FROM orden_refacciones WHERE orden_id = $1`,
      [id]
    );

    const subtotalMo = parseFloat(subMoRes.rows[0].sub_mo);
    const subtotalRef = parseFloat(subRefRes.rows[0].sub_ref);
    const ivaPorcentaje = parseFloat(orden.iva_porcentaje);
    const ivaMonto = Number(((subtotalMo + subtotalRef) * (ivaPorcentaje / 100)).toFixed(2));
    const total = Number((subtotalMo + subtotalRef + ivaMonto).toFixed(2));

    const ordenActualizada = await client.query(
      `UPDATE ordenes_trabajo
       SET estado = 'completada',
           diagnostico = COALESCE($1, diagnostico),
           fecha_cierre = NOW(),
           subtotal_mano_obra = $2,
           subtotal_refacciones = $3,
           iva_monto = $4,
           total = $5
       WHERE id = $6
       RETURNING *`,
      [
        diagnostico && String(diagnostico).trim() ? String(diagnostico).trim() : null,
        subtotalMo,
        subtotalRef,
        ivaMonto,
        total,
        id,
      ]
    );

    if (orden.mecanico_id) {
      await sincronizarEstatusMecanico(client.query.bind(client), orden.mecanico_id);
    }

    await client.query(
      `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, datos_nuevos, ip)
       VALUES ($1, 'finalizar_orden', 'ordenes_trabajo', $2, $3, $4)`,
      [req.usuario.id, id, JSON.stringify({ folio: orden.folio, total }), req.ip || null]
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      mensaje: `Orden ${orden.folio} finalizada con éxito (Total: $${total.toFixed(2)}). Inventario actualizado.`,
      orden: ordenActualizada.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// Registrar pago a una orden (respeta RN-03 y verifica evidencia obligatoria antes de marcar entregada)
export const registrarPago = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = parseInt(req.params.id, 10);
    const { monto, metodo, tipo, referencia, notas } = req.body || {};

    const montoNum = parseFloat(monto);
    if (monto === undefined || monto === '' || isNaN(montoNum) || montoNum <= 0) {
      return res.status(400).json({
        success: false,
        campo: 'monto',
        mensaje: 'Ingresa un monto de pago mayor a $0.00.',
      });
    }

    const metodoLimpio = typeof metodo === 'string' ? metodo.trim().toLowerCase() : '';
    if (!METODOS_PAGO_VALIDOS.has(metodoLimpio)) {
      return res.status(400).json({
        success: false,
        campo: 'metodo',
        mensaje: 'Selecciona un método de pago válido: efectivo, tarjeta de débito, tarjeta de crédito o transferencia.',
      });
    }

    const tipoLimpio =
      typeof tipo === 'string' && tipo.trim() ? tipo.trim().toLowerCase() : 'liquidacion';
    if (!TIPOS_PAGO_VALIDOS.has(tipoLimpio)) {
      return res.status(400).json({
        success: false,
        campo: 'tipo',
        mensaje: 'Selecciona un tipo de cobro válido (anticipo, abono o liquidación).',
      });
    }

    await client.query('BEGIN');

    const saldoRes = await client.query(
      `SELECT saldo, total, estado FROM vw_ordenes_saldo WHERE orden_id = $1`,
      [id]
    );

    if (saldoRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, mensaje: 'Orden no encontrada.' });
    }

    const { saldo, estado } = saldoRes.rows[0];
    const saldoNum = parseFloat(saldo);

    if (estado === 'cancelada') {
      await client.query('ROLLBACK');
      return res.status(422).json({
        success: false,
        mensaje: 'No se pueden registrar pagos en una orden cancelada.',
      });
    }

    if (saldoNum <= 0.009) {
      await client.query('ROLLBACK');
      return res.status(422).json({
        success: false,
        campo: 'monto',
        mensaje: 'Esta orden no tiene saldo pendiente por cobrar (si aún no está finalizada, primero finaliza la orden para calcular el total).',
      });
    }

    if (montoNum > saldoNum + 0.009) {
      await client.query('ROLLBACK');
      return res.status(422).json({
        success: false,
        campo: 'monto',
        mensaje: `El monto capturado ($${montoNum.toFixed(2)}) supera el saldo pendiente actual ($${saldoNum.toFixed(2)}).`,
      });
    }

    const pagoRes = await client.query(
      `INSERT INTO pagos (orden_id, usuario_id, monto, metodo, tipo, referencia, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id,
        req.usuario.id,
        montoNum,
        metodoLimpio,
        tipoLimpio,
        referencia && String(referencia).trim() ? String(referencia).trim() : null,
        notas && String(notas).trim() ? String(notas).trim() : null,
      ]
    );

    const nuevoSaldo = Math.max(0, Number((saldoNum - montoNum).toFixed(2)));
    let entregaPendienteEvidencia = false;
    let faltantesEvidencia = [];

    if (nuevoSaldo <= 0.01 && estado === 'completada') {
      const validacionEv = await evaluarEvidenciaObligatoria(
        client.query.bind(client),
        id
      );

      if (validacionEv.cumple) {
        await client.query(
          `UPDATE ordenes_trabajo SET estado = 'entregada' WHERE id = $1`,
          [id]
        );
      } else {
        entregaPendienteEvidencia = true;
        faltantesEvidencia = validacionEv.faltantes;
      }
    }

    await client.query('COMMIT');

    const detalleFaltantesTexto = faltantesEvidencia
      .map((f) => `${f.servicio_nombre} (${f.etapa_label})`)
      .join(', ');

    res.status(201).json({
      success: true,
      mensaje: entregaPendienteEvidencia
        ? `Pago registrado ($0.00 restante). La orden permanece en "Completada" porque aún falta evidencia fotográfica obligatoria para entregarla: ${detalleFaltantesTexto}.`
        : nuevoSaldo <= 0.01 && estado === 'completada'
          ? 'Pago liquidado y orden marcada como Entregada.'
          : `Pago registrado exitosamente. Saldo restante: $${nuevoSaldo.toFixed(2)}.`,
      pago: pagoRes.rows[0],
      saldoRestante: nuevoSaldo,
      entregaPendienteEvidencia,
      faltantes: faltantesEvidencia,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// Cerrar explícitamente la orden como Entregada (validando liquidación de saldo y evidencia fotográfica obligatoria)
export const entregarOrden = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'Identificador de orden inválido.',
      });
    }

    await client.query('BEGIN');

    const ordenRes = await client.query(
      `SELECT o.id, o.folio, o.estado, s.saldo, s.total
       FROM ordenes_trabajo o
       LEFT JOIN vw_ordenes_saldo s ON s.orden_id = o.id
       WHERE o.id = $1
       FOR UPDATE OF o`,
      [id]
    );

    if (ordenRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, mensaje: 'Orden no encontrada.' });
    }

    const orden = ordenRes.rows[0];

    if (orden.estado === 'entregada') {
      await client.query('ROLLBACK');
      return res.status(422).json({
        success: false,
        mensaje: 'Esta orden ya fue marcada como entregada anteriormente.',
      });
    }

    if (orden.estado === 'cancelada') {
      await client.query('ROLLBACK');
      return res.status(422).json({
        success: false,
        mensaje: 'No es posible entregar una orden cancelada.',
      });
    }

    if (orden.estado !== 'completada') {
      await client.query('ROLLBACK');
      return res.status(422).json({
        success: false,
        mensaje: 'Primero debes finalizar la orden (para cerrar el inventario y calcular el total) antes de marcarla como entregada.',
      });
    }

    const saldoPendiente = parseFloat(orden.saldo || 0);
    if (saldoPendiente > 0.01) {
      await client.query('ROLLBACK');
      return res.status(422).json({
        success: false,
        mensaje: `No se puede cerrar como entregada porque aún tiene un saldo pendiente de $${saldoPendiente.toFixed(2)}. Registra la liquidación primero.`,
      });
    }

    const validacionEv = await evaluarEvidenciaObligatoria(
      client.query.bind(client),
      id
    );

    if (!validacionEv.cumple) {
      await client.query('ROLLBACK');
      const resumenFaltantes = validacionEv.faltantes
        .map((f) => `"${f.etapa_label}" en ${f.servicio_nombre}`)
        .join('; ');
      return res.status(422).json({
        success: false,
        mensaje: `No se puede cerrar la orden como entregada porque falta evidencia fotográfica obligatoria: ${resumenFaltantes}.`,
        faltantes: validacionEv.faltantes,
      });
    }

    const actualizada = await client.query(
      `UPDATE ordenes_trabajo SET estado = 'entregada' WHERE id = $1 RETURNING *`,
      [id]
    );

    await client.query(
      `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, datos_nuevos, ip)
       VALUES ($1, 'entregar_orden', 'ordenes_trabajo', $2, $3, $4)`,
      [req.usuario.id, id, JSON.stringify({ folio: orden.folio }), req.ip || null]
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      mensaje: `Orden ${orden.folio} cerrada como Entregada exitosamente.`,
      orden: actualizada.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// Asignar o reasignar mecánico (y opcionalmente bahía / etapa activa) a una orden abierta
export const asignarMecanicoOrden = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'Identificador de orden inválido.',
      });
    }

    const { mecanico_id, bahia, estado } = req.body || {};

    let nuevoMecId = null;
    if (mecanico_id !== undefined && mecanico_id !== null && String(mecanico_id).trim() !== '') {
      nuevoMecId = parseInt(mecanico_id, 10);
      if (isNaN(nuevoMecId) || nuevoMecId <= 0) {
        return res.status(400).json({
          success: false,
          campo: 'mecanico_id',
          mensaje: 'El identificador del mecánico seleccionado no es válido.',
        });
      }
    }

    await client.query('BEGIN');

    const ordenRes = await client.query(
      `SELECT * FROM ordenes_trabajo WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (ordenRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, mensaje: 'Orden de trabajo no encontrada.' });
    }

    const ordenActual = ordenRes.rows[0];
    if (['completada', 'entregada', 'cancelada'].includes(ordenActual.estado)) {
      await client.query('ROLLBACK');
      return res.status(422).json({
        success: false,
        mensaje: `No es posible reasignar mecánico en una orden en estado "${ordenActual.estado}".`,
      });
    }

    let infoMecanico = null;
    if (nuevoMecId) {
      const mecRes = await client.query(
        `SELECT id, nombre, tipo, especialidad, estatus, activo FROM mecanicos WHERE id = $1`,
        [nuevoMecId]
      );
      if (mecRes.rows.length === 0 || !mecRes.rows[0].activo) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          campo: 'mecanico_id',
          mensaje: 'El mecánico seleccionado no existe o se encuentra inactivo.',
        });
      }
      infoMecanico = mecRes.rows[0];
      if (infoMecanico.estatus === 'descanso' && ordenActual.mecanico_id !== nuevoMecId) {
        await client.query('ROLLBACK');
        return res.status(422).json({
          success: false,
          campo: 'mecanico_id',
          mensaje: `${infoMecanico.nombre} se encuentra en descanso y no está disponible para nuevas asignaciones.`,
        });
      }
    }

    const estadosActivosValidos = new Set(['programada', 'en_revision', 'en_reparacion']);
    let nuevoEstado = ordenActual.estado;
    if (estado && estadosActivosValidos.has(String(estado).trim())) {
      nuevoEstado = String(estado).trim();
    } else if (nuevoMecId && ordenActual.estado === 'programada') {
      nuevoEstado = 'en_revision';
    } else if (!nuevoMecId && ordenActual.estado !== 'programada') {
      nuevoEstado = 'programada';
    }

    const nuevaBahia =
      bahia !== undefined
        ? bahia && String(bahia).trim()
          ? String(bahia).trim().slice(0, 10)
          : null
        : ordenActual.bahia;

    const updOrden = await client.query(
      `UPDATE ordenes_trabajo
       SET mecanico_id = $1,
           bahia = $2,
           estado = $3
       WHERE id = $4
       RETURNING *`,
      [nuevoMecId, nuevaBahia, nuevoEstado, id]
    );

    if (ordenActual.mecanico_id && ordenActual.mecanico_id !== nuevoMecId) {
      await sincronizarEstatusMecanico(client.query.bind(client), ordenActual.mecanico_id);
    }
    if (nuevoMecId) {
      await sincronizarEstatusMecanico(client.query.bind(client), nuevoMecId);
    }

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      mensaje: infoMecanico
        ? `Mecánico ${infoMecanico.nombre} (${infoMecanico.tipo === 'general' ? 'General' : infoMecanico.especialidad}) asignado a la orden ${ordenActual.folio}.`
        : `Orden ${ordenActual.folio} quedó sin mecánico asignado.`,
      orden: updOrden.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};
