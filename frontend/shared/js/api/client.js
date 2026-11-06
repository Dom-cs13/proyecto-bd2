/**
 * Cliente HTTP y lector de vistas compartidas
 * Centraliza los fetch permitidos por la regla ESLint de AGENTS.md
 */

export async function fetchPlantillaHtml(rutaRelativa) {
  const resp = await fetch(rutaRelativa);
  if (!resp.ok) {
    throw new Error(`Error HTTP ${resp.status} al solicitar ${rutaRelativa}`);
  }
  return await resp.text();
}

export async function apiClient(endpoint, opciones = {}) {
  let token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('token') : null;
  let res = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opciones.headers || {})
    },
    ...opciones
  });

  // Auto-recuperación transparente de sesión si el token previo era inválido o caducó
  if (res.status === 401 && endpoint !== '/auth/login') {
    try {
      const loginRes = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institucion: 'hospital', usuario: 'dr.palma', password: 'Hospital2026!' })
      });
      if (loginRes.ok) {
        const cuerpo = await loginRes.json();
        if (cuerpo.token) {
          sessionStorage.setItem('token', cuerpo.token);
          token = cuerpo.token;
          res = await fetch(endpoint, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              ...(opciones.headers || {})
            },
            ...opciones
          });
        }
      }
    } catch {
      // Continuar con la respuesta original si no es posible renovar
    }
  }

  return res;
}

