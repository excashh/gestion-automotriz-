# 🚗 AutoPro — Documento de Definición y Planeación del Proyecto

## 1. 🎯 Objetivo de la Aplicación Web

### Objetivo General
Desarrollar una aplicación web integral para la gestión operativa, administrativa y comercial de un taller automotriz (**AutoPro**), implementando una arquitectura Cliente-Servidor desacoplada que controle de manera centralizada el catálogo de servicios, inventario de refacciones, registro de clientes/vehículos, asignación de órdenes de trabajo y cobros mediante transacciones atómicas seguras (ACID).

### Objetivos Específicos
1. **Desacoplamiento Estricto:** Separar la lógica de presentación (Frontend en React) del procesamiento de reglas de negocio y persistencia (Backend en Node.js/Express y PostgreSQL en 3FN) mediante una API REST en formato JSON.
2. **Garantizar la Integridad Transaccional:** Procesar el cierre y facturación de órdenes en transacciones seguras (`BEGIN ... COMMIT / ROLLBACK`), evitando inconsistencias en inventario y saldos.
3. **Control de Acceso Basado en Roles (RBAC):** Garantizar la seguridad y protección de rutas y endpoints verificando roles (`admin`, `recepcion`, `mecanico`) tanto en frontend como en backend.
4. **Trazabilidad y Reportabilidad:** Proporcionar un Dashboard dinámico con estadísticas en tiempo real y reportes financieros filtrables por rangos de fechas con auditoría de operaciones críticas.

---

## 2. 📋 Requisitos Funcionales (RF)

| ID | Nombre del Requisito | Descripción |
| :--- | :--- | :--- |
| **RF-01** | **Autenticación Segura** | Inicio y cierre de sesión mediante correo y contraseña encriptada con `bcrypt`. Emisión de tokens JWT con expiración controlada. |
| **RF-02** | **Control de Acceso (RBAC)** | Restricción de pantallas y endpoints según el rol: `admin` (total), `recepcion` (clientes, autos, citas, cobros) y `mecanico` (diagnóstico y piezas). |
| **RF-03** | **CRUD de Clientes** | Registro, consulta paginada, búsqueda por nombre/teléfono/RFC, edición y baja lógica (`activo = false`). |
| **RF-04** | **Gestión de Vehículos** | Vinculación de vehículos a un cliente con validación de placas únicas, número VIN (17 caracteres), marca, modelo, año y kilometraje. |
| **RF-05** | **Catálogo de Refacciones** | Registro y control de inventario de piezas con SKU único, costo de adquisición, precio público, stock actual y stock mínimo. |
| **RF-06** | **Alertas de Stock Mínimo** | Identificación y alerta visual automática de repuestos cuyo stock sea menor o igual al umbral de seguridad (`vw_stock_bajo`). |
| **RF-07** | **Apertura de Órdenes (OT)** | Creación de órdenes de trabajo asociadas a un vehículo con asignación de folio único autoincrementable (ej. `OT-2026-00001`). |
| **RF-08** | **Asignación de Mano de Obra y Repuestos** | Agregar servicios con horas estándar y refacciones con captura de "foto histórica" de precios para congelar los costos al momento del servicio. |
| **RF-09** | **Cierre Transaccional (ACID)** | Finalización de orden que valida existencias, descuenta inventario atómicamente, registra la salida en `movimientos_inventario`, calcula IVA y total. En caso de falta de stock: `ROLLBACK`. |
| **RF-10** | **Módulo de Cobranza y Pagos** | Registro de abonos y liquidaciones (efectivo, tarjeta, transferencia), cálculo automático de saldos (`vw_ordenes_saldo`) y emisión de folio de pago (`PG-2026-00001`). |
| **RF-11** | **Dashboard con Métricas** | Pantalla principal con tarjetas de contadores (órdenes activas, ingresos, alertas) y 2 gráficas dinámicas (órdenes por estado e ingresos mensuales). |
| **RF-12** | **Buscador y Filtros** | Búsqueda dinámica con coincidencia parcial (trigram/ILIKE) y filtros por estado de orden (`programada`, `en_reparacion`, `completada`, etc.). |
| **RF-13** | **Reportes con Rango de Fechas** | Consulta y generación de reportes de ventas y recaudación filtrables mediante selector de `Fecha Inicial` y `Fecha Final`. |
| **RF-14** | **Historial y Auditoría** | Registro en base de datos (`auditoria`) de usuario, IP, acción y timestamp para operaciones críticas. |

---

## 3. ⚙️ Requisitos No Funcionales (RNF)

| ID | Nombre | Especificación Técnica |
| :--- | :--- | :--- |
| **RNF-01** | **Arquitectura de Software** | Arquitectura Cliente-Servidor de 3 capas (Frontend ↔ API REST ↔ Base de Datos Relacional). El frontend nunca consulta la BD directamente. |
| **RNF-02** | **Normalización de Datos** | Base de datos PostgreSQL estructurada en **Tercera Forma Normal (3FN)** con claves foráneas, restricciones `CHECK`, índices y llaves compuestas. |
| **RNF-03** | **Seguridad en Contraseñas** | Ninguna contraseña almacenada en texto plano; uso obligatorio de hashing seguro con **bcrypt** (cost 10). |
| **RNF-04** | **Prevención de Inyecciones (SQLi)** | Todas las consultas hacia la base de datos se ejecutan de forma **parametrizada** (`$1, $2, ...`), descartando concatenación de cadenas. |
| **RNF-05** | **Manejo Seguro de Errores** | La API no expone al cliente trazas de error (`stack trace`), nombres de tablas o cadenas de conexión; responde con códigos HTTP apropiados (200, 201, 400, 401, 403, 404, 422, 500) y mensajes amigables. |
| **RNF-06** | **Seguridad de Credenciales** | Uso estricto de variables de entorno (`.env`) excluidas del repositorio Git mediante `.gitignore`, entregando plantilla `.env.example`. |
| **RNF-07** | **Diseño Responsivo** | Interfaz desarrollada en Tailwind CSS con adaptabilidad completa para computadoras de escritorio, laptops y tablets. |
| **RNF-08** | **Rendimiento y Paginación** | Consultas masivas delimitadas con `LIMIT` y `OFFSET` para no sobrecargar la memoria del cliente ni del servidor. |
| **RNF-09** | **Control de Versiones** | Historial de commits ordenado, progresivo y semántico en Git (`feat`, `fix`, `docs`, `chore`). |
| **RNF-10** | **Integridad Referencial y Baja Lógica** | Registros con dependencias históricas no se eliminan físicamente (`DELETE`), sino mediante baja lógica (`activo = false`). |

