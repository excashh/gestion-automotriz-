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

* **Modelo Relacional 3FN:** 14 tablas relacionadas (`usuarios`, `roles`, `clientes`, `vehiculos`, `mecanicos`, `categorias`, `servicios`, `refacciones`, `ordenes_trabajo`, `orden_servicios`, `orden_refacciones`, `pagos`, `movimientos_inventario`, `auditoria`).
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
- **Git** (en Windows incluye **Git Bash**, la terminal donde se ejecutan los comandos de esta guía).
- **Node.js** v18+ instalado (`node -v` para comprobarlo).
- **PostgreSQL 16** en ejecución en el puerto `5432`. Durante la instalación se define una contraseña para el usuario `postgres`; anótala. Instala también el componente **Command Line Tools**, que incluye `psql`.

> En Windows, si `psql` no se reconoce después de instalar PostgreSQL, consulta la sección **Solución de Problemas Frecuentes** al final de esta guía.

### 1. Clonar y Configurar Base de Datos
Ejecuta estos comandos desde la **raíz del proyecto** (las rutas de los scripts son relativas). Cada comando de `psql` pide la contraseña del usuario `postgres`.
```bash
# Clonar el repositorio
git clone https://github.com/excashh/gestion-automotriz-.git
cd gestion-automotriz-

# Crear base de datos
psql -U postgres -c "CREATE DATABASE autopro_db;"

# Cargar esquema y datos semilla
psql -U postgres -d autopro_db -f database/schema.sql
psql -U postgres -d autopro_db -f database/seed.sql
```

### 2. Configurar la Conexión a la Base de Datos
El backend se conecta con estos valores por defecto: servidor `localhost`, puerto `5432`, usuario `postgres`, base `autopro_db` y contraseña **`admin123`**.

Si la contraseña de tu usuario `postgres` es otra (lo más común), crea el archivo `backend/.env` con tus datos. El archivo debe llamarse exactamente `.env` (sin extensión `.txt`) y no se sube a GitHub porque está en el `.gitignore`.
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_contraseña_de_postgres
DB_NAME=autopro_db
JWT_SECRET=una_clave_secreta
```
> No cambies el puerto del backend (`PORT`, por defecto `4000`): el frontend apunta a `http://localhost:4000/api` (ver `frontend/src/services/api.js`).

### 3. Levantar el Backend (API)
```bash
cd backend
npm install
npm run dev   # O 'npm start'
```
*El servidor estará escuchando en `http://localhost:4000`. Al iniciar muestra el mensaje "AutoPro Backend activo".*

`npm run dev` reinicia el servidor solo al guardar cambios en el código; con `npm start` hay que detenerlo (`Ctrl+C`) y arrancarlo de nuevo para ver los cambios.

Para comprobar que responde, abre `http://localhost:4000/api/health` en el navegador.

### 4. Levantar el Frontend
Abre **otra terminal**, sin cerrar la del backend:
```bash
cd frontend
npm install
npm run dev
```
*Abre tu navegador en `http://localhost:5173` e inicia sesión con alguno de los usuarios de prueba de la sección anterior.*

### Inicio rápido en Windows
Después de ejecutar `npm install` una vez en `backend` y en `frontend`, puedes levantar todo con doble clic en **`iniciar-autopro.bat`**, que abre el backend, el frontend y el navegador. El script no instala dependencias.

---

## 🛠️ Solución de Problemas Frecuentes

| Síntoma | Causa probable y solución |
| :--- | :--- |
| `psql: command not found` | La carpeta `bin` de PostgreSQL no está en el PATH. En Git Bash ejecuta `echo 'export PATH="$PATH:/c/Program Files/PostgreSQL/16/bin"' >> ~/.bashrc`, cierra Git Bash y ábrelo de nuevo. Ajusta el `16` si instalaste otra versión. |
| `node` o `npm` no se reconocen | Cierra todas las ventanas de la terminal y abre una nueva después de instalar Node.js. |
| `password authentication failed for user "postgres"` | La contraseña no coincide con la que definiste al instalar PostgreSQL. En el backend, corrígela en `backend/.env` (`DB_PASSWORD`). |
| El backend no conecta a la base de datos | Verifica que el servicio de PostgreSQL esté iniciado (en Windows: **Servicios** → `postgresql-x64-16` → **Iniciar**) y que la contraseña de `backend/.env` sea correcta. |
| `database "autopro_db" already exists` | La base ya fue creada. Omite el `CREATE DATABASE` y continúa con los scripts de esquema y semilla. |
| `EADDRINUSE` (puerto 4000 en uso) | Ya hay otro backend corriendo. Ciérralo (`Ctrl+C` en su terminal) antes de iniciar uno nuevo. |
| El frontend muestra errores de red o el login falla | El backend no está corriendo o no está en `http://localhost:4000`. Revísalo con `http://localhost:4000/api/health`. |
| Hice cambios en el backend y no se reflejan | Con `npm start` hay que reiniciar el servidor. Usa `npm run dev` para que se reinicie solo. |

---

## 📖 Documentación Adicional
- [Documentación de Endpoints (API REST)](docs/api.md)
- Esquema de base de datos en [database/schema.sql](database/schema.sql)
