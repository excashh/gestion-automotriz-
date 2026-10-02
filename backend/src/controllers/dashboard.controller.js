import { query } from '../config/db.js';

// Estadísticas para las tarjetas y gráficas del Dashboard
export const getDashboardStats = async (req, res, next) => {
  try {
    // 1. Tarjetas de contadores rápidos
    const totalOrdenesRes = await query(`SELECT COUNT(*) FROM ordenes_trabajo`);
    const ordenesActivasRes = await query(
      `SELECT COUNT(*) FROM ordenes_trabajo WHERE estado IN ('programada', 'en_revision', 'en_reparacion')`
    );
    const totalClientesRes = await query(`SELECT COUNT(*) FROM clientes WHERE activo = true`);
    const totalVehiculosRes = await query(`SELECT COUNT(*) FROM vehiculos WHERE activo = true`);
    const alertasStockRes = await query(`SELECT COUNT(*) FROM vw_stock_bajo`);
    const ingresosTotalesRes = await query(
      `SELECT COALESCE(SUM(monto), 0) AS total_ingresos FROM pagos WHERE estatus = 'aplicado'`
    );

    // 2. Gráfica 1: Órdenes distribuidas por estado
    const estadoStatsRes = await query(
      `SELECT estado, COUNT(*) AS cantidad
       FROM ordenes_trabajo
       GROUP BY estado`
    );

    // 3. Gráfica 2: Ingresos por mes (últimos 6 meses)
    const ingresosMesRes = await query(
      `SELECT TO_CHAR(fecha_pago, 'YYYY-MM') AS mes,
              SUM(monto) AS total
       FROM pagos
       WHERE estatus = 'aplicado'
       GROUP BY TO_CHAR(fecha_pago, 'YYYY-MM')
       ORDER BY mes ASC
       LIMIT 6`
    );

    // 4. Últimas 5 órdenes recientes
    const ordenesRecientesRes = await query(
      `SELECT o.id, o.folio, o.estado, o.total, o.fecha_ingreso,
              v.placas, v.marca, v.modelo,
              c.nombre AS cliente_nombre
       FROM ordenes_trabajo o
       JOIN vehiculos v ON v.id = o.vehiculo_id
       JOIN clientes c ON c.id = v.cliente_id
       ORDER BY o.id DESC
       LIMIT 5`
    );

    res.status(200).json({
      success: true,
      resumen: {
        totalOrdenes: parseInt(totalOrdenesRes.rows[0].count, 10),
        ordenesActivas: parseInt(ordenesActivasRes.rows[0].count, 10),
        totalClientes: parseInt(totalClientesRes.rows[0].count, 10),
        totalVehiculos: parseInt(totalVehiculosRes.rows[0].count, 10),
        alertasStock: parseInt(alertasStockRes.rows[0].count, 10),
        ingresosTotales: parseFloat(ingresosTotalesRes.rows[0].total_ingresos),
      },
      graficas: {
        ordenesPorEstado: estadoStatsRes.rows,
        ingresosMensuales: ingresosMesRes.rows,
      },
      ordenesRecientes: ordenesRecientesRes.rows,
    });
  } catch (error) {
    next(error);
  }
};

// Reporte 1: Reporte de ingresos y pagos por rango de fechas (Req #23, #25)
export const getReporteVentas = async (req, res, next) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;

    let whereClause = `WHERE p.estatus = 'aplicado'`;
    const params = [];

    if (fecha_inicio && fecha_fin) {
      params.push(fecha_inicio, fecha_fin);
      whereClause += ` AND p.fecha_pago::date BETWEEN $1 AND $2`;
    }

    const pagosRes = await query(
      `SELECT p.id, p.folio, p.monto, p.metodo, p.tipo, p.fecha_pago,
              o.folio AS orden_folio,
              c.nombre AS cliente_nombre,
              u.nombre AS cobrador_nombre
       FROM pagos p
       JOIN ordenes_trabajo o ON o.id = p.orden_id
       JOIN vehiculos v ON v.id = o.vehiculo_id
       JOIN clientes c ON c.id = v.cliente_id
       JOIN usuarios u ON u.id = p.usuario_id
       ${whereClause}
       ORDER BY p.fecha_pago DESC`,
      params
    );

    const totalesRes = await query(
      `SELECT COALESCE(SUM(p.monto), 0) AS total_recaudado,
              COUNT(p.id) AS total_transacciones
       FROM pagos p
       ${whereClause}`,
      params
    );

    res.status(200).json({
      success: true,
      resumen: {
        totalRecaudado: parseFloat(totalesRes.rows[0].total_recaudado),
        totalTransacciones: parseInt(totalesRes.rows[0].total_transacciones, 10),
        filtroAplicado: fecha_inicio && fecha_fin ? { fecha_inicio, fecha_fin } : 'Histórico completo',
      },
      datos: pagosRes.rows,
    });
  } catch (error) {
    next(error);
  }
};

// Reporte 2: Refacciones más consumidas en taller
export const getReporteRefaccionesTop = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT r.id, r.sku, r.nombre, r.marca, r.stock,
              COALESCE(SUM(orf.cantidad), 0) AS unidades_vendidas,
              COALESCE(SUM(orf.importe), 0) AS total_generado
       FROM refacciones r
       LEFT JOIN orden_refacciones orf ON orf.refaccion_id = r.id
       GROUP BY r.id
       ORDER BY unidades_vendidas DESC
       LIMIT 10`
    );

    res.status(200).json({
      success: true,
      reporte: result.rows,
    });
  } catch (error) {
    next(error);
  }
};