---

## 4. 📅 Cronograma y Planeación por Días Laborales (Lunes a Viernes)

### SEMANA 1: Cimientos, Base de Datos y Entorno (6 al 9 de Octubre)
* **Martes 06 de Octubre:** Análisis formal de requerimientos y definición del modelo entidad-relación en 3FN. Instalación de herramientas base (PostgreSQL 16, Git, Node.js).
* **Miércoles 07 de Octubre:** Creación y ejecución de `database/schema.sql` (tablas, claves foráneas, índices trigram, secuencias y vistas).
* **Jueves 08 de Octubre:** Creación y ejecución de `database/seed.sql` con datos de prueba realistas (roles, clientes, vehículos, mecánicos, refacciones y usuarios con hash bcrypt).
* **Viernes 09 de Octubre:** Configuración del repositorio Git (`git init`, `.gitignore`, usuario) y primer commit formal.

### SEMANA 2: Backend — Autenticación, Roles y Catálogos (12 al 16 de Octubre)
* **Lunes 12 de Octubre:** Estructuración del proyecto backend en Node.js/Express (`package.json`, ESM). Configuración de `.env` y pool PostgreSQL.
* **Martes 13 de Octubre:** Implementación del endpoint de autenticación `POST /api/auth/login` con bcrypt y emisión de JWT.
* **Miércoles 14 de Octubre:** Middlewares de verificación de token y roles RBAC (`verificarToken`, `requerirRol`). Middleware centralizado de errores.
* **Jueves 15 de Octubre:** Módulo de Clientes: Endpoints `GET` (paginado y búsqueda), `POST`, `PUT` y baja lógica en `DELETE`.
* **Viernes 16 de Octubre:** Módulo de Vehículos: Endpoint `POST /api/clientes/vehiculos` con validación de placas únicas y VIN de 17 dígitos. Commit en Git.

### SEMANA 3: Backend — Inventario, Transacción ACID y Reportes (19 al 23 de Octubre)
* **Lunes 19 de Octubre:** Módulo de Refacciones: CRUD de inventario y endpoint `GET /api/refacciones/stock-bajo` con vista SQL.
* **Martes 20 de Octubre:** Módulo de Órdenes: Creación de órdenes con folio autoincrementable y asignación de mano de obra y refacciones.
* **Miércoles 21 de Octubre:** **Transacción ACID:** Endpoint `PUT /api/ordenes/:id/finalizar` con verificación de stock, descuento atómico, cálculo de IVA y `COMMIT`/`ROLLBACK`.
* **Jueves 22 de Octubre:** Módulo de Cobranza y Pagos: Endpoint `POST /api/ordenes/:id/pagos` con control de saldos y folios de recibo. Auditoría automática.
* **Viernes 23 de Octubre:** Endpoints del Dashboard (`/api/dashboard/stats`) y Reportes de ventas por rango de fechas. Commit en Git.

### SEMANA 4: Frontend — Arquitectura, Dashboard y Módulos Base (26 al 30 de Octubre)
* **Lunes 26 de Octubre:** Inicialización del proyecto Frontend con React y Vite. Configuración de Tailwind CSS y Lucide Icons.
* **Martes 27 de Octubre:** Cliente API (`api.js`) con manejo de token Bearer. Pantalla de Login con accesos demo.
* **Miércoles 28 de Octubre:** Maquetación del Sidebar con RBAC y construcción de las tarjetas de métricas del Dashboard.
* **Jueves 29 de Octubre:** Módulo visual de Clientes y Vehículos: Tabla con buscador en tiempo real y modales de registro.
* **Viernes 30 de Octubre:** Módulo visual de Inventario / Refacciones: Tabla, buscador dinámico y alerta visual de stock bajo. Commit en Git.

### SEMANA 5: Frontend Avanzado, Blindaje, Documentación y Entrega (02 al 06 de Noviembre)
* **Lunes 02 de Noviembre:** Módulo visual de Órdenes de Trabajo: Listado con filtros de estado y asignación de piezas/mano de obra.
* **Martes 03 de Noviembre:** Integración visual de la Finalización Transaccional ACID y módulo de cobranza de saldos en vivo.
* **Miércoles 04 de Noviembre:** Integración de las 2 Gráficas dinámicas de Recharts en el Dashboard y módulo de Reportes con selector de fechas.
* **Jueves 05 de Noviembre:** Pruebas integrales de flujo completo (E2E), verificación de rúbrica del docente y actualización de `README.md` y `docs/api.md`.
* **Viernes 06 de Noviembre:** Verificación del script `iniciar-autopro.bat`, revisión final del árbol de Git y entrega final del proyecto.
