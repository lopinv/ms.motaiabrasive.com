#!/usr/bin/env node
/**
 * 批量生成文章脚本
 * 读取选题矩阵，生成 MDX 文件写入 src/content/articles/
 *
 * 批量模式（开发期）：npx tsx scripts/generate-articles.ts <startIdx> <count> [priority]
 * 发布模式（单篇循环）：由 scripts/publish-next.ts 调 export 的 writePublishBatch 逐篇发布
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { topicMatrix, type TopicSpec } from '../src/templates/topic-matrix.js';
import { generateArticle } from '../src/templates/content-generator.js';

export const CONTENT_DIR = path.resolve(__dirname, '../src/content/articles');
export const INDEX_PATH = path.join(CONTENT_DIR, '_index.json');

export function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function sanitizeSlug(slug: string): string {
  return slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function escapeYamlString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

export function yamlValueOf(v: any): string {
  // 嵌套值（字符串数组等）必须序列化为 YAML flow 数组，否则逗号拼接的
  // 无引号标量在 frontmatter 中含冒号时会破坏 YAML 解析
  if (Array.isArray(v)) {
    return '[' + v.map((x) => (typeof x === 'string' ? `"${escapeYamlString(x)}"` : x)).join(', ') + ']';
  }
  return typeof v === 'string' ? `"${escapeYamlString(v)}"` : String(v);
}

export function frontmatterToYaml(fm: Record<string, any>): string {
  const lines: string[] = ['---'];

  for (const [key, value] of Object.entries(fm)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      // Check if array of objects
      if (value[0] && typeof value[0] === 'object') {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push('  - ');
          for (const [k, v] of Object.entries(item)) {
            lines.push(`    ${k}: ${yamlValueOf(v)}`);
          }
        }
      } else {
        // Simple array
        lines.push(`${key}: ${yamlValueOf(value)}`);
      }
    } else if (typeof value === 'object') {
      lines.push(`${key}:`);
      for (const [k, v] of Object.entries(value)) {
        lines.push(`  ${k}: ${yamlValueOf(v)}`);
      }
    } else {
      lines.push(`${key}: ${yamlValueOf(value)}`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}

export function writeArticle(article: { frontmatter: Record<string, any>; html: string; slug: string }): string {
  const safeSlug = sanitizeSlug(article.slug);
  const filePath = path.join(CONTENT_DIR, `${safeSlug}.mdx`);

  const yaml = frontmatterToYaml(article.frontmatter);
  const content = `${yaml}\n\n${article.html}\n`;

  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

/** 合并索引（以 slug 为键，新条目覆盖旧条目）并写回 _index.json */
export function updateIndex(newEntries: Array<Record<string, any>>): number {
  let existingIndex: any[] = [];
  if (fs.existsSync(INDEX_PATH)) {
    try {
      existingIndex = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
    } catch (e) {
      existingIndex = [];
    }
  }
  const combinedMap = new Map<string, any>();
  for (const item of [...existingIndex, ...newEntries]) {
    combinedMap.set(item.slug, item);
  }
  const combinedIndex = Array.from(combinedMap.values());
  fs.writeFileSync(INDEX_PATH, JSON.stringify(combinedIndex, null, 2), 'utf-8');
  return combinedIndex.length;
}

/**
 * 计算"尚未发布的幸存选题"（peek 与 publish 共用，单一事实源）。
 * 幸存判定与 delete-duplicate-articles.mjs 一致：
 *   - gcc-regional-sourcing 全部幸存（正文国家级数据驱动）
 *   - 非地域篇：3D cell(model|cat|industry) 保留最小国家 rank 的主国家版
 *   - 4D cell(上+country) 内若已写过更小 variant，则本条不再幸存
 * 再过滤掉 _index.json 已收录的 slug（已发布/已物理存在的）。
 */
