// 构建产物本地资源 200 检查：扫描 dist/*.html 中所有 href/src，
// 校验本地图片、样式、脚本、路由页面文件真实存在（模拟浏览器加载 200）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const htmlFiles = [];

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (f.startsWith('_astro') || f.startsWith('images')) continue;
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    if (p.endsWith('.html')) htmlFiles.push(p);
  }
}

walk(dist);

// 页面目录深度：dist 下 0，dist/x/ 下 1
const depth = (p) => path.relative(dist, path.dirname(p)).split(path.sep).filter(Boolean).length;

const refs = new Map(); // 解析后路径 -> 引用该路径的页面集合
for (const page of htmlFiles) {
  const html = fs.readFileSync(page, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    let u = m[1];
    if (/^(https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(u) || u.startsWith('#')) continue;
    u = u.split(/[?#]/)[0];
    if (!u) continue;
    // 计算相对于 dist 的实际路径（处理 ../ 与绝对 / 路径）
    let target;
    if (u.startsWith('/')) target = u.slice(1);
    else {
      const up = u.split('..').length - 1;
      const rest = u.replace(/^(?:\.\.?\/)+/, '');
      const base = path.relative(dist, path.dirname(page)).split(path.sep);
      target = base.slice(0, Math.max(0, base.length - up)).concat(rest.split('/')).join('/');
    }
    target = target.replace(/\\/g, '/').replace(/\/+/g, '/');
    if (!refs.has(target)) refs.set(target, new Set());
    refs.get(target).add(path.relative(dist, page));
  }
}

// 判定目标是否可解析为真实文件（目录则需有 index.html）
const missing = [];
for (const [target, sources] of refs) {
  const abs = path.join(dist, target);
  let ok = false;
  if (fs.existsSync(abs)) {
    const st = fs.statSync(abs);
    ok = st.isFile() || fs.existsSync(path.join(abs, 'index.html'));
  }
  if (!ok) missing.push({ target: '/' + target, from: [...sources].slice(0, 3) });
}

console.log(`检查页面：${htmlFiles.length}`);
console.log(`本地资源引用：${refs.size}`);
if (missing.length === 0) {
  console.log('✅ 全部本地链接与图片资源均可解析（200），无 404');
} else {
  for (const { target, from } of missing) {
    console.log(`⚠️ 缺失 ${target} ← ${from.join(', ')}`);
  }
  process.exit(1);
}
