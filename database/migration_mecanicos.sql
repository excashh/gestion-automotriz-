-- Migración idempotente: Tipos de mecánicos (Generales vs Especializados),
-- áreas de especialidad en servicios y vista de carga/rendimiento de mecánicos.
-- Segura para ejecutar múltiples veces sobre autopro_db.

ALTER TABLE mecanicos
  ALTER COLUMN especialidad TYPE VARCHAR(80);

ALTER TABLE mecanicos
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'general';

ALTER TABLE mecanicos
  ADD COLUMN IF NOT EXISTS descripcion_trabajo TEXT NOT NULL DEFAULT 'Mantenimiento preventivo y correctivo general (apto para cualquier tarea).';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_mecanicos_tipo'
  ) THEN
    ALTER TABLE mecanicos
      ADD CONSTRAINT chk_mecanicos_tipo CHECK (tipo IN ('general', 'especializado'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_mecanicos_tipo ON mecanicos (tipo) WHERE activo;

ALTER TABLE servicios
  ADD COLUMN IF NOT EXISTS area_especialidad VARCHAR(80);

-- Vista resumen de carga operativa y órdenes por mecánico
CREATE OR REPLACE VIEW vw_mecanicos_resumen AS
SELECT m.id,
       m.usuario_id,
       m.nombre,
       m.tipo,
       m.especialidad,
       m.descripcion_trabajo,
       m.telefono,
       m.tarifa_hora,
       m.estatus,
       m.activo,
       COUNT(o.id) FILTER (WHERE o.estado IN ('programada', 'en_revision', 'en_reparacion'))::INTEGER AS ordenes_pendientes,
       COUNT(o.id) FILTER (WHERE o.estado = 'completada')::INTEGER                                    AS ordenes_completadas,
       COUNT(o.id) FILTER (WHERE o.estado = 'entregada')::INTEGER                                     AS ordenes_entregadas,
       COUNT(o.id) FILTER (WHERE o.estado <> 'cancelada')::INTEGER                                    AS total_ordenes
FROM mecanicos m
LEFT JOIN ordenes_trabajo o ON o.mecanico_id = m.id
GROUP BY m.id;

-- Actualizar los 2 mecánicos iniciales como especializados en sus ramas originales
UPDATE mecanicos
SET tipo = 'especializado',
    especialidad = 'Motor y Transmisión',
    descripcion_trabajo = 'Ajuste de motores gasolina y diésel, sincronización de distribución, reparación de transmisiones automáticas, CVT y embragues.',
    tarifa_hora = 280.00
WHERE id = 1;

UPDATE mecanicos
SET tipo = 'especializado',
    especialidad = 'Frenos y Suspensión',
    descripcion_trabajo = 'Sistemas de frenado ABS/EBD, rectificado de discos, balatas cerámicas, dirección electroasistida, amortiguación y alineación.',
    tarifa_hora = 240.00
WHERE id = 2;

-- Insertar plantilla completa con Mecánicos Generales (aptos para cualquier tarea) y Especializados
INSERT INTO mecanicos (id, usuario_id, nombre, tipo, especialidad, descripcion_trabajo, telefono, tarifa_hora, estatus, activo)
VALUES
  (3, NULL, 'Juan Carlos Méndez', 'general',       'Mecánica General Multimarca',        'Apto para cualquier tarea del taller: mantenimiento preventivo y correctivo integral, afinaciones, frenos, fluidos e inspección multipunto.', '555-301122', 210.00, 'disponible', true),
  (4, NULL, 'Fernando Ríos',      'general',       'Mecánica General y Servicio Rápido', 'Apto para cualquier tarea operativa: afinación mayor, cambio de aceite y filtros, revisión general, enfriamiento y soporte multi-bahía.', '555-304455', 200.00, 'disponible', true),
  (5, NULL, 'Alejandro Vega',     'especializado', 'Electrónica y Diagnóstico',          'Diagnóstico computarizado avanzado (OBD-II y osciloscopio), programación de módulos ECU/BCM, redes CAN-Bus, sensores e inyección electrónica.', '555-508899', 320.00, 'disponible', true),
  (6, NULL, 'Sofía Ramírez',      'especializado', 'Sistema Eléctrico e Híbridos',       'Diagnóstico y reparación de alternadores, motores de arranque, arneses eléctricos, cortos circuitos, baterías y sistemas de carga.', '555-607711', 290.00, 'disponible', true),
  (7, NULL, 'Daniel Ortega',      'especializado', 'Climatización y A/C',                'Detección de fugas en sistema climático, compresores, evaporadores, vacío, carga de gas refrigerante y controles electrónicos de A/C.', '555-709933', 250.00, 'disponible', true),
  (8, NULL, 'Héctor Navarro',     'general',       'Mecánica General Preventiva',        'Apto para cualquier tarea mecánica: revisiones generales de seguridad, mantenimiento periódico, bandas, mangueras y preparación de entrega.', '555-802244', 195.00, 'descanso', true)
ON CONFLICT (id) DO UPDATE
SET tipo                = EXCLUDED.tipo,
    especialidad        = EXCLUDED.especialidad,
    descripcion_trabajo = EXCLUDED.descripcion_trabajo,
    telefono            = EXCLUDED.telefono,
    tarifa_hora         = EXCLUDED.tarifa_hora;

SELECT setval('mecanicos_id_seq', COALESCE((SELECT MAX(id) FROM mecanicos), 1));

-- Categorías y servicios especializados adicionales
INSERT INTO categorias (nombre, tipo, activo)
VALUES
  ('Motor y Transmisión', 'servicio', true),
  ('Climatización y Eléctrico', 'servicio', true)
ON CONFLICT (nombre, tipo) DO NOTHING;

SELECT setval('categorias_id_seq', COALESCE((SELECT MAX(id) FROM categorias), 1));

UPDATE servicios SET area_especialidad = NULL                      WHERE codigo = 'SRV-AFIN-01';
UPDATE servicios SET area_especialidad = 'Frenos y Suspensión'     WHERE codigo = 'SRV-FRN-01';
UPDATE servicios SET area_especialidad = 'Electrónica y Diagnóstico' WHERE codigo = 'SRV-SCN-01';

INSERT INTO servicios (categoria_id, codigo, nombre, descripcion, horas_estandar, precio_base, area_especialidad, etapas_evidencia_obligatorias, activo)
VALUES
  (
    (SELECT id FROM categorias WHERE nombre = 'Diagnóstico Electrónico' AND tipo = 'servicio' LIMIT 1),
    'SRV-ELC-01',
    'Diagnóstico y Reparación de Módulo Electrónico / Sensores',
    'Pruebas con osciloscopio, revisión de red CAN-Bus, cuerpo de aceleración e inyección electrónica',
    2.0,
    1150.00,
    'Electrónica y Diagnóstico',
    ARRAY['antes_diagnostico', 'despues_instalacion'],
    true
  ),
  (
    (SELECT id FROM categorias WHERE nombre = 'Motor y Transmisión' AND tipo = 'servicio' LIMIT 1),
    'SRV-MTR-01',
    'Sincronización de Distribución y Diagnóstico de Motor',
    'Revisión de compresión, kit de distribución y puesta a tiempo del motor',
    4.0,
    2200.00,
    'Motor y Transmisión',
    ARRAY['antes_diagnostico', 'pieza_retirada', 'despues_instalacion'],
    true
  ),
  (
    (SELECT id FROM categorias WHERE nombre = 'Climatización y Eléctrico' AND tipo = 'servicio' LIMIT 1),
    'SRV-AC-01',
    'Mantenimiento y Recarga de Aire Acondicionado',
    'Prueba de hermeticidad, vacío y recarga de gas refrigerante R134a',
    1.5,
    850.00,
    'Climatización y A/C',
    '{}',
    true
  ),
  (
    (SELECT id FROM categorias WHERE nombre = 'Climatización y Eléctrico' AND tipo = 'servicio' LIMIT 1),
    'SRV-ALT-01',
    'Reparación de Alternador y Sistema de Carga',
    'Diagnóstico de caída de tensión, regulador, marcha y arneses eléctricos',
    2.0,
    980.00,
    'Sistema Eléctrico e Híbridos',
    '{}',
    true
  )
ON CONFLICT (codigo) DO UPDATE
SET area_especialidad = EXCLUDED.area_especialidad;

SELECT setval('servicios_id_seq', COALESCE((SELECT MAX(id) FROM servicios), 1));

-- Asociar órdenes históricas entregadas que estaban sin mecánico asignado según el tipo de falla
UPDATE ordenes_trabajo
SET mecanico_id = 2
WHERE mecanico_id IS NULL
  AND estado = 'entregada'
  AND (motivo ILIKE '%freno%' OR motivo ILIKE '%balata%');

UPDATE ordenes_trabajo
SET mecanico_id = 1
WHERE mecanico_id IS NULL
  AND estado = 'entregada'
  AND motivo ILIKE '%motor%';

UPDATE ordenes_trabajo
SET mecanico_id = 3
WHERE mecanico_id IS NULL
  AND estado = 'entregada';

-- Si no hay órdenes activas/pendientes en este momento, crear 2 órdenes activas de ejemplo
-- (una de Electrónica con especialista y una de Mantenimiento con mecánico general) para visualizar carga real
DO $$
DECLARE
  v_pendientes INTEGER;
  v_veh1 INTEGER;
  v_veh2 INTEGER;
  v_admin INTEGER;
  v_ord_elec INTEGER;
  v_ord_gen INTEGER;
  v_srv_elec INTEGER;
  v_srv_afin INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_pendientes
  FROM ordenes_trabajo
  WHERE estado IN ('programada', 'en_revision', 'en_reparacion');

  IF v_pendientes = 0 THEN
    SELECT id INTO v_admin FROM usuarios ORDER BY id ASC LIMIT 1;
    SELECT id INTO v_veh1 FROM vehiculos WHERE activo = true ORDER BY id ASC LIMIT 1;
    SELECT id INTO v_veh2 FROM vehiculos WHERE activo = true AND id <> COALESCE(v_veh1, 0) ORDER BY id ASC LIMIT 1;

    IF v_admin IS NOT NULL AND v_veh1 IS NOT NULL THEN
      INSERT INTO ordenes_trabajo (vehiculo_id, mecanico_id, creado_por, estado, bahia, km_entrada, motivo, fecha_estimada)
      VALUES (
        v_veh1,
        5, -- Alejandro Vega (Especializado en Electrónica y Diagnóstico)
        v_admin,
        'en_reparacion',
        'B-03',
        86500,
        'Testigo Check Engine encendido, tironeo en baja y diagnóstico de sensores en módulo ECU',
        CURRENT_DATE + 1
      )
      RETURNING id INTO v_ord_elec;

      SELECT id INTO v_srv_elec FROM servicios WHERE codigo = 'SRV-ELC-01' LIMIT 1;
      IF v_srv_elec IS NOT NULL THEN
        INSERT INTO orden_servicios (orden_id, servicio_id, cantidad, horas, precio_unitario)
        SELECT v_ord_elec, id, 1, horas_estandar, precio_base FROM servicios WHERE id = v_srv_elec;
      END IF;
    END IF;

    IF v_admin IS NOT NULL AND v_veh2 IS NOT NULL THEN
      INSERT INTO ordenes_trabajo (vehiculo_id, mecanico_id, creado_por, estado, bahia, km_entrada, motivo, fecha_estimada)
      VALUES (
        v_veh2,
        3, -- Juan Carlos Méndez (Mecánico General apto para cualquier tarea)
        v_admin,
        'en_revision',
        'B-01',
        47200,
        'Afinación mayor preventiva, revisión general de frenos, niveles y puntos de seguridad',
        CURRENT_DATE + 1
      )
      RETURNING id INTO v_ord_gen;

      SELECT id INTO v_srv_afin FROM servicios WHERE codigo = 'SRV-AFIN-01' LIMIT 1;
      IF v_srv_afin IS NOT NULL THEN
        INSERT INTO orden_servicios (orden_id, servicio_id, cantidad, horas, precio_unitario)
        SELECT v_ord_gen, id, 1, horas_estandar, precio_base FROM servicios WHERE id = v_srv_afin;
      END IF;
    END IF;
  END IF;
END $$;

-- Sincronizar estatus ('ocupado' vs 'disponible') para mecánicos activos que no estén en descanso
UPDATE mecanicos m
SET estatus = CASE
  WHEN EXISTS (
    SELECT 1 FROM ordenes_trabajo o
    WHERE o.mecanico_id = m.id
      AND o.estado IN ('programada', 'en_revision', 'en_reparacion')
  ) THEN 'ocupado'
  ELSE 'disponible'
END
WHERE m.activo = true AND m.estatus <> 'descanso';
