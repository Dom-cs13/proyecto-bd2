// Se ejecuta exclusivamente desde redCuatroMotoresDesechables.test.js.
import { MongoClient } from 'mongodb';
import mariadb from 'mariadb';
import pg from 'pg';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { crearApp } from '../../src/app.js';
import { MongoAdapter } from '../../src/infrastructure/adapters/mongodb/MongoAdapter.js';
import { MariaDbAdapter } from '../../src/infrastructure/adapters/mariadb/MariaDbAdapter.js';
import { PostgresAdapter } from '../../src/infrastructure/adapters/postgresql/PostgresAdapter.js';
import { FirestoreAdapter } from '../../src/infrastructure/adapters/firestore/FirestoreAdapter.js';
import { registrarRepositorio } from '../../src/infrastructure/config/RepositoryFactory.js';

if (!process.send || process.env.ALBA_MOTORES_DESECHABLES !== '1') throw new Error('Solo ejecutable por la prueba desechable');
const { mongo, maria, postgres, firestore, base } = JSON.parse(process.argv[2]);
if (!/^alba_red_\d+$/.test(base) || ![mongo, maria, postgres, firestore].every(p => Number.isInteger(p) && p > 0 && p <= 65535)) throw new Error('Configuración de pruebas inválida');
process.env.JWT_SECRET = 'clave-ficticia-red-desechable';
const cliente = await new MongoClient(`mongodb://127.0.0.1:${mongo}`).connect();
const poolMaria = mariadb.createPool({ host: '127.0.0.1', port: maria, user: 'root', database: base });
const poolPostgres = new pg.Pool({ host: '127.0.0.1', port: postgres, user: 'postgres', database: base });
const db = getFirestore(initializeApp({ projectId: `demo-${base.replaceAll('_', '-')}` }));
db.settings({ host: `127.0.0.1:${firestore}`, ssl: false });
const repos = { hospital: new MongoAdapter(cliente.db(base)), laboratorio: new FirestoreAdapter(db),
  odontologia: new PostgresAdapter(poolPostgres), pediatria: new MariaDbAdapter(poolMaria) };
registrarRepositorio('hospital', repos.hospital);
registrarRepositorio('laboratorio', repos.laboratorio);
const app = crearApp({ odontologia: { obtenerRepositorio: () => repos.odontologia }, pediatria: { obtenerRepositorio: () => repos.pediatria },
  red: { obtenerTodos: () => repos }, status: { obtenerRepositorios: () => repos } });
const servidor = app.listen(0, '127.0.0.1', () => process.send({ puerto: servidor.address().port }));
process.on('message', async mensaje => {
  if (mensaje !== 'cerrar') return;
  await new Promise(resolve => servidor.close(resolve));
  await Promise.all([cliente.close(), poolMaria.end(), poolPostgres.end(), db.terminate()]);
  process.exit(0);
});
