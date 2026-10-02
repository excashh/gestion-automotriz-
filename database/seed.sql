-- =====================================================================
-- AutoGestión Pro - Datos Iniciales y Semilla (Seed Data)
-- Contraseñas encriptadas con bcrypt:
-- admin@autogestion.com / admin123
-- carlos.mecanico@autogestion.com / mecanico123
-- luis.mecanico@autogestion.com / mecanico123
-- ana.recepcion@autogestion.com / recep123
-- =====================================================================

-- 1. Usuarios con roles (hash de bcrypt para 'admin123', 'mecanico123', 'recep123')
INSERT INTO usuarios (id, nombre, email, password_hash, rol, telefono, activo) VALUES
(1, 'Ing. Roberto Mendoza (Admin)', 'admin@autogestion.com', '$2a$10$0zB3Nq.G6mQyvO03kXN1kOnm/Uo80o5V5LhZ1w5JgR9Yy0Cq2k8a2', 'admin', '55-1234-5678', 1),
(2, 'Carlos Hernández (Técnico Master)', 'carlos.mecanico@autogestion.com', '$2a$10$wI5f2e8D1Vj6D6m1FzQyQ.N9sO7P1W3X5Y7Z9A1B3C5D7E9F1G3H5', 'tecnico', '55-2345-6789', 1),
(3, 'Luis Ramírez (Especialista Frenos/Susp)', 'luis.mecanico@autogestion.com', '$2a$10$wI5f2e8D1Vj6D6m1FzQyQ.N9sO7P1W3X5Y7Z9A1B3C5D7E9F1G3H5', 'tecnico', '55-3456-7890', 1),
(4, 'Ana Sofía Morales (Recepción y Caja)', 'ana.recepcion@autogestion.com', '$2a$10$xI6g3f9E2Wk7E7n2G0RzR.O0tP8Q2X4Y6Z8A2B4C6D8E0F2G4H6I7', 'recepcionista', '55-4567-8901', 1);

-- 2. Clientes
INSERT INTO clientes (id, nombre, documento_identidad, email, telefono, direccion, ciudad, tipo_cliente, notas, activo) VALUES
(1, 'Rodrigo Salgado Gómez', 'RFC-SAGR850412-1A1', 'rodrigo.salgado@gmail.com', '55-5555-1111', 'Av. Insurgentes Sur 1450', 'Ciudad de México', 'particular', 'Cliente frecuente desde 2023', 1),
(2, 'María Fernanda Torres', 'RFC-TOFM901103-2B2', 'mafer.torres@outlook.com', '55-5555-2222', 'Colonia Del Valle, Calle San Borja 412', 'Ciudad de México', 'particular', 'Prefiere refacciones originales OEM', 1),
(3, 'Transportes & Logística Express S.A.', 'RFC-TLE180905-9X9', 'flotilla@logisticaexpress.com', '55-5555-3333', 'Parque Industrial Vallejo Nave 4', 'Ciudad de México', 'flotilla', 'Flotilla de 12 camionetas de reparto', 1),
(4, 'Constructora Atlas del Centro', 'RFC-CAC120614-7K3', 'mantenimiento@constructoraatlas.mx', '55-5555-4444', 'Paseo de la Reforma 222', 'Ciudad de México', 'corporativo', 'Pago mediante transferencia 15 días', 1),
(5, 'Guillermo Pacheco Arriaga', 'RFC-PAAG780228-5M4', 'gpacheco@yahoo.com.mx', '55-5555-5555', 'Av. Universidad 890, Narvarte', 'Ciudad de México', 'particular', 'Vehículo de uso particular para viajes', 1);

