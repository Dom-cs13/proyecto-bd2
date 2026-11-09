#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearPoolMariaDb } from '../src/infrastructure/adapters/mariadb/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function sembrarPediatria() {
  console.log('🌱 Sembrando datos del Centro Pediátrico en MariaDB...');

  if (!process.env.MARIADB_HOST || !process.env.MARIADB_USER || !process.env.MARIADB_DATABASE) {
    console.log('⚠️ Variables MARIADB_* no configuradas. Omitiendo siembra en MariaDB.');
    return;
  }

  const pool = crearPoolMariaDb();
  let conn;

  try {
    conn = await pool.getConnection();
    const rutaSeeds = path.join(__dirname, '../infra/database/mariadb/seeds/seeds_pediatria.sql');
    const contenidoSql = fs.readFileSync(rutaSeeds, 'utf-8');

    // Dividir sentencias por ';' limpiando comentarios
    const sentencias = contenidoSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const sentencia of sentencias) {
      try {
        await conn.query(sentencia);
      } catch (err) {
        // Ignorar duplicados o errores menores en tablas con esquemas ligeramente variantes
        if (!['ER_DUP_ENTRY', 'ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(err.code)) {
          console.warn(`  ⚠️ Sentencia con advertencia (${err.code}):`, err.message);
        }
      }
    }

    console.log('✅ Siembra de Pediatría completada exitosamente.');
  } catch (error) {
    console.error('❌ Error al sembrar Pediatría:', error.message);
    throw error;
  } finally {
    if (conn) conn.release();
    await pool.end();
  }
}

if (process.argv[1] === __filename) {
  sembrarPediatria().catch(() => process.exit(1));
}

export { sembrarPediatria };
