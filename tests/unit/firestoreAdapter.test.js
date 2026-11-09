import { describe, it, expect, beforeEach } from 'vitest';
import { FirestoreAdapter } from '../../src/infrastructure/adapters/firestore/FirestoreAdapter.js';
import { LaboratorioFirestoreRepository } from '../../src/infrastructure/adapters/firestore/laboratorioFirestoreRepository.js';
import { MotorNoDisponible, Conflicto } from '../../src/domain/errores.js';

describe('FirestoreAdapter e HistorialRepository', () => {
  let mockDb;
  let adapter;
  let labRepo;
  let storage;

  beforeEach(() => {
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
                        const key = `${id}/${subnombre}/${subId}`;
                        storage[nombre].set(key, { id: subId, ...subData });
                      },
                    };
                  },
                  orderBy() {
                    return {
                      async get() {
                        const docs = [];
                        for (const [k, v] of storage[nombre].entries()) {
                          if (k.startsWith(`${id}/${subnombre}/`)) {
                            docs.push({ id: v.id, data: () => v });
                          }
                        }
                        return { docs };
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
                    const match = [...storage[nombre].values()].filter((item) => item[campo] === valor);
                    return {
                      empty: match.length === 0,
                      docs: match.map((m) => ({ id: m.id, data: () => m })),
                    };
                  },
                };
              },
              where() {
                return this;
              },
              async get() {
                const match = [...storage[nombre].values()].filter((item) => item[campo] === valor);
                return {
                  empty: match.length === 0,
                  docs: match.map((m) => ({ id: m.id, data: () => m })),
                };
              },
            };
          },
          async get() {
            const docs = [...storage[nombre].values()].map((m) => ({ id: m.id, data: () => m }));
            return { docs, empty: docs.length === 0 };
          },
          limit() {
            return {
              async get() {
                return { empty: false };
              },
            };
          },
        };
      },
      batch() {
        const ops = [];
        return {
          update(ref, data) {
            ops.push(() => {
              const current = storage.pacientes.get(ref.id) || {};
              storage.pacientes.set(ref.id, { ...current, ...data });
            });
          },
          async commit() {
            ops.forEach((op) => op());
          },
        };
      },
    };

    adapter = new FirestoreAdapter(mockDb);
    labRepo = new LaboratorioFirestoreRepository(mockDb);
  });

  it('lanza MotorNoDisponible si no hay conexión a Firestore configurada', async () => {
    const adapterSinDb = new FirestoreAdapter(null);
    // Como las credenciales no existen en el entorno de pruebas, get db debe lanzar MotorNoDisponible
    expect(() => adapterSinDb.db).toThrow(MotorNoDisponible);
  });

  it('ping responde ok: true cuando el motor responde', async () => {
    const res = await adapter.ping();
    expect(res.ok).toBe(true);
    expect(res.motor).toBe('firestore');
    expect(res.latenciaMs).toBeGreaterThanOrEqual(0);
  });

  it('crearPaciente guarda y retorna paciente mapeado a dominio', async () => {
    const nuevo = await adapter.crearPaciente({
      id: 'pac-test-1',
      documentoIdentidad: '1234567890101',
      nombre: 'Elena',
      apellidos: 'Morales',
      fechaNacimiento: '1995-05-10',
      genero: 'Femenino',
      tipoSangre: 'O+',
    });

    expect(nuevo.id).toBe('pac-test-1');
    expect(nuevo.nombre).toBe('Elena');
    expect(nuevo.detallesInstitucion.institucionId).toBe('I3');

    // Intentar duplicar mismo documento debe lanzar Conflicto
    await expect(
      adapter.crearPaciente({
        id: 'pac-test-2',
        documentoIdentidad: '1234567890101',
        nombre: 'Otra Elena',
        apellidos: 'Morales',
        fechaNacimiento: '1995-05-10',
        genero: 'Femenino',
      })
    ).rejects.toThrow(Conflicto);
  });

  it('obtenerPaciente y listarPacientes funcionan correctamente', async () => {
    await adapter.crearPaciente({
      id: 'pac-test-2',
      documentoIdentidad: '9876543210101',
      nombre: 'Pedro',
      apellidos: 'Gómez',
      fechaNacimiento: '1980-01-01',
      genero: 'Masculino',
    });

    const p = await adapter.obtenerPaciente('pac-test-2');
    expect(p).not.toBeNull();
    expect(p.nombre).toBe('Pedro');

    const lista = await adapter.listarPacientes({ texto: 'Pedro' });
    expect(lista.total).toBe(1);
    expect(lista.items[0].nombre).toBe('Pedro');
  });

  it('LaboratorioFirestoreRepository gestiona orden y resultados de los 8 laboratorios', async () => {
    const orden = await labRepo.crearOrden({
      id: 'ord-test-1',
      pacienteId: 'pac-test-2',
      tipoLaboratorio: 'hematologia',
      medicoSolicitante: 'Dr. Palma',
      examenesSolicitados: [{ codigo: 'HEM-1', nombre: 'Hemograma completo', tipoLaboratorio: 'hematologia' }],
    });

    expect(orden.id).toBe('ord-test-1');
    expect(orden.tipoLaboratorio).toBe('hematologia');

    const muestra = await labRepo.registrarMuestra({
      id: 'mue-test-1',
      ordenId: 'ord-test-1',
      codigoBarras: 'BAR-ORD1-HEM',
      tipoMuestra: 'sangre_venosa',
    });

    expect(muestra.codigoBarras).toBe('BAR-ORD1-HEM');

    const res = await labRepo.registrarResultado({
      id: 'res-test-1',
      ordenId: 'ord-test-1',
      muestraId: 'mue-test-1',
      examenCodigo: 'HEM-1',
      examenNombre: 'Hemograma',
      tipoLaboratorio: 'hematologia',
      tecnicoIngreso: 'Lic. Mazariegos',
      valorResultado: {
        hemoglobina: 14.2,
        hematocrito: 42.0,
        eritrocitos: 4.8,
        leucocitos: 7100,
        plaquetas: 240000,
      },
    });

    expect(res.tipoLaboratorio).toBe('hematologia');
    expect(res.estadoResultado).toBe('preliminar');

    const validado = await labRepo.validarResultado('res-test-1', {
      tecnicoValido: 'Dra. Cordero',
      fechaValidacion: '2026-10-31T12:00:00Z',
    });

    expect(validado.estadoResultado).toBe('validado');
    expect(validado.tecnicoValido).toBe('Dra. Cordero');
  });
});
