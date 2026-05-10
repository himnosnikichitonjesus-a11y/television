// =========================================================
// share.js — Vista cliente para /share/...
// El SEO real lo hace /api/share/[...slug].js (servidor) que
// devuelve HTML con meta tags y luego el cliente hace el render.
// =========================================================
import { resolveFromUrl, render as renderWatch } from './watch.js';

export const meta = (ctx) => {
  const ep = ctx?.episodio;
  return ep
    ? { title: `${ep.title} — NikichitonJesús TV`, description: ep.description, image: ep.coverUrl }
    : { title: 'Compartir' };
};

export function resolve(pathname) {
  const inner = pathname.replace(/^\/share/, '') || '/';
  return resolveFromUrl(inner);
}

export function render(container, ctx) {
  // share es básicamente watch — solo cambia que el servidor inyecta OG tags
  renderWatch(container, ctx);
}