-- 3. Vehículos
INSERT INTO vehiculos (id, cliente_id, vin, placa, marca, modelo, anio, kilometraje, color, combustible, transmision, notas, activo) VALUES
(1, 1, '3VW2B7AJ5DM109823', 'NLX-78-45', 'Volkswagen', 'Jetta MK6 2.5L', 2018, 86450, 'Plata Metálico', 'Gasolina', 'Automática', 'Servicios mayores realizados en tiempo', 1),
(2, 2, '2T1BR32E8FC401924', 'PVZ-32-19', 'Toyota', 'Corolla LE 1.8L', 2021, 45200, 'Blanco Perla', 'Gasolina', 'CVT', 'Garantía de afinación al corriente', 1),
(3, 3, '1FTFW1E83MFC19842', 'TMX-99-01', 'Ford', 'Transit Custom 2.0 TDCi', 2022, 112000, 'Blanco', 'Diésel', 'Manual', 'Unidad de reparto intensivo. Revisar frenos', 1),
(4, 3, '1FTFW1E83MFC19843', 'TMX-99-02', 'Ford', 'Transit Custom 2.0 TDCi', 2022, 108400, 'Blanco', 'Diésel', 'Manual', 'Camioneta de reparto Express 2', 1),
(5, 4, '1FA6P8CF5H5302914', 'ATX-50-60', 'Ford', 'Ranger XLT 4x4', 2020, 94100, 'Azul Marino', 'Diésel', 'Automática', 'Uso en obra civil. Revisar suspensión', 1),
(6, 5, 'WAUZZZ8V7FA019284', 'GTO-11-22', 'Audi', 'A3 Sedan 2.0 TFSI', 2019, 68000, 'Gris Daytona', 'Gasolina', 'Doble Embrague', 'Requiere aceite sintetico Castrol 5W-40', 1);

-- 4. Categorías de Repuestos
INSERT INTO categorias_repuestos (id, nombre, descripcion, activo) VALUES
(1, 'Frenos y Seguridad', 'Pastillas, discos, balatas, líquido de frenos y calipers', 1),
(2, 'Motor y Afinación', 'Filtros, bujías, bandas de distribución, bombas de agua', 1),
(3, 'Fluidos y Químicos', 'Aceites sintéticos, anticongelante, limpiadores, grasas', 1),
(4, 'Suspensión y Dirección', 'Amortiguadores, terminales, bujes, rótulas y bieletas', 1),
(5, 'Sistema Eléctrico', 'Baterías, alternadores, arrancadores, focos y sensores', 1);

-- 5. Repuestos en Inventario
INSERT INTO repuestos (id, categoria_id, codigo, nombre, marca, descripcion, precio_compra, precio_venta, stock, stock_minimo, ubicacion, activo) VALUES
(1, 1, 'REP-FR-001', 'Pastillas de Freno Cerámicas Delanteras', 'Brembo', 'Juego de pastillas cerámicas de alto rendimiento', 650.00, 1150.00, 14, 5, 'Pasillo A - Estante 1', 1),
(2, 1, 'REP-FR-002', 'Discos de Freno Ventilados 280mm', 'Wagner', 'Par de discos ventilados anticorrosión', 1100.00, 1850.00, 6, 4, 'Pasillo A - Estante 2', 1),
(3, 1, 'REP-FR-003', 'Líquido de Frenos DOT 4 500ml', 'Motul', 'Líquido de frenos sintético punto de ebullición alto', 95.00, 190.00, 3, 6, 'Pasillo A - Estante 4', 1), -- Stock bajo para alerta
(4, 2, 'REP-AF-001', 'Filtro de Aceite Sintético Premium', 'Mann Filter', 'Filtro blindado multicapa alta eficiencia', 120.00, 240.00, 28, 8, 'Pasillo B - Estante 1', 1),
(5, 2, 'REP-AF-002', 'Filtro de Aire Motor', 'Fram', 'Filtro de aire de celulosa de alta densidad', 140.00, 290.00, 15, 5, 'Pasillo B - Estante 2', 1),
(6, 2, 'REP-AF-003', 'Bujías de Iridio IX (Juego x4)', 'NGK', 'Bujías de iridio larga duración 100,000 km', 480.00, 890.00, 9, 4, 'Pasillo B - Estante 3', 1),
(7, 3, 'REP-FL-001', 'Aceite 5W-30 100% Sintético (Garrafa 5L)', 'Mobil 1', 'Aceite de motor con tecnología SuperSyn', 680.00, 1250.00, 18, 5, 'Pasillo C - Estante 1', 1),
(8, 3, 'REP-FL-002', 'Anticongelante OAT Larga Vida 50/50 4L', 'Prestone', 'Anticongelante formulación universal protec 5 años', 190.00, 360.00, 4, 6, 'Pasillo C - Estante 2', 1), -- Stock bajo para alerta
(9, 4, 'REP-SU-001', 'Amortiguador Delantero a Gas', 'Monroe OESpectrum', 'Amortiguador presurizado con nitrógeno', 950.00, 1680.00, 8, 4, 'Pasillo D - Estante 1', 1),
(10, 5, 'REP-EL-001', 'Batería Automotriz 12V 650 CCA Grupo 48', 'LTH Hi-Tec', 'Batería de libre mantenimiento con garantía extendida', 1850.00, 2950.00, 5, 3, 'Pasillo E - Estante 1', 1);

