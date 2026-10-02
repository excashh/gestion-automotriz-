# 🚗 AutoPro — Sistema de Gestión Automotriz & Punto de Venta (POS)

Sistema integral de gestión de talleres mecánicos, control de refacciones, órdenes de servicio y facturación, diseñado bajo una arquitectura Cliente-Servidor desacoplada y cumpliendo estrictamente con los lineamientos académicos de desarrollo de software.

---

## 🏛️ Arquitectura del Sistema

```text
USUARIO
   ↓
FRONTEND (React 19 + Vite + Tailwind CSS + Recharts)
   ↓ (Peticiones HTTP con JSON y Bearer Token JWT)
API REST (Node.js + Express)
   ↓ (Consultas Parametrizadas y Transacciones ACID)
BASE DE DATOS (PostgreSQL 16 · 3FN)
```

---

## ✨ Características y Requerimientos Cumplidos

* **Modelo Relacional 3FN:** Más de 10 tablas relacionadas (`usuarios`, `roles`, `clientes`, `vehiculos`, `mecanicos`, `servicios`, `refacciones`, `ordenes_trabajo`, `orden_servicios`, `orden_refacciones`, `pagos`, `movimientos_inventario`, `auditoria`).
* **Seguridad y RBAC:** Autenticación con JWT y contraseñas hasheadas mediante **bcrypt** (cost 10). Control de acceso basado en roles (`admin`, `recepcion`, `mecanico`) verificado en frontend y backend.
* **Transacción ACID Crítica:** El cierre de una orden descuenta stock, calcula impuestos, actualiza la orden y crea movimientos en el inventario dentro de un bloque `BEGIN ... COMMIT / ROLLBACK`.
* **5 Reglas de Negocio Implementadas:**
  1. Imposibilidad de despachar piezas sin stock disponible suficiente.
  2. Bloqueo de importes o cantidades monetarias negativas.
  3. No duplicidad de placas vehiculares o códigos SKU.
  4. Bloqueo de edición para órdenes finalizadas/entregadas.
  5. Cálculo automático de saldos y alertas automáticas de inventario bajo el umbral mínimo.
* **Dashboard & Métricas:** Tarjetas de estado en tiempo real y **2 gráficas interactivas dinámicas** con Recharts (distribución de estados y facturación histórica).
* **Filtros por Fecha:** Módulo de reportes con selector de **Fecha Inicial y Fecha Final**.
* **Baja Lógica (Soft Delete):** Registros críticos usan banderas de activación (`activo = true/false`).

---

## 👥 Usuarios de Prueba (Seed Inicial)

Todos los usuarios cuentan con la contraseña: **`Password123!`**

| Rol | Correo Electrónico | Permisos |
| :--- | :--- | :--- |
| **Administrador** | `admin@autopro.com` | Acceso global, reportes financieros, catálogos y bajas. |
| **Recepción** | `recepcion@autopro.com` | Creación de clientes, apertura de órdenes y cobranza. |
| **Mecánico** | `mecanico@autopro.com` | Consulta y asignación de refacciones/diagnósticos. |

---

## 🚀 Guía de Instalación y Ejecución Local

### Prerrequisitos
- **Node.js** v18+ instalado.
- **PostgreSQL 16** en ejecución en el puerto `5432`.

### 1. Clonar y Configurar Base de Datos
```bash
# Crear base de datos
psql -U postgres -c "CREATE DATABASE autopro_db;"

# Cargar esquema y datos semilla
psql -U postgres -d autopro_db -f database/schema.sql
psql -U postgres -d autopro_db -f database/seed.sql
```

### 2. Levantar el Backend (API)
```bash
cd backend
npm install
npm run dev   # O 'npm start'
```
*El servidor estará escuchando en `http://localhost:4000`.*

### 3. Levantar el Frontend
```bash
cd ../frontend
npm install
npm run dev
```
*Abre tu navegador en `http://localhost:5173`.*

---

## 📖 Documentación Adicional
- [Documentación de Endpoints (API REST)](docs/api.md)
- Esquema de base de datos en [database/schema.sql](database/schema.sql)
