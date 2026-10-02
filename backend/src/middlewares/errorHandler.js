export const errorHandler = (err, req, res, next) => {
  console.error('[Error del Servidor]:', err.message);

  // Errores de clave foránea o unicidad de PostgreSQL
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      mensaje: 'Ya existe un registro con estos datos únicos (ej. email, placa o código duplicado).',
      detalle: err.detail || null,
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      mensaje: 'Operación no permitida: El registro hace referencia a un elemento que no existe o está enlazado a otros datos.',
    });
  }

  if (err.code === '23514') {
    return res.status(422).json({
      success: false,
      mensaje: 'Violación de regla de negocio o validación de campos requeridos.',
      detalle: err.detail || null,
    });
  }

  // Error genérico controlado (nunca volcar stack traces al usuario)
  res.status(err.status || 500).json({
    success: false,
    mensaje: err.message || 'Ocurrió un error interno en el servidor.',
  });
};
