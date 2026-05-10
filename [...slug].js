// /api/share/[...slug].js — Vercel Serverless Function
// Devuelve HTML con meta tags OpenGraph para que las redes sociales
// muestren título, descripción e imagen del episodio/serie.
// Cuando un humano abre la página, el script al final redirige al SPA.

import { episodios, series } from '../../episodios.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function findContent(pathname) {
  // /share/<resto>  -> resto = detailUrl o /episodio/:id o url_serie
  const inner = '/' + (pathname || '').split('/').filter(Boolean).join('/');

  // /episodio/:id
  const m = inner.match(/^\/episodio\/([^\/]+)\/?$/);
  if (m) {
    const ep = episodios.find(e => e.id === m[1]);
    if (ep) return { type: 'episode', ep };
  }
  // serie
  const s = series.find(x => x.url_serie === inner.replace(/\/$/, ''));
  if (s) return { type: 'series', s };
  // detailUrl
  const ep = episodios.find(e => e.detailUrl === inner.replace(/\/$/, ''));
  if (ep) return { type: 'episode', ep };
  return null;
}

export default function handler(req, res) {
  const slug = (req.query.slug || []).join('/');
  const inner = '/' + slug;
  const found = findContent(inner);

  const origin = `https://${req.headers.host}`;
  const canonical = origin + (found?.type === 'series' ? found.s.url_serie : found?.ep?.detailUrl || '/');

  let title, description, image;
  if (found?.type === 'episode') {
    title = `${found.ep.title} — NikichitonJesús TV`;
    description = found.ep.description || '';
    image = found.ep.coverUrl || '';
  } else if (found?.type === 'series') {
    title = `${found.s.titulo_serie} — NikichitonJesús TV`;
    description = found.s.descripcion_serie || '';
    image = found.s.portada_serie || '';
  } else {
    title = 'NikichitonJesús TV';
    description = 'Reproductor de audio y video.';
    image = '';
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${escapeHtml(canonical)}" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:type" content="${found?.type === 'episode' ? 'video.other' : 'website'}" />
<meta property="og:url" content="${escapeHtml(canonical)}" />
${image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : ''}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
${image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : ''}
<meta http-equiv="refresh" content="0; url=${escapeHtml(canonical)}" />
<script>
  // Si es un humano (no bot), redirigimos al SPA en la URL canónica
  if (!/bot|crawler|spider|facebookexternalhit|whatsapp|twitterbot|telegram|slack/i.test(navigator.userAgent)) {
    location.replace(${JSON.stringify(canonical)});
  }
</script>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(description)}</p>
${image ? `<img src="${escapeHtml(image)}" alt="" style="max-width:600px;" />` : ''}
<p><a href="${escapeHtml(canonical)}">Abrir en NikichitonJesús TV →</a></p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
  res.status(200).send(html);
}
