// src/main.js — ponto de entrada da Liga da Firma 2025

import { init as initAthletes } from './modules/athletes.js';
import { init as initPitch }     from './modules/pitch.js';
import { init as initMatches }   from './modules/matches.js';
import { init as initCalendar }  from './modules/calendar.js';
import { init as initRanking }   from './modules/ranking.js';
import { initRouter }            from './core/router.js';

import { showToast }   from './ui/toast.js';
import { setText }     from './utils/dom.js';
import { read, write } from './core/storage.js';
import { K, todayISO, keyLastDay } from './core/config.js';
import { initCharts }  from './ui/chart.js';

console.log('✅ main.js carregado');

/* ---------- Bootstrap das sections (injeta HTML só se estiver vazio) ---------- */
function bootstrapDOM() {
  const el = id => document.getElementById(id);

  // Regras
  const secRegras = el('regras');
  if (secRegras && !secRegras.innerHTML.trim()) {
    secRegras.innerHTML = `
      <h2>🏆 Regras</h2>
      <div class="grid-3">
        <div><div class="section-title muted">Vitória</div><input class="input" id="ptsV" type="number" min="0" step="1" inputmode="numeric"/></div>
        <div><div class="section-title muted">Empate</div><input class="input" id="ptsE" type="number" min="0" step="1" inputmode="numeric"/></div>
        <div><div class="section-title muted">Derrota</div><input class="input" id="ptsD" type="number" min="0" step="1" inputmode="numeric"/></div>
      </div>
    `;
  }

  // Atletas
  const secTimes = el('times');
  if (secTimes && !secTimes.innerHTML.trim()) {
    secTimes.innerHTML = `
      <h2>🧑 Atletas</h2>
      <div class="row">
        <input class="input" id="novoJogador" placeholder="Nome do atleta" autocomplete="off"/>
        <button class="btn" id="btnAddJogador">Adicionar</button>
        <button class="btn-ghost" id="btnUndoJogador">Desfazer último</button>
      </div>
      <div class="section-title muted">Elenco (toque para alternar: fora → A → B → fora)</div>
      <div id="chipsAtletas" class="chips" aria-live="polite"></div>
      <div class="grid-2 mt12">
        <div><div class="section-title muted">Time A</div><div class="team" id="listaA"></div></div>
        <div><div class="section-title muted">Time B</div><div class="team" id="listaB"></div></div>
      </div>
      <div class="controls">
        <button class="btn-ghost" id="btnLimparSel">Limpar seleção</button>
        <button class="btn-ghost" id="btnInverter">Inverter A/B</button>
      </div>
    `;
  }

  // Campo tático
  const secTatico = el('tatico');
  if (secTatico && !secTatico.innerHTML.trim()) {
    secTatico.innerHTML = `
      <h2>📋 Campo tático</h2>
      <div class="row" id="toolbarTatico"></div>
      <div class="formations">
        <div class="pitch-wrap">
          <div class="pitch-head"><span class="badge">Time A</span>
            <select class="input select-small" id="formA" aria-label="Formação do time A"></select>
          </div>
          <div class="pitch"><div class="field" id="fieldA"><div class="players" id="playersA"></div></div></div>
        </div>
        <div class="pitch-wrap">
          <div class="pitch-head"><span class="badge">Time B</span>
            <select class="input select-small" id="formB" aria-label="Formação do time B"></select>
          </div>
          <div class="pitch"><div class="field" id="fieldB"><div class="players" id="playersB"></div></div></div>
        </div>
      </div>
    `;
  }

  // Registrar partida
  const secRegistro = el('registro');
  if (secRegistro && !secRegistro.innerHTML.trim()) {
    secRegistro.innerHTML = `
      <h2>🗒️ Registrar partida</h2>
      <div class="row">
        <div class="score">
          <span id="lblA">A</span>
          <input class="input score-in" id="placarA" type="number" min="0" step="1" inputmode="numeric"/>
          <span class="x">×</span>
          <input class="input score-in" id="placarB" type="number" min="0" step="1" inputmode="numeric"/>
          <span id="lblB">B</span>
        </div>
      </div>
      <div class="row">
        <input class="input" id="obs" placeholder="ex.: rodada 3, amistoso"/>
        <button class="btn" id="btnSalvar">Salvar partida</button>
        <button class="btn-ghost" id="btnDesfazerPartida">Desfazer</button>
      </div>
      <label class="row mt8">
        <input id="autoReset" type="checkbox"/>
        <span class="muted">Reset automático diário (só o quadro do dia)</span>
      </label>
      <button class="btn-ghost" id="btnResetHoje">Zerar HOJE</button>
    `;
  }

  // Calendário
  const secCal = el('calendario');
  if (secCal && !secCal.innerHTML.trim()) {
    secCal.innerHTML = `
      <h2>📅 Calendário</h2>
      <div class="cal-toolbar">
        <button class="btn-ghost" id="calPrev">← Anterior</button>
        <input class="input date-picker" type="date" id="pickDay"/>
        <button class="btn-ghost" id="calNext">Próximo →</button>
      </div>
      <div class="cal-head">
        <span class="muted">Resumo do dia:</span>
        <span class="badge" id="calResumo">—</span>
      </div>
      <div class="games" id="listaJogosDia"></div>
    `;
  }

  // Ranking + charts
  const secTabela = el('tabela');
  if (secTabela && !secTabela.innerHTML.trim()) {
    secTabela.innerHTML = `
      <h2 class="row" style="justify-content:space-between">
        <span>📊 Ranking</span><span class="badge">Tabela</span>
      </h2>
      <div id="chartPts" aria-label="Gráfico Top 10 por pontos"></div>
      <div id="chartWin" aria-label="Gráfico Top 5 por aproveitamento"></div>
      <table class="table" id="tblLiga">
        <thead>
          <tr>
            <th>#</th><th class="rank">Atleta</th>
            <th>J</th><th>V</th><th>E</th><th>D</th>
            <th>GP</th><th>GC</th><th>SG</th><th>Pts</th><th>PPG</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `;
  }
}

