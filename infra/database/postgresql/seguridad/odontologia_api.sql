-- I2-08: propuesta para el DDL odontológico de esta rama. Revisar por PR.
-- NO ejecutar automáticamente. No contiene credenciales ni crea usuarios LOGIN.
-- La cuenta de servicio debe ser distinta del dueño de las tablas y de postgres.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'red_salud_odontologia_api') THEN
    CREATE ROLE red_salud_odontologia_api NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'red_salud_odontologia_api'
    AND (rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolcanlogin OR rolreplication)) THEN
    RAISE EXCEPTION 'El rol existente tiene privilegios incompatibles; revisar antes de continuar';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member
    WHERE r.rolname = 'red_salud_odontologia_api') THEN
    RAISE EXCEPTION 'El grupo API hereda otros roles; revisar antes de continuar';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_roles r ON r.oid = c.relowner
    WHERE r.rolname = 'red_salud_odontologia_api' AND c.relnamespace = 'public'::regnamespace) THEN
    RAISE EXCEPTION 'El grupo API es dueño de objetos y podría omitir RLS';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO red_salud_odontologia_api;

-- Una base institucional, sin permisos para borrar, DDL, administrar cuentas o roles.
DO $$
DECLARE tabla text; columna text; secuencia text;
BEGIN
  FOREACH tabla IN ARRAY ARRAY[
    'paciente', 'historial_clinico', 'consulta', 'diagnostico', 'tratamiento',
    'receta', 'detalle_receta', 'consulta_servicio', 'medicamento', 'servicio_odontologico', 'rol'
  ] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', tabla);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabla);
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO red_salud_odontologia_api', tabla);
    EXECUTE format('DROP POLICY IF EXISTS odontologia_api_lectura ON public.%I', tabla);
    EXECUTE format('CREATE POLICY odontologia_api_lectura ON public.%I FOR SELECT TO red_salud_odontologia_api USING (true)', tabla);
  END LOOP;

  FOREACH tabla IN ARRAY ARRAY[
    'paciente', 'historial_clinico', 'consulta', 'diagnostico', 'tratamiento',
    'receta', 'detalle_receta', 'consulta_servicio'
  ] LOOP
    EXECUTE format('GRANT INSERT ON TABLE public.%I TO red_salud_odontologia_api', tabla);
    columna := 'id_' || CASE tabla WHEN 'historial_clinico' THEN 'historial' ELSE tabla END;
    secuencia := pg_get_serial_sequence(format('public.%I', tabla), columna);
    IF secuencia IS NULL THEN RAISE EXCEPTION 'Falta identity en %', tabla; END IF;
    EXECUTE format('GRANT USAGE ON SEQUENCE %s TO red_salud_odontologia_api', secuencia);
    EXECUTE format('DROP POLICY IF EXISTS odontologia_api_registro ON public.%I', tabla);
    EXECUTE format('CREATE POLICY odontologia_api_registro ON public.%I FOR INSERT TO red_salud_odontologia_api WITH CHECK (true)', tabla);
  END LOOP;
END $$;

GRANT UPDATE (estado, fecha_archivo, motivo_archivo_tipo, motivo_archivo_detalle)
  ON public.historial_clinico TO red_salud_odontologia_api;
DROP POLICY IF EXISTS odontologia_api_archivo ON public.historial_clinico;
CREATE POLICY odontologia_api_archivo ON public.historial_clinico
  FOR UPDATE TO red_salud_odontologia_api USING (estado = 'activo') WITH CHECK (estado = 'archivado');

REVOKE ALL ON public.usuario FROM PUBLIC;
ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;
GRANT SELECT (id_usuario, correo, id_rol, estado, password_hash)
  ON public.usuario TO red_salud_odontologia_api;
DROP POLICY IF EXISTS odontologia_api_login ON public.usuario;
CREATE POLICY odontologia_api_login ON public.usuario FOR SELECT
  TO red_salud_odontologia_api USING (estado = true);

DO $$
BEGIN
  IF to_regnamespace('extensions') IS NOT NULL THEN
    IF to_regprocedure('extensions.crypt(text,text)') IS NOT NULL THEN
      GRANT USAGE ON SCHEMA extensions TO red_salud_odontologia_api;
      GRANT EXECUTE ON FUNCTION extensions.crypt(text,text) TO red_salud_odontologia_api;
    END IF;
  END IF;
END $$;
-- extensions.crypt es usado por el login existente. Si falta, su instalación se
-- revisa aparte; este archivo no instala extensiones ni concede acceso público.
-- No se conceden membresías a anon/authenticated ni se configura una contraseña.
COMMIT;
