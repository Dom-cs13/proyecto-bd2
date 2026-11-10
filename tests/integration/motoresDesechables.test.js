import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { MongoClient } from 'mongodb';
import mariadb from 'mariadb';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { describe, it, expect } from 'vitest';
import { MongoAdapter } from '../../src/infrastructure/adapters/mongodb/MongoAdapter.js';
import { MariaDbAdapter } from '../../src/infrastructure/adapters/mariadb/MariaDbAdapter.js';
import { FirestoreAdapter } from '../../src/infrastructure/adapters/firestore/FirestoreAdapter.js';
import { LaboratorioFirestoreRepository } from '../../src/infrastructure/adapters/firestore/laboratorioFirestoreRepository.js';
import { buscarEnRed } from '../../src/application/useCases/buscarEnRed.js';

// Solo contenedores dedicados de esta auditoría. No lee .env ni acepta hosts externos.
const puerto = (nombre, interno) => {
  const direccion = execFileSync('docker', ['port', nombre, `${interno}/tcp`], { encoding: 'utf8' }).trim();
  expect(direccion).toMatch(/^127\.0\.0\.1:\d+$/);
  return Number(direccion.split(':')[1]);
};
const paciente = (documentoIdentidad) => ({ documentoIdentidad, nombre: 'Paciente', apellidos: 'Ficticio', fechaNacimiento: '2020-01-01', genero: 'Masculino' });

