// src/ui/table.js — atualizado (orden. visual + teclado + live region)
// Renderizador de tabela de ranking (genérico, seguro e reutilizável)

import { openModal } from './modal.js';

const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const nz = (v) => (Number.isFinite(+v) ? +v : 0);

const SORT_STORAGE_KEY = 'liga25:rank:sort';
const LIVE_ID = 'rank-live';

// Mapa das colunas do <thead> → chaves em "data"
const COL_KEYS = [
  null,          // 0: posição (não ordenável)
  'nome',        // 1
  'jogos',       // 2
  'v',           // 3
  'e',           // 4
  'd',           // 5
  'gp',          // 6
  'gc',          // 7
  'sg',          // 8
  'pts',         // 9
  'ppg'          // 10
];

// ===== API =====
/**
 * Renderiza a tabela principal da liga (apenas <tbody>).
 * Suporta ordenação por clique e teclado no <thead> do mesmo <table>.
 * @param {HTMLElement} el - elemento <tbody> onde renderizar
 * @param {Array<{nome:string,jogos:number,v:number,e:number,d:number,gp:number,gc:number,sg:number,pts:number,ppg:number}>} data
 */
export function renderRankingTable(el, data) {
  if (!el) return;

  const table = el.closest('table');
  if (table && !table._sortBound) bindSorting(table);

  const safe = Array.isArray(data) ? data : [];
  if (!safe.length) {
    el.innerHTML = `<tr><td colspan="11" class="muted" style="text-align:center;padding:16px">Nenhum atleta ainda...</td></tr>`;
    return;
  }

  const rows = safe.map(normalizeRow);
  const sort = getSort(table);

  const sorted = sortRows(rows, sort);

  el.innerHTML = sorted.map((p, i) => `
    <tr data-atleta="${esc(p.nome)}" tabindex="0">
      <td>${i + 1}</td>
      <td class="rank">${medalIcon(i)} ${esc(p.nome)}</td>
      <td>${p.jogos}</td>
      <td>${p.v}</td>
      <td>${p.e}</td>
      <td>${p.d}</td>
      <td>${p.gp}</td>
      <td>${p.gc}</td>
      <td>${p.sg}</td>
      <td>${p.pts}</td>
      <td>${p.ppg.toFixed(2)}</td>
    </tr>
  `).join('');

  bindRowInteractions(el);
  reflectSortIndicators(table, sort);
}

// ===== Internals =====
function normalizeRow(p) {
  return {
    nome: String(p?.nome ?? '').trim(),
    jogos: nz(p?.jogos),
    v: nz(p?.v),
    e: nz(p?.e),
    d: nz(p?.d),
    gp: nz(p?.gp),
    gc: nz(p?.gc),
    sg: nz(p?.sg),
    pts: nz(p?.pts),
    ppg: Number.isFinite(+p?.ppg) ? +p.ppg : (nz(p?.jogos) ? nz(p?.pts) / nz(p?.jogos) : 0)
  };
}

function defaultSort() {
  // padrão: Pts ↓, SG ↓, Nome ↑
  return { key: 'pts', dir: 'desc', tiebreakers: ['sg:desc', 'nome:asc'] };
}

function getSort(/* table */) {
  try {
    const raw = sessionStorage.getItem(SORT_STORAGE_KEY);
    const s = raw ? JSON.parse(raw) : null;
    if (s && s.key) return s;
  } catch {}
  return defaultSort();
}

function setSort(sort) {
  try { sessionStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sort)); } catch {}
}

function sortRows(rows, sort) {
  const { key, dir, tiebreakers = [] } = sort || defaultSort();

  const cmp = (a, b, k, d) => {
    const A = a[k], B = b[k];
    if (typeof A === 'number' && typeof B === 'number') {
      if (A !== B) return (A < B ? -1 : 1) * (d === 'asc' ? 1 : -1);
    } else {
      const aa = String(A ?? ''), bb = String(B ?? '');
      const c = aa.localeCompare(bb, 'pt', { sensitivity: 'base' });
      if (c !== 0) return d === 'asc' ? c : -c;
    }
    return 0;
  };

  return [...rows].sort((a, b) => {
    const primary = cmp(a, b, key, dir);
    if (primary !== 0) return primary;

    for (const tb of tiebreakers) {
      const [k, d] = tb.split(':');
      const t = cmp(a, b, k, d || 'desc');
      if (t !== 0) return t;
    }

    // fallback sempre por nome asc para estabilidade
    return cmp(a, b, 'nome', 'asc');
  });
}

function reflectSortIndicators(table, sort) {
  if (!table) return;
  const ths = [...table.querySelectorAll('thead th')];
  ths.forEach((th, idx) => {
    th.removeAttribute('aria-sort');
    th.dataset.sort = '';
    const key = COL_KEYS[idx];
    if (!key) return;
    if (key === sort.key) {
      th.setAttribute('aria-sort', sort.dir === 'asc' ? 'ascending' : 'descending');
      th.dataset.sort = sort.dir; // usado pelo CSS para desenhar a seta
    }
  });
}

function toggleSort(sort, key) {
  if (sort.key !== key) return { key, dir: 'desc', tiebreakers: defaultSort().tiebreakers };
  // alterna: desc → asc → desc...
  const dir = sort.dir === 'desc' ? 'asc' : 'desc';
  return { ...sort, key, dir };
}

