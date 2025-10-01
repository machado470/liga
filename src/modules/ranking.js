// src/modules/ranking.js — atualizado (escape seguro de nomes + robustez)
// Monta e atualiza a tabela de ranking geral por atleta

import { read } from '../core/storage.js';
import { K } from '../core/config.js';

const $  = (s, r = document) => r.querySelector(s);
const STATS_KEY = K.stats || 'stats'; // compat com matches.js

// ===== helpers =====
const nz  = v => Number.isFinite(+v) ? +v : 0;
const esc = s => String(s).replace(/[&<>"']/g, m => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[m]));

function calcPPG(Pts, J) {
  const j = nz(J), p = nz(Pts);
  return j > 0 ? (p / j).toFixed(2) : '0.00';
}

function medal(i) {
  return i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
}

// ===== renderiza tabela =====
function renderRanking(statsObj = {}) {
  const tbody = $('#tblLiga tbody');
  if (!tbody) return;

  const safeStats = (statsObj && typeof statsObj === 'object') ? statsObj : {};

  const rows = Object.entries(safeStats)
    .map(([nome, s]) => {
      const J  = nz(s?.J), V = nz(s?.V), E = nz(s?.E), D = nz(s?.D);
      const GP = nz(s?.GP), GC = nz(s?.GC), SG = nz(s?.SG);
      const Pts = nz(s?.Pts);
      return { nome, J, V, E, D, GP, GC, SG, Pts, PPG: calcPPG(Pts, J) };
    })
    .sort((a, b) => (
      b.Pts - a.Pts ||
      b.SG  - a.SG  ||
      b.GP  - a.GP  ||
      a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
    ));

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="muted" style="text-align:center">
          Sem dados ainda. Registre uma partida para ver o ranking.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td class="rank">${medal(i)} ${esc(r.nome)}</td>
      <td>${r.J}</td>
      <td>${r.V}</td>
      <td>${r.E}</td>
      <td>${r.D}</td>
      <td>${r.GP}</td>
      <td>${r.GC}</td>
      <td>${r.SG}</td>
      <td>${r.Pts}</td>
      <td>${r.PPG}</td>
    </tr>
  `).join('');
}

// ===== eventos globais =====
function handleRankingUpdate(e) {
  const stats = e?.detail || read(STATS_KEY, {});
  renderRanking(stats);
}

// ===== inicialização =====
export function init() {
  const stats = read(STATS_KEY, {});
  renderRanking(stats);

  // sempre que partidas, calendário ou times mudarem, recarrega
  document.addEventListener('ranking:update', handleRankingUpdate);
  document.addEventListener('calendar:update', () => {
    const s = read(STATS_KEY, {});
    renderRanking(s);
  });
  document.addEventListener('teams:update', () => {
    const s = read(STATS_KEY, {});
    renderRanking(s);
  });
}
