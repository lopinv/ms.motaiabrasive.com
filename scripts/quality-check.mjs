import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const origin = 'https://ms.motaiabrasive.com';
const errors = [];
const warnings = [];

const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

async function listHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listHtmlFiles(fullPath)));
    else if (entry.name.endsWith('.html')) files.push(fullPath);
  }

  return files;
}

const routeFromFile = (file) => {
  const relative = path.relative(distDir, file).replace(/\\/g, '/');
  const withoutIndex = relative.replace(/index\.html$/, '');
  return '/' + withoutIndex.replace(/\/$/, '');
};

const normalizeRoute = (href) => {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean || clean === '/') return '/';
  return clean.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
};

const extract = (html, pattern) => [...html.matchAll(pattern)].map((match) => match[1]);

const textLength = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;

if (!existsSync(distDir)) {
  console.error('未找到 dist 目录，请先运行 npm run build');
  process.exit(1);
}

const htmlFiles = await listHtmlFiles(distDir);
const routes = new Map(
  htmlFiles
    .filter((file) => !file.endsWith('404.html'))
    .map((file) => [routeFromFile(file), file]),
);
const metadata = new Map();
const inboundLinks = new Map([...routes.keys()].map((route) => [route, new Set()]));
let linkCount = 0;

for (const [route, file] of routes) {
  const html = await readFile(file, 'utf8');
  const title = extract(html, /<title>([^<]*)<\/title>/gi)[0]?.trim() ?? '';
  const description = extract(html, /<meta\s+name="description"\s+content="([^"]*)"/gi)[0]?.trim() ?? '';
  const canonical = extract(html, /<link\s+rel="canonical"\s+href="([^"]*)"/gi)[0]?.trim() ?? '';
  const h1s = extract(html, /<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/gi).map((value) =>
    value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
  );
  const ogTitle = extract(html, /<meta\s+property="og:title"\s+content="([^"]*)"/gi)[0] ?? '';
  const ogDescription = extract(html, /<meta\s+property="og:description"\s+content="([^"]*)"/gi)[0] ?? '';
  const ogImage = extract(html, /<meta\s+property="og:image"\s+content="([^"]*)"/gi)[0] ?? '';
  const robots = extract(html, /<meta\s+name="robots"\s+content="([^"]*)"/gi)[0] ?? '';
  const jsonLdBlocks = extract(html, /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
  const imagesWithoutAlt = [...html.matchAll(/<img\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter((tag) => !/\balt="[^"]*"/i.test(tag));
  const links = extract(html, /<a\b[^>]*href="([^"]*)"/gi);
  const assets = [
    ...extract(html, /<script\b[^>]*src="([^"]*)"/gi),
    ...extract(html, /<link\b[^>]*rel="stylesheet"[^>]*href="([^"]*)"/gi),
  ];
  const visibleTextLength = textLength(html);

  metadata.set(route, { title, description, canonical, h1s, jsonLdBlocks, textLength: visibleTextLength });

  if (!title) fail(`${route}: 缺少 title`);
  if (title.length > 70) warn(`${route}: title 超过 70 字符（${title.length}）`);
  if (!description) fail(`${route}: 缺少 meta description`);
  if (description.length < 90 || description.length > 175) {
    warn(`${route}: description 长度 ${description.length}，建议 90–175 字符`);
  }
  if (h1s.length !== 1) fail(`${route}: H1 数量应为 1，实际 ${h1s.length}`);
  if (!canonical) fail(`${route}: 缺少 canonical`);
  else if (normalizeRoute(new URL(canonical).pathname) !== normalizeRoute(route)) {
    fail(`${route}: canonical 指向 ${canonical}`);
  }
  if (!ogTitle || !ogDescription || !ogImage) fail(`${route}: OGP 元数据不完整`);
  if (!robots.includes('index')) warn(`${route}: robots 未声明 index`);
  if (!jsonLdBlocks.length) fail(`${route}: 缺少 JSON-LD`);

  // AEO/富摘要一致性：页面出现可见 FAQ 时，必须配套 FAQPage 结构化数据
  const hasVisibleFaq = /<details[^>]*class="faq-item"/i.test(html);
  const hasFaqPage = jsonLdBlocks.some((block) => /"FAQPage"/.test(block));
  if (hasVisibleFaq && !hasFaqPage) fail(`${route}: 存在可见 FAQ 但缺少 FAQPage JSON-LD`);

  for (const block of jsonLdBlocks) {
    try {
      const parsed = JSON.parse(block);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      if (!nodes.every((node) => node['@context'] || node['@type'])) {
        fail(`${route}: JSON-LD 节点缺少 @context 或 @type`);
      }
    } catch {
      fail(`${route}: JSON-LD 无法解析`);
    }
  }

  if (imagesWithoutAlt.length) fail(`${route}: ${imagesWithoutAlt.length} 个 img 缺少 alt`);
  if (visibleTextLength < 900) warn(`${route}: 可见文本约 ${visibleTextLength} 字符，需复核是否为薄内容`);

  for (const href of [...links, ...assets]) {
    linkCount += 1;
    if (!href.startsWith('/') || href.startsWith('//')) continue;

    const target = normalizeRoute(href);
    if (target.startsWith('/_astro') || target.startsWith('/images') || target === '/favicon.svg') continue;
    if (target === '/sitemap-index.xml' || target === '/robots.txt') continue;

    if (!routes.has(target)) {
      fail(`${route}: 内部链接不存在 → ${href}`);
      continue;
    }

    if (target !== route) inboundLinks.get(target).add(route);
  }
}

