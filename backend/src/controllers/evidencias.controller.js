import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pool, query } from '../config/db.js';
import { parsearMultipartImagenes } from '../utils/multipart.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const STORAGE_ROOT = path.resolve(__dirname, '../../storage/evidencias');

export const ETAPAS_EVIDENCIA = [
  { codigo: 'antes_diagnostico', nombre: 'Antes / diagnóstico', grupo: 'antes' },
  { codigo: 'durante_trabajo', nombre: 'Durante el trabajo', grupo: 'proceso' },
  { codigo: 'pieza_retirada', nombre: 'Pieza retirada', grupo: 'proceso' },
  { codigo: 'despues_instalacion', nombre: 'Después / instalación', grupo: 'despues' },
  { codigo: 'entrega', nombre: 'Entrega', grupo: 'despues' },
];

export const ETAPAS_MAP = Object.fromEntries(
  ETAPAS_EVIDENCIA.map((e) => [e.codigo, e.nombre])
);

const ETAPAS_CODIGOS_VALIDOS = new Set(ETAPAS_EVIDENCIA.map((e) => e.codigo));

export const obtenerEvidenciasActivasOrden = async (ejecutarQuery, ordenId) => {
  const res = await ejecutarQuery(
    `SELECT e.id,
            e.orden_id,
            e.orden_servicio_id,
            e.servicio_id,
            e.subido_por,
            e.etapa,
            e.descripcion,
            e.nombre_original,
            e.mime_type,
            e.tamano_bytes,
            e.created_at,
            u.nombre AS autor_nombre,
            r.nombre AS autor_rol,
            s.codigo AS servicio_codigo,
            s.nombre AS servicio_nombre
     FROM orden_evidencias e
     JOIN usuarios u ON u.id = e.subido_por
     JOIN roles r ON r.id = u.rol_id
     LEFT JOIN servicios s ON s.id = e.servicio_id
     WHERE e.orden_id = $1 AND e.activo = true
     ORDER BY e.created_at ASC, e.id ASC`,
    [ordenId]
  );

  return res.rows.map((row) => ({
    ...row,
    etapa_label: ETAPAS_MAP[row.etapa] || row.etapa,
  }));
};

export const evaluarEvidenciaObligatoria = async (ejecutarQuery, ordenId) => {
  const [serviciosOrdenRes, evidenciasRes] = await Promise.all([
    ejecutarQuery(
      `SELECT os.id AS orden_servicio_id,
              os.servicio_id,
              s.codigo AS servicio_codigo,
              s.nombre AS servicio_nombre,
              COALESCE(s.etapas_evidencia_obligatorias, '{}'::TEXT[]) AS etapas_obligatorias
       FROM orden_servicios os
       JOIN servicios s ON s.id = os.servicio_id
       WHERE os.orden_id = $1
       ORDER BY os.id ASC`,
      [ordenId]
    ),
    ejecutarQuery(
      `SELECT id, orden_servicio_id, servicio_id, etapa
       FROM orden_evidencias
       WHERE orden_id = $1 AND activo = true`,
      [ordenId]
    ),
  ]);

  const evidencias = evidenciasRes.rows;
  const requisitos = [];

  for (const srv of serviciosOrdenRes.rows) {
    const etapasReq = Array.isArray(srv.etapas_obligatorias) ? srv.etapas_obligatorias : [];
    for (const etapa of etapasReq) {
      const coincidencias = evidencias.filter(
        (ev) =>
          ev.etapa === etapa &&
          (ev.orden_servicio_id === srv.orden_servicio_id || ev.servicio_id === srv.servicio_id)
      );

      requisitos.push({
        orden_servicio_id: srv.orden_servicio_id,
        servicio_id: srv.servicio_id,
        servicio_codigo: srv.servicio_codigo,
        servicio_nombre: srv.servicio_nombre,
        etapa,
        etapa_label: ETAPAS_MAP[etapa] || etapa,
        cumplida: coincidencias.length > 0,
        fotos_count: coincidencias.length,
      });
    }
  }

  const faltantes = requisitos.filter((r) => !r.cumplida);

  return {
    tieneReglasActivas: requisitos.length > 0,
    cumple: faltantes.length === 0,
    requisitos,
    faltantes,
  };
};

