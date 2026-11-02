import { pool, query } from '../config/db.js';

export const TIPOS_MECANICO_VALIDOS = new Set(['general', 'especializado']);
export const ESTATUS_MECANICO_VALIDOS = new Set(['disponible', 'ocupado', 'descanso']);

export const ESPECIALIDADES_SUGERIDAS = [
  'Electrónica y Diagnóstico',
  'Motor y Transmisión',
  'Frenos y Suspensión',
  'Sistema Eléctrico e Híbridos',
  'Climatización y A/C',
  'Inyección Electrónica y Afinación',
  'Dirección y Geometría Vehicular',
];

/**
 * Sincroniza automáticamente el estatus ('disponible' vs 'ocupado') de un mecánico
 * en función de sus órdenes pendientes activas, respetando si está en 'descanso'.
 */
export const sincronizarEstatusMecanico = async (ejecutarQuery, mecanicoId) => {
  if (!mecanicoId) return null;
  const res = await ejecutarQuery(
    `UPDATE mecanicos m
     SET estatus = CASE
       WHEN m.estatus = 'descanso' THEN 'descanso'
       WHEN EXISTS (
         SELECT 1
         FROM ordenes_trabajo o
         WHERE o.mecanico_id = m.id
           AND o.estado IN ('programada', 'en_revision', 'en_reparacion')
       ) THEN 'ocupado'
       ELSE 'disponible'
     END
     WHERE m.id = $1 AND m.activo = true
     RETURNING id, estatus`,
    [mecanicoId]
  );
  return res.rows[0] || null;
};

