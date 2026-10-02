# AutoGestión Pro - Sistema Integral de Gestión Automotriz & Punto de Venta (POS)

Sistema web de nivel productivo para la administración integral de talleres mecánicos y centros automotrices. Desarrollado bajo una arquitectura Cliente-Servidor desacoplada con API REST, base de datos relacional normalizada en **Tercera Forma Normal (3FN)**, autenticación segura con JWT y Bcrypt, control de acceso basado en roles (RBAC), transacciones atómicas ACID y reglas de negocio críticas para el sector automotriz.

---

## 1. Objetivo del Proyecto

Proporcionar una plataforma digital centralizada y robusta que automatice el ciclo de vida operativo de un taller mecánico:
- Recepción de vehículos con verificación de odómetro y diagnóstico inicial.
- Asignación técnica de mecánicos y cotización reactiva de mano de obra y refacciones.
- Control de existencias con alertas de stock mínimo y trazabilidad de almacén mediante kárdex.
- Cobro y facturación con operaciones transaccionales seguras (`BEGIN TRANSACTION` ... `COMMIT` / `ROLLBACK`).
- Emisión e impresión de comprobantes de servicio y reportes ejecutivos para toma de decisiones.

---

## 2. Tecnologías Utilizadas

### Frontend
- **Framework:** React 19 (TypeScript)
- **Bundler:** Vite
- **Estilos:** Tailwind CSS v4
- **Iconografía:** Lucide React
- **Diseño & UX:** Directrices de alta densidad de datos (SaaS Dashboard), diseño responsivo, estados de carga y feedback visual.

### Backend
- **Entorno:** Node.js (TypeScript con `tsx`)
- **Framework HTTP:** Express
- **Seguridad & Auth:** JSON Web Tokens (`jsonwebtoken`), Hash Bcrypt (`bcryptjs`)
- **Validaciones:** Validación estricta en servidor de entradas, formatos, odómetros y existencias.

### Base de Datos
- **Motor:** SQLite / Relacional compatible con ANSI SQL (con transacciones ACID).
- **Normalización:** Tercera Forma Normal (3FN), claves primarias autoincrementales, claves foráneas con integridad referencial (`ON DELETE RESTRICT`, `ON DELETE CASCADE`), índices B-Tree en campos de alta concurrencia.
- **Persistencia:** Archivo local `./database/autogestion.sqlite` manipulado en backend.

---

## 3. Arquitectura del Sistema

```text
       USUARIO
          ↓
   FRONTEND (React 19)
          ↓
  PETICIÓN HTTP (JSON / Bearer JWT)
          ↓
   API REST (Express)
          ↓
  VALIDACIONES & REGLAS DE NEGOCIO
          ↓
 BASE DE DATOS RELACIONAL (SQLite 3FN)
          ↓
   RESPUESTA JSON (Códigos 200, 201, 400, 401, 403, 409, 422, 500)
          ↓
 INTERFAZ ACTUALIZADA
```

El frontend **nunca** se comunica directamente con la base de datos; todas las operaciones pasan forzosamente por los controladores y middlewares de autorización del backend.

---

## 4. Reglas de Negocio Implementadas

1. **RN-01 (Verificación de Stock en Cotización):** No se permite asociar una refacción a una orden si no existen unidades disponibles en almacén.
2. **RN-02 (Transaccionalidad Atómica de Cobro y Cierre):** Al finalizar y liquidar una orden de servicio, se ejecuta una transacción atómica que:
   - Descuenta el stock de las refacciones utilizadas.
   - Inserta los movimientos correspondientes en la tabla `movimientos_inventario` (Kárdex).
   - Actualiza el kilometraje del vehículo si el de la orden es superior.
   - Sella la fecha de entrega y marca la orden como pagada.
   - Si ocurre cualquier error, se revierte todo (`ROLLBACK`).
3. **RN-03 (Inmutabilidad de Órdenes Liquidadas):** Una orden con estado `finalizado` no puede ser modificada en montos ni refacciones por trazabilidad contable. Solo un Administrador puede cancelarla registrando una justificación obligatoria.
4. **RN-04 (Cálculo Financiero Forzoso en Servidor):** El subtotal, el cálculo del 16% de IVA y el total general se calculan matemáticamente en el backend, previniendo alteraciones desde el cliente.
5. **RN-05 (Baja Lógica / Soft Delete):** Los vehículos y clientes con historial de servicios no se eliminan físicamente de la base de datos (`activo = 0`), protegiendo el libro histórico de mantenimiento.
6. **RN-06 (Consistencia de Kilometraje):** El kilometraje ingresado en una orden no puede ser inferior al último odómetro registrado en el vehículo para prevenir fraudes.

