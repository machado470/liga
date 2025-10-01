// src/core/dom.js — atualizado
// Utilitários DOM globais para seleção, criação e manipulação de elementos

/**
 * Seleciona um único elemento no DOM.
 * @param {string} sel - seletor CSS
 * @param {Document|HTMLElement} [root=document] - raiz opcional
 * @returns {HTMLElement|null}
 */
export const $ = (sel, root = document) => root.querySelector(sel);

/**
 * Seleciona vários elementos e retorna como array.
 * @param {string} sel - seletor CSS
 * @param {Document|HTMLElement} [root=document] - raiz opcional
 * @returns {HTMLElement[]}
 */
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/**
 * Cria um novo elemento com classes e conteúdo opcionais.
 * @param {string} tag - nome da tag (ex.: 'div', 'button')
 * @param {string[]} [cls=[]] - classes opcionais
 * @param {string} [text=""] - texto interno opcional
 * @returns {HTMLElement}
 */
export function el(tag, cls = [], text = "") {
  const node = document.createElement(tag);
  if (cls?.length) node.classList.add(...cls);
  if (text) node.textContent = text;
  return node;
}

/**
 * Adiciona um evento usando delegação (útil para listas dinâmicas).
 * @param {HTMLElement} root - elemento raiz onde o evento será escutado
 * @param {string} selector - seletor dos elementos alvo
 * @param {string} type - tipo do evento (ex.: 'click')
 * @param {Function} handler - função callback
 */
export function delegate(root, selector, type, handler) {
  if (!root || !selector || !type || typeof handler !== "function") return;
  root.addEventListener(type, (e) => {
    const target = e.target?.closest(selector);
    if (target && root.contains(target)) {
      handler(e, target);
    }
  });
}

/**
 * Atualiza o texto de um elemento, se ele existir.
 * @param {string} sel - seletor CSS
 * @param {string} txt - novo texto
 */
export function setText(sel, txt) {
  const node = $(sel);
  if (node) node.textContent = String(txt ?? "");
}

/**
 * Mostra ou esconde um elemento do DOM.
 * @param {string|HTMLElement} sel - seletor ou nó direto
 * @param {boolean} show - true para mostrar, false para esconder
 */
export function toggle(sel, show = true) {
  const node = typeof sel === "string" ? $(sel) : sel;
  if (!node) return;
  if (show) {
    node.hidden = false;
    node.style.display = node.dataset._display || "";
  } else {
    // guarda o display original se ainda não foi guardado
    if (!node.dataset._display && node.style.display && node.style.display !== "none") {
      node.dataset._display = node.style.display;
    }
    node.hidden = true;
    node.style.display = "none";
  }
}

/**
 * Limpa todos os filhos de um elemento.
 * @param {string|HTMLElement} sel - seletor ou nó direto
 * @returns {HTMLElement|null} - retorna o nó limpo (ou null se não existir)
 */
export function clear(sel) {
  const node = typeof sel === "string" ? $(sel) : sel;
  if (!node) return null;
  node.innerHTML = "";
  return node;
}
