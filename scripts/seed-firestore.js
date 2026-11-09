/**
 * @file seed-firestore.js
 * Script para poblar la base de datos de Firebase Firestore con los datos iniciales
 * de Laboratorio Clínico (I3), verificando la conectividad con la nube.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { esFirebaseConfigurado, obtenerFirestore } from '../src/infrastructure/config/firebase.js';
import { pacienteToFirestore } from '../src/infrastructure/adapters/firestore/mapper.js';

async function ejecutarSeed() {
  console.log('--- Poblado de Firestore · Laboratorio Clínico (I3) ---');

  if (!esFirebaseConfigurado()) {
    console.error('❌ Error: Credenciales de Firebase no encontradas.');
    console.error('\nPara configurar la conexión a Firestore:');
    console.error('1. Descarga la clave de Cuenta de Servicio en Firebase Console -> Configuración -> Cuentas de servicio.');
    console.error('2. Guarda el archivo en: infra/database/firestore/serviceAccountKey.json');
    console.error('   O define FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY en tu .env.');
    console.error('Consulta la guía completa en: infra/database/firestore/estructura.md\n');
    process.exit(1);
  }

  const rutaSeeds = resolve(process.cwd(), 'infra/database/firestore/seeds/laboratorioSeeds.json');
  if (!existsSync(rutaSeeds)) {
    console.error(`❌ No se encontró el archivo de semillas en: ${rutaSeeds}`);
    process.exit(1);
  }

  const semillas = JSON.parse(readFileSync(rutaSeeds, 'utf8'));
  let db;

  try {
    db = obtenerFirestore();
  } catch (err) {
    console.error('❌ Error al inicializar cliente Firestore:', err.message);
    process.exit(1);
  }

  console.log('Conectado a Firestore. Iniciando carga de colecciones...');

  // 1. Pacientes
  let pacCount = 0;
  if (Array.isArray(semillas.pacientes)) {
    for (const p of semillas.pacientes) {
      const docData = pacienteToFirestore(p);
      await db.collection('pacientes').doc(p.id).set(docData);
      pacCount++;
    }
  }

  // 2. Órdenes
  let ordCount = 0;
  if (Array.isArray(semillas.ordenes)) {
    for (const o of semillas.ordenes) {
      await db.collection('ordenes').doc(o.id).set(o);
      ordCount++;
    }
  }

  // 3. Muestras
  let mueCount = 0;
  if (Array.isArray(semillas.muestras)) {
    for (const m of semillas.muestras) {
      await db.collection('muestras').doc(m.id).set(m);
      mueCount++;
    }
  }

  // 4. Resultados
  let resCount = 0;
  if (Array.isArray(semillas.resultados)) {
    for (const r of semillas.resultados) {
      await db.collection('resultados').doc(r.id).set(r);
      resCount++;
    }
  }

  console.log('\n✅ Carga de semillas completada con éxito:');
  console.log(`   - Pacientes:  ${pacCount}`);
  console.log(`   - Órdenes:    ${ordCount}`);
  console.log(`   - Muestras:   ${mueCount}`);
  console.log(`   - Resultados: ${resCount}`);
}

ejecutarSeed().catch((err) => {
  console.error('❌ Error durante la ejecución del seed:', err);
  process.exit(1);
});
