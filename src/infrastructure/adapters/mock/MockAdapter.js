/**
 * @file MockAdapter.js
 * Adaptador en memoria para pruebas unitarias y de contrato de Fase 1.
 * Implementa el puerto HistorialRepository sin dependencias externas.
 */

import { HistorialRepository } from '../../../domain/ports/HistorialRepository.js';
import { NoEncontrado, Conflicto } from '../../../domain/errores.js';
import { randomUUID } from 'node:crypto';

export class MockAdapter extends HistorialRepository {
  constructor() {
    super();
    this.pacientes = new Map();
    this.consultas = new Map();
  }

  async crearPaciente(datos) {
    const docId = String(datos.documentoIdentidad || datos.cui || '');
    for (const p of this.pacientes.values()) {
      if (p.documentoIdentidad === docId) {
        throw new Conflicto('PACIENTE_DUPLICADO', `Ya existe un paciente con documento ${docId}`);
      }
    }

    const id = datos.id || randomUUID();
    const ahora = new Date().toISOString();
    const paciente = {
      id: String(id),
      documentoIdentidad: docId,
      nombre: datos.nombre,
      apellidos: datos.apellidos,
      fechaNacimiento: datos.fechaNacimiento?.slice(0, 10) || '2000-01-01',
      genero: datos.genero || 'Otro',
      tipoSangre: datos.tipoSangre || 'O+',
      telefono: datos.telefono || '',
      correo: datos.correo || '',
      direccion: datos.direccion || '',
      alergias: Array.isArray(datos.alergias) ? datos.alergias : [],
      activo: datos.activo !== false,
      motivoBaja: datos.motivoBaja || null,
      fechaBaja: datos.fechaBaja || null,
      detallesInstitucion: datos.detallesInstitucion || {},
      createdAt: ahora,
      updatedAt: ahora,
    };

    this.pacientes.set(paciente.id, paciente);
    return JSON.parse(JSON.stringify(paciente));
  }

  async obtenerPaciente(id) {
    const p = this.pacientes.get(String(id));
    return p ? JSON.parse(JSON.stringify(p)) : null;
  }

  async listarPacientes(filtro = {}) {
    let lista = Array.from(this.pacientes.values());

    if (filtro.documento) {
      lista = lista.filter((p) => p.documentoIdentidad === filtro.documento);
    }
    if (filtro.estado === 'activo') {
      lista = lista.filter((p) => p.activo === true);
    } else if (filtro.estado === 'archivado') {
      lista = lista.filter((p) => p.activo === false);
    }
    if (filtro.texto) {
      const t = filtro.texto.toLowerCase();
      lista = lista.filter(
        (p) =>
          p.nombre.toLowerCase().includes(t) ||
          p.apellidos.toLowerCase().includes(t) ||
          p.documentoIdentidad.includes(t)
      );
    }

    const total = lista.length;
    const pagina = Math.max(1, filtro.pagina || 1);
    const limite = Math.max(1, filtro.limite || 50);
    const inicio = (pagina - 1) * limite;
    const items = lista.slice(inicio, inicio + limite).map((p) => JSON.parse(JSON.stringify(p)));

    return { items, total };
  }

  async obtenerHistorial(pacienteId) {
    const p = await this.obtenerPaciente(pacienteId);
    if (!p) {
      throw new NoEncontrado('PACIENTE_NO_ENCONTRADO', `Paciente ${pacienteId} no encontrado`);
    }

    const consultas = Array.from(this.consultas.values())
      .filter((c) => c.pacienteId === String(pacienteId))
      .map((c) => JSON.parse(JSON.stringify(c)));

    return {
      paciente: p,
      estado: p.activo ? 'activo' : 'archivado',
      fechaArchivo: p.fechaBaja || null,
      motivoArchivo: p.motivoBaja
        ? { tipo: 'administrativo', detalle: p.motivoBaja }
        : null,
      consultas,
    };
  }

  async archivarHistorial(pacienteId, motivo) {
    const p = this.pacientes.get(String(pacienteId));
    if (!p) {
      throw new NoEncontrado('PACIENTE_NO_ENCONTRADO', `Paciente ${pacienteId} no encontrado`);
    }

    const ahora = new Date().toISOString();
    const detalle = typeof motivo === 'string' ? motivo : motivo?.detalle || motivo?.tipo || 'Archivado';
    p.activo = false;
    p.motivoBaja = detalle;
    p.fechaBaja = ahora;
    p.updatedAt = ahora;

    return this.obtenerHistorial(pacienteId);
  }

  async crearConsulta(datos) {
    const pacienteId = String(datos.pacienteId);
    const p = await this.obtenerPaciente(pacienteId);
    if (!p) {
      throw new NoEncontrado('PACIENTE_NO_ENCONTRADO', `Paciente ${pacienteId} no encontrado`);
    }

    const id = datos.id || randomUUID();
    const ahora = new Date().toISOString();
    const consulta = {
      id: String(id),
      pacienteId,
      fecha: datos.fecha || ahora,
      motivo: datos.motivo || '',
      medico: datos.medico || '',
      observaciones: datos.observaciones || '',
      diagnosticos: [],
      recetas: [],
      createdAt: ahora,
    };

    this.consultas.set(consulta.id, consulta);
    return JSON.parse(JSON.stringify(consulta));
  }

  async agregarDiagnostico(consultaId, datos) {
    const consulta = this.consultas.get(String(consultaId));
    if (!consulta) {
      throw new NoEncontrado('CONSULTA_NO_ENCONTRADA', `Consulta ${consultaId} no encontrada`);
    }

    const id = datos.id || randomUUID();
    const diag = {
      id: String(id),
      codigoCie: datos.codigoCie || '',
      descripcion: datos.descripcion || '',
      tratamientos: [],
    };

    consulta.diagnosticos.push(diag);
    return JSON.parse(JSON.stringify(diag));
  }

  async registrarTratamiento(diagnosticoId, datos) {
    let diagEncontrado = null;
    for (const c of this.consultas.values()) {
      const d = c.diagnosticos.find((x) => x.id === String(diagnosticoId));
      if (d) {
        diagEncontrado = d;
        break;
      }
    }

    if (!diagEncontrado) {
      throw new NoEncontrado('DIAGNOSTICO_NO_ENCONTRADO', `Diagnóstico ${diagnosticoId} no encontrado`);
    }

    const id = datos.id || randomUUID();
    const trat = {
      id: String(id),
      descripcion: datos.descripcion || '',
      diasDuracion: Number(datos.diasDuracion) || 1,
      fechaInicio: datos.fechaInicio || new Date().toISOString().slice(0, 10),
      fechaFin: datos.fechaFin || null,
    };

    diagEncontrado.tratamientos.push(trat);
    return JSON.parse(JSON.stringify(trat));
  }

  async recetarMedicamento(consultaId, datos) {
    const consulta = this.consultas.get(String(consultaId));
    if (!consulta) {
      throw new NoEncontrado('CONSULTA_NO_ENCONTRADA', `Consulta ${consultaId} no encontrada`);
    }

    const id = datos.id || randomUUID();
    const ahora = new Date().toISOString();
    const receta = {
      id: String(id),
      medicamentos: Array.isArray(datos.medicamentos) ? datos.medicamentos : (datos.detalles || []),
      fechaEmision: datos.fechaEmision || ahora,
    };

    consulta.recetas.push(receta);
    return JSON.parse(JSON.stringify(receta));
  }

  async ping() {
    return {
      ok: true,
      motor: 'mock',
      latenciaMs: 1,
    };
  }
}