-- 6. Órdenes de Servicio Iniciales
INSERT INTO ordenes_servicio (
    id, folio, cliente_id, vehiculo_id, tecnico_id, recepcionista_id,
    fecha_ingreso, fecha_estimada_entrega, fecha_completada, kilometraje_ingreso,
    nivel_combustible, motivo_ingreso, diagnostico, observaciones, estado,
    mano_obra_costo, repuestos_costo, subtotal, iva, total, metodo_pago, pagado
) VALUES
(1, 'ORD-2026-0001', 1, 1, 2, 4,
 '2026-09-15 09:30:00', '2026-09-16 17:00:00', '2026-09-16 16:20:00', 86450,
 '1/2', 'Servicio mayor de 85,000 km y ruido al frenar',
 'Desgaste severo en pastillas de freno delanteras. Aceite degradado.',
 'Vehículo entregado limpio. Prueba de ruta satisfactoria.', 'finalizado',
 800.00, 2680.00, 3480.00, 556.80, 4036.80, 'tarjeta_debito', 1),

(2, 'ORD-2026-0002', 3, 3, 2, 4,
 '2026-09-22 08:15:00', '2026-09-23 18:00:00', '2026-09-23 15:45:00', 112000,
 '3/4', 'Mantenimiento preventivo flotilla y cambio de discos',
 'Discos con surcos profundos, rechinido persistente en frenado pesado.',
 'Se aplicó torque especificado por fabricante a birlos.', 'finalizado',
 1200.00, 3000.00, 4200.00, 672.00, 4872.00, 'transferencia', 1),

(3, 'ORD-2026-0003', 2, 2, 3, 4,
 '2026-10-01 10:00:00', '2026-10-02 18:00:00', NULL, 45200,
 '1/2', 'Afinación de 40,000 km y revisión de niveles',
 'Filtros saturados de suciedad. Bujías en buen estado pero buje ligeramente resecado.',
 'En proceso de desensamble de cuerpo de aceleración.', 'en_reparacion',
 650.00, 1780.00, 2430.00, 388.80, 2818.80, 'pendiente', 0),

(4, 'ORD-2026-0004', 5, 6, 2, 4,
 '2026-10-02 08:30:00', '2026-10-03 14:00:00', NULL, 68000,
 '1/4', 'Testigo Check Engine encendido y pérdida de potencia intermitente',
 'Diagnóstico con escáner OBD2 arrojó código P0301 (Falla de encendido cilindro 1).',
 'Se requiere inspección de bobina y bujías.', 'en_diagnostico',
 450.00, 0.00, 450.00, 72.00, 522.00, 'pendiente', 0),

(5, 'ORD-2026-0005', 4, 5, 3, 4,
 '2026-10-02 09:15:00', '2026-10-04 12:00:00', NULL, 94100,
 'Reserva', 'Ruido sordo en baches lado derecho delantero',
 'Pendiente de subir a rampa para inspección de amortiguador y rótula.',
 'Vehículo en cola de espera.', 'pendiente',
 0.00, 0.00, 0.00, 0.00, 0.00, 'pendiente', 0);

