-- Propuesta I2-04/I2-05: modelo relacional de Odontologia para PostgreSQL/Supabase.
-- Crear solamente en una base vacia, tras aprobacion del equipo. No es una migracion.
-- No ejecutar en Supabase desde esta sesion.
-- Los estados de cita, consulta y tratamiento son provisionales y requieren validacion.
BEGIN;

CREATE TABLE public.rol (
  id_rol integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre varchar(50) NOT NULL UNIQUE
);

CREATE TABLE public.usuario (
  id_usuario integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_rol integer NOT NULL,
  nombres varchar(100) NOT NULL,
  apellidos varchar(100) NOT NULL,
  correo varchar(150) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  estado boolean NOT NULL DEFAULT true,
  CONSTRAINT fk_usuario_rol
    FOREIGN KEY (id_rol) REFERENCES public.rol (id_rol) ON DELETE RESTRICT
);

CREATE TABLE public.paciente (
  id_paciente integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombres varchar(100) NOT NULL,
  apellidos varchar(100) NOT NULL,
  fecha_nacimiento date NOT NULL,
  sexo varchar(20),
  telefono varchar(20),
  correo varchar(150),
  direccion varchar(200)
);

CREATE TABLE public.responsable_legal (
  id_responsable integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dpi varchar(20) UNIQUE,
  nombres varchar(100) NOT NULL,
  apellidos varchar(100) NOT NULL,
  telefono varchar(20),
  correo varchar(150),
  direccion varchar(200)
);

CREATE TABLE public.paciente_responsable (
  id_paciente integer NOT NULL,
  id_responsable integer NOT NULL,
  parentesco varchar(50) NOT NULL,
  es_principal boolean NOT NULL DEFAULT false,
  CONSTRAINT pk_paciente_responsable
    PRIMARY KEY (id_paciente, id_responsable),
  CONSTRAINT fk_paciente_responsable_paciente
    FOREIGN KEY (id_paciente) REFERENCES public.paciente (id_paciente) ON DELETE RESTRICT,
  CONSTRAINT fk_paciente_responsable_responsable
    FOREIGN KEY (id_responsable) REFERENCES public.responsable_legal (id_responsable) ON DELETE RESTRICT
);

CREATE TABLE public.historial_clinico (
  id_historial integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_paciente integer NOT NULL UNIQUE,
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  estado varchar(10) NOT NULL DEFAULT 'activo',
  fecha_archivo timestamptz,
  motivo_archivo_tipo varchar(20),
  motivo_archivo_detalle varchar(250),
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
        AND motivo_archivo_tipo IS NOT NULL
        AND motivo_archivo_tipo IN ('traslado', 'fallecimiento', 'administrativo', 'otro')
        AND motivo_archivo_detalle IS NOT NULL
        AND length(btrim(motivo_archivo_detalle)) > 0)
    ),
  CONSTRAINT fk_historial_paciente
    FOREIGN KEY (id_paciente) REFERENCES public.paciente (id_paciente) ON DELETE RESTRICT
);

CREATE TABLE public.cita (
  id_cita integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_paciente integer NOT NULL,
  id_usuario integer NOT NULL,
  fecha date NOT NULL,
  hora time without time zone NOT NULL,
  motivo varchar(250),
  estado varchar(30) NOT NULL DEFAULT 'programada',
  observaciones varchar(500),
  CONSTRAINT ck_cita_estado
    CHECK (estado IN ('programada', 'confirmada', 'cancelada', 'completada', 'no_asistio')),
  CONSTRAINT uq_cita_usuario_fecha_hora
    UNIQUE (id_usuario, fecha, hora),
  CONSTRAINT uq_cita_id_paciente
    UNIQUE (id_cita, id_paciente),
  CONSTRAINT fk_cita_paciente
    FOREIGN KEY (id_paciente) REFERENCES public.paciente (id_paciente) ON DELETE RESTRICT,
  CONSTRAINT fk_cita_usuario
    FOREIGN KEY (id_usuario) REFERENCES public.usuario (id_usuario) ON DELETE RESTRICT
);

CREATE TABLE public.aseguradora (
  id_aseguradora integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre varchar(150) NOT NULL UNIQUE
);

CREATE TABLE public.poliza_seguro (
  id_poliza integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_aseguradora integer NOT NULL,
  numero_poliza varchar(100) NOT NULL,
  porcentaje_cobertura numeric(5, 2) NOT NULL,
  fecha_inicio date NOT NULL,
  fecha_vencimiento date NOT NULL,
  CONSTRAINT uq_poliza_aseguradora_numero
    UNIQUE (id_aseguradora, numero_poliza),
  CONSTRAINT ck_poliza_porcentaje
    CHECK (porcentaje_cobertura BETWEEN 0 AND 100),
  CONSTRAINT ck_poliza_fechas
    CHECK (fecha_vencimiento >= fecha_inicio),
  CONSTRAINT fk_poliza_aseguradora
    FOREIGN KEY (id_aseguradora) REFERENCES public.aseguradora (id_aseguradora) ON DELETE RESTRICT
);

