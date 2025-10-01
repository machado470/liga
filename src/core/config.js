// src/core/config.js — atualizado
// Namespacing, defaults e helpers de datas (TZ São Paulo) + utilitários safe.

export const TZ = 'America/Sao_Paulo';

export const K = {
  ns: 'liga25:',           // namespace base no localStorage

  // Dados
  settings:  'settings',   // pontos por resultado
  athletes:  'athletes',   // elenco completo
  matches:   'matches:',   // prefixo por dia → matches:YYYY-MM-DD
  lastDay:   'lastDay',    // última data jogada (YYYY-MM-DD)
  stats:     'stats',      // estatísticas agregadas por atleta

  // Tático / posições por dia
  manualPos: 'manualPos:', // posições manuais por dia (A/B)
  forms:     'forms:',     // formações por dia (A/B)

  // Preferências de UI
  uiHelp:      'ui:help',       // boolean → mostrar/esconder dicas globais
  uiCollapsed: 'ui:collapsed:', // prefixo → colapso por seção (ui:collapsed:ID=true/false)
};

// ===== Defaults =====
export const DEFAULT_SETTINGS = Object.freeze({
  ptsV: 3,
  ptsE: 1,
  ptsD: 0,
});

// ===== Namespacing helpers =====
export const nsKey         = (sub)    => K.ns + sub;
export const keySettings   = ()       => nsKey(K.settings);
export const keyAthletes   = ()       => nsKey(K.athletes);
export const keyLastDay    = ()       => nsKey(K.lastDay);
export const keyStats      = ()       => nsKey(K.stats);

// Dinâmicos por data
export const keyMatches    = (iso)    => nsKey(K.matches)   + String(iso || '');
export const keyManualPos  = (iso)    => nsKey(K.manualPos) + String(iso || '');
export const keyForms      = (iso)    => nsKey(K.forms)     + String(iso || '');

// Preferências de UI
export const keyUIHelp     = ()               => nsKey(K.uiHelp);
export const keyUICollapse = (sectionId='')   => nsKey(K.uiCollapsed) + String(sectionId || 'unknown');

// ===== Datas (timezone-safe p/ SP) =====
export function todayISO(tz = TZ) {
  // en-CA garante yyyy-mm-dd
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

export function addDaysISO(iso, days, tz = TZ) {
  const [y,m,d] = String(iso).split('-').map(Number);
  // 12:00 UTC evita flip de DST ao converter
  const base = new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1, 12));
  base.setUTCDate(base.getUTCDate() + (Number(days) || 0));
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(base);
}

export const prevDayISO = (iso, tz = TZ) => addDaysISO(iso, -1, tz);
export const nextDayISO = (iso, tz = TZ) => addDaysISO(iso, +1, tz);

// ===== Utils de segurança =====
export const safeISO = (v) => (v ? String(v) : '');
export const isSameISO = (a, b) => safeISO(a) === safeISO(b);
