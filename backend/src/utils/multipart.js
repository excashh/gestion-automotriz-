import { PassThrough, Readable } from 'node:stream';

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB por fotografía
export const MAX_FILES_PER_UPLOAD = 8;
export const MAX_TOTAL_UPLOAD_BYTES = MAX_IMAGE_BYTES * MAX_FILES_PER_UPLOAD + 512 * 1024;

export const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Inspecciona los primeros bytes reales (magic bytes) del archivo
 * para impedir archivos ejecutables o corruptos renombrados como imagen.
 */
export const detectarMimeImagenReal = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WEBP: "RIFF" [4 bytes size] "WEBP"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
};

const crearErrorCarga = (mensaje, status = 400, campo = 'fotos') => {
  const error = new Error(mensaje);
  error.status = status;
  error.campo = campo;
  return error;
};

/**
 * Procesa peticiones multipart/form-data usando las APIs estándar de Node.js (sin dependencias externas),
 * aplicando límites estrictos de tamaño y validación real de formato de imagen.
 */
export const parsearMultipartImagenes = async (req) => {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    throw crearErrorCarga('El envío debe realizarse como formulario multimedia (multipart/form-data).', 400);
  }

  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > MAX_TOTAL_UPLOAD_BYTES) {
    throw crearErrorCarga(
      `El tamaño total de las fotos supera el límite permitido (${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB por imagen, máximo ${MAX_FILES_PER_UPLOAD} fotos por envío).`,
      413
    );
  }

  const pass = new PassThrough();
  let bytesRecibidos = 0;

  req.on('data', (chunk) => {
    bytesRecibidos += chunk.length;
    if (bytesRecibidos > MAX_TOTAL_UPLOAD_BYTES) {
      pass.destroy(
        crearErrorCarga(
          `La carga excedió el tamaño máximo permitido (${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB por imagen).`,
          413
        )
      );
      req.resume();
      return;
    }
    pass.write(chunk);
  });

  req.on('end', () => pass.end());
  req.on('error', (err) => pass.destroy(err));

  let formData;
  try {
    const webStream = Readable.toWeb(pass);
    const responseWrapper = new Response(webStream, {
      headers: { 'content-type': contentType },
    });
    formData = await responseWrapper.formData();
  } catch (err) {
    if (err.status) throw err;
    throw crearErrorCarga(
      'No fue posible leer los archivos adjuntos. Verifica que las imágenes no estén dañadas e inténtalo de nuevo.',
      400
    );
  }

  const campos = {};
  const archivos = [];

  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      if (campos[key] === undefined) {
        campos[key] = value;
      } else if (Array.isArray(campos[key])) {
        campos[key].push(value);
      } else {
        campos[key] = [campos[key], value];
      }
    } else if (value && typeof value.arrayBuffer === 'function') {
      archivos.push({ fieldName: key, file: value });
    }
  }

  if (archivos.length === 0) {
    throw crearErrorCarga('Selecciona o toma al menos una fotografía antes de confirmar.', 400);
  }

  if (archivos.length > MAX_FILES_PER_UPLOAD) {
    throw crearErrorCarga(`Puedes subir hasta ${MAX_FILES_PER_UPLOAD} fotografías a la vez.`, 400);
  }

  const imagenesValidadas = [];
  for (const { file } of archivos) {
    const nombreOriginal = (file.name || 'evidencia.jpg').replace(/[^\w.\-() ]+/g, '_').slice(0, 160) || 'evidencia.jpg';

    if (file.size === 0) {
      throw crearErrorCarga(`El archivo "${nombreOriginal}" está vacío. Selecciona una imagen válida.`, 400);
    }

    if (file.size > MAX_IMAGE_BYTES) {
      throw crearErrorCarga(
        `La imagen "${nombreOriginal}" pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB y supera el límite máximo de 8 MB por foto.`,
        413
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeReal = detectarMimeImagenReal(buffer);

    if (!mimeReal || !ALLOWED_IMAGE_TYPES[mimeReal]) {
      throw crearErrorCarga(
        `El archivo "${nombreOriginal}" no tiene un formato de imagen permitido. Usa fotografías JPG, PNG o WEBP.`,
        415
      );
    }

    imagenesValidadas.push({
      nombreOriginal,
      mimeType: mimeReal,
      extension: ALLOWED_IMAGE_TYPES[mimeReal],
      tamanoBytes: buffer.length,
      buffer,
    });
  }

  return { campos, imagenes: imagenesValidadas };
};