// Catálogos auxiliares para órdenes y evidencias (servicios, mecánicos y etapas)
export const getCatalogosOrdenes = async (_req, res, next) => {
  try {
    const [serviciosRes, mecanicosRes] = await Promise.all([
      query(
        `SELECT s.id, s.categoria_id, s.codigo, s.nombre, s.descripcion,
                s.horas_estandar, s.precio_base, s.area_especialidad,
                COALESCE(s.etapas_evidencia_obligatorias, '{}'::TEXT[]) AS etapas_evidencia_obligatorias,
                c.nombre AS categoria_nombre
         FROM servicios s
         JOIN categorias c ON c.id = s.categoria_id
         WHERE s.activo = true
         ORDER BY s.nombre ASC`
      ),
      query(
        `SELECT id, nombre, tipo, especialidad, descripcion_trabajo, estatus, tarifa_hora,
                ordenes_pendientes, ordenes_entregadas
         FROM vw_mecanicos_resumen
         WHERE activo = true
         ORDER BY
           CASE estatus
             WHEN 'disponible' THEN 1
             WHEN 'ocupado' THEN 2
             ELSE 3
           END ASC,
           tipo ASC,
           nombre ASC`
      ),
    ]);

    res.status(200).json({
      success: true,
      servicios: serviciosRes.rows,
      mecanicos: mecanicosRes.rows,
      etapasEvidencia: ETAPAS_EVIDENCIA,
    });
  } catch (error) {
    next(error);
  }
};

