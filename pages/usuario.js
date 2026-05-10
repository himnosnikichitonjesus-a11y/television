// pages/usuario.js
import { getAll, clearHistory } from '../memoria.js';
import { escapeHtml } from '../feed.js';

export const meta = { title: 'Mi cuenta — NikichitonJesús TV' };

export function render(container, ctx) {
  const data = getAll();
  const topCats = Object.entries(data.preferences.categories).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const topAuth = Object.entries(data.preferences.authors).sort((a,b)=>b[1]-a[1]).slice(0,8);

  container.innerHTML = `
    <div class="feed">
      <h1 style="padding:24px 20px 0;margin:0;">👤 Mi cuenta</h1>
      <div style="padding:0 20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:14px;">
        <div class="series-panel">
          <div class="s-title">Estadísticas</div>
          <p style="color:#bbb;font-size:14px;">${data.likes.length} me gusta · ${Object.keys(data.history).length} episodios vistos · ${data.playlists.length} listas</p>
        </div>
        <div class="series-panel">
          <div class="s-title">Categorías favoritas</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">
            ${topCats.length ? topCats.map(([c,n])=>`<span class="cat-chip">${escapeHtml(c)} · ${n}</span>`).join('') : '<span style="color:#888;">Aún sin datos.</span>'}
          </div>
        </div>
        <div class="series-panel">
          <div class="s-title">Autores favoritos</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">
            ${topAuth.length ? topAuth.map(([c,n])=>`<span class="cat-chip">${escapeHtml(c)} · ${n}</span>`).join('') : '<span style="color:#888;">Aún sin datos.</span>'}
          </div>
        </div>
        <div class="series-panel">
          <div class="s-title">Privacidad</div>
          <p style="color:#bbb;font-size:13px;">Toda tu actividad se guarda localmente en este navegador.</p>
          <button id="btn-clear" style="background:#ff2d55;color:#fff;border:0;padding:8px 14px;border-radius:8px;cursor:pointer;">Borrar historial</button>
        </div>
      </div>
    </div>`;
  container.querySelector('#btn-clear').addEventListener('click', () => {
    if (confirm('¿Borrar todo el historial de reproducción?')) { clearHistory(); ctx.navigate('/usuario'); }
  });
}
