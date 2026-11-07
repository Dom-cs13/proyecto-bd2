-- Ejecutar manualmente SOLO en una base PostgreSQL desechable con DDL ya cargado.
-- No usa credenciales ni se conecta por sí mismo. Requiere psql como dueño/admin.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL red_salud.entorno = 'pruebas';
DO $$
BEGIN
  IF NOT has_table_privilege('red_salud_odontologia_api', 'public.paciente', 'INSERT') THEN
    RAISE EXCEPTION 'Falta INSERT paciente';
  END IF;
  IF has_table_privilege('red_salud_odontologia_api', 'public.paciente', 'DELETE') THEN
    RAISE EXCEPTION 'DELETE paciente no debe estar permitido';
  END IF;
  IF has_table_privilege('red_salud_odontologia_api', 'public.usuario', 'UPDATE') THEN
    RAISE EXCEPTION 'La API no debe administrar cuentas';
  END IF;
  IF has_table_privilege('red_salud_odontologia_api', 'public.medicamento', 'INSERT') THEN
    RAISE EXCEPTION 'La API no debe administrar catálogos';
  END IF;
  IF NOT has_column_privilege('red_salud_odontologia_api', 'public.historial_clinico', 'estado', 'UPDATE') THEN
    RAISE EXCEPTION 'Falta permiso de archivo';
  END IF;
  IF has_column_privilege('red_salud_odontologia_api', 'public.historial_clinico', 'id_paciente', 'UPDATE') THEN
    RAISE EXCEPTION 'El archivo no debe poder cambiar de paciente';
  END IF;
  IF has_schema_privilege('red_salud_odontologia_api', 'public', 'CREATE') THEN
    RAISE EXCEPTION 'El grupo API no debe heredar CREATE sobre el esquema public';
  END IF;
END $$;

SET LOCAL ROLE red_salud_odontologia_api;
WITH p AS (
  INSERT INTO public.paciente (nombres, apellidos, fecha_nacimiento)
  VALUES ('Prueba RLS ficticia', 'No persistir', DATE '2000-01-01') RETURNING id_paciente
)
INSERT INTO public.historial_clinico (id_paciente) SELECT id_paciente FROM p;

-- La escritura clínica solo bloquea h, no c/d: el grupo no actualiza estas tablas.
DO $$
DECLARE seleccionadas integer;
BEGIN
  PERFORM h.id_historial FROM public.historial_clinico h
  JOIN public.paciente p ON p.id_paciente = h.id_paciente
  WHERE p.nombres = 'Prueba RLS ficticia' AND h.estado = 'activo'
  FOR UPDATE OF h;
  GET DIAGNOSTICS seleccionadas = ROW_COUNT;
  IF seleccionadas = 0 THEN RAISE EXCEPTION 'El rol mínimo no puede bloquear un historial activo'; END IF;
END $$;

UPDATE public.historial_clinico
SET estado = 'archivado', fecha_archivo = now(), motivo_archivo_tipo = 'otro',
  motivo_archivo_detalle = 'Prueba ficticia'
WHERE id_paciente IN (SELECT id_paciente FROM public.paciente WHERE nombres = 'Prueba RLS ficticia');

DO $$
DECLARE modificadas integer;
BEGIN
  UPDATE public.historial_clinico SET estado = 'activo', fecha_archivo = NULL,
    motivo_archivo_tipo = NULL, motivo_archivo_detalle = NULL
  WHERE id_paciente IN (SELECT id_paciente FROM public.paciente WHERE nombres = 'Prueba RLS ficticia');
  GET DIAGNOSTICS modificadas = ROW_COUNT;
  IF modificadas <> 0 THEN RAISE EXCEPTION 'RLS permitió reactivar un historial archivado'; END IF;
END $$;
ROLLBACK;
