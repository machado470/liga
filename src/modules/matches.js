// src/modules/matches.js — atualizado (consistência com toast/modal, evita duplo-namespace, eventos legados)
// Registro de partidas (integra atletas + calendário + ranking)

import { addMatch } from './calendar.js';
import { read, write } from '../core/storage.js';
import { keyMatches, keyLastDay, K, todayISO } from '../core/config.js';
import { showToast } from '../ui/toast.js';
import { confirmModal } from '../ui/modal.js';

const $ = (s, r = document) => r.querySelector(s);

// ------- Constantes internas -------
const STATS_KEY = K.stats || 'stats';   // compat: se K.stats não existir
const AUTO_KEY  = 'autoReset';          // flag simples (namespaced via storage)
const SETTINGS_FALLBACK = { ptsV: 3, ptsE: 1, ptsD: 0 };

// ------- Helpers -------
function getTeams() {
  return {
    A: [...document.querySelectorAll('#listaA .p')].map(el => el.textContent),
    B: [...document.querySelectorAll('#listaB .p')].map(el => el.textContent)
  };
}

function resetInputs() {
  $('#placarA') && ($('#placarA').value = '');
  $('#placarB') && ($('#placarB').value = '');
  $('#obs')     && ($('#obs').value     = '');
}

function isValidScore(v) {
  return Number.isInteger(v) && v >= 0;
}

// ------- Estatísticas individuais -------
function registrarStats(match) {
  const stats = read(STATS_KEY, {});
  const jogadoresA = match.teamA.split(', ').filter(Boolean);
  const jogadoresB = match.teamB.split(', ').filter(Boolean);
  const settings   = read(K.settings, SETTINGS_FALLBACK);

  const atualiza = (nome, isA) => {
    if (!stats[nome]) {
      stats[nome] = { J: 0, V: 0, E: 0, D: 0, GP: 0, GC: 0, SG: 0, Pts: 0 };
    }
    const s = stats[nome];
    s.J++;
    s.GP += isA ? match.scoreA : match.scoreB;
    s.GC += isA ? match.scoreB : match.scoreA;
    s.SG  = s.GP - s.GC;

    if (match.scoreA === match.scoreB) {
      s.E++; s.Pts += settings.ptsE;
    } else if ((isA && match.scoreA > match.scoreB) || (!isA && match.scoreB > match.scoreA)) {
      s.V++; s.Pts += settings.ptsV;
    } else {
      s.D++; s.Pts += settings.ptsD;
    }
  };

  jogadoresA.forEach(n => atualiza(n, true));
  jogadoresB.forEach(n => atualiza(n, false));

  write(STATS_KEY, stats);
  document.dispatchEvent(new CustomEvent('ranking:update', { detail: stats }));
}

// ------- Salvar partida -------
function salvarPartida() {
  const aEl = $('#placarA'), bEl = $('#placarB'), obsEl = $('#obs'), autoEl = $('#autoReset');
  const placarA = parseInt(aEl?.value ?? '', 10);
  const placarB = parseInt(bEl?.value ?? '', 10);
  const obs = String(obsEl?.value ?? '').trim();
  const { A, B } = getTeams();

  if (A.length === 0 || B.length === 0) {
    showToast('Selecione pelo menos 1 atleta em cada time.', 'warn');
    return;
  }
  if (!isValidScore(placarA) || !isValidScore(placarB)) {
    showToast('Preencha os placares corretamente (inteiros ≥ 0).', 'error');
    return;
  }

  // persiste preferência do autoReset (se o usuário mexeu)
  if (autoEl) write(AUTO_KEY, !!autoEl.checked);

  const match = {
    date: todayISO(),
    teamA: A.join(', '),
    teamB: B.join(', '),
    scoreA: placarA,
    scoreB: placarB,
    obs
  };

  addMatch(match);       // salva no dia atual e re-renderiza calendário (+ toast dentro do calendar)
  registrarStats(match); // atualiza ranking por atleta

  // Atualiza "lastDay" evitando duplo-namespace (usa localStorage direto)
  try { localStorage.setItem(keyLastDay(), JSON.stringify(match.date)); } catch {}

  // Evento legado para compat com main.js antigo
  document.dispatchEvent(new CustomEvent('partida:salva', { detail: match }));

  showToast('Partida salva com sucesso!', 'success');
  resetInputs();
}

// ------- Desfazer última do dia -------
function desfazerUltima() {
  const d = todayISO();
  const key = keyMatches(d);
  const matches = read(key, []);
  if (!matches.length) {
    showToast('Nenhuma partida para remover.', 'warn');
    return;
  }

  const last = matches[matches.length - 1];
  confirmModal(
    `Remover a última partida <b>${last.teamA} ${last.scoreA} × ${last.scoreB} ${last.teamB}</b>?`,
    () => {
      matches.pop();
      write(key, matches);
      showToast('Última partida removida.', 'info');
      document.dispatchEvent(new CustomEvent('calendar:update'));
      document.dispatchEvent(new CustomEvent('ranking:update'));
      document.dispatchEvent(new CustomEvent('partida:desfeita'));
    }
  );
}

// ------- Reset do dia -------
function resetHoje() {
  const iso = todayISO();
  confirmModal(
    `Zerar todas as partidas de <b>${iso}</b>? Esta ação não afeta dias anteriores.`,
    () => {
      write(keyMatches(iso), []);
      showToast('Partidas de hoje zeradas.', 'info');
      document.dispatchEvent(new CustomEvent('calendar:update'));
      document.dispatchEvent(new CustomEvent('ranking:update'));
    }
  );
}

// ------- Auto-Reset diário (opcional) -------
function ensureAutoResetOnLoad() {
  const enabled = !!read(AUTO_KEY, false);
  const autoEl = $('#autoReset');
  if (autoEl) autoEl.checked = enabled;

  if (!enabled) return;

  const today = todayISO();
  let last = null;
  try {
    const raw = localStorage.getItem(keyLastDay());
    last = raw ? JSON.parse(raw) : null;
  } catch {}

  // Se mudou o dia desde o último registro, só zeramos o quadro do DIA ATUAL (não mexe no histórico)
  if (last && last !== today) {
    write(keyMatches(today), []);  // garante quadro limpo pro novo dia
    showToast('Novo dia: quadro de hoje limpo automaticamente.', 'info');
    document.dispatchEvent(new CustomEvent('calendar:update'));
  }

  // Atualiza carimbo para hoje (evita reset a cada refresh)
  try { localStorage.setItem(keyLastDay(), JSON.stringify(today)); } catch {}
}

// ------- Bind UI -------
function bindUI() {
  $('#btnSalvar')?.addEventListener('click', salvarPartida);
  $('#btnDesfazerPartida')?.addEventListener('click', desfazerUltima);
  $('#btnResetHoje')?.addEventListener('click', resetHoje);

  // Enter nos inputs de placar dispara salvar
  ['#placarA', '#placarB', '#obs'].forEach(sel => {
    $(sel)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') salvarPartida();
    });
  });
}

// ------- Inicialização -------
export function init() {
  ensureAutoResetOnLoad();
  bindUI();
}
