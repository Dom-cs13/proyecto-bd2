import { store } from '../state.js';
import { consultarRed } from '../../../shared/js/components/consultaRed.js';

export function renderSearchBar(containerId = 'search-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const currentArea = store.filtroArea;
  const kpis = store.getKPIs();

  container.innerHTML = `
    <div class="search-filter-card">
      <div class="search-input-wrapper">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          id="global-search-input" 
          class="search-input" 
          placeholder="Buscar localmente; Enter para consultar las cuatro instituciones..."
          value="${store.filtroTexto}"
        />
      </div>

      <div class="filter-chips-row">
        <div class="chips-group">
          <button class="filter-chip ${currentArea === 'Todos' ? 'active' : ''}" data-area="Todos">
            Todos <span class="chip-count">${kpis.total}</span>
          </button>
          <button class="filter-chip ${currentArea === 'Hospitalización' ? 'active' : ''}" data-area="Hospitalización">
            Hospitalización <span class="chip-count">${kpis.internados}</span>
          </button>
          <button class="filter-chip ${currentArea === 'Medicina General' ? 'active' : ''}" data-area="Medicina General">
            Medicina General <span class="chip-count">${kpis.medGeneral}</span>
          </button>
          <button class="filter-chip ${currentArea === 'Críticos' ? 'active' : ''}" data-area="Críticos">
            Críticos / Observación <span class="chip-count">${kpis.criticos}</span>
          </button>
        </div>

        <div class="filter-results-info">
          Estado: <strong style="color: var(--primary);">${store.sincronizado ? 'Datos cargados del servidor' : 'Conexión sin verificar'}</strong>
        </div>
      </div>
    </div>
  `;

  // Listener para el input con debounce
  const input = document.getElementById('global-search-input');
  input.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Enter' || !input.value.trim()) return;
    evento.preventDefault();
    document.getElementById('drawer-title').textContent = 'Consulta en red · solo lectura';
    document.getElementById('drawer-footer').replaceChildren();
    document.getElementById('drawer-backdrop').classList.add('open');
    document.getElementById('drawer-panel').classList.add('open');
    consultarRed(input.value, document.getElementById('drawer-body'), 'clinical-table');
  });
  let timeoutId;
  input.addEventListener('input', (e) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      store.setFiltroTexto(e.target.value);
    }, 200);
  });

  // Listeners para los chips
  container.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const area = btn.getAttribute('data-area');
      store.setFiltroArea(area);
    });
  });
}

