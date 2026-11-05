# 📌 Backlog de Tareas del Proyecto AutoPro

Registro centralizado de micro-tareas para el equipo y el asistente de desarrollo.

---

## 🚦 Leyenda de Estados
- `[ ]` **Pendiente:** Lista para ser tomada.
- `[-]` **En Progreso:** En desarrollo en su rama correspondiente.
- `[x]` **Completada:** Implementada, verificada y subida a Git.

---

## 🛠️ Tareas Pendientes (Backlog Activo)

### 🚗 Módulo: Vehículos y Clientes
- [x] **[TASK-001]** **Backend & Frontend: Validación de formato y longitud de placas y VIN** *(Completada)*
  - *Módulo:* Backend (`src/controllers/clientes.controller.js`) & Frontend (`src/App.jsx`)
  - *Prioridad:* Media
  - *Descripción:* Asegurar que el registro de vehículos rechace VINs con longitud distinta a 17 caracteres, formatear placas a mayúsculas y agregar campo VIN en UI.
  - *Rama:* `feature/task-001-validacion-vin-placas`

- [x] **[TASK-002]** **Frontend: Búsqueda rápida de clientes con debounce** *(Completada)*
  - *Módulo:* Frontend (`src/App.jsx` o componente clientes)
  - *Prioridad:* Media
  - *Descripción:* Agregar debounce de 300ms en el input de búsqueda de clientes para no saturar las llamadas a la API.
  - *Rama:* `feature/task-002-debounce-clientes`

---

### 📦 Módulo: Inventario y Refacciones
- [ ] **[TASK-003]** **Frontend: Indicador visual de alerta para stock crítico**
  - *Módulo:* Frontend
  - *Prioridad:* Alta
  - *Descripción:* Resaltar en color rojo o con insignia de advertencia las piezas cuyo stock actual sea menor o igual al stock mínimo.
  - *Rama sugerida:* `feature/task-003-alerta-stock-critico`

- [x] **[TASK-004]** **Backend: Validación de stock negativo en creación/edición** *(Completada)*
  - *Módulo:* Backend (`src/controllers/refacciones.controller.js`)
  - *Prioridad:* Media
  - *Descripción:* Impedir registrar existencias o stocks mínimos menores a 0 devolviendo error HTTP 400.
  - *Rama:* `feature/task-004-validar-stock-positivo`

---

### 📋 Módulo: Órdenes de Trabajo (OT)
- [ ] **[TASK-005]** **Backend: Generación de folio formateado para nuevas órdenes**
  - *Módulo:* Backend
  - *Prioridad:* Alta
  - *Descripción:* Asegurar que el folio autoincrementable se genere en formato estándar `OT-YYYY-XXXXX`.
  - *Rama sugerida:* `feature/task-005-folio-ordenes`

- [ ] **[TASK-006]** **Frontend: Modal de confirmación al cambiar estado de orden**
  - *Módulo:* Frontend
  - *Prioridad:* Media
  - *Descripción:* Solicitar confirmación al usuario antes de pasar una orden a estado `completada` o `cancelada`.
  - *Rama sugerida:* `feature/task-006-confirmacion-estado-orden`

---

### 📊 Módulo: Reportes y Auditoría
- [ ] **[TASK-007]** **Backend: Endpoint para exportación resumida de ventas por rango de fechas**
  - *Módulo:* Backend
  - *Prioridad:* Baja
  - *Descripción:* Crear endpoint `GET /api/reportes/ventas?desde=&hasta=` que retorne el total facturado y desglose.
  - *Rama sugerida:* `feature/task-007-reporte-ventas-rango`

## ✅ Tareas Completadas

- **[TASK-001] Validación de formato y longitud de placas y VIN**
  - **Fecha:** 2026-10-06
  - **Rama:** `feature/task-001-validacion-vin-placas`
  - **Cambios realizados:**
    - Normalización de placas a mayúsculas y validación de longitud (3 a 10 caracteres) y caracteres alfanuméricos con guiones.
    - Validación estricta de longitud del número VIN (exactamente 17 caracteres alfanuméricos).
    - Validaciones adicionales en backend de año (1950-2100) y kilometraje no negativo.
    - Integración de campo VIN y auto-mayúsculas en modal de vinculación vehicular en el frontend.

- **[TASK-002] Frontend: Búsqueda rápida de clientes con debounce**
  - **Fecha:** 2026-10-06
  - **Rama:** `feature/task-002-debounce-clientes`
  - **Cambios realizados:**
    - Implementación de temporizador/debounce de 300ms en el filtro de búsqueda de clientes para optimizar peticiones API.

- **[TASK-004] Backend: Validación de stock negativo en creación/edición**
  - **Fecha:** 2026-10-13
  - **Rama:** `feature/task-004-validar-stock-positivo`
  - **Cambios realizados:**
    - Validación de `stock` y `stock_minimo` en `POST /refacciones` y `PUT /refacciones/:id`: deben ser enteros mayores o iguales a 0; de lo contrario se responde HTTP 400 con mensaje descriptivo.
    - `POST /refacciones` ya no responde 422 por stock negativo (queda 422 solo para `costo` y `precio_publico` negativos).
    - Documentación de los códigos de respuesta en `docs/api.md`.

- **[TASK-008] Backend: CRUD completo de vehículos**
  - **Fecha:** 2026-10-21
  - **Rama:** `feature/task-008-crud-vehiculos`
  - **Cambios realizados:**
    - Nuevo módulo `/api/vehiculos` (`vehiculos.controller.js` y `vehiculos.routes.js`): listar con búsqueda, filtros y paginación, ver detalle, editar (parcial) y baja lógica.
    - Validaciones de placas, VIN, año, kilometraje y longitudes en la edición, con las mismas reglas de la creación (TASK-001).
    - Regla de negocio: no se puede dar de baja un vehículo con órdenes abiertas (HTTP 422).
    - `POST /api/vehiculos` como alta alternativa; `POST /api/clientes/vehiculos` se conserva sin cambios.
    - Documentación de los endpoints en `docs/api.md`.
