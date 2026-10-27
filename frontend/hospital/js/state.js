import { MOCK_PACIENTES, MOCK_LABORATORIOS } from './api/mockData.js';

class StateStore {
  constructor() {
    this.pacientes = [...MOCK_PACIENTES];
    this.laboratorios = [...MOCK_LABORATORIOS];
    this.filtroTexto = '';
    this.filtroArea = 'Todos'; // 'Todos' | 'Hospitalización' | 'Medicina General' | 'Críticos'
    this.filtroLabTexto = '';
    this.pacienteSeleccionado = null;
    this.listeners = [];
  }

  getPacientesFiltrados() {
    return this.pacientes.filter(p => {
      const q = this.filtroTexto.toLowerCase().trim();
      const coincideTexto = !q || (
        p.expediente.toLowerCase().includes(q) ||
        `${p.nombre} ${p.apellidos}`.toLowerCase().includes(q) ||
        p.curp.toLowerCase().includes(q) ||
        p.medicoTratante.toLowerCase().includes(q) ||
        p.ubicacion.toLowerCase().includes(q) ||
        (p.detallesInstitucion?.seguro?.aseguradora || '').toLowerCase().includes(q)
      );

      let coincideArea = true;
      if (this.filtroArea === 'Hospitalización') {
        coincideArea = p.servicioArea === 'Hospitalización';
      } else if (this.filtroArea === 'Medicina General') {
        coincideArea = p.servicioArea === 'Medicina General';
      } else if (this.filtroArea === 'Críticos') {
        coincideArea = p.estadoClinico === 'critico' || p.estadoClinico === 'observacion';
      }

      return coincideTexto && coincideArea && p.estadoArchivo === 'activo';
    });
  }

  getLaboratoriosFiltrados() {
    const q = this.filtroLabTexto.toLowerCase().trim();
    if (!q) return this.laboratorios;

    return this.laboratorios.filter(l => 
      l.codigoOrden.toLowerCase().includes(q) ||
      l.pacienteNombre.toLowerCase().includes(q) ||
      l.expediente.toLowerCase().includes(q) ||
      l.tipoExamen.toLowerCase().includes(q) ||
      l.solicitante.toLowerCase().includes(q)
    );
  }

  getKPIs() {
    const total = this.pacientes.filter(p => p.estadoArchivo === 'activo').length;
    const internados = this.pacientes.filter(p => p.detallesInstitucion?.internamiento?.enCama && p.estadoArchivo === 'activo').length;
    const criticos = this.pacientes.filter(p => (p.estadoClinico === 'critico' || p.estadoClinico === 'observacion') && p.estadoArchivo === 'activo').length;
    const medGeneral = this.pacientes.filter(p => p.servicioArea === 'Medicina General' && p.estadoArchivo === 'activo').length;
    const labsPendientes = this.laboratorios.filter(l => l.estado === 'En proceso').length;

    return { total, internados, criticos, medGeneral, labsPendientes };
  }

  setFiltroTexto(texto) {
    this.filtroTexto = texto;
    this.notify();
  }

  setFiltroArea(area) {
    this.filtroArea = area;
    this.notify();
  }

  setFiltroLabTexto(texto) {
    this.filtroLabTexto = texto;
    this.notify();
  }

  setPacienteSeleccionado(paciente) {
    this.pacienteSeleccionado = paciente;
    this.notify();
  }

  agregarPaciente(nuevoPaciente) {
    this.pacientes.unshift(nuevoPaciente);
    this.notify();
  }

  actualizarPaciente(id, datosActualizados) {
    const idx = this.pacientes.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.pacientes[idx] = { ...this.pacientes[idx], ...datosActualizados };
      this.notify();
    }
  }

  archivarPaciente(id, motivo) {
    const idx = this.pacientes.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.pacientes[idx].estadoArchivo = 'archivado';
      this.pacientes[idx].motivoArchivo = motivo;
      this.pacientes[idx].fechaArchivo = new Date().toISOString();
      this.notify();
    }
  }

  agregarOrdenLaboratorio(nuevaOrden) {
    this.laboratorios.unshift(nuevaOrden);
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }
}

export const store = new StateStore();
