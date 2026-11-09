/**
 * @file contrato.test.js
 * Suite formal de pruebas de contrato (Liskov Substitution Principle).
 * Responsabilidad de I3 (tarea I3-08).
 * Valida que los adaptadores devuelvan exactamente la misma forma de datos y respeten el contrato.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { MockAdapter } from '../../src/infrastructure/adapters/mock/MockAdapter.js';
import { MongoAdapter } from '../../src/infrastructure/adapters/mongodb/MongoAdapter.js';
import { FirestoreAdapter } from '../../src/infrastructure/adapters/firestore/FirestoreAdapter.js';
import { PostgresAdapter } from '../../src/infrastructure/adapters/postgresql/PostgresAdapter.js';
import { MariaDbAdapter } from '../../src/infrastructure/adapters/mariadb/MariaDbAdapter.js';
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

function crearPostgresEnMemoria() {
  let idCounter = 1;
  const pacientes = new Map();
  const historiales = new Map();
  const consultas = new Map();
  const diagnosticos = new Map();
  const tratamientos = new Map();
  const recetas = new Map();
  const detallesReceta = new Map();

  const ejecutarQuery = async (sql, params = []) => {
    const s = sql.trim();

    if (/^SELECT 1/i.test(s)) {
      return { rows: [{ '?column?': 1 }] };
    }

    if (/^(BEGIN|COMMIT|ROLLBACK)/i.test(s)) {
      return { rows: [] };
    }

    if (/INSERT INTO public\.paciente/is.test(s)) {
      const [nombres, apellidos, fecha_nacimiento, sexo, telefono, correo, direccion, documento_identidad] = params;
      const doc = documento_identidad || null;
      if (doc) {
        for (const p of pacientes.values()) {
          if (p.documento_identidad === doc) {
            const err = new Error('duplicate key value violates unique constraint');
            err.code = '23505';
            throw err;
          }
        }
      }
      const id = idCounter++;
      const row = {
        id_paciente: id,
        nombres,
        apellidos,
        fecha_nacimiento: String(fecha_nacimiento).slice(0, 10),
        sexo: sexo || 'Otro',
        telefono: telefono || '',
        correo: correo || '',
        direccion: direccion || '',
        documento_identidad: doc,
        activo: true,
      };
      pacientes.set(String(id), row);
      return { rows: [row] };
    }

    if (/INSERT INTO public\.historial_clinico/is.test(s)) {
      const [id_paciente] = params;
      const id = idCounter++;
      const row = {
        id_historial: id,
        id_paciente: Number(id_paciente),
        estado: 'activo',
        fecha_creacion: new Date(),
        fecha_archivo: null,
        motivo_archivo_tipo: null,
        motivo_archivo_detalle: null,
      };
      historiales.set(String(id_paciente), row);
      return { rows: [row] };
    }

    if (/UPDATE public\.historial_clinico.*SET estado = 'archivado'/is.test(s)) {
      const pacienteId = String(params[0]);
      const motivoTipo = params[1];
      const motivoDetalle = params[2];
      const h = historiales.get(pacienteId);
      if (!h || h.estado !== 'activo') {
        return { rows: [] };
      }
      h.estado = 'archivado';
      h.fecha_archivo = new Date();
      h.motivo_archivo_tipo = motivoTipo;
      h.motivo_archivo_detalle = motivoDetalle;
      const p = pacientes.get(pacienteId);
      if (p) p.activo = false;
      return { rows: [h] };
    }

    if (/historial_clinico.*WHERE id_paciente/is.test(s)) {
      const h = historiales.get(String(params[0]));
      return { rows: h ? [h] : [] };
    }

    if (/SELECT estado FROM public\.historial_clinico/is.test(s)) {
      const h = historiales.get(String(params[0]));
      return { rows: h ? [{ estado: h.estado }] : [] };
    }

    if (/FROM public\.paciente.*WHERE id_paciente/is.test(s)) {
      const p = pacientes.get(String(params[0]));
      return { rows: p ? [p] : [] };
    }

    if (/SELECT COUNT\(\*\)::integer AS total FROM public\.paciente/is.test(s)) {
      const q = (params[0] || '').toLowerCase();
      let match = Array.from(pacientes.values());
      if (q) {
        match = match.filter((p) => (p.nombres || '').toLowerCase().includes(q) || (p.apellidos || '').toLowerCase().includes(q));
      }
      return { rows: [{ total: match.length }] };
    }

    if (/SELECT \* FROM public\.paciente/is.test(s)) {
      const q = (params[0] || '').toLowerCase();
      let match = Array.from(pacientes.values());
      if (q) {
        match = match.filter((p) => (p.nombres || '').toLowerCase().includes(q) || (p.apellidos || '').toLowerCase().includes(q));
      }
      return { rows: match };
    }

    if (/INSERT INTO public\.consulta/is.test(s)) {
      const [id_paciente, id_usuario, id_cita, id_poliza, motivo, observaciones] = params;
      const id = idCounter++;
      const row = {
        id_consulta: id,
        id_paciente: Number(id_paciente),
        id_usuario: id_usuario || 1,
        id_cita: id_cita || null,
        id_poliza: id_poliza || null,
        fecha: new Date(),
        motivo: motivo || 'Consulta general',
        observaciones: observaciones || null,
        estado: 'borrador',
      };
      consultas.set(String(id), row);
      return { rows: [row] };
    }

    if (/SELECT c\.id_consulta.*FROM public\.consulta/is.test(s)) {
      const c = consultas.get(String(params[0]));
      return { rows: c ? [{ id_consulta: c.id_consulta }] : [] };
    }

    if (/INSERT INTO public\.diagnostico/is.test(s)) {
      const [id_consulta, descripcion, observaciones] = params;
      const id = idCounter++;
      const row = {
        id_diagnostico: id,
        id_consulta: Number(id_consulta),
        descripcion,
        codigo_cie: 'Z00.0',
        observaciones: observaciones || null,
      };
      diagnosticos.set(String(id), row);
      return { rows: [row] };
    }

    if (/INSERT INTO public\.receta\s*\(/is.test(s)) {
      const [id_consulta, indicaciones] = params;
      const id = idCounter++;
      const row = {
        id_receta: id,
        id_consulta: Number(id_consulta),
        indicaciones_generales: indicaciones || null,
      };
      recetas.set(String(id), row);
      return { rows: [row] };
    }

    if (/INSERT INTO public\.detalle_receta/is.test(s)) {
      const [id_receta, id_medicamento, dosis, frecuencia, duracion, cantidad, indicaciones] = params;
      const id = idCounter++;
      const row = {
        id_detalle_receta: id,
        id_receta: Number(id_receta),
        id_medicamento: Number(id_medicamento) || 1,
        dosis,
        frecuencia,
        duracion,
        cantidad,
        indicaciones,
      };
      detallesReceta.set(String(id), row);
      return { rows: [row] };
    }

    if (/SELECT \* FROM public\.consulta.*WHERE id_paciente/is.test(s)) {
      const id = String(params[0]);
      const rows = Array.from(consultas.values()).filter((c) => String(c.id_paciente) === id);
      return { rows };
    }

    if (/SELECT \* FROM public\.diagnostico/is.test(s)) {
      return { rows: Array.from(diagnosticos.values()) };
    }

    if (/SELECT t\.\* FROM public\.tratamiento/is.test(s)) {
      return { rows: Array.from(tratamientos.values()) };
    }

    if (/SELECT \* FROM public\.receta/is.test(s)) {
      return { rows: Array.from(recetas.values()) };
    }

    if (/FROM public\.detalle_receta/is.test(s)) {
      const rows = Array.from(detallesReceta.values()).map((d) => ({ ...d, nombre: 'Paracetamol' }));
      return { rows };
    }

    if (/FROM public\.consulta_servicio/is.test(s)) {
      return { rows: [] };
    }

    return { rows: [] };
  };

  const pool = {
    query: ejecutarQuery,
    connect: async () => ({
      query: ejecutarQuery,
      release: () => {},
    }),
  };

  return new PostgresAdapter(pool);
}

function crearMariaDbEnMemoria() {
  let idCounter = 1;
  const pacientes = new Map();
  const historiales = new Map();
  const consultas = new Map();
  const diagnosticos = new Map();
  const tratamientos = new Map();
  const recetas = new Map();
  const detallesReceta = new Map();

  const ejecutarQuery = async (sql, params = []) => {
    const s = sql.trim();

    if (/^SELECT 1/i.test(s)) {
      return [{ 1: 1 }];
    }

    if (/^(BEGIN|COMMIT|ROLLBACK)/i.test(s)) {
      return [];
    }

    if (/INSERT INTO paciente/is.test(s)) {
      const [documento, nombres, apellidos, fecha_nacimiento, sexo, grupo_sanguineo, telefono, correo, direccion] = params;
      const doc = documento || null;
      if (doc) {
        for (const p of pacientes.values()) {
          if (p.documento === doc) {
            const err = new Error(`Duplicate entry '${doc}' for key 'documento'`);
            err.code = 'ER_DUP_ENTRY';
            err.errno = 1062;
            throw err;
          }
        }
      }
      const id = idCounter++;
      const row = {
        id_paciente: id,
        documento: doc,
        nombres: nombres || '',
        apellidos: apellidos || '',
        fecha_nacimiento: String(fecha_nacimiento).slice(0, 10),
        sexo: sexo || 'M',
        grupo_sanguineo: grupo_sanguineo || 'O+',
        telefono: telefono || '',
        correo: correo || '',
        direccion: direccion || '',
        activo: true,
      };
      pacientes.set(String(id), row);
      return { insertId: id };
    }

    if (/INSERT INTO historial_clinico/is.test(s)) {
      const [id_paciente] = params;
      const id = idCounter++;
      const row = {
        id_historial: id,
        id_paciente: Number(id_paciente),
        estado: 'activo',
        fecha_creacion: new Date().toISOString(),
        fecha_archivo: null,
        motivo_archivo_tipo: null,
        motivo_archivo_detalle: null,
      };
      historiales.set(String(id_paciente), row);
      return { insertId: id };
    }

    if (/FROM paciente.*WHERE id_paciente/is.test(s)) {
      const p = pacientes.get(String(params[0]));
      return p ? [p] : [];
    }

    if (/SELECT COUNT\(p\.id_paciente\)/is.test(s)) {
      const textParam = params.find((p) => typeof p === 'string' && p.startsWith('%'));
      const q = textParam ? textParam.replace(/%/g, '').toLowerCase() : '';
      let match = Array.from(pacientes.values());
      if (q) {
        match = match.filter((p) => (p.nombres || '').toLowerCase().includes(q) || (p.apellidos || '').toLowerCase().includes(q));
      }
      return [{ total: match.length }];
    }

    if (/SELECT p\.\*.*FROM paciente p/is.test(s)) {
      const textParam = params.find((p) => typeof p === 'string' && p.startsWith('%'));
      const q = textParam ? textParam.replace(/%/g, '').toLowerCase() : '';
      let match = Array.from(pacientes.values());
      if (q) {
        match = match.filter((p) => (p.nombres || '').toLowerCase().includes(q) || (p.apellidos || '').toLowerCase().includes(q));
      }
      return match.map((p) => ({ ...p, estado_historial: 'activo' }));
    }

    if (/FROM paciente_tutor/is.test(s)) return [];
    if (/FROM paciente_alergia/is.test(s)) return [];
    if (/FROM control_crecimiento/is.test(s)) return [];
    if (/FROM vacuna_aplicada/is.test(s)) return [];
    if (/FROM tutor/is.test(s)) return [];

    if (/UPDATE historial_clinico.*SET estado = 'archivado'/is.test(s)) {
      const motivoTipo = params[0];
      const motivoDetalle = params[1];
      const pacienteId = String(params[2]);
      const h = historiales.get(pacienteId);
      if (!h || h.estado !== 'activo') {
        return { affectedRows: 0 };
      }
      h.estado = 'archivado';
      h.fecha_archivo = new Date().toISOString();
      h.motivo_archivo_tipo = motivoTipo;
      h.motivo_archivo_detalle = motivoDetalle;
      const p = pacientes.get(pacienteId);
      if (p) p.activo = false;
      return { affectedRows: 1 };
    }

    if (/SELECT .* FROM historial_clinico.*WHERE id_paciente/is.test(s)) {
      const h = historiales.get(String(params[0]));
      return h ? [h] : [];
    }

    if (/SELECT estado FROM historial_clinico/is.test(s)) {
      const h = historiales.get(String(params[0]));
      return h ? [{ estado: h.estado }] : [];
    }

    if (/INSERT INTO consulta/is.test(s)) {
      const [id_paciente, id_usuario, id_cita, motivo, observaciones] = params;
      const id = idCounter++;
      const row = {
        id_consulta: id,
        id_paciente: Number(id_paciente),
        id_usuario: id_usuario || 1,
        id_cita: id_cita || null,
        fecha: new Date().toISOString(),
        fecha_consulta: new Date().toISOString(),
        motivo: motivo || 'Consulta pediátrica',
        observaciones: observaciones || null,
        estado: 'borrador',
      };
      consultas.set(String(id), row);
      return { insertId: id };
    }

    if (/SELECT c\.id_consulta.*FROM consulta c/is.test(s)) {
      const c = consultas.get(String(params[0]));
      return c ? [{ id_consulta: c.id_consulta }] : [];
    }

    if (/INSERT INTO diagnostico/is.test(s)) {
      const [id_consulta, codigo_cie10, descripcion, observaciones] = params;
      const id = idCounter++;
      const row = {
        id_diagnostico: id,
        id_consulta: Number(id_consulta),
        codigo_cie10: codigo_cie10 || 'Z00.0',
        codigo_cie: 'Z00.0',
        descripcion,
        observaciones: observaciones || null,
      };
      diagnosticos.set(String(id), row);
      return { insertId: id };
    }

    if (/INSERT INTO receta/is.test(s)) {
      const [id_consulta, peso_referencia_kg, indicaciones] = params;
      const id = idCounter++;
      const row = {
        id_receta: id,
        id_consulta: Number(id_consulta),
        peso_referencia_kg: peso_referencia_kg || null,
        indicaciones_generales: indicaciones || null,
      };
      recetas.set(String(id), row);
      return { insertId: id };
    }

    if (/INSERT INTO (detalle_receta|medicamento_receta)/is.test(s)) {
      const [id_receta, id_medicamento, dosis, frecuencia, duracion, cantidad, indicaciones] = params;
      const id = idCounter++;
      const row = {
        id_detalle_receta: id,
        id_receta: Number(id_receta),
        id_medicamento: Number(id_medicamento) || 1,
        dosis,
        frecuencia,
        duracion,
        cantidad,
        indicaciones,
      };
      detallesReceta.set(String(id), row);
      return { insertId: id };
    }

    if (/SELECT \* FROM consulta.*WHERE id_paciente/is.test(s)) {
      const id = String(params[0]);
      return Array.from(consultas.values()).filter((c) => String(c.id_paciente) === id);
    }

    if (/FROM diagnostico/is.test(s)) {
      return Array.from(diagnosticos.values());
    }

    if (/FROM tratamiento/is.test(s)) {
      return Array.from(tratamientos.values());
    }

    if (/FROM receta/is.test(s)) {
      return Array.from(recetas.values());
    }

    if (/(detalle_receta|medicamento_receta)/is.test(s)) {
      return Array.from(detallesReceta.values()).map((d) => ({ ...d, nombre: 'Paracetamol' }));
    }

    return [];
  };

  const pool = {
    query: ejecutarQuery,
    getConnection: async () => ({
      query: ejecutarQuery,
      release: () => {},
    }),
  };

  return new MariaDbAdapter(pool);
}

function crearMongoEnMemoria() {
  const pacientes = new Map();
  const consultas = new Map();

  const mockDb = {
    async command() {
      return { ok: 1 };
    },
    collection(nombre) {
      if (nombre === 'pacientes') {
        return {
          async findOne(query) {
            const all = Array.from(pacientes.values());
            if (query?._id) {
              const strId = String(query._id);
              return all.find((p) => String(p._id) === strId) || null;
            }
            if (query?.$or) {
              for (const p of all) {
                for (const cond of query.$or) {
                  if (cond._id && String(p._id) === String(cond._id)) return p;
                  if (cond.expediente && p.expediente === cond.expediente) return p;
                  if (cond.documentoIdentidad && p.documentoIdentidad === cond.documentoIdentidad) return p;
                  if (cond.curp && p.curp === cond.curp) return p;
                }
              }
              return null;
            }
            return null;
          },
          async insertOne(doc) {
            const _id = new ObjectId();
            const nuevo = { ...doc, _id };
            pacientes.set(String(_id), nuevo);
            return { insertedId: _id };
          },
          async updateOne(query, update) {
            let p = null;
            const all = Array.from(pacientes.values());
            if (query?._id) {
              p = all.find((item) => String(item._id) === String(query._id));
            } else if (query?.$or) {
              for (const item of all) {
                for (const cond of query.$or) {
                  if (cond._id && String(item._id) === String(cond._id)) { p = item; break; }
                  if (cond.expediente && item.expediente === cond.expediente) { p = item; break; }
                }
                if (p) break;
              }
            }
            if (p && update?.$set) {
              Object.assign(p, update.$set);
            }
            return { modifiedCount: p ? 1 : 0 };
          },
          find(filtro = {}) {
            let items = Array.from(pacientes.values());
            if (filtro?.estado) {
              items = items.filter((p) => (p.estado || 'activo') === filtro.estado);
            }
            if (filtro?.$or) {
              const regexCond = filtro.$or.find((c) => c.nombre && (c.nombre.$regex || c.nombre instanceof RegExp));
              if (regexCond) {
                const rx = regexCond.nombre.$regex ? new RegExp(regexCond.nombre.$regex, 'i') : regexCond.nombre;
                items = items.filter((p) => rx.test(p.nombre || '') || rx.test(p.apellidos || ''));
              }
            }
            return {
              sort() { return this; },
              skip(n) { items = items.slice(n); return this; },
              limit(n) { items = items.slice(0, n); return this; },
              async toArray() { return items; },
            };
          },
          async countDocuments(filtro = {}) {
            let items = Array.from(pacientes.values());
            if (filtro?.estado) {
              items = items.filter((p) => (p.estado || 'activo') === filtro.estado);
            }
            if (filtro?.$or) {
              const regexCond = filtro.$or.find((c) => c.nombre && (c.nombre.$regex || c.nombre instanceof RegExp));
              if (regexCond) {
                const rx = regexCond.nombre.$regex ? new RegExp(regexCond.nombre.$regex, 'i') : regexCond.nombre;
                items = items.filter((p) => rx.test(p.nombre || '') || rx.test(p.apellidos || ''));
              }
            }
            return items.length;
          },
        };
      }

      if (nombre === 'consultas') {
        return {
          async findOne(query) {
            const all = Array.from(consultas.values());
            if (query?._id) {
              return all.find((c) => String(c._id) === String(query._id)) || null;
            }
            if (query?.$or) {
              for (const c of all) {
                for (const cond of query.$or) {
                  if (cond['diagnostico.idDiagnostico'] && c.diagnostico?.idDiagnostico === cond['diagnostico.idDiagnostico']) return c;
                  if (cond['diagnostico.id'] && c.diagnostico?.id === cond['diagnostico.id']) return c;
                }
              }
            }
            return null;
          },
          async insertOne(doc) {
            const _id = new ObjectId();
            const nuevo = { ...doc, _id };
            consultas.set(String(_id), nuevo);
            return { insertedId: _id };
          },
          async updateOne(query, update) {
            let c = null;
            const all = Array.from(consultas.values());
            if (query?._id) {
              c = all.find((item) => String(item._id) === String(query._id));
            } else if (query?.$or) {
              for (const item of all) {
                for (const cond of query.$or) {
                  if (cond['diagnostico.idDiagnostico'] && item.diagnostico?.idDiagnostico === cond['diagnostico.idDiagnostico']) { c = item; break; }
                  if (cond['diagnostico.id'] && item.diagnostico?.id === cond['diagnostico.id']) { c = item; break; }
                }
                if (c) break;
              }
            }
            if (c && update?.$set) {
              for (const [k, v] of Object.entries(update.$set)) {
                if (k.includes('.')) {
                  const partes = k.split('.');
                  let ref = c;
                  for (let i = 0; i < partes.length - 1; i++) {
                    ref[partes[i]] = ref[partes[i]] || {};
                    ref = ref[partes[i]];
                  }
                  ref[partes[partes.length - 1]] = v;
                } else {
                  c[k] = v;
                }
              }
            }
            return { modifiedCount: c ? 1 : 0 };
          },
          find(query = {}) {
            let all = Array.from(consultas.values());
            if (query?.$or) {
              all = all.filter((c) => query.$or.some((cond) => {
                if (cond.pacienteId && c.pacienteId === cond.pacienteId) return true;
                if (cond.expediente && c.expediente === cond.expediente) return true;
                return false;
              }));
            }
            return {
              sort() { return this; },
              async toArray() { return all; },
            };
          },
        };
      }

      return {
        async findOne() { return null; },
        async insertOne() { return { insertedId: new ObjectId() }; },
        async updateOne() { return { modifiedCount: 1 }; },
        find() { return { sort() { return this; }, async toArray() { return []; } }; },
      };
    },
  };

  const mockCliente = {
    startSession() {
      return {
        async withTransaction(fn) { return fn(); },
        async endSession() {},
      };
    },
  };

  return new MongoAdapter(mockDb, mockCliente);
}

const FABRICAS_ADAPTADORES = [
  ['MockAdapter', () => new MockAdapter()],
  ['MongoAdapter', () => crearMongoEnMemoria()],
  ['FirestoreAdapter', () => crearFirestoreEnMemoria()],
  ['PostgresAdapter', () => crearPostgresEnMemoria()],
  ['MariaDbAdapter', () => crearMariaDbEnMemoria()],
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
