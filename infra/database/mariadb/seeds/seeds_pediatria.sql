-- ==============================================================================
-- Seeds de Datos Pediátricos · Centro Pediátrico (I4-09)
-- Motor: MariaDB
-- Contraseña unificada para usuarios demo: Pediatria2026!
-- ==============================================================================

-- 1. Roles
INSERT IGNORE INTO rol (id_rol, nombre) VALUES
  (1, 'pediatra'),
  (2, 'enfermeria'),
  (3, 'recepcion');

-- 2. Usuarios del sistema pediátrico
-- SHA2('Pediatria2026!', 256) = 'a90a2a537cf463cf4766b1ba1bb924d4554b73b50c1f513f5088ce833c89fbf0'
INSERT IGNORE INTO usuario (id_usuario, id_rol, nombres, apellidos, correo, password_hash, colegiado, especialidad, estado) VALUES
  (1, 1, 'Ana', 'Perez', 'pediatra.demo@example.invalid', SHA2('Pediatria2026!', 256), 'COL-PED-8812', 'Pediatría General y Neonatología', 1),
  (2, 2, 'Elena', 'Castro', 'enfermeria.demo@example.invalid', SHA2('Pediatria2026!', 256), 'COL-ENF-4410', 'Enfermería Pediátrica', 1),
  (3, 3, 'Marco', 'Ruiz', 'recepcion.demo@example.invalid', SHA2('Pediatria2026!', 256), NULL, 'Admisión Pediátrica', 1);

-- 3. Catálogo de vacunas
INSERT IGNORE INTO vacuna (id_vacuna, codigo, nombre, descripcion) VALUES
  (1, 'BCG', 'BCG (Bacilo de Calmette-Guérin)', 'Protección contra formas graves de tuberculosis infantil'),
  (2, 'HEPB', 'Hepatitis B Pediátrica', 'Inmunización contra el virus de la hepatitis B al nacer'),
  (3, 'PENTA', 'Pentavalente (DTP-HB-Hib)', 'Protección contra difteria, tétanos, tos ferina, hepatitis B e infecciones por Hib'),
  (4, 'POLIO', 'Polio Inactivada / Oral (IPV/bOPV)', 'Inmunización para erradicación de la poliomielitis'),
  (5, 'ROTA', 'Rotavirus Humano', 'Prevención de diarreas severas por rotavirus en lactantes'),
  (6, 'NEUMO', 'Neumococo Conjugado 13-valente', 'Prevención de neumonías, meningitis y otitis media por neumococo'),
  (7, 'SPR', 'SPR (Sarampión, Paperas, Rubéola)', 'Inmunización combinada para infantes a partir de los 12 meses');

-- 4. Esquema oficial de vacunación por dosis y edad
INSERT IGNORE INTO esquema_vacunacion (id_vacuna, numero_dosis, edad_recomendada_meses, refuerzo) VALUES
  (1, 1, 0, 0),
  (2, 1, 0, 0),
  (3, 1, 2, 0),
  (3, 2, 4, 0),
  (3, 3, 6, 0),
  (4, 1, 2, 0),
  (4, 2, 4, 0),
  (4, 3, 6, 0),
  (5, 1, 2, 0),
  (5, 2, 4, 0),
  (6, 1, 2, 0),
  (6, 2, 4, 0),
  (6, 3, 12, 1),
  (7, 1, 12, 0),
  (7, 2, 18, 1);

-- 5. Catálogo de medicamentos pediátricos
INSERT IGNORE INTO medicamento (id_medicamento, nombre, presentacion, concentracion, estado) VALUES
  (1, 'Amoxicilina suspensión oral', 'Frasco 100 ml', '250 mg / 5 ml', 1),
  (2, 'Paracetamol solución gotas', 'Frasco gotero 30 ml', '100 mg / ml', 1),
  (3, 'Ibuprofeno suspensión oral', 'Frasco 120 ml', '100 mg / 5 ml', 1),
  (4, 'Sales de rehidratación oral (SRO)', 'Sobre para 1 litro', 'Fórmula baja osmolaridad OMS', 1),
  (5, 'Salbutamol solución para nebulizar', 'Frasco 20 ml', '5 mg / ml (0.5%)', 1),
  (6, 'Cetirizina jarabe', 'Frasco 60 ml', '5 mg / 5 ml', 1);

