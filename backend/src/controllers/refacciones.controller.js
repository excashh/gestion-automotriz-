import { query } from '../config/db.js';

export const getRefacciones = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const buscar = req.query.buscar ? req.query.buscar.trim() : '';
    const categoriaId = req.query.categoria_id;
    const soloStockBajo = req.query.stock_bajo === 'true';
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE r.activo = true';
    const params = [];

    if (buscar) {
      params.push(`%${buscar}%`);
      whereClause += ` AND (r.nombre ILIKE $${params.length} OR r.sku ILIKE $${params.length} OR r.marca ILIKE $${params.length})`;
    }

    if (categoriaId) {
      params.push(categoriaId);
      whereClause += ` AND r.categoria_id = $${params.length}`;
    }

    if (soloStockBajo) {
      whereClause += ` AND r.stock <= r.stock_minimo`;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM refacciones r ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const queryParams = [...params, limit, offset];
    const dataResult = await query(
      `SELECT r.*, c.nombre AS categoria_nombre
       FROM refacciones r
       JOIN categorias c ON c.id = r.categoria_id
       ${whereClause}
       ORDER BY r.id DESC
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

export const getStockBajo = async (req, res, next) => {
  try {
    const result = await query(`SELECT * FROM vw_stock_bajo ORDER BY faltante DESC`);
    res.status(200).json({
      success: true,
      totalAlertas: result.rows.length,
      alertas: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const crearRefaccion = async (req, res, next) => {
  try {
    const { categoria_id, sku, nombre, marca, costo, precio_publico, stock, stock_minimo } = req.body;

    if (!categoria_id || !sku || !nombre || costo === undefined || precio_publico === undefined) {
      return res.status(400).json({
        success: false,
        mensaje: 'categoria_id, sku, nombre, costo y precio_publico son obligatorios.',
      });
    }

    if (costo < 0 || precio_publico < 0 || (stock !== undefined && stock < 0)) {
      return res.status(422).json({
        success: false,
        mensaje: 'Los valores monetarios y de inventario no pueden ser negativos.',
      });
    }

    const result = await query(
      `INSERT INTO refacciones (categoria_id, sku, nombre, marca, costo, precio_publico, stock, stock_minimo)
       VALUES ($1, UPPER($2), $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [categoria_id, sku.trim(), nombre, marca || null, costo, precio_publico, stock || 0, stock_minimo || 5]
    );

    res.status(201).json({
      success: true,
      mensaje: 'Refacción agregada al catálogo exitosamente.',
      refaccion: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const actualizarRefaccion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { categoria_id, nombre, marca, costo, precio_publico, stock_minimo } = req.body;

    const result = await query(
      `UPDATE refacciones
       SET categoria_id = COALESCE($1, categoria_id),
           nombre = COALESCE($2, nombre),
           marca = COALESCE($3, marca),
           costo = COALESCE($4, costo),
           precio_publico = COALESCE($5, precio_publico),
           stock_minimo = COALESCE($6, stock_minimo)
       WHERE id = $7 AND activo = true
       RETURNING *`,
      [categoria_id, nombre, marca, costo, precio_publico, stock_minimo, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        mensaje: 'Refacción no encontrada o inactiva.',
      });
    }

    res.status(200).json({
      success: true,
      mensaje: 'Refacción actualizada correctamente.',
      refaccion: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const eliminarRefaccion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(`UPDATE refacciones SET activo = false WHERE id = $1 RETURNING id`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        mensaje: 'Refacción no encontrada.',
      });
    }

    res.status(200).json({
      success: true,
      mensaje: 'Refacción dada de baja lógicamente.',
    });
  } catch (error) {
    next(error);
  }
};
