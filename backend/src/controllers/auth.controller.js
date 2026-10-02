import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        mensaje: 'Por favor, proporciona el correo electrónico y la contraseña.',
      });
    }

    const result = await query(
      `SELECT u.id, u.nombre, u.email, u.password_hash, u.activo, r.nombre AS rol
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        mensaje: 'Credenciales inválidas (usuario o contraseña incorrectos).',
      });
    }

    const usuario = result.rows[0];

    if (!usuario.activo) {
      return res.status(403).json({
        success: false,
        mensaje: 'Tu cuenta ha sido desactivada. Contacta al administrador.',
      });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        mensaje: 'Credenciales inválidas (usuario o contraseña incorrectos).',
      });
    }

    // Registrar último login y auditoría
    await query(`UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1`, [usuario.id]);
    await query(
      `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, ip)
       VALUES ($1, 'login', 'usuarios', $1, $2)`,
      [usuario.id, req.ip || req.connection.remoteAddress]
    );

    // Generar Token JWT
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.status(200).json({
      success: true,
      mensaje: 'Inicio de sesión exitoso.',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPerfil = async (req, res) => {
  res.status(200).json({
    success: true,
    usuario: req.usuario,
  });
};
