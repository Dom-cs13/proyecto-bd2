import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const conectar = vi.hoisted(() => vi.fn());
const crearCliente = vi.hoisted(() => vi.fn(function () {
  return { connect: conectar, db: () => ({ command: vi.fn() }), close: vi.fn().mockResolvedValue() };
}));
vi.mock('mongodb', () => ({ MongoClient: crearCliente }));
vi.mock('node:dns/promises', () => ({ default: { resolveSrv: vi.fn().mockResolvedValue([{ name: 'nodo.example.invalid', port: 27017 }]) } }));
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });
afterEach(() => vi.unstubAllEnvs());
it('entrega al driver la URI Atlas completa, sin perder authSource, replicaSet ni opciones TLS', async () => {
  const uri = 'mongodb+srv://fixture:fixture@cluster.example.invalid/prueba?authSource=otra&retryWrites=false&replicaSet=prueba';
  vi.stubEnv('MONGO_URI', uri);
  await (await import('../../src/infrastructure/adapters/mongodb/connection.js')).obtenerConexionMongo();
  expect(crearCliente.mock.calls[0][0]).toBe(uri);
});
it('un fallo de conexión Mongo no devuelve información de credenciales ni hosts', async () => {
  vi.stubEnv('MONGO_URI', 'mongodb://127.0.0.1:27017/ficticia');
  conectar.mockRejectedValueOnce(new Error('detalle-privado-de-la-conexion'));
  const { obtenerConexionMongo } = await import('../../src/infrastructure/adapters/mongodb/connection.js');
  const error = await obtenerConexionMongo().catch(error => error);
  expect(error).toMatchObject({ status: 503 });
  expect(error.message).not.toContain('detalle-privado');
});
