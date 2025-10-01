// src/ui/help.js — inicializa dicas e tooltips
export function initHelp(){
  // Toggle global das dicas
  const toggle = document.querySelector('.help-toggle');
  const update = (pressed) => {
    document.body.classList.toggle('show-help', pressed);
    if (toggle) toggle.setAttribute('aria-pressed', String(pressed));
  };
  if (toggle){
    // estado inicial: true (mostrando) para onboarding mais intuitivo
    const initial = toggle.getAttribute('aria-pressed') !== 'false';
    update(initial);
    toggle.addEventListener('click', () => {
      const now = toggle.getAttribute('aria-pressed') === 'true';
      update(!now);
    });
  }

  // Tooltips “?” nos títulos
  document.addEventListener('click', (e) => {
    const h = e.target.closest('.help');
    if (!h) return;
    const open = h.getAttribute('aria-expanded') === 'true';
    // fecha abertos no mesmo título
    h.setAttribute('aria-expanded', String(!open));
  });

  // Fecha tooltip ao clicar fora
  document.addEventListener('click', (e) => {
    if (e.target.closest('.help')) return;
    document.querySelectorAll('.help[aria-expanded="true"]').forEach(el =>
      el.setAttribute('aria-expanded','false')
    );
  }, { capture:true });
}
