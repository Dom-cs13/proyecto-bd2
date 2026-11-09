/**
 * @file mapper.js
 * Data Mapper para transformar entre documentos de Firestore y entidades de dominio.
 * Cumple estrictamente con las reglas de Liskov Substitution Principle (LSP):
 * - id siempre string
 * - camelCase (sin _id ni snake_case de columnas)
 * - Fechas en texto ISO-8601 (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss.sssZ), nunca Firestore Timestamp
 * - Detalles propios del Laboratorio en detallesInstitucion
 * - Estado de archivo únicamente en historial.estado ('activo' | 'archivado')
 */

/**
 * Convierte un Timestamp de Firestore, Date o string a ISO-8601 string.
 * @param {any} valor
 * @returns {string|null}
 */
export function aFechaIso(valor) {
  if (!valor) return null;
  // Firestore Timestamp
  if (typeof valor === 'object' && typeof valor.toDate === 'function') {
    return valor.toDate().toISOString();
  }
  // Date de JS
  if (valor instanceof Date) {
    return valor.toISOString();
  }
  // String
  if (typeof valor === 'string') {
    return valor;
  }
  return null;
}

/**
 * Mapea un documento de Firestore a la entidad Paciente de dominio.
 * @param {Object} doc Firestore DocumentSnapshot o plain object con id
 * @returns {Object}
 */
export function pacienteToDomain(doc) {
  if (!doc) return null;
  const data = typeof doc.data === 'function' ? doc.data() : doc;
  const id = String(doc.id || data.id || '');

  return {
    id,
    documentoIdentidad: String(data.documentoIdentidad || data.cui || ''),
    nombre: String(data.nombre || ''),
    apellidos: String(data.apellidos || ''),
    fechaNacimiento: aFechaIso(data.fechaNacimiento)?.slice(0, 10) || data.fechaNacimiento || '',
    genero: data.genero || data.sexo || 'Otro',
    tipoSangre: data.tipoSangre || 'O+',
    telefono: data.telefono || '',
    correo: data.correo || data.email || '',
    direccion: data.direccion || '',
    alergias: Array.isArray(data.alergias) ? data.alergias : [],
    contactoEmergencia: data.contactoEmergencia || null,
    activo: data.activo !== false,
    motivoBaja: data.motivoBaja || null,
    fechaBaja: aFechaIso(data.fechaBaja),
    detallesInstitucion: {
      institucionId: 'I3',
      nombreInstitucion: 'Laboratorio Clínico',
      ...(data.detallesInstitucion || {}),
    },
    createdAt: aFechaIso(data.createdAt),
    updatedAt: aFechaIso(data.updatedAt),
  };
}

/**
 * Mapea una entidad Paciente a un objeto plano apto para Firestore.
 * @param {Object} paciente
 * @returns {Object}
 */
export function pacienteToFirestore(paciente) {
  const ahora = new Date().toISOString();
  return {
    documentoIdentidad: paciente.documentoIdentidad || paciente.cui,
    nombre: paciente.nombre,
    apellidos: paciente.apellidos,
    fechaNacimiento: paciente.fechaNacimiento,
    genero: paciente.genero || 'Otro',
    tipoSangre: paciente.tipoSangre || 'O+',
    telefono: paciente.telefono || '',
    correo: paciente.correo || paciente.email || '',
    direccion: paciente.direccion || '',
    alergias: Array.isArray(paciente.alergias) ? paciente.alergias : [],
    contactoEmergencia: paciente.contactoEmergencia || null,
    activo: paciente.activo !== false,
    motivoBaja: paciente.motivoBaja || null,
    fechaBaja: paciente.fechaBaja || null,
    detallesInstitucion: paciente.detallesInstitucion || {},
    updatedAt: ahora,
    createdAt: paciente.createdAt || ahora,
  };
}

/**
 * Mapea un documento de Muestra a dominio.
 * @param {Object} doc
 * @returns {Object}
 */
