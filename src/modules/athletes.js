// src/modules/athletes.js — atualizado (intuitivo, com limites por time e toasts)
// Gerencia cadastro e seleção de atletas (Fora → A → B → Fora)

import { K } from '../core/config.js';
import { read, write } from '../core/storage.js';
import { showToast } from '../ui/toast.js';

// ---- estado local dos times (não vai para o storage) ----
let teamA = [];
let teamB = [];

// util básico pra escapar texto (evita HTML injection no chip)
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));

// helpers
const getSettings = () => read(K.settings, { ptsV: 3, ptsE: 1, ptsD: 0, maxPlayersPerTeam: 8 });
const maxPerTeam  = () => {
  const s = getSettings();
  const n = Number(s?.maxPlayersPerTeam);
  return Number.isFinite(n) && n > 0 ? n : 8;
};

// dispara eventos globais (calendar, pitch, matches, ranking…)
function emitTeams() {
  const detail = { teamA: [...teamA], teamB: [...teamB] };
  document.dispatchEvent(new CustomEvent('teams:update', { detail }));
  renderLists(); // mantém UI sincronizada
}
function emitAthletesList() {
  document.dispatchEvent(new CustomEvent('athletes:list:update', { detail: list() }));
}

// -------- storage helpers (lista completa de atletas) --------
function list()      { return read(K.athletes, []); }
function saveList(a) { write(K.athletes, a); }

// --------- ações ----------
function normName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

function addAthlete(name) {
  const nm = normName(name);
  if (!nm) { showToast('Digite um nome válido.', 'warn'); return false; }

  const cur = list();
  const exists = cur.some((n) => n.toLowerCase() === nm.toLowerCase());
  if (exists) { showToast('Esse atleta já existe no elenco.', 'warn'); return false; }

  cur.push(nm);
  saveList(cur);
  emitAthletesList();
  showToast(`Atleta “${nm}” adicionado.`, 'success');
  return true;
}

function undoLast() {
  const cur = list();
  if (!cur.length) { showToast('Não há nada para desfazer.', 'info'); return null; }

  const removed = cur.pop();
  saveList(cur);

  // se estava em A ou B, remove também
  teamA = teamA.filter((n) => n !== removed);
  teamB = teamB.filter((n) => n !== removed);

  renderChips();
  emitTeams();
  emitAthletesList();
  showToast(`Removido: “${removed}”.`, 'info');
  return removed;
}

// --------- renderização ----------
function renderChips() {
  const wrap = document.getElementById('chipsAtletas');
  if (!wrap) return;

  // reseta para evitar duplicação de listeners
  wrap.replaceChildren();

  wrap.innerHTML = list()
    .map((n) => {
      const cls = teamA.includes(n) ? 'chip is-a' : teamB.includes(n) ? 'chip is-b' : 'chip';
      return `<button type="button" class="${cls}" data-n="${esc(n)}">${esc(n)}</button>`;
    })
    .join('');

  // Delegação: um listener só no wrapper
  wrap.onclick = (e) => {
    const chip = e.target.closest('.chip[data-n]');
    if (!chip) return;
    const n = chip.dataset.n;
    const cap = maxPerTeam();

    // estado atual → próximo estado
    const inA = teamA.includes(n);
    const inB = teamB.includes(n);
    const state = inA ? 'A' : inB ? 'B' : 'OUT';
    const next  = state === 'OUT' ? 'A' : state === 'A' ? 'B' : 'OUT';

    // checa capacidade antes de mover
    if (next === 'A' && !inA && teamA.length >= cap) {
      showToast(`Time A está cheio (máx. ${cap}).`, 'warn');
      return;
    }
    if (next === 'B' && !inB && teamB.length >= cap) {
      showToast(`Time B está cheio (máx. ${cap}).`, 'warn');
      return;
    }

    // aplica transição
    if (state === 'OUT' && next === 'A') {
      teamA.push(n);
    } else if (state === 'A' && next === 'B') {
      teamA = teamA.filter((x) => x !== n);
      teamB.push(n);
    } else if (state === 'B' && next === 'OUT') {
      teamB = teamB.filter((x) => x !== n);
    }

    renderChips(); // reflete classes is-a/is-b
    emitTeams();
  };
}

function renderLists() {
  const A  = document.getElementById('listaA');
  const B  = document.getElementById('listaB');
  const lA = document.getElementById('lblA');
  const lB = document.getElementById('lblB');

  if (A) A.innerHTML = teamA.map((n) => `<div class="p">${esc(n)}</div>`).join('');
  if (B) B.innerHTML = teamB.map((n) => `<div class="p">${esc(n)}</div>`).join('');

  if (lA) lA.textContent = teamA.length ? `A (${teamA.length})` : 'A';
  if (lB) lB.textContent = teamB.length ? `B (${teamB.length})` : 'B';
}

// --------- binds ----------
function bindUI() {
  const addBtn   = document.getElementById('btnAddJogador');
  const undoBtn  = document.getElementById('btnUndoJogador');
  const input    = document.getElementById('novoJogador');
  const clearBtn = document.getElementById('btnLimparSel');
  const swapBtn  = document.getElementById('btnInverter');

  addBtn?.addEventListener('click', () => {
    const ok = addAthlete(input?.value || '');
    if (ok && input) { input.value = ''; }
    renderChips(); emitTeams();
  });

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addBtn?.click();
  });

  undoBtn?.addEventListener('click', () => {
    undoLast();
  });

  clearBtn?.addEventListener('click', () => {
    teamA = [];
    teamB = [];
    renderChips();
    emitTeams();
    showToast('Seleção limpa.', 'info');
  });

  swapBtn?.addEventListener('click', () => {
    // respeita capacidade: se inverter estourar, faz melhor esforço
    const cap = maxPerTeam();
    let A2 = [...teamB];
    let B2 = [...teamA];
    if (A2.length > cap || B2.length > cap) {
      showToast('Não foi possível inverter totalmente: capacidade excedida.', 'warn');
      // corta excedentes preservando ordem
      A2 = A2.slice(0, cap);
      B2 = B2.slice(0, cap);
    }
    teamA = A2; teamB = B2;
    renderChips();
    emitTeams();
  });
}

// --------- API pública ----------
export function init() {
  // estado inicial limpo
  teamA = [];
  teamB = [];

  // carrega lista existente no storage (chips neutros até seleção)
  renderChips();
  renderLists();
  bindUI();

  // emite estado vazio/inicial na carga (pra sincronizar outros módulos)
  emitTeams();
  emitAthletesList();
}

// opcional: getter para outros módulos que preferirem pull ao invés de evento
export function getTeams() {
  return { teamA: [...teamA], teamB: [...teamB] };
}
