import { execFileSync, fork } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import mariadb from 'mariadb';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { MongoClient } from 'mongodb';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { MongoAdapter } from '../../src/infrastructure/adapters/mongodb/MongoAdapter.js';
import { MariaDbAdapter } from '../../src/infrastructure/adapters/mariadb/MariaDbAdapter.js';
import { PostgresAdapter } from '../../src/infrastructure/adapters/postgresql/PostgresAdapter.js';
import { FirestoreAdapter } from '../../src/infrastructure/adapters/firestore/FirestoreAdapter.js';
import { crearApp } from '../../src/app.js';
import { chromium } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Navegador real, HTML/JS reales y HTTP sin mocks. Solo bases desechables identificadas.
describe.skipIf(process.env.ALBA_FORMULARIOS_REALES !== '1')('Formularios reales de ALBA · Chrome y cuatro motores desechables', () => {
  let proceso, browser, url, postgres, maria, admin, base, carpeta, mongo, firestore, firebaseApp;
  const evidencia = [];
  const ids = {};
  const documentos = { pediatria: '9900000000001', odontologia: '9900000000002', laboratorio: '9900000000003', hospital: '9900000000004' };
  const instituciones = ['hospital', 'odontologia', 'laboratorio', 'pediatria'];
  const token = (institucion, rol) => jwt.sign({ institucion, rol }, 'clave-ficticia-red-desechable',
    { subject: '1', expiresIn: '1h', issuer: 'red-salud', audience: 'red-salud-web' });
  const pagina = async (institucion, rol) => {
    const contexto = await browser.newContext();
    // Impide que un fallo del cliente envíe datos al backend real de localhost:3000.
    await contexto.route('**/*', route => new URL(route.request().url()).origin === url ? route.continue() : route.abort());
    await contexto.addInitScript(valor => sessionStorage.setItem('token', valor), token(institucion, rol));
    const page = await contexto.newPage();
    page.on('response', response => {
      const direccion = new URL(response.url());
      if (/^\/(pacientes|red|system|odontologia)/.test(direccion.pathname)) evidencia.push({ metodo: response.request().method(), ruta: direccion.pathname, estado: response.status() });
    });
    return page;
  };
  beforeAll(async () => {
    if (process.env.ALBA_MOTORES_DESECHABLES !== '1') throw new Error('Requiere ALBA_MOTORES_DESECHABLES=1');
    const puerto = (nombre, interno) => {
      const salida = execFileSync('docker', ['port', nombre, `${interno}/tcp`], { encoding: 'utf8' }).trim();
      expect(salida).toMatch(/^127\.0\.0\.1:\d+$/);
      return Number(salida.split(':')[1]);
    };
    base = `alba_red_${Date.now()}`;
    carpeta = new URL(`../../artifacts/segunda-auditoria-${base}/`, import.meta.url);
    await mkdir(carpeta, { recursive: true });
    const opciones = { base, mongo: puerto('alba-mongo-auditoria', 27017), maria: puerto('alba-mariadb-auditoria', 3306),
      postgres: puerto('alba-odontologia-validacion', 5432), firestore: puerto('alba-firestore-auditoria', 8080) };
    execFileSync('docker', ['exec', '-i', 'alba-mariadb-auditoria', 'mariadb', '-uroot'], { input: `CREATE DATABASE ${base};` });
    execFileSync('docker', ['exec', '-i', 'alba-mariadb-auditoria', 'mariadb', '-uroot', base],
      { input: await readFile(new URL('../../infra/database/mariadb/ddl/pediatria_i4_04_i4_05.sql', import.meta.url), 'utf8') });
    maria = mariadb.createPool({ host: '127.0.0.1', port: opciones.maria, user: 'root', database: base });
    const config = { host: '127.0.0.1', port: opciones.postgres, user: 'postgres' };
    admin = new pg.Pool({ ...config, database: 'postgres' });
    await admin.query(`CREATE DATABASE ${base}`);
    postgres = new pg.Pool({ ...config, database: base });
    for (const archivo of ['odontologia_i2_04_i2_05.sql', 'odontologia_documento_i2.sql']) {
      await postgres.query(await readFile(new URL(`../../infra/database/postgresql/ddl/${archivo}`, import.meta.url), 'utf8'));
    }
    await postgres.query("INSERT INTO rol(nombre) VALUES ('odontologo')");
    await postgres.query("INSERT INTO usuario(id_rol,nombres,apellidos,correo,password_hash) VALUES(1,'Profesional','Ficticio','ficticio@example.invalid','no-es-credencial')");
    await maria.query("INSERT INTO rol(nombre) VALUES ('pediatra')");
    await maria.query("INSERT INTO usuario(id_rol,nombres,apellidos,correo,password_hash) VALUES(1,'Profesional','Ficticio','ficticio@example.invalid','no-es-credencial')");
    mongo = await new MongoClient(`mongodb://127.0.0.1:${opciones.mongo}`).connect();
    firebaseApp = initializeApp({ projectId: `demo-${base.replaceAll('_', '-')}` }, base);
    firestore = getFirestore(firebaseApp);
    firestore.settings({ host: `127.0.0.1:${opciones.firestore}`, ssl: false });
    url = await new Promise((resolve, reject) => {
      proceso = fork(fileURLToPath(new URL('../helpers/servidorDesechable.js', import.meta.url)), [JSON.stringify(opciones)], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
      proceso.once('message', mensaje => resolve(`http://127.0.0.1:${mensaje.puerto}`));
      proceso.once('error', reject);
      proceso.once('exit', codigo => reject(new Error(`Backend de pruebas terminó: ${codigo}`)));
    });
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  }, 60000);
  afterAll(async () => {
    if (carpeta) await writeFile(new URL('http.json', carpeta), JSON.stringify(evidencia, null, 2));
    await browser?.close();
    if (proceso?.exitCode === null) await new Promise(resolve => { proceso.once('exit', resolve); proceso.send('cerrar'); });
    await postgres?.end();
    await maria?.end();
    if (mongo) { await mongo.db(base).dropDatabase(); await mongo.close(); }
    await firestore?.terminate();
    if (firebaseApp) await deleteApp(firebaseApp);
    if (admin) { await admin.query(`DROP DATABASE ${base}`); await admin.end(); }
    if (maria) execFileSync('docker', ['exec', '-i', 'alba-mariadb-auditoria', 'mariadb', '-uroot'], { input: `DROP DATABASE ${base};` });
  }, 30000);

  it('Pediatría: formulario visible envía a su backend, devuelve 201 y persiste paciente, tutor e historial', async () => {
    const page = await pagina('pediatria', 'recepcion');
    await page.goto(`${url}/pediatria/index.html#gestion`);
    await page.locator('#g-inp-nombre').fill('Menor de prueba');
    await page.locator('#g-inp-apellidos').fill('Auditoria');
    await page.locator('#g-inp-fecha').fill('2020-01-01');
    await page.locator('#g-inp-curp').fill(documentos.pediatria);
    await page.locator('#g-inp-tutor-nombre').fill('Tutor Completo de Prueba');
    await page.locator('#g-inp-tutor-doc').fill('E2E-TUTOR');
    await page.locator('#g-inp-tutor-tel').fill('12345678');
    const resultado = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/pacientes', { timeout: 8000 });
    await page.locator('#form-gestion-nuevo-paciente [type="submit"]').click();
    const respuesta = await resultado;
    expect(new URL(respuesta.url()).origin).toBe(url);
    expect(respuesta.status()).toBe(201);
    const creado = await respuesta.json();
    ids.pediatria = creado.id;
    const filas = await maria.query('SELECT p.id_paciente, h.estado, pt.id_tutor FROM paciente p JOIN historial_clinico h ON h.id_paciente=p.id_paciente LEFT JOIN paciente_tutor pt ON pt.id_paciente=p.id_paciente WHERE p.documento=?', [documentos.pediatria]);
    expect(filas).toHaveLength(1);
    expect(filas[0].id_tutor).not.toBeNull();
    expect(filas[0].estado).toBe('activo');
    expect(String(filas[0].id_paciente)).toBe(creado.id);
    await page.reload();
    await page.locator('#form-gestion-nuevo-paciente').waitFor();
    await page.screenshot({ path: fileURLToPath(new URL('pediatria.png', carpeta)), fullPage: true });
  }, 20000);

  it('Odontología: formulario de menor muestra el error de tutor y con tutor devuelve 201', async () => {
    const page = await pagina('odontologia', 'secretaria');
    await page.goto(`${url}/odontologia/index.html#registro`);
    const form = page.locator('#registro-api');
    await form.locator('[name="nombre"]').fill('Menor de prueba');
    await form.locator('[name="apellidos"]').fill('Auditoria');
    await form.locator('[name="documentoIdentidad"]').fill(documentos.odontologia);
    await form.locator('[name="fechaNacimiento"]').fill('2020-01-01');
    await form.locator('[name="genero"]').selectOption('Masculino');
    const rechazo = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/pacientes');
    await form.locator('[type="submit"]').click();
    const sinTutor = await rechazo;
    expect(sinTutor.status()).toBe(400);
    expect((await sinTutor.json()).error.codigo).toBe('RESPONSABLE_REQUERIDO');
    await page.getByRole('alert').waitFor({ timeout: 8000 });
    expect(await page.getByRole('alert').textContent()).toContain('responsable');
    await form.locator('[name="responsableNombres"]').fill('Tutor');
    await form.locator('[type="submit"]').click();
    await page.getByRole('alert').filter({ hasText: 'Completa los nombres, apellidos y parentesco' }).waitFor();
    await form.locator('[name="responsableApellidos"]').fill('Auditoria');
    await form.locator('[name="responsableParentesco"]').fill('Madre');
    const resultado = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/pacientes');
    await form.locator('[type="submit"]').click();
    const respuesta = await resultado;
    expect(respuesta.status()).toBe(201);
    const creado = await respuesta.json();
    ids.odontologia = creado.id;
    const filas = await postgres.query('SELECT p.id_paciente,h.estado FROM paciente p JOIN historial_clinico h ON h.id_paciente=p.id_paciente WHERE p.documento_identidad=$1', [documentos.odontologia]);
    expect(filas.rows).toHaveLength(1);
    expect(String(filas.rows[0].id_paciente)).toBe(creado.id);
    await page.waitForFunction(id => globalThis.location.hash === `#ficha/${id}`, creado.id);
    expect(await page.getByRole('alert').count()).toBe(0);
    await page.screenshot({ path: fileURLToPath(new URL('odontologia.png', carpeta)), fullPage: true });
  }, 20000);

  it('Laboratorio: su formulario confirma 201 y el documento existe en Firestore emulado', async () => {
    const page = await pagina('laboratorio', 'laboratorista');
    await page.goto(`${url}/laboratorio/index.html#pacientes`);
    const form = page.locator('#form-paciente');
    for (const [campo, valor] of Object.entries({ cui: documentos.laboratorio, nombre: 'Paciente', apellidos: 'Auditoria', fechaNacimiento: '2000-01-01' })) {
      await form.locator(`[name="${campo}"]`).fill(valor);
    }
    await form.locator('[name="genero"]').selectOption('Masculino');
    const resultado = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/pacientes');
    await form.locator('[type="submit"]').click();
    const respuesta = await resultado;
    expect(respuesta.status()).toBe(201);
    ids.laboratorio = (await respuesta.json()).id;
    const doc = await firestore.collection('pacientes').doc(ids.laboratorio).get();
    expect(doc.exists).toBe(true);
    expect(doc.data().documentoIdentidad).toBe(documentos.laboratorio);
    await page.screenshot({ path: fileURLToPath(new URL('laboratorio.png', carpeta)), fullPage: true });
  }, 20000);

  it('Odontología: un adulto sin responsable opcional se registra sin advertencias', async () => {
    const page = await pagina('odontologia', 'secretaria');
    await page.goto(`${url}/odontologia/index.html#registro`);
    const form = page.locator('#registro-api');
    for (const [campo, valor] of Object.entries({ nombre: 'Adulto', apellidos: 'Auditoria', documentoIdentidad: '9900000000005', fechaNacimiento: '2000-01-01' })) {
      await form.locator(`[name="${campo}"]`).fill(valor);
    }
    await form.locator('[name="genero"]').selectOption('Femenino');
    const resultado = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/pacientes');
    await form.locator('[type="submit"]').click();
    const respuesta = await resultado;
    expect(respuesta.status()).toBe(201);
    const creado = await respuesta.json();
    await page.waitForFunction(id => globalThis.location.hash === `#ficha/${id}`, creado.id);
    expect(await page.getByRole('alert').count()).toBe(0);
    expect(Number((await postgres.query('SELECT COUNT(*) AS n FROM paciente WHERE documento_identidad=$1', ['9900000000005'])).rows[0].n)).toBe(1);
  }, 20000);

  it('Hospital: formulario existente confirma 201 y MongoDB conserva el registro', async () => {
    const page = await pagina('hospital', 'admin');
    const doctor = await page.request.post(`${url}/doctores`, { headers: { Authorization: `Bearer ${token('hospital', 'admin')}` },
      data: { nombre: 'Profesional', apellidos: 'Ficticio', idColegiado: 'AUDITORIA', especialidad: 'General' } });
    expect(doctor.status()).toBe(201);
    await page.goto(`${url}/hospital/index.html`);
    await page.locator('[data-view="gestion"]').click();
    for (const [campo, valor] of Object.entries({ nombre: 'Paciente', apellidos: 'Auditoria', fecha: '2000-01-01', curp: documentos.hospital, telefono: '12345678', direccion: 'Direccion de prueba', ubicacion: 'Consulta externa' })) {
      await page.locator(`#g-inp-${campo}`).fill(valor);
    }
    await page.locator('#g-inp-genero').selectOption('Masculino');
    await page.locator('#g-inp-medico').selectOption({ index: 1 });
    const resultado = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/pacientes');
    await page.locator('#form-gestion-nuevo-paciente [type="submit"]').click();
    const respuesta = await resultado;
    expect(respuesta.status()).toBe(201);
    ids.hospital = (await respuesta.json()).id;
    expect(await mongo.db(base).collection('pacientes').countDocuments({ documentoIdentidad: documentos.hospital })).toBe(1);
    await page.screenshot({ path: fileURLToPath(new URL('hospital.png', carpeta)), fullPage: true });
  }, 20000);

  it('un ping de MariaDB exitoso no implica permisos de INSERT: la API distingue configuración de rol HTTP', async () => {
    const usuario = `lector_${Date.now()}`;
    await maria.query(`CREATE USER '${usuario}'@'%' IDENTIFIED BY ''`);
    await maria.query(`GRANT SELECT ON ${base}.* TO '${usuario}'@'%'`);
    const puerto = execFileSync('docker', ['port', 'alba-mariadb-auditoria', '3306/tcp'], { encoding: 'utf8' }).trim().split(':')[1];
    const pool = mariadb.createPool({ host: '127.0.0.1', port: Number(puerto), user: usuario, database: base });
    const repo = new MariaDbAdapter(pool);
    try {
      expect((await repo.ping()).ok).toBe(true);
      const app = crearApp({ pediatria: { obtenerRepositorio: () => repo, obtenerClave: () => 'clave-ficticia-red-desechable' } });
      const respuesta = await request(app).post('/pacientes').auth(token('pediatria', 'recepcion'), { type: 'bearer' })
        .send({ nombre: 'Paciente', apellidos: 'Ficticio', genero: 'Masculino', fechaNacimiento: '2020-01-01', documentoIdentidad: 'PRUEBA-SIN-PERMISOS' });
      expect(respuesta.status).toBe(503);
      expect(respuesta.body.error.mensaje).toContain('permisos');
      expect(Number((await maria.query('SELECT COUNT(*) AS n FROM paciente WHERE documento=?', ['PRUEBA-SIN-PERMISOS']))[0].n)).toBe(0);
    } finally { await pool.end(); await maria.query(`DROP USER '${usuario}'@'%'`); }
  }, 20000);

  it('Pediatría no duplica un doble envío y distingue alta guardada de una lectura posterior caída', async () => {
    const page = await pagina('pediatria', 'recepcion');
    let confirmada = false, altas = 0;
    page.on('request', req => { if (req.method() === 'POST' && new URL(req.url()).pathname === '/pacientes') altas++; });
    page.on('response', res => { if (res.request().method() === 'POST' && new URL(res.url()).pathname === '/pacientes' && res.status() === 201) confirmada = true; });
    await page.route('**/pacientes/*', route => {
      const destino = new URL(route.request().url());
      if (destino.origin !== url || (confirmada && route.request().method() === 'GET' && /^\/pacientes\/[^/]+$/.test(destino.pathname))) return route.abort();
      return route.continue();
    });
    await page.goto(`${url}/pediatria/index.html#gestion`);
    const campos = { nombre: 'Menor', apellidos: 'Auditoria', fecha: '2020-01-01', curp: '9900000000006',
      'tutor-nombre': 'Tutor Completo de Prueba', 'tutor-doc': 'TUTOR-LECTURA', 'tutor-tel': '12345678' };
    for (const [campo, valor] of Object.entries(campos)) await page.locator(`#g-inp-${campo}`).fill(valor);
    const respuesta = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/pacientes');
    await page.locator('#form-gestion-nuevo-paciente').evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
    expect((await respuesta).status()).toBe(201);
    await page.getByRole('alert').filter({ hasText: 'El paciente fue registrado' }).waitFor();
    expect(altas).toBe(1);
    expect(await page.locator('#g-inp-nombre').inputValue()).toBe('');
    expect(Number((await maria.query('SELECT COUNT(*) AS n FROM paciente WHERE documento=?', ['9900000000006']))[0].n)).toBe(1);
  }, 20000);

  it('las cuatro interfaces buscan en red y abren los historiales permitidos sin filtrar notas ajenas', async () => {
    for (const institucion of instituciones) expect(ids[institucion], `Alta previa de ${institucion}`).toBeTruthy();
    const repos = { hospital: new MongoAdapter(mongo.db(base)), odontologia: new PostgresAdapter(postgres),
      laboratorio: new FirestoreAdapter(firestore), pediatria: new MariaDbAdapter(maria) };
    for (const institucion of instituciones) {
      await repos[institucion].crearConsulta({ pacienteId: ids[institucion], usuarioId: '1', motivo: 'NOTA-RESTRINGIDA-AUDITORIA' });
    }
    const local = await pagina('hospital', 'admin');
    for (const institucion of instituciones) {
      const rol = { hospital: 'admin', odontologia: 'odontologo', laboratorio: 'laboratorista', pediatria: 'pediatra' }[institucion];
      const respuesta = await local.request.get(`${url}/pacientes/${ids[institucion]}/historial`, { headers: { Authorization: `Bearer ${token(institucion, rol)}` } });
      expect(respuesta.status()).toBe(200);
      const historial = await respuesta.json();
      expect(historial.consultas).toHaveLength(1);
      expect(historial.consultas[0].motivo).toBe('NOTA-RESTRINGIDA-AUDITORIA');
    }
    const roles = { hospital: 'admin', odontologia: 'secretaria', laboratorio: 'laboratorista', pediatria: 'pediatra' };
    const rutas = { hospital: '', odontologia: '#red', laboratorio: '#expedientes', pediatria: '#consulta-red' };
    for (const destino of instituciones) {
      const page = await pagina(destino, roles[destino]);
      for (const origen of instituciones) {
        evidencia.push({ paso: 'consulta-red', destino, origen });
        await page.goto(`${url}/${destino}/index.html${rutas[destino]}`);
        const busqueda = page.waitForResponse(r => new URL(r.url()).pathname === '/red/pacientes' && new URL(r.url()).searchParams.get('documento') === documentos[origen]);
        if (destino === 'hospital') {
          await page.locator('[data-view="buscador"]').click();
          await page.locator('#global-search-input').fill(documentos[origen]);
          await page.locator('#global-search-input').press('Enter');
        } else if (destino === 'laboratorio') {
          await page.locator('#exp-buscar').fill(documentos[origen]);
          await page.locator('#exp-buscar').press('Enter');
        } else if (destino === 'odontologia') {
          await page.locator('#buscar-red [name="documento"]').fill(documentos[origen]);
          await page.locator('#buscar-red [type="submit"]').click();
        } else {
          await page.locator('#inp-buscar-red').fill(documentos[origen]);
          await page.locator('#btn-ejecutar-consulta-red').click();
        }
        const respuesta = await busqueda;
        expect(respuesta.status()).toBe(200);
        expect((await respuesta.json()).resultados.find(r => r.institucion === origen).total).toBe(1);
        const ficha = page.waitForResponse(r => new URL(r.url()).pathname === `/red/${origen}/pacientes/${ids[origen]}/historial`);
        if (destino === 'hospital' || destino === 'laboratorio') {
          const contenedor = destino === 'hospital' ? '#drawer-body' : '#resultados-red';
          await page.locator(`${contenedor} tbody tr`).filter({ hasText: origen }).getByRole('button').click();
        } else if (destino === 'odontologia') await page.locator(`a[href^="#red-historial/${origen}/"]`).click();
        else await page.locator(`#red-res-i${instituciones.indexOf(origen) + 1} .btn-ver-historial-red`).click();
        const historial = await ficha;
        expect(historial.status()).toBe(200);
        const datos = await historial.json();
        expect(datos.historial.estado).toBe('activo');
        if (destino !== origen) { expect(datos.consultas).toEqual([]); expect(datos.paciente.detallesInstitucion).toBeUndefined(); }
        if (destino === 'hospital') await page.locator('#drawer-close-btn').click();
        if (destino === 'laboratorio') await page.locator('#modal .cerrar').click();
        if (destino === 'pediatria') await page.locator('#btn-cerrar-drawer').click();
      }
      const estado = await page.request.get(`${url}/system/status`);
      expect(Object.values((await estado.json()).motores).every(m => m.estado === 'conectado')).toBe(true);
      if (destino === 'pediatria') expect(await page.locator('#panel-tecnico-status-container').textContent()).toContain('Estado reportado: conectado');
      await page.screenshot({ path: fileURLToPath(new URL(`red-${destino}.png`, carpeta)), fullPage: true });
    }
  }, 120000);
});
