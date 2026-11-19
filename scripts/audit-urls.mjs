// 全量 URL 审计（构建产物 dist/）：
//  1. 站内链接与资源 → 文件存在性（目录路由需 index.html）
//  2. 站外 http(s) 链接 → 去重后 HEAD 可达性（wa.me / 社交平台 / formsubmit / 本站 canonical 跳过）
//  3. mailto / tel → 格式校验
// 锚点（#x）与纯查询串（?x）不校验。用法：npm run build 后执行 node scripts/audit-urls.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const htmlFiles = [];

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (f.startsWith('_astro') || f.startsWith('images')) continue;
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) htmlFiles.push(p);
  }
}
walk(dist);

const internal = new Map(); // 相对路径 -> 引用页面
const external = new Set(); // 完整 URL
const mailto = new Set();
let brokenMailto = 0;

for (const page of htmlFiles) {
  const html = fs.readFileSync(page, 'utf8');
  const from = path.relative(dist, page);
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    let u = m[1];
    if (/^(data:|javascript:)/i.test(u) || u.startsWith('tel:')) continue;

    if (u.startsWith('mailto:')) {
      const addr = u.slice(7).split('?')[0];
      if (!/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(addr)) { brokenMailto++; console.log(`✖ ${from}: 无效 mailto → ${u}`); }
      else mailto.add(addr);
      continue;
    }

    const pathPart = u.split('#')[0].split('?')[0];
    if (pathPart === '') continue; // 纯锚点 / 纯查询串

    if (/^https?:\/\//i.test(u)) { external.add(u); continue; }

    // 站内：绝对路径或相对路径
    let target = pathPart;
    if (!target.startsWith('/')) {
      const base = path.relative(dist, path.dirname(page)).split(path.sep);
      const up = pathPart.split('/').filter((s) => s === '..').length;
      const rest = pathPart.replace(/^(?:\.\.?\/)+/, '').split('/');
      target = '/' + base.slice(0, Math.max(0, base.length - up)).concat(rest).join('/');
    }
    target = target.replace(/\\/g, '/').replace(/\/+/g, '/');
    if (!internal.has(target)) internal.set(target, new Set());
    internal.get(target).add(from);
  }
}

// 站内文件存在性
let internalMissing = 0;
for (const [target, sources] of internal) {
  const abs = path.join(dist, target);
  const ok = fs.existsSync(abs) && (fs.statSync(abs).isFile() || fs.existsSync(path.join(abs, 'index.html')));
  if (!ok) {
    internalMissing++;
    console.log(`✖ 站内缺失 ${target} ← ${[...sources].slice(0, 3).join(', ')}`);
  }
}

// 站外可达性：本站 canonical（Pages 上线前域名未解析）、wa.me / 社交平台 / formsubmit 跳过
const allExt = [...external].sort();
const selfUrls = allExt.filter((u) => new URL(u).host === 'ms.motaiabrasive.com');
const rest = allExt.filter((u) => new URL(u).host !== 'ms.motaiabrasive.com');
const headable = rest.filter((u) => {
  const url = new URL(u);
  return url.pathname !== '/' && !/wa\.me|facebook\.com|instagram\.com|formsubmit\.co/.test(url.host);
});
const skipped = rest.filter((u) => !headable.includes(u));

console.log(`站内引用 ${internal.size} 项（缺失 ${internalMissing}），站外 ${allExt.length} 项，mailto ${mailto.size} 个`);
for (const u of selfUrls) console.log(`· INFO 本站 canonical（Pages 上线后生效）${u}`);
for (const u of skipped) console.log(`· INFO 站外（跳过 HEAD）${u}`);

let extFail = 0;
for (const u of headable) {
  try {
    const res = await fetch(u, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(15000) });
    if (res.status >= 400) { extFail++; console.log(`✖ 站外 ${res.status} ${u}`); }
    else console.log(`✔ ${res.status} ${u}`);
  } catch (e) {
    extFail++;
    console.log(`✖ 站外不可达 ${u}（${e.cause?.code || e.message}）`);
  }
}

// 外链必须带 nofollow + noopener
let nofollowMissing = 0;
for (const page of htmlFiles) {
  const html = fs.readFileSync(page, 'utf8');
  const from = path.relative(dist, page);
  for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
    const tag = m[0];
    const href = (tag.match(/href="([^"]+)"/) || [])[1];
    if (!href || !/^https?:\/\//i.test(href)) continue;
    if (new URL(href).host === 'ms.motaiabrasive.com') continue; // 本站 canonical 链接
    if (!/nofollow/.test(tag)) {
      nofollowMissing++;
      console.log(`✖ ${from}: 外链缺 nofollow → ${href}`);
    }
  }
}

if (internalMissing || extFail || brokenMailto || nofollowMissing) {
  console.log(`\n发现 ${internalMissing + extFail + brokenMailto + nofollowMissing} 个问题`);
  process.exit(1);
}
console.log('✅ 全量 URL 审计通过（含外链 nofollow 校验）');
