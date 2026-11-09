import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { crearApp } from '../../src/app.js';

// Impide conexiones reales
vi.mock('../../src/infrastructure/adapters/mariadb/connection.js', () => ({
  crearPoolMariaDb: vi.fn(() => { throw new Error('Conexión real prohibida en tests'); }),
}));

const clave = 'clave-ficticia-clinica-pediatria-i4-08';
const consulta = { id: '5', pacienteId: '10', motivo: 'Control de 2 años', estado: 'completada' };
const diagnostico = { id: '3', consultaId: '5', descripcion: 'Faringitis leve' };
const tratamiento = { id: '4', diagnosticoId: '3', descripcion: 'Hidratación oral', fechaInicio: '2026-03-01' };
const receta = { id: '8', consultaId: '5', medicamentos: [{ medicamentoId: '1', dosis: '5ml', frecuencia: 'cada 8h' }] };
const controlCrecimiento = {
  id: '2',
  pacienteId: '10',
  consultaId: '5',
  fecha: '2026-03-01',
  pesoKg: 12.5,
  tallaCm: 88.0,
  perimetroCefalicoCm: 48.5,
};
const vacuna = {
  id: '9',
  pacienteId: '10',
  vacunaId: '1',
  numeroDosis: 1,
  fechaAplicacion: '2026-03-01',
  lote: 'L-BCG-2026',
};

const historialActivo = {
  paciente: { id: '10', nombres: 'Mateo', apellidos: 'Morales' },
  historial: { estado: 'activo' },
  consultas: [],
};

function token(rol = 'pediatra') {
  return jwt.sign({ institucion: 'pediatria', rol }, clave, {
    subject: '1',
    expiresIn: '1h',
    issuer: 'red-salud',
    audience: 'red-salud-web',
  });
}

describe('I4-08 · HTTP Operaciones Clínicas Pediatría', () => {
  let repo;
  let resolver;
  let app;

  beforeEach(() => {
    repo = {
      obtenerHistorial: vi.fn().mockResolvedValue(historialActivo),
      crearConsulta: vi.fn().mockResolvedValue(consulta),
      agregarDiagnostico: vi.fn().mockResolvedValue(diagnostico),
      registrarTratamiento: vi.fn().mockResolvedValue(tratamiento),
      recetarMedicamento: vi.fn().mockResolvedValue(receta),
      registrarControlCrecimiento: vi.fn().mockResolvedValue(controlCrecimiento),
      registrarVacunaAplicada: vi.fn().mockResolvedValue(vacuna),
      obtenerCatalogos: vi.fn().mockResolvedValue({
        vacunas: [{ id: '1', nombre: 'BCG' }],
        medicamentos: [{ id: '1', nombre: 'Amoxicilina' }],
        alergias: [{ id: '1', nombre: 'Penicilina' }],
      }),
      ping: vi.fn().mockResolvedValue({ ok: true, motor: 'mariadb', latenciaMs: 4 }),
    };
    resolver = vi.fn(() => repo);
    app = crearApp({ pediatria: { obtenerRepositorio: resolver, obtenerClave: () => clave } });
  });

  afterEach(() => vi.unstubAllEnvs());

  const auth = (req, rol = 'pediatra') => req.set('Authorization', `Bearer ${token(rol)}`);

  it('permite a un pediatra crear consulta', async () => {
    const res = await auth(request(app).post('/consultas')).send({
      pacienteId: '10',
      motivo: 'Control de rutina',
    });
    expect(res.status).toBe(201);
    expect(repo.crearConsulta).toHaveBeenCalledOnce();
  });

  it('bloquea creación de consulta a recepcion o enfermeria (403)', async () => {
    const resEnf = await auth(request(app).post('/consultas'), 'enfermeria').send({
      pacienteId: '10',
      motivo: 'Control',
    });
    expect(resEnf.status).toBe(403);
  });

  it('permite a un pediatra agregar diagnóstico', async () => {
    const res = await auth(request(app).post('/consultas/5/diagnosticos')).send({
      descripcion: 'Faringitis leve',
    });
    expect(res.status).toBe(201);
    expect(repo.agregarDiagnostico).toHaveBeenCalledWith('5', { descripcion: 'Faringitis leve' });
  });

  it('permite a un pediatra registrar tratamiento', async () => {
    const res = await auth(request(app).post('/diagnosticos/3/tratamientos')).send({
      descripcion: 'Hidratación oral y reposo',
      fechaInicio: '2026-03-01',
    });
    expect(res.status).toBe(201);
    expect(repo.registrarTratamiento).toHaveBeenCalledOnce();
  });

  it('permite a un pediatra recetar medicamentos', async () => {
    const res = await auth(request(app).post('/consultas/5/recetas')).send({
      medicamentos: [{ medicamentoId: '1', dosis: '5ml', frecuencia: 'cada 8 horas' }],
    });
    expect(res.status).toBe(201);
    expect(repo.recetarMedicamento).toHaveBeenCalledOnce();
  });

  it('permite registrar control antropométrico de crecimiento a enfermería y pediatra', async () => {
    const resEnf = await auth(request(app).post('/pacientes/10/crecimiento'), 'enfermeria').send({
      pesoKg: 12.5,
      tallaCm: 88.0,
      perimetroCefalicoCm: 48.5,
    });
    expect(resEnf.status).toBe(201);
    expect(repo.registrarControlCrecimiento).toHaveBeenCalledOnce();

    const resPed = await auth(request(app).post('/pacientes/10/crecimiento'), 'pediatra').send({
      pesoKg: 13.0,
    });
    expect(resPed.status).toBe(201);
  });

  it('permite registrar dosis de vacuna aplicada a enfermería y pediatra', async () => {
    const resEnf = await auth(request(app).post('/pacientes/10/vacunas'), 'enfermeria').send({
      vacunaId: '1',
      numeroDosis: 1,
      fechaAplicacion: '2026-03-01',
      lote: 'L-BCG-2026',
    });
    expect(resEnf.status).toBe(201);
    expect(repo.registrarVacunaAplicada).toHaveBeenCalledOnce();
  });

  it('bloquea registro de crecimiento en paciente archivado (409)', async () => {
    repo.obtenerHistorial.mockResolvedValueOnce({
      ...historialActivo,
      historial: { estado: 'archivado' },
    });
    const res = await auth(request(app).post('/pacientes/10/crecimiento'), 'enfermeria').send({
      pesoKg: 12.5,
    });
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('PACIENTE_ARCHIVADO');
  });

  it('bloquea registro de vacuna en paciente archivado (409)', async () => {
    repo.obtenerHistorial.mockResolvedValueOnce({
      ...historialActivo,
      historial: { estado: 'archivado' },
    });
    const res = await auth(request(app).post('/pacientes/10/vacunas'), 'enfermeria').send({
      vacunaId: '1',
      numeroDosis: 1,
      fechaAplicacion: '2026-03-01',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('PACIENTE_ARCHIVADO');
  });

  it('permite consultar catálogos clínicos a cualquier rol pediátrico', async () => {
    const res = await auth(request(app).get('/pediatria/catalogos'), 'recepcion');
    expect(res.status).toBe(200);
    expect(res.body.vacunas).toHaveLength(1);
    expect(res.body.medicamentos).toHaveLength(1);
  });

  it('permite consultar estado del servicio (ping)', async () => {
    const res = await auth(request(app).get('/pediatria/status'), 'enfermeria');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.motor).toBe('mariadb');
  });
});
