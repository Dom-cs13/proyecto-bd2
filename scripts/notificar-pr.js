// Diagnóstico automático y notificación en Pull Requests (CI)
import { execSync } from 'node:child_process';

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const prNumero = process.env.PR_NUMBER;
const prTitulo = process.env.PR_TITLE || '';
const prAutor = process.env.PR_AUTHOR || 'colaborador';
const baseSha = process.env.BASE_SHA;
const headSha = process.env.HEAD_SHA;
const resReglas = process.env.RESULT_REGLAS || 'success';
const resSecretos = process.env.RESULT_SECRETOS || 'success';
const resCalidad = process.env.RESULT_CALIDAD || 'success';

if (!token || !repo || !prNumero) {
  console.log('[notificar-pr] Variables requeridas no disponibles, omitiendo notificación.');
  process.exit(0);
}

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

const fallas = [];

// 1. Verificar formato del título
const tituloValido = /^\[(I[1-4]-[0-9]{2}|PLAN)\] .+/.test(prTitulo);
if (!tituloValido) {
  fallas.push({
    titulo: 'Formato del título del PR',
    detalle: `El título actual \`"${prTitulo}"\` no cumple el formato requerido.`,
    solucion: 'Edita el título del PR (botón *Edit* arriba a la derecha) para que empiece con tu tarea del calendario. Ejemplo: `[I1-02] Registro de pacientes e historial` o `[I3-10] Frontend de laboratorio`.'
  });
}

// 2. Verificar conflictos con main
if (baseSha && headSha) {
  const mergeTree = run(`git merge-tree $(git merge-base ${baseSha} ${headSha}) ${baseSha} ${headSha}`);
  if (mergeTree && (mergeTree.includes('<<<<<<<') || mergeTree.includes('conflict'))) {
    fallas.push({
      titulo: 'Conflictos de fusión con main',
      detalle: 'Tu rama contiene modificaciones que colisionan directamente con la versión actual de `main`.',
      solucion: 'Actualiza tu rama local con `main` y resuelve los conflictos:\n```bash\ngit checkout tu-rama\ngit pull origin main\n# Resuelve los conflictos en tu editor\ngit add .\ngit commit -m "Resolver conflictos con main"\ngit push origin tu-rama\n```'
    });
  }
}

// 3. Verificar entrada de bitácora
if (baseSha && headSha) {
  const diffArchivos = run(`git diff --name-only ${baseSha}...${headSha}`) || '';
  const tieneBitacora = diffArchivos.split('\n').some((f) => f.startsWith('docs/bitacoras/'));
  if (!tieneBitacora) {
    fallas.push({
      titulo: 'Falta registrar la bitácora de la sesión',
      detalle: 'No se detectó ningún cambio dentro de la carpeta `docs/bitacoras/`.',
      solucion: 'Por regla obligatoria de `AGENTS.md` (sección 4.6), cada PR debe incluir la entrada de la sesión en tu archivo: `docs/bitacoras/<ID>-<institucion>/bitacora.md`.'
    });
  }

  // 4. Verificar credenciales o secretos prohibidos
  const creds = run(`git diff --name-only --diff-filter=AM ${baseSha}...${headSha}`) || '';
  const archivosProhibidos = creds.split('\n').filter((f) =>
    /(^|\/)\.env($|\.)|service-account.*\.json$|firebase-key.*\.json$|\.pem$/.test(f) &&
    !f.endsWith('.env.example')
  );
  if (archivosProhibidos.length > 0) {
    fallas.push({
      titulo: 'Archivos de credenciales o secretos detectados',
      detalle: `Se detectaron archivos restringidos:\n${archivosProhibidos.map((a) => `- \`${a}\``).join('\n')}`,
      solucion: 'Elimínalos del commit con `git rm --cached <archivo>`, agrégalos a `.gitignore` y haz commit.'
    });
  }
}

// 5. Verificar fallo de Gitleaks
if (resSecretos === 'failure') {
  fallas.push({
    titulo: 'Posibles credenciales o llaves privadas detectadas (Gitleaks)',
    detalle: 'El escáner de seguridad detectó posibles claves API, tokens o credenciales en el historial de commits.',
    solucion: 'Revisa tu historial con `git log -p` para eliminar cualquier clave real o secreto antes de hacer push.'
  });
}

// 6. Verificar fallo en Lint, pruebas y skills
if (resCalidad === 'failure') {
  fallas.push({
    titulo: 'Calidad de código, lint o pruebas de integración fallidas',
    detalle: 'El job de validación de código falló al ejecutar `npm run lint`, `npm test` o `npm run skills:check`.',
    solucion: 'Ejecuta estos comandos en tu máquina local para ver el error exacto:\n```bash\nnpm run lint          # Verifica reglas DIP y que fetch solo esté en frontend/shared/js/api/\nnpm test              # Corre las pruebas unitarias y de integración\nnpm run skills:check  # Verifica skills (si falla, ejecuta: npm run skills:sync)\n```'
  });
}

