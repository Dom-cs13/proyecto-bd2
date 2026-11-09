// Evidencia visual con fixtures explícitos. No arranca src/server.js, no carga
// .env, no crea tokens y no conecta bases. Ejecutar manualmente, fuera de CI.
import express from 'express';
import { readFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const navegador = process.argv[2] ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const salida = resolve('artifacts/odontologia');
await mkdir(salida, { recursive: true });
const perfil = await mkdtemp(join(tmpdir(), 'alba-odontologia-visual-'));
const indice = await readFile('frontend/odontologia/index.html', 'utf8');
const appDemo = await readFile('frontend/odontologia/js/app.js', 'utf8');
const iconos = appDemo.slice(appDemo.indexOf('const trazos ='), appDemo.indexOf('const secciones ='));
const paciente = { id: '7', nombre: 'Paciente de prueba visual', apellidos: 'Datos ficticios', documentoIdentidad: 'VISUAL-7',
  fechaNacimiento: '2000-01-01', genero: 'Otro', telefono: '', correo: '', direccion: '' };
const expediente = { paciente, historial: { estado: 'activo' }, consultas: [{ id: '4', estado: 'borrador',
  fecha: '2026-11-08T15:00:00.000Z', motivo: 'Consulta de prueba visual', observaciones: '',
  diagnosticos: [], recetas: [], detallesInstitucion: { servicios: [{ piezaDental: 11, superficie: 'V', nombre: 'Procedimiento de prueba' }] } }] };
const app = express();
app.get('/odontologia/', (req, res) => res.type('html').send(indice.replace('/odontologia/js/app.js', '/__visual.js')));
app.get('/__visual.js', (req, res) => res.type('js').send(`
  import { iniciarPortalOdontologia } from '/odontologia/js/portalApi.js';
  ${iconos}
  const paciente = ${JSON.stringify(paciente)};
  const expediente = ${JSON.stringify(expediente)};
  const api = {
    agenda: async () => ({items:[{id:'2',pacienteId:'7',nombre:paciente.nombre,fecha:'2026-11-10',hora:'09:00',motivo:'Control de prueba visual',estado:'confirmada'}]}),
    listar: async () => ({items:[paciente],total:1}), paciente: async () => paciente,
    historial: async () => expediente, responsables: async () => ({items:[]}),
    alergias: async () => ({items:[],catalogo:[{id:'1',nombre:'Catálogo de prueba'}]}),
    catalogos: async () => ({servicios:[{id:'2',nombre:'Servicio de prueba'}],medicamentos:[{id:'3',nombre:'Medicamento de prueba'}]}),
    buscarEnRed: async () => ({resultados:[{institucion:'hospital',estado:'ok',items:[paciente],total:1},{institucion:'odontologia',estado:'ok',items:[paciente],total:1},{institucion:'laboratorio',estado:'no_disponible',items:[],total:0},{institucion:'pediatria',estado:'ok',items:[],total:0}]}),
  };
  document.getElementById('portal').hidden = false;
  document.querySelectorAll('[data-icon]').forEach(e => e.innerHTML=icono(e.dataset.icon));
  iniciarPortalOdontologia({sesion:{institucion:'odontologia',rol:new URLSearchParams(location.search).get('rol')},contenido:document.getElementById('contenido'),api,icono});
  setTimeout(() => { document.documentElement.dataset.viewport=innerWidth; document.documentElement.dataset.documentWidth=document.documentElement.scrollWidth; }, 500);
`));
app.use(express.static('frontend'));
const servidor = app.listen(0, '127.0.0.1');
await new Promise((resolver) => servidor.once('listening', resolver));
const puerto = servidor.address().port;
let socket, navegadorProceso;
const pendientes = new Map();
let secuencia = 0;
function enviar(method, params = {}, sessionId) {
  const id = ++secuencia;
  return new Promise((resolver, rechazar) => {
    pendientes.set(id, { resolver, rechazar });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
try {
  navegadorProceso = spawn(navegador, ['--headless', '--disable-gpu', '--no-first-run',
    `--user-data-dir=${perfil}`, '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', 'about:blank'],
  { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  const devtools = await new Promise((resolver, rechazar) => {
    const limite = setTimeout(() => rechazar(new Error('Chrome no inició DevTools')), 15000);
    navegadorProceso.once('error', (error) => { clearTimeout(limite); rechazar(error); });
    navegadorProceso.stderr.on('data', (datos) => {
      const url = /DevTools listening on (ws:\/\/[^\s]+)/.exec(String(datos))?.[1];
      if (url) { clearTimeout(limite); resolver(url); }
    });
  });
  socket = new WebSocket(devtools);
  await new Promise((resolver, rechazar) => { socket.addEventListener('open', resolver, { once: true }); socket.addEventListener('error', rechazar, { once: true }); });
  socket.addEventListener('message', ({ data }) => {
    const mensaje = JSON.parse(data);
    if (!mensaje.id) return;
    const pendiente = pendientes.get(mensaje.id);
    if (!pendiente) return;
    pendientes.delete(mensaje.id);
    if (mensaje.error) pendiente.rechazar(new Error(mensaje.error.message));
    else pendiente.resolver(mensaje.result);
  });
  const { targetId } = await enviar('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await enviar('Target.attachToTarget', { targetId, flatten: true });
  await enviar('Page.enable', {}, sessionId);
  for (const [nombre, rol, ruta, ancho, alto] of [
    ['secretaria-desktop', 'secretaria', 'inicio', 1440, 1000],
    ['odontologo-desktop', 'odontologo', 'inicio', 1440, 1000],
    ['odontograma-desktop', 'odontologo', 'consulta/7', 1440, 1500],
    ['odontograma-mobile', 'odontologo', 'consulta/7', 390, 1300],
    ['secretaria-mobile', 'secretaria', 'inicio', 390, 1100],
    ['red-desktop', 'odontologo', 'red?documento=VISUAL-7', 1440, 1100],
    ['red-mobile', 'secretaria', 'red?documento=VISUAL-7', 390, 1100],
    ['pacientes-desktop', 'secretaria', 'pacientes', 1440, 1000],
    ['pacientes-mobile', 'secretaria', 'pacientes', 390, 1100],
    ['registro-mobile', 'secretaria', 'registro', 390, 1100],
    ['expediente-desktop', 'odontologo', 'expediente/7', 1440, 1300],
    ['expediente-mobile', 'odontologo', 'expediente/7', 390, 1300],
    ['catalogos-mobile', 'odontologo', 'catalogos', 390, 1100],
  ]) {
    const destino = join(salida, `${nombre}.png`);
    await enviar('Emulation.setDeviceMetricsOverride', { width: ancho, height: alto, deviceScaleFactor: 1, mobile: ancho < 700 }, sessionId);
    await enviar('Page.navigate', { url: `http://127.0.0.1:${puerto}/odontologia/?rol=${rol}#${ruta}` }, sessionId);
    await new Promise((resolver) => setTimeout(resolver, 1000));
    const { result } = await enviar('Runtime.evaluate', { expression: `({
      ancho: innerWidth, documento: document.documentElement.scrollWidth,
      render: !!document.querySelector('.route-panel'), error: document.body.textContent.includes('No se pudo completar la operación'),
      dientes: document.querySelectorAll('[data-pieza]').length,
      salir: !![...document.querySelectorAll('a')].find(a => a.textContent.includes('Cerrar sesión') && a.getBoundingClientRect().height > 0)
    })`, returnByValue: true }, sessionId);
    const medidas = result.value;
    if (!medidas?.render || medidas.error) throw new Error(`Falló render de ${nombre}`);
    if (medidas.ancho !== ancho || medidas.documento > ancho) throw new Error(`Desbordamiento en ${nombre}: ${JSON.stringify(medidas)}`);
    if (!medidas.salir) throw new Error(`Cierre de sesión inaccesible en ${nombre}`);
    if (ruta === 'consulta/7' && medidas.dientes !== 32) throw new Error('Odontograma incompleto');
    const captura = await enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, sessionId);
    await writeFile(destino, Buffer.from(captura.data, 'base64'));
    console.log(`${nombre}: render aprobado a ${ancho}px, sin desbordamiento; ${destino}`);
  }
} finally {
  if (socket?.readyState === WebSocket.OPEN) { await enviar('Browser.close').catch(() => {}); socket.close(); }
  else navegadorProceso?.kill();
  await new Promise((resolver) => servidor.close(resolver));
}
