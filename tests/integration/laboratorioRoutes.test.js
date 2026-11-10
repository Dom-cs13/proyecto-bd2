import { configurarCuenta } from '../helpers/cuentasConfiguradas.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { crearApp } from '../../src/app.js';
import { FirestoreAdapter } from '../../src/infrastructure/adapters/firestore/FirestoreAdapter.js';
import { LaboratorioFirestoreRepository } from '../../src/infrastructure/adapters/firestore/laboratorioFirestoreRepository.js';
import { registrarRepositorio, registrarLaboratorioRepo } from '../../src/infrastructure/config/RepositoryFactory.js';

describe('Rutas HTTP de Laboratorio Clínico (I3)', () => {
  let app;
  let mockDb;
  let adapter;
  let labRepo;
  let storage;
  let tokenAuth;

  afterEach(() => vi.unstubAllEnvs());
  beforeEach(async () => {
    configurarCuenta('laboratorio', 'laboratorista', 'laboratorista', 'password123');
    app = crearApp();
    storage = {
      pacientes: new Map(),
      ordenes: new Map(),
      muestras: new Map(),
      resultados: new Map(),
    };

    mockDb = {
      collection(nombre) {
        return {
          doc(id) {
            return {
              id,
              async set(data) {
                storage[nombre].set(id, { id, ...data });
              },
              async update(data) {
                const current = storage[nombre].get(id) || {};
                storage[nombre].set(id, { ...current, ...data });
              },
              async get() {
                const item = storage[nombre].get(id);
                return {
                  exists: !!item,
                  id,
                  data: () => item,
                };
              },
              collection(subnombre) {
                return {
                  doc(subId) {
                    return {
                      async set(subData) {
                        storage[nombre].set(`${id}/${subnombre}/${subId}`, { id: subId, ...subData });
                      },
                    };
                  },
                  orderBy() {
                    return {
                      async get() {
                        const items = [];
                        for (const [k, v] of storage[nombre].entries()) {
                          if (k.startsWith(`${id}/${subnombre}/`)) {
                            items.push({ id: v.id, data: () => v });
                          }
                        }
                        return { docs: items };
                      },
                    };
                  },
                };
              },
            };
          },
          where(campo, op, valor) {
            return {
              limit() {
                return {
                  async get() {
                    const match = Array.from(storage[nombre].values()).filter((item) => item[campo] === valor);
                    return {
                      empty: match.length === 0,
                      docs: match.map((m) => ({ id: m.id, data: () => m })),
                    };
                  },
                };
              },
              async get() {
                const match = Array.from(storage[nombre].values()).filter((item) => item[campo] === valor);
                return {
                  empty: match.length === 0,
                  docs: match.map((m) => ({ id: m.id, data: () => m })),
                };
              },
            };
          },
          limit() {
            return {
              async get() {
                return { docs: [] };
              },
            };
          },
          async get() {
            const all = Array.from(storage[nombre].values());
            return {
              docs: all.map((m) => ({ id: m.id, data: () => m })),
            };
          },
        };
      },
      batch() {
        const ops = [];
        return {
          update(ref, data) {
            ops.push(() => ref.update(data));
          },
          async commit() {
            for (const op of ops) await op();
          },
        };
      },
    };

    adapter = new FirestoreAdapter(mockDb);
    labRepo = new LaboratorioFirestoreRepository(mockDb);
    registrarRepositorio('laboratorio', adapter);
    registrarLaboratorioRepo(labRepo);

    const resLogin = await request(app)
      .post('/auth/login')
      .send({
        institucion: 'laboratorio',
        usuario: 'laboratorista',
        password: 'password123',
      });
    tokenAuth = resLogin.body.token;
  });

  describe('Autenticación Laboratorio (/auth/login)', () => {
    it('debe autenticar satisfactoriamente con cuenta de laboratorio provisionada para la prueba', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          institucion: 'laboratorio',
          usuario: 'laboratorista',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');
    });

    it('debe rechazar credenciales vacías con 400', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          institucion: 'laboratorio',
          usuario: '',
          password: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.codigo).toBe('VALIDACION');
    });

    it('debe rechazar contraseña incorrecta con 401', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          institucion: 'laboratorio',
          usuario: 'laboratorista',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.codigo).toBe('NO_AUTENTICADO');
    });
  });

  describe('CRUD de Pacientes e Historial', () => {
    it('debe registrar un paciente y listarlo', async () => {
      const nuevoPaciente = {
        cui: '2987654320101',
        documentoIdentidad: '2987654320101',
        nombre: 'Mariana',
        apellidos: 'Soto Hernández',
        fechaNacimiento: '1992-04-18',
        genero: 'Femenino',
        tipoSangre: 'O+',
        activo: true,
      };

      const resCrear = await request(app)
        .post('/pacientes')
        .set('Authorization', `Bearer ${tokenAuth}`)
        .send(nuevoPaciente);

      expect(resCrear.status).toBe(201);
      expect(resCrear.body.nombre).toBe('Mariana');
      expect(resCrear.body.documentoIdentidad).toBe('2987654320101');

      const resListar = await request(app)
        .get('/pacientes')
        .set('Authorization', `Bearer ${tokenAuth}`);
      expect(resListar.status).toBe(200);
      expect(resListar.body.total).toBe(1);
      expect(resListar.body.items[0].nombre).toBe('Mariana');
    });

    it('debe obtener paciente por ID y responder 404 si no existe', async () => {
      const res = await request(app)
        .get('/pacientes/inexistente-123')
        .set('Authorization', `Bearer ${tokenAuth}`);
      expect(res.status).toBe(404);
      expect(res.body.error.codigo).toBe('PACIENTE_NO_ENCONTRADO');
    });

    it('debe archivar un paciente con motivo formal', async () => {
      await adapter.crearPaciente({
        id: 'pac-001',
        cui: '1111222233334',
        documentoIdentidad: '1111222233334',
        nombre: 'Pedro',
        apellidos: 'Gómez',
        fechaNacimiento: '1990-01-01',
        genero: 'Masculino',
        activo: true,
      });

      const resArchivar = await request(app)
        .patch('/pacientes/pac-001/archivar')
        .set('Authorization', `Bearer ${tokenAuth}`)
        .send({ motivo: 'Traslado a otra institución' });

      expect(resArchivar.status).toBe(200);
      expect(resArchivar.body.estado).toBe('archivado');
    });
  });

  describe('Órdenes, Muestras y Resultados Especializados', () => {
    beforeEach(async () => {
      await adapter.crearPaciente({ id: 'pac-001', documentoIdentidad: 'PACIENTE-FICTICIO', nombre: 'Paciente', apellidos: 'Ficticio', fechaNacimiento: '2000-01-01', genero: 'Otro' });
    });
    it('debe crear y listar órdenes de examen', async () => {
      const res = await request(app)
        .post('/laboratorio/ordenes').set('Authorization', `Bearer ${tokenAuth}`)
        .send({
          id: 'ord-test-01',
          pacienteId: 'pac-001',
          medicoSolicitante: 'Dr. López',
          tipoLaboratorio: 'hematologia',
          examenesSolicitados: [{ codigo: 'HEM-01', nombre: 'Hemograma', tipoLaboratorio: 'hematologia' }],
        });

      expect(res.status).toBe(201);
      expect(res.body.tipoLaboratorio).toBe('hematologia');

      const resListar = await request(app).get('/laboratorio/ordenes').set('Authorization', `Bearer ${tokenAuth}`);
      expect(resListar.status).toBe(200);
      expect(Array.isArray(resListar.body)).toBe(true);
      expect(resListar.body.length).toBeGreaterThanOrEqual(1);
    });

    it('debe registrar muestra y verificar compatibilidad de tipo', async () => {
      // Primero crear orden
      await labRepo.crearOrden({
        id: 'ord-test-02',
        pacienteId: 'pac-001',
        medicoSolicitante: 'Dr. López',
        tipoLaboratorio: 'hematologia',
        examenesSolicitados: [{ codigo: 'HEM-01', nombre: 'Hemograma', tipoLaboratorio: 'hematologia' }],
      });

      const resMuestra = await request(app)
        .post('/laboratorio/muestras').set('Authorization', `Bearer ${tokenAuth}`)
        .send({
          ordenId: 'ord-test-02',
          codigoBarras: 'BAR-HEMATO-01',
          tipoMuestra: 'sangre_venosa',
        });

      expect(resMuestra.status).toBe(201);
      expect(resMuestra.body.codigoBarras).toBe('BAR-HEMATO-01');
    });

    it('debe diagnosticar estado de motor con /laboratorio/status', async () => {
      const res = await request(app).get('/laboratorio/status').set('Authorization', `Bearer ${tokenAuth}`);
      expect(res.status).toBe(200);
      expect(res.body.motor).toBe('firestore');
      expect(res.body.ok).toBe(true);
    });
  });
});
