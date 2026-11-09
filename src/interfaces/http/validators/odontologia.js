import { z } from 'zod';

const texto = (max) => z.string().trim().min(1).max(max);
export const idOdontologia = z.string().regex(/^[1-9]\d*$/).refine(
  (id) => /^[1-9]\d*$/.test(id) && id.length <= 10 && BigInt(id) <= 2147483647n,
  'Identificador fuera de rango',
);

export const responsableOdontologia = z.object({
  nombres: texto(100), apellidos: texto(100), dpi: texto(20).optional(),
  telefono: texto(20).optional(), parentesco: texto(50), esPrincipal: z.boolean(),
}).strict();
// Entrada institucional compatible con la persistencia existente. No modifica Zod compartido.
const pacienteAnterior = z.object({
  nombres: texto(100),
  apellidos: texto(100),
  fechaNacimiento: z.iso.date().refine((fecha) => fecha <= new Date().toISOString().slice(0, 10),
    'La fecha de nacimiento no puede ser futura'),
  sexo: z.enum(['F', 'M', 'Femenino', 'Masculino', 'Otro']).optional(),
  telefono: texto(20).optional(),
  correo: z.email().max(150).optional(),
  direccion: texto(200).optional(),
  detallesInstitucion: z.object({ responsableLegal: responsableOdontologia }).strict().optional(),
}).strict();

const documento = texto(50);
export const editarPacienteOdontologia = pacienteAnterior.omit({ nombres: true, apellidos: true, fechaNacimiento: true, sexo: true }).partial()
  .refine((datos) => Object.keys(datos).length > 0, 'Indica al menos un dato de contacto');
export const citaOdontologia = z.object({
  pacienteId: idOdontologia, usuarioId: idOdontologia, fecha: z.iso.date(),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), motivo: texto(250),
}).strict();
export const cambioCitaOdontologia = z.object({
  fecha: z.iso.date(), hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  estado: z.enum(['programada', 'confirmada', 'cancelada', 'no_asistio']),
}).strict();
export const alergiaOdontologia = z.object({
  alergiaId: idOdontologia, nivelSeveridad: texto(50), reaccion: texto(500),
  observaciones: texto(500).optional(),
}).strict();
export const agendaOdontologia = z.object({ fecha: z.iso.date() }).strict();
const pacienteCanonico = pacienteAnterior.omit({ nombres: true, sexo: true }).extend({
  nombre: texto(100), genero: z.enum(['Femenino', 'Masculino', 'Otro']), documentoIdentidad: documento,
}).strict().transform(({ nombre, genero, ...datos }) => ({ ...datos, nombres: nombre, sexo: genero }));
export const pacienteOdontologia = z.union([
  pacienteCanonico, pacienteAnterior.extend({ documentoIdentidad: documento.optional() }),
]);

export const filtroOdontologia = z.object({
  documento: documento.optional(),
  estado: z.enum(['activo', 'archivado']).optional(),
  texto: texto(100).optional(),
  pagina: z.coerce.number().int().min(1).max(1000000).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(10),
}).strict();

export const archivoOdontologia = z.object({
  motivo: z.object({
    tipo: z.enum(['traslado', 'fallecimiento', 'administrativo', 'otro']),
    detalle: texto(250),
  }).strict(),
}).strict();

export const diagnosticoOdontologia = z.object({
  descripcion: texto(500), observaciones: texto(500).optional(),
}).strict();
export const tratamientoOdontologia = diagnosticoOdontologia.extend({
  fechaInicio: z.iso.date().optional(), fechaFin: z.iso.date().optional(),
}).refine((datos) => !datos.fechaFin || (datos.fechaInicio && datos.fechaFin >= datos.fechaInicio),
  'La fecha final requiere inicio y no puede ser anterior');
export const recetaOdontologia = z.object({
  indicacionesGenerales: texto(5000).optional(),
  medicamentos: z.array(z.object({
    medicamentoId: idOdontologia, dosis: texto(100), frecuencia: texto(100),
    duracion: texto(100).optional(), cantidad: z.number().int().positive().max(2147483647).optional(),
    indicaciones: texto(500).optional(),
  }).strict()).min(1).max(50),
}).strict();
export const servicioOdontologia = z.object({
  servicioId: idOdontologia,
  piezaDental: z.number().int().refine((pieza) => Math.floor(pieza / 10) >= 1 &&
    Math.floor(pieza / 10) <= 4 && pieza % 10 >= 1 && pieza % 10 <= 8, 'Pieza FDI permanente inválida').optional(),
  superficie: z.enum(['O', 'M', 'D', 'V', 'L', 'P', 'I']).optional(),
  precioAplicado: z.number().min(0).max(99999999.99).refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.000001,
    'El precio admite dos decimales').optional(),
  observaciones: texto(500).optional(),
}).strict().refine((datos) => !datos.superficie || datos.piezaDental, 'La superficie requiere una pieza');
export const consultaOdontologia = z.object({
  pacienteId: idOdontologia, citaId: idOdontologia.optional(),
  motivo: texto(250), observaciones: texto(500).optional(),
  detallesInstitucion: z.object({
    polizaId: idOdontologia.optional(), servicios: z.array(servicioOdontologia).max(100).optional(),
  }).strict().optional(),
}).strict();
