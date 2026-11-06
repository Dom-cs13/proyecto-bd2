import {
  MOCK_PACIENTES,
  MOCK_LABORATORIOS,
  MOCK_POLIZAS,
  MOCK_DOCTORES,
  MOCK_UNIDADES_LABORATORIO,
  MOCK_TIPOS_EXAMENES,
} from './api/mockData.js';
import { apiClient } from '../../shared/js/api/client.js';

class StateStore {
  constructor() {
    this.pacientes = [...MOCK_PACIENTES];
    this.laboratorios = [...MOCK_LABORATORIOS];
    this.polizas = [...MOCK_POLIZAS];
    this.doctores = [...MOCK_DOCTORES];
    this.unidadesLaboratorio = [...MOCK_UNIDADES_LABORATORIO];
    this.tiposExamenes = [...MOCK_TIPOS_EXAMENES];

    this.filtroTexto = '';
    this.filtroArea = 'Todos'; // 'Todos' | 'Hospitalización' | 'Medicina General' | 'Críticos'
    this.filtroLabTexto = '';
    this.filtroLabUnidad = 'todos';
    this.filtroLabSubtab = 'ordenes'; // 'ordenes' | 'unidades' | 'catalogo' | 'pacientes'
    this.filtroLabUnidadTexto = '';
    this.filtroLabExamenTexto = '';
    this.filtroPolizaTexto = '';
    this.filtroDoctorTexto = '';
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

      const resDoctores = await apiClient('/doctores');
      if (resDoctores.ok) {
        const dataDoc = await resDoctores.json();
        if (Array.isArray(dataDoc.items) && dataDoc.items.length > 0) {
          this.doctores = dataDoc.items;
        }
      }

      const resLabs = await apiClient('/laboratorios');
      if (resLabs.ok) {
        const dataLabs = await resLabs.json();
        if (Array.isArray(dataLabs.items) && dataLabs.items.length > 0) {
          this.unidadesLaboratorio = dataLabs.items;
        }
      }

      const resCat = await apiClient('/laboratorios/catalogo-examenes');
      if (resCat.ok) {
        const dataCat = await resCat.json();
        if (Array.isArray(dataCat.items) && dataCat.items.length > 0) {
          this.tiposExamenes = dataCat.items;
        }
      }

      const resOrd = await apiClient('/laboratorios/ordenes');
      if (resOrd.ok) {
        const dataOrd = await resOrd.json();
        if (Array.isArray(dataOrd.items) && dataOrd.items.length > 0) {
          this.laboratorios = dataOrd.items;
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
    return this.laboratorios.filter(l => {
      const coincideTexto = !q || (
        l.codigoOrden.toLowerCase().includes(q) ||
        l.pacienteNombre.toLowerCase().includes(q) ||
        l.expediente.toLowerCase().includes(q) ||
        l.tipoExamen.toLowerCase().includes(q) ||
        (l.laboratorioNombre || '').toLowerCase().includes(q) ||
        l.solicitante.toLowerCase().includes(q)
      );

      let coincideUnidad = true;
      if (this.filtroLabUnidad && this.filtroLabUnidad !== 'todos') {
        coincideUnidad = l.laboratorioId === this.filtroLabUnidad ||
                         l.laboratorioCodigo === this.filtroLabUnidad ||
                         l.laboratorioNombre === this.filtroLabUnidad;
      }

      return coincideTexto && coincideUnidad;
    });
  }

  getUnidadesLaboratorioFiltradas() {
    const q = this.filtroLabUnidadTexto.toLowerCase().trim();
    if (!q) return this.unidadesLaboratorio;

    return this.unidadesLaboratorio.filter(u =>
      u.nombre.toLowerCase().includes(q) ||
      u.codigo.toLowerCase().includes(q) ||
      u.tipo.toLowerCase().includes(q) ||
      u.responsable.toLowerCase().includes(q) ||
      u.ubicacion.toLowerCase().includes(q)
    );
  }

  getTiposExamenesFiltrados() {
    const q = this.filtroLabExamenTexto.toLowerCase().trim();
    return this.tiposExamenes.filter(ex => {
      const coincideTexto = !q || (
        ex.nombre.toLowerCase().includes(q) ||
        ex.codigoExamen.toLowerCase().includes(q) ||
        ex.categoria.toLowerCase().includes(q) ||
        ex.laboratorioNombre.toLowerCase().includes(q) ||
        ex.tipoMuestra.toLowerCase().includes(q)
      );

      let coincideLab = true;
      if (this.filtroLabUnidad && this.filtroLabUnidad !== 'todos') {
        coincideLab = ex.laboratorioId === this.filtroLabUnidad ||
                      ex.laboratorioCodigo === this.filtroLabUnidad ||
                      ex.laboratorioNombre === this.filtroLabUnidad;
      }

      return coincideTexto && coincideLab;
    });
  }

  getPacientesPorLaboratorio() {
    // Mapeo detallado de qué pacientes están asociados a uno o varios laboratorios
    const mapPacientes = {};

    this.laboratorios.forEach(ord => {
      const pacId = ord.pacienteId || ord.expediente;
      if (!mapPacientes[pacId]) {
        const pacienteBase = this.pacientes.find(p => p.id === ord.pacienteId || p.expediente === ord.expediente);
        mapPacientes[pacId] = {
          pacienteId: ord.pacienteId,
          pacienteNombre: ord.pacienteNombre,
          expediente: ord.expediente,
          ubicacion: pacienteBase?.ubicacion || 'Consulta Externa',
          estadoClinico: pacienteBase?.estadoClinico || 'estable',
          laboratorios: {},
          ordenes: []
        };
      }

      const labKey = ord.laboratorioNombre || 'Laboratorio General';
      if (!mapPacientes[pacId].laboratorios[labKey]) {
        mapPacientes[pacId].laboratorios[labKey] = {
          nombre: labKey,
          totalExamenes: 0,
          examenes: []
        };
      }

      mapPacientes[pacId].laboratorios[labKey].totalExamenes++;
      mapPacientes[pacId].laboratorios[labKey].examenes.push(ord.tipoExamen);
      mapPacientes[pacId].ordenes.push(ord);
    });

    return Object.values(mapPacientes).map(p => ({
      ...p,
      listaLaboratorios: Object.values(p.laboratorios),
      totalLaboratoriosAsociados: Object.keys(p.laboratorios).length,
      totalOrdenes: p.ordenes.length
    }));
  }

  setFiltroLabSubtab(subtab) {
    this.filtroLabSubtab = subtab;
    this.notify();
  }

  setFiltroLabUnidad(unidad) {
    this.filtroLabUnidad = unidad;
    this.notify();
  }

  setFiltroLabUnidadTexto(texto) {
    this.filtroLabUnidadTexto = texto;
    this.notify();
  }

  setFiltroLabExamenTexto(texto) {
    this.filtroLabExamenTexto = texto;
    this.notify();
  }

  async agregarUnidadLaboratorio(nuevaUnidad) {
    try {
      const res = await apiClient('/laboratorios', {
        method: 'POST',
        body: JSON.stringify(nuevaUnidad)
      });
      if (res.ok) {
        const guardado = await res.json();
        this.unidadesLaboratorio.unshift(guardado);
        this.notify();
        return guardado;
      }
    } catch (err) {
      console.warn('Persistencia remota de laboratorio no completada, guardando local:', err.message);
    }

    this.unidadesLaboratorio.unshift(nuevaUnidad);
    this.notify();
    return nuevaUnidad;
  }

  async agregarTipoExamen(nuevoExamen) {
    try {
      const res = await apiClient('/laboratorios/catalogo-examenes', {
        method: 'POST',
        body: JSON.stringify(nuevoExamen)
      });
      if (res.ok) {
        const guardado = await res.json();
        this.tiposExamenes.unshift(guardado);
        this.notify();
        return guardado;
      }
    } catch (err) {
      console.warn('Persistencia remota de tipo de examen no completada, guardando local:', err.message);
    }

    this.tiposExamenes.unshift(nuevoExamen);
    this.notify();
    return nuevoExamen;
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

  getDoctoresFiltrados() {
    const q = this.filtroDoctorTexto.toLowerCase().trim();
    if (!q) return this.doctores;

    return this.doctores.filter(d =>
      `${d.nombre} ${d.apellidos}`.toLowerCase().includes(q) ||
      (d.especialidad || '').toLowerCase().includes(q) ||
      (d.idColegiado || '').toLowerCase().includes(q) ||
      (d.correo || '').toLowerCase().includes(q)
    );
  }

  getKPIs() {
    const total = this.pacientes.filter(p => p.estadoArchivo === 'activo').length;
    const internados = this.pacientes.filter(p => p.detallesInstitucion?.internamiento?.enCama && p.estadoArchivo === 'activo').length;
    const criticos = this.pacientes.filter(p => (p.estadoClinico === 'critico' || p.estadoClinico === 'observacion') && p.estadoArchivo === 'activo').length;
    const medGeneral = this.pacientes.filter(p => p.servicioArea === 'Medicina General' && p.estadoArchivo === 'activo').length;
    const labsPendientes = this.laboratorios.filter(l => l.estado === 'En proceso').length;
    const labsCompletados = this.laboratorios.filter(l => l.estado === 'Completado').length;
    const totalOrdenesLab = this.laboratorios.length;
    const totalUnidadesLab = this.unidadesLaboratorio.length;
    const totalTiposExamenes = this.tiposExamenes.length;
    const totalPolizas = this.polizas.length;
    const polizasVigentes = this.polizas.filter(p => p.estado === 'vigente').length;
    const pacientesAsegurados = this.pacientes.filter(p => p.detallesInstitucion?.seguro && p.estadoArchivo === 'activo').length;
    const totalDoctores = this.doctores.length;
    const doctoresActivos = this.doctores.filter(d => d.estado === 'activo' || d.estado === 'de turno').length;

    return {
      total,
      internados,
      criticos,
      medGeneral,
      labsPendientes,
      labsCompletados,
      totalOrdenesLab,
      totalUnidadesLab,
      totalTiposExamenes,
      totalPolizas,
      polizasVigentes,
      pacientesAsegurados,
      totalDoctores,
      doctoresActivos,
    };
  }

  setFiltroDoctorTexto(texto) {
    this.filtroDoctorTexto = texto;
    this.notify();
  }

  async agregarDoctor(nuevoDoctor) {
    try {
      const res = await apiClient('/doctores', {
        method: 'POST',
        body: JSON.stringify(nuevoDoctor)
      });
      if (res.ok) {
        const guardado = await res.json();
        this.doctores.unshift(guardado);
        this.notify();
        return guardado;
      }
    } catch (err) {
      console.warn('Persistencia de doctor no completada, guardando local:', err.message);
    }

    this.doctores.unshift(nuevoDoctor);
    this.notify();
    return nuevoDoctor;
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

  async agregarOrdenLaboratorio(nuevaOrden) {
    try {
      const res = await apiClient('/laboratorios/ordenes', {
        method: 'POST',
        body: JSON.stringify(nuevaOrden)
      });
      if (res.ok) {
        const guardada = await res.json();
        this.laboratorios.unshift(guardada);
        this.notify();
        return guardada;
      }
    } catch (err) {
      console.warn('Persistencia remota de orden no completada, guardando local:', err.message);
    }

    this.laboratorios.unshift(nuevaOrden);
    this.notify();
    return nuevaOrden;
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