const titles = new Map();
const descriptions = new Map();
for (const [route, data] of metadata) {
  titles.set(data.title, [...(titles.get(data.title) ?? []), route]);
  descriptions.set(data.description, [...(descriptions.get(data.description) ?? []), route]);
}
for (const [title, duplicateRoutes] of titles) {
  if (duplicateRoutes.length > 1) fail(`title 重复: ${title} → ${duplicateRoutes.join(', ')}`);
}
for (const [, duplicateRoutes] of descriptions) {
  if (duplicateRoutes.length > 1) fail(`description 重复 → ${duplicateRoutes.join(', ')}`);
}

for (const [route, sources] of inboundLinks) {
  if (route === '/') continue;
  if (!sources.size) fail(`${route}: 孤岛页面，没有任何站内入链`);
}

const sitemapPath = path.join(distDir, 'sitemap-0.xml');
if (!existsSync(sitemapPath)) {
  fail('缺少 sitemap-0.xml');
} else {
  const sitemap = await readFile(sitemapPath, 'utf8');
  for (const route of routes.keys()) {
    const expected = route === '/' ? `${origin}/` : `${origin}${route}`;
    if (!sitemap.includes(expected)) fail(`sitemap 缺少 ${expected}`);
  }
}

/* 马来语（拉丁字母）站点语言污染：构建产物中不应出现阿拉伯文、天城文、泰文或 CJK 字符 */
for (const [route, file] of routes) {
  const html = await readFile(file, 'utf8');
  const foreign = html.match(/[\u0600-\u06ff\u0900-\u097f\u0e00-\u0e7f\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g);
  if (foreign) fail(`${route}: 出现非拉丁字母字符污染 → ${foreign.slice(0, 3).join(', ')}`);
}

console.log(`检查页面：${routes.size}`);
console.log(`检查链接：${linkCount}`);
console.log(`警告：${warnings.length}`);

for (const message of warnings) console.warn(`⚠ ${message}`);

if (errors.length) {
  console.error(`\n发现 ${errors.length} 个阻断问题：`);
  for (const message of errors) console.error(`✖ ${message}`);
  process.exit(1);
}

console.log('✅ SEO、内容厚度、内链和 sitemap 检查通过');
