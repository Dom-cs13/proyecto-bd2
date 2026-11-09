/**
 * Data Mapper para MongoDB (Hospital General)
 * Cumple estrictamente la regla LSP de AGENTS.md:
 * - id siempre string (nunca _id)
 * - camelCase
 * - Fechas en formato ISO-8601 string
 * - Detalles propios del hospital en detallesInstitucion
 */

export function formatearFechaIso(fecha) {
  if (!fecha) return null;
  if (typeof fecha === 'string') return fecha;
  if (fecha instanceof Date) return fecha.toISOString();
  return String(fecha);
}

export function pacienteToDomain(doc) {
  if (!doc) return null;

  return {
    id: doc._id?.toString() || doc.id,
    documentoIdentidad: doc.documentoIdentidad || doc.curp || '',
    expediente: doc.expediente || '',
    nombre: doc.nombre || '',
    apellidos: doc.apellidos || '',
    fechaNacimiento: formatearFechaIso(doc.fechaNacimiento)?.slice(0, 10) || '',
    sexo: doc.sexo || doc.genero || '',
    genero: doc.genero || doc.sexo || '',
    direccion: doc.direccion || '',
    telefono: doc.telefono ? String(doc.telefono) : '',
    correo: doc.correo || '',
    alergias: doc.alergias || '',
    polizaSeguro: doc.polizaSeguro || null,
    activo: doc.activo !== undefined ? Boolean(doc.activo) : doc.estado !== 'archivado',
    detallesInstitucion: doc.detallesInstitucion || {
      institucionId: 'I1',
      nombreInstitucion: 'Hospital General',
    },
  };
}

export function consultaToDomain(doc) {
  if (!doc) return null;

  return {
    id: doc._id?.toString() || doc.id,
    pacienteId: doc.pacienteId?.toString() || doc.pacienteId,
    expediente: doc.expediente || '',
    fecha: formatearFechaIso(doc.fecha),
    motivos: doc.motivos || doc.motivo || '',
    observaciones: doc.observaciones || '',
    usuario: doc.usuario || null,
    cita: doc.cita || null,
    servicios: doc.servicios || [],
    diagnostico: doc.diagnostico ? {
      id: doc.diagnostico.idDiagnostico || doc.diagnostico.id || 'diag-01',
      descripcion: doc.diagnostico.descripcion || '',
      observaciones: doc.diagnostico.observaciones || '',
      tratamiento: doc.diagnostico.tratamiento ? {
        id: doc.diagnostico.tratamiento.idTratamiento || doc.diagnostico.tratamiento.id || 'trat-01',
        descripcion: doc.diagnostico.tratamiento.descripcion || '',
        observaciones: doc.diagnostico.tratamiento.observaciones || '',
        fechaInicio: formatearFechaIso(doc.diagnostico.tratamiento.fechaInicio)?.slice(0, 10) || null,
        fechaFin: formatearFechaIso(doc.diagnostico.tratamiento.fechaFin)?.slice(0, 10) || null,
        receta: doc.diagnostico.tratamiento.receta ? {
          id: doc.diagnostico.tratamiento.receta.idReceta || doc.diagnostico.tratamiento.receta.id || 'rec-01',
          fecha: formatearFechaIso(doc.diagnostico.tratamiento.receta.fecha),
          detalles: (doc.diagnostico.tratamiento.receta.detalles || []).map((det) => ({
            id: det.idDetalleR || det.id || '',
            medicamento: typeof det.medicamento === 'object' ? det.medicamento.nombre : det.medicamento,
            dosis: det.dosis || '',
            frecuencia: det.frecuencia || '',
            cantidad: det.cantidad || 0,
            duracion: det.duracion || '',
            indicaciones: det.indicaciones || '',
          })),
        } : null,
      } : null,
    } : null,
  };
}

export function historialToDomain(pacienteDoc, consultasDocs = []) {
  const paciente = pacienteToDomain(pacienteDoc);
  if (!paciente) return null;

  const consultas = consultasDocs.map(consultaToDomain);

  return {
    paciente,
    estado: pacienteDoc.estado || 'activo',
    fechaArchivo: formatearFechaIso(pacienteDoc.fechaArchivo),
    motivoArchivo: pacienteDoc.motivoArchivo || null,
    consultas,
  };
}

