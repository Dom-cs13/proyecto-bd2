import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import pg from 'pg';
import mariadb from 'mariadb';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { chromium } from 'playwright';
import { describe, expect, it } from 'vitest';
import { PostgresAdapter } from '../../src/infrastructure/adapters/postgresql/PostgresAdapter.js';
import { MariaDbAdapter } from '../../src/infrastructure/adapters/mariadb/MariaDbAdapter.js';
import { crearRouterOdontologia } from '../../src/interfaces/http/routes/odontologiaPacientes.js';
import { crearRouterPediatria } from '../../src/interfaces/http/routes/pediatriaPacientes.js';
import { crearRouterRed } from '../../src/interfaces/http/routes/consultaEnRed.js';
import { errorHandler } from '../../src/interfaces/http/middleware/errorHandler.js';

// Solo contenedores efímeros conocidos, puertos loopback y datos ficticios. Nunca carga .env.
describe.skipIf(process.env.ALBA_SQL_DESECHABLE !== '1')('Historiales SQL desechables', () => {
  it('persiste pacientes y clínica local; busca en ambas direcciones sin compartir clínica externa', async () => {
    const puerto = (nombre, interno) => {
      const salida = execFileSync('docker', ['port', nombre, `${interno}/tcp`], { encoding: 'utf8' }).trim();
      expect(salida).toMatch(/^127\.0\.0\.1:\d+$/);
      return Number(salida.split(':')[1]);
    };
    const configPg = { host: '127.0.0.1', port: puerto('alba-odontologia-validacion', 5432), user: 'postgres' };
    const base = `alba_historial_${Date.now()}`;
    const admin = new pg.Pool({ ...configPg, database: 'postgres' });
    await admin.query(`CREATE DATABASE ${base}`);
    const poolPg = new pg.Pool({ ...configPg, database: base });
    execFileSync('docker', ['exec', 'alba-mariadb-auditoria', 'mariadb', '-uroot', '-e', `CREATE DATABASE ${base}`]);
    const poolMaria = mariadb.createPool({ host: '127.0.0.1', port: puerto('alba-mariadb-auditoria', 3306), user: 'root', database: base, connectionLimit: 4 });
    try {
      for (const archivo of ['odontologia_i2_04_i2_05.sql', 'odontologia_documento_i2.sql']) {
        await poolPg.query(readFileSync(new URL(`../../infra/database/postgresql/ddl/${archivo}`, import.meta.url), 'utf8'));
      }
      execFileSync('docker', ['exec', '-i', 'alba-mariadb-auditoria', 'mariadb', '-uroot', base], {
        input: readFileSync(new URL('../../infra/database/mariadb/ddl/pediatria_i4_04_i4_05.sql', import.meta.url)),
      });
      for (const pool of [poolPg, poolMaria]) {
        await pool.query("INSERT INTO rol(nombre) VALUES('profesional')");
        await pool.query("INSERT INTO usuario(id_rol,nombres,apellidos,correo,password_hash) VALUES(1,'Profesional','Ficticio','prueba@example.invalid','sin-credencial-real')");
        await pool.query("INSERT INTO medicamento(nombre) VALUES('Medicamento ficticio')");
      }
      const repos = { odontologia: new PostgresAdapter(poolPg), pediatria: new MariaDbAdapter(poolMaria) };
      const clave = 'clave-ficticia-historiales-sql';
      const app = express(); app.use(express.json());
      const opciones = { obtenerRepositorio: (institucion) => repos[institucion], obtenerClave: () => clave };
      app.use(crearRouterOdontologia(opciones)); app.use(crearRouterPediatria(opciones));
      app.use(crearRouterRed({ obtenerTodos: () => repos, obtenerClave: () => clave })); app.use(errorHandler);
      const http = (institucion, metodo, ruta, rol) => request(app)[metodo](ruta).set('Authorization', `Bearer ${jwt.sign({ institucion, rol: rol ?? (institucion === 'odontologia' ? 'odontologo' : 'pediatra') }, clave, { subject: '1', issuer: 'red-salud', audience: 'red-salud-web', expiresIn: '1h' })}`);
      const ids = {};
      for (const institucion of Object.keys(repos)) {
        const alta = await http(institucion, 'post', '/pacientes', institucion === 'odontologia' ? 'secretaria' : 'pediatra').send({
          nombre: 'Paciente', apellidos: 'Ficticio', documentoIdentidad: `DOC-${institucion}`, fechaNacimiento: '2015-01-01', genero: 'Otro',
          detallesInstitucion: institucion === 'odontologia'
            ? { responsableLegal: { nombres: 'Tutor', apellidos: 'Ficticio', parentesco: 'Madre', esPrincipal: true } }
            : { tutorPrincipal: { nombres: 'Tutor', apellidos: 'Ficticio', dpi: 'TUTOR-FICTICIO', parentesco: 'Madre' } },
        });
        expect(alta.status, JSON.stringify(alta.body)).toBe(201); ids[institucion] = alta.body.id;
        const repo = repos[institucion];
        const consulta = await repo.crearConsulta({ pacienteId: alta.body.id, usuarioId: '1', motivo: 'Control ficticio' });
        const diagnostico = await repo.agregarDiagnostico(consulta.id, { descripcion: 'Diagnóstico ficticio' });
        await repo.registrarTratamiento(diagnostico.id, { descripcion: 'Tratamiento ficticio', fechaInicio: '2026-01-01' });
        for (let n = 0; n < 2; n++) await repo.recetarMedicamento(consulta.id, { medicamentos: [{ medicamentoId: '1', dosis: 'Dosis ficticia', frecuencia: 'Frecuencia ficticia' }] });
        await expect(repo.recetarMedicamento(consulta.id, { medicamentos: [
          { medicamentoId: '1', dosis: 'Prueba rollback', frecuencia: 'Ficticia' },
          { medicamentoId: '999999', dosis: 'No persistir', frecuencia: 'Ficticia' },
        ] })).rejects.toThrow();
        const lectura = await http(institucion, 'get', `/pacientes/${alta.body.id}/historial`);
        expect(lectura.status).toBe(200);
        const clinica = lectura.body.consultas[0];
        expect(clinica.diagnosticos[0].tratamientos[0].descripcion).toBe('Tratamiento ficticio');
        expect(clinica.recetas).toHaveLength(2);
        expect(clinica.recetas[1].medicamentos[0].nombre).toBe('Medicamento ficticio');
        // Nueva instancia, lectura desde el motor, sin reutilizar el objeto del alta.
        const reconectado = institucion === 'odontologia' ? new PostgresAdapter(poolPg) : new MariaDbAdapter(poolMaria);
        expect((await reconectado.obtenerPaciente(alta.body.id)).documentoIdentidad).toBe(`DOC-${institucion}`);
      }
      for (const [origen, destino] of [['odontologia', 'pediatria'], ['pediatria', 'odontologia']]) {
        const busqueda = await http(origen, 'get', `/red/pacientes?documento=DOC-${destino}`);
        expect(busqueda.status).toBe(200);
        expect(busqueda.body.resultados.find(r => r.institucion === destino)).toMatchObject({ total: 1, items: [{ id: ids[destino], documentoIdentidad: `DOC-${destino}` }] });
        const remoto = await http(origen, 'get', `/red/${destino}/pacientes/${ids[destino]}/historial`);
        expect(remoto.status).toBe(200); expect(remoto.body.consultas).toEqual([]);
        expect(JSON.stringify(remoto.body)).not.toContain('Diagnóstico ficticio');
      }
      app.use(express.static('frontend'));
      const servidor = app.listen(0, '127.0.0.1');
      await new Promise(resolve => servidor.once('listening', resolve));
      const url = `http://127.0.0.1:${servidor.address().port}`;
      let navegador;
      try {
        navegador = await chromium.launch({ channel: 'chrome', headless: true });
        for (const institucion of ['odontologia', 'pediatria']) {
          const contexto = await navegador.newContext();
          // Toda petición fuera del backend desechable se bloquea, incluido localhost:3000.
          await contexto.route('**/*', ruta => new URL(ruta.request().url()).origin === url ? ruta.continue() : ruta.abort());
          await contexto.addInitScript(valor => sessionStorage.setItem('token', valor), jwt.sign({ institucion, rol: institucion === 'odontologia' ? 'odontologo' : 'pediatra' }, clave,
            { subject: '1', issuer: 'red-salud', audience: 'red-salud-web', expiresIn: '1h' }));
          const pagina = await contexto.newPage();
          await pagina.goto(`${url}/${institucion}/index.html#${institucion === 'odontologia' ? `expediente/${ids[institucion]}` : 'buscador'}`);
          if (institucion === 'pediatria') await pagina.locator('.btn-abrir-drawer-paciente').first().click();
          const cuerpo = institucion === 'pediatria' ? '#drawer-content-body' : '#contenido';
          await pagina.locator(cuerpo).getByText('Medicamento ficticio', { exact: false }).first().waitFor();
          const texto = await pagina.locator(cuerpo).textContent();
          expect(texto).toContain('Diagnóstico ficticio'); expect(texto).toContain('Tratamiento ficticio');
          expect(texto).not.toMatch(/undefined|Invalid Date/);
          if (institucion === 'odontologia') {
            await pagina.goto(`${url}/odontologia/index.html#red-historial/pediatria/${ids.pediatria}`);
            await pagina.getByText('Información restringida.', { exact: false }).waitFor();
            expect(await pagina.locator('#contenido').textContent()).not.toContain('Medicamento ficticio');
          } else {
            await pagina.locator('[data-tab="tutor"]').click();
            expect(await pagina.locator(cuerpo).textContent()).toContain('DOC-pediatria');
            await pagina.locator('#btn-cerrar-drawer').click();
            await pagina.goto(`${url}/pediatria/index.html#consulta-red`);
            await pagina.locator('#inp-buscar-red').fill('DOC-odontologia');
            await pagina.locator('#btn-ejecutar-consulta-red').click();
            await pagina.locator('#red-res-i2 .btn-ver-historial-red').click();
            await pagina.locator(cuerpo).getByText('Información restringida', { exact: true }).waitFor();
            expect(await pagina.locator(cuerpo).textContent()).not.toContain('Medicamento ficticio');
          }
          await contexto.close();
        }
      } finally {
        await navegador?.close(); await new Promise(resolve => servidor.close(resolve));
      }
    } finally {
      await poolPg.end(); await poolMaria.end();
      await admin.query(`DROP DATABASE ${base}`); await admin.end();
      execFileSync('docker', ['exec', 'alba-mariadb-auditoria', 'mariadb', '-uroot', '-e', `DROP DATABASE ${base}`]);
    }
  }, 60000);
});
