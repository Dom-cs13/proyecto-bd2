import { z } from 'zod';
import { PacienteSchema } from '../../../domain/entities/paciente.js';

export const pacienteLocal = PacienteSchema.pick({ nombre: true, apellidos: true, genero: true, telefono: true, correo: true, direccion: true, tipoSangre: true, alergias: true })
  .extend({
    documentoIdentidad: z.string().trim().min(1).max(50),
    fechaNacimiento: z.iso.date().refine(fecha => fecha <= new Date().toISOString().slice(0, 10), 'Fecha de nacimiento futura'),
    detallesInstitucion: z.record(z.string(), z.unknown()).optional(),
    expediente: z.string().max(50).optional(),
    estadoClinico: z.enum(['estable', 'observacion', 'critico']).optional(),
    ubicacion: z.string().max(200).optional(),
    medicoTratante: z.string().max(200).optional(),
    servicioArea: z.string().max(100).optional(),
  });

// Extensiones institucionales; no modifica el puerto compartido ni la identidad.
export const editarPacienteLocal = z.object({
    nombre: z.string().trim().min(1).max(100).optional(),
    apellidos: z.string().trim().min(1).max(100).optional(),
    telefono: z.string().trim().max(30).optional(),
    correo: z.union([z.email(), z.literal('')]).optional(),
    direccion: z.string().trim().max(300).optional(),
    estadoClinico: z.enum(['estable', 'observacion', 'critico']).optional(),
    ubicacion: z.string().max(200).optional(),
    medicoTratante: z.string().max(200).optional(),
  }).strict().refine((datos) => Object.keys(datos).length > 0, 'Debe indicar datos para actualizar');

export const motivoArchivoLocal = z.union([
  z.string().trim().min(5).transform((detalle) => ({ tipo: 'administrativo', detalle })),
  z.object({ tipo: z.enum(['traslado', 'fallecimiento', 'administrativo', 'otro']), detalle: z.string().trim().min(5) }).strict(),
]);
