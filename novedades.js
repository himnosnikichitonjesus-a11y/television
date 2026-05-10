// pages/novedades.js
import { getAllEpisodios } from '../episodios.js';
import { ordenarPorFecha } from '../utilidades.js';
import { escapeHtml, escapeAttr } from '../feed.js';

export const meta = { title: 'Novedades — NikichitonJesús TV', description: 'Los episodios más recientes.' };

export function render(container, ctx) {
  const eps = ordenarPorFecha(getAllEpisodios(), false);
  container.innerHTML = `
    <div class="feed">
      <h1 style="padding:24px 20px 0;margin:0;">📰 Novedades</h1>
      <section class="feed-section" style="padding:0 20px;">
        <div class="feed-grid" style="margin-top:14px;">
          ${eps.map(ep => `
            <article class="ep-card" data-link="${escapeAttr(ep.detailUrl)}">
              <div class="thumb" style="background-image:url('${escapeAttr(ep.coverUrl)}')">
                <span class="badge">${ep.hasVideo ? '🎬' : '🎧'}</span>
              </div>
              <div class="body">
                <div class="title">${escapeHtml(ep.title)}</div>
                <div class="meta">${escapeHtml(ep.author||'')} · ${new Date(ep.date).toLocaleDateString('es-ES')}</div>
              </div>
            </article>`).join('')}
        </div>
      </section>
    </div>`;
  container.querySelectorAll('[data-link]').forEach(el => {
    el.addEventListener('click', () => ctx.navigate(el.dataset.link));
  });
}
