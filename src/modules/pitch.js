// src/modules/pitch.js — atualizado (modo manual com drag + persistência por dia)
// Campo tático — formação automática, seleção persistente por dia e ganchos p/ modo manual

import { read, write } from '../core/storage.js';
import { keyForms, keyManualPos, todayISO } from '../core/config.js';

const $ = (s, r = document) => r.querySelector(s);

let teamA = [];
let teamB = [];

// ---- Mapa de formações e posições aproximadas (percentuais Y) ----
const FORMATIONS = {
  '2-2':    [10, 10, 70, 70],
  '3-1':    [10, 10, 10, 70],
  '1-2-1':  [10, 40, 40, 70],
  '2-3':    [10, 10, 40, 70, 70],
  '3-2':    [10, 10, 10, 60, 60],
  '2-2-2':  [10, 10, 40, 40, 70, 70],
  '3-2-1':  [10, 10, 10, 40, 60, 70],
  '2-3-1':  [10, 10, 30, 50, 70, 70],
  '3-3-2':  [10, 10, 10, 40, 40, 40, 70, 70],
  '3-2-3':  [10, 10, 10, 40, 60, 70, 70, 70],
  '3-3-3':  [10, 10, 10, 40, 40, 40, 70, 70, 70]
};

// util: escapa nome pra evitar HTML injection
const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

// ===== Estado/persistência do modo manual =====
function currentISO() {
  const pick = $('#pickDay');
  return pick?.value || todayISO();
}
function loadForms() {
  return read(keyForms(currentISO()), { A: 'auto', B: 'auto' });
}
function saveForms(forms) {
  return write(keyForms(currentISO()), forms);
}

function loadManual() {
  const def = { enabled: false, A: {}, B: {} };
  const val = read(keyManualPos(currentISO()), def);
  // saneamento simples
  return {
    enabled: !!val?.enabled,
    A: val?.A && typeof val.A === 'object' ? val.A : {},
    B: val?.B && typeof val.B === 'object' ? val.B : {}
  };
}
function saveManual(state) {
  return write(keyManualPos(currentISO()), state);
}
function setManualEnabled(on) {
  const m = loadManual();
  m.enabled = !!on;
  saveManual(m);
}
function isManualEnabled() {
  return !!loadManual().enabled;
}
function clearManualPositions(teamKey) {
  const m = loadManual();
  if (teamKey === 'A' || teamKey === 'B') m[teamKey] = {};
  else { m.A = {}; m.B = {}; }
  saveManual(m);
}

// ===== Renderização =====
function renderPlayers(list, containerId, formationKey, teamKey /* 'A'|'B' */) {
  const container = $(containerId);
  if (!container) return;

  const total = list.length;
  const manual = loadManual();
  const manualOn = manual.enabled === true;

  const formation = formationKey === 'auto' || !FORMATIONS[formationKey]
    ? autoFormation(total)
    : FORMATIONS[formationKey];

  // limpa e injeta markup
  container.innerHTML = list.map((name, i) => {
    // posição: manual > formação
    const pos = manualOn ? manual[teamKey]?.[name] : null;
    const top = clamp01(pos?.y ?? (formation[i] ?? 50));
    const leftLogical = pos?.x ?? calcX(i, total); // 0..100 em coordenada "A"
    const left = teamKey === 'B' && pos?.x == null ? (100 - leftLogical) : leftLogical;

    const aria = `role="listitem" aria-label="${esc(name)}"`;
    const dragStyle = manualOn ? 'pointer-events:auto; touch-action:none; cursor:grab;' : 'pointer-events:none;';
    return `
      <div class="player" data-team="${teamKey}" data-name="${esc(name)}" ${aria}
           style="top:${top}%; left:${left}%; ${dragStyle}">
        <div class="name">${esc(name)}</div>
      </div>`;
  }).join('');

  // se manual estiver ativo, habilita drag por delegação
  if (manualOn) enableDrag(container, teamKey);
}

function renderField() {
  const forms = loadForms();
  const formA = $('#formA')?.value || forms.A || 'auto';
  const formB = $('#formB')?.value || forms.B || 'auto';

  // contêineres são as camadas .players
  renderPlayers(teamA, '#playersA', formA, 'A');
  renderPlayers(teamB, '#playersB', formB, 'B');

  // acessibilidade: grupos como listas
  $('#playersA')?.setAttribute('role', 'list');
  $('#playersB')?.setAttribute('role', 'list');

  updateManualUIState();
}

// ---- cálculo do eixo X (distribuição horizontal) ----
function calcX(i, total) {
  if (total <= 0) return 50;
  const gap = 100 / (total + 1);
  return clamp01(gap * (i + 1));
}

function clamp01(v) {
  // mantém dentro do campo com “margem de segurança” (4% a 96%)
  const n = Number(v);
  if (!Number.isFinite(n)) return 50;
  return Math.max(4, Math.min(96, n));
}

// ---- formação automática básica ----
function autoFormation(total) {
  if (total <= 4) return FORMATIONS['2-2'];
  if (total <= 5) return FORMATIONS['2-3'];
  if (total <= 6) return FORMATIONS['3-2-1'];
  if (total <= 7) return FORMATIONS['2-3-1'];
  if (total <= 8) return FORMATIONS['3-3-2'];
  return FORMATIONS['3-3-3'];
}

