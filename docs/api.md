# Documentación de la API REST — AutoPro Taller Automotriz

Esta API sigue la convención RESTful, comunicándose mediante objetos JSON (y `multipart/form-data` para carga de evidencia fotográfica) y utilizando los códigos de estado HTTP estándar.

- **URL Base:** `http://localhost:4000/api`
- **Autenticación:** Encabezado `Authorization: Bearer <TOKEN_JWT>`

---

## 1. Módulo de Autenticación (`/auth`)

### `POST /auth/login`
Inicia sesión y genera el token de acceso JWT.
- **Permisos:** Público.
- **Body:**
```json
{
  "email": "admin@autopro.com",
  "password": "Password123!"
}
```
- **Respuestas:**
  - `200 OK`: Login exitoso con payload de usuario y token.
  - `400 Bad Request`: Faltan campos requeridos.
  - `401 Unauthorized`: Contraseña incorrecta o usuario inexistente.
  - `403 Forbidden`: Usuario inactivo.

### `GET /auth/perfil`
Obtiene los datos del usuario actualmente autenticado.
- **Permisos:** Requiere Token JWT.
- **Respuestas:** `200 OK`, `401 Unauthorized`.

---

## 2. Módulo de Clientes & Vehículos (`/clientes`)

### `GET /clientes?page=1&limit=10&buscar=termino`
Lista clientes activos con paginación y búsqueda por nombre, teléfono, correo, RFC, placa/marca/modelo de sus autos o identificador numérico (`1` o `#1`). Incluye `total_vehiculos` y el arreglo `vehiculos` asociados a cada cliente.
- **Respuestas:** `200 OK`.

### `GET /clientes/vehiculos?buscar=termino&cliente_id=1&limit=50`
Busca vehículos activos con los datos de su propietario (`cliente_nombre`, `cliente_telefono`). Soporta filtro opcional por `cliente_id` o búsqueda por placas, VIN, marca, modelo, propietario o ID.
- **Respuestas:** `200 OK`, `400 Bad Request`.

### `GET /clientes/vehiculos/:vehiculoId/historial`
Obtiene el expediente completo de un vehículo: datos de propietario, todas sus órdenes históricas, servicios realizados, refacciones instaladas y evidencia fotográfica activa por visita.
- **Respuestas:** `200 OK`, `404 Not Found`.

### `GET /clientes/:id`
Obtiene la información detallada de un cliente y todos los vehículos registrados a su nombre.
- **Respuestas:** `200 OK`, `404 Not Found`.

### `POST /clientes`
Registra un nuevo cliente en el sistema validando formato de teléfono, correo electrónico y RFC (12 o 13 caracteres), así como duplicados de RFC o email.
- **Permisos:** Roles `admin`, `recepcion`.
- **Body:**
```json
{
  "nombre": "Roberto Gómez",
  "telefono": "555-987654",
  "email": "roberto@ejemplo.com",
  "direccion": "Av. Hidalgo 100",
  "rfc": "GOMR880202H10"
}
```
- **Respuestas:** `201 Created`, `400 Bad Request`, `409 Conflict` (RFC o email duplicado).

### `POST /clientes/vehiculos`
Vincula un automóvil al expediente de un cliente activo (RN-02), validando formato de placas, VIN de 17 caracteres sin `I/O/Q` y año válido.
- **Permisos:** Roles `admin`, `recepcion`.
- **Body:**
```json
{
  "cliente_id": 1,
  "placas": "ABC-123-A",
  "marca": "Toyota",
  "modelo": "Corolla",
  "anio": 2021,
  "kilometraje": 35000
}
```
- **Respuestas:** `201 Created`, `400 Bad Request`, `404 Not Found` (cliente inexistente), `409 Conflict` (placa o VIN duplicado, indicando a qué propietario pertenece), `422 Unprocessable Entity` (cliente inactivo).

### `DELETE /clientes/:id`
Aplica **baja lógica** (`activo = false`) a un cliente y registra el movimiento en `auditoria`, conservando órdenes históricas y evidencia documental.
- **Permisos:** Rol `admin`.
- **Respuestas:** `200 OK`, `404 Not Found`.