// Listar mecánicos con métricas de carga operativa, órdenes pendientes, entregadas y disponibilidad
export const getMecanicos = async (req, res, next) => {
  try {
    const rawTipo = req.query.tipo ? String(req.query.tipo).trim().toLowerCase() : '';
    const rawEstatus = req.query.estatus ? String(req.query.estatus).trim().toLowerCase() : '';
    const soloConPendientes = req.query.con_pendientes === 'true';
    const buscar = req.query.buscar ? String(req.query.buscar).trim() : '';

    let whereClause = 'WHERE m.activo = true';
    const params = [];

    if (rawTipo && TIPOS_MECANICO_VALIDOS.has(rawTipo)) {
      params.push(rawTipo);
      whereClause += ` AND m.tipo = $${params.length}`;
    }

    if (rawEstatus && ESTATUS_MECANICO_VALIDOS.has(rawEstatus)) {
      params.push(rawEstatus);
      whereClause += ` AND m.estatus = $${params.length}`;
    }

    if (buscar) {
      params.push(`%${buscar}%`);
      whereClause += ` AND (
        m.nombre ILIKE $${params.length}
        OR m.especialidad ILIKE $${params.length}
        OR m.descripcion_trabajo ILIKE $${params.length}
        OR COALESCE(m.telefono, '') ILIKE $${params.length}
      )`;
    }

    const havingClause = soloConPendientes
      ? `HAVING COUNT(o.id) FILTER (WHERE o.estado IN ('programada', 'en_revision', 'en_reparacion')) > 0`
      : '';

    const [mecanicosRes, resumenGlobalRes] = await Promise.all([
      query(
        `SELECT m.id,
                m.usuario_id,
                m.nombre,
                m.tipo,
                m.especialidad,
                m.descripcion_trabajo,
                m.telefono,
                m.tarifa_hora,
                m.estatus,
                m.activo,
                m.created_at,
                u.email AS usuario_email,
                COUNT(o.id) FILTER (WHERE o.estado IN ('programada', 'en_revision', 'en_reparacion'))::INTEGER AS ordenes_pendientes,
                COUNT(o.id) FILTER (WHERE o.estado = 'completada')::INTEGER AS ordenes_completadas,
                COUNT(o.id) FILTER (WHERE o.estado = 'entregada')::INTEGER AS ordenes_entregadas,
                COUNT(o.id) FILTER (WHERE o.estado <> 'cancelada')::INTEGER AS total_ordenes,
                COALESCE(
                  (
                    SELECT json_agg(act ORDER BY act.id DESC)
                    FROM (
                      SELECT ot.id,
                             ot.folio,
                             ot.estado,
                             ot.bahia,
                             ot.motivo,
                             ot.fecha_ingreso,
                             ot.fecha_estimada,
                             v.placas,
                             v.marca,
                             v.modelo,
                             v.anio,
                             c.nombre AS cliente_nombre
                      FROM ordenes_trabajo ot
                      JOIN vehiculos v ON v.id = ot.vehiculo_id
                      JOIN clientes c ON c.id = v.cliente_id
                      WHERE ot.mecanico_id = m.id
                        AND ot.estado IN ('programada', 'en_revision', 'en_reparacion')
                      ORDER BY ot.id DESC
                    ) act
                  ),
                  '[]'::json
                ) AS ordenes_activas,
                COALESCE(
                  (
                    SELECT json_agg(ent ORDER BY ent.id DESC)
                    FROM (
                      SELECT ot.id,
                             ot.folio,
                             ot.estado,
                             ot.motivo,
                             ot.fecha_cierre,
                             ot.total,
                             v.placas,
                             v.marca,
                             v.modelo
                      FROM ordenes_trabajo ot
                      JOIN vehiculos v ON v.id = ot.vehiculo_id
                      WHERE ot.mecanico_id = m.id
                        AND ot.estado IN ('completada', 'entregada')
                      ORDER BY ot.id DESC
                      LIMIT 4
                    ) ent
                  ),
                  '[]'::json
                ) AS historial_reciente
         FROM mecanicos m
         LEFT JOIN usuarios u ON u.id = m.usuario_id
         LEFT JOIN ordenes_trabajo o ON o.mecanico_id = m.id
         ${whereClause}
         GROUP BY m.id, u.email
         ${havingClause}
         ORDER BY
           CASE m.estatus
             WHEN 'disponible' THEN 1
             WHEN 'ocupado' THEN 2
             ELSE 3
           END ASC,
           m.tipo ASC,
           m.nombre ASC`,
        params
      ),
      query(
        `SELECT
           COUNT(*)::INTEGER AS total_mecanicos,
           COUNT(*) FILTER (WHERE tipo = 'general')::INTEGER AS generales,
           COUNT(*) FILTER (WHERE tipo = 'especializado')::INTEGER AS especializados,
           COUNT(*) FILTER (WHERE estatus = 'disponible')::INTEGER AS disponibles,
           COUNT(*) FILTER (WHERE estatus = 'ocupado')::INTEGER AS ocupados,
           COUNT(*) FILTER (WHERE estatus = 'descanso')::INTEGER AS en_descanso,
           COUNT(*) FILTER (WHERE ordenes_pendientes > 0)::INTEGER AS con_ordenes_pendientes,
           COALESCE(SUM(ordenes_pendientes), 0)::INTEGER AS total_ordenes_pendientes,
           COALESCE(SUM(ordenes_completadas), 0)::INTEGER AS total_ordenes_completadas,
           COALESCE(SUM(ordenes_entregadas), 0)::INTEGER AS total_ordenes_entregadas
         FROM vw_mecanicos_resumen
         WHERE activo = true`
      ),
    ]);

    const resumenRow = resumenGlobalRes.rows[0] || {};
    const datos = mecanicosRes.rows.map((row) => ({
      ...row,
      tarifa_hora: parseFloat(row.tarifa_hora || 0),
      apto_cualquier_tarea: row.tipo === 'general',
      disponible_asignacion: Boolean(row.activo && row.estatus !== 'descanso'),
    }));

    res.status(200).json({
      success: true,
      resumen: {
        totalMecanicos: resumenRow.total_mecanicos || 0,
        generales: resumenRow.generales || 0,
        especializados: resumenRow.especializados || 0,
        disponibles: resumenRow.disponibles || 0,
        ocupados: resumenRow.ocupados || 0,
        enDescanso: resumenRow.en_descanso || 0,
        conOrdenesPendientes: resumenRow.con_ordenes_pendientes || 0,
        totalOrdenesPendientes: resumenRow.total_ordenes_pendientes || 0,
        totalOrdenesCompletadas: resumenRow.total_ordenes_completadas || 0,
        totalOrdenesEntregadas: resumenRow.total_ordenes_entregadas || 0,
      },
      especialidadesSugeridas: ESPECIALIDADES_SUGERIDAS,
      datos,
    });
  } catch (error) {
    next(error);
  }
};

