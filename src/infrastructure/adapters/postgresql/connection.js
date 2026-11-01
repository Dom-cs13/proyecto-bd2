import pg from "pg";

const { Pool } = pg;

export function crearPoolPostgres(configuracion = {}) {
  const connectionString = configuracion.connectionString ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL no esta configurada para PostgreSQL");
  }

  return new Pool({
    connectionString,
    max: configuracion.max ?? 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  });
}

export async function verificarConexion(pool) {
  const resultado = await pool.query("SELECT 1 AS conectado");
  return resultado.rows[0].conectado === 1;
}

export async function cerrarConexion(pool) {
  await pool.end();
}
