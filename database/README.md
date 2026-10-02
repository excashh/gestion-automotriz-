# Documentación de la Base de Datos - AutoGestión Pro

## 1. Motor de Base de Datos
- **Motor:** SQLite / Relacional compatible con SQL Estándar (ANSI SQL).
- **Normalización:** Tercera Forma Normal (3FN). Todas las tablas poseen claves primarias sintéticas (`id INTEGER PRIMARY KEY AUTOINCREMENT`), claves foráneas con restricciones de integridad referencial (`ON DELETE RESTRICT` / `ON DELETE CASCADE`), e índices B-Tree en campos de búsqueda frecuente (`placa`, `vin`, `email`, `documento_identidad`, `folio`, `estado`).
- **Persistencia:** Archivo físico relacional en `./database/autogestion.sqlite` manipulado a través de transacciones ACID por el servidor backend de Express.

---

## 2. Scripts Disponibles
- `database/schema.sql`: Script DDL para creación de tablas, índices, llaves foráneas y restricciones `CHECK`.
- `database/seed.sql`: Script DML con datos de prueba realistas para puesta en marcha inmediata.

---

## 3. Modelo Relacional y Entidades

### Entidades Principales:
1. **`usuarios`**: Control de acceso y RBAC (`admin`, `tecnico`, `recepcionista`) con passwords encriptados mediante `bcryptjs`.
2. **`clientes`**: Catálogo de personas y empresas clientes (`particular`, `flotilla`, `corporativo`).
3. **`vehiculos`**: Registro automotriz con número de serie (VIN), placa, marca, modelo, odómetro y llave foránea hacia `clientes`.
4. **`categorias_repuestos`**: Agrupación funcional de partes y refacciones.
5. **`repuestos`**: Control de inventario, precios de compra/venta, umbral de stock mínimo y alertas automáticas.
6. **`ordenes_servicio`**: Entidad transaccional central. Relaciona cliente, vehículo, técnico y recepcionista. Mantiene estados de flujo de taller (`pendiente`, `en_diagnostico`, `en_reparacion`, `espera_repuestos`, `finalizado`, `cancelado`).
7. **`orden_detalles_repuestos`**: Relación $N:M$ entre órdenes y repuestos con captura histórica de precio y cálculo de subtotal.
8. **`orden_servicios_mano_obra`**: Desglose de actividades mecánicas realizadas, horas hombre y tarifa.
9. **`movimientos_inventario`**: Kárdex de almacén (`entrada`, `salida_orden`, `ajuste`) con registro de stock anterior, nuevo y usuario responsable.
10. **`auditoria_logs`**: Registro inmutable de acciones críticas (creaciones, transacciones, cancelaciones, cambios de estado).

---

## 4. Reglas de Negocio Implementadas en BD
- **Integridad Referencial:** Clientes y vehículos con órdenes de servicio no pueden ser eliminados en cascada (`ON DELETE RESTRICT`).
- **Valores no negativos:** `CHECK(stock >= 0)`, `CHECK(precio_venta >= precio_compra)`, `CHECK(kilometraje >= 0)`.
- **Unicidad:** Folios de orden, VINs, placas, emails y códigos de partes garantizan unicidad a nivel de motor.
