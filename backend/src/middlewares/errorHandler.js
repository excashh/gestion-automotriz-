export const errorHandler = (err, req, res, _next) => {
  console.error('[Error del Servidor]:', err.message);

  // Errores personalizados con estatus explícito
  if (err.status && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({
      success: false,
      mensaje: err.message,
      campo: err.campo || null,
      errores: err.errores || null,
      faltantes: err.faltantes || null,
    });
  }

  // Errores de unicidad de PostgreSQL (23505)
  if (err.code === '23505') {
    const constraint = (err.constraint || '').toLowerCase();
    let mensaje = 'Ya existe un registro con estos datos únicos.';
    let campo = null;

    if (constraint.includes('placas')) {
      mensaje = 'Esta placa ya está registrada en otro vehículo. Verifica la matrícula o selecciona el vehículo existente.';
      campo = 'placas';
    } else if (constraint.includes('vin')) {
      mensaje = 'Este número de serie (VIN) ya está asociado a otro vehículo registrado.';
      campo = 'vin';
    } else if (constraint.includes('email')) {
      mensaje = 'Este correo electrónico ya está registrado en el sistema.';
      campo = 'email';
    } else if (constraint.includes('sku')) {
      mensaje = 'Este código SKU ya pertenece a otra refacción del catálogo.';
      campo = 'sku';
    } else if (constraint.includes('codigo')) {
      mensaje = 'Este código de servicio ya existe en el catálogo.';
      campo = 'codigo';
    } else if (constraint.includes('folio')) {
      mensaje = 'Se detectó una colisión de folio. Intenta guardar nuevamente.';
    }

    return res.status(409).json({
      success: false,
      mensaje,
      campo,
    });
  }

  // Errores de clave foránea de PostgreSQL (23503)
  if (err.code === '23503') {
    const constraint = (err.constraint || '').toLowerCase();
    let mensaje = 'El elemento seleccionado no existe o ya no está disponible.';
    let campo = null;

    if (constraint.includes('cliente')) {
      mensaje = 'El cliente seleccionado no existe. Selecciona un cliente válido antes de continuar.';
      campo = 'cliente_id';
    } else if (constraint.includes('vehiculo')) {
      mensaje = 'El vehículo seleccionado no está registrado. Elige un vehículo válido de la lista.';
      campo = 'vehiculo_id';
    } else if (constraint.includes('mecanico')) {
      mensaje = 'El mecánico seleccionado no es válido.';
      campo = 'mecanico_id';
    } else if (constraint.includes('servicio')) {
      mensaje = 'El servicio seleccionado no existe en el catálogo.';
      campo = 'servicio_id';
    }

    return res.status(400).json({
      success: false,
      mensaje,
      campo,
    });
  }

  // Violaciones de restricciones CHECK de PostgreSQL (23514)
  if (err.code === '23514') {
    const constraint = (err.constraint || '').toLowerCase();
    let mensaje = 'Uno o más campos tienen un formato o valor no permitido. Revisa los datos capturados.';
    let campo = null;

    if (constraint.includes('email')) {
      mensaje = 'El formato del correo electrónico no es válido (ejemplo: cliente@correo.com).';
      campo = 'email';
    } else if (constraint.includes('rfc')) {
      mensaje = 'El RFC debe contener 12 caracteres (persona moral) o 13 caracteres (persona física).';
      campo = 'rfc';
    } else if (constraint.includes('vin')) {
      mensaje = 'El número VIN debe tener exactamente 17 caracteres alfanuméricos.';
      campo = 'vin';
    } else if (constraint.includes('anio')) {
      mensaje = 'El año del vehículo debe estar entre 1950 y 2100.';
      campo = 'anio';
    } else if (constraint.includes('kilometraje') || constraint.includes('km_entrada')) {
      mensaje = 'El kilometraje no puede ser un número negativo.';
      campo = 'kilometraje';
    } else if (constraint.includes('metodo')) {
      mensaje = 'Selecciona un método de pago válido (efectivo, débito, crédito o transferencia).';
      campo = 'metodo';
    }

    return res.status(422).json({
      success: false,
      mensaje,
      campo,
    });
  }

  // Error de tipo de dato inválido en PostgreSQL (22P02)
  if (err.code === '22P02') {
    return res.status(400).json({
      success: false,
      mensaje: 'Uno de los identificadores o valores numéricos enviados tiene un formato inválido.',
    });
  }

  // Error genérico controlado (sin exponer trazas técnicas ni datos sensibles)
  return res.status(500).json({
    success: false,
    mensaje: 'Ocurrió un problema inesperado en el servidor. Tus datos no se perdieron; intenta de nuevo en unos momentos.',
  });
};
