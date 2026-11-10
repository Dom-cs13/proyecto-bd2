import { execFileSync, fork } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';

const instituciones = ['hospital', 'odontologia', 'laboratorio', 'pediatria'];
const roles = { hospital: 'admin', odontologia: 'secretaria', laboratorio: 'laboratorista', pediatria: 'recepcion' };
const token = (institucion) => jwt.sign({ institucion, rol: roles[institucion] }, 'clave-ficticia-red-desechable',
  { subject: '1', expiresIn: '1h', issuer: 'red-salud', audience: 'red-salud-web' });

describe.skipIf(process.env.ALBA_MOTORES_DESECHABLES !== '1')('Federación HTTP con cuatro motores desechables', () => {
  it('registra en cada origen y lo recupera desde los otros tres, incluso tras reiniciar el proceso Node', async () => {
    const puertoDocker = (nombre, interno) => {
      const salida = execFileSync('docker', ['port', nombre, `${interno}/tcp`], { encoding: 'utf8' }).trim();
      expect(salida).toMatch(/^127\.0\.0\.1:\d+$/);
      return Number(salida.split(':')[1]);
    };
    const base = `alba_red_${Date.now()}`;
    const opciones = { base, mongo: puertoDocker('alba-mongo-auditoria', 27017), maria: puertoDocker('alba-mariadb-auditoria', 3306),
      postgres: puertoDocker('alba-odontologia-validacion', 5432), firestore: puertoDocker('alba-firestore-auditoria', 8080) };
    execFileSync('docker', ['exec', '-i', 'alba-mariadb-auditoria', 'mariadb', '-uroot'], { input: `CREATE DATABASE ${base};` });
    execFileSync('docker', ['exec', '-i', 'alba-mariadb-auditoria', 'mariadb', '-uroot', base],
      { input: await readFile(new URL('../../infra/database/mariadb/ddl/pediatria_i4_04_i4_05.sql', import.meta.url), 'utf8') });
    const config = { host: '127.0.0.1', port: opciones.postgres, user: 'postgres', connectionTimeoutMillis: 3000 };
    const admin = new pg.Pool({ ...config, database: 'postgres' });
    await admin.query(`CREATE DATABASE ${base}`);
    const pool = new pg.Pool({ ...config, database: base });
    let proceso;
    let mongoDetenido = false;
    const iniciar = () => new Promise((resolve, reject) => {
      proceso = fork(fileURLToPath(new URL('../helpers/servidorDesechable.js', import.meta.url)), [JSON.stringify(opciones)], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
      proceso.once('message', ({ puerto }) => resolve(`http://127.0.0.1:${puerto}`));
      proceso.once('error', reject);
      proceso.once('exit', codigo => reject(new Error(`Servidor de prueba terminó: ${codigo}`)));
    });
    const detener = () => new Promise(resolve => { proceso.once('exit', resolve); proceso.send('cerrar'); });
    try {
      await pool.query(await readFile(new URL('../../infra/database/postgresql/ddl/odontologia_i2_04_i2_05.sql', import.meta.url), 'utf8'));
      await pool.query(await readFile(new URL('../../infra/database/postgresql/ddl/odontologia_documento_i2.sql', import.meta.url), 'utf8'));
      let url = await iniciar();
      const ids = {};
      for (const origen of instituciones) {
        const respuesta = await request(url).post('/pacientes').auth(token(origen), { type: 'bearer' }).send({
          documentoIdentidad: `FICTICIO-${origen}`, nombre: 'Paciente', apellidos: 'Ficticio', fechaNacimiento: '2000-01-01', genero: 'Masculino',
          ...(origen === 'pediatria' ? { detallesInstitucion: { tutorPrincipal: { nombre: 'Tutor', apellidos: 'Ficticio', documento: 'FICTICIO-TUTOR', parentesco: 'Madre' } } } : {}),
        });
        expect(respuesta.status, `${origen}: ${JSON.stringify(respuesta.body)}`).toBe(201);
        ids[origen] = respuesta.body.id;
      }
      await detener();
      url = await iniciar(); // Proceso nuevo: sin estado en memoria del backend anterior.
      for (const origen of ['hospital', 'laboratorio']) {
        const editado = await request(url).patch(`/pacientes/${ids[origen]}`).auth(token(origen), { type: 'bearer' }).send({ telefono: '12345678' });
        expect(editado.status).toBe(200);
        expect(editado.body.telefono).toBe('12345678');
        const identidad = await request(url).patch(`/pacientes/${ids[origen]}`).auth(token(origen), { type: 'bearer' }).send({ documentoIdentidad: 'OTRA-IDENTIDAD' });
        expect(identidad.status).toBe(400);
      }
      await detener();
      url = await iniciar();
      for (const origen of instituciones) {
        const leido = await request(url).get(`/pacientes/${ids[origen]}`).auth(token(origen), { type: 'bearer' });
        expect(leido.status).toBe(200);
        if (['hospital', 'laboratorio'].includes(origen)) expect(leido.body.telefono).toBe('12345678');
        for (const destino of instituciones.filter(i => i !== origen)) {
          const busqueda = await request(url).get(`/red/pacientes?documento=FICTICIO-${origen}`).auth(token(destino), { type: 'bearer' });
          expect(busqueda.status).toBe(200);
          expect(busqueda.body.resultados.find(r => r.institucion === origen)).toMatchObject({ estado: 'ok', total: 1 });
          expect(busqueda.body.resultados.filter(r => r.institucion !== origen).every(r => r.total === 0)).toBe(true);
          const historial = await request(url).get(`/red/${origen}/pacientes/${ids[origen]}/historial`).auth(token(destino), { type: 'bearer' });
          expect(historial.status).toBe(200);
          expect(historial.body.historial.estado).toBe('activo');
          expect(historial.body.consultas).toEqual([]);
          expect(historial.body.paciente.detallesInstitucion).toBeUndefined();
        }
      }
      expect((await request(url).post('/laboratorio/ordenes').auth(token('hospital'), { type: 'bearer' }).send({})).status).toBe(403);
      expect((await request(url).get('/red/pacientes?documento=FICTICIO-hospital')).status).toBe(401);
      execFileSync('docker', ['stop', '--time', '1', 'alba-mongo-auditoria']);
      mongoDetenido = true;
      const caida = await request(url).get('/red/pacientes?documento=FICTICIO-laboratorio').auth(token('pediatria'), { type: 'bearer' });
      expect(caida.status).toBe(200);
      expect(caida.body.resultados.find(r => r.institucion === 'hospital').estado).toBe('no_disponible');
      expect(caida.body.resultados.filter(r => r.institucion !== 'hospital').every(r => r.estado === 'ok')).toBe(true);
      expect(caida.body.resultados.find(r => r.institucion === 'laboratorio').total).toBe(1);
    } finally {
      if (mongoDetenido) execFileSync('docker', ['start', 'alba-mongo-auditoria']);
      if (proceso && proceso.exitCode === null) await detener();
      await pool.end();
      await admin.query(`DROP DATABASE ${base}`);
      await admin.end();
      // Mongo, MariaDB y el emulador se eliminan al retirar sus contenedores dedicados.
    }
  }, 60000);
});
