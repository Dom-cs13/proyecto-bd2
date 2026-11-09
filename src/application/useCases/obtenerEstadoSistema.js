/**
 * @file obtenerEstadoSistema.js
 * Caso de uso: Diagnóstico de estado y latencia de los motores de persistencia.
 * Responsabilidad de la tarea I1-08 / sección 3.3 y 7.6 del plan.
 * Cumple estrictamente con DIP: agnóstico a drivers y motores.
 */

export const institucionesSistema = [
  { id: 'hospital', motorDefecto: 'mongodb' },
  { id: 'odontologia', motorDefecto: 'postgresql' },
  { id: 'laboratorio', motorDefecto: 'firestore' },
  { id: 'pediatria', motorDefecto: 'mariadb' },
];

function normalizarNombreMotor(motorBruto, motorDefecto) {
  if (!motorBruto || typeof motorBruto !== 'string') return motorDefecto;
  const lower = motorBruto.toLowerCase();
  if (lower.includes('mongo')) return 'mongodb';
  if (lower.includes('postgres')) return 'postgresql';
  if (lower.includes('firestore') || lower.includes('firebase')) return 'firestore';
  if (lower.includes('maria')) return 'mariadb';
  return lower;
}

/**
 * Ejecuta el ping de diagnóstico a cada repositorio disponible.
 *
 * @param {Record<string, { ping: () => Promise<object> }>} repositorios - Repositorios inyectados
 * @param {object} [opciones]
 * @param {number} [opciones.timeoutMs=4000] - Tiempo límite para considerar el motor desconectado
 * @returns {Promise<{ motores: Record<string, { estado: string, motor: string, latenciaMs: number|null }> }>}
 */
export async function obtenerEstadoSistema(repositorios, { timeoutMs = 4000 } = {}) {
  const promesas = institucionesSistema.map(async ({ id, motorDefecto }) => {
    const repo = repositorios?.[id];
    if (!repo || typeof repo.ping !== 'function') {
      return {
        id,
        estado: 'desconectado',
        motor: motorDefecto,
        latenciaMs: null,
      };
    }

    try {
      let temporizador;
      const timeout = new Promise((_, reject) => {
        temporizador = setTimeout(() => reject(new Error('Timeout de ping')), timeoutMs);
      });

      const pingPromise = Promise.resolve().then(() => repo.ping());
      const res = await Promise.race([pingPromise, timeout]).finally(() => clearTimeout(temporizador));

      if (res && res.ok !== false) {
        const motor = normalizarNombreMotor(res.motor, motorDefecto);
        const latenciaMs = typeof res.latenciaMs === 'number'
          ? Math.max(1, Math.round(res.latenciaMs))
          : 1;

        return {
          id,
          estado: 'conectado',
          motor,
          latenciaMs,
        };
      }

      return {
        id,
        estado: 'desconectado',
        motor: normalizarNombreMotor(res?.motor, motorDefecto),
        latenciaMs: null,
      };
    } catch {
      return {
        id,
        estado: 'desconectado',
        motor: motorDefecto,
        latenciaMs: null,
      };
    }
  });

  const resultados = await Promise.all(promesas);
  const motores = {};
  for (const r of resultados) {
    motores[r.id] = {
      estado: r.estado,
      motor: r.motor,
      latenciaMs: r.latenciaMs,
    };
  }

  return {
    motores,
    ...motores,
  };
}
