import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

export const verificarToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        mensaje: 'Acceso no autorizado: Token no proporcionado o formato inválido.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');

    // Verificar si el usuario sigue activo en la base de datos
    const result = await query(
      `SELECT u.id, u.nombre, u.email, u.activo, r.nombre AS rol
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0 || !result.rows[0].activo) {
      return res.status(401).json({
        success: false,
        mensaje: 'Sesión inválida o el usuario ha sido desactivado.',
      });
    }

    req.usuario = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        mensaje: 'La sesión ha expirado. Por favor, inicia sesión nuevamente.',
      });
    }
    return res.status(401).json({
      success: false,
      mensaje: 'Token no válido.',
    });
  }
};

// Middleware para verificar roles permitidos (Req #10 y #11)
export const requerirRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        mensaje: 'No autenticado.',
      });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        success: false,
        mensaje: `Acceso denegado: El rol '${req.usuario.rol}' no tiene permisos para esta acción.`,
      });
    }

    next();
  };
};
