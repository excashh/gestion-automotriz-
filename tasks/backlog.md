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
- [ ] **[TASK-001]** **Backend: Validación de formato y longitud de placas y VIN**
  - *Módulo:* Backend (`src/routes/` o `src/controllers/`)
  - *Prioridad:* Media
  - *Descripción:* Asegurar que el registro de vehículos rechace VINs con longitud distinta a 17 caracteres y formatear placas a mayúsculas.
  - *Rama sugerida:* `feature/task-001-validacion-vin-placas`

- [ ] **[TASK-002]** **Frontend: Búsqueda rápida de clientes con debounce**
  - *Módulo:* Frontend (`src/App.jsx` o componente clientes)
  - *Prioridad:* Media
  - *Descripción:* Agregar debounce de 300ms en el input de búsqueda de clientes para no saturar las llamadas a la API.
  - *Rama sugerida:* `feature/task-002-debounce-clientes`

---

### 📦 Módulo: Inventario y Refacciones
- [ ] **[TASK-003]** **Frontend: Indicador visual de alerta para stock crítico**
  - *Módulo:* Frontend
  - *Prioridad:* Alta
  - *Descripción:* Resaltar en color rojo o con insignia de advertencia las piezas cuyo stock actual sea menor o igual al stock mínimo.
  - *Rama sugerida:* `feature/task-003-alerta-stock-critico`

- [ ] **[TASK-004]** **Backend: Validación de stock negativo en creación/edición**
  - *Módulo:* Backend
  - *Prioridad:* Media
  - *Descripción:* Impedir registrar existencias o stocks mínimos menores a 0 devolviendo error HTTP 400.
  - *Rama sugerida:* `feature/task-004-validar-stock-positivo`

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

---

## ✅ Tareas Completadas

*(Las tareas finalizadas se moverán a esta sección con la fecha y el commit correspondiente)*
