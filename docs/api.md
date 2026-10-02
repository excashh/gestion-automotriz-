# Documentación de la API REST — AutoPro Taller Automotriz

Esta API sigue la convención RESTful, comunicándose exclusivamente mediante objetos JSON y utilizando los códigos de estado HTTP estándar.

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

### `GET /clientes?page=1&limit=10&buscar=nombre`
Lista clientes con paginación y búsqueda insensible a mayúsculas/minúsculas.
- **Respuestas:** `200 OK`.

### `GET /clientes/:id`
Obtiene la información detallada de un cliente y todos los vehículos registrados a su nombre.
- **Respuestas:** `200 OK`, `404 Not Found`.

### `POST /clientes`
Registra un nuevo cliente en el sistema.
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
- **Respuestas:** `201 Created`, `400 Bad Request`.

### `POST /clientes/vehiculos`
Vincula un automóvil al expediente de un cliente.
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
- **Respuestas:** `201 Created`, `409 Conflict` (placa duplicada).

### `DELETE /clientes/:id`
Aplica **baja lógica** (`activo = false`) a un cliente.
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
- **Respuestas:** `201 Created`, `422 Unprocessable Entity` (números negativos).

---

## 4. Módulo Transaccional: Órdenes de Servicio (`/ordenes`)

### `GET /ordenes?page=1&limit=10&buscar=folio&estado=en_reparacion`
Lista órdenes de trabajo con estados, saldo y cliente.
- **Respuestas:** `200 OK`.

### `POST /ordenes`
Crea una nueva orden de servicio y genera su folio único autoincrementable (`OT-2026-00001`).
- **Permisos:** Roles `admin`, `recepcion`.
- **Respuestas:** `201 Created`.

### `POST /ordenes/:id/refacciones`
Asigna piezas de repuesto a la orden con foto de costos unitarios.
- **Respuestas:** `200 OK`, `422 Unprocessable Entity` (stock insuficiente).

### `PUT /ordenes/:id/finalizar` ⚠️ Operación Transaccional ACID
Ejecuta la transacción de cierre:
1. Bloqueo de orden (`FOR UPDATE`).
2. Comprobación y descuento atómico de existencias en `refacciones`.
3. Registro de auditoría y trazabilidad en `movimientos_inventario`.
4. Cálculo automático de mano de obra + piezas + IVA 16% + Total.
5. Cierre o `ROLLBACK` en caso de error.
- **Respuestas:** `200 OK`, `422 Unprocessable Entity`.

### `POST /ordenes/:id/pagos`
Registra abonos o liquidaciones de la orden con generación de folio de recibo.
- **Respuestas:** `201 Created`, `422 Unprocessable Entity` (si el monto excede el saldo).

---

## 5. Módulo de Dashboard y Reportes (`/dashboard`)

### `GET /dashboard/stats`
Métricas acumuladas para las tarjetas del panel y series de datos para gráficas Recharts.
- **Respuestas:** `200 OK`.

### `GET /dashboard/reportes/ventas?fecha_inicio=2026-01-01&fecha_fin=2026-12-31`
Reporte detallado de ingresos filtrado por rango de fechas (Fecha Inicial y Fecha Final).
- **Permisos:** Rol `admin`.
- **Respuestas:** `200 OK`.
