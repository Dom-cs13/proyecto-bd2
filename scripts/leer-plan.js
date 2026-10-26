// Lee solo un trozo de la planificación (ahorra tokens frente a leer los 42 KB completos).
//   node scripts/leer-plan.js lista            -> índice de secciones
//   node scripts/leer-plan.js seccion 7.2      -> una sección (con sus subsecciones)
//   node scripts/leer-plan.js tarea I2-05      -> sesión, "hecho cuando…" y dependencias
import { readFileSync } from 'node:fs';

const lineas = readFileSync('docs/planificacion/PLANIFICACION.md', 'utf8').split('\n');
const [cmd, arg] = process.argv.slice(2);
const titulo = (l) => /^(#{1,4}) (.*)/.exec(l);

if (cmd === 'lista') {
  lineas.forEach((l, i) => { const m = titulo(l); if (m && m[1].length > 1) console.log(`${i + 1}\t${l}`); });
} else if (cmd === 'seccion' && arg) {
  const ini = lineas.findIndex((l) => titulo(l) && new RegExp(`^#{1,4} ${arg.replace('.', '\\.')}(\\.|\\s|$)`).test(l));
  if (ini < 0) { console.error(`No existe la sección ${arg}`); process.exit(1); }
  const nivel = titulo(lineas[ini])[1].length;
  let fin = lineas.length;
  for (let i = ini + 1; i < lineas.length; i++) {
    const m = titulo(lineas[i]);
    if (m && m[1].length <= nivel) { fin = i; break; }
    if (lineas[i] === '---') { fin = i; break; }
  }
  console.log(lineas.slice(ini, fin).join('\n'));
} else if (cmd === 'tarea' && arg) {
  const generica = arg.replace(/^I\d/, 'I#');
  const marca = (c) => c.includes(`**${arg}**`) || c.includes(`**${generica}**`) || c.includes(`${arg} /`) || c.includes(`/ ${arg}`);
  let sesion = '';
  for (const l of lineas) {
    if (!l.startsWith('|')) continue;
    const c = l.split('|').slice(1, -1).map((x) => x.trim());
    if (/^\*\*S\d+\*\*$/.test(c[0])) sesion = c[0];
    if (c.length >= 5 && /^\*\*S\d+\*\*$/.test(c[0])) {
      const celda = c.slice(1).find((x) => x.includes(`**${arg}**`));
      if (celda) console.log(`[Calendario ${sesion}] ${celda}`);
    } else if (c.length === 2 && marca(c[0])) {
      console.log(`[Hecho cuando] ${c[0]}: ${c[1]}`);
    } else if (c.length === 3 && (c[0].includes(arg) || c[0].includes(generica) || c[0].includes(arg.split('-')[0] + '-'))) {
      if (c[0].includes(arg) || c[0].includes(generica)) console.log(`[Dependencia] ${c[0]} <- ${c[1]} (${c[2]})`);
    }
  }
  for (const l of lineas) {
    const c = l.startsWith('|') ? l.split('|').slice(1, -1).map((x) => x.trim()) : [];
    if (c.length === 3 && c[1].includes(arg) && !c[0].startsWith('**')) console.log(`[Bloquea a] ${c[0]} (${c[2]})`);
  }
} else {
  console.error('Uso: lista | seccion <n.n> | tarea <I#-XX>');
  process.exit(1);
}
