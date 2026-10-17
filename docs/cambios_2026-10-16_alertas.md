# Bitácora de Cambios — Implementación de Alertas SweetAlert2

- **Proyecto:** AutoPro — Sistema de Gestión Automotriz (Taller Mecánico)
- **Fecha:** 16 de octubre de 2026
- **Equipo:** Equipo 5
- **Repositorio:** https://github.com/excashh/gestion-automotriz-
- **Módulo:** Autenticación y Experiencia de Usuario (UI/UX)

---

## 1. Resumen Ejecutivo

En esta sesión se incorporó la librería **SweetAlert2** dentro del flujo de autenticación del sistema, elevando la calidad de respuesta visual y la seguridad operativa en las interacciones críticas de **Inicio de Sesión** y **Cierre de Sesión**.

Se centralizó toda la configuración estética de alertas para garantizar coherencia visual con la línea de diseño **SaaS Clean Pro** y la paleta **Crimson Sport** (#e11d48) recientemente adoptadas en AutoPro.

---

## 2. Historial de Commits Relacionados

| Hash | Tipo | Mensaje del Commit | Alcance |
|---|---|---|---|
| `d49b212` | chore(deps) | mover sweetalert2 a frontend | Regularización de dependencias en `frontend/package.json` |
| `91415a0` | docs | agregar bitacora de cambios del 15 de octubre en PDF | Registro documental de sesiones previas |
| `5647514` | feat(auth) | integrar alertas interactivas sweetalert2 en login y logout | Implementación de utilerías y handlers de autenticación |

---

## 3. Arquitectura del Módulo de Alertas (`alertas.js`)

Se diseñó el archivo `frontend/src/utils/alertas.js` como una capa de abstracción sobre SweetAlert2. Esto evita duplicar configuraciones CSS y permite que cualquier vista del sistema reutilice las alertas con una sola línea de código.

### Funciones disponibles:

1. **`toast(title, icon)`**:
   - Notificación flotante emergente en la esquina superior derecha (`top-end`).
   - Autodescartable a los 2.8 segundos con barra de progreso interactiva (`timerProgressBar: true`).
   - Pausa automática al pasar el cursor (`onmouseenter = Swal.stopTimer`).
2. **`alertaExito(title, text)`**:
   - Modal interactivo con icono de verificación verde y botón de acción carmesí.
3. **`alertaError(title, text)`**:
   - Modal de advertencia crítica para capturar errores de servidor o fallas de red.
4. **`alertaAdvertencia(title, text)`**:
   - Modal preventivo para campos requeridos y validaciones de formularios.
5. **`confirmarAccion({ title, text, confirmButtonText, cancelButtonText, icon })`**:
   - Cuadro de diálogo modal asíncrono con promesa que retorna `true` o `false`.
   - Botones configurados con inversión de orden ergonómica (`reverseButtons: true`) para evitar confirmaciones accidentales.

---

## 4. Cambios en la Pantalla de Login y Logout (`App.jsx`)

### A. Validación Previa al Envío (Frontend Guard)
- Se intercepta el evento de formulario antes de iniciar la solicitud HTTP.
- Si el correo o la contraseña están vacíos o contienen únicamente espacios, se dispara `alertaAdvertencia('Campos requeridos', 'Por favor ingresa tanto tu correo como tu contraseña.')` y se bloquea el spinner innecesario de carga.

### B. Notificación de Error de Autenticación
- Cuando el backend responde con credenciales inválidas (HTTP 401) o falla la red, el sistema ahora ejecuta:
  - Alerta modal `alertaError('Error de autenticación', mensajeError)`.
  - Mantiene el badge contextual en el formulario para asegurar doble canal de visibilidad y accesibilidad.

### C. Bienvenida con Toast No Intrusivo
- Una vez validado el token JWT y almacenado el usuario en `localStorage`, se reemplazó el antiguo banner temporal por `toast('¡Bienvenido al sistema, ' + res.usuario.nombre + '!', 'success')`.

### D. Confirmación de Cierre de Sesión (Logout Guard)
- Anteriormente la sesión se destruía inmediatamente al hacer clic en el botón del sidebar.
- Ahora `handleLogout` invoca `confirmarAccion` solicitando confirmación explícita (*"¿Cerrar sesión?"*). Si el usuario confirma, se eliminan las credenciales y se lanza un toast informativo de cierre de sesión.

---

## 5. Control de Calidad y Pruebas

- **Compilación de Producción:** Ejecución exitosa mediante `npx vite build` sin errores de importación o resolución de módulos.
- **Tree-Shaking y Bundling:** Paquete empaquetado correctamente en `dist/assets/index-*.js`.
- **Integridad Git:** Árbol de trabajo limpio y sincronizado en la rama principal.
