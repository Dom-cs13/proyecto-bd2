import { z } from 'zod';

export const filtroRed = z.object({
  documento: z.string().trim().min(1).max(50).optional(),
  texto: z.string().trim().min(2).max(100).optional(),
  pagina: z.coerce.number().int().min(1).max(1000000).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(10),
}).strict().refine((filtro) => filtro.documento || filtro.texto, 'Escribe un documento o al menos dos caracteres del nombre');

export const destinoRed = z.object({
  institucion: z.enum(['hospital', 'odontologia', 'laboratorio', 'pediatria']),
  // Mongo/Firestore usan identificadores opacos. No se asumen enteros SQL.
  id: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
}).strict();
