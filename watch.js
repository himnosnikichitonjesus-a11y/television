// =========================================================
// watch.js — Vista del reproductor (modo cine)
// =========================================================
import {
  getEpisodioById, getEpisodioByDetailUrl, getSerieByUrl,
  getEpisodiosBySerieId, getSerieById
} from './episodios.js';
import { recomendar, formatTime } from './utilidades.js';
import {
  isLiked, toggleLike, saveProgress, getProgress, trackView
} from './memoria.js';
import { escapeHtml, escapeAttr } from './feed.js';

let active = null; // { episodio, mediaEl, container, ctx, queue, queueIndex }

export const meta = (ctx) => {
  const ep = ctx?.episodio;
  if (!ep) return { title: 'Reproductor — NikichitonJesús TV' };
  return {
    title: `${ep.title} — NikichitonJesús TV`,
    description: ep.description,
    image: ep.coverUrl
  };
};

/**
 * Resuelve qué episodio reproducir desde la URL (episodio, serie o detailUrl).
 * Devuelve { episodio, queue, serie, queueIndex } o null.
 */
export function resolveFromUrl(pathname) {
  // /episodio/:id
  const epDirect = pathname.match(/^\/episodio\/([^\/]+)\/?$/);
  if (epDirect) {
    const ep = getEpisodioById(epDirect[1]);
    if (ep) return buildContext(ep);
  }
  // serie: pathname coincide con url_serie
  const serie = getSerieByUrl(pathname);
  if (serie) {
    const queue = getEpisodiosBySerieId(serie.seriesid);
    if (queue.length) return { episodio: queue[0], queue, queueIndex: 0, serie };
  }
  // detailUrl: /serie-url/slug
  const ep = getEpisodioByDetailUrl(pathname);
  if (ep) return buildContext(ep);
  return null;
}

function buildContext(ep) {
  const serie = ep.seriesid ? getSerieById(ep.seriesid) : null;
  const queue = serie ? getEpisodiosBySerieId(serie.seriesid) : [ep];
  const queueIndex = Math.max(0, queue.findIndex(x => x.id === ep.id));
  return { episodio: ep, queue, queueIndex, serie };
}

export function render(container, ctx) {
  const { episodio, queue, queueIndex, serie } = ctx;
  const sugeridos = recomendar(episodio, 8);

  container.innerHTML = `
    <div class="watch">
      <section class="player-stage" style="background:${escapeAttr(episodio.bgColor || '#0a0a0a')}">
        <div class="player-area" id="player-area">
          ${mediaHTML(episodio)}
          ${controlsHTML(episodio, queue.length > 1)}
        </div>
        <aside class="player-side" id="player-side">
          <div class="side-inner" id="side-inner"></div>
        </aside>
      </section>

      <div class="watch-info">
        <h1 class="watch-title">${escapeHtml(episodio.title)}</h1>
        <div class="watch-meta-row">
          <span class="watch-author">${escapeHtml(episodio.author || '')}</span>
          <span>· ${formatDate(episodio.date)}</span>
          ${episodio.categoria ? `<span>· ${escapeHtml(episodio.categoria)}</span>` : ''}
          <div class="watch-actions">
            <button id="btn-like" class="${isLiked(episodio.id) ? 'liked' : ''}">❤ <span>${isLiked(episodio.id) ? 'Te gusta' : 'Me gusta'}</span></button>
            <button id="btn-share">↗ Compartir</button>
            <button id="btn-embed">&lt;&gt; Incrustar</button>
            ${episodio.allowDownload ? `<button id="btn-download">⬇ Descargar</button>` : ''}
          </div>
        </div>
        ${episodio.description ? `<div class="watch-description">${escapeHtml(episodio.description)}</div>` : ''}
      </div>

      <div class="watch-below ${serie ? 'has-series' : ''}">
        <section>
          <h2 style="margin:0 0 14px;font-size:18px;">Te puede interesar</h2>
          <div class="suggest-grid">
            ${sugeridos.map(e => suggestCardHTML(e)).join('')}
          </div>
        </section>
        ${serie ? seriesPanelHTML(serie, queue, episodio) : ''}
      </div>
    </div>
  `;

  // Wire all interactions
  active = { episodio, container, ctx, queue, queueIndex };
  setupPlayer(container, episodio, queue, queueIndex, ctx);
  setupActions(container, episodio, ctx);

  // Suggested + series item navigation
  container.querySelectorAll('[data-ep-link]').forEach(el => {
    el.addEventListener('click', () => ctx.navigate(el.dataset.epLink));
  });

  trackView(episodio);
}