---

## 3. Módulo de Refacciones & Inventario (`/refacciones`)

### `GET /refacciones?page=1&limit=10&buscar=aceite&stock_bajo=true`
Lista piezas de inventario con opción de filtrar por stock crítico.
- **Respuestas:** `200 OK`.

### `GET /refacciones/stock-bajo`
Obtiene las refacciones que han caído por debajo de su umbral mínimo de seguridad (`stock <= stock_minimo`).
- **Respuestas:** `200 OK`.

### `POST /refacciones`
Agrega una nueva pieza al catálogo.
- **Permisos:** Rol `admin`.
- **Validaciones:** `stock` y `stock_minimo` deben ser enteros mayores o iguales a 0.
- **Respuestas:** `201 Created`, `400 Bad Request` (campos obligatorios faltantes, o `stock` / `stock_minimo` negativos o no enteros), `422 Unprocessable Entity` (`costo` o `precio_publico` negativos).

### `PUT /refacciones/:id`
Actualiza los datos de una pieza activa del catálogo.
- **Permisos:** Rol `admin`.
- **Validaciones:** si se envían `stock` o `stock_minimo`, deben ser enteros mayores o iguales a 0.
- **Respuestas:** `200 OK`, `400 Bad Request` (`stock` / `stock_minimo` negativos o no enteros), `404 Not Found` (refacción inexistente o inactiva).

---

## 4. Módulo Transaccional: Órdenes de Servicio & Evidencia Fotográfica (`/ordenes`)

### `GET /ordenes/catalogos`
Obtiene el catálogo activo de servicios (incluyendo `etapas_evidencia_obligatorias`), mecánicos disponibles y etapas fotográficas válidas.
- **Respuestas:** `200 OK`.

### `PUT /ordenes/servicios/:servicioId/evidencia-config`
Configura qué etapas fotográficas son obligatorias para un servicio específico antes de autorizar la entrega del vehículo.
- **Permisos:** Rol `admin`.
- **Body:**
```json
{
  "etapas_obligatorias": ["antes_diagnostico", "despues_instalacion"]
}
```
- **Respuestas:** `200 OK`, `400 Bad Request`, `404 Not Found`.

### `GET /ordenes?page=1&limit=50&buscar=folio&estado=en_reparacion`
Lista órdenes de trabajo con estados, saldo, cliente y contador `total_evidencias`.
- **Respuestas:** `200 OK`.

### `GET /ordenes/:id`
Consulta el expediente completo de una orden: encabezado, cliente, vehículo, `servicios`, `refacciones`, `pagos`, `evidencias` y `validacionEvidencia` (estado de cumplimiento de fotos obligatorias).
- **Respuestas:** `200 OK`, `404 Not Found`.

### `POST /ordenes`
Crea una nueva orden de servicio y genera su folio único autoincrementable (`OT-2026-00001`). Permite asignar opcionalmente `servicio_inicial_id`, `mecanico_id`, `bahia` y `fecha_estimada`.
- **Permisos:** Roles `admin`, `recepcion`.
- **Respuestas:** `201 Created`, `400 Bad Request`, `404 Not Found`, `422 Unprocessable Entity`.

### `POST /ordenes/:id/servicios`
Asigna mano de obra del catálogo de servicios a una orden abierta (RN-04).
- **Permisos:** Roles `admin`, `recepcion`, `mecanico`.
- **Respuestas:** `200 OK`, `422 Unprocessable Entity` (orden cerrada).

### `POST /ordenes/:id/refacciones`
Asigna piezas de repuesto a una orden abierta (RN-04) con foto de precios y costos unitarios.
- **Permisos:** Roles `admin`, `recepcion`, `mecanico`.
- **Respuestas:** `200 OK`, `422 Unprocessable Entity` (stock insuficiente u orden cerrada).

