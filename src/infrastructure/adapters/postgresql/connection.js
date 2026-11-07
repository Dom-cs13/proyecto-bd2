import pg from "pg";

const { Pool } = pg;

export function crearPoolPostgres(configuracion = {}) {
  const connectionString = configuracion.connectionString ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL no esta configurada para PostgreSQL");
  }

  const pool = new Pool({
    connectionString,
    ssl: configuracion.ssl ?? { rejectUnauthorized: true },
    // DATE no representa un instante. Evitar cambios de día por zona horaria.
    types: { getTypeParser: (oid, formato) => oid === 1082 ? (valor) => valor : pg.types.getTypeParser(oid, formato) },
    max: configuracion.max ?? 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  });
  // pg retira el cliente inactivo al fallar. Consumir el evento evita que un
  // fallo de este motor termine Express. El adaptador traduce fallos de peticiones.
  pool.on('error', () => {});
  return pool;
}

export async function verificarConexion(pool) {
  const resultado = await pool.query("SELECT 1 AS conectado");
  return resultado.rows[0].conectado === 1;
}

export async function cerrarConexion(pool) {
  await pool.end();
}