-- 7. Detalles de Repuestos para Órdenes
INSERT INTO orden_detalles_repuestos (orden_id, repuesto_id, cantidad, precio_unitario, subtotal) VALUES
(1, 1, 1, 1150.00, 1150.00),
(1, 4, 1, 240.00, 240.00),
(1, 7, 1, 1250.00, 1250.00),
(1, 3, 1, 40.00, 40.00),
(2, 2, 1, 1850.00, 1850.00),
(2, 1, 1, 1150.00, 1150.00),
(3, 4, 1, 240.00, 240.00),
(3, 5, 1, 290.00, 290.00),
(3, 7, 1, 1250.00, 1250.00);

-- 8. Detalles de Mano de Obra para Órdenes
INSERT INTO orden_servicios_mano_obra (orden_id, descripcion, horas, costo_hora, subtotal) VALUES
(1, 'Servicio de afinación mayor y cambio de aceite', 2.0, 250.00, 500.00),
(1, 'Cambio y rectificado de balatas delanteras', 1.0, 300.00, 300.00),
(2, 'Sustitución de discos y balatas de flotilla', 3.0, 400.00, 1200.00),
(3, 'Servicio preventivo afinación 40,000 km', 2.0, 325.00, 650.00),
(4, 'Diagnóstico computarizado escáner OBD2 + prueba en banco', 1.5, 300.00, 450.00);

-- 9. Movimientos de Inventario Iniciales (Kárdex)
INSERT INTO movimientos_inventario (repuesto_id, tipo, cantidad, stock_anterior, stock_nuevo, orden_id, motivo, usuario_id) VALUES
(1, 'entrada', 16, 0, 16, NULL, 'Carga inicial de inventario proveedor Brembo', 1),
(1, 'salida_orden', 1, 16, 15, 1, 'Consumo en Orden ORD-2026-0001', 2),
(1, 'salida_orden', 1, 15, 14, 2, 'Consumo en Orden ORD-2026-0002', 2),
(4, 'entrada', 30, 0, 30, NULL, 'Carga inicial Mann Filter lote A-402', 1),
(4, 'salida_orden', 1, 30, 29, 1, 'Consumo en Orden ORD-2026-0001', 2),
(4, 'salida_orden', 1, 29, 28, 3, 'Consumo en Orden ORD-2026-0003', 3);

-- 10. Auditoría de Operaciones
INSERT INTO auditoria_logs (fecha, usuario_id, usuario_nombre, accion, modulo, registro_id, detalles, ip) VALUES
('2026-09-15 09:30:15', 4, 'Ana Sofía Morales', 'CREACION', 'ORDENES', 'ORD-2026-0001', 'Ingreso de vehículo Jetta MK6 Placa NLX-78-45', '192.168.1.15'),
('2026-09-16 16:20:44', 2, 'Carlos Hernández', 'TRANSACCION', 'ORDENES', 'ORD-2026-0001', 'Cierre y cobro transaccional de orden ORD-2026-0001. Descuento de stock en repuestos.', '192.168.1.20'),
('2026-09-23 15:45:10', 2, 'Carlos Hernández', 'TRANSACCION', 'ORDENES', 'ORD-2026-0002', 'Cierre de orden de flotilla Transit Placa TMX-99-01. Total $4,872.00', '192.168.1.20'),
('2026-10-01 10:02:00', 4, 'Ana Sofía Morales', 'CREACION', 'ORDENES', 'ORD-2026-0003', 'Ingreso de vehículo Toyota Corolla Placa PVZ-32-19', '192.168.1.15'),
('2026-10-02 08:35:00', 4, 'Ana Sofía Morales', 'CREACION', 'ORDENES', 'ORD-2026-0004', 'Ingreso de vehículo Audi A3 Placa GTO-11-22 por Check Engine', '192.168.1.15');
