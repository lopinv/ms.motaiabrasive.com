import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://ms.motaiabrasive.com',
  trailingSlash: 'never',
  build: {
    format: 'directory',
  },
  // 冗余/低质文章已在生成期直接删除（不用 noindex），sitemap 全量收录 3000 篇
  integrations: [mdx(), sitemap({
    changefreq: 'weekly',
    priority: 0.7,
    lastmod: new Date(),
  })],
});
