// src/modules/calendar.js — atualizado (confirmação, toast, lastDay, navegação sólida)
// Calendário de partidas por dia (navegação, resumo, exclusão)

import { read, write } from '../core/storage.js';
import { keyMatches, keyLastDay, todayISO, addDaysISO } from '../core/config.js';
import { confirmModal } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';

const $  = (s, r = document) => r.querySelector(s);

// ===== storage helpers =====
function loadDay(dateISO) {
  return read(keyMatches(dateISO), []);
}
function saveDay(dateISO, matches) {
  return write(keyMatches(dateISO), matches);
}

// ===== UI helpers =====
function renderResumo(matches, resumoEl) {
  if (!resumoEl) return;
  if (!matches?.length) {
    resumoEl.textContent = '0 jogos';
    return;
  }
  const gols = matches.reduce((acc, m) =>
    acc + (Number(m.scoreA) || 0) + (Number(m.scoreB) || 0), 0);
  resumoEl.textContent = `${matches.length} jogo${matches.length > 1 ? 's' : ''} — ${gols} gol${gols !== 1 ? 's' : ''}`;
}

function dispatchUpdate() {
  document.dispatchEvent(new CustomEvent('calendar:update'));
}

function attachListHandlers(container, matches, dateISO) {
  // Delegação: um listener só no container
  container.onclick = (ev) => {
    const btn = ev.target.closest('[data-action="del"]');
    if (!btn) return;

    const card = btn.closest('.game-card');
    const idx  = Number(card?.dataset.idx);
    if (!Number.isInteger(idx)) return;

    const jogo = matches[idx];
    confirmModal(
      `Excluir a partida <b>${jogo.teamA} ${jogo.scoreA} × ${jogo.scoreB} ${jogo.teamB}</b>?`,
      () => {
        matches.splice(idx, 1);
        saveDay(dateISO, matches);
        renderMatches(matches, container, dateISO);
        renderResumo(matches, $('#calResumo'));
        dispatchUpdate();
        showToast('Partida excluída.', 'success');
      }
    );
  };
}

function renderMatches(matches, container, dateISO) {
  if (!container) return;

  if (!matches.length) {
    container.innerHTML = `<div class="muted">Nenhuma partida registrada.</div>`;
  } else {
    container.innerHTML = matches.map((m, i) => `
      <div class="game-card" data-idx="${i}" aria-label="Partida ${i + 1}">
        <div class="game-left">
          <div class="teams">${m.teamA} <strong>${m.scoreA}</strong> × <strong>${m.scoreB}</strong> ${m.teamB}</div>
          ${m.obs ? `<div class="game-obs">${String(m.obs)}</div>` : ''}
        </div>
        <button class="btn-mini" data-action="del" aria-label="Excluir partida ${i + 1}">Excluir</button>
      </div>
    `).join('');
  }

  attachListHandlers(container, matches, dateISO);
}

function renderDay(dateISO) {
  const matches = loadDay(dateISO);
  renderMatches(matches, $('#listaJogosDia'), dateISO);
  renderResumo(matches, $('#calResumo'));
}

// ===== Navegação =====
function bindNav() {
  const pick = $('#pickDay');
  const prev = $('#calPrev');
  const next = $('#calNext');

  pick?.addEventListener('change', () => {
    const iso = pick.value || todayISO();
    renderDay(iso);
  });

  prev?.addEventListener('click', () => {
    const cur = pick?.value || todayISO();
    const iso = addDaysISO(cur, -1);
    if (pick) pick.value = iso;
    renderDay(iso);
  });

  next?.addEventListener('click', () => {
    const cur = pick?.value || todayISO();
    const iso = addDaysISO(cur, +1);
    if (pick) pick.value = iso;
    renderDay(iso);
  });
}

// ===== API chamada por matches.js =====
export function addMatch(match) {
  const pick = $('#pickDay');
  const iso = pick?.value || todayISO();
  const matches = loadDay(iso);

  const novo = {
    teamA: String(match.teamA ?? 'A'),
    teamB: String(match.teamB ?? 'B'),
    scoreA: Number(match.scoreA) || 0,
    scoreB: Number(match.scoreB) || 0,
    obs: match.obs ? String(match.obs) : ''
  };

  matches.push(novo);
  saveDay(iso, matches);

  // Atualiza "lastDay" sem duplo-namespace
  try { localStorage.setItem(keyLastDay(), JSON.stringify(iso)); } catch {}

  renderDay(iso);
  dispatchUpdate();
  showToast('Partida registrada no calendário.', 'success');
}

// ===== Init =====
export function init() {
  const pick = $('#pickDay');
  if (pick) pick.value = todayISO();
  bindNav();
  renderDay(pick?.value || todayISO());
}
