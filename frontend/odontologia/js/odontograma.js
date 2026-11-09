const cuadrantes = [[18,17,16,15,14,13,12,11], [21,22,23,24,25,26,27,28],
  [48,47,46,45,44,43,42,41], [31,32,33,34,35,36,37,38]];
const superficies = { O: 'Oclusal', I: 'Incisal', M: 'Mesial', D: 'Distal', V: 'Vestibular', L: 'Lingual', P: 'Palatina' };

export function vistaOdontograma(registros = [], soloLectura = false) {
  const marcadas = new Set(registros.map((r) => Number(r.piezaDental)));
  return `<section class="odontograma" aria-label="Odontograma permanente FDI">
    <div class="section-intro"><div><span class="eyebrow">DENTICIÓN PERMANENTE</span><h2>Odontograma</h2></div><span class="label blue">32 piezas · FDI</span></div>
    <p class="form-help">${soloLectura ? 'Las piezas resaltadas tienen procedimientos registrados. Consulta el detalle debajo.' : 'Selecciona una pieza y su superficie. Se aplicarán al servicio que estás editando.'}</p>
    <p class="dental-mobile-hint">Desliza el mapa para ver las piezas de ambos lados.</p>
    <div class="dental-scroll" tabindex="0" role="region" aria-label="Mapa dental desplazable, vista frontal del paciente"><div class="dental-grid">${cuadrantes.map((grupo, i) =>
    `<div class="dental-quadrant" role="group" aria-label="Cuadrante ${[1,2,4,3][i]}">${grupo.map((pieza) =>
      `<button type="button" class="dental-tooth${marcadas.has(pieza) ? ' has-record' : ''}" data-pieza="${pieza}" aria-label="Pieza ${pieza}${marcadas.has(pieza) ? ', con procedimientos' : ''}" aria-pressed="false" ${soloLectura ? 'disabled' : ''}>
      <svg viewBox="0 0 40 54" aria-hidden="true"><path d="M20 6C10 0 4 9 7 22c2 8 4 10 5 21 1 9 5 9 6-1 1-9 3-9 4 0 1 10 5 10 6 1 1-11 3-13 5-21C36 9 30 0 20 6Z"/><path class="tooth-detail" d="M12 14c4 3 12 3 16 0M15 23h10"/></svg><span>${pieza}</span></button>`).join('')}</div>`).join('')}</div></div>
    <div class="dental-orientation"><span>Derecha del paciente</span><span>Izquierda del paciente</span></div>
    ${soloLectura ? '<p class="form-help">Pieza resaltada: procedimiento registrado.</p>' : `<div class="surface-toolbar" role="group" aria-label="Superficie dental"><button type="button" class="surface-button" data-superficie="" aria-pressed="true">Pieza completa</button>${Object.entries(superficies).map(([codigo, nombre]) => `<button type="button" class="surface-button" data-superficie="${codigo}" aria-pressed="false"><strong>${codigo}</strong> ${nombre}</button>`).join('')}</div><p class="dental-selection" role="status" aria-live="polite">Selecciona una pieza para comenzar.</p>`}
  </section>`;
}

export function activarOdontograma(raiz, alSeleccionar) {
  let pieza, superficie = '';
  const notificar = () => {
    raiz.querySelector('.dental-selection').textContent = `Pieza ${pieza} · ${superficie ? superficies[superficie] : 'Pieza completa'}`;
    alSeleccionar({ piezaDental: pieza, superficie });
  };
  raiz.querySelectorAll('[data-pieza]').forEach((boton) => boton.addEventListener('click', () => {
    pieza = Number(boton.dataset.pieza);
    raiz.querySelectorAll('[data-pieza]').forEach((b) => b.setAttribute('aria-pressed', String(b === boton)));
    notificar();
  }));
  raiz.querySelectorAll('[data-superficie]').forEach((boton) => boton.addEventListener('click', () => {
    superficie = boton.dataset.superficie;
    raiz.querySelectorAll('[data-superficie]').forEach((b) => b.setAttribute('aria-pressed', String(b === boton)));
    if (pieza) notificar();
    else raiz.querySelector('.dental-selection').textContent = 'Ahora selecciona la pieza dental.';
  }));
}
