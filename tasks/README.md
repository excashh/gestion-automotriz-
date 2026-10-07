# 📋 Gestión de Tareas - AutoPro

Este directorio organiza las micro-tareas del proyecto **AutoPro** para que el equipo pueda asignar requerimientos puntuales y llevar control del avance colaborativo con Git.

---

## 🗂️ Estructura del Directorio

- **[`backlog.md`](./backlog.md):** Lista activa de tareas pendientes, en progreso y completadas.
- **[`template.md`](./template.md):** Plantilla para registrar nuevas micro-tareas con especificaciones claras.

---

## 🚀 Flujo de Trabajo Colaborativo (Workflow)

### 1. Asignar una tarea al Asistente
Puedes pedir una tarea de 2 formas:
1. **Por ID del backlog:** *"Realiza la tarea TASK-001 de backlog.md y súbela a GitHub."*
2. **Directo en el chat:** *"Crea la tarea: [descripción breve], ejecútala y súbela a GitHub."*

### 2. Ciclo de Ejecución
1. **Rama de trabajo:** Se crea una rama específica: `git checkout -b feature/TASK-XXX-nombre` (o `fix/...`).
2. **Implementación:** Se realizan los cambios mínimos necesarios y se verifican.
3. **Actualización de estado:** Se marca como completada `[x]` en `backlog.md`.
4. **Commit semántico:** Mensaje descriptivo siguiendo Conventional Commits:
   - `feat(...)`: Nueva funcionalidad.
   - `fix(...)`: Corrección de errores.
   - `docs(...)`: Cambios en documentación.
   - `test(...)`: Pruebas automatizadas.
5. **Publicación en GitHub:** `git push origin <rama>` (o directo a `main` si así lo solicitas).