// Configurar qué etapas fotográficas son obligatorias para un servicio del catálogo (solo Admin)
export const actualizarConfigEvidenciaServicio = async (req, res, next) => {
  try {
    const servicioId = parseInt(req.params.servicioId, 10);
    if (isNaN(servicioId) || servicioId <= 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'El identificador de servicio no es válido.',
      });
    }

    const { etapas_obligatorias } = req.body || {};
    if (!Array.isArray(etapas_obligatorias)) {
      return res.status(400).json({
        success: false,
        mensaje: 'Envía la lista de etapas obligatorias como un arreglo.',
      });
    }

    const etapasLimpias = Array.from(
      new Set(
        etapas_obligatorias
          .map((e) => String(e).trim())
          .filter(Boolean)
      )
    );

    for (const etapa of etapasLimpias) {
      if (!ETAPAS_CODIGOS_VALIDOS.has(etapa)) {
        return res.status(400).json({
          success: false,
          mensaje: `La etapa "${etapa}" no es válida.`,
        });
      }
    }

    const previoRes = await query(
      `SELECT id, nombre, etapas_evidencia_obligatorias FROM servicios WHERE id = $1 AND activo = true`,
      [servicioId]
    );
    if (previoRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        mensaje: 'Servicio no encontrado.',
      });
    }

    const actualizadoRes = await query(
      `UPDATE servicios
       SET etapas_evidencia_obligatorias = $1::TEXT[]
       WHERE id = $2
       RETURNING *`,
      [etapasLimpias, servicioId]
    );

    await query(
      `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, datos_anteriores, datos_nuevos, ip)
       VALUES ($1, 'config_evidencia_servicio', 'servicios', $2, $3, $4, $5)`,
      [
        req.usuario.id,
        servicioId,
        JSON.stringify({ etapas: previoRes.rows[0].etapas_evidencia_obligatorias }),
        JSON.stringify({ etapas: etapasLimpias }),
        req.ip || null,
      ]
    );

    res.status(200).json({
      success: true,
      mensaje:
        etapasLimpias.length > 0
          ? `Regla actualizada: "${previoRes.rows[0].nombre}" ahora requiere ${etapasLimpias.length} etapa(s) fotográfica(s) antes de entregar.`
          : `Regla actualizada: "${previoRes.rows[0].nombre}" ya no exige fotografías obligatorias.`,
      servicio: actualizadoRes.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// Consultar evidencias de una orden y su estado de cumplimiento
export const getEvidenciasOrden = async (req, res, next) => {
  try {
    const ordenId = parseInt(req.params.id, 10);
    if (isNaN(ordenId) || ordenId <= 0) {
      return res.status(400).json({ success: false, mensaje: 'Identificador de orden inválido.' });
    }

    const ordenCheck = await query(`SELECT id FROM ordenes_trabajo WHERE id = $1`, [ordenId]);
    if (ordenCheck.rows.length === 0) {
      return res.status(404).json({ success: false, mensaje: 'Orden de trabajo no encontrada.' });
    }

    const [evidencias, validacionEvidencia] = await Promise.all([
      obtenerEvidenciasActivasOrden(query, ordenId),
      evaluarEvidenciaObligatoria(query, ordenId),
    ]);

    res.status(200).json({
      success: true,
      evidencias,
      validacionEvidencia,
    });
  } catch (error) {
    next(error);
  }
};

// Subir una o varias fotografías de evidencia vinculadas a la orden y opcionalmente a un servicio
export const subirEvidenciasOrden = async (req, res, next) => {
  const archivosEscritos = [];
  let client = null;

  try {
    const ordenId = parseInt(req.params.id, 10);
    if (isNaN(ordenId) || ordenId <= 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'El identificador de la orden no es válido.',
      });
    }

    const ordenPreCheck = await query(
      `SELECT id, folio, estado FROM ordenes_trabajo WHERE id = $1`,
      [ordenId]
    );
    if (ordenPreCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        mensaje: 'Orden de trabajo no encontrada.',
      });
    }

    if (['entregada', 'cancelada'].includes(ordenPreCheck.rows[0].estado)) {
      return res.status(422).json({
        success: false,
        mensaje: `No se pueden agregar nuevas fotografías porque la orden ya está ${ordenPreCheck.rows[0].estado}.`,
      });
    }

    // Parsear archivos e información asociada
    const { campos, imagenes } = await parsearMultipartImagenes(req);

    let metadatosLista = [];
    if (campos.metadata) {
      try {
        const rawMeta = Array.isArray(campos.metadata) ? campos.metadata[0] : campos.metadata;
        const parsed = JSON.parse(rawMeta);
        if (!Array.isArray(parsed)) {
          return res.status(400).json({
            success: false,
            mensaje: 'El formato de metadatos de evidencia no es válido.',
          });
        }
        metadatosLista = parsed;
      } catch (_err) {
        return res.status(400).json({
          success: false,
          mensaje: 'No se pudieron procesar los datos de etapa y nota de las fotografías.',
        });
      }
    }

    // Obtener servicios de la orden para validar relaciones
    const serviciosOrdenRes = await query(
      `SELECT id, servicio_id FROM orden_servicios WHERE orden_id = $1`,
      [ordenId]
    );
    const mapaOrdenServicios = new Map(
      serviciosOrdenRes.rows.map((os) => [os.id, os.servicio_id])
    );
    const mapaServicioAOrdenServicio = new Map(
      serviciosOrdenRes.rows.map((os) => [os.servicio_id, os.id])
    );

    const registrosPreparados = [];
    for (let i = 0; i < imagenes.length; i++) {
      const img = imagenes[i];
      const meta = metadatosLista[i] || {
        etapa: Array.isArray(campos.etapa) ? campos.etapa[i] : campos.etapa,
        orden_servicio_id: campos.orden_servicio_id,
        servicio_id: campos.servicio_id,
        descripcion: Array.isArray(campos.descripcion) ? campos.descripcion[i] : campos.descripcion,
      };

      const etapa = meta && meta.etapa ? String(meta.etapa).trim() : '';
      if (!ETAPAS_CODIGOS_VALIDOS.has(etapa)) {
        return res.status(400).json({
          success: false,
          campo: 'etapa',
          mensaje: `Selecciona una etapa válida para la foto #${i + 1} ("${img.nombreOriginal}").`,
        });
      }

      let ordenServicioId = null;
      let servicioId = null;

      if (meta.orden_servicio_id !== undefined && meta.orden_servicio_id !== null && String(meta.orden_servicio_id).trim() !== '') {
        const osIdNum = parseInt(meta.orden_servicio_id, 10);
        if (isNaN(osIdNum) || !mapaOrdenServicios.has(osIdNum)) {
          return res.status(400).json({
            success: false,
            campo: 'servicio_id',
            mensaje: `El servicio vinculado en la foto #${i + 1} no pertenece a esta orden.`,
          });
        }
        ordenServicioId = osIdNum;
        servicioId = mapaOrdenServicios.get(osIdNum);
      } else if (meta.servicio_id !== undefined && meta.servicio_id !== null && String(meta.servicio_id).trim() !== '') {
        const srvIdNum = parseInt(meta.servicio_id, 10);
        if (isNaN(srvIdNum) || srvIdNum <= 0) {
          return res.status(400).json({
            success: false,
            campo: 'servicio_id',
            mensaje: `El identificador de servicio en la foto #${i + 1} no es válido.`,
          });
        }
        const srvCheck = await query(`SELECT id FROM servicios WHERE id = $1`, [srvIdNum]);
        if (srvCheck.rows.length === 0) {
          return res.status(400).json({
            success: false,
            campo: 'servicio_id',
            mensaje: `El servicio seleccionado en la foto #${i + 1} no existe en el catálogo.`,
          });
        }
        servicioId = srvIdNum;
        if (mapaServicioAOrdenServicio.has(srvIdNum)) {
          ordenServicioId = mapaServicioAOrdenServicio.get(srvIdNum);
        }
      }

      const textoNota = meta.descripcion ?? meta.nota ?? null;
      const descripcion =
        textoNota && String(textoNota).trim()
          ? String(textoNota).trim().slice(0, 600)
          : null;

      registrosPreparados.push({
        img,
        etapa,
        ordenServicioId,
        servicioId,
        descripcion,
      });
    }

    // Crear carpeta de la orden y escribir archivos con nombres seguros (UUID)
    const carpetaOrden = path.join(STORAGE_ROOT, String(ordenId));
    await fs.mkdir(carpetaOrden, { recursive: true });

    client = await pool.connect();
    await client.query('BEGIN');

    // Revalidar estado con bloqueo ligero
    const ordenTx = await client.query(
      `SELECT id, folio, estado FROM ordenes_trabajo WHERE id = $1 FOR SHARE`,
      [ordenId]
    );
    if (['entregada', 'cancelada'].includes(ordenTx.rows[0].estado)) {
      await client.query('ROLLBACK');
      return res.status(422).json({
        success: false,
        mensaje: 'La orden fue cerrada mientras se subían los archivos; no se guardaron cambios.',
      });
    }

    const insertadas = [];
    for (const item of registrosPreparados) {
      const nombreFisico = `${crypto.randomUUID()}.${item.img.extension}`;
      const rutaRelativa = `${ordenId}/${nombreFisico}`;
      const rutaAbsoluta = path.join(STORAGE_ROOT, String(ordenId), nombreFisico);

      await fs.writeFile(rutaAbsoluta, item.img.buffer, { flag: 'wx' });
      archivosEscritos.push(rutaAbsoluta);

      const insRes = await client.query(
        `INSERT INTO orden_evidencias (
           orden_id, orden_servicio_id, servicio_id, subido_por,
           etapa, descripcion, ruta_archivo, nombre_original, mime_type, tamano_bytes
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, etapa, servicio_id, nombre_original, created_at`,
        [
          ordenId,
          item.ordenServicioId,
          item.servicioId,
          req.usuario.id,
          item.etapa,
          item.descripcion,
          rutaRelativa,
          item.img.nombreOriginal,
          item.img.mimeType,
          item.img.tamanoBytes,
        ]
      );
      insertadas.push(insRes.rows[0]);
    }

    await client.query(
      `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, datos_nuevos, ip)
       VALUES ($1, 'subir_evidencias', 'ordenes_trabajo', $2, $3, $4)`,
      [
        req.usuario.id,
        ordenId,
        JSON.stringify({
          cantidad: insertadas.length,
          evidencias: insertadas.map((e) => ({ id: e.id, etapa: e.etapa })),
        }),
        req.ip || null,
      ]
    );

    await client.query('COMMIT');

    const [evidencias, validacionEvidencia] = await Promise.all([
      obtenerEvidenciasActivasOrden(query, ordenId),
      evaluarEvidenciaObligatoria(query, ordenId),
    ]);

    res.status(201).json({
      success: true,
      mensaje:
        insertadas.length === 1
          ? 'Fotografía guardada correctamente en la orden.'
          : `Se guardaron ${insertadas.length} fotografías correctamente en la orden.`,
      evidencias,
      validacionEvidencia,
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_rbErr) {
        // Ignorar error secundario en rollback
      }
    }
    for (const ruta of archivosEscritos) {
      try {
        await fs.unlink(ruta);
      } catch (_unlinkErr) {
        // Ignorar si no llegó a escribirse
      }
    }
    next(error);
  } finally {
    if (client) client.release();
  }
};