-- 6. Catálogo de alergias
INSERT IGNORE INTO alergia (id_alergia, nombre, tipo, descripcion) VALUES
  (1, 'Penicilinas y betalactámicos', 'Medicamentosa', 'Hipersensibilidad a amoxicilina, ampicilina y derivados'),
  (2, 'Proteína de leche de vaca (APLV)', 'Alimentaria', 'Reacción alérgica mediada o no por IgE a lácteos'),
  (3, 'Proteína de huevo', 'Alimentaria', 'Reacción de hipersensibilidad a la albúmina de huevo'),
  (4, 'Maní y frutos secos', 'Alimentaria', 'Riesgo alto de anafilaxia');

-- 7. Tutores legales
INSERT IGNORE INTO tutor (id_tutor, dpi, nombres, apellidos, telefono, correo, direccion) VALUES
  (1, '2093847580101', 'Carlos', 'Morales', '555-1234', 'carlos.morales@example.invalid', 'Avenida Reforma 4-50, Zona 9'),
  (2, '1982736450101', 'Lucia', 'Gomez', '555-9876', 'lucia.gomez@example.invalid', 'Calle Real 12-34, Zona 10'),
  (3, '1873645290101', 'Elena', 'Perez', '555-4321', 'elena.perez@example.invalid', 'Boulevard Vista Hermosa 7-20, Zona 15'),
  (4, '1765432190101', 'Jorge', 'Diaz', '555-8765', 'jorge.diaz@example.invalid', 'Colonia El Maestro 2-15, Zona 15'),
  (5, '1654321980101', 'Marta', 'Castillo', '555-6789', 'marta.castillo@example.invalid', 'Diagonal 6 10-50, Zona 10');

-- 8. Menores de edad (pacientes)
INSERT IGNORE INTO paciente (id_paciente, documento, nombres, apellidos, fecha_nacimiento, sexo, grupo_sanguineo, telefono, correo, direccion) VALUES
  (1, 'CUI-30012020-01', 'Mateo', 'Morales', '2020-05-15', 'M', 'O+', '555-1234', 'tutor.morales@example.invalid', 'Avenida Reforma 4-50, Zona 9'),
  (2, 'CUI-20032022-02', 'Sofia', 'Gomez', '2022-03-20', 'F', 'A+', '555-9876', 'tutor.gomez@example.invalid', 'Calle Real 12-34, Zona 10'),
  (3, 'CUI-15082023-03', 'Lucas', 'Perez', '2023-08-15', 'M', 'B+', '555-4321', 'tutor.perez@example.invalid', 'Boulevard Vista Hermosa 7-20, Zona 15'),
  (4, 'CUI-04102018-04', 'Valentina', 'Diaz', '2018-10-04', 'F', 'O-', '555-8765', 'tutor.diaz@example.invalid', 'Colonia El Maestro 2-15, Zona 15'),
  (5, 'CUI-11022021-05', 'Daniel', 'Castillo', '2021-02-11', 'M', 'A-', '555-6789', 'tutor.castillo@example.invalid', 'Diagonal 6 10-50, Zona 10');

-- 9. Asociación Paciente - Tutor (Tutor principal único)
INSERT IGNORE INTO paciente_tutor (id_paciente, id_tutor, parentesco, es_principal) VALUES
  (1, 1, 'Padre', 1),
  (2, 2, 'Madre', 1),
  (3, 3, 'Madre', 1),
  (4, 4, 'Padre', 1),
  (5, 5, 'Madre', 1);

-- 10. Historiales clínicos (4 activos y 1 archivado)
INSERT IGNORE INTO historial_clinico (id_historial, id_paciente, fecha_creacion, estado, fecha_archivo, motivo_archivo_tipo, motivo_archivo_detalle) VALUES
  (1, 1, '2026-01-10 08:30:00', 'activo', NULL, NULL, NULL),
  (2, 2, '2026-01-15 09:15:00', 'activo', NULL, NULL, NULL),
  (3, 3, '2026-02-01 10:00:00', 'activo', NULL, NULL, NULL),
  (4, 4, '2026-02-20 11:30:00', 'activo', NULL, NULL, NULL),
  (5, 5, '2026-01-05 14:00:00', 'archivado', '2026-03-01 16:00:00', 'traslado', 'Traslado de expediente a clínica de provincia por cambio de domicilio');

