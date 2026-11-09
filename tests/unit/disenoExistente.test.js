import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';

it('conserva íntegros HTML y CSS de las cuatro instituciones y componentes compartidos', async () => {
  const referencia = JSON.parse(await readFile(new URL('../fixtures/diseno-existente.json', import.meta.url), 'utf8'));
  for (const [ruta, hash] of Object.entries(referencia)) {
    const datos = await readFile(new URL(`../../${ruta}`, import.meta.url));
    // Git normaliza saltos de línea: la apariencia no depende de LF o CRLF.
    const normalizado = datos.toString('utf8').replace(/\r\n/g, '\n');
    expect(createHash('sha256').update(normalizado).digest('hex'), ruta).toBe(hash);
  }
});
