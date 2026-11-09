import { buscarEnRed, obtenerHistorialEnRed } from '../../../application/useCases/consultaEnRed.js';
import { MotorNoDisponible } from '../../../domain/errores.js';
import { filtroRed, destinoRed } from '../validators/consultaEnRed.js';

const seleccionar = (objeto, campos) => Object.fromEntries(campos.filter((c) => objeto?.[c] !== undefined).map((c) => [c, objeto[c]]));
export function pacienteVisibleEnRed(paciente) {
  // Lista positiva I4-01: no contacto, tutores, alergias, pólizas, notas o extensiones.
  return seleccionar(paciente, ['id', 'documentoIdentidad', 'nombre', 'apellidos', 'fechaNacimiento', 'genero']);
}

export function historialVisibleEnRed(datos, usuario, institucion) {
  const paciente = pacienteVisibleEnRed(datos.paciente);
  const origen = datos.historial ?? datos;
  const historial = seleccionar(origen, ['id', 'pacienteId', 'estado', 'fechaCreacion', 'fechaArchivo']);
  const clinicoLocal = usuario.institucion === institucion && (
    (institucion === 'odontologia' && usuario.rol === 'odontologo') ||
    (institucion === 'pediatria' && ['pediatra', 'enfermeria'].includes(usuario.rol))
  );
  // Lo restringido de otra institución no sale, incluso al cambiar el rol.
  // La lectura clínica local conserva su contrato y autorización institucional.
  if (clinicoLocal) return { paciente, historial,
    consultas: (datos.consultas ?? []).map((c) => ({
      ...seleccionar(c, ['id', 'pacienteId', 'fecha', 'motivo', 'observaciones', 'estado']),
      diagnosticos: (c.diagnosticos ?? []).map((d) => ({ ...seleccionar(d, ['id', 'descripcion', 'observaciones']),
        tratamientos: (d.tratamientos ?? []).map((t) => seleccionar(t, ['id', 'descripcion', 'estado', 'fechaInicio', 'fechaFin', 'observaciones'])) })),
      recetas: (c.recetas ?? []).map((r) => ({ ...seleccionar(r, ['id', 'fecha', 'indicacionesGenerales']),
        medicamentos: (r.medicamentos ?? []).map((m) => seleccionar(m, ['id', 'nombre', 'dosis', 'frecuencia', 'duracion', 'cantidad', 'indicaciones'])) })),
    })) };
  return { paciente, historial, consultas: [] };
}

export function controladoresRed(obtenerTodos, opciones = {}) {
  return {
    async buscar(req, res, next) {
      try {
        const filtro = filtroRed.parse(req.query);
        const resultado = await buscarEnRed(obtenerTodos(), filtro, opciones);
        res.json({ resultados: resultado.resultados.map((r) => ({ ...r, items: r.items.map(pacienteVisibleEnRed) })) });
      } catch (error) { next(error); }
    },
    async historial(req, res, next) {
      try {
        const { institucion, id } = destinoRed.parse(req.params);
        const datos = await obtenerHistorialEnRed(obtenerTodos(), institucion, id, opciones);
        if (!datos.paciente || !['activo', 'archivado'].includes((datos.historial ?? datos).estado)) throw new MotorNoDisponible(institucion);
        res.json(historialVisibleEnRed(datos, req.user, institucion));
      } catch (error) {
        if (error?.status || error?.name === 'ZodError') return next(error);
        next(new MotorNoDisponible(req.params.institucion));
      }
    },
  };
}