// Obtener expediente detallado de un mecánico y sus órdenes asociadas
export const getMecanicoById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'El identificador del mecánico no es válido.',
      });
    }

    const mecRes = await query(
      `SELECT r.*, u.email AS usuario_email
       FROM vw_mecanicos_resumen r
       LEFT JOIN usuarios u ON u.id = r.usuario_id
       WHERE r.id = $1 AND r.activo = true`,
      [id]
    );

    if (mecRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        mensaje: 'Mecánico no encontrado.',
      });
    }

    const ordenesRes = await query(
      `SELECT o.id, o.folio, o.estado, o.bahia, o.motivo, o.diagnostico,
              o.fecha_ingreso, o.fecha_estimada, o.fecha_cierre, o.total,
              v.id AS vehiculo_id, v.placas, v.marca, v.modelo, v.anio,
              c.nombre AS cliente_nombre,
              s.saldo
       FROM ordenes_trabajo o
       JOIN vehiculos v ON v.id = o.vehiculo_id
       JOIN clientes c ON c.id = v.cliente_id
       LEFT JOIN vw_ordenes_saldo s ON s.orden_id = o.id
       WHERE o.mecanico_id = $1 AND o.estado <> 'cancelada'
       ORDER BY
         CASE WHEN o.estado IN ('programada', 'en_revision', 'en_reparacion') THEN 0 ELSE 1 END ASC,
         o.id DESC
       LIMIT 30`,
      [id]
    );

    const mecanico = mecRes.rows[0];
    res.status(200).json({
      success: true,
      mecanico: {
        ...mecanico,
        tarifa_hora: parseFloat(mecanico.tarifa_hora || 0),
        apto_cualquier_tarea: mecanico.tipo === 'general',
        disponible_asignacion: Boolean(mecanico.activo && mecanico.estatus !== 'descanso'),
      },
      ordenes: ordenesRes.rows,
    });
  } catch (error) {
    next(error);
  }
};