export function remainingTopics(): TopicSpec[] {
  const isRegional = (t: TopicSpec) => t.articleType === 'gcc-regional-sourcing';
  const countryRank = (c: string) => ({ qatar: 0, 'saudi-arabia': 1, uae: 2, 'general-gcc': 9 }[c] ?? 99);
  const variantOf = (t: TopicSpec) => Number(t.slug.match(/-(\d+)$/)?.[1] ?? 0);
  const cellKey = (t: TopicSpec) => `${t.productModel}|${t.articleType}|${t.industry}`;

  const minCountryRank = new Map<string, number>();
  for (const t of topicMatrix) {
    if (isRegional(t)) continue;
    const k = cellKey(t);
    const r = countryRank(t.gccCountry);
    minCountryRank.set(k, Math.min(minCountryRank.get(k) ?? 99, r));
  }

  const existing = new Set(
    fs.existsSync(INDEX_PATH)
      ? JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8')).map((x: any) => x.slug)
      : [],
  );
  const written4d = new Set<string>();
  const minVariant = new Map<string, number>();
  for (const slug of existing) {
    const t = topicMatrix.find((x) => sanitizeSlug(x.slug) === slug);
    if (!t) continue;
    const k4 = `${cellKey(t)}|${t.gccCountry}`;
    written4d.add(k4);
    const v = variantOf(t);
    minVariant.set(k4, Math.min(minVariant.get(k4) ?? 99, v));
  }

  const survivors = topicMatrix.filter((t) => {
    if (isRegional(t)) return true;
    if (countryRank(t.gccCountry) !== minCountryRank.get(cellKey(t))) return false;
    const k4 = `${cellKey(t)}|${t.gccCountry}`;
    // 4D cell 已写过更小 variant 时，本条不再是幸存（避免同 cell 近似复制）
    return !written4d.has(k4) || variantOf(t) < minVariant.get(k4);
  });

  return survivors.filter((t) => !existing.has(sanitizeSlug(t.slug)));
}

/**
 * 发布模式：取"尚未发布的幸存选题"中的下一篇（remainingTopics()[0]），
 * 生成 1 篇并写入 + 更新索引。去重删除由调用方（publish-cycle）统一执行。
 * @returns { slug, filePath } 或 null（选题池耗尽）
 */
export function writePublishBatch(): { slug: string; filePath: string } | null {
  const next = remainingTopics()[0];
  if (!next) return null;

  ensureDir(CONTENT_DIR);
  const article = generateArticle(next);
  const filePath = writeArticle(article);
  updateIndex([{
    slug: sanitizeSlug(next.slug),
    title: next.title,
    articleType: next.articleType,
    productFamily: next.productFamily,
    industry: next.industry,
    gccCountry: next.gccCountry,
    priority: next.priority,
    primaryKeyword: next.primaryKeyword,
  }]);
  return { slug: sanitizeSlug(next.slug), filePath };
}

/** 直接执行保护：仅当本文件被 tsx 直接运行时走批量模式，被 import 时不执行 */
const isDirectRun = ((): boolean => {
  try {
    const entry = path.resolve(process.argv[1] ?? '');
    return entry.endsWith('generate-articles.ts') || entry.endsWith('generate-articles.js');
  } catch {
    return false;
  }
})();

async function main() {
  const args = process.argv.slice(2);
  const startIdx = parseInt(args[0] || '0', 10);
  const count = parseInt(args[1] || '50', 10);
  const priorityFilter = args[2] ? parseInt(args[2], 10) : undefined;

  console.log(`=== 批量生成文章 ===`);
  console.log(`起始索引: ${startIdx}`);
  console.log(`生成数量: ${count}`);
  console.log(`优先级过滤: ${priorityFilter ? `P${priorityFilter}` : '全部'}`);
  console.log(`输出目录: ${CONTENT_DIR}`);

  ensureDir(CONTENT_DIR);

  let filtered = topicMatrix;
  if (priorityFilter) {
    filtered = topicMatrix.filter(t => t.priority === priorityFilter);
  }

  const batch = filtered.slice(startIdx, startIdx + count);
  console.log(`实际将生成: ${batch.length} 篇`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < batch.length; i++) {
    const topic = batch[i];
    const globalIdx = startIdx + i;

    try {
      const article = generateArticle(topic);
      const filePath = writeArticle(article);
      success++;
      if ((i + 1) % 10 === 0 || i === batch.length - 1) {
        console.log(`  [${i + 1}/${batch.length}] ✓ ${topic.slug} (P${topic.priority})`);
      }
    } catch (err) {
      failed++;
      console.error(`  [${i + 1}/${batch.length}] ✗ ${topic.slug}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\n=== 完成 ===`);
  console.log(`成功: ${success}`);
  console.log(`失败: ${failed}`);
  console.log(`文件目录: ${CONTENT_DIR}`);

  const idxTotal = updateIndex(batch.map((t) => ({
    slug: sanitizeSlug(t.slug),
    title: t.title,
    articleType: t.articleType,
    productFamily: t.productFamily,
    industry: t.industry,
    gccCountry: t.gccCountry,
    priority: t.priority,
    primaryKeyword: t.primaryKeyword,
  })));
  console.log(`索引文件: ${INDEX_PATH} (总计 ${idxTotal} 篇)`);

  // 注意：去重删除不在此自动链式执行——发布循环由 publish-cycle.mjs 统一编排
  // （先 build 验证再删），批量开发模式如需去重请手动跑 npm run dedupe:delete:execute
}

if (isDirectRun) {
  main().catch(console.error);
}