// ---- atualiza times quando houver evento global ----
function handleTeamsUpdate(e) {
  teamA = e.detail.teamA || [];
  teamB = e.detail.teamB || [];

  // higieniza posições manuais de atletas que saíram
  const m = loadManual();
  ['A', 'B'].forEach(k => {
    const live = k === 'A' ? teamA : teamB;
    for (const nome of Object.keys(m[k])) {
      if (!live.includes(nome)) delete m[k][nome];
    }
  });
  saveManual(m);

  renderField();
}

// ===== Drag & Drop manual (pointer events + persistência) =====
function enableDrag(playersLayer, teamKey) {
  // delegação: começa drag quando clica numa .player
  let dragging = null; // { el, rect, name, team, startX, startY }
  const onDown = (ev) => {
    const el = ev.target.closest('.player');
    if (!el) return;

    ev.preventDefault();

    const layerRect = playersLayer.getBoundingClientRect();
    const name = el.dataset.name;
    const team = teamKey;

    dragging = { el, rect: layerRect, name, team };
    document.body.style.userSelect = 'none';
    try { el.style.cursor = 'grabbing'; } catch {}
    playersLayer.setPointerCapture?.(ev.pointerId ?? 0);
  };

  const onMove = (ev) => {
    if (!dragging) return;
    const { rect, el, name, team } = dragging;
    const x = clamp01(((ev.clientX - rect.left) / rect.width) * 100);
    const y = clamp01(((ev.clientY - rect.top)  / rect.height) * 100);

    // aplica no DOM
    el.style.left = `${x}%`;
    el.style.top  = `${y}%`;

    // salva no estado (live preview, persistiremos no up também)
    const m = loadManual();
    if (!m[team]) m[team] = {};
    m[team][name] = { x, y };
    saveManual(m);
  };

  const onUpCancel = (ev) => {
    if (!dragging) return;
    playersLayer.releasePointerCapture?.(ev.pointerId ?? 0);
    try { dragging.el.style.cursor = 'grab'; } catch {}
    dragging = null;
    document.body.style.userSelect = '';
  };

  // limpa handlers antigos (se existir rebind por re-render)
  playersLayer.onpointerdown = null;
  playersLayer.onpointermove = null;
  playersLayer.onpointerup = null;
  playersLayer.onpointercancel = null;

  playersLayer.addEventListener('pointerdown', onDown);
  playersLayer.addEventListener('pointermove', onMove);
  playersLayer.addEventListener('pointerup', onUpCancel);
  playersLayer.addEventListener('pointercancel', onUpCancel);
}

// ===== UI: toolbar do tático (toggle/reset) =====
function ensureToolbar() {
  const bar = $('#toolbarTatico');
  if (!bar || bar._patched) return;
  bar._patched = true;

  // cria botões (sem dependências externas)
  const btnToggle = document.createElement('button');
  btnToggle.id = 'btnManualMode';
  btnToggle.className = 'btn-ghost';
  btnToggle.type = 'button';
  btnToggle.textContent = 'Alternar modo manual';

  const btnReset = document.createElement('button');
  btnReset.id = 'btnResetManual';
  btnReset.className = 'btn-ghost';
  btnReset.type = 'button';
  btnReset.textContent = 'Resetar posições manuais';

  bar.appendChild(btnToggle);
  bar.appendChild(btnReset);

  btnToggle.addEventListener('click', () => {
    setManualEnabled(!isManualEnabled());
    renderField(); // re-render aplica pointer-events e posições
  });

  btnReset.addEventListener('click', () => {
    clearManualPositions(); // limpa A e B do dia atual
    renderField();
  });

  updateManualUIState();
}

function updateManualUIState() {
  const on = isManualEnabled();
  const btn = $('#btnManualMode');
  if (btn) btn.textContent = on ? 'Modo manual: ON (clique p/ desligar)' : 'Modo manual: OFF (clique p/ ligar)';
}

// ---- bind selects de formação (com persistência por dia) ----
function bindFormationSelects() {
  const formA = $('#formA');
  const formB = $('#formB');
  const opts = ['auto', ...Object.keys(FORMATIONS)]
    .map(f => `<option value="${f}">${f.toUpperCase()}</option>`).join('');

  if (formA && !formA.options.length) formA.innerHTML = opts;
  if (formB && !formB.options.length) formB.innerHTML = opts;

  // carregar valores salvos para o dia atual
  const saved = loadForms();
  if (formA) formA.value = saved.A || 'auto';
  if (formB) formB.value = saved.B || 'auto';

  formA?.addEventListener('change', () => {
    const forms = loadForms();
    forms.A = formA.value;
    saveForms(forms);
    renderField();
  });
  formB?.addEventListener('change', () => {
    const forms = loadForms();
    forms.B = formB.value;
    saveForms(forms);
    renderField();
  });

  // quando trocar o dia no calendário ou manualmente
  document.addEventListener('calendar:update', () => {
    const savedNow = loadForms();
    if (formA) formA.value = savedNow.A || 'auto';
    if (formB) formB.value = savedNow.B || 'auto';
    renderField();
  });
  $('#pickDay')?.addEventListener('change', () => {
    const savedNow = loadForms();
    if (formA) formA.value = savedNow.A || 'auto';
    if (formB) formB.value = savedNow.B || 'auto';
    renderField();
  });
}

// ---- inicialização ----
export function init() {
  ensureToolbar();
  bindFormationSelects();
  document.addEventListener('teams:update', handleTeamsUpdate);
  renderField();
}

// (hooks futuros: melhorias no snap-to-grid, presets por jogador, ícones/cores por time)
