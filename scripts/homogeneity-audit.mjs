// 文章同质化体检（只读，不写盘）
// 用法：
//   node scripts/homogeneity-audit.mjs           完整报告
//   node scripts/homogeneity-audit.mjs --gate    门禁模式：对全部文章判定，超限则 exit 1
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

const GATE_MODE = process.argv.includes('--gate');
// 门禁阈值（全量文章可索引：冗余国家版/变体已在生成期直接删除，不再用 noindex）
const GATE = {
  // 同 cell(model|cat|ind|country) 内两篇 Jaccard 上限：超过即近似复制 → 阻断
  JaccardMax: 0.90,
  // 预警下限：同 cell 内落在 (0.60, 0.90] 的对数用于提示（不阻断）
  JaccardWarnLow: 0.60,
};

const dir = path.resolve('src/content/articles');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mdx'));

function frontmatterOf(text) {
  const lines = text.split('\n');
  if (lines[0].trim() !== '---') return null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') return lines.slice(1, i).join('\n');
  }
  return null;
}

// 正文文本（去 HTML 标签与标点空白，保留阿语/英语文本用于相似度计算）
function bodyText(text) {
  const body = text.split('---', 3).slice(2).join('---');
  // 去 HTML 标签 + 去标点/特殊符号（字符类以 ] 开头免转义；| 在类内是字面量）
  const punct = /[]{}[\]&|;:=,.<>!?"'`~\\-–—/]/g;
  return body.replace(/<[^>]+>/g, ' ').replace(punct, ' ').replace(/\s+/g, ' ').trim();
}
// 6-gram 集合（词级），用于 Jaccard 相似度
function shingles(s) {
  const ws = s.split(' ');
  const set = new Set();
  for (let i = 0; i + 6 <= ws.length; i++) set.add(ws.slice(i, i + 6).join('|'));
  return set;
}

const rows = [];
let yamlFail = 0;
for (const f of files) {
  // 源文件为 CRLF 换行；yaml 解析器对行尾 \r 敏感（报 "Unexpected scalar at node end"），
  // 读入即归一化 CRLF→LF，保证 3000 篇 frontmatter 都能被审计
  const text = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n');
  let fm = null;
  try {
    const raw = frontmatterOf(text);
    if (raw === null) { yamlFail++; continue; }
    fm = parse(raw);
  } catch { yamlFail++; continue; }
  rows.push({
    file: f,
    slug: f.replace(/\.mdx$/, ''),
    title: fm.title || '',
    desc: fm.description || '',
    category: fm.category || '',
    model: fm.productModel || '',
    industry: fm.industry || '',
    country: fm.gccCountry || '',
    dedupeKey: (fm.notes || '').match(/DedupeKey:\s*([\w|-]+)/)?.[1] || '',
    noindex: fm.noindex === true,
    body: bodyText(text),
  });
}

const n = rows.length;
console.log(`文章总数: ${files.length} (有效解析 ${n}, YAML 失败 ${yamlFail})`);