// Servir archivo binario de evidencia verificando autenticación y pertenencia a la orden
export const servirArchivoEvidencia = async (req, res, next) => {
  try {
    const ordenId = parseInt(req.params.id, 10);
    const evidenciaId = parseInt(req.params.evidenciaId, 10);

    if (isNaN(ordenId) || isNaN(evidenciaId) || ordenId <= 0 || evidenciaId <= 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'Parámetros de evidencia inválidos.',
      });
    }

    const evRes = await query(
      `SELECT id, orden_id, ruta_archivo, mime_type, nombre_original
       FROM orden_evidencias
       WHERE id = $1 AND orden_id = $2 AND activo = true`,
      [evidenciaId, ordenId]
    );

    if (evRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        mensaje: 'La fotografía solicitada no existe o fue dada de baja.',
      });
    }

    const evidencia = evRes.rows[0];
    const rutaAbsoluta = path.resolve(STORAGE_ROOT, evidencia.ruta_archivo);

    // Protección estricta contra Path Traversal
    if (!rutaAbsoluta.startsWith(STORAGE_ROOT + path.sep)) {
      return res.status(403).json({
        success: false,
        mensaje: 'Acceso al archivo denegado.',
      });
    }

    try {
      await fs.access(rutaAbsoluta);
    } catch (_err) {
      return res.status(404).json({
        success: false,
        mensaje: 'El archivo de imagen no se encuentra disponible en el almacenamiento.',
      });
    }

    res.setHeader('Content-Type', evidencia.mime_type);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(evidencia.nombre_original)}"`
    );

    const stream = createReadStream(rutaAbsoluta);
    stream.on('error', (err) => next(err));
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// Baja lógica controlada de evidencia según rol y estado de la orden
export const eliminarEvidenciaOrden = async (req, res, next) => {
  try {
    const ordenId = parseInt(req.params.id, 10);
    const evidenciaId = parseInt(req.params.evidenciaId, 10);
    const motivo =
      req.body && req.body.motivo && String(req.body.motivo).trim()
        ? String(req.body.motivo).trim().slice(0, 200)
        : 'Reemplazo o corrección de evidencia';

    if (isNaN(ordenId) || isNaN(evidenciaId)) {
      return res.status(400).json({
        success: false,
        mensaje: 'Identificadores de orden o evidencia inválidos.',
      });
    }

    const evRes = await query(
      `SELECT e.*, o.estado AS orden_estado, o.folio AS orden_folio
       FROM orden_evidencias e
       JOIN ordenes_trabajo o ON o.id = e.orden_id
       WHERE e.id = $1 AND e.orden_id = $2 AND e.activo = true`,
      [evidenciaId, ordenId]
    );

    if (evRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        mensaje: 'Fotografía no encontrada o ya eliminada.',
      });
    }

    const ev = evRes.rows[0];

    if (['entregada', 'cancelada'].includes(ev.orden_estado)) {
      return res.status(422).json({
        success: false,
        mensaje: `No se permite eliminar evidencia histórica de una orden ${ev.orden_estado}.`,
      });
    }

    const esAdmin = req.usuario.rol === 'admin';
    const esAutorEnOrdenAbierta =
      ev.subido_por === req.usuario.id && ev.orden_estado !== 'completada';

    if (!esAdmin && !esAutorEnOrdenAbierta) {
      const razon =
        ev.orden_estado === 'completada'
          ? 'La orden ya fue finalizada; solo un Administrador puede retirar fotografías antes de la entrega.'
          : 'Solo puedes retirar fotografías que tú mismo hayas subido o solicitar apoyo a un Administrador.';
      return res.status(403).json({
        success: false,
        mensaje: razon,
      });
    }

    await query(
      `UPDATE orden_evidencias
       SET activo = false,
           eliminado_por = $1,
           fecha_eliminacion = NOW(),
           motivo_eliminacion = $2
       WHERE id = $3`,
      [req.usuario.id, motivo, evidenciaId]
    );

    await query(
      `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, datos_anteriores, ip)
       VALUES ($1, 'baja_evidencia', 'orden_evidencias', $2, $3, $4)`,
      [
        req.usuario.id,
        evidenciaId,
        JSON.stringify({
          orden_id: ordenId,
          etapa: ev.etapa,
          nombre_original: ev.nombre_original,
          motivo,
        }),
        req.ip || null,
      ]
    );

    const [evidencias, validacionEvidencia] = await Promise.all([
      obtenerEvidenciasActivasOrden(query, ordenId),
      evaluarEvidenciaObligatoria(query, ordenId),
    ]);

    res.status(200).json({
      success: true,
      mensaje: 'Fotografía retirada de la orden.',
      evidencias,
      validacionEvidencia,
    });
  } catch (error) {
    next(error);
  }
};