export function polizaToDomain(doc) {
  if (!doc) return null;

  return {
    id: doc._id?.toString() || doc.id,
    idPoliza: doc.idPoliza || '',
    cobertura: doc.cobertura || '',
    porcentajeCobertura: Number(doc.porcentajeCobertura) || 0,
    fechaInicio: formatearFechaIso(doc.fechaInicio)?.slice(0, 10) || '',
    fechaVencimiento: formatearFechaIso(doc.fechaVencimiento)?.slice(0, 10) || '',
    estado: doc.estado || 'vigente',
    pacienteId: doc.pacienteId?.toString() || doc.pacienteId || null,
    expediente: doc.expediente || null,
    pacienteNombre: doc.pacienteNombre || null,
    aseguradora: doc.aseguradora ? {
      idAseguradora: doc.aseguradora.idAseguradora || '',
      nombreEmpresa: doc.aseguradora.nombreEmpresa || '',
      nitIdentificador: doc.aseguradora.nitIdentificador || '',
      telefono: doc.aseguradora.telefono ? String(doc.aseguradora.telefono) : '',
    } : null,
  };
}

export function doctorToDomain(doc) {
  if (!doc) return null;

  return {
    id: doc._id?.toString() || doc.id,
    idColegiado: doc.idColegiado || '',
    nombre: doc.nombre || '',
    apellidos: doc.apellidos || '',
    especialidad: doc.especialidad || 'Medicina General',
    telefono: doc.telefono ? String(doc.telefono) : '',
    correo: doc.correo || '',
    horario: doc.horario || 'Turno Completo',
    estado: doc.estado || 'activo',
    institucionId: doc.institucionId || 'I1',
  };
}

export function laboratorioToDomain(doc) {
  if (!doc) return null;

  return {
    id: doc._id?.toString() || doc.id,
    codigo: doc.codigo || '',
    nombre: doc.nombre || '',
    tipo: doc.tipo || 'General',
    responsable: doc.responsable || '',
    ubicacion: doc.ubicacion || '',
    telefono: doc.telefono ? String(doc.telefono) : '',
    correo: doc.correo || '',
    horario: doc.horario || '24 Horas',
    descripcion: doc.descripcion || '',
    estado: doc.estado || 'activo',
    institucionId: doc.institucionId || 'I1',
  };
}

export function tipoExamenToDomain(doc) {
  if (!doc) return null;

  return {
    id: doc._id?.toString() || doc.id,
    codigoExamen: doc.codigoExamen || '',
    laboratorioId: doc.laboratorioId?.toString() || doc.laboratorioId || '',
    laboratorioCodigo: doc.laboratorioCodigo || '',
    laboratorioNombre: doc.laboratorioNombre || '',
    nombre: doc.nombre || '',
    categoria: doc.categoria || 'General',
    tipoMuestra: doc.tipoMuestra || 'Sangre venosa',
    tiempoEstimadoHoras: Number(doc.tiempoEstimadoHoras) || 4,
    indicacionesPaciente: doc.indicacionesPaciente || '',
    parametrosBase: Array.isArray(doc.parametrosBase) ? doc.parametrosBase : [],
    estado: doc.estado || 'activo',
    institucionId: doc.institucionId || 'I1',
  };
}

export function ordenLaboratorioToDomain(doc) {
  if (!doc) return null;

  return {
    id: doc._id?.toString() || doc.id,
    codigoOrden: doc.codigoOrden || '',
    pacienteId: doc.pacienteId?.toString() || doc.pacienteId || '',
    expediente: doc.expediente || '',
    pacienteNombre: doc.pacienteNombre || '',
    laboratorioId: doc.laboratorioId?.toString() || doc.laboratorioId || '',
    laboratorioNombre: doc.laboratorioNombre || '',
    tipoExamenId: doc.tipoExamenId?.toString() || doc.tipoExamenId || '',
    tipoExamen: doc.tipoExamen || '',
    fechaOrden: formatearFechaIso(doc.fechaOrden),
    fechaResultado: doc.fechaResultado ? formatearFechaIso(doc.fechaResultado) : null,
    solicitante: doc.solicitante || 'Dr. Rodrigo Palma',
    prioridad: doc.prioridad || 'Normal',
    estado: doc.estado || 'En proceso',
    resultadoResumen: doc.resultadoResumen || 'Muestra recolectada',
    valores: Array.isArray(doc.valores) ? doc.valores.map(v => ({
      parametro: v.parametro || '',
      valor: v.valor || '',
      referencia: v.referencia || '',
      estado: v.estado || 'normal',
    })) : [],
    observacionesTecnicas: doc.observacionesTecnicas || '',
    institucionId: doc.institucionId || 'I1',
  };
}

