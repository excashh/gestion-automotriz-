import { pool, query } from '../config/db.js';

// Listar órdenes con paginación, filtros de estado y búsqueda
export const getOrdenes = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const estado = req.query.estado;
    const buscar = req.query.buscar ? req.query.buscar.trim() : '';
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (estado) {
      params.push(estado);
      whereClause += ` AND o.estado = $${params.length}`;
    }

    if (buscar) {
      params.push(`%${buscar}%`);
      whereClause += ` AND (o.folio ILIKE $${params.length} OR v.placas ILIKE $${params.length} OR c.nombre ILIKE $${params.length})`;
    }

    const countResult = await query(
      `SELECT COUNT(*)
       FROM ordenes_trabajo o
       JOIN vehiculos v ON v.id = o.vehiculo_id
       JOIN clientes c ON c.id = v.cliente_id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const queryParams = [...params, limit, offset];
    const dataResult = await query(
      `SELECT o.*,
              v.placas, v.marca, v.modelo, v.anio,
              c.id AS cliente_id, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
              m.nombre AS mecanico_nombre,
              u.nombre AS creador_nombre,
              s.pagado, s.saldo
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
      datos: dataResult.rows,
    });
  } catch (error) {
    next(error);
  }
};

// Obtener detalle completo de una orden
export const getOrdenById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ordenRes = await query(
      `SELECT o.*,
              v.placas, v.marca, v.modelo, v.anio, v.color, v.vin,
              c.id AS cliente_id, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono, c.email AS cliente_email,
              m.nombre AS mecanico_nombre,
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

    const serviciosRes = await query(
      `SELECT os.*, s.codigo, s.nombre, s.descripcion
       FROM orden_servicios os
       JOIN servicios s ON s.id = os.servicio_id
       WHERE os.orden_id = $1`,
      [id]
    );

    const refaccionesRes = await query(
      `SELECT orf.*, r.sku, r.nombre, r.marca
       FROM orden_refacciones orf
       JOIN refacciones r ON r.id = orf.refaccion_id
       WHERE orf.orden_id = $1`,
      [id]
    );

    const pagosRes = await query(
      `SELECT p.*, u.nombre AS cobrador_nombre
       FROM pagos p
       JOIN usuarios u ON u.id = p.usuario_id
       WHERE p.orden_id = $1
       ORDER BY p.fecha_pago DESC`,
      [id]
    );

    res.status(200).json({
      success: true,
      orden: ordenRes.rows[0],
      servicios: serviciosRes.rows,
      refacciones: refaccionesRes.rows,
      pagos: pagosRes.rows,
    });
  } catch (error) {
    next(error);
  }
};

// Crear nueva orden
export const crearOrden = async (req, res, next) => {
  try {
    const { vehiculo_id, mecanico_id, bahia, km_entrada, motivo, fecha_estimada } = req.body;

    if (!vehiculo_id || !motivo) {
      return res.status(400).json({
        success: false,
        mensaje: 'El vehículo y el motivo de ingreso son obligatorios.',
      });
    }

    const result = await query(
      `INSERT INTO ordenes_trabajo (vehiculo_id, mecanico_id, creado_por, bahia, km_entrada, motivo, fecha_estimada)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [vehiculo_id, mecanico_id || null, req.usuario.id, bahia || null, km_entrada || 0, motivo, fecha_estimada || null]
    );

    res.status(201).json({
      success: true,
      mensaje: 'Orden de trabajo creada con folio asignado.',
      orden: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// Agregar o actualizar refacción a la orden
export const agregarRefaccion = async (req, res, next) => {
  try {
    const { id } = req.params; // orden_id
    const { refaccion_id, cantidad } = req.body;

    if (!refaccion_id || !cantidad || cantidad <= 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'refaccion_id y cantidad mayor a cero son requeridos.',
      });
    }

    // Verificar estado de orden
    const orden = await query(`SELECT estado FROM ordenes_trabajo WHERE id = $1`, [id]);
    if (orden.rows.length === 0) return res.status(404).json({ success: false, mensaje: 'Orden no encontrada.' });
    if (['entregada', 'cancelada'].includes(orden.rows[0].estado)) {
      return res.status(422).json({ success: false, mensaje: 'No se pueden modificar órdenes cerradas o canceladas.' });
    }

    // Obtener precios actuales de la refacción para la "foto" histórica
    const ref = await query(`SELECT costo, precio_publico, stock FROM refacciones WHERE id = $1 AND activo = true`, [refaccion_id]);
    if (ref.rows.length === 0) return res.status(404).json({ success: false, mensaje: 'Refacción no disponible.' });

    if (ref.rows[0].stock < cantidad) {
      return res.status(422).json({
        success: false,
        mensaje: `Stock insuficiente. Disponibles: ${ref.rows[0].stock}, Solicitados: ${cantidad}`,
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
      [id, refaccion_id, cantidad, ref.rows[0].costo, ref.rows[0].precio_publico]
    );

    res.status(200).json({
      success: true,
      mensaje: 'Refacción asignada a la orden.',
      detalle: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// Agregar servicio/mano de obra a la orden
export const agregarServicio = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { servicio_id, cantidad } = req.body;

    if (!servicio_id) {
      return res.status(400).json({ success: false, mensaje: 'servicio_id es requerido.' });
    }

    const srv = await query(`SELECT horas_estandar, precio_base FROM servicios WHERE id = $1 AND activo = true`, [servicio_id]);
    if (srv.rows.length === 0) return res.status(404).json({ success: false, mensaje: 'Servicio no encontrado.' });

    const cant = cantidad && cantidad > 0 ? cantidad : 1;

    const result = await query(
      `INSERT INTO orden_servicios (orden_id, servicio_id, cantidad, horas, precio_unitario)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (orden_id, servicio_id)
       DO UPDATE SET cantidad = EXCLUDED.cantidad
       RETURNING *`,
      [id, servicio_id, cant, srv.rows[0].horas_estandar, srv.rows[0].precio_base]
    );

    res.status(200).json({
      success: true,
      mensaje: 'Servicio asignado a la orden.',
      detalle: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================================
// REGLA CRÍTICA Y TRANSACCIÓN ACID: Cierre / Liquidación de Orden (Req #20)
// =====================================================================
export const finalizarOrden = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { diagnostico } = req.body;

    await client.query('BEGIN'); // Iniciar Transacción

    // 1. Bloquear la orden para actualización
    const ordenRes = await client.query(
      `SELECT * FROM ordenes_trabajo WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (ordenRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, mensaje: 'Orden no encontrada.' });
    }

    const orden = ordenRes.rows[0];
    if (['entregada', 'cancelada'].includes(orden.estado)) {
      await client.query('ROLLBACK');
      return res.status(422).json({ success: false, mensaje: 'La orden ya está cerrada o cancelada.' });
    }

    // 2. Obtener refacciones asignadas y verificar stock
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
          mensaje: `Transacción abortada: Stock insuficiente para '${item.nombre}'. En stock: ${item.stock}, Requerido: ${item.cantidad}.`,
        });
      }

      // Descontar inventario
      const nuevoStock = item.stock - item.cantidad;
      await client.query(
        `UPDATE refacciones SET stock = $1 WHERE id = $2`,
        [nuevoStock, item.refaccion_id]
      );

      // Registrar movimiento de inventario (Trazabilidad - Req #21)
      await client.query(
        `INSERT INTO movimientos_inventario (refaccion_id, orden_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
         VALUES ($1, $2, $3, 'salida', $4, $5, $6, $7)`,
        [item.refaccion_id, id, req.usuario.id, -item.cantidad, item.stock, nuevoStock, `Consumo en Orden ${orden.folio}`]
      );
    }

    // 3. Calcular totales acumulados
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
    const ivaMonto = (subtotalMo + subtotalRef) * (ivaPorcentaje / 100);
    const total = subtotalMo + subtotalRef + ivaMonto;

    // 4. Actualizar la orden a 'completada' con la foto de totales
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
      [diagnostico, subtotalMo, subtotalRef, ivaMonto, total, id]
    );

    // 5. Registrar en auditoría
    await client.query(
      `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, datos_nuevos)
       VALUES ($1, 'finalizar_orden', 'ordenes_trabajo', $2, $3)`,
      [req.usuario.id, id, JSON.stringify({ folio: orden.folio, total })]
    );

    await client.query('COMMIT'); // Confirmar cambios en todas las tablas

    res.status(200).json({
      success: true,
      mensaje: `Orden ${orden.folio} finalizada con éxito. Inventario actualizado.`,
      orden: ordenActualizada.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// Registrar pago a una orden
export const registrarPago = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { monto, metodo, tipo, referencia, notas } = req.body;

    if (!monto || monto <= 0 || !metodo || !tipo) {
      return res.status(400).json({
        success: false,
        mensaje: 'monto mayor a cero, metodo (efectivo, debito, credito, transferencia) y tipo son requeridos.',
      });
    }

    await client.query('BEGIN');

    // Verificar saldo pendiente
    const saldoRes = await client.query(
      `SELECT saldo, total, estado FROM vw_ordenes_saldo WHERE orden_id = $1`,
      [id]
    );

    if (saldoRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, mensaje: 'Orden no encontrada.' });
    }

    const { saldo, estado } = saldoRes.rows[0];

    if (monto > parseFloat(saldo)) {
      await client.query('ROLLBACK');
      return res.status(422).json({
        success: false,
        mensaje: `El monto ($${monto}) excede el saldo pendiente ($${saldo}).`,
      });
    }

    const pagoRes = await client.query(
      `INSERT INTO pagos (orden_id, usuario_id, monto, metodo, tipo, referencia, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, req.usuario.id, monto, metodo, tipo, referencia || null, notas || null]
    );

    // Si el saldo queda en 0 y ya estaba completada, marcar como entregada
    const nuevoSaldo = parseFloat(saldo) - parseFloat(monto);
    if (nuevoSaldo <= 0.01 && estado === 'completada') {
      await client.query(`UPDATE ordenes_trabajo SET estado = 'entregada' WHERE id = $1`, [id]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      mensaje: 'Pago registrado exitosamente.',
      pago: pagoRes.rows[0],
      saldoRestante: nuevoSaldo,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};
