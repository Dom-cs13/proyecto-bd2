import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const certificados = vi.hoisted(() => vi.fn(() => 'credencial-ficticia'));
const iniciar = vi.hoisted(() => vi.fn(opciones => opciones));
vi.mock('firebase-admin/app', () => ({ cert: certificados, initializeApp: iniciar, getApps: () => [], applicationDefault: () => 'credencial-ficticia' }));
vi.mock('firebase-admin/firestore', () => ({ getFirestore: vi.fn() }));
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  for (const nombre of ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_SERVICE_ACCOUNT_PATH', 'GOOGLE_APPLICATION_CREDENTIALS', 'FIRESTORE_EMULATOR_HOST', 'FIREBASE_API_KEY']) vi.stubEnv(nombre, '');
});
afterEach(() => vi.unstubAllEnvs());
it('convierte los saltos escapados de configuración en saltos reales antes de cert()', async () => {
  vi.stubEnv('FIREBASE_PROJECT_ID', 'demo-prueba');
  vi.stubEnv('FIREBASE_CLIENT_EMAIL', 'fixture@example.invalid');
  const barra = String.fromCharCode(92);
  vi.stubEnv('FIREBASE_PRIVATE_KEY', `linea1${barra}nlinea2${barra}n`);
  (await import('../../src/infrastructure/config/firebase.js')).obtenerFirebaseApp();
  expect(certificados.mock.calls[0][0].privateKey).toBe(['linea1', 'linea2', ''].join(String.fromCharCode(10)));
});
it('una API key del navegador no sustituye credenciales del Admin SDK', async () => {
  vi.stubEnv('FIREBASE_PROJECT_ID', 'demo-prueba');
  vi.stubEnv('FIREBASE_API_KEY', 'solo-identificador-publico');
  const { obtenerFirebaseApp } = await import('../../src/infrastructure/config/firebase.js');
  expect(() => obtenerFirebaseApp()).toThrow();
  expect(iniciar).not.toHaveBeenCalled();
});
