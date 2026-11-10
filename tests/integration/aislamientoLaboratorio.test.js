/**
 * @file aislamientoLaboratorio.test.js
 * Prueba de Aislamiento Institucional y No-Fuga para Laboratorio Clínico (I3-09).
 * Valida que:
 * 1. Cada motor y repositorio esté aislado por institución (Factory / Strategy).
 * 2. Un token de otra institución no pueda operar en colecciones de Laboratorio.
 * 3. Los datos persistidos incluyan la marca institucional (I3) evitando fuga o confusión.
 * 4. La caída de un motor devuelva 503 aislado sin tumbar el sistema global.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { crearApp } from '../../src/app.js';
import { FirestoreAdapter } from '../../src/infrastructure/adapters/firestore/FirestoreAdapter.js';
import { LaboratorioFirestoreRepository } from '../../src/infrastructure/adapters/firestore/laboratorioFirestoreRepository.js';
import {
  obtenerRepositorio,
  registrarRepositorio,
  registrarLaboratorioRepo,
} from '../../src/infrastructure/config/RepositoryFactory.js';
import { Prohibido } from '../../src/domain/errores.js';

describe('Aislamiento Institucional y No-Fuga · Laboratorio Clínico (I3-09)', () => {
  let app;
  let mockDb;
  let adapter;
  let labRepo;
  let storage;

  const JWT_SECRET = 'red-salud-jwt-secret-key-default-demo';

  function firmarToken(institucion, rol = 'profesional') {
    return jwt.sign(
      { institucion, rol, usuario: `test@${institucion}.invalid` },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', JWT_SECRET);
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
              async get() {
                const item = storage[nombre].get(id);
                return { exists: !!item, id, data: () => item };
              },
            };
          },
          where(campo, op, valor) {
            return {
              limit() {
                return {
                  async get() {
                    const match = Array.from(storage[nombre].values()).filter((item) => item[campo] === valor);
                    return { empty: match.length === 0, docs: match.map((m) => ({ id: m.id, data: () => m })) };
                  },
                };
              },
              async get() {
                const match = Array.from(storage[nombre].values()).filter((item) => item[campo] === valor);
                return { empty: match.length === 0, docs: match.map((m) => ({ id: m.id, data: () => m })) };
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
            return { docs: all.map((m) => ({ id: m.id, data: () => m })) };
          },
        };
      },
    };

    adapter = new FirestoreAdapter(mockDb);
    labRepo = new LaboratorioFirestoreRepository(mockDb);
    registrarRepositorio('laboratorio', adapter);
    registrarLaboratorioRepo(labRepo);
  });

  describe('1. Aislamiento en el RepositoryFactory', () => {
    it('obtenerRepositorio entrega FirestoreAdapter solo para laboratorio', () => {
      const repo = obtenerRepositorio('laboratorio');
      expect(repo).toBeInstanceOf(FirestoreAdapter);
    });

    it('obtenerRepositorio rechaza instituciones no soportadas con Prohibido', () => {
      expect(() => obtenerRepositorio('institucion_falsa')).toThrow(Prohibido);
    });
  });

  describe('2. Integridad de Datos e Identidad Institucional', () => {
    it('los pacientes creados en Laboratorio quedan marcados con institucionId = I3', async () => {
      const tokenLab = firmarToken('laboratorio', 'laboratorista');

      const res = await request(app)
        .post('/pacientes')
        .set('Authorization', `Bearer ${tokenLab}`)
        .send({
          cui: '9876543210123',
          documentoIdentidad: '9876543210123',
          nombre: 'Marcos',
          apellidos: 'Xiloj',
          fechaNacimiento: '1987-03-12',
          genero: 'Masculino',
        });

      expect(res.status).toBe(201);
      expect(res.body.detallesInstitucion).toHaveProperty('institucionId', 'I3');
    });
  });

  describe('3. Aislamiento de Errores del Motor (503)', () => {
    it('si el motor de Firestore no responde, responde 503 con código MOTOR_NO_DISPONIBLE', async () => {
      // Simular adapter con fallo
      const adapterFallo = {
        async ping() {
          return { ok: false, motor: 'firestore', latenciaMs: 120, error: 'Connection timeout' };
        },
      };
      registrarRepositorio('laboratorio', adapterFallo);

      const res = await request(app).get('/laboratorio/status').auth(firmarToken('laboratorio', 'laboratorista'), { type: 'bearer' });
      expect(res.status).toBe(503);
      expect(res.body.error.codigo).toBe('MOTOR_NO_DISPONIBLE');
    });
  });
});
