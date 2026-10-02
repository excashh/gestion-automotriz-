# Diccionario de Datos y Modelo Entidad-Relación - AutoGestión Pro

## 1. Diagrama Entidad-Relación (Mermaid)

```mermaid
erDiagram
    USUARIOS ||--o{ ORDENES_SERVICIO : "atiende / recepciona"
    USUARIOS ||--o{ MOVIMIENTOS_INVENTARIO : "registra"
    USUARIOS ||--o{ AUDITORIA_LOGS : "genera"
    CLIENTES ||--o{ VEHICULOS : "posee"
    CLIENTES ||--o{ ORDENES_SERVICIO : "solicita"
    VEHICULOS ||--o{ ORDENES_SERVICIO : "recibe mantenimiento"
    CATEGORIAS_REPUESTOS ||--o{ REPUESTOS : "clasifica"
    ORDENES_SERVICIO ||--o{ ORDEN_DETALLES_REPUESTOS : "incluye"
    REPUESTOS ||--o{ ORDEN_DETALLES_REPUESTOS : "es consumido en"
    ORDENES_SERVICIO ||--o{ ORDEN_SERVICIOS_MANO_OBRA : "desglosa"
    REPUESTOS ||--o{ MOVIMIENTOS_INVENTARIO : "traza existencias"
    ORDENES_SERVICIO ||--o{ MOVIMIENTOS_INVENTARIO : "origina consumo"

    USUARIOS {
        int id PK
        string nombre
        string email UK
        string password_hash
        string rol
        string telefono
        int activo
        datetime created_at
    }

    CLIENTES {
        int id PK
        string nombre
        string documento_identidad UK
        string email
        string telefono
        string direccion
        string tipo_cliente
        int activo
    }

    VEHICULOS {
        int id PK
        int cliente_id FK
        string vin UK
        string placa UK
        string marca
        string modelo
        int anio
        int kilometraje
        string combustible
        int activo
    }

    REPUESTOS {
        int id PK
        int categoria_id FK
        string codigo UK
        string nombre
        string marca
        float precio_compra
        float precio_venta
        int stock
        int stock_minimo
        string ubicacion
        int activo
    }

    ORDENES_SERVICIO {
        int id PK
        string folio UK
        int cliente_id FK
        int vehiculo_id FK
        int tecnico_id FK
        int recepcionista_id FK
        datetime fecha_ingreso
        datetime fecha_completada
        int kilometraje_ingreso
        string motivo_ingreso
        string estado
        float mano_obra_costo
        float repuestos_costo
        float subtotal
        float iva
        float total
        int pagado
    }
```

---

## 2. Diccionario de Datos

### Tabla: `usuarios`
| Campo | Tipo | Nulo | Descripción / Regla |
|---|---|---|---|
| `id` | INTEGER | NO | Clave primaria autoincremental |
| `nombre` | TEXT | NO | Nombre completo del operador |
| `email` | TEXT | NO | Correo electrónico único para inicio de sesión |
| `password_hash` | TEXT | NO | Hash Bcrypt unidireccional |
| `rol` | TEXT | NO | 'admin', 'tecnico', 'recepcionista' |
| `activo` | INTEGER | NO | 1 = Activo, 0 = Inactivo (Baja lógica) |

### Tabla: `ordenes_servicio`
| Campo | Tipo | Nulo | Descripción / Regla |
|---|---|---|---|
| `id` | INTEGER | NO | Clave primaria |
| `folio` | TEXT | NO | Folio único autogenerado (ej. ORD-2026-0001) |
| `cliente_id` | INTEGER | NO | FK hacia `clientes` |
| `vehiculo_id` | INTEGER | NO | FK hacia `vehiculos` |
| `tecnico_id` | INTEGER | SÍ | FK hacia `usuarios` (mecánico responsable) |
| `recepcionista_id` | INTEGER | NO | FK hacia `usuarios` (quien recibe) |
| `estado` | TEXT | NO | 'pendiente', 'en_diagnostico', 'en_reparacion', 'espera_repuestos', 'finalizado', 'cancelado' |
| `subtotal` | REAL | NO | Suma de refacciones + mano de obra |
| `iva` | REAL | NO | 16% del subtotal |
| `total` | REAL | NO | Subtotal + IVA |
