/**
 * @file MockAdapter.js
 * Adaptador en memoria para pruebas unitarias y de contrato de Fase 1.
 * Implementa el puerto HistorialRepository sin dependencias externas.
 */

import { HistorialRepository } from '../../../domain/ports/HistorialRepository.js';
import { NoEncontrado, Conflicto } from '../../../domain/errores.js';

export class MockAdapter extends HistorialRepository {
  constructor() {
    super();
    this.pacientes = new Map();
    this.historiales = new Map();
    this.consultas = new Map();
    this.diagnosticos = new Map();
    this.tratamientos = new Map();
    this.recetas = new Map();
    this.contador = 1;
  }

  async crearPaciente(datos) {
    const docId = String(datos.documentoIdentidad || datos.documento || datos.cui || '');
    if (docId) {
      for (const p of this.pacientes.values()) {
        if (p.documentoIdentidad === docId || p.documento === docId) {
          throw new Conflicto('PACIENTE_DUPLICADO', `Ya existe un paciente con documento ${docId}`);
        }
      }
    }

    const id = datos.id ? String(datos.id) : String(this.contador++);
    const ahora = new Date().toISOString();
    const nombre = datos.nombres ?? datos.nombre ?? '';
    const paciente = {
      id: String(id),
      documento: docId || null,
      documentoIdentidad: docId || null,
      nombre,
      nombres: nombre,
      apellidos: datos.apellidos,
      fechaNacimiento: datos.fechaNacimiento?.slice(0, 10) || '2000-01-01',
      genero: datos.genero || (datos.sexo === 'F' ? 'Femenino' : datos.sexo === 'M' ? 'Masculino' : 'Otro'),
      sexo: datos.sexo || (datos.genero === 'Femenino' ? 'F' : 'M'),
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
    this.historiales.set(paciente.id, {
      id: `h-${paciente.id}`,
      pacienteId: paciente.id,
      estado: paciente.activo ? 'activo' : 'archivado',
      fechaCreacion: ahora,
      fechaArchivo: paciente.fechaBaja,
      motivoArchivo: paciente.motivoBaja,
    });

    return JSON.parse(JSON.stringify(paciente));
  }

  async obtenerPaciente(id) {
    const p = this.pacientes.get(String(id));
    return p ? JSON.parse(JSON.stringify(p)) : null;
  }

  async listarPacientes(filtro = {}) {
    let lista = Array.from(this.pacientes.values());

    const doc = filtro.documento?.trim();
    if (doc) {
      lista = lista.filter((p) => p.documentoIdentidad === doc || p.documento === doc);
    }
    const estado = filtro.estado?.trim();
    if (estado === 'activo') {
      lista = lista.filter((p) => p.activo === true);
    } else if (estado === 'archivado') {
      lista = lista.filter((p) => p.activo === false);
    }
    const texto = filtro.texto?.trim().toLowerCase();
    if (texto) {
      lista = lista.filter(
        (p) =>
          p.nombre.toLowerCase().includes(texto) ||
          p.nombres.toLowerCase().includes(texto) ||
          p.apellidos.toLowerCase().includes(texto) ||
          (p.documentoIdentidad && p.documentoIdentidad.includes(texto))
      );
    }

    const total = lista.length;
    const pagina = Math.max(1, Number(filtro.pagina) || 1);
    const limite = Math.min(100, Math.max(1, Number(filtro.limite) || 50));
    const inicio = (pagina - 1) * limite;
    const items = lista.slice(inicio, inicio + limite).map((p) => JSON.parse(JSON.stringify(p)));

    return { items, total };
  }

  async obtenerHistorial(pacienteId) {
    const paciente = await this.obtenerPaciente(pacienteId);
    if (!paciente) {
      throw new NoEncontrado('PACIENTE_NO_ENCONTRADO', `Paciente ${pacienteId} no encontrado`);
    }

    const historial = this.historiales.get(String(pacienteId)) || {
      id: `h-${pacienteId}`,
      pacienteId: String(pacienteId),
      estado: paciente.activo ? 'activo' : 'archivado',
      fechaCreacion: new Date().toISOString(),
      fechaArchivo: paciente.fechaBaja,
      motivoArchivo: paciente.motivoBaja,
    };

    const consultasArr = Array.from(this.consultas.values())
      .filter((c) => c.pacienteId === String(pacienteId))
      .map((c) => JSON.parse(JSON.stringify(c)));

    const estado = historial.estado || (paciente.activo ? 'activo' : 'archivado');

    return {
      paciente,
      estado,
      fechaArchivo: historial.fechaArchivo || null,
      motivoArchivo: historial.motivoArchivo || null,
      historial,
      consultas: consultasArr,
    };
  }

  async archivarHistorial(pacienteId, motivo) {
    const paciente = this.pacientes.get(String(pacienteId));
    if (!paciente) {
      throw new NoEncontrado('PACIENTE_NO_ENCONTRADO', `Paciente ${pacienteId} no encontrado`);
    }

    const actual = await this.obtenerHistorial(pacienteId);
    if (actual.estado === 'archivado' || actual.historial.estado === 'archivado' || !paciente.activo) {
      throw new Conflicto('PACIENTE_ARCHIVADO');
    }

    const ahora = new Date().toISOString();
    const detalle = typeof motivo === 'string' ? motivo : motivo?.detalle || motivo?.tipo || 'Archivado';
    paciente.activo = false;
    paciente.motivoBaja = detalle;
    paciente.fechaBaja = ahora;
    paciente.updatedAt = ahora;

    const actualizado = {
      ...actual.historial,
      estado: 'archivado',
      fechaArchivo: ahora,
      motivoArchivo: motivo,
    };
    this.historiales.set(String(pacienteId), actualizado);

    return this.obtenerHistorial(pacienteId);
  }

  async crearConsulta(datos) {
    const pacienteId = String(datos.pacienteId);
    const p = await this.obtenerPaciente(pacienteId);
    if (!p) {
      throw new NoEncontrado('PACIENTE_NO_ENCONTRADO', `Paciente ${pacienteId} no encontrado`);
    }

    const id = datos.id ? String(datos.id) : String(this.contador++);
    const ahora = new Date().toISOString();
    const consulta = {
      id: String(id),
      pacienteId,
      citaId: datos.citaId ? String(datos.citaId) : null,
      usuarioId: datos.usuarioId ? String(datos.usuarioId) : null,
      fecha: datos.fecha || ahora,
      motivo: datos.motivo ?? 'Consulta general',
      medico: datos.medico || '',
      observaciones: datos.observaciones || null,
      estado: 'completada',
      diagnosticos: [],
      recetas: [],
      detallesInstitucion: datos.detallesInstitucion || {},
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

    const id = datos.id ? String(datos.id) : String(this.contador++);
    const diag = {
      id: String(id),
      consultaId: String(consultaId),
      codigoCie: datos.codigoCie || '',
      descripcion: datos.descripcion || '',
      observaciones: datos.observaciones ?? null,
      tratamientos: [],
    };

    this.diagnosticos.set(diag.id, diag);
    consulta.diagnosticos.push(diag);
    return JSON.parse(JSON.stringify(diag));
  }

  async registrarTratamiento(diagnosticoId, datos) {
    const diagEncontrado = this.diagnosticos.get(String(diagnosticoId));
    if (!diagEncontrado) {
      throw new NoEncontrado('DIAGNOSTICO_NO_ENCONTRADO', `Diagnóstico ${diagnosticoId} no encontrado`);
    }

    const id = datos.id ? String(datos.id) : String(this.contador++);
    const trat = {
      id: String(id),
      diagnosticoId: String(diagnosticoId),
      descripcion: datos.descripcion || '',
      diasDuracion: Number(datos.diasDuracion) || 1,
      fechaInicio: datos.fechaInicio || new Date().toISOString().slice(0, 10),
      fechaFin: datos.fechaFin || null,
      estado: datos.estado ?? 'activo',
      observaciones: datos.observaciones ?? null,
    };

    this.tratamientos.set(trat.id, trat);
    diagEncontrado.tratamientos.push(trat);
    return JSON.parse(JSON.stringify(trat));
  }

  async recetarMedicamento(consultaId, datos) {
    const consulta = this.consultas.get(String(consultaId));
    if (!consulta) {
      throw new NoEncontrado('CONSULTA_NO_ENCONTRADA', `Consulta ${consultaId} no encontrada`);
    }

    const id = datos.id ? String(datos.id) : String(this.contador++);
    const ahora = new Date().toISOString();
    const receta = {
      id: String(id),
      consultaId: String(consultaId),
      fecha: datos.fecha || ahora,
      fechaEmision: datos.fechaEmision || ahora,
      indicacionesGenerales: datos.indicacionesGenerales ?? null,
      medicamentos: Array.isArray(datos.medicamentos) ? datos.medicamentos : (datos.detalles || []),
    };

    this.recetas.set(receta.id, receta);
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
