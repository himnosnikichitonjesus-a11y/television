// =========================================================
// feed.js — Vista del feed principal (/--)
// =========================================================
import { feedSecciones, todasLasCategorias } from './utilidades.js';
import { getEpisodiosBySerieId } from './episodios.js';

export const meta = {
  title: 'Inicio — NikichitonJesús TV',
  description: 'Explora episodios, series y novedades en NikichitonJesús TV.'
};

export function render(container, ctx) {
  const secciones = feedSecciones();
  const html = `
    <div class="feed">
      ${secciones.map(sec => sectionHTML(sec)).join('')}
    </div>`;
  container.innerHTML = html;
  container.querySelectorAll('[data-ep]').forEach(el => {
    el.addEventListener('click', () => ctx.navigate(el.dataset.url));
  });
  container.querySelectorAll('[data-serie]').forEach(el => {
    el.addEventListener('click', () => ctx.navigate(el.dataset.url));
  });
}

function sectionHTML(sec) {
  if (sec.tipo === 'series') {
    return `<section class="feed-section">
      <h2>${escapeHtml(sec.titulo)}</h2>
      <div class="feed-grid">
        ${sec.episodios.map(s => serieCardHTML(s)).join('')}
      </div>
    </section>`;
  }
  if (!sec.episodios.length) return '';
  return `<section class="feed-section">
    <h2>${escapeHtml(sec.titulo)}</h2>
    <div class="feed-grid">
      ${sec.episodios.map(ep => epCardHTML(ep)).join('')}
    </div>
  </section>`;
}

function epCardHTML(ep) {
  const tipo = ep.hasVideo 
    ? `<img src="https://nikichitonjesus.odoo.com/web/image/1110-40385f0d/video.webp" alt="Video" class="badge-icon"> Video`
    : `<img src="https://nikichitonjesus.odoo.com/web/image/625-e42b8a86/audio.png" alt="Audio" class="badge-icon"> Audio`;

  return `
    <article class="ep-card" data-ep data-url="${escapeAttr(ep.detailUrl)}">
      <div class="thumb" style="background-image:url('${escapeAttr(ep.coverUrl)}')">
        <span class="badge">${tipo}</span>
      </div>
      <div class="body">
        <div class="title">${escapeHtml(ep.title)}</div>
        <div class="meta">${escapeHtml(ep.author || '')} · ${formatDate(ep.date)}</div>
      </div>
    </article>`;
}

function serieCardHTML(s) {
  const count = getEpisodiosBySerieId(s.seriesid).length;
  
  // Cambia esta URL por la imagen real de "Serie"
  const serieIcon = `<img src="https://video-nikichitonjesus.odoo.com/web/image/445-ad116cfc/episodios.webp" alt="Serie" class="badge-icon">`;

  return `
    <article class="ep-card" data-serie data-url="${escapeAttr(s.url_serie)}">
      <div class="thumb" style="background-image:url('${escapeAttr(s.portada_serie)}')">
        <span class="badge">${serieIcon} Serie · ${count} ep</span>
      </div>
      <div class="body">
        <div class="title">${escapeHtml(s.titulo_serie)}</div>
        <div class="meta">${escapeHtml(s.descripcion_serie || '')}</div>
      </div>
    </article>`;
}

function formatDate(d) {
  try { return new Date(d).toLocaleDateString('es-ES', { year:'numeric', month:'short', day:'numeric' }); }
  catch { return d || ''; }
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function escapeAttr(s) { return escapeHtml(s); }
