// 国家版/变体直接删除（替代 noindex 方案）：
//  1) 每个 (model|category|industry) cell 保留主国家版（qatar > saudi-arabia > uae），删除其余国家版
//  2) 每个 (model|category|industry|country) cell 保留 variant 0，删除其余焦点变体（正文近似复制）
//  3) 同步清理 _index.json
// 幂等：对已删除集合重跑为 no-op。用法：node scripts/delete-duplicate-articles.mjs [--execute]
// 默认 dry-run 只列清单不删盘
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('src/content/articles');
const execute = process.argv.includes('--execute');
const countryRank = (c) => ({ qatar: 0, 'saudi-arabia': 1, uae: 2, 'general-gcc': 9 })[c] ?? 99;

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mdx'));
function fmField(text, key) {
  const m = text.match(new RegExp(`^${key}:\\s*("([^"\\n]*)"|([^\\n]*))$`, 'm'));
  return m ? (m[2] !== undefined ? m[2] : m[3]) : '';
}

const entries = [];
for (const f of files) {
  const t = fs.readFileSync(path.join(dir, f), 'utf8');
  const slug = f.replace(/\.mdx$/, '');
  // 尾部变体号：…-0 / …-1
  const variant = Number(slug.match(/-(\d+)$/)?.[1] ?? 0);
  entries.push({
    file: f,
    slug,
    variant,
    model: fmField(t, 'productModel'),
    category: fmField(t, 'category'),
    industry: fmField(t, 'industry'),
    country: fmField(t, 'gccCountry'),
  });
}

// 规则 1：3D cell 内按国家排名保留最小 rank 的国家版本
// 例外：gcc-regional-sourcing 类型不参与国家去重——各国地域寻源篇正文由
// 国家级真实数据（港口/监管机构/集群/商务文化）驱动，差异显著，全部保留
const isRegional = (e) => e.category === 'gcc-regional-sourcing';
const cells3 = new Map();
for (const e of entries) {
  if (isRegional(e)) continue; // 地域寻源篇跳过国家去重
  const c = `${e.model}|${e.category}|${e.industry}`;
  if (!cells3.has(c)) cells3.set(c, []);
  cells3.get(c).push(e);
}
const keepCountry = new Set(entries.filter(isRegional).map(e => e.file));
for (const [c, group] of cells3) {
  const primaryRank = Math.min(...group.map((e) => countryRank(e.country)));
  for (const e of group) {
    if (countryRank(e.country) === primaryRank) keepCountry.add(e.file);
  }
}

// 规则 2：4D cell 内按 variant 升序只留第一个
// 例外：gcc-regional-sourcing 的两个变体（import-guide / market-logistics）正文由
// 国家级数据驱动、章节主题不同，Jaccard 远低于近似复制阈值，两个都保留
const cells4 = new Map();
for (const e of entries) {
  if (!keepCountry.has(e.file)) continue;
  if (isRegional(e)) continue; // 地域寻源篇跳过变体去重
  const c = `${e.model}|${e.category}|${e.industry}|${e.country}`;
  if (!cells4.has(c)) cells4.set(c, []);
  cells4.get(c).push(e);
}
const keepAll = new Set(entries.filter(isRegional).map(e => e.file));
for (const group of cells4.values()) {
  group.sort((a, b) => a.variant - b.variant);
  keepAll.add(group[0].file);
}

const toDelete = entries.filter((e) => !keepAll.has(e.file));
const byRule = {
  国家版删除: entries.filter((e) => !keepCountry.has(e.file)).length,
  变体删除: entries.filter((e) => keepCountry.has(e.file) && !keepAll.has(e.file)).length,
};

console.log(`总计 ${entries.length} 篇: 保留 ${keepAll.size}, 删除 ${toDelete.length} (${JSON.stringify(byRule)})`);

// _index.json 同步
const indexPath = path.join(dir, '_index.json');
let idxStats = '';
if (fs.existsSync(indexPath)) {
  const idx = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const before = idx.length;
  const keptIdx = idx.filter((x) => keepAll.has(`${x.slug}.mdx`));
  idxStats = `; _index.json ${before} -> ${keptIdx.length}`;
  if (execute) fs.writeFileSync(indexPath, JSON.stringify(keptIdx, null, 2), 'utf8');
}
console.log(idxStats);

if (!execute) {
  toDelete.slice(0, 5).forEach((e) => console.log(`  [dry-run] 将删: ${e.file}`));
  console.log('（dry-run，加 --execute 实际删除）');
  process.exit(0);
}

let n = 0;
for (const e of toDelete) {
  fs.unlinkSync(path.join(dir, e.file));
  n++;
}
console.log(`已删除 ${n} 篇，磁盘剩余 ${files.length - n} 篇`);
