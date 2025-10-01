// src/ui/modal.js — atualizado
// Modais simples (conteúdo e confirmação) reutilizáveis
// Upgrades: foco preso, Esc para fechar, overlay clicável, ARIA, restore focus.

const modalRootId = 'modal-root';

let prevFocused = null;
let keyHandler = null;
let clickHandler = null;
let focusHandler = null;
let opened = false;
let idSeq = 0;

// garante um container no body
function ensureRoot() {
  let root = document.getElementById(modalRootId);
  if (!root) {
    root = document.createElement('div');
    root.id = modalRootId;
    document.body.appendChild(root);
  }
  return root;
}

function getFocusable(container) {
  return [...container.querySelectorAll(
    'a[href],button:not([disabled]),textarea,input[type],select,[tabindex]:not([tabindex="-1"])'
  )].filter(el => !el.hasAttribute('inert') && !el.closest('[inert]'));
}

function trapFocus(modalEl) {
  const f = getFocusable(modalEl);
  if (!f.length) return;
  const first = f[0];
  const last = f[f.length - 1];

  focusHandler = (e) => {
    if (!opened) return;
    if (e.key !== 'Tab') return;
    // ciclo do foco
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus(); return;
    }
    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus(); return;
    }
  };
  modalEl.addEventListener('keydown', focusHandler);
}

function setSiblingsAriaHidden(on) {
  // esconde o resto do app para leitores de tela enquanto o modal está aberto
  const root = ensureRoot();
  [...document.body.children].forEach(el => {
    if (el === root) return;
    if (on) el.setAttribute('aria-hidden', 'true');
    else el.removeAttribute('aria-hidden');
  });
}

// fecha modal
export function closeModal() {
  const root = document.getElementById(modalRootId);
  if (root) {
    // remove handlers do overlay antes de desmontar, por segurança
    if (clickHandler) root.removeEventListener('click', clickHandler);
    root.innerHTML = '';
  }
  document.body.classList.remove('modal-open');
  setSiblingsAriaHidden(false);

  // remove handlers globais
  if (keyHandler) document.removeEventListener('keydown', keyHandler, { capture: true });
  keyHandler = null;
  clickHandler = null;

  // (se o elemento ainda existir, remove o trap)
  const modalEl = root?.querySelector?.('.modal');
  if (modalEl && focusHandler) modalEl.removeEventListener('keydown', focusHandler);
  focusHandler = null;

  // restaura foco anterior
  if (prevFocused && typeof prevFocused.focus === 'function') {
    try { prevFocused.focus(); } catch {}
  }
  prevFocused = null;
  opened = false;
}

function mountModal({ title = 'Detalhes', html = '', confirm = false, onConfirm = null }) {
  const root = ensureRoot();
  document.body.classList.add('modal-open');
  setSiblingsAriaHidden(true);

  prevFocused = document.activeElement;
  opened = true;

  const hid = `modal-heading-${++idSeq}`;
  const did = `modal-desc-${idSeq}`;

  root.innerHTML = `
    <div class="modal-overlay" data-overlay="1"></div>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="${hid}" aria-describedby="${did}">
      <div class="modal-head">
        <h3 id="${hid}">${title}</h3>
        <button class="modal-close" aria-label="Fechar" data-close="1">×</button>
      </div>
      <div class="modal-body" id="${did}">${html || ''}</div>
      <div class="modal-foot">
        ${confirm ? `
          <button class="btn-ghost" id="modalCancel" data-close="1">Cancelar</button>
          <button class="btn" id="modalConfirm">Confirmar</button>
        ` : `
          <button class="btn" id="modalOk" data-close="1">OK</button>
        `}
      </div>
    </div>
  `;

  const modalEl = root.querySelector('.modal');
  const closeBtns = root.querySelectorAll('[data-close]');
  closeBtns.forEach(b => b.addEventListener('click', closeModal));

  // clique no overlay fecha
  clickHandler = (e) => {
    if (e.target?.dataset?.overlay === '1') closeModal();
  };
  root.addEventListener('click', clickHandler);

  // Esc para fechar
  keyHandler = (e) => {
    if (!opened) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    }
  };
  document.addEventListener('keydown', keyHandler, { capture: true });

  // foco inicial
  const firstFocusable = getFocusable(modalEl)[0] || root.querySelector('.modal-close');
  if (firstFocusable) firstFocusable.focus();

  // trap de foco
  trapFocus(modalEl);

  // callback do confirmar (se houver)
  if (confirm && onConfirm) {
    root.querySelector('#modalConfirm')?.addEventListener('click', () => {
      const cb = onConfirm; // segura a ref antes de fechar
      closeModal();
      try { cb(); } catch {}
    });
  }
}

// abre modal com conteúdo HTML livre
export function openModal(title = 'Detalhes', html = '') {
  mountModal({ title, html, confirm: false });
}

// abre modal de confirmação com callback
export function confirmModal(msg = 'Confirmar ação?', onConfirm = () => {}) {
  const safeMsg = `<p>${msg}</p>`;
  mountModal({ title: 'Confirmação', html: safeMsg, confirm: true, onConfirm });
}
