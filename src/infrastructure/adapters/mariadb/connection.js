import mariadb from 'mariadb';

export function crearPoolMariaDb(configuracion = {}) {
  const host = configuracion.host ?? process.env.MARIADB_HOST;
  const port = Number(configuracion.port ?? process.env.MARIADB_PORT ?? 3306);
  const user = configuracion.user ?? process.env.MARIADB_USER;
  const password = configuracion.password ?? process.env.MARIADB_PASSWORD;
  const database = configuracion.database ?? process.env.MARIADB_DATABASE;
  const usarSsl = configuracion.ssl ?? (
    process.env.MARIADB_SSL === 'true' ||
    process.env.MARIADB_HOST?.includes('skysql') ||
    process.env.MARIADB_HOST?.includes('mariadb.com')
  );

  if (!host || !user || !database) {
    throw new Error('Variables MARIADB_* no estan configuradas para MariaDB');
  }

  const opciones = {
    host,
    port,
    user,
    password,
    database,
    connectionLimit: configuracion.max ?? 5,
    connectTimeout: 5000,
    acquireTimeout: 5000,
  };

  if (usarSsl) {
    opciones.ssl = { rejectUnauthorized: true };
  }

  return mariadb.createPool(opciones);
}

export async function verificarConexion(pool) {
  let conn;
  try {
    conn = await pool.getConnection();
    const resultado = await conn.query('SELECT 1 AS conectado');
    return resultado[0]?.conectado === 1 || resultado[0]?.conectado === 1n;
  } finally {
    if (conn) conn.release();
  }
}

export async function cerrarConexion(pool) {
  await pool.end();
}
