import { MOCK_PACIENTES, MOCK_LABORATORIOS, MOCK_POLIZAS } from './api/mockData.js';
import { apiClient } from '../../shared/js/api/client.js';

class StateStore {
  constructor() {
    this.pacientes = [...MOCK_PACIENTES];
    this.laboratorios = [...MOCK_LABORATORIOS];
    this.polizas = [...MOCK_POLIZAS];
    this.filtroTexto = '';
    this.filtroArea = 'Todos'; // 'Todos' | 'Hospitalización' | 'Medicina General' | 'Críticos'
    this.filtroLabTexto = '';
    this.filtroPolizaTexto = '';
    this.pacienteSeleccionado = null;
    this.listeners = [];
    this.sincronizado = false;
  }

  async sincronizarConBackend() {
    try {
      const resPacientes = await apiClient('/pacientes');
      if (resPacientes.ok) {
        const data = await resPacientes.json();
        if (Array.isArray(data.items) && data.items.length > 0) {
          this.pacientes = data.items.map(p => ({
            ...p,
            curp: p.documentoIdentidad || p.curp || '',
            estadoClinico: p.estadoClinico || 'estable',
            estadoArchivo: p.estado || p.estadoArchivo || 'activo',
            servicioArea: p.servicioArea || (p.detallesInstitucion?.internamiento?.enCama ? 'Hospitalización' : 'Medicina General'),
            medicoTratante: p.medicoTratante || 'Dr. Rodrigo Palma',
            ubicacion: p.ubicacion || (p.detallesInstitucion?.internamiento?.pabellon || 'Consulta Externa')
          }));
        }
      }

      const resPolizas = await apiClient('/polizas');
      if (resPolizas.ok) {
        const dataPol = await resPolizas.json();
        if (Array.isArray(dataPol.items) && dataPol.items.length > 0) {
          this.polizas = dataPol.items;
        }
      }

      this.sincronizado = true;
      this.notify();
    } catch (err) {
      console.warn('Operando en modo de respaldo local offline:', err.message);
    }
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

  getPolizasFiltradas() {
    const q = this.filtroPolizaTexto.toLowerCase().trim();
    if (!q) return this.polizas;

    return this.polizas.filter(p =>
      p.idPoliza.toLowerCase().includes(q) ||
      (p.aseguradora?.nombreEmpresa || '').toLowerCase().includes(q) ||
      (p.cobertura || '').toLowerCase().includes(q) ||
      (p.pacienteNombre || '').toLowerCase().includes(q) ||
      (p.expediente || '').toLowerCase().includes(q)
    );
  }

  getKPIs() {
    const total = this.pacientes.filter(p => p.estadoArchivo === 'activo').length;
    const internados = this.pacientes.filter(p => p.detallesInstitucion?.internamiento?.enCama && p.estadoArchivo === 'activo').length;
    const criticos = this.pacientes.filter(p => (p.estadoClinico === 'critico' || p.estadoClinico === 'observacion') && p.estadoArchivo === 'activo').length;
    const medGeneral = this.pacientes.filter(p => p.servicioArea === 'Medicina General' && p.estadoArchivo === 'activo').length;
    const labsPendientes = this.laboratorios.filter(l => l.estado === 'En proceso').length;
    const totalPolizas = this.polizas.length;
    const polizasVigentes = this.polizas.filter(p => p.estado === 'vigente').length;
    const pacientesAsegurados = this.pacientes.filter(p => p.detallesInstitucion?.seguro && p.estadoArchivo === 'activo').length;

    return { total, internados, criticos, medGeneral, labsPendientes, totalPolizas, polizasVigentes, pacientesAsegurados };
  }

  setFiltroPolizaTexto(texto) {
    this.filtroPolizaTexto = texto;
    this.notify();
  }

  async agregarPoliza(nuevaPoliza) {
    try {
      const res = await apiClient('/polizas', {
        method: 'POST',
        body: JSON.stringify(nuevaPoliza)
      });
      if (res.ok) {
        const guardada = await res.json();
        this.polizas.unshift(guardada);
      } else {
        this.polizas.unshift(nuevaPoliza);
      }
    } catch {
      this.polizas.unshift(nuevaPoliza);
    }

    if (nuevaPoliza.pacienteId) {
      await this.asociarPolizaAPaciente(nuevaPoliza.idPoliza, nuevaPoliza.pacienteId);
    } else {
      this.notify();
    }
  }

  async asociarPolizaAPaciente(polizaIdentificador, pacienteId) {
    try {
      await apiClient(`/polizas/${encodeURIComponent(polizaIdentificador)}/asociar`, {
        method: 'POST',
        body: JSON.stringify({ pacienteId })
      });
    } catch (err) {
      console.warn('Asociación remota no completada, aplicando localmente:', err.message);
    }

    const poliza = this.polizas.find(p => p.idPoliza === polizaIdentificador || p.id === polizaIdentificador);
    const paciente = this.pacientes.find(p => p.id === pacienteId || p.expediente === pacienteId);

    if (poliza && paciente) {
      poliza.pacienteId = paciente.id;
      poliza.expediente = paciente.expediente;
      poliza.pacienteNombre = `${paciente.nombre} ${paciente.apellidos}`;

      if (!paciente.detallesInstitucion) {
        paciente.detallesInstitucion = {};
      }
      paciente.detallesInstitucion.seguro = {
        aseguradora: poliza.aseguradora.nombreEmpresa,
        poliza: poliza.idPoliza,
        cobertura: poliza.porcentajeCobertura
      };
      paciente.polizaSeguro = {
        idPoliza: poliza.idPoliza,
        cobertura: poliza.cobertura,
        porcentajeCobertura: poliza.porcentajeCobertura,
        fechaInicio: poliza.fechaInicio,
        fechaVencimiento: poliza.fechaVencimiento,
        estado: poliza.estado,
        aseguradora: { ...poliza.aseguradora }
      };

      this.notify();
      return true;
    }
    return false;
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

  async agregarPaciente(nuevoPaciente) {
    try {
      const res = await apiClient('/pacientes', {
        method: 'POST',
        body: JSON.stringify(nuevoPaciente)
      });
      if (res.ok) {
        const guardado = await res.json();
        const normalizado = {
          ...nuevoPaciente,
          ...guardado,
          curp: guardado.documentoIdentidad || nuevoPaciente.curp,
          estadoArchivo: 'activo'
        };
        this.pacientes.unshift(normalizado);
        this.notify();
        return normalizado;
      }
    } catch (err) {
      console.warn('Persistencia remota en MongoDB no completada, almacenando localmente:', err.message);
    }

    this.pacientes.unshift(nuevoPaciente);
    this.notify();
    return nuevoPaciente;
  }

  actualizarPaciente(id, datosActualizados) {
    const idx = this.pacientes.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.pacientes[idx] = { ...this.pacientes[idx], ...datosActualizados };
      this.notify();
    }
  }

  async archivarPaciente(id, motivo) {
    try {
      await apiClient(`/pacientes/${encodeURIComponent(id)}/archivar`, {
        method: 'PATCH',
        body: JSON.stringify({ motivo })
      });
    } catch (err) {
      console.warn('Archivado remoto no completado, archivando localmente:', err.message);
    }

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