// Dar de alta un nuevo mecánico (General o Especializado)
export const crearMecanico = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      nombre,
      tipo,
      especialidad,
      descripcion_trabajo,
      telefono,
      tarifa_hora,
      estatus,
    } = req.body || {};

    const errores = {};

    const nombreLimpio = typeof nombre === 'string' ? nombre.trim() : '';
    if (!nombreLimpio || nombreLimpio.length < 3) {
      errores.nombre = 'Ingresa el nombre completo del mecánico (al menos 3 caracteres).';
    }

    const tipoLimpio = typeof tipo === 'string' ? tipo.trim().toLowerCase() : 'general';
    if (!TIPOS_MECANICO_VALIDOS.has(tipoLimpio)) {
      errores.tipo = 'Selecciona un tipo válido: general (apto para cualquier tarea) o especializado.';
    }

    let especialidadLimpia = typeof especialidad === 'string' ? especialidad.trim() : '';
    if (tipoLimpio === 'especializado') {
      if (!especialidadLimpia || especialidadLimpia.length < 3) {
        errores.especialidad = 'Indica la especialidad automotriz (ej. Electrónica y Diagnóstico, Motor y Transmisión).';
      }
    } else if (!especialidadLimpia) {
      especialidadLimpia = 'Mecánica General Multimarca';
    }

    let descTrabajoLimpia =
      typeof descripcion_trabajo === 'string' ? descripcion_trabajo.trim() : '';
    if (!descTrabajoLimpia) {
      descTrabajoLimpia =
        tipoLimpio === 'general'
          ? 'Apto para cualquier tarea del taller: mantenimiento preventivo, correctivo general, afinaciones, frenos e inspección multipunto.'
          : `Especialista dedicado al área de ${especialidadLimpia}: diagnóstico técnico, reparación especializada y pruebas de calidad.`;
    }

    const telefonoLimpio =
      telefono && String(telefono).trim() ? String(telefono).trim().slice(0, 20) : null;

    const tarifaNum =
      tarifa_hora !== undefined && tarifa_hora !== null && String(tarifa_hora).trim() !== ''
        ? parseFloat(tarifa_hora)
        : 200;
    if (isNaN(tarifaNum) || tarifaNum < 0) {
      errores.tarifa_hora = 'La tarifa por hora debe ser un monto igual o mayor a $0.00.';
    }

    const estatusLimpio =
      typeof estatus === 'string' && estatus.trim()
        ? estatus.trim().toLowerCase()
        : 'disponible';
    if (!ESTATUS_MECANICO_VALIDOS.has(estatusLimpio)) {
      errores.estatus = 'El estatus debe ser disponible, ocupado o descanso.';
    }

    const camposError = Object.keys(errores);
    if (camposError.length > 0) {
      const primerCampo = camposError[0];
      return res.status(400).json({
        success: false,
        campo: primerCampo,
        mensaje: errores[primerCampo],
        errores,
      });
    }

    await client.query('BEGIN');

    const insertRes = await client.query(
      `INSERT INTO mecanicos (nombre, tipo, especialidad, descripcion_trabajo, telefono, tarifa_hora, estatus, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING *`,
      [
        nombreLimpio,
        tipoLimpio,
        especialidadLimpia.slice(0, 80),
        descTrabajoLimpia,
        telefonoLimpio,
        tarifaNum,
        estatusLimpio,
      ]
    );

    const creado = insertRes.rows[0];

    await client.query(
      `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, datos_nuevos, ip)
       VALUES ($1, 'crear_mecanico', 'mecanicos', $2, $3, $4)`,
      [
        req.usuario.id,
        creado.id,
        JSON.stringify({ nombre: creado.nombre, tipo: creado.tipo, especialidad: creado.especialidad }),
        req.ip || null,
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      mensaje: `Mecánico ${creado.nombre} (${creado.tipo === 'general' ? 'General' : creado.especialidad}) registrado correctamente.`,
      mecanico: creado,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// Actualizar perfil, tipo, especialidad o trabajo de un mecánico
export const actualizarMecanico = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'Identificador de mecánico inválido.',
      });
    }

    const {
      nombre,
      tipo,
      especialidad,
      descripcion_trabajo,
      telefono,
      tarifa_hora,
      estatus,
    } = req.body || {};

    const errores = {};
    const nombreLimpio = typeof nombre === 'string' ? nombre.trim() : '';
    if (!nombreLimpio || nombreLimpio.length < 3) {
      errores.nombre = 'El nombre del mecánico debe tener al menos 3 caracteres.';
    }

    const tipoLimpio = typeof tipo === 'string' ? tipo.trim().toLowerCase() : 'general';
    if (!TIPOS_MECANICO_VALIDOS.has(tipoLimpio)) {
      errores.tipo = 'Selecciona un tipo válido (general o especializado).';
    }

    let especialidadLimpia = typeof especialidad === 'string' ? especialidad.trim() : '';
    if (tipoLimpio === 'especializado' && (!especialidadLimpia || especialidadLimpia.length < 3)) {
      errores.especialidad = 'Indica la especialidad automotriz del mecánico.';
    } else if (tipoLimpio === 'general' && !especialidadLimpia) {
      especialidadLimpia = 'Mecánica General Multimarca';
    }

    const descTrabajoLimpia =
      typeof descripcion_trabajo === 'string' && descripcion_trabajo.trim()
        ? descripcion_trabajo.trim()
        : tipoLimpio === 'general'
          ? 'Apto para cualquier tarea del taller: mantenimiento preventivo y correctivo general.'
          : `Especialista en ${especialidadLimpia}.`;

    const tarifaNum =
      tarifa_hora !== undefined && tarifa_hora !== null && String(tarifa_hora).trim() !== ''
        ? parseFloat(tarifa_hora)
        : 200;
    if (isNaN(tarifaNum) || tarifaNum < 0) {
      errores.tarifa_hora = 'La tarifa por hora debe ser igual o mayor a $0.00.';
    }

    const estatusLimpio =
      typeof estatus === 'string' && estatus.trim()
        ? estatus.trim().toLowerCase()
        : 'disponible';
    if (!ESTATUS_MECANICO_VALIDOS.has(estatusLimpio)) {
      errores.estatus = 'El estatus debe ser disponible, ocupado o descanso.';
    }

    const camposError = Object.keys(errores);
    if (camposError.length > 0) {
      const primerCampo = camposError[0];
      return res.status(400).json({
        success: false,
        campo: primerCampo,
        mensaje: errores[primerCampo],
        errores,
      });
    }

    await client.query('BEGIN');

    const updRes = await client.query(
      `UPDATE mecanicos
       SET nombre = $1,
           tipo = $2,
           especialidad = $3,
           descripcion_trabajo = $4,
           telefono = $5,
           tarifa_hora = $6,
           estatus = $7
       WHERE id = $8 AND activo = true
       RETURNING *`,
      [
        nombreLimpio,
        tipoLimpio,
        especialidadLimpia.slice(0, 80),
        descTrabajoLimpia,
        telefono && String(telefono).trim() ? String(telefono).trim().slice(0, 20) : null,
        tarifaNum,
        estatusLimpio,
        id,
      ]
    );

    if (updRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        mensaje: 'Mecánico no encontrado.',
      });
    }

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      mensaje: `Datos de ${updRes.rows[0].nombre} actualizados correctamente.`,
      mecanico: updRes.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// Cambio rápido de disponibilidad ('disponible' | 'ocupado' | 'descanso')