CREATE TABLE public.consulta (
  id_consulta integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_cita integer UNIQUE,
  id_paciente integer NOT NULL,
  id_usuario integer NOT NULL,
  id_poliza integer,
  fecha timestamptz NOT NULL DEFAULT now(),
  motivo varchar(250),
  observaciones text,
  estado varchar(20) NOT NULL DEFAULT 'borrador',
  fecha_actualizacion timestamptz,
  fecha_finalizacion timestamptz,
  CONSTRAINT ck_consulta_estado
    CHECK (estado IN ('borrador', 'finalizada', 'anulada')),
  CONSTRAINT ck_consulta_fechas
    CHECK (fecha_finalizacion IS NULL OR fecha_finalizacion >= fecha),
  CONSTRAINT fk_consulta_cita_paciente
    FOREIGN KEY (id_cita, id_paciente)
    REFERENCES public.cita (id_cita, id_paciente) ON DELETE RESTRICT,
  CONSTRAINT fk_consulta_paciente
    FOREIGN KEY (id_paciente) REFERENCES public.paciente (id_paciente) ON DELETE RESTRICT,
  CONSTRAINT fk_consulta_usuario
    FOREIGN KEY (id_usuario) REFERENCES public.usuario (id_usuario) ON DELETE RESTRICT,
  CONSTRAINT fk_consulta_poliza
    FOREIGN KEY (id_poliza) REFERENCES public.poliza_seguro (id_poliza) ON DELETE RESTRICT
);

CREATE TABLE public.diagnostico (
  id_diagnostico integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_consulta integer NOT NULL,
  descripcion varchar(500) NOT NULL,
  observaciones varchar(500),
  CONSTRAINT fk_diagnostico_consulta
    FOREIGN KEY (id_consulta) REFERENCES public.consulta (id_consulta) ON DELETE RESTRICT
);

CREATE TABLE public.tratamiento (
  id_tratamiento integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_diagnostico integer NOT NULL,
  descripcion varchar(500) NOT NULL,
  fecha_inicio date,
  fecha_fin date,
  estado varchar(30) NOT NULL DEFAULT 'activo',
  observaciones varchar(500),
  CONSTRAINT ck_tratamiento_estado
    CHECK (estado IN ('activo', 'completado', 'suspendido', 'cancelado')),
  CONSTRAINT ck_tratamiento_fechas
    CHECK (
      fecha_fin IS NULL
      OR (fecha_inicio IS NOT NULL AND fecha_fin >= fecha_inicio)
    ),
  CONSTRAINT fk_tratamiento_diagnostico
    FOREIGN KEY (id_diagnostico) REFERENCES public.diagnostico (id_diagnostico) ON DELETE RESTRICT
);

CREATE TABLE public.receta (
  id_receta integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_consulta integer NOT NULL,
  fecha timestamptz NOT NULL DEFAULT now(),
  indicaciones_generales text,
  CONSTRAINT fk_receta_consulta
    FOREIGN KEY (id_consulta) REFERENCES public.consulta (id_consulta) ON DELETE RESTRICT
);

CREATE TABLE public.medicamento (
  id_medicamento integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre varchar(150) NOT NULL,
  presentacion varchar(100),
  estado boolean NOT NULL DEFAULT true
);

CREATE TABLE public.detalle_receta (
  id_detalle_receta integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_receta integer NOT NULL,
  id_medicamento integer NOT NULL,
  dosis varchar(100) NOT NULL,
  frecuencia varchar(100) NOT NULL,
  duracion varchar(100),
  cantidad integer,
  indicaciones varchar(500),
  CONSTRAINT ck_detalle_receta_cantidad
    CHECK (cantidad IS NULL OR cantidad > 0),
  CONSTRAINT fk_detalle_receta_receta
    FOREIGN KEY (id_receta) REFERENCES public.receta (id_receta) ON DELETE RESTRICT,
  CONSTRAINT fk_detalle_receta_medicamento
    FOREIGN KEY (id_medicamento) REFERENCES public.medicamento (id_medicamento) ON DELETE RESTRICT
);

CREATE TABLE public.servicio_odontologico (
  id_servicio integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre varchar(150) NOT NULL,
  descripcion varchar(500),
  precio_base numeric(10, 2),
  estado boolean NOT NULL DEFAULT true,
  CONSTRAINT ck_servicio_precio_base
    CHECK (precio_base IS NULL OR precio_base >= 0)
);

