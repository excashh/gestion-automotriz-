
-- Password para todos los usuarios de prueba: Password123!


-- 1. ROLES
INSERT INTO roles (id, nombre, descripcion) VALUES
(1, 'admin', 'Acceso total al sistema y reportes'),
(2, 'recepcion', 'Atención a clientes, creación de citas y cobranza'),
(3, 'mecanico', 'Gestión de reparaciones y diagnósticos')
ON CONFLICT (id) DO NOTHING;

-- 2. USUARIOS
INSERT INTO usuarios (id, rol_id, nombre, email, password_hash, activo) VALUES
(1, 1, 'Carlos Administrador', 'admin@autopro.com', '$2a$10$oqPfiMrnZOgT80EsTaGVne/oVsIBl2ywEyOQyBdN0wOYPwRgD4fsm', true),
(2, 2, 'Laura Recepción', 'recepcion@autopro.com', '$2a$10$oqPfiMrnZOgT80EsTaGVne/oVsIBl2ywEyOQyBdN0wOYPwRgD4fsm', true),
(3, 3, 'Miguel Mecánico', 'mecanico@autopro.com', '$2a$10$oqPfiMrnZOgT80EsTaGVne/oVsIBl2ywEyOQyBdN0wOYPwRgD4fsm', true)
ON CONFLICT (id) DO NOTHING;

-- 3. MECÁNICOS (Tipo 1: Generales aptos para cualquier tarea | Tipo 2: Especializados por área automotriz)
INSERT INTO mecanicos (id, usuario_id, nombre, tipo, especialidad, descripcion_trabajo, telefono, tarifa_hora, estatus, activo) VALUES
(1, 3,    'Miguel Hernández',   'especializado', 'Motor y Transmisión',                 'Ajuste de motores gasolina y diésel, sincronización de distribución, reparación de transmisiones automáticas, CVT y embragues.', '555-102030', 280.00, 'disponible', true),
(2, NULL, 'Roberto Gómez',      'especializado', 'Frenos y Suspensión',                 'Sistemas de frenado ABS/EBD, rectificado de discos, balatas cerámicas, dirección electroasistida, amortiguación y alineación.', '555-405060', 240.00, 'disponible', true),
(3, NULL, 'Juan Carlos Méndez', 'general',       'Mecánica General Multimarca',         'Apto para cualquier tarea del taller: mantenimiento preventivo y correctivo integral, afinaciones, frenos, fluidos e inspección multipunto.', '555-301122', 210.00, 'disponible', true),
(4, NULL, 'Fernando Ríos',      'general',       'Mecánica General y Servicio Rápido',  'Apto para cualquier tarea operativa: afinación mayor, cambio de aceite y filtros, revisión general, enfriamiento y soporte multi-bahía.', '555-304455', 200.00, 'disponible', true),
(5, NULL, 'Alejandro Vega',     'especializado', 'Electrónica y Diagnóstico',           'Diagnóstico computarizado avanzado (OBD-II y osciloscopio), programación de módulos ECU/BCM, redes CAN-Bus, sensores e inyección electrónica.', '555-508899', 320.00, 'disponible', true),
(6, NULL, 'Sofía Ramírez',      'especializado', 'Sistema Eléctrico e Híbridos',        'Diagnóstico y reparación de alternadores, motores de arranque, arneses eléctricos, cortos circuitos, baterías y sistemas de carga.', '555-607711', 290.00, 'disponible', true),
(7, NULL, 'Daniel Ortega',      'especializado', 'Climatización y A/C',                 'Detección de fugas en sistema climático, compresores, evaporadores, vacío, carga de gas refrigerante y controles electrónicos de A/C.', '555-709933', 250.00, 'disponible', true),
(8, NULL, 'Héctor Navarro',     'general',       'Mecánica General Preventiva',         'Apto para cualquier tarea mecánica: revisiones generales de seguridad, mantenimiento periódico, bandas, mangueras y preparación de entrega.', '555-802244', 195.00, 'descanso', true)
ON CONFLICT (id) DO NOTHING;

-- 4. CLIENTES
INSERT INTO clientes (id, nombre, telefono, email, direccion, rfc, activo) VALUES
(1, 'Alejandro Morales', '555-778899', 'amorales@gmail.com', 'Av. Siempre Viva 123, Col. Centro', 'MORA850101XYZ', true),
(2, 'Beatriz Sánchez', '555-223344', 'bsanchez@yahoo.com', 'Calle Pino Suárez 45, Col. Juárez', 'SANB900512ABC', true),
(3, 'Transportes del Norte S.A.', '555-998877', 'contacto@transnorte.com', 'Parque Industrial Nave 4', 'TNO100203H12', true)
ON CONFLICT (id) DO NOTHING;

-- 5. VEHÍCULOS
INSERT INTO vehiculos (id, cliente_id, placas, vin, marca, modelo, anio, color, kilometraje, motor, transmision, combustible, activo) VALUES
(1, 1, 'ABC-123-A', '3VW2K7AJ9FM123456', 'Volkswagen', 'Jetta', 2018, 'Blanco', 85000, '2.0L TSI', 'Automática', 'Gasolina', true),
(2, 2, 'XYZ-987-B', '1HGCR2F83HA654321', 'Honda', 'Civic', 2020, 'Gris Grafito', 45000, '1.5L Turbo', 'CVT', 'Gasolina', true),
(3, 3, 'TRN-555-C', '3C6UR5FL9JG789012', 'RAM', '4000', 2019, 'Blanco', 142000, '6.7L Cummins', 'Estándar', 'Diésel', true)
ON CONFLICT (id) DO NOTHING;

