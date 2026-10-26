// Copia .agents/skills/ a .claude/skills/ (npm run skills:sync). Con --check solo compara (CI).
import { cpSync, rmSync, readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const origen = '.agents/skills';
const destino = '.claude/skills';

function archivos(dir, base = dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? archivos(p, base) : [p.slice(base.length)];
  });
}

if (process.argv.includes('--check')) {
  const a = archivos(origen);
  const b = archivos(destino);
  const distinto = a.length !== b.length ||
    a.some((f) => !b.includes(f) || readFileSync(join(origen, f), 'utf8') !== readFileSync(join(destino, f), 'utf8'));
  if (distinto) { console.error('Skills desincronizadas: corre npm run skills:sync'); process.exit(1); }
  console.log('Skills sincronizadas');
} else {
  rmSync(destino, { recursive: true, force: true });
  cpSync(origen, destino, { recursive: true });
  console.log(`Sincronizado ${origen} -> ${destino}`);
}
