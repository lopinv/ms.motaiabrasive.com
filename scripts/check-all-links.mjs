// 全量内链 200 检查：从 dist 每个 HTML 提取本地 href/src，去重后逐一真实 HTTP GET 验证。
// 用法：确保 astro preview 在 127.0.0.1:4321 运行，然后 node scripts/check-all-links.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const BASE = 'http://127.0.0.1:4321';
const htmlFiles = [];

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) htmlFiles.push(p);
  }
}
walk(dist);

// 收集所有本地引用（含相对/绝对/锚点剥离），记录来源页
const refs = new Map();
for (const page of htmlFiles) {
  const html = fs.readFileSync(page, 'utf8');
  const from = path.relative(dist, page).replace(/\\/g, '/');
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    let u = m[1];
    if (/^(https?:|mailto:|tel:|data:|javascript:)/i.test(u) || u.startsWith('//')) continue;
    const clean = u.split('#')[0].split('?')[0];
    if (!clean) continue;
    let target;
    if (clean.startsWith('/')) target = clean.slice(1);
    else {
      const base = path.relative(dist, path.dirname(page)).split(path.sep);
      const up = clean.split('/').filter((s) => s === '..').length;
      const rest = clean.replace(/^(?:\.\.?\/)+/, '').split('/');
      target = base.slice(0, Math.max(0, base.length - up)).concat(rest).join('/');
    }
    target = '/' + target.replace(/\\/g, '/').replace(/\/+/g, '/');
    if (!refs.has(target)) refs.set(target, new Set());
    refs.get(target).add(from);
  }
}

// 逐一真实 HTTP GET
let ok = 0;
const failed = [];
let n = 0;
for (const [target, sources] of refs) {
  n++;
  const url = BASE + target;
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(15000) });
    if (res.status === 200) ok++;
    else failed.push({ target, status: res.status, from: [...sources].slice(0, 2) });
  } catch (e) {
    failed.push({ target, status: e.cause?.code || e.message, from: [...sources].slice(0, 2) });
  }
}

console.log(`检查 ${htmlFiles.length} 个页面，提取 ${refs.size} 个唯一本地 URL，实际请求 ${n} 个`);
console.log(`✅ 200: ${ok}`);
if (failed.length) {
  console.log(`✖ 非 200: ${failed.length}`);
  for (const f of failed) console.log(`   ${f.target} → ${f.status} ← ${f.from.join(', ')}`);
  process.exit(1);
}
console.log('✅ 全部内链与本地资源均返回真实 200');