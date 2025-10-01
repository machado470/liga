// src/core/storage.js — atualizado e alinhado com config.js
// Persistência simples em localStorage com namespace e helpers utilitários

import { K } from './config.js';

const ns = K.ns;

// Garante que toda key salva tenha namespace (evita duplicação e bugs)
const full = (key) => {
  const k = String(key || '');
  return k.startsWith(ns) ? k : ns + k;
};

// ===== CRUD básico =====
export function read(key, fallback = null) {
  try {
    const raw = localStorage.getItem(full(key));
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function write(key, value) {
  try {
    localStorage.setItem(full(key), JSON.stringify(value));
    return value;
  } catch (err) {
    console.error('Erro ao salvar em localStorage:', key, value, err);
    return value;
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(full(key));
  } catch {}
}

// ===== Helpers de array =====
export function push(key, item) {
  const arr = read(key, []);
  arr.push(item);
  write(key, arr);
  return arr;
}

export function removeLast(key) {
  const arr = read(key, []);
  arr.pop();
  write(key, arr);
  return arr;
}

// ===== Atualização funcional =====
export function update(key, fn) {
  const cur = read(key, null);
  const next = fn(cur);
  write(key, next);
  return next;
}

// ===== Namespace utils =====
export function listKeys(prefix = '') {
  const p = ns + prefix;
  return Object.keys(localStorage).filter(k => k.startsWith(p));
}

// ===== Prefixos por data (matches:YYYY-MM-DD etc.) =====
export function readByDate(prefix, iso) {
  return read(prefix + iso, []);
}

export function writeByDate(prefix, iso, value) {
  return write(prefix + iso, value);
}

export function clearByDate(prefix, iso) {
  try {
    localStorage.removeItem(full(prefix + iso));
  } catch {}
}

// ===== Limpeza total do namespace =====
export function clearAll() {
  listKeys().forEach(k => {
    try { localStorage.removeItem(k); } catch {}
  });
}

// ===== Debug =====
export function dump() {
  return listKeys().reduce((acc, k) => {
    acc[k] = read(k.replace(ns, ''));
    return acc;
  }, {});
}