export function muestraToDomain(doc) {
  if (!doc) return null;
  const data = typeof doc.data === 'function' ? doc.data() : doc;
  return {
    id: String(doc.id || data.id || ''),
    ordenId: String(data.ordenId || ''),
    codigoBarras: String(data.codigoBarras || ''),
    tipoMuestra: data.tipoMuestra,
    fechaToma: aFechaIso(data.fechaToma),
    fechaRecepcion: aFechaIso(data.fechaRecepcion),
    volumen: data.volumen != null ? Number(data.volumen) : null,
    contenedor: data.contenedor || 'Tubo estándar',
    condicionMuestra: data.condicionMuestra || 'optima',
    estadoMuestra: data.estadoMuestra || 'registrada',
    observacionesMuestra: data.observacionesMuestra || '',
    auditoria: {
      createdAt: aFechaIso(data.auditoria?.createdAt || data.createdAt),
      updatedAt: aFechaIso(data.auditoria?.updatedAt || data.updatedAt),
      createdBy: data.auditoria?.createdBy || 'sistema',
      updatedBy: data.auditoria?.updatedBy || 'sistema',
    },
  };
}

/**
 * Mapea un documento de Resultado a dominio.
 * @param {Object} doc
 * @returns {Object}
 */
export function resultadoToDomain(doc) {
  if (!doc) return null;
  const data = typeof doc.data === 'function' ? doc.data() : doc;
  return {
    id: String(doc.id || data.id || ''),
    ordenId: String(data.ordenId || ''),
    muestraId: String(data.muestraId || ''),
    examenCodigo: data.examenCodigo || '',
    examenNombre: data.examenNombre || '',
    tipoLaboratorio: data.tipoLaboratorio,
    valorResultado: data.valorResultado || {},
    unidadMedida: data.unidadMedida || '',
    rangoReferencia: data.rangoReferencia || '',
    flagAnormalidad: data.flagAnormalidad || 'normal',
    metodo: data.metodo || '',
    equipo: data.equipo || '',
    fechaResultado: aFechaIso(data.fechaResultado),
    tecnicoIngreso: data.tecnicoIngreso || '',
    tecnicoValido: data.tecnicoValido || null,
    fechaValidacion: aFechaIso(data.fechaValidacion),
    estadoResultado: data.estadoResultado || 'preliminar',
    comentarios: data.comentarios || '',
    version: data.version || 1,
    historialVersiones: Array.isArray(data.historialVersiones) ? data.historialVersiones : [],
    auditoria: {
      createdAt: aFechaIso(data.auditoria?.createdAt || data.createdAt),
      updatedAt: aFechaIso(data.auditoria?.updatedAt || data.updatedAt),
    },
  };
}

/**
 * Mapea un documento de Orden de examen a dominio.
 * @param {Object} doc
 * @param {Array<Object>} [muestras]
 * @param {Array<Object>} [resultados]
 * @returns {Object}
 */
export function ordenToDomain(doc, muestras = [], resultados = []) {
  if (!doc) return null;
  const data = typeof doc.data === 'function' ? doc.data() : doc;
  return {
    id: String(doc.id || data.id || ''),
    numeroOrden: String(data.numeroOrden || data.id || ''),
    pacienteId: String(data.pacienteId || data.pacienteCui || ''),
    fechaSolicitud: aFechaIso(data.fechaSolicitud) || data.fechaSolicitud,
    medicoSolicitante: data.medicoSolicitante || '',
    especialidadSolicitante: data.especialidadSolicitante || 'Medicina General',
    tipoLaboratorio: data.tipoLaboratorio || data.tipo || 'hematologia',
    examenesSolicitados: Array.isArray(data.examenesSolicitados) ? data.examenesSolicitados : [],
    prioridad: data.prioridad || 'rutina',
    observacionesOrden: data.observacionesOrden || '',
    estadoOrden: data.estadoOrden || data.estado || 'pendiente',
    muestras,
    resultados,
    auditoria: {
      createdAt: aFechaIso(data.auditoria?.createdAt || data.createdAt),
      updatedAt: aFechaIso(data.auditoria?.updatedAt || data.updatedAt),
    },
  };
}
