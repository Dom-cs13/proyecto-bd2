/**
 * @file contrato.test.js
 * Suite formal de pruebas de contrato (Liskov Substitution Principle).
 * Responsabilidad de I3 (tarea I3-08).
 * Valida que los adaptadores devuelvan exactamente la misma forma de datos y respeten el contrato.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockAdapter } from '../../src/infrastructure/adapters/mock/MockAdapter.js';
import { FirestoreAdapter } from '../../src/infrastructure/adapters/firestore/FirestoreAdapter.js';
import { Conflicto, NoEncontrado } from '../../src/domain/errores.js';

function crearFirestoreEnMemoria() {
  const storage = {
    pacientes: new Map(),
    consultas: new Map(),
  };

  const mockDb = {
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
                      storage[subnombre].set(subId, { id: subId, ...subData });
                    },
                  };
                },
                orderBy() {
                  return {
                    async get() {
                      const docs = Array.from(storage[subnombre].values()).map((d) => ({
                        id: d.id,
                        data: () => d,
                      }));
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
    collectionGroup(subnombre) {
      return {
        async get() {
          const all = Array.from(storage[subnombre].values());
          return {
            docs: all.map((m) => ({
              id: m.id,
              data: () => m,
              ref: {
                id: m.id,
                update: async (data) => {
                  const current = storage[subnombre].get(m.id) || {};
                  storage[subnombre].set(m.id, { ...current, ...data });
                },
              },
            })),
          };
        },
      };
    },
    async runTransaction(updateFunction) {
      const transaction = {
        get: async (docRef) => ({
          data: () => storage.consultas.get(docRef.id) || {},
        }),
        update: (docRef, data) => {
          docRef.update(data);
        },
      };
      return updateFunction(transaction);
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

  return new FirestoreAdapter(mockDb);
}

const FABRICAS_ADAPTADORES = [
  ['MockAdapter', () => new MockAdapter()],
  ['FirestoreAdapter', () => crearFirestoreEnMemoria()],
];

describe.each(FABRICAS_ADAPTADORES)('Suite de Contrato (LSP): %s', (nombreMotor, crearAdaptador) => {
  let adapter;

  beforeEach(() => {
    adapter = crearAdaptador();
  });

  describe('1. Pacientes (crear, obtener, listar)', () => {
    it('crearPaciente devuelve la forma esperada (id string, camelCase, ISO-8601)', async () => {
      const datos = {
        documentoIdentidad: '1000200030001',
        nombre: 'Valeria',
        apellidos: 'Gómez Méndez',
        fechaNacimiento: '1995-06-15',
        genero: 'Femenino',
        tipoSangre: 'O+',
        telefono: '+502 12345678',
        activo: true,
      };

      const paciente = await adapter.crearPaciente(datos);

      expect(typeof paciente.id).toBe('string');
      expect(paciente.documentoIdentidad).toBe('1000200030001');
      expect(paciente.nombre).toBe('Valeria');
      expect(paciente.apellidos).toBe('Gómez Méndez');
      expect(paciente.fechaNacimiento).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(paciente.activo).toBe(true);
      expect(paciente).not.toHaveProperty('_id');
      expect(paciente).not.toHaveProperty('fecha_nacimiento');
    });

    it('crearPaciente rechaza duplicados de documento con Conflicto', async () => {
      const p = {
        documentoIdentidad: '5555666677778',
        nombre: 'Carlos',
        apellidos: 'López',
        fechaNacimiento: '1980-01-01',
      };

      await adapter.crearPaciente(p);
      await expect(adapter.crearPaciente(p)).rejects.toThrow(Conflicto);
    });

    it('obtenerPaciente retorna el paciente o null si no existe', async () => {
      const p = await adapter.crearPaciente({
        documentoIdentidad: '9999888877776',
        nombre: 'Elena',
        apellidos: 'Pérez',
        fechaNacimiento: '1990-03-20',
      });

      const encontrado = await adapter.obtenerPaciente(p.id);
      expect(encontrado).not.toBeNull();
      expect(encontrado.id).toBe(p.id);

      const noExiste = await adapter.obtenerPaciente('id-inexistente');
      expect(noExiste).toBeNull();
    });

    it('listarPacientes soporta filtros de texto y paginación { items, total }', async () => {
      await adapter.crearPaciente({
        documentoIdentidad: '1111111111111',
        nombre: 'Andrés',
        apellidos: 'Castillo',
        fechaNacimiento: '1988-10-10',
      });
      await adapter.crearPaciente({
        documentoIdentidad: '2222222222222',
        nombre: 'Beatriz',
        apellidos: 'Morales',
        fechaNacimiento: '1992-12-12',
      });

      const res = await adapter.listarPacientes({ limite: 10 });
      expect(res).toHaveProperty('total');
      expect(res).toHaveProperty('items');
      expect(Array.isArray(res.items)).toBe(true);
      expect(res.total).toBeGreaterThanOrEqual(2);

      const busqueda = await adapter.listarPacientes({ texto: 'Beatriz' });
      expect(busqueda.items.length).toBe(1);
      expect(busqueda.items[0].nombre).toBe('Beatriz');
    });
  });

  describe('2. Historial y Archivado', () => {
    it('obtenerHistorial devuelve paciente, estado y consultas', async () => {
      const p = await adapter.crearPaciente({
        documentoIdentidad: '3333333333333',
        nombre: 'Lucas',
        apellidos: 'Rivas',
        fechaNacimiento: '2001-05-05',
      });

      const historial = await adapter.obtenerHistorial(p.id);
      expect(historial.paciente.id).toBe(p.id);
      expect(historial.estado).toBe('activo');
      expect(Array.isArray(historial.consultas)).toBe(true);
    });

    it('archivarHistorial marca estado archivado con motivo formal', async () => {
      const p = await adapter.crearPaciente({
        documentoIdentidad: '4444444444444',
        nombre: 'Diana',
        apellidos: 'Fuentes',
        fechaNacimiento: '1999-08-08',
      });

      const archivado = await adapter.archivarHistorial(p.id, {
        tipo: 'traslado',
        detalle: 'Traslado a hospital departamental',
      });

      expect(archivado.estado).toBe('archivado');
      expect(archivado.fechaArchivo).toBeTruthy();
    });

    it('archivarHistorial lanza NoEncontrado con paciente inexistente', async () => {
      await expect(adapter.archivarHistorial('inexistente-id', 'motivo')).rejects.toThrow(NoEncontrado);
    });
  });

  describe('3. Flujo Clínico (Consultas, Diagnósticos, Recetas)', () => {
    it('permite registrar consulta y asociar diagnóstico y receta', async () => {
      const p = await adapter.crearPaciente({
        documentoIdentidad: '7777777777777',
        nombre: 'Sofía',
        apellidos: 'Torres',
        fechaNacimiento: '1996-04-04',
      });

      const consulta = await adapter.crearConsulta({
        pacienteId: p.id,
        motivo: 'Chequeo general de rutina',
        medico: 'Dr. Alejandro Soto',
      });

      expect(typeof consulta.id).toBe('string');

      const diag = await adapter.agregarDiagnostico(consulta.id, {
        codigoCie: 'Z00.0',
        descripcion: 'Examen médico general',
      });

      expect(typeof diag.id).toBe('string');
      expect(diag.codigoCie).toBe('Z00.0');

      const receta = await adapter.recetarMedicamento(consulta.id, {
        medicamentos: [{ medicamento: 'Paracetamol', dosis: '500mg', frecuencia: 'Cada 8h' }],
      });

      expect(typeof receta.id).toBe('string');
      expect(Array.isArray(receta.medicamentos)).toBe(true);
    });
  });

  describe('4. Diagnóstico de Motor (ping)', () => {
    it('ping responde con latencia y nombre de motor', async () => {
      const estado = await adapter.ping();
      expect(estado).toHaveProperty('ok');
      expect(estado).toHaveProperty('motor');
      expect(estado).toHaveProperty('latenciaMs');
      expect(typeof estado.latenciaMs).toBe('number');
    });
  });
});