-- 6. CATEGORÍAS
INSERT INTO categorias (id, nombre, tipo, activo) VALUES
(1, 'Afinación y Mantenimiento', 'servicio', true),
(2, 'Frenos', 'servicio', true),
(3, 'Diagnóstico Electrónico', 'servicio', true),
(4, 'Filtros y Lubricantes', 'refaccion', true),
(5, 'Balatas y Discos', 'refaccion', true),
(6, 'Bujías e Ignición', 'refaccion', true),
(7, 'Motor y Transmisión', 'servicio', true),
(8, 'Climatización y Eléctrico', 'servicio', true)
ON CONFLICT (id) DO NOTHING;

-- 7. SERVICIOS (MANO DE OBRA)
INSERT INTO servicios (id, categoria_id, codigo, nombre, descripcion, horas_estandar, precio_base, area_especialidad, etapas_evidencia_obligatorias, activo) VALUES
(1, 1, 'SRV-AFIN-01', 'Afinación Mayor 4 Cilindros', 'Cambio de bujías, filtros, aceite y lavado de inyectores', 2.5, 950.00, NULL, '{}', true),
(2, 2, 'SRV-FRN-01', 'Cambio de Balatas Delanteras', 'Reemplazo y rectificación básica de discos delanteros', 1.5, 600.00, 'Frenos y Suspensión', ARRAY['antes_diagnostico', 'despues_instalacion'], true),
(3, 3, 'SRV-SCN-01', 'Escaneo y Diagnóstico por Computadora', 'Lectura de códigos OBD-II, sensores y diagnóstico electrónico', 0.8, 400.00, 'Electrónica y Diagnóstico', '{}', true),
(4, 3, 'SRV-ELC-01', 'Diagnóstico y Reparación de Módulo Electrónico / Sensores', 'Pruebas con osciloscopio, revisión de red CAN-Bus, cuerpo de aceleración e inyección electrónica', 2.0, 1150.00, 'Electrónica y Diagnóstico', ARRAY['antes_diagnostico', 'despues_instalacion'], true),
(5, 7, 'SRV-MTR-01', 'Sincronización de Distribución y Diagnóstico de Motor', 'Revisión de compresión, kit de distribución y puesta a tiempo del motor', 4.0, 2200.00, 'Motor y Transmisión', ARRAY['antes_diagnostico', 'pieza_retirada', 'despues_instalacion'], true),
(6, 8, 'SRV-AC-01',  'Mantenimiento y Recarga de Aire Acondicionado', 'Prueba de hermeticidad, vacío y recarga de gas refrigerante R134a', 1.5, 850.00, 'Climatización y A/C', '{}', true),
(7, 8, 'SRV-ALT-01', 'Reparación de Alternador y Sistema de Carga', 'Diagnóstico de caída de tensión, regulador, marcha y arneses eléctricos', 2.0, 980.00, 'Sistema Eléctrico e Híbridos', '{}', true)
ON CONFLICT (id) DO NOTHING;

-- 8. REFACCIONES (INVENTARIO)
INSERT INTO refacciones (id, categoria_id, sku, nombre, marca, costo, precio_publico, stock, stock_minimo, activo) VALUES
(1, 4, 'REF-ACE-5W30', 'Aceite Sintético 5W-30 (Garrafa 5L)', 'Castrol', 480.00, 750.00, 15, 5, true),
(2, 4, 'REF-FLT-AC01', 'Filtro de Aceite Universal Jetta', 'Fram', 75.00, 150.00, 8, 4, true),
(3, 5, 'REF-BAL-DL01', 'Juego de Balatas Delanteras Cerámicas', 'Brembo', 550.00, 980.00, 3, 5, true),
(4, 6, 'REF-BUJ-IRID', 'Bujía de Iridio (Pieza)', 'NGK', 95.00, 190.00, 24, 8, true)
ON CONFLICT (id) DO NOTHING;

-- 9. AJUSTAR SECUENCIAS
SELECT setval('roles_id_seq', COALESCE((SELECT MAX(id) FROM roles), 1));
SELECT setval('usuarios_id_seq', COALESCE((SELECT MAX(id) FROM usuarios), 1));
SELECT setval('mecanicos_id_seq', COALESCE((SELECT MAX(id) FROM mecanicos), 1));
SELECT setval('clientes_id_seq', COALESCE((SELECT MAX(id) FROM clientes), 1));
SELECT setval('vehiculos_id_seq', COALESCE((SELECT MAX(id) FROM vehiculos), 1));
SELECT setval('categorias_id_seq', COALESCE((SELECT MAX(id) FROM categorias), 1));
SELECT setval('servicios_id_seq', COALESCE((SELECT MAX(id) FROM servicios), 1));
SELECT setval('refacciones_id_seq', COALESCE((SELECT MAX(id) FROM refacciones), 1));