/* ---------- Subtítulo da hero ---------- */
function readLastDayRaw() {
  try {
    const raw = localStorage.getItem(keyLastDay());
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function atualizarSubtitulo() {
  const lastDay = readLastDayRaw();
  const hoje = todayISO();
  setText('#subtitulo', !lastDay ? 'Nenhuma partida registrada ainda'
                                 : hoje === lastDay ? 'Rodada em andamento…'
                                 : 'Aguardando próxima rodada');
}

/* ---------- Settings (regras) ---------- */
function carregarSettings() {
  const s = read(K.settings, { ptsV: 3, ptsE: 1, ptsD: 0 });
  const ptsV = document.getElementById('ptsV');
  const ptsE = document.getElementById('ptsE');
  const ptsD = document.getElementById('ptsD');
  if (ptsV) ptsV.value = Number.isFinite(+s.ptsV) ? +s.ptsV : 3;
  if (ptsE) ptsE.value = Number.isFinite(+s.ptsE) ? +s.ptsE : 1;
  if (ptsD) ptsD.value = Number.isFinite(+s.ptsD) ? +s.ptsD : 0;
}
function wireSettings() {
  ['ptsV','ptsE','ptsD'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      const pts = {
        ptsV: +document.getElementById('ptsV').value || 3,
        ptsE: +document.getElementById('ptsE').value || 1,
        ptsD: +document.getElementById('ptsD').value || 0
      };
      write(K.settings, pts);
      document.dispatchEvent(new CustomEvent('ranking:update'));
      showToast('⚙️ Pontuação atualizada', 'info');
    });
  });
}

/* ---------- Eventos globais ---------- */
function wireGlobalEvents() {
  document.addEventListener('partida:salva', () => {
    document.dispatchEvent(new CustomEvent('ranking:update'));
    atualizarSubtitulo();
    showToast('✅ Partida salva e ranking atualizado!', 'success');
  });
  document.addEventListener('partida:desfeita', () => {
    document.dispatchEvent(new CustomEvent('ranking:update'));
    atualizarSubtitulo();
    showToast('↩️ Última partida desfeita', 'info');
  });
  document.addEventListener('calendar:update', atualizarSubtitulo);
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  bootstrapDOM();

  initRouter({
    routes: {
      '/': 'regras',
      '/regras': 'regras',
      '/times': 'times',
      '/tatico': 'tatico',
      '/registro': 'registro',
      '/cal': 'calendario',
      '/ranking': 'tabela',
    },
    defaultRoute: '/regras'
  });

  carregarSettings();
  wireSettings();

  // Módulos principais
  initAthletes();
  initPitch();
  initCalendar();
  initMatches();
  initRanking();
  initCharts();

  // Ajuda opcional
  try {
    const { initHelp } = await import('./ui/help.js');
    initHelp?.();
  } catch { /* ajuda é opcional */ }

  wireGlobalEvents();
  atualizarSubtitulo();

  showToast('⚽ Liga da Firma 2025 pronta para jogo!', 'success');
});