function mediaHTML(ep) {
  if (ep.hasVideo && ep.initialMode !== 'audio') {
    return `<video id="player-media" class="player-media" playsinline crossorigin="anonymous" preload="metadata"
              poster="${escapeAttr(ep.coverUrl)}"></video>`;
  }
  if (!ep.hasVideo && ep.hasAudio) {
    return `<div class="player-audio-mode">
      <img src="${escapeAttr(ep.coverUrl)}" alt="${escapeAttr(ep.title)}" />
    </div>
    <audio id="player-media" preload="metadata" crossorigin="anonymous"></audio>`;
  }
  // tiene ambos pero modo audio inicial
  return `<div class="player-audio-mode">
    <img src="${escapeAttr(ep.coverUrl)}" alt="${escapeAttr(ep.title)}" />
  </div>
  <audio id="player-media" preload="metadata" crossorigin="anonymous"></audio>`;
}

function controlsHTML(ep, hasQueue) {
  const canSwitch = ep.hasVideo && ep.hasAudio;
  return `
    <div class="player-controls" id="player-controls">
      <div class="progress-row">
        <span id="t-current">0:00</span>
        <input type="range" id="seek" min="0" max="100" step="0.1" value="0" />
        <span id="t-total">0:00</span>
      </div>
      <div class="controls-row">
        <button data-act="prev" title="Anterior" ${hasQueue ? '' : 'disabled'}>⏮</button>
        <button data-act="back10" title="-10s">⟲</button>
        <button data-act="toggle" title="Play/Pause" id="btn-toggle">▶</button>
        <button data-act="fwd10" title="+10s">⟳</button>
        <button data-act="next" title="Siguiente" ${hasQueue ? '' : 'disabled'}>⏭</button>
        <div class="volume-wrap">
          <button data-act="mute" id="btn-mute" title="Silenciar">🔊</button>
          <input type="range" id="vol" min="0" max="1" step="0.05" value="1" />
        </div>
        <div class="spacer"></div>
        ${canSwitch ? `<button data-act="switch-mode" title="Cambiar audio/video" id="btn-mode">🎬</button>` : ''}
        ${hasQueue ? `<button data-act="toggle-queue" title="Lista de episodios">☰</button>` : ''}
        <button data-act="info" title="Información">ⓘ</button>
        <div class="menu-wrap">
          <button data-act="menu" title="Opciones">⋮</button>
          <div class="menu-pop" id="menu-pop">
            <div style="padding:6px 10px;font-size:11px;color:#888;">Velocidad</div>
            <button data-rate="0.75">0.75x</button>
            <button data-rate="1">1x (normal)</button>
            <button data-rate="1.25">1.25x</button>
            <button data-rate="1.5">1.5x</button>
            <button data-rate="2">2x</button>
            ${ep.mediaCalidadbaja ? `<div style="padding:6px 10px;font-size:11px;color:#888;">Calidad</div>
              <button data-quality="alta">Alta</button>
              <button data-quality="baja">Baja</button>` : ''}
            <button data-act="subs">Subtítulos: ${ep.subtitlesUrl ? 'Disponibles' : 'No disponibles'}</button>
            <button data-act="minimize">⬇ Minimizar (PIP)</button>
            <button data-act="fullscreen">⛶ Pantalla completa</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function suggestCardHTML(ep) {
  const tipo = ep.hasVideo ? '🎬' : '🎧';
  return `<article class="ep-card" data-ep-link="${escapeAttr(ep.detailUrl)}">
    <div class="thumb" style="background-image:url('${escapeAttr(ep.coverUrl)}')">
      <span class="badge">${tipo}</span>
    </div>
    <div class="body">
      <div class="title">${escapeHtml(ep.title)}</div>
      <div class="meta">${escapeHtml(ep.author || '')}</div>
    </div>
  </article>`;
}

function seriesPanelHTML(serie, queue, currentEp) {
  return `<aside class="series-panel">
    <div class="s-cover" style="background-image:url('${escapeAttr(serie.portada_serie)}')"></div>
    <div class="s-title">${escapeHtml(serie.titulo_serie)}</div>
    <div class="s-desc">${escapeHtml(serie.descripcion_serie || '')}</div>
    <div class="series-list">
      ${queue.map((e, i) => `
        <div class="side-ep-item ${e.id === currentEp.id ? 'active' : ''}" data-ep-link="${escapeAttr(e.detailUrl)}">
          <div class="t" style="background-image:url('${escapeAttr(e.coverUrl)}')"></div>
          <div class="info"><b>${i+1}. ${escapeHtml(e.title)}</b><span>${formatDate(e.date)}</span></div>
        </div>`).join('')}
    </div>
  </aside>`;
}

// =========================================================
// Lógica del reproductor
// =========================================================
function setupPlayer(root, ep, queue, queueIndex, ctx) {
  const media = root.querySelector('#player-media');
  const area = root.querySelector('#player-area');
  const seek = root.querySelector('#seek');
  const tCur = root.querySelector('#t-current');
  const tTot = root.querySelector('#t-total');
  const btnToggle = root.querySelector('#btn-toggle');
  const btnMute = root.querySelector('#btn-mute');
  const vol = root.querySelector('#vol');
  const sideInner = root.querySelector('#side-inner');
  const side = root.querySelector('#player-side');
  const menuPop = root.querySelector('#menu-pop');

  if (!media) return;

  // Source
  const useVideo = media.tagName === 'VIDEO';
  let currentMode = useVideo ? 'video' : 'audio';
  setMediaSrc(media, ep, currentMode);

  // Subs
  if (useVideo && ep.subtitlesUrl) {
    const tr = document.createElement('track');
    tr.kind = 'subtitles'; tr.src = ep.subtitlesUrl; tr.srclang = 'es'; tr.label = 'Español'; tr.default = true;
    media.appendChild(tr);
  }

  // Restore progress
  const prog = getProgress(ep.id);
  if (prog && prog.duration && prog.progress < prog.duration - 5) {
    media.addEventListener('loadedmetadata', () => { try { media.currentTime = prog.progress; } catch {} }, { once: true });
  }

  // Autoplay con sonido (con fallback)
  media.muted = false;
  const tryPlay = () => media.play().catch(() => {
    // si falla, mostrar overlay click-to-play
    showClickToPlay(area, media);
  });
  media.addEventListener('canplay', tryPlay, { once: true });

  // Eventos
  media.addEventListener('play', () => { btnToggle.textContent = '❚❚'; updateMediaSession(ep); });
  media.addEventListener('pause', () => { btnToggle.textContent = '▶'; });
  media.addEventListener('timeupdate', () => {
    if (media.duration) {
      seek.value = (media.currentTime / media.duration) * 100;
      tCur.textContent = formatTime(media.currentTime);
      saveProgress(ep.id, media.currentTime, media.duration);
    }
  });
  media.addEventListener('loadedmetadata', () => {
    tTot.textContent = formatTime(media.duration);
  });
  media.addEventListener('ended', () => {
    if (queueIndex < queue.length - 1) {
      ctx.navigate(queue[queueIndex + 1].detailUrl);
    }
  });

  // Controles
  root.querySelectorAll('[data-act]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const act = b.dataset.act;
      if (act === 'toggle') media.paused ? media.play() : media.pause();
      else if (act === 'back10') media.currentTime = Math.max(0, media.currentTime - 10);
      else if (act === 'fwd10') media.currentTime = Math.min(media.duration||0, media.currentTime + 10);
      else if (act === 'prev' && queueIndex > 0) ctx.navigate(queue[queueIndex - 1].detailUrl);
      else if (act === 'next' && queueIndex < queue.length - 1) ctx.navigate(queue[queueIndex + 1].detailUrl);
      else if (act === 'mute') { media.muted = !media.muted; btnMute.textContent = media.muted ? '🔇' : '🔊'; }
      else if (act === 'switch-mode') {
        const newMode = currentMode === 'video' ? 'audio' : 'video';
        switchMode(area, ep, newMode, ctx);
      }
      else if (act === 'toggle-queue') toggleSidePanel(side, sideInner, 'queue', ep, queue, ctx);
      else if (act === 'info') toggleSidePanel(side, sideInner, 'info', ep, queue, ctx);
      else if (act === 'minimize') { ctx.minimizeToPip?.(ep); ctx.navigate('/'); }
      else if (act === 'fullscreen') { area.requestFullscreen?.(); }
      else if (act === 'menu') menuPop.classList.toggle('open');
      else if (act === 'subs' && ep.subtitlesUrl) {
        const tracks = media.textTracks;
        if (tracks.length) tracks[0].mode = tracks[0].mode === 'showing' ? 'hidden' : 'showing';
      }
    });
  });

  // Velocidad/calidad menú
  root.querySelectorAll('[data-rate]').forEach(b => {
    b.addEventListener('click', () => { media.playbackRate = parseFloat(b.dataset.rate); menuPop.classList.remove('open'); });
  });
  root.querySelectorAll('[data-quality]').forEach(b => {
    b.addEventListener('click', () => {
      const t = media.currentTime;
      const url = b.dataset.quality === 'baja' ? (ep.mediaCalidadbaja || ep.mediaVideo) : ep.mediaVideo;
      media.src = url;
      media.addEventListener('loadedmetadata', () => { media.currentTime = t; media.play(); }, { once: true });
      menuPop.classList.remove('open');
    });
  });

  // Seek
  seek.addEventListener('input', () => {
    if (media.duration) media.currentTime = (seek.value / 100) * media.duration;
  });
  vol.addEventListener('input', () => { media.volume = parseFloat(vol.value); media.muted = media.volume === 0; });

  // Click en video toggle
  if (useVideo) {
    media.addEventListener('click', () => media.paused ? media.play() : media.pause());
  }

  // Cerrar menú al click fuera
  document.addEventListener('click', () => menuPop?.classList.remove('open'));

  // Exponer para PIP
  ctx.registerPlayer?.({
    media, episodio: ep, queue, queueIndex,
    play: () => media.play(), pause: () => media.pause(),
    isPaused: () => media.paused,
    next: () => queueIndex < queue.length - 1 && ctx.navigate(queue[queueIndex + 1].detailUrl),
    prev: () => queueIndex > 0 && ctx.navigate(queue[queueIndex - 1].detailUrl)
  });
}

function setMediaSrc(media, ep, mode) {
  if (mode === 'video' && ep.mediaVideo) media.src = ep.mediaVideo;
  else if (ep.mediaUrl) media.src = ep.mediaUrl;
  else if (ep.mediaVideo) media.src = ep.mediaVideo;
}

function switchMode(area, ep, newMode, ctx) {
  // Re-render del area de medio
  const html = newMode === 'video'
    ? `<video id="player-media" class="player-media" playsinline crossorigin="anonymous" preload="metadata" poster="${escapeAttr(ep.coverUrl)}"></video>`
    : `<div class="player-audio-mode"><img src="${escapeAttr(ep.coverUrl)}" alt=""/></div><audio id="player-media" preload="metadata" crossorigin="anonymous"></audio>`;
  // Mantener controles
  const controls = area.querySelector('.player-controls');
  area.innerHTML = html;
  area.appendChild(controls);
  const media = area.querySelector('#player-media');
  setMediaSrc(media, ep, newMode);
  media.play().catch(() => {});
}

function toggleSidePanel(side, inner, kind, ep, queue, ctx) {
  if (side.classList.contains('open') && side.dataset.kind === kind) {
    side.classList.remove('open'); return;
  }
  side.dataset.kind = kind;
  if (kind === 'queue') {
    inner.innerHTML = `<button class="side-close" onclick="this.closest('.player-side').classList.remove('open')">✕</button>
      <h3>Lista de episodios</h3>
      <div class="side-ep-list">
        ${queue.map((e, i) => `
          <div class="side-ep-item ${e.id===ep.id?'active':''}" data-ep-link="${escapeAttr(e.detailUrl)}">
            <div class="t" style="background-image:url('${escapeAttr(e.coverUrl)}')"></div>
            <div class="info"><b>${i+1}. ${escapeHtml(e.title)}</b><span>${formatDate(e.date)}</span></div>
          </div>`).join('')}
      </div>`;
  } else {
    inner.innerHTML = `<button class="side-close" onclick="this.closest('.player-side').classList.remove('open')">✕</button>
      <h3>${escapeHtml(ep.title)}</h3>
      <p style="font-size:13px;color:#ccc;line-height:1.5;">${escapeHtml(ep.description || '')}</p>
      <div style="margin-top:12px;font-size:12px;color:#999;">
        <div>Autor: ${escapeHtml(ep.author || '—')}</div>
        <div>Fecha: ${formatDate(ep.date)}</div>
        ${ep.categoria ? `<div>Categoría: ${escapeHtml(ep.categoria)}</div>` : ''}
      </div>
      ${ep.allowDownload ? `<a href="${escapeAttr(ep.mediaVideo || ep.mediaUrl)}" download style="display:inline-block;margin-top:14px;padding:8px 14px;background:#ff2d55;color:#fff;border-radius:8px;font-size:13px;">⬇ Descargar</a>` : ''}`;
    inner.querySelectorAll('[data-ep-link]').forEach(el => {
      el.addEventListener('click', () => ctx.navigate(el.dataset.epLink));
    });
  }
  side.classList.add('open');
  inner.querySelectorAll('[data-ep-link]').forEach(el => {
    el.addEventListener('click', () => ctx.navigate(el.dataset.epLink));
  });
}

function setupActions(root, ep, ctx) {
  root.querySelector('#btn-like')?.addEventListener('click', (e) => {
    const liked = toggleLike(ep.id, ep);
    e.currentTarget.classList.toggle('liked', liked);
    e.currentTarget.querySelector('span').textContent = liked ? 'Te gusta' : 'Me gusta';
  });
  root.querySelector('#btn-share')?.addEventListener('click', async () => {
    const url = `${location.origin}${ep.detailUrl}`;
    const shareUrl = `${location.origin}/share${ep.detailUrl}`;
    if (navigator.share) {
      try { await navigator.share({ title: ep.title, text: ep.description, url }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(url); alert('Enlace copiado al portapapeles\n' + url + '\n\nPara compartir con preview enriquecido usa:\n' + shareUrl); }
    catch { prompt('Copia este enlace:', url); }
  });
  root.querySelector('#btn-embed')?.addEventListener('click', () => {
    const code = `<iframe src="${location.origin}/embed${ep.detailUrl}" width="560" height="315" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    prompt('Código de incrustación:', code);
  });
  root.querySelector('#btn-download')?.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = ep.mediaVideo || ep.mediaUrl; a.download = ep.title; a.click();
  });
}

function showClickToPlay(area, media) {
  const ov = document.createElement('div');
  ov.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.4);z-index:3;cursor:pointer;color:#fff;font-size:64px;';
  ov.textContent = '▶';
  ov.addEventListener('click', () => { media.muted = false; media.play(); ov.remove(); });
  area.appendChild(ov);
}

function updateMediaSession(ep) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: ep.title, artist: ep.author || '',
    album: ep.seriesid || '',
    artwork: [{ src: ep.coverUrl, sizes: '512x512', type: 'image/png' }]
  });
}

function formatDate(d) {
  try { return new Date(d).toLocaleDateString('es-ES', { year:'numeric', month:'short', day:'numeric' }); }
  catch { return d || ''; }
}

export function teardown() {
  active = null;
}