describe.skipIf(process.env.ALBA_MOTORES_DESECHABLES !== '1')('Motores desechables · persistencia de drivers oficiales', () => {
  it('MongoDB conserva altas, ediciones y consultas al reconectar sin mezclar expedientes ausentes', async () => {
    const cliente = new MongoClient(`mongodb://127.0.0.1:${puerto('alba-mongo-auditoria', 27017)}`, { serverSelectionTimeoutMS: 3000 });
    await cliente.connect();
    const base = `alba_prueba_${Date.now()}`;
    try {
      const db = cliente.db(base);
      const repo = new MongoAdapter(db);
      const creado = await repo.crearPaciente(paciente('MONGO-PRUEBA'));
      const otro = await repo.crearPaciente(paciente('MONGO-OTRO'));
      await repo.actualizarPaciente(creado.id, { telefono: '12345678' });
      await repo.crearConsulta({ pacienteId: creado.id, motivo: 'Prueba clínica' });
      expect((await repo.obtenerHistorial(otro.id)).consultas).toHaveLength(0);
      expect((await buscarEnRed({ hospital: repo }, { documento: 'MONGO-PRUEBA' })).resultados[0]).toMatchObject({ estado: 'ok', total: 1 });
      await cliente.close();
      await cliente.connect();
      const nuevo = new MongoAdapter(cliente.db(base));
      expect((await nuevo.obtenerPaciente(creado.id)).telefono).toBe('12345678');
      expect((await nuevo.obtenerHistorial(creado.id)).consultas).toHaveLength(1);
      await nuevo.archivarHistorial(creado.id, { tipo: 'administrativo', detalle: 'Prueba ficticia' });
      expect((await nuevo.obtenerHistorial(creado.id)).estado).toBe('archivado');
    } finally { await cliente.db(base).dropDatabase(); await cliente.close(); }
  });

  it('MariaDB persiste paciente y tutor y revierte la atención completa ante una FK inválida', async () => {
    const nombre = 'alba-mariadb-auditoria';
    const base = `alba_prueba_${Date.now()}`;
    execFileSync('docker', ['exec', '-i', nombre, 'mariadb', '-uroot'], { input: `CREATE DATABASE ${base};` });
    const ddl = await readFile(new URL('../../infra/database/mariadb/ddl/pediatria_i4_04_i4_05.sql', import.meta.url), 'utf8');
    execFileSync('docker', ['exec', '-i', nombre, 'mariadb', '-uroot', base], { input: ddl });
    const pool = mariadb.createPool({ host: '127.0.0.1', port: puerto(nombre, 3306), user: 'root', database: base, connectionLimit: 5 });
    try {
      await pool.query("INSERT INTO rol(nombre) VALUES ('pediatra')");
      await pool.query("INSERT INTO usuario(id_rol,nombres,apellidos,correo,password_hash) VALUES(1,'Profesional','Ficticio','prueba@example.invalid','no-es-una-credencial')");
      const repo = new MariaDbAdapter(pool);
      const creado = await repo.crearPaciente({ ...paciente(`MARIA-${Date.now()}`), detallesInstitucion: { tutorPrincipal: { nombres: 'Tutor', apellidos: 'Ficticio', parentesco: 'Madre', dpi: `T-${Date.now()}`, esPrincipal: true } } });
      expect((await repo.obtenerPaciente(creado.id)).detallesInstitucion.tutorPrincipal.nombres).toBe('Tutor');
      await expect(repo.registrarAtencionCompleta({ pacienteId: creado.id, usuarioId: '1', motivo: 'Rollback ficticio', diagnosticos: [{ descripcion: 'Prueba', tratamientos: [{ descripcion: 'Prueba' }] }], receta: { medicamentos: [{ medicamentoId: '99999', dosis: 'Prueba', frecuencia: 'Prueba' }] } })).rejects.toBeDefined();
      expect((await repo.obtenerHistorial(creado.id)).consultas).toHaveLength(0);
      await repo.crearConsulta({ pacienteId: creado.id, usuarioId: '1', motivo: 'Consulta ficticia' });
      const otroRepo = new MariaDbAdapter(pool);
      expect((await otroRepo.obtenerHistorial(creado.id)).consultas).toHaveLength(1);
      await repo.archivarHistorial(creado.id, { tipo: 'administrativo', detalle: 'Prueba ficticia' });
      expect((await otroRepo.obtenerHistorial(creado.id)).historial.estado).toBe('archivado');
    } finally {
      await pool.end();
      execFileSync('docker', ['exec', '-i', nombre, 'mariadb', '-uroot'], { input: `DROP DATABASE ${base};` });
    }
  });

  it('Firestore emulado confirma alta, edición y órdenes tras reconstruir los adaptadores', async () => {
    const host = `127.0.0.1:${puerto('alba-firestore-auditoria', 8080)}`;
    const app = initializeApp({ projectId: `demo-alba-${Date.now()}` }, `auditoria-${Date.now()}`);
    const db = getFirestore(app);
    db.settings({ host, ssl: false });
    try {
      const repo = new FirestoreAdapter(db);
      const creado = await repo.crearPaciente(paciente('FIRESTORE-PRUEBA'));
      await repo.actualizarPaciente(creado.id, { telefono: '12345678' });
      const laboratorio = new LaboratorioFirestoreRepository(db);
      await laboratorio.crearOrden({ pacienteId: creado.id, medicoSolicitante: 'Profesional ficticio', tipoLaboratorio: 'hematologia', examenesSolicitados: [{ codigo: 'HEM', nombre: 'Prueba', tipoLaboratorio: 'hematologia' }] });
      const nuevo = new FirestoreAdapter(db);
      expect((await nuevo.obtenerPaciente(creado.id)).telefono).toBe('12345678');
      expect((await buscarEnRed({ laboratorio: nuevo }, { documento: 'FIRESTORE-PRUEBA' })).resultados[2]).toMatchObject({ estado: 'ok', total: 1 });
      expect(await laboratorio.listarOrdenes()).toHaveLength(1);
      await nuevo.archivarHistorial(creado.id, { tipo: 'administrativo', detalle: 'Prueba ficticia' });
      expect((await repo.obtenerHistorial(creado.id)).estado).toBe('archivado');
    } finally { await db.terminate(); await deleteApp(app); }
  }, 30000);
});