// ---- 分布矩阵 ----
function dist(key) {
  const m = new Map();
  for (const r of rows) m.set(r[key], (m.get(r[key]) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
console.log('\n=== 分布 ===');
for (const key of ['model', 'industry', 'country', 'category']) {
  const d = dist(key);
  console.log(`${key} (${d.length} 种): ${d.map(([k, v]) => `${k}=${v}`).join(', ')}`);
}

// ---- 同质化指标 ----
// 1) 完全重复标题
const byTitle = new Map();
for (const r of rows) byTitle.set(r.title, (byTitle.get(r.title) || 0) + 1);
const dupTitles = [...byTitle.entries()].filter(([, c]) => c > 1);
console.log('\n=== 标题同质化 ===');
console.log(`唯一标题: ${byTitle.size} / ${n}`);
console.log(`完全重复标题组: ${dupTitles.length} 组, 涉及 ${dupTitles.reduce((s, [, c]) => s + c, 0)} 篇`);
dupTitles.slice(0, 5).forEach(([t, c]) => console.log(`  ×${c}  ${t.slice(0, 70)}`));

// 2) 去国家/产品词后的"骨架标题"重复度（模板痕迹）
function skeletonTitle(t) {
  return t
    .replace(/[0-9]+\s*×\s*[0-9]+\s*(mm|inci|inch)/gi, 'SIZE')
    .replace(/untuk\s+[^\s:]{2,40}/g, 'X') // "untuk ..." 尾巴（马来语）
    .replace(/bagi\s+[^\s:]{2,40}/g, 'X') // "bagi ..." 尾巴（马来语变体）
    .trim();
}
const bySkel = new Map();
for (const r of rows) bySkel.set(skeletonTitle(r.title), (bySkel.get(skeletonTitle(r.title)) || 0) + 1);
const skelGroups = [...bySkel.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);
console.log(`\n标题骨架(去型号/行业后)唯一: ${bySkel.size}; 重复骨架组: ${skelGroups.length}`);
skelGroups.slice(0, 8).forEach(([s, c]) => console.log(`  ×${c}  ${s.slice(0, 70)}`));

// 3) 完全重复描述
const byDesc = new Map();
for (const r of rows) byDesc.set(r.desc, (byDesc.get(r.desc) || 0) + 1);
const dupDescs = [...byDesc.entries()].filter(([, c]) => c > 1);
console.log(`\n=== 描述同质化 ===`);
console.log(`唯一描述: ${byDesc.size} / ${n}; 完全重复描述组: ${dupDescs.length} (涉及 ${dupDescs.reduce((s, [, c]) => s + c, 0)} 篇)`);

// 4) DedupeKey 重复（生成器声称的去重键）
const byKey = new Map();
for (const r of rows) if (r.dedupeKey) byKey.set(r.dedupeKey, (byKey.get(r.dedupeKey) || 0) + 1);
const dupKeys = [...byKey.entries()].filter(([, c]) => c > 1);
console.log(`\n=== DedupeKey ===`);
console.log(`唯一 key: ${byKey.size} / ${n}; 重复 key: ${dupKeys.length} 组`);
dupKeys.slice(0, 5).forEach(([k, c]) => console.log(`  ×${c}  ${k}`));

// 5) 正文 6-gram Jaccard：同 (model,category,industry) 组内两两 + 抽样跨组
console.log('\n=== 正文相似度 (6-gram Jaccard) ===');
const cells = new Map();
for (const r of rows) {
  const c = `${r.model}|${r.category}|${r.industry}`;
  if (!cells.has(c)) cells.set(c, []);
  cells.get(c).push(r);
}
let sampled = 0;
const simSamples = [];
const shingleCache = new Map();
function shOf(r) {
  if (!shingleCache.has(r.file)) shingleCache.set(r.file, shingles(r.body));
  return shingleCache.get(r.file);
}
function jaccard(a, b) {
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  let inter = 0;
  for (const g of small) if (big.has(g)) inter++;
  return inter / (a.size + b.size - inter || 1);
}
// 组内：每个 ≥2 篇的组取前 2 篇比较
for (const [cell, rs] of cells) {
  if (rs.length >= 2 && sampled < 400) {
    sampled++;
    const j = jaccard(shOf(rs[0]), shOf(rs[1]));
    simSamples.push(j);
    if (j > 0.4) console.log(`  HIGH  ${cell} (${rs.length}篇): ${rs[0].file} ≈ ${rs[1].file}  J=${j.toFixed(3)}`);
  }
}
simSamples.sort((a, b) => b - a);
const avg = simSamples.length ? simSamples.reduce((s, v) => s + v, 0) / simSamples.length : 0;
console.log(`抽样 ${simSamples.length} 对同组文章: 平均 Jaccard=${avg.toFixed(3)}, 最高=${simSamples[0] ?? 0}, >0.4 有 ${simSamples.filter((v) => v > 0.4).length} 对`);

// 跨组抽样：不同 model 相同 category 的文章
const cross = [];
const catGroups = [...cells.entries()].filter(([, rs]) => rs.length > 0);
let crossSampled = 0;
for (let i = 0; i < catGroups.length && crossSampled < 100; i += Math.max(1, Math.floor(catGroups.length / 100))) {
  const [cellA, rsA] = catGroups[i];
  const cellB = cellA.replace(/^([^|]+)\|/, m => m === cellA ? '' : m).split('|');
  // 找一个不同 model 但同 category 的组
  const other = catGroups.find(([c, rs2]) => c !== cellA && c.split('|')[1] === cellA.split('|')[1] && c.split('|')[0] !== cellA.split('|')[0]);
  if (other) { crossSampled++; const j = jaccard(shOf(rsA[0]), shOf(other[1][0])); if (j > 0.5) cross.push([cellA, other[0], j]); }
}
console.log(`跨型号抽样 >0.5 的组对: ${cross.length}`);
cross.slice(0, 5).forEach(([a, b, j]) => console.log(`  ${a} ↔ ${b} J=${j.toFixed(3)}`));

// 6) 正文长度（厚度）
const lens = rows.map((r) => r.body.length).sort((a, b) => a - b);
console.log(`\n=== 正文长度(字符) ===`);
console.log(`p5=${lens[Math.floor(n * 0.05)]}, p25=${lens[Math.floor(n * 0.25)]}, 中位=${lens[Math.floor(n / 2)]}, p75=${lens[Math.floor(n * 0.75)]}, p95=${lens[Math.floor(n * 0.95)]}`);
console.log(`<800 字符(疑似空薄页): ${lens.filter((l) => l < 800).length} 篇`);

// 7) 文件级完全重复（正文全文相同）
const byBody = new Map();
for (const r of rows) byBody.set(r.body, (byBody.get(r.body) || 0) + 1);
const exactBodies = [...byBody.entries()].filter(([, c]) => c > 1);
console.log(`\n=== 正文全文相同 ===`);
console.log(`组数: ${exactBodies.length} (涉及 ${exactBodies.reduce((s, [, c]) => s + c, 0)} 篇)`);
exactBodies.slice(0, 3).forEach(([b, c]) => console.log(`  ×${c}  ${b.slice(0, 80)}...`));

// 8) 门禁判定（--gate）：只对可索引文章（noindex !== true）做同 cell pairwise。
//    判定分两级（避免误杀行业长尾的模板共性）：
//      阻断：可索引内正文全文相同；或同 cell(model|cat|ind|country) 内 Jaccard > 0.90
//      预警：可索引内任意两篇 Jaccard 落在 (0.60, 0.90]，仅提示不阻断
if (GATE_MODE) {
  const indexable = rows.filter((r) => !r.noindex);
  const shOf = (r) => {
    if (!shingleCache.has(r.file)) shingleCache.set(r.file, shingles(r.body));
    return shingleCache.get(r.file);
  };
  const jacc = (a, b) => {
    const [s, t] = a.size <= b.size ? [a, b] : [b, a];
    let inter = 0;
    for (const g of s) if (t.has(g)) inter++;
    return inter / (a.size + b.size - inter || 1);
  };

  // 全文相同（可索引内）
  const exact = new Map();
  for (const r of indexable) exact.set(r.body, (exact.get(r.body) || 0) + 1);
  const exactGroups = [...exact.entries()].filter(([, c]) => c > 1);

  // 同 cell 内 pairwise
  const cell = new Map();
  for (const r of indexable) {
    const c = `${r.model}|${r.category}|${r.industry}|${r.country}`;
    if (!cell.has(c)) cell.set(c, []);
    cell.get(c).push(r);
  }
  const blockPairs = [];
  const warnPairs = [];
  for (const rs of cell.values()) {
    if (rs.length < 2) continue;
    for (let i = 0; i < rs.length; i++) {
      for (let j = i + 1; j < rs.length; j++) {
        const v = jacc(shOf(rs[i]), shOf(rs[j]));
        if (v > GATE.JaccardMax) blockPairs.push([rs[i].file, rs[j].file, v]);
        else if (v > GATE.JaccardWarnLow) warnPairs.push([rs[i].file, rs[j].file, v]);
      }
    }
  }
  blockPairs.sort((x, y) => y[2] - x[2]);
  warnPairs.sort((x, y) => y[2] - x[2]);

  console.log(`\n=== 门禁（可索引 ${indexable.length} 篇 / ${cell.size} cell）===`);
  console.log(`阻断项: 全文相同 ${exactGroups.length} 组, 同 cell 超 ${GATE.JaccardMax} 对 ${blockPairs.length}`);
  blockPairs.slice(0, 8).forEach(([fa, fb, v]) => console.log(`  BLOCK ${v.toFixed(3)}  ${fa} ≈ ${fb}`));
  console.log(`预警项: 同 cell 落在 (0.60,0.90] 对 ${warnPairs.length}`);
  warnPairs.slice(0, 5).forEach(([fa, fb, v]) => console.log(`  WARN  ${v.toFixed(3)}  ${fa} ≈ ${fb}`));

  if (exactGroups.length > 0 || blockPairs.length > 0) {
    console.log('\n❌ 门禁未通过：可索引文章内存在全文相同或同 cell 近似复制正文');
    process.exit(1);
  }
  console.log('✅ 门禁通过：可索引文章无全文相同 / 同 cell 近似复制正文');
}
