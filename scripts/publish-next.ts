#!/usr/bin/env tsx
/**
 * 发布循环单步：生成下一篇「幸存」选题文章（逐篇发布，规避 scaled content abuse）。
 * 选题来源与去重规则由 generate-articles.remainingTopics() 提供（单一事实源）。
 *
 * 用法：
 *   npx tsx scripts/publish-next.ts            生成 1 篇并写入 + 更新索引
 *   npx tsx scripts/publish-next.ts --peek     只报告剩余可发布篇数与下一篇，不落盘
 * 退出码：0=成功；3=选题池耗尽（PUBLISH_EXHAUSTED，供发布循环判定停止条件）。
 */
import { writePublishBatch, remainingTopics, sanitizeSlug } from './generate-articles.js';

const peek = process.argv.includes('--peek');
const remaining = remainingTopics();

if (peek) {
  const next = remaining[0];
  console.log(`PUBLISH_PEEK remaining=${remaining.length} next=${next ? sanitizeSlug(next.slug) : '(none)'}`);
  process.exit(remaining.length ? 0 : 3);
}

if (remaining.length === 0) {
  console.log('PUBLISH_EXHAUSTED');
  process.exit(3);
}

const result = writePublishBatch();
if (!result) {
  console.log('PUBLISH_EXHAUSTED');
  process.exit(3);
}
console.log(`PUBLISHED ${result.slug}`);
console.log(`WROTE ${result.filePath}`);