function ensureLiveRegion() {
  let live = document.getElementById(LIVE_ID);
  if (!live) {
    live = document.createElement('div');
    live.id = LIVE_ID;
    live.setAttribute('aria-live', 'polite');
    // visually hidden inline (dispensa CSS extra)
    live.style.position = 'absolute';
    live.style.height = '1px';
    live.style.width = '1px';
    live.style.overflow = 'hidden';
    live.style.clip = 'rect(1px,1px,1px,1px)';
    live.style.whiteSpace = 'nowrap';
    live.style.border = '0';
    document.body.appendChild(live);
  }
  return live;
}

function announceSort(key, dir) {
  const labels = { nome: 'Nome', jogos: 'J', v: 'V', e: 'E', d: 'D', gp: 'GP', gc: 'GC', sg: 'SG', pts: 'Pts', ppg: 'PPG' };
  const live = ensureLiveRegion();
  live.textContent = `Tabela reordenada por ${labels[key] || key} (${dir === 'asc' ? 'ascendente' : 'descendente'}).`;
}

function bindSorting(table) {
  const thead = table.querySelector('thead');
  if (!thead) return;
  table._sortBound = true;

  const headerCells = [...thead.querySelectorAll('th')];

  // Cabeçalhos focáveis para colunas ordenáveis (teclado: Enter/Espaço)
  headerCells.forEach((th, idx) => {
    const key = COL_KEYS[idx];
    th.tabIndex = key ? 0 : -1;
    if (!key) th.removeAttribute('role');
    else th.setAttribute('role', 'button');
  });

  const handleToggle = (th) => {
    const idx = headerCells.indexOf(th);
    const key = COL_KEYS[idx];
    if (!key) return;

    const sort = toggleSort(getSort(table), key);
    setSort(sort);

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    // Extrai dados atuais dos TRs para reordenar instantaneamente
    const rows = [...tbody.querySelectorAll('tr')];
    const data = rows.map(tr => {
      const tds = tr.querySelectorAll('td');
      return normalizeRow({
        nome: tr.getAttribute('data-atleta') || tds[1]?.textContent?.trim() || '',
        jogos: +tds[2]?.textContent || 0,
        v: +tds[3]?.textContent || 0,
        e: +tds[4]?.textContent || 0,
        d: +tds[5]?.textContent || 0,
        gp: +tds[6]?.textContent || 0,
        gc: +tds[7]?.textContent || 0,
        sg: +tds[8]?.textContent || 0,
        pts: +tds[9]?.textContent || 0,
        ppg: +tds[10]?.textContent || 0
      });
    });

    const sorted = sortRows(data, sort);
    tbody.innerHTML = sorted.map((p, i) => `
      <tr data-atleta="${esc(p.nome)}" tabindex="0">
        <td>${i + 1}</td>
        <td class="rank">${medalIcon(i)} ${esc(p.nome)}</td>
        <td>${p.jogos}</td>
        <td>${p.v}</td>
        <td>${p.e}</td>
        <td>${p.d}</td>
        <td>${p.gp}</td>
        <td>${p.gc}</td>
        <td>${p.sg}</td>
        <td>${p.pts}</td>
        <td>${p.ppg.toFixed(2)}</td>
      </tr>
    `).join('');

    reflectSortIndicators(table, sort);
    bindRowInteractions(tbody);
    announceSort(key, sort.dir);
  };

  thead.addEventListener('click', (e) => {
    const th = e.target.closest('th');
    if (th) handleToggle(th);
  });

  thead.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const th = e.target.closest('th');
    if (!th) return;
    e.preventDefault();
    handleToggle(th);
  });

  // acessibilidade: mostrar estado inicial
  reflectSortIndicators(table, getSort(table));
}

/** Medalha para top 3 */
function medalIcon(pos) {
  const medal = ['🥇','🥈','🥉'];
  return pos < 3 ? `<span class="medal">${medal[pos]}</span>` : '';
}

/** Clique/teclado nas linhas para abrir detalhes do atleta */
function bindRowInteractions(tbody) {
  if (tbody._rowBound) return;
  tbody._rowBound = true;

  tbody.addEventListener('click', (e) => {
    const row = e.target.closest('tr[data-atleta]');
    if (!row) return;
    showAthleteDetails(row.getAttribute('data-atleta'));
  });

  tbody.addEventListener('keydown', (e) => {
    const row = e.target.closest('tr[data-atleta]');
    if (!row) return;

    const rows = [...tbody.querySelectorAll('tr[data-atleta]')];
    const i = rows.indexOf(row);

    // Navegação ↑/↓
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = rows[i + 1] || rows[i];
      next?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = rows[i - 1] || rows[i];
      prev?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      showAthleteDetails(row.getAttribute('data-atleta'));
    }
  });

  // foco visual opcional
  tbody.addEventListener('focusin', (e) => {
    const row = e.target.closest('tr[data-atleta]');
    if (!row) return;
    tbody.querySelectorAll('tr.selected').forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');
  });
}

/** Modal com detalhes do atleta (placeholder por enquanto) */
function showAthleteDetails(nome) {
  openModal(`📊 Estatísticas — ${esc(nome)}`, `
    <p>Em breve: histórico de partidas, gráficos e evolução.</p>
  `);
}

/** (Opcional) API para definir ordenação via código */
export function setRankingSort(key, dir = 'desc') {
  const sort = { key, dir, tiebreakers: defaultSort().tiebreakers };
  setSort(sort);
}
