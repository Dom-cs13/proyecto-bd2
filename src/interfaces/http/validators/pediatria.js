import { z } from 'zod';

const texto = (max) => z.string().trim().min(1).max(max);

export const idPediatria = z.string().regex(/^[1-9]\d*$/).refine(
  (id) => /^[1-9]\d*$/.test(id) && id.length <= 10 && BigInt(id) <= 2147483647n,
  'Identificador fuera de rango',
);

export const tutorPediatria = z.object({
  dpi: texto(20).optional(),
  documento: texto(20).optional(),
  nombres: texto(100).optional(),
  nombre: texto(100).optional(),
  apellidos: texto(100).optional(),
  parentesco: texto(50).optional(),
  telefono: z.string().trim().max(20).optional(),
  correo: z.string().trim().email().max(150).optional(),
  direccion: z.string().trim().max(200).optional(),
  esPrincipal: z.boolean().optional(),
}).transform((t) => ({
  dpi: t.dpi ?? t.documento ?? '',
  nombres: t.nombres ?? t.nombre ?? '',
  apellidos: t.apellidos ?? '',
  parentesco: t.parentesco ?? 'Tutor Legal',
  telefono: t.telefono,
  correo: t.correo,
  direccion: t.direccion,
  esPrincipal: t.esPrincipal ?? true,
}));

const pacienteBase = z.object({
  nombres: texto(100).optional(),
  nombre: texto(100).optional(),
  apellidos: texto(100),
  fechaNacimiento: z.iso.date().refine(
    (fecha) => fecha <= new Date().toISOString().slice(0, 10),
    'La fecha de nacimiento no puede ser futura',
  ),
  sexo: z.enum(['F', 'M', 'Femenino', 'Masculino', 'Otro']).optional(),
  genero: z.enum(['Femenino', 'Masculino', 'Otro']).optional(),
  documento: texto(50).optional(),
  documentoIdentidad: texto(50).optional(),
  cui: texto(50).optional(),
  telefono: z.string().trim().max(20).optional(),
  correo: z.string().trim().email().max(150).optional(),
  direccion: z.string().trim().max(200).optional(),
  detallesInstitucion: z.object({
    grupoSanguineo: z.string().trim().max(10).optional(),
    tipoSangre: z.string().trim().max(10).optional(),
    tutorPrincipal: tutorPediatria.optional(),
  }).passthrough().optional(),
}).strict().transform((p) => ({
  documento: p.documento ?? p.documentoIdentidad ?? p.cui ?? null,
  nombres: p.nombres ?? p.nombre ?? '',
  apellidos: p.apellidos,
  fechaNacimiento: p.fechaNacimiento,
  sexo: p.sexo ?? (p.genero === 'Femenino' ? 'F' : p.genero === 'Masculino' ? 'M' : 'M'),
  telefono: p.telefono ?? null,
  correo: p.correo ?? null,
  direccion: p.direccion ?? null,
  detallesInstitucion: {
    ...p.detallesInstitucion,
    grupoSanguineo: p.detallesInstitucion?.grupoSanguineo ?? p.detallesInstitucion?.tipoSangre ?? null,
    tutorPrincipal: p.detallesInstitucion?.tutorPrincipal ?? null,
  },
})).refine((p) => Boolean(p.nombres.trim()), 'El nombre es requerido');

export const pacientePediatria = pacienteBase;

export const filtroPediatria = z.object({
  documento: z.string().trim().max(50).optional(),
  estado: z.enum(['activo', 'archivado']).optional(),
  texto: texto(100).optional(),
  pagina: z.coerce.number().int().min(1).max(1000000).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(10),
}).strict();

export const archivoPediatria = z.object({
  motivo: z.object({
    tipo: z.enum(['traslado', 'fallecimiento', 'administrativo', 'otro']),
    detalle: texto(250),
  }).strict(),
}).strict();

export const consultaPediatria = z.object({
  pacienteId: idPediatria,
  citaId: idPediatria.optional(),
  motivo: texto(250),
  observaciones: z.string().trim().max(500).optional(),
  detallesInstitucion: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const diagnosticoPediatria = z.object({
  descripcion: texto(500),
  observaciones: z.string().trim().max(500).optional(),
}).strict();

export const tratamientoPediatria = diagnosticoPediatria.extend({
  fechaInicio: z.iso.date().optional(),
  fechaFin: z.iso.date().optional(),
  estado: z.string().trim().max(30).optional(),
}).refine(
  (datos) => !datos.fechaFin || (datos.fechaInicio && datos.fechaFin >= datos.fechaInicio),
  'La fecha final requiere inicio y no puede ser anterior',
);

export const recetaPediatria = z.object({
  indicacionesGenerales: z.string().trim().max(5000).optional(),
  medicamentos: z.array(z.object({
    medicamentoId: idPediatria,
    dosis: texto(100),
    frecuencia: texto(100),
    duracion: texto(100).optional(),
    cantidad: z.number().int().positive().max(2147483647).optional(),
    indicaciones: z.string().trim().max(500).optional(),
  }).strict()).min(1).max(50),
}).strict();

export const controlCrecimientoPediatria = z.object({
  consultaId: idPediatria.optional().nullable(),
  fecha: z.iso.date().optional(),
  fechaMedicion: z.iso.date().optional(),
  edadMeses: z.number().int().min(0).max(240).optional(),
  pesoKg: z.number().positive().max(300),
  tallaCm: z.number().positive().max(250).optional(),
  estaturaCm: z.number().positive().max(250).optional(),
  perimetroCefalicoCm: z.number().positive().max(100).optional(),
  observaciones: z.string().trim().max(500).optional(),
}).strict().transform((c) => ({
  consultaId: c.consultaId ?? null,
  fecha: c.fecha ?? c.fechaMedicion ?? new Date().toISOString().slice(0, 10),
  edadMeses: c.edadMeses ?? 0,
  pesoKg: c.pesoKg,
  tallaCm: c.tallaCm ?? c.estaturaCm ?? null,
  perimetroCefalicoCm: c.perimetroCefalicoCm ?? null,
  observaciones: c.observaciones ?? null,
}));

export const vacunaPediatria = z.object({
  vacunaId: idPediatria,
  numeroDosis: z.number().int().min(1).max(10),
  consultaId: idPediatria.optional().nullable(),
  fechaAplicacion: z.iso.date().optional(),
  fecha: z.iso.date().optional(),
  lote: z.string().trim().max(80).optional(),
  reaccionAdversa: z.string().trim().max(500).optional(),
  observaciones: z.string().trim().max(500).optional(),
}).strict().transform((v) => ({
  vacunaId: v.vacunaId,
  numeroDosis: v.numeroDosis,
  consultaId: v.consultaId ?? null,
  fechaAplicacion: v.fechaAplicacion ?? v.fecha ?? new Date().toISOString().slice(0, 10),
  lote: v.lote ?? 'LOTE-DEFAULT',
  reaccionAdversa: v.reaccionAdversa ?? v.observaciones ?? null,
}));