CREATE TABLE public.consulta_servicio (
  id_consulta_servicio integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_consulta integer NOT NULL,
  id_servicio integer NOT NULL,
  precio_aplicado numeric(10, 2),
  pieza_dental smallint,
  superficie varchar(1),
  observaciones varchar(500),
  CONSTRAINT ck_consulta_servicio_precio
    CHECK (precio_aplicado IS NULL OR precio_aplicado >= 0),
  CONSTRAINT ck_consulta_servicio_pieza_fdi
    CHECK (
      pieza_dental IS NULL
      OR (
        pieza_dental BETWEEN 11 AND 48
        AND pieza_dental / 10 BETWEEN 1 AND 4
        AND pieza_dental % 10 BETWEEN 1 AND 8
      )
    ),
  CONSTRAINT ck_consulta_servicio_superficie
    CHECK (superficie IS NULL OR superficie IN ('O', 'M', 'D', 'V', 'L', 'P', 'I')),
  CONSTRAINT ck_consulta_servicio_superficie_requiere_pieza
    CHECK (pieza_dental IS NOT NULL OR superficie IS NULL),
  CONSTRAINT fk_consulta_servicio_consulta
    FOREIGN KEY (id_consulta) REFERENCES public.consulta (id_consulta) ON DELETE RESTRICT,
  CONSTRAINT fk_consulta_servicio_servicio
    FOREIGN KEY (id_servicio) REFERENCES public.servicio_odontologico (id_servicio) ON DELETE RESTRICT
);

CREATE TABLE public.auditoria_clinica (
  id_auditoria integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_usuario integer,
  entidad varchar(50) NOT NULL,
  id_registro integer NOT NULL,
  accion varchar(20) NOT NULL,
  fecha timestamptz NOT NULL DEFAULT now(),
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  CONSTRAINT fk_auditoria_usuario
    FOREIGN KEY (id_usuario) REFERENCES public.usuario (id_usuario) ON DELETE RESTRICT
);

CREATE TABLE public.alergia (
  id_alergia integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre varchar(150) NOT NULL UNIQUE,
  descripcion varchar(500),
  estado boolean NOT NULL DEFAULT true
);

CREATE TABLE public.paciente_alergia (
  id_paciente integer NOT NULL,
  id_alergia integer NOT NULL,
  nivel_severidad varchar(50),
  reaccion varchar(500),
  observaciones varchar(500),
  fecha_registro date,
  CONSTRAINT pk_paciente_alergia
    PRIMARY KEY (id_paciente, id_alergia),
  CONSTRAINT fk_paciente_alergia_paciente
    FOREIGN KEY (id_paciente) REFERENCES public.paciente (id_paciente) ON DELETE RESTRICT,
  CONSTRAINT fk_paciente_alergia_alergia
    FOREIGN KEY (id_alergia) REFERENCES public.alergia (id_alergia) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX ux_paciente_responsable_principal
  ON public.paciente_responsable (id_paciente)
  WHERE es_principal IS TRUE;

CREATE INDEX ix_usuario_rol ON public.usuario (id_rol);
CREATE INDEX ix_paciente_apellidos_nombres ON public.paciente (apellidos, nombres);
CREATE INDEX ix_paciente_responsable_responsable ON public.paciente_responsable (id_responsable);
CREATE INDEX ix_cita_paciente_fecha ON public.cita (id_paciente, fecha);
CREATE INDEX ix_consulta_paciente_fecha ON public.consulta (id_paciente, fecha);
CREATE INDEX ix_consulta_usuario_fecha ON public.consulta (id_usuario, fecha);
CREATE INDEX ix_consulta_poliza ON public.consulta (id_poliza);
CREATE INDEX ix_diagnostico_consulta ON public.diagnostico (id_consulta);
CREATE INDEX ix_tratamiento_diagnostico ON public.tratamiento (id_diagnostico);
CREATE INDEX ix_receta_consulta ON public.receta (id_consulta);
CREATE INDEX ix_detalle_receta_receta ON public.detalle_receta (id_receta);
CREATE INDEX ix_detalle_receta_medicamento ON public.detalle_receta (id_medicamento);
CREATE INDEX ix_consulta_servicio_consulta ON public.consulta_servicio (id_consulta);
CREATE INDEX ix_consulta_servicio_servicio ON public.consulta_servicio (id_servicio);
CREATE INDEX ix_auditoria_usuario_fecha ON public.auditoria_clinica (id_usuario, fecha);
CREATE INDEX ix_paciente_alergia_alergia ON public.paciente_alergia (id_alergia);

COMMENT ON TABLE public.paciente_responsable IS
  'La obligatoriedad de un responsable para menores se valida en la capa de aplicacion.';
COMMENT ON COLUMN public.consulta.id_cita IS
  'NULL representa una atencion no programada; si se informa, cita y consulta deben compartir paciente.';
COMMENT ON TABLE public.consulta_servicio IS
  'pieza_dental usa FDI permanente 11-48 segun el checklist 7.2; confirmar denticion y superficies con el equipo clinico.';
COMMENT ON TABLE public.auditoria_clinica IS
  'No registrar contrasenas, tokens ni secretos en datos_anteriores o datos_nuevos.';
COMMENT ON TABLE public.paciente_alergia IS
  'Verificar alergias y reacciones antes de prescribir; la validacion clinica no se implementa en el DDL.';

ALTER TABLE public.rol ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsable_legal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paciente_responsable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_clinico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cita ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aseguradora ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poliza_seguro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consulta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tratamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_receta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicio_odontologico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consulta_servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alergia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paciente_alergia ENABLE ROW LEVEL SECURITY;

-- RLS queda en denegacion por defecto hasta aprobar roles y politicas de I2-08.
COMMIT;
