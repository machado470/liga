// src/ui/toast.js — atualizado e robusto
// Sistema global de avisos (toast) com acessibilidade, pausa no hover, ação opcional e fila com limite.
//
// APIs suportadas:
//   showToast("Feito!", "success", 3000)
//   showToast("Falhou", { type: "error", duration: 0 }) // persistente
//   showToast("Partida salva", { type: "success", actionLabel: "Desfazer", onAction: fn })

let toastTimeout = null;
let hideAt = 0;            // timestamp de quando deve sumir
let remaining = 0;         // ms restantes ao pausar
let keyHandler = null;     // ESC para fechar
let queue = [];            // fila simples (FIFO)
let showing = false;

const TYPE_ICON = {
  success: "✅",
  error:   "⚠️",
  warn:    "⚠️",
  info:    "ℹ️",
};

function ensureEl() {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    document.body.appendChild(el);
  }
  // atributos de acessibilidade
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.setAttribute("aria-atomic", "true");
  return el;
}

function applyA11y(el, type, ariaLive) {
  // erro/atenção pode ser mais urgente
  const live = ariaLive || (type === "error" ? "assertive" : "polite");
  el.setAttribute("aria-live", live);
  el.setAttribute("role", live === "assertive" ? "alert" : "status");
}

// setContent seguro: não injeta a mensagem como HTML
function setContent(el, msg, type, actionLabel) {
  const icon = TYPE_ICON[type] || TYPE_ICON.info;
  el.className = `toast ${type}`;

  // skeleton estático
  el.innerHTML = `
    <div class="toast-inner">
      <span class="toast-ico" aria-hidden="true"></span>
      <span class="toast-msg"></span>
      ${actionLabel ? `<button class="toast-action btn-ghost" type="button"></button>` : ""}
      <button class="toast-close btn-ghost" type="button" aria-label="Fechar">×</button>
    </div>
  `;

  // popula via textContent (sem HTML dinâmico)
  const ico = el.querySelector('.toast-ico');
  const msgSpan = el.querySelector('.toast-msg');
  ico.textContent = icon;
  msgSpan.textContent = String(msg);
  if (actionLabel) {
    const act = el.querySelector('.toast-action');
    if (act) act.textContent = String(actionLabel);
  }
}

function bindInteractions(el, opts) {
  const onAction = typeof opts.onAction === "function" ? opts.onAction : null;

  // Pausa no hover
  el.onmouseenter = () => {
    if (!showing) return;
    clearTimeout(toastTimeout);
    toastTimeout = null;
    remaining = Math.max(0, hideAt - Date.now());
  };
  el.onmouseleave = () => {
    if (!showing) return;
    if (opts.duration === 0) return; // persistente, não retoma
    const ms = Math.max(400, remaining || 0);
    programHide(ms);
  };

  // Clique no X
  el.querySelector(".toast-close")?.addEventListener("click", hideToast);

  // Clique no botão de ação
  el.querySelector(".toast-action")?.addEventListener("click", () => {
    try { onAction?.(); } finally { hideToast(); }
  });

  // Clique no próprio toast fecha (se não for clique no botão)
  el.addEventListener("click", (ev) => {
    const isAction = ev.target.closest(".toast-action");
    const isClose  = ev.target.closest(".toast-close");
    if (!isAction && !isClose) hideToast();
  });

  // ESC para fechar
  if (!keyHandler) {
    keyHandler = (e) => {
      if (e.key === "Escape") hideToast();
    };
    document.addEventListener("keydown", keyHandler, { capture: true });
  }
}

function cleanupInteractions(el) {
  el.onmouseenter = null;
  el.onmouseleave = null;
  document.removeEventListener("keydown", keyHandler, { capture: true });
  keyHandler = null;
}

function programHide(ms) {
  clearTimeout(toastTimeout);
  hideAt = Date.now() + ms;
  toastTimeout = setTimeout(hideToast, ms);
}

/**
 * Mostra um toast no canto inferior direito
 * @param {string} msg
 * @param {"info"|"success"|"error"|"warn"|object} typeOrOpts
 * @param {number} duration
 */
export function showToast(msg, typeOrOpts = "info", duration = 3000) {
  // Suporte às duas assinaturas
  const opts = typeof typeOrOpts === "object"
    ? { type: "info", duration: 3000, ...typeOrOpts }
    : { type: typeOrOpts, duration };

  const { type = "info", actionLabel = null, onAction = null, ariaLive = null } = opts;
  const dur = Number.isFinite(+opts.duration) ? +opts.duration : 3000;

  // Já existe um toast visível? Enfileira e limita a fila
  if (showing) {
    queue.push({ msg, type, duration: dur, actionLabel, onAction, ariaLive });
    if (queue.length > 5) queue = queue.slice(-5); // mantém só os 5 últimos

    // encurta o atual se a fila estiver grande
    if (queue.length > 3 && hideAt - Date.now() > 1200) {
      programHide(800);
    }
    return;
  }

  const el = ensureEl();
  applyA11y(el, type, ariaLive);
  setContent(el, msg, type, actionLabel);

  // Exibe
  el.style.opacity = "1";
  el.style.pointerEvents = "auto";
  el.style.transition = "opacity .3s ease";
  showing = true;

  bindInteractions(el, { duration: dur, onAction });

  // Tempo de vida
  clearTimeout(toastTimeout);
  if (dur > 0) {
    programHide(dur);
  } else {
    // persistente: nada de timeout automático
    toastTimeout = null;
    hideAt = Infinity;
  }
}

/** Esconde o toast atual e, se houver, mostra o próximo da fila */
export function hideToast() {
  const el = document.getElementById("toast");
  if (!el) {
    showing = false;
    nextFromQueue();
    return;
  }

  clearTimeout(toastTimeout);
  toastTimeout = null;
  el.style.opacity = "0";
  el.style.pointerEvents = "none";

  // limpa handlers depois da transição
  setTimeout(() => {
    cleanupInteractions(el);
    el.dispatchEvent(new CustomEvent("toast:hide"));
    showing = false;
    nextFromQueue();
  }, 200);
}

function nextFromQueue() {
  if (queue.length > 5) queue = queue.slice(-5);
  const next = queue.shift();
  if (!next) return;
  showToast(next.msg, next);
}

// Helper opcional (compat)
function toastIcon(type) {
  return TYPE_ICON[type] || TYPE_ICON.info;
}
export { toastIcon };