// Construir cuerpo del mensaje
let markdown = '';
const MARCADOR = '<!-- CI-DIAGNOSTICO -->';

if (fallas.length > 0) {
  markdown = `${MARCADOR}\n## ⚠️ Diagnóstico automático del CI: problemas por corregir\n\nHola @${prAutor}, la verificación automática del CI detectó **${fallas.length} problema(s)** que bloquean el paso de este PR:\n\n`;
  fallas.forEach((f, idx) => {
    markdown += `### ${idx + 1}. ${f.titulo}\n${f.detalle}\n\n👉 **Cómo resolverlo:**\n${f.solucion}\n\n---\n\n`;
  });
  markdown += `*Corrige estos puntos en tu rama local y haz \`git push\`. El CI volverá a evaluar automáticamente tu PR.*`;
} else if (resReglas === 'success' && resSecretos === 'success' && resCalidad === 'success') {
  markdown = `${MARCADOR}\n## ✅ Verificación del CI completada exitosamente\n\nTodos los checks automáticos del proyecto han pasado al 100%:\n- 🟢 **Reglas del PR:** Título reglamentario, sin conflictos, bitácora al día y sin credenciales.\n- 🟢 **Seguridad:** Sin secretos en commits (Gitleaks).\n- 🟢 **Calidad:** ESLint (reglas DIP y DRY), Vitest y skills sincronizadas.\n\n*El PR está listo para ser revisado y fusionado a \`main\`.*`;
} else {
  process.exit(0);
}

// Publicar o actualizar comentario vía GitHub API
async function publicarComentario() {
  const urlBase = `https://api.github.com/repos/${repo}/issues`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'CI-Diagnostico'
  };

  try {
    const listResp = await fetch(`${urlBase}/${prNumero}/comments`, { headers });
    if (!listResp.ok) throw new Error(`HTTP ${listResp.status} al listar comentarios`);
    const comentarios = await listResp.json();
    const previo = comentarios.find((c) => c.body && c.body.includes(MARCADOR));

    if (previo) {
      const patchResp = await fetch(`https://api.github.com/repos/${repo}/issues/comments/${previo.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: markdown })
      });
      if (!patchResp.ok) throw new Error(`HTTP ${patchResp.status} al actualizar comentario`);
      console.log(`[notificar-pr] Comentario ${previo.id} actualizado.`);
    } else if (fallas.length > 0) {
      const postResp = await fetch(`${urlBase}/${prNumero}/comments`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: markdown })
      });
      if (!postResp.ok) throw new Error(`HTTP ${postResp.status} al crear comentario`);
      console.log('[notificar-pr] Nuevo comentario de diagnóstico publicado.');
    }
  } catch (err) {
    console.error('[notificar-pr] Error al publicar comentario:', err.message);
  }
}

await publicarComentario();