### `GET /ordenes/:id/evidencias`
Lista las evidencias fotográficas activas de una orden junto con `validacionEvidencia`.
- **Respuestas:** `200 OK`, `404 Not Found`.

### `POST /ordenes/:id/evidencias`
Sube de 1 a 8 fotografías (`multipart/form-data`, campo `fotos` + `metadata` JSON por archivo con `etapa`, `orden_servicio_id` opcional y `nota` opcional). Valida firma binaria real (`JPEG`, `PNG`, `WEBP`, máx. 8 MB por imagen), almacena el binario fuera de la base de datos (`backend/storage/evidencias/<orden_id>/`) y guarda metadatos transaccionalmente en `orden_evidencias`.
- **Permisos:** Roles `admin`, `recepcion`, `mecanico`. No permitido en órdenes `entregada` o `cancelada`.
- **Respuestas:** `201 Created`, `400 Bad Request`, `413 Payload Too Large`, `415 Unsupported Media Type`, `422 Unprocessable Entity`.

### `GET /ordenes/:id/evidencias/:evidenciaId/archivo`
Transmite de forma privada el archivo de imagen validando token JWT y pertenencia a la orden (`Cache-Control: private`, `X-Content-Type-Options: nosniff`).
- **Permisos:** Requiere Token JWT.
- **Respuestas:** `200 OK` (stream binario), `401 Unauthorized`, `404 Not Found`.

### `DELETE /ordenes/:id/evidencias/:evidenciaId`
Realiza baja lógica (`activo = false`) de una evidencia y registra auditoría.
- **Permisos:** En órdenes cerradas (`entregada`/`cancelada`) bloqueado para todos; en órdenes `completada` solo `admin`; en órdenes en proceso, `admin`, `recepcion` o el `mecanico` autor de la foto.
- **Respuestas:** `200 OK`, `403 Forbidden`, `422 Unprocessable Entity`.

### `PUT /ordenes/:id/finalizar` ⚠️ Operación Transaccional ACID
Ejecuta la transacción de cierre:
1. Bloqueo de orden (`FOR UPDATE`).
2. Comprobación y descuento atómico de existencias en `refacciones`.
3. Registro de auditoría y trazabilidad en `movimientos_inventario`.
4. Cálculo automático de mano de obra + piezas + IVA 16% + Total.
5. Cierre como `completada` o `ROLLBACK` en caso de error.
- **Respuestas:** `200 OK`, `422 Unprocessable Entity`.

### `POST /ordenes/:id/pagos`
Registra abonos o liquidaciones (`efectivo`, `debito`, `credito`, `transferencia`) con generación de folio de recibo. Si el pago liquida una orden `completada`, pasa automáticamente a `entregada` únicamente si las reglas de evidencia fotográfica obligatoria están cubiertas; de lo contrario conserva el pago, mantiene la orden en `completada` y devuelve `entregaPendienteEvidencia: true` junto con `faltantes`.
- **Permisos:** Roles `admin`, `recepcion`.
- **Respuestas:** `201 Created`, `400 Bad Request`, `422 Unprocessable Entity`.

### `PUT /ordenes/:id/entregar`
Cierra formalmente una orden `completada` como `entregada` tras verificar saldo liquidado (`$0.00`) y cumplimiento íntegro de las etapas fotográficas obligatorias de sus servicios.
- **Permisos:** Roles `admin`, `recepcion`.
- **Respuestas:** `200 OK`, `422 Unprocessable Entity` (saldo pendiente o evidencia obligatoria faltante con detalle `faltantes`).

---

## 5. Módulo de Dashboard y Reportes (`/dashboard`)

### `GET /dashboard/stats`
Métricas acumuladas para las tarjetas del panel y series de datos para gráficas Recharts.
- **Respuestas:** `200 OK`.

### `GET /dashboard/reportes/ventas?fecha_inicio=2026-01-01&fecha_fin=2026-12-31`
Reporte detallado de ingresos filtrado por rango de fechas (Fecha Inicial y Fecha Final).
- **Permisos:** Rol `admin`.
- **Respuestas:** `200 OK`.
