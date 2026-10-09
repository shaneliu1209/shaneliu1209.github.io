/* One local preference controls every automatic animation on the site. */
(() => {
  const storageKey = 'personal-site-reduce-motion';
  const system = matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new Set();
  let requested = false;
  try { requested = localStorage.getItem(storageKey) === 'true'; } catch {}

  const reduced = () => system.matches || requested;
  const updateControls = () => {
    document.querySelectorAll('[data-motion-toggle]').forEach(button => {
      button.hidden = false;
      button.setAttribute('aria-pressed', String(reduced()));
      button.disabled = system.matches;
      button.title = system.matches
        ? 'Reduced motion is enabled in your device settings.'
        : 'Stop automatic screen rotation, video playback and decorative motion.';
      const state = button.querySelector('[data-motion-state]');
      if (state) state.textContent = system.matches ? 'On · system' : reduced() ? 'On' : 'Off';
    });
  };
  const sync = () => {
    document.documentElement.classList.toggle('motion-paused', reduced());
    document.documentElement.dataset.motion = reduced() ? 'reduced' : 'full';
    updateControls();
    listeners.forEach(listener => listener(reduced()));
  };

  window.SiteMotion = Object.freeze({
    get reduced() { return reduced(); },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  });
  system.addEventListener('change', sync);
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    requested = event.newValue === 'true';
    sync();
  });
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-motion-toggle]').forEach(button => {
      button.addEventListener('click', () => {
        if (system.matches) return;
        requested = !requested;
        try {
          if (requested) localStorage.setItem(storageKey, 'true');
          else localStorage.removeItem(storageKey);
        } catch { /* The control also works when browser storage is blocked. */ }
        sync();
      });
    });
    updateControls();
  });
  // This small script runs in the head, before any animated content is drawn.
  sync();
})();
