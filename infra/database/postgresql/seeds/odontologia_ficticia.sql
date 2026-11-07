-- I2-08: fixtures ficticios para PostgreSQL desechable, nunca datos de producción.
-- Requiere establecer explícitamente red_salud.entorno = 'pruebas' en la sesión.
-- No se ejecuta desde la aplicación ni desde npm test.
BEGIN;
DO $$
BEGIN
  IF current_setting('red_salud.entorno', true) IS DISTINCT FROM 'pruebas' THEN
    RAISE EXCEPTION 'Seed permitido únicamente en un entorno de pruebas explícito';
  END IF;
END $$;

INSERT INTO public.rol (nombre) VALUES ('secretaria'), ('odontologo')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.paciente (nombres, apellidos, fecha_nacimiento, sexo, correo, documento_identidad)
SELECT 'Paciente ficticio I2', 'Prueba API', DATE '1990-01-01', 'Otro', 'paciente.i2@example.invalid', 'FICTICIO-I2-001'
WHERE NOT EXISTS (SELECT 1 FROM public.paciente WHERE correo = 'paciente.i2@example.invalid');

INSERT INTO public.historial_clinico (id_paciente)
SELECT id_paciente FROM public.paciente WHERE correo = 'paciente.i2@example.invalid'
ON CONFLICT (id_paciente) DO NOTHING;

INSERT INTO public.medicamento (nombre, presentacion)
SELECT 'Medicamento ficticio I2 - no dispensar', 'Catálogo de pruebas'
WHERE NOT EXISTS (SELECT 1 FROM public.medicamento WHERE nombre = 'Medicamento ficticio I2 - no dispensar');

INSERT INTO public.servicio_odontologico (nombre, descripcion, precio_base)
SELECT 'Servicio ficticio I2', 'Prueba de pieza dental, sin prestación real', 0
WHERE NOT EXISTS (SELECT 1 FROM public.servicio_odontologico WHERE nombre = 'Servicio ficticio I2');

INSERT INTO public.alergia (nombre, descripcion)
VALUES ('Alergia ficticia I2', 'Ejemplo sintético; no usar para decisiones clínicas')
ON CONFLICT (nombre) DO NOTHING;

-- No crear usuarios con contraseñas predeterminadas. La cuenta clínica de prueba
-- debe aprovisionarse fuera del seed con un mecanismo seguro, antes de login.
COMMIT;
