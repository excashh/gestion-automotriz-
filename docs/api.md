# Documentación de la API REST - AutoGestión Pro

Todos los endpoints se exponen bajo el prefijo `/api/`.
Formato de intercambio: `application/json`.
Autenticación: Bearer Token JWT en el encabezado `Authorization: Bearer <TOKEN>`.

---

## 1. Autenticación y Perfil

### `POST /api/auth/login`
- **Público**: Sí
- **Body**:
  ```json
  { "email": "admin@autogestion.com", "password": "admin123" }
  ```
- **Respuesta (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5...",
    "usuario": { "id": 1, "nombre": "Roberto Mendoza", "email": "admin@autogestion.com", "rol": "admin" }
  }
  ```
- **Códigos HTTP**: 200 (OK), 400 (Faltan credenciales), 401 (Credenciales inválidas).

### `GET /api/auth/me`
- **Requiere Token**: Sí (Cualquier rol)
- **Respuesta (200 OK)**: Datos del usuario autenticado.

---

## 2. Dashboard y Estadísticas

### `GET /api/dashboard/stats`
- **Requiere Token**: Sí
- **Respuesta (200 OK)**:
  ```json
  {
    "ordenesActivas": 3,
    "ingresosMes": 8908.80,
    "vehiculosEnTaller": 3,
    "repuestosBajoStock": 2,
    "ingresosMensuales": [ { "mes": "May", "total": 12400 }, ... ],
    "ordenesPorEstado": [ { "estado": "en_reparacion", "total": 2 }, ... ],
    "ultimasOrdenes": [ ... ],
    "alertasStock": [ ... ]
  }
  ```

---

## 3. Clientes (CRUD)

- `GET /api/clientes?search=&tipo=&page=1&limit=10` (Filtro, búsqueda, paginación) -> 200 OK
- `GET /api/clientes/:id` -> 200 OK / 404 Not Found
- `POST /api/clientes` -> 201 Created / 400 / 409 Conflict
- `PUT /api/clientes/:id` -> 200 OK / 400 / 404
- `DELETE /api/clientes/:id` -> 200 OK (Baja lógica / soft delete)

---

## 4. Vehículos (CRUD)

- `GET /api/vehiculos?search=&marca=&page=1&limit=10` -> 200 OK
- `GET /api/vehiculos/:id` (incluye historial de servicios previos) -> 200 OK / 404
- `POST /api/vehiculos` -> 201 Created / 400 / 409 (VIN/Placa duplicada)
- `PUT /api/vehiculos/:id` -> 200 OK / 400 / 404
- `DELETE /api/vehiculos/:id` -> 200 OK (Baja lógica)

---

## 5. Repuestos e Inventario (CRUD + Kárdex)

- `GET /api/repuestos?search=&categoria_id=&stock_bajo=true&page=1&limit=10` -> 200 OK
- `GET /api/repuestos/categorias` -> 200 OK
- `GET /api/repuestos/:id` -> 200 OK / 404
- `POST /api/repuestos` -> 201 Created (Requiere rol Admin o Recepcionista)
- `PUT /api/repuestos/:id` -> 200 OK
- `POST /api/repuestos/:id/ajuste-stock` -> 200 OK (Transaccional, registra en kárdex)
- `DELETE /api/repuestos/:id` -> 200 OK (Baja lógica)

---

## 6. Órdenes de Servicio / POS Automotriz

- `GET /api/ordenes?search=&estado=&tecnico_id=&fecha_inicio=&fecha_fin=&page=1&limit=10` -> 200 OK
- `GET /api/ordenes/:id` -> 200 OK (Incluye desglose completo de refacciones y mano de obra)
- `POST /api/ordenes` -> 201 Created (Genera folio único ORD-YYYY-XXXX, valida stock previo)
- `PUT /api/ordenes/:id` -> 200 OK (Actualiza diagnóstico y datos si está abierta)
- `PATCH /api/ordenes/:id/estado` -> 200 OK
  - **Operación Crítica Transaccional**: Si el nuevo estado es `finalizado`, se ejecuta una transacción ACID que:
    1. Descuenta existencias en la tabla `repuestos`.
    2. Inserta movimientos en `movimientos_inventario`.
    3. Actualiza el kilometraje oficial en `vehiculos`.
    4. Sella la fecha de término y marca pagado.
    5. Registra auditoría.
- `POST /api/ordenes/:id/cancelar` -> 200 OK (Requiere rol `admin` y justificación)

---

## 7. Reportes y Analítica

- `GET /api/reportes/financiero?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD`
- `GET /api/reportes/productividad?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD`

---

## 8. Usuarios y Auditoría

- `GET /api/usuarios` (Requiere rol `admin`)
- `POST /api/usuarios` (Requiere rol `admin`, encripta password con bcrypt)
- `GET /api/auditoria?limit=50` (Requiere rol `admin`)
