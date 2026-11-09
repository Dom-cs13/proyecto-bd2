-- I2-13 · Validación final autorizada. NO modifica esquema ni datos.
-- Ejecutar con la cuenta API para comprobar sus privilegios efectivos.
-- Si la consulta 02 no muestra documento_identidad, detenerse antes de 09/14:
-- la migración propuesta no está aplicada. No corregir datos desde este archivo.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';

-- 01 · Versión y modo de transacción; no consulta credenciales ni conexiones.
SELECT current_setting('server_version') AS version,
       current_setting('transaction_read_only') AS solo_lectura;

-- 02 · Columnas relevantes, tipos e identity. No devuelve valores personales.
SELECT table_name, column_name, data_type, is_nullable, is_identity
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('paciente','historial_clinico','cita','consulta','diagnostico',
    'tratamiento','receta','detalle_receta','consulta_servicio','paciente_alergia','paciente_responsable')
ORDER BY table_name, ordinal_position;

-- 03 · FK, CHECK y UNIQUE efectivos, incluidas las FK compuestas.
SELECT c.relname AS tabla, k.conname AS restriccion, k.contype AS tipo,
       pg_get_constraintdef(k.oid) AS definicion
FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('paciente','historial_clinico','cita','consulta',
  'tratamiento','detalle_receta','consulta_servicio','poliza_seguro','paciente_responsable')
ORDER BY c.relname,k.conname;

-- 04 · Índices parciales y sus predicados.
SELECT tablename,indexname,indexdef FROM pg_indexes
WHERE schemaname='public' AND tablename IN ('paciente','cita','paciente_responsable','consulta')
ORDER BY tablename,indexname;

-- 05 · Estado RLS y FORCE RLS. La ausencia de FORCE no prueba un bypass:
-- comprobar además dueño/superusuario/BYPASSRLS de la cuenta efectiva.
SELECT c.relname AS tabla,c.relrowsecurity AS rls,c.relforcerowsecurity AS force_rls,
       pg_get_userbyid(c.relowner)=current_user AS cuenta_es_duena
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r'
  AND c.relname IN ('paciente','historial_clinico','consulta','cita','receta',
    'detalle_receta','responsable_legal','paciente_responsable','alergia','paciente_alergia')
ORDER BY c.relname;

-- 06 · Políticas, solo metadatos (sin datos clínicos).
SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies
WHERE schemaname='public' AND tablename IN ('paciente','historial_clinico','consulta',
  'cita','receta','detalle_receta','paciente_responsable','paciente_alergia')
ORDER BY tablename,policyname;

-- 07 · Atributos de la cuenta efectiva. Nunca se consulta pg_authid.
SELECT rolsuper,rolbypassrls,rolcreatedb,rolcreaterole
FROM pg_roles WHERE rolname=current_user;

-- 08 · Privilegios efectivos: bajo rol API delete/truncate/CREATE deben ser false.
SELECT c.relname AS tabla,
       has_table_privilege(current_user,c.oid,'SELECT') AS puede_leer,
       has_table_privilege(current_user,c.oid,'INSERT') AS puede_insertar,
       has_table_privilege(current_user,c.oid,'DELETE') AS puede_borrar,
       has_table_privilege(current_user,c.oid,'TRUNCATE') AS puede_truncar,
       has_schema_privilege(current_user,'public','CREATE') AS puede_crear
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r'
  AND c.relname IN ('paciente','historial_clinico','consulta','cita','receta','detalle_receta')
ORDER BY c.relname;

-- 09 · Documentos pendientes/duplicados: solo conteos; depende de la migración.
SELECT count(*) AS pacientes, count(*) FILTER (WHERE documento_identidad IS NULL) AS sin_documento,
       count(*) FILTER (WHERE btrim(documento_identidad)='') AS documento_vacio
FROM public.paciente;
SELECT count(*) AS documentos_duplicados FROM (
  SELECT documento_identidad FROM public.paciente WHERE documento_identidad IS NOT NULL
  GROUP BY documento_identidad HAVING count(*)>1
) duplicados;

-- 10 · Consistencia del archivo, sin motivos ni identificadores personales.
SELECT count(*) AS archivos_inconsistentes FROM public.historial_clinico
WHERE (estado='activo' AND (fecha_archivo IS NOT NULL OR motivo_archivo_tipo IS NOT NULL OR motivo_archivo_detalle IS NOT NULL))
   OR (estado='archivado' AND (fecha_archivo IS NULL OR motivo_archivo_tipo IS NULL OR motivo_archivo_detalle IS NULL));

-- 11 · Integridad de cita con paciente; variante de póliza opcional más abajo.
SELECT count(*) AS citas_de_otro_paciente FROM public.consulta c
JOIN public.cita t ON t.id_cita=c.id_cita WHERE c.id_paciente<>t.id_paciente;
-- La consulta siguiente es opcional con una cuenta revisora autorizada: el rol
-- API mínimo no necesita leer pólizas para estas operaciones y puede rechazarla.
-- SELECT count(*) AS polizas_de_otro_paciente FROM public.consulta c
-- JOIN public.poliza_seguro p ON p.id_poliza=c.id_poliza WHERE c.id_paciente<>p.id_paciente;

-- 12 · Citas activas duplicadas y responsables principales duplicados.
SELECT count(*) AS horarios_duplicados FROM (
  SELECT id_usuario,fecha,hora FROM public.cita WHERE estado<>'cancelada'
  GROUP BY id_usuario,fecha,hora HAVING count(*)>1
) duplicados;
SELECT count(*) AS pacientes_con_principales_duplicados FROM (
  SELECT id_paciente FROM public.paciente_responsable WHERE es_principal
  GROUP BY id_paciente HAVING count(*)>1
) duplicados;

-- 13 · Servicios FDI y superficies. No devuelve observaciones ni precios.
SELECT count(*) AS piezas_invalidas FROM public.consulta_servicio
WHERE pieza_dental IS NOT NULL AND NOT (pieza_dental BETWEEN 11 AND 48
  AND pieza_dental/10 BETWEEN 1 AND 4 AND pieza_dental%10 BETWEEN 1 AND 8);
SELECT count(*) AS superficies_invalidas FROM public.consulta_servicio
WHERE superficie IS NOT NULL AND (pieza_dental IS NULL OR superficie NOT IN ('O','M','D','V','L','P','I'));

-- 14 · Plan de lectura, sin ejecutar ni devolver pacientes. No demuestra
-- rendimiento con volumen real; la selección de índice depende de estadísticas.
EXPLAIN (FORMAT JSON, COSTS TRUE)
SELECT id_paciente FROM public.paciente WHERE documento_identidad='VALIDACION-SIN-PERSONAS' LIMIT 5;

ROLLBACK;
