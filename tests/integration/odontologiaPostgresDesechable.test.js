import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import pg from 'pg';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { describe, it, expect } from 'vitest';
import { PostgresAdapter } from '../../src/infrastructure/adapters/postgresql/PostgresAdapter.js';
import { crearRouterOdontologia } from '../../src/interfaces/http/routes/odontologiaPacientes.js';
import { crearRouterRed } from '../../src/interfaces/http/routes/consultaEnRed.js';
import { errorHandler, noEncontrado } from '../../src/interfaces/http/middleware/errorHandler.js';

// Exclusivamente el contenedor efímero de esta validación. Nunca usa .env ni URLs externas.
describe.skipIf(process.env.ALBA_ODONTOLOGIA_DESECHABLE !== '1')('PostgreSQL 16 desechable · persistencia y RLS', () => {
  it('valida DDL y permisos mínimos, agenda, vínculos, clínica, cierre y archivo', async () => {
    const puerto = execFileSync('docker', ['port', 'alba-odontologia-validacion', '5432/tcp'], { encoding: 'utf8' }).trim();
    expect(puerto).toMatch(/^127\.0\.0\.1:\d+$/);
    const config = { host: '127.0.0.1', port: Number(puerto.split(':')[1]), user: 'postgres',
      options: '-c search_path=public', max: 1, connectionTimeoutMillis: 3000 };
    const admin = new pg.Pool({ ...config, database: 'postgres' });
    const base = `alba_prueba_${Date.now()}`;
    await admin.query(`CREATE DATABASE ${base}`);
    const pool = new pg.Pool({ ...config, database: base });
    try {
      for (const archivo of ['ddl/odontologia_i2_04_i2_05.sql', 'ddl/odontologia_documento_i2.sql', 'seguridad/odontologia_api.sql']) {
        await pool.query(await readFile(new URL(`../../infra/database/postgresql/${archivo}`, import.meta.url), 'utf8'));
      }
      await pool.query("INSERT INTO public.rol(nombre) VALUES('odontologo')");
      await pool.query(`INSERT INTO public.usuario(id_rol,nombres,apellidos,correo,password_hash)
        VALUES(1,'Profesional','Ficticio','prueba@example.invalid','no-es-una-credencial')`);
      await pool.query("INSERT INTO public.alergia(nombre) VALUES('Alergia de prueba')");
      await pool.query("INSERT INTO public.medicamento(nombre) VALUES('Medicamento de prueba')");
      await pool.query("INSERT INTO public.servicio_odontologico(nombre) VALUES('Servicio de prueba')");
      await pool.query('SET ROLE red_salud_odontologia_api');
      const repo = new PostgresAdapter(pool);
      const app = express(); app.use(express.json());
      const clave = 'clave-ficticia-postgres-desechable';
      app.use(crearRouterOdontologia({ obtenerRepositorio: () => repo, obtenerClave: () => clave }));
      app.use(crearRouterRed({ obtenerTodos: () => ({ odontologia: repo }), obtenerClave: () => clave }));
      app.use(noEncontrado); app.use(errorHandler);
      const autorizar = (req, rol = 'secretaria') => req.set('Authorization', `Bearer ${jwt.sign({ institucion: 'odontologia', rol }, clave,
        { subject: '1', expiresIn: '1h', issuer: 'red-salud', audience: 'red-salud-web' })}`);
      const alta = await autorizar(request(app).post('/pacientes')).send({ nombre: 'Paciente', genero: 'Otro', apellidos: 'Ficticio', documentoIdentidad: 'PRUEBA-1', fechaNacimiento: '2000-01-01' });
      expect(alta.status).toBe(201);
      const paciente = alta.body;
      const redReal = await autorizar(request(app).get('/red/pacientes?documento=PRUEBA-1'), 'odontologo');
      expect(redReal.status).toBe(200);
      expect(redReal.body.resultados.find((r) => r.institucion === 'odontologia')).toMatchObject({ estado: 'ok', total: 1 });
      expect(redReal.body.resultados.filter((r) => r.estado === 'no_disponible')).toHaveLength(3);
      const menor = await repo.crearPaciente({ nombres: 'Menor', apellidos: 'Ficticio', documentoIdentidad: 'MENOR-1', fechaNacimiento: '2020-01-01',
        detallesInstitucion: { responsableLegal: { nombres: 'Tutor', apellidos: 'Ficticio', parentesco: 'Madre', esPrincipal: true, dpi: 'TUTOR-1' } } });
      expect((await repo.obtenerResponsables(menor.id)).items).toHaveLength(1);
      await expect(repo.crearPaciente({ nombres: 'Menor', apellidos: 'Ficticio', documentoIdentidad: 'MENOR-ERROR', fechaNacimiento: '2020-01-01',
        detallesInstitucion: { responsableLegal: { nombres: 'Tutor', apellidos: 'Ficticio', parentesco: 'Madre', esPrincipal: true, dpi: 'TUTOR-1' } } })).rejects.toMatchObject({ status: 409, codigo: 'PACIENTE_DUPLICADO' });
      expect((await repo.listarPacientes({ documento: 'MENOR-ERROR' })).total).toBe(0);
      expect(typeof paciente.id).toBe('string');
      await repo.actualizarContacto(paciente.id, { telefono: '12345678' });
      expect((await repo.obtenerPaciente(paciente.id)).telefono).toBe('12345678');
      expect((await repo.obtenerEquipo()).items).toHaveLength(1);
      await repo.guardarResponsable(paciente.id, { nombres: 'Responsable', apellidos: 'Ficticio', parentesco: 'Madre', esPrincipal: true });
      expect((await repo.obtenerResponsables(paciente.id)).items[0].esPrincipal).toBe(true);
      await repo.guardarAlergia(paciente.id, { alergiaId: '1', nivelSeveridad: 'Alta', reaccion: 'Prueba' });
      await repo.guardarAlergia(paciente.id, { alergiaId: '1', nivelSeveridad: 'Moderada', reaccion: 'Actualizada' });
      expect((await repo.obtenerAlergias(paciente.id)).items[0].reaccion).toBe('Actualizada');
      const cita = await repo.crearCita({ pacienteId: paciente.id, usuarioId: '1', fecha: '2026-11-10', hora: '09:00', motivo: 'Control' });
      const agendaHttp = await autorizar(request(app).get('/odontologia/agenda?fecha=2026-11-10'), 'odontologo');
      expect(agendaHttp.status).toBe(200);
      expect(agendaHttp.body.items[0]).toMatchObject({ id: cita.id, pacienteId: paciente.id, hora: '09:00' });
      await expect(repo.crearCita({ pacienteId: paciente.id, usuarioId: '1', fecha: '2026-11-10', hora: '09:00', motivo: 'Duplicada' })).rejects.toMatchObject({ code: '23505' });
      await repo.cambiarCita(cita.id, { fecha: '2026-11-10', hora: '10:00', estado: 'confirmada' });
      expect((await repo.obtenerAgenda('2026-11-10', '1')).items[0].hora).toBe('10:00');
      expect((await repo.obtenerAgenda('2026-11-10', '2')).items).toHaveLength(0);
      const consulta = await repo.crearConsulta({ pacienteId: paciente.id, usuarioId: '1', citaId: cita.id, motivo: 'Control', detallesInstitucion: { servicios: [{ servicioId: '1', piezaDental: 11, superficie: 'O' }, { servicioId: '1', piezaDental: 26, superficie: 'M' }] } });
      expect((await repo.obtenerHistorial(paciente.id)).consultas[0].detallesInstitucion.servicios).toHaveLength(2);
      const diagnostico = await repo.agregarDiagnostico(consulta.id, { descripcion: 'Prueba' });
      await repo.registrarTratamiento(diagnostico.id, { descripcion: 'Prueba' });
      await repo.recetarMedicamento(consulta.id, { medicamentos: [{ medicamentoId: '1', dosis: 'Prueba', frecuencia: 'Prueba' }] });
      await expect(repo.recetarMedicamento(consulta.id, { medicamentos: [{ medicamentoId: '1', dosis: 'Prueba', frecuencia: 'Prueba' }, { medicamentoId: '99999', dosis: 'Prueba', frecuencia: 'Prueba' }] })).rejects.toMatchObject({ code: '23503' });
      expect((await repo.obtenerHistorial(paciente.id)).consultas[0].recetas).toHaveLength(1);
      await expect(repo.finalizarConsulta(consulta.id, '2')).rejects.toMatchObject({ status: 404 });
      expect((await autorizar(request(app).patch(`/odontologia/consultas/${consulta.id}/finalizar`), 'odontologo').send({})).status).toBe(200);
      expect((await repo.obtenerAgenda('2026-11-10')).items[0].estado).toBe('completada');
      await expect(repo.agregarDiagnostico(consulta.id, { descripcion: 'Tardío' })).rejects.toMatchObject({ codigo: 'CONSULTA_NO_DISPONIBLE' });
      await repo.archivarHistorial(paciente.id, { tipo: 'administrativo', detalle: 'Prueba' });
      expect((await repo.obtenerHistorial(paciente.id)).historial.estado).toBe('archivado');
      await expect(repo.guardarAlergia(paciente.id, { alergiaId: '1', nivelSeveridad: 'Alta', reaccion: 'Prueba' })).rejects.toMatchObject({ status: 409 });
      const redHistorial = await autorizar(request(app).get(`/red/odontologia/pacientes/${paciente.id}/historial`), 'odontologo');
      expect(redHistorial.status).toBe(200);
      expect(redHistorial.body.historial.estado).toBe('archivado');
      await pool.query(await readFile(new URL('../../infra/database/postgresql/validacion/odontologia_solo_lectura.sql', import.meta.url), 'utf8'));
    } finally {
      await pool.end();
      await admin.query(`DROP DATABASE ${base}`);
      await admin.end();
    }
  }, 30000);
});