export const cambiarDisponibilidadMecanico = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'Identificador de mecánico inválido.',
      });
    }

    const estatusLimpio =
      req.body?.estatus && typeof req.body.estatus === 'string'
        ? req.body.estatus.trim().toLowerCase()
        : '';

    if (!ESTATUS_MECANICO_VALIDOS.has(estatusLimpio)) {
      return res.status(400).json({
        success: false,
        campo: 'estatus',
        mensaje: 'Selecciona un estado válido: disponible, ocupado o descanso.',
      });
    }

    const updRes = await query(
      `UPDATE mecanicos
       SET estatus = $1
       WHERE id = $2 AND activo = true
       RETURNING id, nombre, estatus`,
      [estatusLimpio, id]
    );

    if (updRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        mensaje: 'Mecánico no encontrado.',
      });
    }

    const pendientesRes = await query(
      `SELECT COUNT(*)::INTEGER AS pendientes
       FROM ordenes_trabajo
       WHERE mecanico_id = $1 AND estado IN ('programada', 'en_revision', 'en_reparacion')`,
      [id]
    );
    const pendientes = pendientesRes.rows[0]?.pendientes || 0;

    const etiqueta =
      estatusLimpio === 'disponible'
        ? 'Disponible'
        : estatusLimpio === 'ocupado'
          ? 'Ocupado en bahía'
          : 'En descanso';

    res.status(200).json({
      success: true,
      mensaje:
        estatusLimpio === 'descanso' && pendientes > 0
          ? `${updRes.rows[0].nombre} marcado como "${etiqueta}" (conserva ${pendientes} orden(es) activa(s) en curso, no recibirá nuevas asignaciones).`
          : `Disponibilidad de ${updRes.rows[0].nombre} actualizada a "${etiqueta}".`,
      mecanico: updRes.rows[0],
      ordenes_pendientes: pendientes,
    });
  } catch (error) {
    next(error);
  }
};
