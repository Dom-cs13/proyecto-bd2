/**
 * @file HistorialRepository.js
 * Puerto principal del dominio para persistencia clínica.
 * Especificado en la sección 3.1 del plan. Debe ser implementado por los 4 adaptadores:
 * - MongoAdapter (Hospital General)
 * - PostgresAdapter (Clínica Odontológica)
 * - FirestoreAdapter (Laboratorio Clínico)
 * - MariaDbAdapter (Centro Pediátrico)
 */

/**
 * @typedef {Object} Paciente
 * @property {string} id
 * @property {string} documentoIdentidad
 * @property {string} nombre
 * @property {string} apellidos
 * @property {string} fechaNacimiento YYYY-MM-DD
 * @property {string} genero
 * @property {string} [tipoSangre]
 * @property {string} [telefono]
 * @property {string} [correo]
 * @property {string} [direccion]
 * @property {string[]} [alergias]
 * @property {Object} [detallesInstitucion]
 * @property {boolean} activo
 */

/**
 * @typedef {Object} Historial
 * @property {Paciente} paciente
 * @property {'activo'|'archivado'} estado
 * @property {string|null} [fechaArchivo]
 * @property {{ tipo: string, detalle: string }|null} [motivoArchivo]
 * @property {Array<Object>} consultas
 */

/**
 * Interfaz formal del repositorio de historiales clínicos.
 */
export class HistorialRepository {
  /**
   * Crea un nuevo paciente.
   * @param {Object} datos
   * @returns {Promise<Paciente>}
   */
  async crearPaciente(datos) { // eslint-disable-line no-unused-vars
    throw new Error('Método crearPaciente no implementado');
  }

  /**
   * Obtiene un paciente por su identificador.
   * @param {string} id
   * @returns {Promise<Paciente|null>}
   */
  async obtenerPaciente(id) { // eslint-disable-line no-unused-vars
    throw new Error('Método obtenerPaciente no implementado');
  }

  /**
   * Lista pacientes según criterios de búsqueda.
   * @param {{ texto?: string, documento?: string, estado?: string, pagina?: number, limite?: number }} filtro
   * @returns {Promise<{ items: Paciente[], total: number }>}
   */
  async listarPacientes(filtro) { // eslint-disable-line no-unused-vars
    throw new Error('Método listarPacientes no implementado');
  }

  /**
   * Obtiene el historial clínico completo consolidado de un paciente.
   * @param {string} pacienteId
   * @returns {Promise<Historial>}
   */
  async obtenerHistorial(pacienteId) { // eslint-disable-line no-unused-vars
    throw new Error('Método obtenerHistorial no implementado');
  }

  /**
   * Archiva el historial de un paciente indicando motivo formal.
   * @param {string} pacienteId
   * @param {{ tipo: 'traslado'|'fallecimiento'|'administrativo'|'otro', detalle: string }} motivo
   * @returns {Promise<Historial>}
   */
  async archivarHistorial(pacienteId, motivo) { // eslint-disable-line no-unused-vars
    throw new Error('Método archivarHistorial no implementado');
  }

  /**
   * Registra una nueva consulta/estudio clínico.
   * @param {Object} datos
   * @returns {Promise<Object>}
   */
  async crearConsulta(datos) { // eslint-disable-line no-unused-vars
    throw new Error('Método crearConsulta no implementado');
  }

  /**
   * Agrega un diagnóstico a una consulta.
   * @param {string} consultaId
   * @param {Object} datos
   * @returns {Promise<Object>}
   */
  async agregarDiagnostico(consultaId, datos) { // eslint-disable-line no-unused-vars
    throw new Error('Método agregarDiagnostico no implementado');
  }

  /**
   * Registra un tratamiento asociado a un diagnóstico.
   * @param {string} diagnosticoId
   * @param {Object} datos
   * @returns {Promise<Object>}
   */
  async registrarTratamiento(diagnosticoId, datos) { // eslint-disable-line no-unused-vars
    throw new Error('Método registrarTratamiento no implementado');
  }

  /**
   * Emite una receta con su lista de medicamentos para una consulta.
   * @param {string} consultaId
   * @param {Object} datos
   * @returns {Promise<Object>}
   */
  async recetarMedicamento(consultaId, datos) { // eslint-disable-line no-unused-vars
    throw new Error('Método recetarMedicamento no implementado');
  }

  /**
   * Diagnóstico de conexión y latencia del motor.
   * @returns {Promise<{ ok: boolean, motor: string, latenciaMs: number }>}
   */
  async ping() {
    throw new Error('Método ping no implementado');
  }
}
