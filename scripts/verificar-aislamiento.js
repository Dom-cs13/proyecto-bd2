#!/usr/bin/env node
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { crearApp } from '../src/app.js';
import { MotorNoDisponible } from '../src/domain/errores.js';

const clave = 'clave-aislamiento-verificacion-2026';

function crearToken(institucion, rol) {
  return jwt.sign({ institucion, rol }, clave, {
    subject: '1',
    expiresIn: '1h',
    issuer: 'red-salud',
    audience: 'red-salud-web',
  });
}

async function verificarAislamiento() {
  console.log('🧪 Iniciando verificación de aislamiento institucional (I4-09)...');

  let falloPedia = false;
  let falloOdonto = false;

  const repoPedia = {
    crearPaciente: async () => ({ id: '1', institucion: 'pediatria' }),
    listarPacientes: async () => {
      if (falloPedia) throw new MotorNoDisponible('pediatria');
      return { items: [{ id: '10', institucion: 'pediatria' }], total: 1 };
    },
    obtenerHistorial: async () => ({ historial: { estado: 'activo' } }),
    ping: async () => ({ ok: true, motor: 'mariadb' }),
  };

  const repoOdonto = {
    crearPaciente: async () => ({ id: '2', institucion: 'odontologia' }),
    listarPacientes: async () => {
      if (falloOdonto) throw new MotorNoDisponible('odontologia');
      return { items: [{ id: '20', institucion: 'odontologia' }], total: 1 };
    },
    obtenerHistorial: async () => ({ historial: { estado: 'activo' } }),
    ping: async () => ({ ok: true, motor: 'postgresql' }),
  };

  const app = crearApp({
    pediatria: {
      obtenerRepositorio: () => repoPedia,
      obtenerClave: () => clave,
    },
    odontologia: {
      obtenerRepositorio: () => repoOdonto,
      obtenerClave: () => clave,
    },
  });

  // 1. Token de pediatría lista pacientes pediátricos
  const resPedia = await request(app)
    .get('/pacientes')
    .set('Authorization', `Bearer ${crearToken('pediatria', 'recepcion')}`);
  if (resPedia.status !== 200 || resPedia.body.items[0].institucion !== 'pediatria') {
    throw new Error('Fallo: token de pediatria no obtuvo datos de pediatria');
  }
  console.log('  ✓ Token de Pediatría accede exclusivamente a datos pediátricos.');

  // 2. Token de odontología lista pacientes odontológicos
  const resOdonto = await request(app)
    .get('/pacientes')
    .set('Authorization', `Bearer ${crearToken('odontologia', 'secretaria')}`);
  if (resOdonto.status !== 200 || resOdonto.body.items[0].institucion !== 'odontologia') {
    throw new Error('Fallo: token de odontologia no obtuvo datos de odontologia');
  }
  console.log('  ✓ Token de Odontología accede exclusivamente a datos odontológicos.');

  // 3. Token de pediatría bloqueado en endpoints odontológicos
  const resPediaEnOdonto = await request(app)
    .get('/odontologia/catalogos')
    .set('Authorization', `Bearer ${crearToken('pediatria', 'pediatra')}`);
  if (resPediaEnOdonto.status !== 403) {
    throw new Error(`Fallo: token de pediatria debió recibir 403 en odontología, recibió ${resPediaEnOdonto.status}`);
  }
  console.log('  ✓ Token de Pediatría es rechazado con 403 en endpoints específicos de otra institución.');

  // 4. Token de odontología bloqueado en endpoints pediátricos
  const resOdontoEnPedia = await request(app)
    .get('/pediatria/catalogos')
    .set('Authorization', `Bearer ${crearToken('odontologia', 'odontologo')}`);
  if (resOdontoEnPedia.status !== 403) {
    throw new Error(`Fallo: token de odontologia debió recibir 403 en pediatria, recibió ${resOdontoEnPedia.status}`);
  }
  console.log('  ✓ Token de Odontología es rechazado con 403 en endpoints específicos de pediatría.');

  // 5. Aislamiento de caídas (503): caída de MariaDB solo afecta a pediatría
  falloPedia = true;
  const resPediaCaida = await request(app)
    .get('/pacientes')
    .set('Authorization', `Bearer ${crearToken('pediatria', 'recepcion')}`);
  if (resPediaCaida.status !== 503) {
    throw new Error('Fallo: pediatría debió responder 503 al estar su motor caído');
  }

  // Odontología sigue funcionando 200
  const resOdontoSigueViva = await request(app)
    .get('/pacientes')
    .set('Authorization', `Bearer ${crearToken('odontologia', 'secretaria')}`);
  if (resOdontoSigueViva.status !== 200) {
    throw new Error('Fallo: odontología debió seguir respondiendo 200');
  }
  console.log('  ✓ Caída de MariaDB (503) aislada: Odontología continúa operando normalmente.');

  console.log('🎉 Verificación de aislamiento exitosa. Todas las reglas de no-fuga y resiliencia se cumplen.');
}

verificarAislamiento().catch((err) => {
  console.error('❌ Error en verificación de aislamiento:', err.message);
  process.exit(1);
});