-- 11. Alergias del paciente
INSERT IGNORE INTO paciente_alergia (id_paciente, id_alergia, nivel_severidad, reaccion, fecha_deteccion) VALUES
  (4, 1, 'severa', 'Erupción cutánea difusa y dificultad respiratoria leve tras toma de amoxicilina', '2022-04-10');

-- 12. Controles de crecimiento
INSERT IGNORE INTO control_crecimiento (id_control, id_paciente, id_consulta, fecha, edad_meses, peso_kg, talla_cm, perimetro_cefalico_cm, imc, percentil_oms) VALUES
  (1, 1, NULL, '2026-03-01', 45, 16.50, 102.00, 50.20, 15.86, 'P50'),
  (2, 2, NULL, '2026-03-10', 23, 12.00, 85.50, 48.00, 16.42, 'P50'),
  (3, 3, NULL, '2026-03-15', 7, 8.40, 68.00, 43.50, 18.17, 'P75');

-- 13. Vacunas aplicadas
INSERT IGNORE INTO vacuna_aplicada (id_vacuna_aplicada, id_paciente, id_vacuna, numero_dosis, id_consulta, id_usuario, fecha_aplicacion, lote, reaccion_adversa) VALUES
  (1, 1, 1, 1, NULL, 2, '2020-05-16', 'BCG-2020-A1', NULL),
  (2, 1, 3, 1, NULL, 2, '2020-07-15', 'PEN-2020-B2', 'Fiebre leve autolimitada'),
  (3, 2, 1, 1, NULL, 2, '2022-03-21', 'BCG-2022-01', NULL),
  (4, 3, 1, 1, NULL, 2, '2023-08-16', 'BCG-2023-99', NULL);

-- 14. Cita, Consulta, Diagnóstico, Tratamiento y Receta
INSERT IGNORE INTO cita (id_cita, id_paciente, id_usuario, fecha, hora, motivo, estado, observaciones) VALUES
  (1, 1, 1, '2026-03-01', '09:00:00', 'Fiebre y dolor de garganta', 'completada', 'Atención realizada a tiempo');

INSERT IGNORE INTO consulta (id_consulta, id_cita, id_paciente, id_usuario, fecha, motivo, observaciones, estado) VALUES
  (1, 1, 1, 1, '2026-03-01 09:10:00', 'Fiebre de 38.5C y odinofagia de 24 horas', 'Orofaringe hiperémica con placas blanquecinas en amígdalas', 'finalizada');

INSERT IGNORE INTO diagnostico (id_diagnostico, id_consulta, codigo_cie10, descripcion, observaciones) VALUES
  (1, 1, 'J03.0', 'Faringitis estreptocócica aguda', 'Confirmada por clínica y criterios de Centor');

INSERT IGNORE INTO tratamiento (id_tratamiento, id_diagnostico, descripcion, fecha_inicio, fecha_fin, estado, observaciones) VALUES
  (1, 1, 'Antibioticoterapia oral por 10 días y control térmico', '2026-03-01', '2026-03-11', 'completado', 'Buena tolerancia al tratamiento');

INSERT IGNORE INTO receta (id_receta, id_consulta, fecha, peso_referencia_kg, indicaciones_generales) VALUES
  (1, 1, '2026-03-01 09:25:00', 16.50, 'Tomar con alimentos. Ofrecer abundantes líquidos fríos.');

INSERT IGNORE INTO detalle_receta (id_detalle_receta, id_receta, id_medicamento, dosis, frecuencia, duracion, cantidad, indicaciones) VALUES
  (1, 1, 1, '7.5 ml (250mg)', 'Cada 8 horas', '10 días', 1, 'Completar los 10 días aunque no haya fiebre'),
  (2, 1, 2, '15 gotas (150mg)', 'Cada 6 horas si fiebre > 38C', '3 días', 1, 'Solo en caso de temperatura axilar mayor a 38 grados');
