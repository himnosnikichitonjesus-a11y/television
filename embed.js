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
  // pathname empieza con /embed
  const inner = pathname.replace(/^\/embed/, '') || '/';
  return resolveFromUrl(inner);
}

export function render(container, ctx) {
  document.body.classList.add('embed-mode');
  // Añadir estilos específicos para embed (opcional)
  if (!document.getElementById('embed-styles')) {
    const style = document.createElement('style');
    style.id = 'embed-styles';
    style.textContent = `
      body.embed-mode {
        background: #000;
        margin: 0;
        overflow: hidden;
        height: 100vh;
      }
      body.embed-mode .watch {
        height: 100vh;
        display: flex;
        flex-direction: column;
      }
      body.embed-mode .player-stage {
        flex: 1;
        min-height: 0;
      }
      body.embed-mode .embed-header {
        position: absolute;
        top: 20px;
        left: 20px;
        z-index: 30;
        display: flex;
        align-items: center;
        gap: 12px;
        background: rgba(0,0,0,0.6);
        padding: 8px 16px;
        border-radius: 40px;
        backdrop-filter: blur(8px);
        pointer-events: none;
        transition: opacity 0.3s;
      }
      body.embed-mode .embed-header.visible {
        opacity: 1;
      }
      body.embed-mode .embed-header:not(.visible) {
        opacity: 0;
      }
      body.embed-mode .embed-logo {
        height: 32px;
        width: auto;
      }
      body.embed-mode .embed-title {
        color: white;
        font-size: 1rem;
        font-weight: 500;
        text-shadow: 0 1px 2px black;
      }
      body.embed-mode .player-controls {
        transition: opacity 0.3s, transform 0.2s;
      }
      body.embed-mode .player-controls.visible,
      body.embed-mode .center-controls.visible {
        opacity: 1;
        transform: translateY(0);
      }
      body.embed-mode .player-controls:not(.visible),
      body.embed-mode .center-controls:not(.visible) {
        opacity: 0;
        pointer-events: none;
        transform: translateY(20px);
      }
      body.embed-mode .center-controls {
        position: absolute;
        bottom: 50%;
        left: 50%;
        transform: translate(-50%, 50%);
        display: flex;
        gap: 24px;
        background: rgba(0,0,0,0.7);
        padding: 12px 24px;
        border-radius: 60px;
        backdrop-filter: blur(12px);
        z-index: 20;
        transition: opacity 0.3s, transform 0.2s;
      }
      body.embed-mode .ctrl-center {
        background: none;
        border: none;
        color: white;
        width: 48px;
        height: 48px;
        cursor: pointer;
        transition: transform 0.1s;
      }
      body.embed-mode .ctrl-center.main {
        width: 64px;
        height: 64px;
      }
      body.embed-mode .ctrl-center:hover {
        transform: scale(1.05);
      }
      body.embed-mode .ctrl-center svg {
        width: 100%;
        height: 100%;
      }
      body.embed-mode .player-area {
        background: var(--stage-bg, #000);
      }
      body.embed-mode .media-host {
        background: var(--stage-bg, #000);
      }
    `;
    document.head.appendChild(style);
  }
  renderWatch(container, ctx);
}

export function teardown() {
  document.body.classList.remove('embed-mode');
  watchTeardown();
}
