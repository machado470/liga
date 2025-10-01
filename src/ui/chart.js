// src/ui/chart.js — atualizado
// Gráficos leves em SVG (offline), responsivos e acoplados ao evento de ranking

import { read } from '../core/storage.js';
import { K } from '../core/config.js';

const $ = (s, r = document) => r.querySelector(s);
const STATS_KEY = K.stats || 'stats'; // compat se K.stats não existir
const esc = s =>
  String(s).replace(/[&<>"']/g, m => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[m]));
const nz  = v => (Number.isFinite(+v) ? +v : 0);

// ===== Tema dinâmico (lê variáveis CSS) =====
function theme(el = document.documentElement) {
  const cs = getComputedStyle(el);
  const pick = (v, fb) => {
    const x = cs.getPropertyValue(v).trim();
    return x || fb;
  };
  return {
    accent: pick('--accent', '#21d37a'),
    ink:    pick('--ink', '#eaf7e9'),
    muted:  pick('--muted', '#a8c7ad'),
    bg1:    pick('--bg1', '#143722')
  };
}

// ===== debounce simples =====
function debounce(fn, ms = 120) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ===== util: cria/atualiza observer por container =====
const observers = new Map();
function observeResize(container, onResize) {
  if (!container || observers.has(container)) return;
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(debounce(() => onResize(), 120));
    ro.observe(container);
    observers.set(container, ro);
  } else {
    // fallback simples
    window.addEventListener('resize', debounce(onResize, 150));
  }
}

// ===== Top 10 por pontos (barras horizontais) =====
export function renderPointsChart(containerId = 'chartPts') {
  const container = $(`#${containerId}`);
  if (!container) return;

  const { accent, ink, muted } = theme(container);

  let stats = read(STATS_KEY, {});
  if (typeof stats !== 'object' || !stats) stats = {};

  const data = Object.entries(stats)
    .map(([nome, s]) => ({ nome, pts: nz(s?.Pts) }))
    .filter(d => Number.isFinite(d.pts))
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 10);

  // largura responsiva (se invisível, tenta um fallback)
  const labelW = 160;
  const gapY   = 8;
  const barH   = 28;

  const width  = Math.max(320, container.clientWidth || container.offsetWidth || 400);
  const innerW = Math.max(60, width - labelW - 12);
  const height = Math.max(44, data.length * (barH + gapY));

  if (!data.length || innerW <= 0) {
    container.innerHTML = `<div class="muted">Nenhum dado para exibir.</div>`;
    return;
  }

  const max = Math.max(1, ...data.map(d => d.pts));

  const bars = data.map((d, i) => {
    const y = i * (barH + gapY);
    const w = (d.pts / max) * innerW;
    // truncamento de label se precisar (SVG não quebra linha)
    const name = d.nome.length > 24 ? d.nome.slice(0, 23) + '…' : d.nome;
    return `
      <rect x="${labelW}" y="${y}" width="${w}" height="${barH}" rx="6" fill="${accent}"></rect>
      <text x="10" y="${y + barH * 0.72}" fill="${ink}" font-size="14">${esc(name)}</text>
      <text x="${labelW + w + 6}" y="${y + barH * 0.72}" fill="${muted}" font-size="13">${d.pts} pts</text>
    `;
  }).join('');

  container.innerHTML = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Top 10 por pontos">
      ${bars}
    </svg>
  `;

  // Observa redimensionamento para re-render
  observeResize(container, () => renderPointsChart(containerId));
}

// ===== Top 5 por aproveitamento (% vitórias) — donut =====
export function renderWinRateChart(containerId = 'chartWin') {
  const container = $(`#${containerId}`);
  if (!container) return;

  const { accent, ink, muted, bg1 } = theme(container);

  let stats = read(STATS_KEY, {});
  if (typeof stats !== 'object' || !stats) stats = {};

  const data = Object.entries(stats)
    .map(([nome, s]) => {
      const J = nz(s?.J), V = nz(s?.V);
      return { nome, total: J, winRate: J > 0 ? (V / J) * 100 : 0 };
    })
    .filter(d => Number.isFinite(d.winRate))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 5);

  if (!data.length) {
    container.innerHTML = `<div class="muted">Nenhum dado disponível.</div>`;
    return;
  }

  const radius = 60;
  const stroke = 14;
  const gap = 40;
  const pad = 20;

  const width = data.length * (radius * 2 + gap) - gap + pad * 2;
  const height = radius * 2 + pad * 2 + 40; // + espaço para rótulo
  const cy = pad + radius;
  const circumference = 2 * Math.PI * radius;

  const circles = data.map((d, i) => {
    const cx = pad + radius + i * (radius * 2 + gap);
    const wr = Math.max(0, Math.min(100, d.winRate));
    const dash = (wr / 100) * circumference;
    const offset = circumference - dash;
    const name = d.nome.length > 18 ? d.nome.slice(0, 17) + '…' : d.nome;

    return `
      <circle cx="${cx}" cy="${cy}" r="${radius}" stroke="${bg1}" stroke-width="${stroke}" fill="none" />
      <circle cx="${cx}" cy="${cy}" r="${radius}" stroke="${accent}" stroke-width="${stroke}" fill="none"
        stroke-linecap="round"
        stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"
        transform="rotate(-90 ${cx} ${cy})" />
      <text x="${cx}" y="${cy + 5}" text-anchor="middle" fill="${ink}" font-size="16" font-weight="700">
        ${Math.round(wr)}%
      </text>
      <text x="${cx}" y="${cy + radius + 22}" text-anchor="middle" fill="${muted}" font-size="14">${esc(name)}</text>
    `;
  }).join('');

  container.innerHTML = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Top 5 por aproveitamento de vitórias">
      ${circles}
    </svg>
  `;

  observeResize(container, () => renderWinRateChart(containerId));
}

// ===== Bootstrap + assinaturas =====
export function initCharts() {
  const rerender = debounce(() => {
    renderPointsChart();
    renderWinRateChart();
  }, 120);

  renderPointsChart();
  renderWinRateChart();

  // Atualiza em mudanças de ranking e em resize global (fallback)
  document.addEventListener('ranking:update', rerender);
  window.addEventListener('resize', rerender);
  window.addEventListener('hashchange', rerender);
}
