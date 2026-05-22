// =========================================================
// embed.js — Vista mínima de reproductor pantalla completa
// URL: /embed/<detailUrl o /episodio/:id o serie>
// =========================================================
import { resolveFromUrl, render as renderWatch, teardown as watchTeardown } from './watch.js';

export const meta = (ctx) => {
  const ep = ctx?.episodio;
  return ep
    ? { title: `${ep.title} — Reproductor`, description: ep.description, image: ep.coverUrl }
    : { title: 'Reproductor — NikichitonJesús TV' };
};

export function resolve(pathname) {
  const inner = pathname.replace(/^\/embed/, '') || '/';
  return resolveFromUrl(inner);
}

export function render(container, ctx) {
  document.body.classList.add('embed-mode');
  // El render se encarga de todo, incluidos estilos y comportamiento específico
  renderWatch(container, ctx);
}

export function teardown() {
  document.body.classList.remove('embed-mode');
  watchTeardown();
}
