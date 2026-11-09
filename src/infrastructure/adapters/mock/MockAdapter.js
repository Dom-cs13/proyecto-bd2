import { HistorialRepository } from '../../../domain/ports/HistorialRepository.js';
import { Conflicto, NoEncontrado } from '../../../domain/errores.js';

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
    const id = String(this.contador++);
    const nuevo = {
      id,
      documento: datos.documento ?? null,
      documentoIdentidad: datos.documentoIdentidad ?? datos.documento ?? null,
      nombres: datos.nombres ?? datos.nombre ?? '',
      nombre: datos.nombres ?? datos.nombre ?? '',
      apellidos: datos.apellidos,
      fechaNacimiento: datos.fechaNacimiento,
      sexo: datos.sexo ?? 'M',
      telefono: datos.telefono ?? null,
      correo: datos.correo ?? null,
      direccion: datos.direccion ?? null,
      detallesInstitucion: datos.detallesInstitucion ?? {},
    };

    this.pacientes.set(id, nuevo);
    this.historiales.set(id, {
      id: `h-${id}`,
      pacienteId: id,
      estado: 'activo',
      fechaCreacion: new Date().toISOString(),
      fechaArchivo: null,
      motivoArchivo: null,
    });

    return nuevo;
  }

  async obtenerPaciente(id) {
    return this.pacientes.get(String(id)) ?? null;
  }

  async listarPacientes(filtro = {}) {
    let items = Array.from(this.pacientes.values());
    const texto = filtro.texto?.trim().toLowerCase();
    const doc = filtro.documento?.trim();
    const estado = filtro.estado?.trim();

    if (texto) {
      items = items.filter((p) =>
        p.nombres.toLowerCase().includes(texto) ||
        p.apellidos.toLowerCase().includes(texto) ||
        (p.documento && p.documento.includes(texto)),
      );
    }

    if (doc) {
      items = items.filter((p) => p.documento === doc || p.documentoIdentidad === doc);
    }

    if (estado) {
      items = items.filter((p) => {
        const hist = this.historiales.get(p.id);
        return hist?.estado === estado;
      });
    }

    const total = items.length;
    const pagina = Math.max(1, Number(filtro.pagina) || 1);
    const limite = Math.min(100, Math.max(1, Number(filtro.limite) || 10));
    const offset = (pagina - 1) * limite;
    const paginados = items.slice(offset, offset + limite);

    return { items: paginados, total };
  }

  async obtenerHistorial(pacienteId) {
    const paciente = await this.obtenerPaciente(pacienteId);
    if (!paciente) return null;
    const historial = this.historiales.get(String(pacienteId));
    const consultasArr = Array.from(this.consultas.values()).filter((c) => c.pacienteId === String(pacienteId));

    return {
      paciente,
      historial: historial ?? { id: `h-${pacienteId}`, pacienteId, estado: 'activo' },
      consultas: consultasArr,
    };
  }

  async archivarHistorial(pacienteId, motivo) {
    const actual = await this.obtenerHistorial(pacienteId);
    if (!actual) throw new NoEncontrado('PACIENTE_NO_ENCONTRADO');
    if (actual.historial.estado === 'archivado') {
      throw new Conflicto('PACIENTE_ARCHIVADO');
    }

    const ahora = new Date().toISOString();
    const actualizado = {
      ...actual.historial,
      estado: 'archivado',
      fechaArchivo: ahora,
      motivoArchivo: motivo,
    };
    this.historiales.set(String(pacienteId), actualizado);

    return {
      ...actual,
      historial: actualizado,
    };
  }

  async crearConsulta(datos) {
    const id = String(this.contador++);
    const consulta = {
      id,
      pacienteId: String(datos.pacienteId),
      citaId: datos.citaId ? String(datos.citaId) : null,
      usuarioId: datos.usuarioId ? String(datos.usuarioId) : null,
      fecha: new Date().toISOString(),
      motivo: datos.motivo ?? 'Consulta',
      observaciones: datos.observaciones ?? null,
      estado: 'completada',
      diagnosticos: [],
      recetas: [],
      detallesInstitucion: datos.detallesInstitucion ?? {},
    };
    this.consultas.set(id, consulta);
    return consulta;
  }

  async agregarDiagnostico(consultaId, datos) {
    const id = String(this.contador++);
    const diagnostico = {
      id,
      consultaId: String(consultaId),
      descripcion: datos.descripcion,
      observaciones: datos.observaciones ?? null,
      tratamientos: [],
    };
    this.diagnosticos.set(id, diagnostico);
    const consulta = this.consultas.get(String(consultaId));
    if (consulta) consulta.diagnosticos.push(diagnostico);
    return diagnostico;
  }

  async registrarTratamiento(diagnosticoId, datos) {
    const id = String(this.contador++);
    const tratamiento = {
      id,
      diagnosticoId: String(diagnosticoId),
      descripcion: datos.descripcion,
      fechaInicio: datos.fechaInicio ?? new Date().toISOString().slice(0, 10),
      fechaFin: datos.fechaFin ?? null,
      estado: datos.estado ?? 'activo',
      observaciones: datos.observaciones ?? null,
    };
    this.tratamientos.set(id, tratamiento);
    const diag = this.diagnosticos.get(String(diagnosticoId));
    if (diag) diag.tratamientos.push(tratamiento);
    return tratamiento;
  }

  async recetarMedicamento(consultaId, datos) {
    const id = String(this.contador++);
    const receta = {
      id,
      consultaId: String(consultaId),
      fecha: new Date().toISOString(),
      indicacionesGenerales: datos.indicacionesGenerales ?? null,
      medicamentos: datos.medicamentos ?? [],
    };
    this.recetas.set(id, receta);
    const consulta = this.consultas.get(String(consultaId));
    if (consulta) consulta.recetas.push(receta);
    return receta;
  }

  async ping() {
    return {
      ok: true,
      motor: 'mock',
      latenciaMs: 1,
    };
  }
}