---

## 5. Usuarios de Prueba y Roles (RBAC)

El sistema incluye 3 roles funcionales. Para facilitar la evaluación, la pantalla de inicio de sesión dispone de **botones de acceso rápido de 1 clic**:

| Rol | Nombre | Correo | Contraseña | Permisos |
|---|---|---|---|---|
| **Administrador** | Ing. Roberto Mendoza | `admin@autogestion.com` | `admin123` | Control total, reportes, usuarios, auditoría, cancelación |
| **Técnico** | Carlos Hernández | `carlos.mecanico@autogestion.com` | `mecanico123` | Órdenes asignadas, diagnósticos, mano de obra |
| **Recepción** | Ana Sofía Morales | `ana.recepcion@autogestion.com` | `recep123` | Registro de clientes, recepción de autos, facturación y cobro |

---

## 6. Endpoints Principales de la API REST

| Método | Endpoint | Descripción | Acceso |
|---|---|---|---|
| `POST` | `/api/auth/login` | Autenticación y generación de JWT | Público |
| `GET` | `/api/auth/me` | Datos de la sesión activa | Autenticado |
| `GET` | `/api/dashboard/stats` | KPIs, gráficas y alertas de stock | Autenticado |
| `GET` | `/api/clientes` | Consulta con paginación, filtros y búsqueda | Autenticado |
| `POST` | `/api/clientes` | Registro de nuevo cliente con validaciones | Autenticado |
| `GET` | `/api/vehiculos` | Listado y consulta de unidades y placas | Autenticado |
| `POST` | `/api/vehiculos` | Alta de vehículo con validación de VIN y año | Autenticado |
| `GET` | `/api/repuestos` | Catálogo de inventario y alerta de stock | Autenticado |
| `POST` | `/api/repuestos/:id/ajuste-stock`| Ajuste transaccional de almacén (Kárdex) | Admin / Recepción |
| `GET` | `/api/ordenes` | Listado con búsqueda dinámica y filtros | Autenticado |
| `POST` | `/api/ordenes` | Creación de orden y cotización reactiva | Autenticado |
| `PATCH`| `/api/ordenes/:id/estado` | Cambio de estado y cierre transaccional | Autenticado |
| `POST` | `/api/ordenes/:id/cancelar`| Cancelación auditada con justificación | Solo Admin |
| `GET` | `/api/reportes/financiero` | Reporte con rango de fechas y exportación CSV | Autenticado |
| `GET` | `/api/reportes/productividad` | Rendimiento de mecánicos y top refacciones | Autenticado |
| `GET` | `/api/auditoria` | Bitácora inmutable de eventos del sistema | Solo Admin |

---

## 7. Instalación y Ejecución

### Requisitos Previos
- Node.js versión 18 o superior.
- Gestor de paquetes `npm` o `bun`.

### Pasos de Instalación
```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar el servidor en modo desarrollo (Express + Vite)
npm run dev

# 3. Compilar para producción
npm run build

# 4. Iniciar en producción
npm run start
```

El sistema estará accesible en `http://localhost:3000`.

---

## 8. Estructura del Repositorio

```text
├── database/
│   ├── schema.sql         # Script DDL (3FN, tablas, índices, llaves foráneas)
│   ├── seed.sql           # Datos iniciales realistas con passwords Bcrypt
│   ├── autogestion.sqlite # Archivo físico de base de datos relacional
│   └── README.md          # Documentación detallada del modelo relacional
├── docs/
│   ├── api.md             # Documentación exhaustiva de endpoints REST
│   └── database.md        # Diagrama ER (Mermaid) y diccionario de datos
├── server/
│   ├── api.ts             # Endpoints REST y reglas de negocio
│   └── db.ts              # Conexión SQLite, persistencia y transacciones ACID
├── src/
│   ├── components/        # Vistas de Dashboard, POS, Vehículos, Clientes, etc.
│   ├── context/           # Estado de autenticación JWT y roles
│   ├── services/          # Cliente API tipado
│   └── types/             # Interfaces TypeScript
├── server.ts              # Servidor Express Full-Stack con middleware de Vite
├── .env.example           # Plantilla de variables de entorno
└── README.md              # Documentación del proyecto
```
