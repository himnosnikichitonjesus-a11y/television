// api/sitemap.js 
export default async function handler(req, res) {
  try {
    // Importación dinámica (funciona igual con los nuevos episodios.js)
    const { episodios, series } = await import('./episodios.js');

    const BASE_URL = 'https://tv.nikichitonjesus.org';

    // Páginas estáticas con sus fechas de última modificación (puedes dejarlas fijas o calcularlas)
    const staticPages = [
      { url: '/', priority: 1.0, changefreq: 'daily', lastmod: new Date().toISOString().split('T')[0] },
      { url: '/biblioteca', priority: 0.8, changefreq: 'weekly', lastmod: new Date().toISOString().split('T')[0] },
      { url: '/novedades', priority: 0.9, changefreq: 'daily', lastmod: new Date().toISOString().split('T')[0] },
    ];

    // Series: obtener URL y usar la fecha del episodio más reciente como lastmod
    const seriesWithDate = series.map(serie => {
      const episodiosDeLaSerie = episodios.filter(ep => ep.seriesid === serie.seriesid);
      const latestDate = episodiosDeLaSerie.length
        ? new Date(Math.max(...episodiosDeLaSerie.map(ep => new Date(ep.date))))
        : new Date();
      return {
        url: serie.url_serie,
        lastmod: latestDate.toISOString().split('T')[0]
      };
    });

    // Episodios: ordenar por fecha descendente (más nuevos primero) y eliminar duplicados por detailUrl
    const episodiosUnicos = Array.from(
      new Map(episodios.map(ep => [ep.detailUrl, ep])).values()
    );
    const episodiosOrdenados = episodiosUnicos.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Generar XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${staticPages.map(page => `
          <url>
            <loc>${BASE_URL}${page.url}</loc>
            <priority>${page.priority}</priority>
            <changefreq>${page.changefreq}</changefreq>
            <lastmod>${page.lastmod}</lastmod>
          </url>
        `).join('')}
        ${seriesWithDate.map(serie => `
          <url>
            <loc>${BASE_URL}${serie.url}</loc>
            <priority>0.7</priority>
            <changefreq>weekly</changefreq>
            <lastmod>${serie.lastmod}</lastmod>
          </url>
        `).join('')}
        ${episodiosOrdenados.map(ep => `
          <url>
            <loc>${BASE_URL}${ep.detailUrl}</loc>
            <priority>0.8</priority>
            <changefreq>monthly</changefreq>
            <lastmod>${new Date(ep.date).toISOString().split('T')[0]}</lastmod>
          </url>
        `).join('')}
      </urlset>
    `;

    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(sitemap);
  } catch (error) {
    console.error('Error generando sitemap:', error);
    res.status(500).send('Error interno del servidor');
  }
}
