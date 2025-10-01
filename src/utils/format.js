// src/core/format.js — atualizado
// Funções utilitárias de formatação para datas, números e estatísticas

const TZ = 'America/Sao_Paulo';

/**
 * Converte entrada em Date seguro.
 * @param {string|Date|number} d
 * @returns {Date}
 */
function toDate(d) {
  if (d instanceof Date) return d;
  if (typeof d === 'number') return new Date(d);
  const parsed = new Date(String(d));
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Formata uma data para DD/MM/AAAA.
 * @param {string|Date|number} d
 * @returns {string}
 */
export function formatDate(d) {
  return toDate(d).toLocaleDateString('pt-BR', { timeZone: TZ });
}

/**
 * Retorna a hora no formato HH:MM.
 * @param {string|Date|number} d
 * @returns {string}
 */
export function formatTime(d) {
  return toDate(d).toLocaleTimeString('pt-BR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formata um número com separadores de milhar.
 * @param {number} n
 * @param {number} [decimals=0]
 * @returns {string}
 */
export function formatNumber(n, decimals = 0) {
  const val = Number.isFinite(+n) ? +n : 0;
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Formata um percentual com 1 casa decimal.
 * @param {number} p - número entre 0 e 1
 * @returns {string}
 */
export function formatPct(p) {
  const num = Number.isFinite(+p) ? +p : 0;
  return (num * 100).toFixed(1) + '%';
}

/**
 * Calcula e formata PPG (pontos por jogo).
 * @param {number} pontos
 * @param {number} jogos
 * @returns {string}
 */
export function formatPPG(pontos, jogos) {
  const pts = Number.isFinite(+pontos) ? +pontos : 0;
  const j = Number.isFinite(+jogos) ? +jogos : 0;
  return j > 0 ? (pts / j).toFixed(2) : '0.00';
}

/**
 * Formata um placar no estilo “3 × 2”.
 * @param {number} a
 * @param {number} b
 * @returns {string}
 */
export function formatScore(a, b) {
  const x = Number.isFinite(+a) ? +a : 0;
  const y = Number.isFinite(+b) ? +b : 0;
  return `${x} × ${y}`;
}

/**
 * Retorna um rótulo amigável para datas (ex.: "Hoje", "Ontem", "12/03/2025").
 * @param {string|Date|number} d
 * @returns {string}
 */
export function friendlyDate(d) {
  const date = toDate(d);
  const today = new Date();
  const diffDays = Math.floor(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()) -
     new Date(date.getFullYear(), date.getMonth(), date.getDate())) / 86400000
  );

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays === -1) return 'Amanhã';
  return formatDate(date);
}

/**
 * Retorna string "HH:MM — DD/MM/AAAA"
 * @param {string|Date|number} d
 * @returns {string}
 */
export function formatDateTime(d) {
  const date = toDate(d);
  return `${formatTime(date)} — ${formatDate(date)}`;
}

/**
 * Retorna string tipo "+3" ou "−1" para saldos
 * @param {number} val
 * @returns {string}
 */
export function formatDelta(val) {
  const v = Number.isFinite(+val) ? +val : 0;
  return v > 0 ? `+${v}` : `${v}`;
}
