import { apiPediatria } from '../../shared/js/api/pediatria.js';
import { solicitarJson } from '../../shared/js/api/persistencia.js';
import { obtenerSesion } from '../../shared/js/api/auth.js';
/**
 * Estado Reactivo Pediátrico - Centro Pediátrico (I4)
 * Cumple la Regla #2 (LSP):
 * - id siempre string
 * - camelCase estricto
 * - fechas ISO-8601
 * - datos propios en detallesInstitucion
 * - estado de archivo vive SOLO en historial.estado
 */

export const ESQUEMA_NACIONAL_VACUNAS = [
  { vacunaId: "VAC-01", nombreVacuna: "BCG (Tuberculosis)", dosis: 1, edadRecomendada: "Al nacer" },
  { vacunaId: "VAC-02", nombreVacuna: "Hepatitis B Pediátrica", dosis: 1, edadRecomendada: "Primeras 24 horas" },
  { vacunaId: "VAC-03", nombreVacuna: "Pentavalente (DPT + HB + Hib)", dosis: 1, edadRecomendada: "2 meses" },
  { vacunaId: "VAC-03", nombreVacuna: "Pentavalente (DPT + HB + Hib)", dosis: 2, edadRecomendada: "4 meses" },
  { vacunaId: "VAC-03", nombreVacuna: "Pentavalente (DPT + HB + Hib)", dosis: 3, edadRecomendada: "6 meses" },
  { vacunaId: "VAC-04", nombreVacuna: "Rotavirus", dosis: 1, edadRecomendada: "2 meses" },
  { vacunaId: "VAC-04", nombreVacuna: "Rotavirus", dosis: 2, edadRecomendada: "4 meses" },
  { vacunaId: "VAC-05", nombreVacuna: "Neumococo Conjugada", dosis: 1, edadRecomendada: "2 meses" },
  { vacunaId: "VAC-05", nombreVacuna: "Neumococo Conjugada", dosis: 2, edadRecomendada: "4 meses" },
  { vacunaId: "VAC-06", nombreVacuna: "SRP (Sarampión, Rubeola, Paperas)", dosis: 1, edadRecomendada: "12 meses" },
  { vacunaId: "VAC-06", nombreVacuna: "SRP (Sarampión, Rubeola, Paperas)", dosis: 2, edadRecomendada: "18 meses" }
];

