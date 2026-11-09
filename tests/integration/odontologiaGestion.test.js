import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { crearRouterOdontologia } from '../../src/interfaces/http/routes/odontologiaPacientes.js';
import { errorHandler, noEncontrado } from '../../src/interfaces/http/middleware/errorHandler.js';
import { MotorNoDisponible } from '../../src/domain/errores.js';

const clave = 'clave-ficticia-gestion-odontologia';
const firma = (rol, institucion = 'odontologia') => jwt.sign({ rol, institucion }, clave, {
  subject: '9', expiresIn: '1h', issuer: 'red-salud', audience: 'red-salud-web',
});
const operaciones = [
  ['post', '/odontologia/citas', 'crearCita', 'secretaria', { pacienteId: '7', usuarioId: '9', fecha: '2026-11-10', hora: '09:00', motivo: 'Control' }],
  ['patch', '/odontologia/citas/2', 'cambiarCita', 'secretaria', { fecha: '2026-11-10', hora: '10:00', estado: 'confirmada' }],
  ['post', '/odontologia/pacientes/7/responsables', 'guardarResponsable', 'secretaria', { nombres: 'Ana', apellidos: 'López', parentesco: 'Madre', esPrincipal: true }],
  ['post', '/odontologia/pacientes/7/alergias', 'guardarAlergia', 'odontologo', { alergiaId: '2', nivelSeveridad: 'Alta', reaccion: 'Erupción' }],
  ['patch', '/odontologia/consultas/4/finalizar', 'finalizarConsulta', 'odontologo', {}],
  ['patch', '/odontologia/pacientes/7/contacto', 'actualizarContacto', 'secretaria', { telefono: '12345678' }],
];

describe('Odontología · gestión institucional', () => {
  let app, repo, resolver;
  beforeEach(() => {
    repo = Object.fromEntries(operaciones.map(([, , metodo]) => [metodo, vi.fn().mockResolvedValue({ id: '2' })]));
    repo.obtenerAgenda = vi.fn().mockResolvedValue({ items: [] });
    repo.crearPaciente = vi.fn().mockResolvedValue({ id: '7' });
    resolver = vi.fn(() => repo);
    app = express(); app.use(express.json());
    app.use(crearRouterOdontologia({ obtenerRepositorio: resolver, obtenerClave: () => clave }));
    app.use(noEncontrado); app.use(errorHandler);
  });
  it.each(operaciones)('%s %s ejecuta el flujo autorizado', async (metodo, ruta, operacion, rol, datos) => {
    const res = await request(app)[metodo](ruta).set('Authorization', `Bearer ${firma(rol)}`).send(datos);
    expect(res.status).toBe(metodo === 'post' ? 201 : 200);
    expect(resolver).toHaveBeenCalledWith('odontologia');
    expect(repo[operacion]).toHaveBeenCalledOnce();
    if (operacion === 'finalizarConsulta') expect(repo[operacion]).toHaveBeenCalledWith('4', '9');
  });
  it.each(operaciones)('%s %s impide rol incorrecto, token ajeno y ausencia de token', async (metodo, ruta, operacion, rol, datos) => {
    for (const token of [firma(rol === 'secretaria' ? 'odontologo' : 'secretaria'), firma(rol, 'laboratorio'), firma(rol, 'hospital'), firma(rol, 'pediatria')]) {
      expect((await request(app)[metodo](ruta).set('Authorization', `Bearer ${token}`).send(datos)).status).toBe(403);
    }
    expect((await request(app)[metodo](ruta).send(datos)).status).toBe(401);
    expect(repo[operacion]).not.toHaveBeenCalled();
    expect(resolver).not.toHaveBeenCalled();
  });
  it('filtra la agenda clínica por el sujeto verificado; secretaría ve el día', async () => {
    for (const rol of ['odontologo', 'secretaria']) {
      expect((await request(app).get('/odontologia/agenda?fecha=2026-11-10').set('Authorization', `Bearer ${firma(rol)}`)).status).toBe(200);
      expect(repo.obtenerAgenda).toHaveBeenLastCalledWith('2026-11-10', rol === 'odontologo' ? '9' : undefined);
    }
  });
  it('rechaza hora inválida, campos desconocidos y contacto vacío', async () => {
    const datos = operaciones[0][4];
    for (const body of [{ ...datos, hora: '25:00' }, { ...datos, institucion: 'hospital' }]) {
      expect((await request(app).post('/odontologia/citas').set('Authorization', `Bearer ${firma('secretaria')}`).send(body)).status).toBe(400);
    }
    expect((await request(app).patch('/odontologia/pacientes/7/contacto').set('Authorization', `Bearer ${firma('secretaria')}`).send({})).status).toBe(400);
    expect(repo.crearCita).not.toHaveBeenCalled();
  });
  it('un menor requiere responsable principal validado antes de persistir', async () => {
    const datos = { nombre: 'Menor', apellidos: 'Ficticio', fechaNacimiento: '2020-01-01', genero: 'Otro', documentoIdentidad: 'PRUEBA' };
    const enviar = (body) => request(app).post('/pacientes').set('Authorization', `Bearer ${firma('secretaria')}`).send(body);
    expect((await enviar(datos)).status).toBe(400);
    expect(repo.crearPaciente).not.toHaveBeenCalled();
    const detallesInstitucion = { responsableLegal: { nombres: 'Adulto', apellidos: 'Ficticio', parentesco: 'Tutor', esPrincipal: true } };
    expect((await enviar({ ...datos, detallesInstitucion })).status).toBe(201);
    expect(repo.crearPaciente).toHaveBeenCalledWith(expect.objectContaining({ detallesInstitucion }));
  });
  it('traduce caída y duplicidad sin revelar SQL', async () => {
    repo.crearCita.mockRejectedValueOnce(new MotorNoDisponible('odontologia'))
      .mockRejectedValueOnce(Object.assign(new Error('SQL privado'), { code: '23505' }));
    for (const status of [503, 409]) {
      const res = await request(app).post('/odontologia/citas').set('Authorization', `Bearer ${firma('secretaria')}`).send(operaciones[0][4]);
      expect(res.status).toBe(status);
      expect(JSON.stringify(res.body)).not.toContain('SQL privado');
    }
  });
});
