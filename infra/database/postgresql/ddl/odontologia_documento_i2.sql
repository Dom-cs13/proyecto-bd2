-- I2-06/I2-11: migración local propuesta, pendiente de revisión y aplicación por PR.
-- No asigna documentos ficticios a pacientes existentes ni cambia contratos compartidos.
BEGIN;
ALTER TABLE public.paciente ADD COLUMN IF NOT EXISTS documento_identidad varchar(50);
CREATE UNIQUE INDEX IF NOT EXISTS ux_paciente_documento_identidad
  ON public.paciente (documento_identidad) WHERE documento_identidad IS NOT NULL;
COMMENT ON COLUMN public.paciente.documento_identidad IS
  'Documento de identidad contractual; filas anteriores requieren completar el dato real antes de imponer NOT NULL.';
COMMIT;
