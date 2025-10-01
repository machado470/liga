// src/core/math.js — atualizado
// Funções matemáticas e estatísticas reutilizáveis para a Liga da Firma

// ---- util interno: normaliza número (NaN → 0) ----
const nz = (v) => (Number.isFinite(+v) ? +v : 0);

// ---- básicos ----

/**
 * Calcula o saldo de gols (SG = GP - GC).
 * @param {number} gp - gols a favor
 * @param {number} gc - gols contra
 * @returns {number}
 */
export function saldo(gp, gc) {
  return nz(gp) - nz(gc);
}

/**
 * Calcula pontos totais a partir de vitórias, empates e derrotas.
 * @param {number} v - vitórias
 * @param {number} e - empates
 * @param {number} d - derrotas
 * @param {number} ptsV - pontos por vitória
 * @param {number} ptsE - pontos por empate
 * @param {number} ptsD - pontos por derrota
 * @returns {number}
 */
export function pontos(v, e, d, ptsV, ptsE, ptsD) {
  return nz(v) * nz(ptsV) + nz(e) * nz(ptsE) + nz(d) * nz(ptsD);
}

/**
 * Calcula a média de pontos por jogo (PPG).
 * @param {number} pontosVal
 * @param {number} jogos
 * @returns {number}
 */
export function ppg(pontosVal, jogos) {
  const j = nz(jogos);
  if (j <= 0) return 0;
  return +(nz(pontosVal) / j).toFixed(2);
}

/**
 * Calcula o percentual de vitórias (0–1).
 * @param {number} v - vitórias
 * @param {number} j - jogos
 * @returns {number}
 */
export function pctVitorias(v, j) {
  const J = nz(j);
  if (J <= 0) return 0;
  const p = nz(v) / J;
  // limita dentro do intervalo lógico
  return +Math.min(1, Math.max(0, p)).toFixed(2);
}

/**
 * Média de gols marcados por partida.
 * @param {number} gp - gols marcados
 * @param {number} j - jogos
 * @returns {number}
 */
export function mediaGols(gp, j) {
  const J = nz(j);
  if (J <= 0) return 0;
  return +(nz(gp) / J).toFixed(2);
}

/**
 * Projeta a pontuação ao fim de X jogos com base no PPG atual.
 * @param {number} ppg - pontos por jogo atual
 * @param {number} totalJogos - número total de jogos previstos
 * @returns {number}
 */
export function projecaoPontos(ppg, totalJogos) {
  return +Math.round(nz(ppg) * nz(totalJogos));
}

// ---- agregadores úteis (extras, não quebram API) ----

/** Soma segura de um array de números. */
export function sum(arr = []) {
  return arr.reduce((a, b) => a + nz(b), 0);
}

/** Média simples de um array de números. */
export function mean(arr = []) {
  const n = arr.length;
  return n ? sum(arr) / n : 0;
}

/** Desvio-padrão populacional de um array de números. */
export function stddev(arr = []) {
  const m = mean(arr);
  if (!arr.length) return 0;
  const v = mean(arr.map(x => (nz(x) - m) ** 2));
  return Math.sqrt(v);
}

// ---- transformação de estatísticas do jogador ----

/**
 * Gera estatísticas completas de um jogador com base nos dados crus.
 * Retorna um objeto pronto para ser usado na tabela de ranking.
 * @param {object} stats - dados crus do jogador
 * @param {number} stats.J - jogos
 * @param {number} stats.V - vitórias
 * @param {number} stats.E - empates
 * @param {number} stats.D - derrotas
 * @param {number} stats.GP - gols pró
 * @param {number} stats.GC - gols contra
 * @param {number} [stats.ptsV=3] - pontos por vitória
 * @param {number} [stats.ptsE=1] - pontos por empate
 * @param {number} [stats.ptsD=0] - pontos por derrota
 * @param {number} [seasonGames=38] - jogos de referência para projeção
 * @returns {object} - estatísticas completas do jogador
 */
export function gerarStats(
  { J, V, E, D, GP, GC, ptsV = 3, ptsE = 1, ptsD = 0 },
  seasonGames = 38
) {
  const JJ  = nz(J), VV = nz(V), EE = nz(E), DD = nz(D);
  const GPF = nz(GP), GCF = nz(GC);

  const Pts = pontos(VV, EE, DD, ptsV, ptsE, ptsD);
  const SG  = saldo(GPF, GCF);
  const PPG = ppg(Pts, JJ);

  return {
    J: JJ,
    V: VV,
    E: EE,
    D: DD,
    GP: GPF,
    GC: GCF,
    SG,
    Pts,
    PPG,
    pctV: pctVitorias(VV, JJ),
    mediaGP: mediaGols(GPF, JJ),
    projecao: projecaoPontos(PPG, seasonGames)
  };
}
