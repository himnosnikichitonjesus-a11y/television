// =========================================================
// embed.js — Vista mínima de reproductor pantalla completa
// URL: /embed/<detailUrl o /episodio/:id o serie>--
// =========================================================
import { resolveFromUrl, render as renderWatch } from './watch.js';

export const meta = (ctx) => {
  const ep = ctx?.episodio;
  return ep
    ? { title: `${ep.title} — Reproductor`, description: ep.description, image: ep.coverUrl }
    : { title: 'Reproductor' };
};

export function resolve(pathname) {
  // pathname empieza con /embed
  const inner = pathname.replace(/^\/embed/, '') || '/';
  return resolveFromUrl(inner);
}

export function render(container, ctx) {
  document.body.classList.add('embed-mode');
  renderWatch(container, ctx);
}

export function teardown() {
  document.body.classList.remove('embed-mode');
}
