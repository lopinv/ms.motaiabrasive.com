// 内链密度统计：每页本地 <a href> 数量分布（不请求，仅统计）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const htmlFiles = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) htmlFiles.push(p);
  }
})(dist);

const per = [];
let total = 0;
for (const page of htmlFiles) {
  const html = fs.readFileSync(page, 'utf8');
  const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((m) => m[1]).filter((h) => h.startsWith('/'));
  total += links.length;
  per.push([path.relative(dist, page).replace(/\\/g, '/'), links.length]);
}
per.sort((a, b) => a[1] - b[1]);
console.log('总本地内链数(含重复):', total, '| 页面数:', htmlFiles.length);
console.log('极少链页(≤8):', JSON.stringify(per.filter((p) => p[1] <= 8)));
console.log('最密 5 页:', JSON.stringify(per.slice(-5)));