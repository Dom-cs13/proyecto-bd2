-- ==============================================================================
-- DDL MariaDB · Centro Pediátrico (I4-04 / I4-05)
-- Conforme a AGENTS.md, PLANIFICACION.md (Checklist 7.3 y Sección 3.4) y ADR 0001
-- Motor: MariaDB (InnoDB, UTF-8 MB4)
-- ==============================================================================

-- 1. Catálogo de roles
CREATE TABLE IF NOT EXISTS rol (
  id_rol INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Personal y usuarios del centro pediátrico
CREATE TABLE IF NOT EXISTS usuario (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  id_rol INT NOT NULL,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  correo VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  colegiado VARCHAR(50) NULL,
  especialidad VARCHAR(100) NULL,
  estado BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_usuario_rol
    FOREIGN KEY (id_rol) REFERENCES rol (id_rol) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Pacientes pediátricos (menores de edad)
-- Regla #2 LSP y 3.4 #3: el estado de archivo vive únicamente en historial_clinico.estado
CREATE TABLE IF NOT EXISTS paciente (
  id_paciente INT AUTO_INCREMENT PRIMARY KEY,
  documento VARCHAR(30) UNIQUE NULL,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  sexo VARCHAR(20) NULL,
  grupo_sanguineo VARCHAR(10) NULL,
  telefono VARCHAR(20) NULL,
  correo VARCHAR(150) NULL,
  direccion VARCHAR(200) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tutores legales / Responsables
CREATE TABLE IF NOT EXISTS tutor (
  id_tutor INT AUTO_INCREMENT PRIMARY KEY,
  dpi VARCHAR(20) NOT NULL UNIQUE,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  correo VARCHAR(150) NULL,
  direccion VARCHAR(200) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Relación Paciente - Tutor
-- Checklist 7.3 y ADR 0001: Tutor principal único garantizado por trigger
CREATE TABLE IF NOT EXISTS paciente_tutor (
  id_paciente INT NOT NULL,
  id_tutor INT NOT NULL,
  parentesco VARCHAR(50) NOT NULL,
  es_principal BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id_paciente, id_tutor),
  CONSTRAINT fk_paciente_tutor_paciente
    FOREIGN KEY (id_paciente) REFERENCES paciente (id_paciente) ON DELETE RESTRICT,
  CONSTRAINT fk_paciente_tutor_tutor
    FOREIGN KEY (id_tutor) REFERENCES tutor (id_tutor) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Historial Clínico (Fuente de verdad del estado de archivo)
CREATE TABLE IF NOT EXISTS historial_clinico (
  id_historial INT AUTO_INCREMENT PRIMARY KEY,
  id_paciente INT NOT NULL UNIQUE,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado VARCHAR(10) NOT NULL DEFAULT 'activo',
  fecha_archivo DATETIME NULL,
  motivo_archivo_tipo VARCHAR(20) NULL,
  motivo_archivo_detalle VARCHAR(250) NULL,
  CONSTRAINT ck_historial_estado
    CHECK (estado IN ('activo', 'archivado')),
  CONSTRAINT ck_historial_archivo_consistente
    CHECK (
      (estado = 'activo'
        AND fecha_archivo IS NULL
        AND motivo_archivo_tipo IS NULL
        AND motivo_archivo_detalle IS NULL)
      OR
      (estado = 'archivado'
        AND fecha_archivo IS NOT NULL
        AND motivo_archivo_tipo IN ('traslado', 'fallecimiento', 'administrativo', 'otro')
        AND motivo_archivo_detalle IS NOT NULL
        AND CHAR_LENGTH(TRIM(motivo_archivo_detalle)) > 0)
    ),
  CONSTRAINT fk_historial_paciente
    FOREIGN KEY (id_paciente) REFERENCES paciente (id_paciente) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Citas Pediátricas
-- Sección 3.4 #2: UNIQUE (id_cita, id_paciente)
-- Sección 3.4 #7: UNIQUE (id_usuario, fecha, hora) para evitar doble reserva
CREATE TABLE IF NOT EXISTS cita (
  id_cita INT AUTO_INCREMENT PRIMARY KEY,
  id_paciente INT NOT NULL,
  id_usuario INT NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  motivo VARCHAR(250) NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'programada',
  observaciones VARCHAR(500) NULL,
  CONSTRAINT ck_cita_estado
    CHECK (estado IN ('programada', 'confirmada', 'cancelada', 'completada', 'no_asistio')),
  CONSTRAINT uq_cita_id_paciente
    UNIQUE (id_cita, id_paciente),
  CONSTRAINT uq_cita_usuario_fecha_hora
    UNIQUE (id_usuario, fecha, hora),
  CONSTRAINT fk_cita_paciente
    FOREIGN KEY (id_paciente) REFERENCES paciente (id_paciente) ON DELETE RESTRICT,
  CONSTRAINT fk_cita_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Consultas Pediátricas
-- Sección 3.4 #2: FK compuesta (id_cita, id_paciente) que asegura que pertenezcan al mismo paciente
CREATE TABLE IF NOT EXISTS consulta (
  id_consulta INT AUTO_INCREMENT PRIMARY KEY,
  id_cita INT UNIQUE NULL,
  id_paciente INT NOT NULL,
  id_usuario INT NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  motivo VARCHAR(250) NULL,
  observaciones TEXT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'borrador',
  CONSTRAINT ck_consulta_estado
    CHECK (estado IN ('borrador', 'finalizada', 'anulada')),
  CONSTRAINT fk_consulta_cita_paciente
    FOREIGN KEY (id_cita, id_paciente)
    REFERENCES cita (id_cita, id_paciente) ON DELETE RESTRICT,
  CONSTRAINT fk_consulta_paciente
    FOREIGN KEY (id_paciente) REFERENCES paciente (id_paciente) ON DELETE RESTRICT,
  CONSTRAINT fk_consulta_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Control de Crecimiento y Desarrollo Antropométrico
-- Checklist 7.3: UNIQUE (id_consulta) y CHECK de rangos positivos
CREATE TABLE IF NOT EXISTS control_crecimiento (
  id_control INT AUTO_INCREMENT PRIMARY KEY,
  id_paciente INT NOT NULL,
  id_consulta INT UNIQUE NULL,
  fecha DATE NOT NULL,
  edad_meses INT NOT NULL,
  peso_kg DECIMAL(5,2) NOT NULL,
  talla_cm DECIMAL(5,2) NOT NULL,
  perimetro_cefalico_cm DECIMAL(5,2) NULL,
  imc DECIMAL(5,2) NULL,
  percentil_oms VARCHAR(30) NULL,
  CONSTRAINT ck_control_rangos_positivos
    CHECK (
      edad_meses >= 0
      AND peso_kg > 0
      AND talla_cm > 0
      AND (perimetro_cefalico_cm IS NULL OR perimetro_cefalico_cm > 0)
      AND (imc IS NULL OR imc > 0)
    ),
  CONSTRAINT fk_control_crecimiento_paciente
    FOREIGN KEY (id_paciente) REFERENCES paciente (id_paciente) ON DELETE RESTRICT,
  CONSTRAINT fk_control_crecimiento_consulta
    FOREIGN KEY (id_consulta) REFERENCES consulta (id_consulta) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Catálogo de Vacunas
CREATE TABLE IF NOT EXISTS vacuna (
  id_vacuna INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(150) NOT NULL,
  descripcion VARCHAR(500) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Esquema de Vacunación Oficial (Dosis y edad recomendada)
-- Checklist 7.3: tabla real de esquema
CREATE TABLE IF NOT EXISTS esquema_vacunacion (
  id_esquema INT AUTO_INCREMENT PRIMARY KEY,
  id_vacuna INT NOT NULL,
  numero_dosis INT NOT NULL,
  edad_recomendada_meses INT NOT NULL,
  refuerzo BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_esquema_vacuna_dosis
    UNIQUE (id_vacuna, numero_dosis),
  CONSTRAINT ck_esquema_valores
    CHECK (numero_dosis > 0 AND edad_recomendada_meses >= 0),
  CONSTRAINT fk_esquema_vacuna
    FOREIGN KEY (id_vacuna) REFERENCES vacuna (id_vacuna) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Registro de Vacuna Aplicada al Menor
-- Checklist 7.3: renombrado de esquema_vacunacion a vacuna_aplicada con UNIQUE (id_paciente, id_vacuna, numero_dosis)
CREATE TABLE IF NOT EXISTS vacuna_aplicada (
  id_vacuna_aplicada INT AUTO_INCREMENT PRIMARY KEY,
  id_paciente INT NOT NULL,
  id_vacuna INT NOT NULL,
  numero_dosis INT NOT NULL,
  id_consulta INT NULL,
  id_usuario INT NULL,
  fecha_aplicacion DATE NOT NULL,
  lote VARCHAR(50) NOT NULL,
  reaccion_adversa VARCHAR(500) NULL,
  CONSTRAINT uq_vacuna_aplicada_paciente_dosis
    UNIQUE (id_paciente, id_vacuna, numero_dosis),
  CONSTRAINT ck_vacuna_aplicada_dosis
    CHECK (numero_dosis > 0),
  CONSTRAINT fk_vacuna_aplicada_paciente
    FOREIGN KEY (id_paciente) REFERENCES paciente (id_paciente) ON DELETE RESTRICT,
  CONSTRAINT fk_vacuna_aplicada_vacuna
    FOREIGN KEY (id_vacuna) REFERENCES vacuna (id_vacuna) ON DELETE RESTRICT,
  CONSTRAINT fk_vacuna_aplicada_consulta
    FOREIGN KEY (id_consulta) REFERENCES consulta (id_consulta) ON DELETE RESTRICT,
  CONSTRAINT fk_vacuna_aplicada_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Catálogo de Alergias
CREATE TABLE IF NOT EXISTS alergia (
  id_alergia INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL UNIQUE,
  tipo VARCHAR(50) NULL,
  descripcion VARCHAR(500) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Alergias Registradas por Paciente
-- Checklist 7.3: nivel_severidad con CHECK
CREATE TABLE IF NOT EXISTS paciente_alergia (
  id_paciente INT NOT NULL,
  id_alergia INT NOT NULL,
  nivel_severidad VARCHAR(20) NOT NULL,
  reaccion VARCHAR(500) NULL,
  fecha_deteccion DATE NULL,
  PRIMARY KEY (id_paciente, id_alergia),
  CONSTRAINT ck_paciente_alergia_severidad
    CHECK (nivel_severidad IN ('leve', 'moderada', 'severa', 'anafilaxia')),
  CONSTRAINT fk_paciente_alergia_paciente
    FOREIGN KEY (id_paciente) REFERENCES paciente (id_paciente) ON DELETE RESTRICT,
  CONSTRAINT fk_paciente_alergia_alergia
    FOREIGN KEY (id_alergia) REFERENCES alergia (id_alergia) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Diagnósticos de Consulta Pediátrica
CREATE TABLE IF NOT EXISTS diagnostico (
  id_diagnostico INT AUTO_INCREMENT PRIMARY KEY,
  id_consulta INT NOT NULL,
  codigo_cie10 VARCHAR(20) NULL,
  descripcion VARCHAR(500) NOT NULL,
  observaciones VARCHAR(500) NULL,
  CONSTRAINT fk_diagnostico_consulta
    FOREIGN KEY (id_consulta) REFERENCES consulta (id_consulta) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Tratamientos Pediátricos
-- Sección 3.4 #1: el tratamiento depende del diagnóstico
CREATE TABLE IF NOT EXISTS tratamiento (
  id_tratamiento INT AUTO_INCREMENT PRIMARY KEY,
  id_diagnostico INT NOT NULL,
  descripcion VARCHAR(500) NOT NULL,
  fecha_inicio DATE NULL,
  fecha_fin DATE NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'activo',
  observaciones VARCHAR(500) NULL,
  CONSTRAINT ck_tratamiento_estado
    CHECK (estado IN ('activo', 'completado', 'suspendido', 'cancelado')),
  CONSTRAINT ck_tratamiento_fechas
    CHECK (
      fecha_fin IS NULL
      OR (fecha_inicio IS NOT NULL AND fecha_fin >= fecha_inicio)
    ),
  CONSTRAINT fk_tratamiento_diagnostico
    FOREIGN KEY (id_diagnostico) REFERENCES diagnostico (id_diagnostico) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Recetas Médicas Pediátricas
CREATE TABLE IF NOT EXISTS receta (
  id_receta INT AUTO_INCREMENT PRIMARY KEY,
  id_consulta INT NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  peso_referencia_kg DECIMAL(5,2) NULL,
  indicaciones_generales TEXT NULL,
  CONSTRAINT fk_receta_consulta
    FOREIGN KEY (id_consulta) REFERENCES consulta (id_consulta) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Catálogo de Medicamentos Pediátricos
CREATE TABLE IF NOT EXISTS medicamento (
  id_medicamento INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  presentacion VARCHAR(100) NULL,
  concentracion VARCHAR(100) NULL,
  estado BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Detalle de Medicamentos Prescritos
CREATE TABLE IF NOT EXISTS detalle_receta (
  id_detalle_receta INT AUTO_INCREMENT PRIMARY KEY,
  id_receta INT NOT NULL,
  id_medicamento INT NOT NULL,
  dosis VARCHAR(100) NOT NULL,
  frecuencia VARCHAR(100) NOT NULL,
  duracion VARCHAR(100) NULL,
  cantidad INT NULL,
  indicaciones VARCHAR(500) NULL,
  CONSTRAINT ck_detalle_receta_cantidad
    CHECK (cantidad IS NULL OR cantidad > 0),
  CONSTRAINT fk_detalle_receta_receta
    FOREIGN KEY (id_receta) REFERENCES receta (id_receta) ON DELETE RESTRICT,
  CONSTRAINT fk_detalle_receta_medicamento
    FOREIGN KEY (id_medicamento) REFERENCES medicamento (id_medicamento) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Auditoría de Operaciones Pediátricas
CREATE TABLE IF NOT EXISTS auditoria_pediatrica (
  id_auditoria INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NULL,
  entidad VARCHAR(50) NOT NULL,
  id_registro INT NOT NULL,
  accion VARCHAR(20) NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  datos_anteriores JSON NULL,
  datos_nuevos JSON NULL,
  CONSTRAINT fk_auditoria_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- Triggers para garantizar Tutor Principal Único (Checklist 7.3 y ADR 0001)
-- ==============================================================================

DELIMITER //

DROP TRIGGER IF EXISTS trg_paciente_tutor_principal_bi //
CREATE TRIGGER trg_paciente_tutor_principal_bi
BEFORE INSERT ON paciente_tutor
FOR EACH ROW
BEGIN
  IF NEW.es_principal = 1 THEN
    IF EXISTS (
      SELECT 1 FROM paciente_tutor
      WHERE id_paciente = NEW.id_paciente AND es_principal = 1
    ) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El paciente ya cuenta con un tutor principal activo';
    END IF;
  END IF;
END //

DROP TRIGGER IF EXISTS trg_paciente_tutor_principal_bu //
CREATE TRIGGER trg_paciente_tutor_principal_bu
BEFORE UPDATE ON paciente_tutor
FOR EACH ROW
BEGIN
  IF NEW.es_principal = 1 THEN
    IF EXISTS (
      SELECT 1 FROM paciente_tutor
      WHERE id_paciente = NEW.id_paciente
        AND id_tutor <> NEW.id_tutor
        AND es_principal = 1
    ) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El paciente ya cuenta con un tutor principal activo';
    END IF;
  END IF;
END //

DELIMITER ;
