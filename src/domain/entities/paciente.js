import { z } from 'zod';

/**
 * Esquema Zod de Paciente respetando la regla unificada del proyecto y la
 * regla de equivalencia entre módulos: campos camelCase, id tipo string,
 * fechas ISO-8601 (YYYY-MM-DD), y atributos de contacto y médicos.
 */
export const GeneroEnum = z.enum(['Femenino', 'Masculino', 'Otro']);
export const TipoSangreEnum = z.enum(['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']);

export const ContactoEmergenciaSchema = z.object({
  nombre: z.string().min(1, 'El nombre de contacto es obligatorio'),
  parentesco: z.string().optional().default(''),
  telefono: z.string().optional().default(''),
});

export const PacienteSchema = z.object({
  id: z.string().min(1, 'El id es obligatorio'),
  documentoIdentidad: z.string().min(1, 'El documento de identidad es obligatorio'),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellidos: z.string().min(1, 'Los apellidos son obligatorios'),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  genero: GeneroEnum,
  tipoSangre: TipoSangreEnum.optional().default('O+'),
  telefono: z.string().optional().default(''),
  correo: z.string().email().optional().or(z.literal('')).default(''),
  direccion: z.string().optional().default(''),
  alergias: z.array(z.string()).optional().default([]),
  contactoEmergencia: ContactoEmergenciaSchema.optional(),
  activo: z.boolean().default(true),
  motivoBaja: z.string().nullable().optional().default(null),
  fechaBaja: z.string().nullable().optional().default(null),
  detallesInstitucion: z.record(z.unknown()).optional().default({}),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const PacienteNuevoSchema = PacienteSchema.omit({
  id: true,
  documentoIdentidad: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  documentoIdentidad: z.string().optional(),
  cui: z.string().optional(),
  email: z.string().optional(),
  sexo: GeneroEnum.optional(),
}).refine((data) => Boolean(data.documentoIdentidad || data.cui), {
  message: 'El documento de identidad o CUI es obligatorio',
  path: ['documentoIdentidad'],
}).transform((data) => {
  const documentoIdentidad = String(data.documentoIdentidad || data.cui || '');
  const genero = data.genero || data.sexo || 'Otro';
  const correo = data.correo || data.email || '';
  return {
    ...data,
    documentoIdentidad,
    genero,
    correo,
  };
});

/**
 * Calcula la edad en años a partir de una fecha de nacimiento YYYY-MM-DD.
 * @param {string} fechaNacimiento
 * @returns {number}
 */
export function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return 0;
  const cumple = new Date(fechaNacimiento + 'T00:00:00');
  const hoy = new Date();
  let edad = hoy.getFullYear() - cumple.getFullYear();
  const m = hoy.getMonth() - cumple.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
    edad--;
  }
  return Math.max(0, edad);
}
