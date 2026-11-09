-- ==============================================================================
-- Índices de Rendimiento y Llaves Foráneas · Centro Pediátrico (I4-05)
-- Motor: MariaDB
-- ==============================================================================

-- Búsquedas de pacientes y relaciones
CREATE INDEX IF NOT EXISTS ix_usuario_rol ON usuario (id_rol);
CREATE INDEX IF NOT EXISTS ix_paciente_apellidos_nombres ON paciente (apellidos, nombres);
CREATE INDEX IF NOT EXISTS ix_paciente_tutor_tutor ON paciente_tutor (id_tutor);

-- Citas y consultas
CREATE INDEX IF NOT EXISTS ix_cita_paciente_fecha ON cita (id_paciente, fecha);
CREATE INDEX IF NOT EXISTS ix_consulta_paciente_fecha ON consulta (id_paciente, fecha);
CREATE INDEX IF NOT EXISTS ix_consulta_usuario_fecha ON consulta (id_usuario, fecha);

-- Crecimiento y desarrollo infantil
CREATE INDEX IF NOT EXISTS ix_control_paciente_fecha ON control_crecimiento (id_paciente, fecha);

-- Inmunizaciones
CREATE INDEX IF NOT EXISTS ix_vacuna_aplicada_paciente ON vacuna_aplicada (id_paciente, fecha_aplicacion);
CREATE INDEX IF NOT EXISTS ix_vacuna_aplicada_vacuna ON vacuna_aplicada (id_vacuna);

-- Diagnósticos, tratamientos y recetas
CREATE INDEX IF NOT EXISTS ix_diagnostico_consulta ON diagnostico (id_consulta);
CREATE INDEX IF NOT EXISTS ix_tratamiento_diagnostico ON tratamiento (id_diagnostico);
CREATE INDEX IF NOT EXISTS ix_receta_consulta ON receta (id_consulta);
CREATE INDEX IF NOT EXISTS ix_detalle_receta_receta ON detalle_receta (id_receta);
CREATE INDEX IF NOT EXISTS ix_detalle_receta_medicamento ON detalle_receta (id_medicamento);

-- Alergias y auditoría
CREATE INDEX IF NOT EXISTS ix_paciente_alergia_alergia ON paciente_alergia (id_alergia);
CREATE INDEX IF NOT EXISTS ix_auditoria_usuario_fecha ON auditoria_pediatrica (id_usuario, fecha);
