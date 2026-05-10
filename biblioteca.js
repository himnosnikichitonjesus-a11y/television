// pages/biblioteca.js
import { getLikes, getHistory, getPlaylists } from '../memoria.js';
import { getEpisodioById } from '../episodios.js';
import { escapeHtml, escapeAttr } from '../feed.js';

export const meta = { title: 'Biblioteca — NikichitonJesús TV' };

export function render(container, ctx) {
  const likes = getLikes().map(getEpisodioById).filter(Boolean);
  const histIds = Object.entries(getHistory()).sort((a,b) => b[1].ts - a[1].ts).map(([id]) => id);
  const hist = histIds.map(getEpisodioById).filter(Boolean);
  const playlists = getPlaylists();

  container.innerHTML = `
    <div class="feed">
      <h1 style="padding:24px 20px 0;margin:0;">📚 Mi biblioteca</h1>
      ${section('❤ Me gusta', likes)}
      ${section('🕐 Historial', hist)}
      <section class="feed-section" style="padding:0 20px;">
        <h2>📋 Listas</h2>
        ${playlists.length ? `<div class="feed-grid">${playlists.map(p => `
          <article class="ep-card"><div class="body"><div class="title">${escapeHtml(p.name)}</div><div class="meta">${p.episodeIds.length} episodios</div></div></article>
        `).join('')}</div>` : `<p class="empty">Aún no tienes listas. Próximamente podrás crearlas.</p>`}
      </section>
    </div>`;
  container.querySelectorAll('[data-link]').forEach(el => {
    el.addEventListener('click', () => ctx.navigate(el.dataset.link));
  });
}

function section(title, eps) {
  if (!eps.length) return `<section class="feed-section" style="padding:0 20px;"><h2>${title}</h2><p class="empty">Vacío.</p></section>`;
  return `<section class="feed-section" style="padding:0 20px;">
    <h2>${title}</h2>
    <div class="feed-grid">${eps.map(ep => `
      <article class="ep-card" data-link="${escapeAttr(ep.detailUrl)}">
        <div class="thumb" style="background-image:url('${escapeAttr(ep.coverUrl)}')"></div>
        <div class="body"><div class="title">${escapeHtml(ep.title)}</div><div class="meta">${escapeHtml(ep.author||'')}</div></div>
      </article>`).join('')}</div>
  </section>`;
}