class PediatriaStore {
  constructor() {
    this.pacientes = [];
    this.filtroTexto = "";
    this.pacienteSeleccionadoId = this.pacientes[0]?.id || null;
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn());
  }

  setFiltroTexto(texto) {
    this.filtroTexto = (texto || "").toLowerCase().trim();
    this.notify();
  }

  setPacienteSeleccionado(id) {
    this.pacienteSeleccionadoId = id;
    this.notify();
  }

  getPacienteSeleccionado() {
    return this.pacientes.find(p => p.id === this.pacienteSeleccionadoId) || this.pacientes[0];
  }

  getPacientesFiltrados() {
    if (!this.filtroTexto) return this.pacientes;
    return this.pacientes.filter(p => {
      const nom = `${p.nombre} ${p.apellidos}`.toLowerCase();
      const exp = (p.expediente || "").toLowerCase();
      const doc = (p.documentoIdentidad || "").toLowerCase();
      const tutor = (p.detallesInstitucion?.tutorPrincipal?.nombre || "").toLowerCase();
      return nom.includes(this.filtroTexto) ||
             exp.includes(this.filtroTexto) ||
             doc.includes(this.filtroTexto) ||
             tutor.includes(this.filtroTexto);
    });
  }

  async cargarPaciente(id) {
    const paciente = await apiPediatria.paciente(id);
    const datos = obtenerSesion()?.rol === 'recepcion'
      ? await solicitarJson(`/red/pediatria/pacientes/${encodeURIComponent(id)}/historial`)
      : await apiPediatria.historial(id);
    const detalles = paciente.detallesInstitucion || {};
    const tutor = detalles.tutorPrincipal;
    return { ...paciente, expediente: paciente.expediente || paciente.id,
      detallesInstitucion: { ...detalles,
        tutorPrincipal: tutor ? { ...tutor, nombre: tutor.nombre || `${tutor.nombres || ''} ${tutor.apellidos || ''}`.trim() } : null },
      historial: { ...(datos.historial || datos), consultas: datos.consultas || [] } };
  }

  async sincronizarConBackend() {
    const { items } = await apiPediatria.listar({ limite: 100 });
    this.pacientes = await Promise.all(items.map(p => this.cargarPaciente(p.id)));
    this.pacienteSeleccionadoId = this.pacientes[0]?.id || null;
    this.notify();
  }

  async recargarPaciente(id) {
    const paciente = await this.cargarPaciente(id);
    const indice = this.pacientes.findIndex(p => p.id === id);
    if (indice >= 0) this.pacientes[indice] = paciente;
    else this.pacientes.unshift(paciente);
    this.notify();
    return paciente;
  }

  async agregarPaciente(datos) {
    const paciente = await apiPediatria.registrar(datos);
    return this.recargarPaciente(paciente.id);
  }

  async archivarPaciente(id, motivo) {
    await apiPediatria.archivar(id, motivo);
    return this.recargarPaciente(id);
  }

  async agregarControlCrecimiento(id, control) {
    await apiPediatria.crecimiento(id, { pesoKg: control.pesoKg, tallaCm: control.tallaCm,
      perimetroCefalicoCm: control.perimetroCefalicoCm, edadMeses: control.edadMeses,
      observaciones: control.observaciones, fecha: control.fecha });
    return this.recargarPaciente(id);
  }

  async registrarVacuna(id, vacuna) {
    const catalogos = await apiPediatria.catalogos();
    const nombre = vacuna.nombreVacuna.split(' (')[0].trim().toLowerCase();
    const coincidencias = (catalogos.vacunas || []).filter(v => (v.nombre || v.nombreVacuna || '').toLowerCase() === nombre);
    if (coincidencias.length !== 1) throw new Error('La vacuna debe coincidir con una entrada ?nica del cat?logo del servidor');
    await apiPediatria.vacuna(id, { vacunaId: coincidencias[0].id, numeroDosis: vacuna.dosis,
      lote: vacuna.lote, fechaAplicacion: vacuna.fechaAplicacion });
    return this.recargarPaciente(id);
  }

  async agregarConsulta(pacienteId, datos) {
    let medicamento;
    const receta = datos.recetas?.[0]?.medicamentos?.[0];
    if (receta) {
      const catalogos = await apiPediatria.catalogos();
      const coincidencias = (catalogos.medicamentos || []).filter(m => m.nombre.toLowerCase() === receta.nombre.trim().toLowerCase());
      if (coincidencias.length !== 1) throw new Error('Escriba el nombre exacto de un medicamento del cat?logo');
      medicamento = { medicamentoId: coincidencias[0].id, dosis: receta.dosis, frecuencia: receta.frecuencia, duracion: receta.duracion };
    }
    try {
      const consulta = await apiPediatria.consulta({ pacienteId, motivo: datos.motivo });
      const diagnostico = await apiPediatria.diagnostico(consulta.id, { descripcion: datos.diagnosticos[0].descripcion });
      await apiPediatria.tratamiento(diagnostico.id, { descripcion: datos.diagnosticos[0].tratamientos[0].descripcion });
      if (medicamento) await apiPediatria.receta(consulta.id, { medicamentos: [medicamento] });
    } catch (error) {
      throw new Error(`No se complet? la atenci?n. Revise los pasos ya guardados antes de reintentar: ${error.message}`, { cause: error });
    } finally { await this.recargarPaciente(pacienteId); }
  }

  getKPIs() {
    const activos = this.pacientes.filter(p => p.historial?.estado === "activo");
    const enObservacion = activos.filter(p => p.estadoClinico === "observacion" || p.estadoClinico === "critico").length;

    let totalControles = 0;
    let vacunasPendientes = 0;

    activos.forEach(p => {
      totalControles += (p.detallesInstitucion?.controlesCrecimiento?.length || 0);
      const aplicadas = p.detallesInstitucion?.vacunasAplicadas?.length || 0;
      const esperadas = ESQUEMA_NACIONAL_VACUNAS.length;
      if (aplicadas < esperadas) {
        vacunasPendientes += (esperadas - aplicadas);
      }
    });

    return {
      totalPacientes: activos.length,
      enObservacion,
      totalControles,
      vacunasPendientes
    };
  }
}

export const store = new PediatriaStore();
