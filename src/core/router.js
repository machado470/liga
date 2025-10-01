// src/core/router.js — atualizado (A11y + inert + foco + persistência real + evento de rota)
// Roteador por hash minimalista com UX/A11y decentes e estado canônico do hash.

const STORAGE_KEY = 'liga25:lastRoute';

const state = {
  map: {},              // rota -> id da section
  defaultRoute: '/',    // rota padrão
};

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
}

function setActiveLink(resolvedPath) {
  document.querySelectorAll('[data-route]').forEach(a => {
    const target = a.getAttribute('data-route');
    const isActive = target === resolvedPath;

    // visual
    a.toggleAttribute('data-active', isActive);

    // A11y para role="tab"
    if (a.getAttribute('role') === 'tab') {
      a.setAttribute('aria-selected', String(isActive));
      a.tabIndex = isActive ? 0 : -1;
    }

    // fallback semântico
    if (isActive) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

function toggleSection(sec, visible) {
  if (!sec) return;
  if (visible) {
    sec.removeAttribute('hidden');
    sec.removeAttribute('inert');
    sec.setAttribute('aria-hidden', 'false');
    sec.style.display = '';
  } else {
    // inert bloqueia foco e eventos
    sec.setAttribute('hidden', '');
    sec.setAttribute('inert', '');
    sec.setAttribute('aria-hidden', 'true');
    sec.style.display = 'none';
  }
}

function focusSectionHeading(sec) {
  if (!sec) return;
  const h = sec.querySelector('h1, h2, [role="heading"]');
  if (!h || prefersReducedMotion()) return;

  const prevTab = h.getAttribute('tabindex');
  h.setAttribute('tabindex', '-1');
  h.focus({ preventScroll: true });
  try { h.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch {}
  if (prevTab === null) {
    queueMicrotask(() => h.removeAttribute('tabindex'));
  } else {
    h.setAttribute('tabindex', prevTab);
  }
}

function showSectionById(id) {
  const all = document.querySelectorAll('main > section');
  if (!all.length) return;
  all.forEach(sec => toggleSection(sec, sec.id === id));
  const active = document.getElementById(id);
  focusSectionHeading(active);
}

function resolveRoute(hashish) {
  const raw  = String(hashish || '').replace(/^#/, '');
  const path = raw || state.defaultRoute;
  const isValid = !!state.map[path];
  const resolvedPath = isValid ? path : state.defaultRoute;
  const id = state.map[resolvedPath];
  return { resolvedPath, id, isValid };
}

export function currentRoute() {
  const { resolvedPath } = resolveRoute(location.hash);
  return resolvedPath;
}

export function navigate(path) {
  const want = String(path || '').replace(/^#/, '');
  if (location.hash !== '#' + want) {
    location.hash = want; // dispara handle via hashchange
  } else {
    handle(); // já está nesse hash; força render
  }
}

function canonicalizeHashIfNeeded(resolvedPath) {
  const canonical = '#' + resolvedPath;
  if (location.hash !== canonical) {
    // não cria histórico extra
    try { location.replace(canonical); } catch { location.hash = resolvedPath; }
  }
}

function dispatchRouteChange(resolvedPath, id) {
  document.dispatchEvent(new CustomEvent('route:change', {
    detail: { path: resolvedPath, sectionId: id }
  }));
}

function handle() {
  const { resolvedPath, id, isValid } = resolveRoute(location.hash);
  if (!id) return;

  // salva rota aplicada
  try { sessionStorage.setItem(STORAGE_KEY, resolvedPath); } catch {}

  // se hash inválido, corrige para o canônico
  if (!isValid) canonicalizeHashIfNeeded(resolvedPath);

  showSectionById(id);
  setActiveLink(resolvedPath);
  dispatchRouteChange(resolvedPath, id);
}

function syncAriaControls() {
  // liga cada botão data-route ao id da seção (aria-controls) quando possível
  Object.entries(state.map).forEach(([path, secId]) => {
    document.querySelectorAll(`[data-route="${path}"]`).forEach(btn => {
      if (!btn.getAttribute('aria-controls')) btn.setAttribute('aria-controls', secId);
      if (btn.getAttribute('role') === 'tab' && !btn.hasAttribute('tabindex')) {
        btn.tabIndex = -1; // roving tabindex; o ativo recebe 0 em setActiveLink
      }
    });
  });
}

export function initRouter(opts = {}) {
  state.map = opts.routes || {
    '/': 'regras',
    '/regras': 'regras',
    '/times': 'times',
    '/tatico': 'tatico',
    '/registro': 'registro',
    '/cal': 'calendario',
    '/ranking': 'tabela',
  };
  state.defaultRoute = opts.defaultRoute || '/';

  // Se não houver hash, tenta restaurar última rota válida da sessão
  if (!location.hash) {
    try {
      const last = sessionStorage.getItem(STORAGE_KEY);
      if (last && state.map[last]) {
        location.replace('#' + last);
      }
    } catch {}
  }

  syncAriaControls();

  // Delegação de cliques em elementos com data-route
  document.addEventListener('click', e => {
    const a = e.target?.closest?.('[data-route]');
    if (!a) return;
    const path = a.getAttribute('data-route');
    if (!path) return;
    e.preventDefault();
    navigate(path);
  }, { passive: false });

  // Teclado para role="tab" (Enter/Space já funcionam em <button>, mas cobre <a>)
  document.addEventListener('keydown', e => {
    const el = e.target;
    if (!el?.matches?.('[data-route][role="tab"]')) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const path = el.getAttribute('data-route');
      navigate(path);
    }
  }, { passive: false });

  window.addEventListener('hashchange', handle, { passive: true });

  // Render inicial
  handle();
}

export default { initRouter, navigate, currentRoute };
