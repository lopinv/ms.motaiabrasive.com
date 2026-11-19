#!/usr/bin/env node
/**
 * 发布循环编排器（供「每 30 分钟一篇」定时任务调用）：
 *   1) peek 选题池 —— 耗尽则打印 PUBLISH_EXHAUSTED 并 exit 0（定时任务见此应暂停自身）
 *   2) 生成下一篇「幸存」选题（1 篇，落盘 mdx + _index.json）
 *   3) 全量 build（astro check + 静态产物）
 *   4) 三层门禁：同质化(--gate) / SEO-quality / 链接与外链 nofollow
 *   5) 提交并推送 main（仅新 mdx + _index.json）
 *   6) 部署 gh-pages：独立 worktree 同步 dist，保留 CNAME，推送
 *
 * 失败可重入：生成后、提交前任一环节失败 → 回滚 mdx + _index.json，下次循环重发同一篇。
 * 提交/推送阶段失败不回滚（slug 已入 _index.json，peek 自动排除，不会重复发布）。
 *
 * 用法：node scripts/publish-cycle.mjs
 */
import { execSync } from 'node:child_process';
import { openSync, closeSync, statSync, cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 以脚本自身位置定位仓根，避免依赖调用方的 cwd（定时任务 shell 位置不定）
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const WT = path.join(ROOT, '.ghpages-worktree');
const sh = (cmd, opts = {}) => {
  // inherit 模式实时输出、execSync 返回 null；pipe 模式捕获 stdout
  const out = execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
  return out == null ? '' : out.toString().trim();
};
const shCapture = (cmd, opts = {}) =>
  execSync(cmd, { stdio: 'pipe', cwd: ROOT, ...opts }).toString().trim();

// ---- 并发锁：cron 30min 间隔、单次 run 约 5-10min；上一轮未结束（或进程被杀残留锁）时跳过 ----
// 锁龄 > 45min 视为陈旧并抢占（进程被杀场景自愈）
const LOCK = path.join(ROOT, '.publish-cycle.lock');
{
  let acquired = false;
  try {
    closeSync(openSync(LOCK, 'wx'));
    acquired = true;
  } catch {
    try {
      if (Date.now() - statSync(LOCK).mtimeMs > 45 * 60 * 1000) {
        rmSync(LOCK, { force: true });
        closeSync(openSync(LOCK, 'wx'));
        acquired = true;
      }
    } catch { /* 锁存在且新鲜或无法判定 */ }
  }
  if (!acquired) {
    console.log('PUBLISH_BUSY 上一轮仍在进行（或锁未释放），本轮跳过');
    process.exit(0);
  }
}
process.on('exit', () => {
  try { rmSync(LOCK, { force: true }); } catch { /* 尽力清理 */ }
});

// ---- 依赖自愈：定时触发时 shell 未必带 node_modules，缺失则按 lockfile 复现安装 ----
if (!existsSync(path.join(ROOT, 'node_modules', '.bin', 'astro'))) {
  console.log('deps missing, running npm ci ...');
  sh('npm ci');
}

// ---- 选题池耗尽则让定时任务自行暂停 ----
// peek 需要捕获 stdout（pipe）；耗尽时 publish-next.ts exit 3 会抛错 → 捕获后暂停
let peek = '';
try {
  peek = shCapture('npx tsx scripts/publish-next.ts --peek');
} catch (e) {
  console.log('PUBLISH_EXHAUSTED');
  process.exit(0);
}
const m = peek.match(/next=(\S+)/);
if (!m || m[1] === '(none)') {
  console.log('PUBLISH_EXHAUSTED');
  process.exit(0);
}
const slug = m[1];

// ---- 生成 → build → 门禁（提交前；任一失败则回滚，保证幂等）----
try {
  sh('npx tsx scripts/publish-next.ts');
  // 提高 V8 堆上限，避免 astro build 在渲染 3000+ 页时 Zone Allocation OOM（exit 134）
  sh('npm run build', { env: { ...process.env, NODE_OPTIONS: (process.env.NODE_OPTIONS || '') + ' --max-old-space-size=8192' } });
  sh(
    'node scripts/homogeneity-audit.mjs --gate ' +
      '&& node scripts/quality-check.mjs ' +
      '&& node scripts/link-check.mjs ' +
      '&& node scripts/audit-urls.mjs',
  );
} catch (e) {
  // 提交前失败：删除已写 mdx、还原 _index.json，下次循环重发同一篇
  try {
    rmSync(path.join(ROOT, 'src/content/articles', `${slug}.mdx`), { force: true });
    sh('git checkout -- src/content/articles/_index.json');
  } catch { /* 回滚尽力而为 */ }
  console.error(`PUBLISH_FAILED ${slug}: ${e.message}`);
  process.exit(1);
}

// ---- 提交并推送 main（仅新 mdx + 索引，精确 add 避免误纳）----
sh(`git add src/content/articles/${slug}.mdx src/content/articles/_index.json`);
sh(`git commit -m "feat(content): publish ${slug}"`);
sh('git push origin main');

// ---- 部署 gh-pages（独立 worktree，不污染 main 工作树）----
deployGhPages(slug);
console.log(`PUBLISH_OK ${slug}`);

function deployGhPages(s) {
  // 基于 origin/gh-pages 的 detached worktree：不检出/不移动本地 gh-pages 分支、
  // 无 reset --hard（避免丢弃未推送的本地提交），CNAME 在远端树中自然保留。
  // 清理旧 worktree（仅临时目录 .ghpages-worktree，不碰主仓任何分支历史）
  if (existsSync(WT)) {
    try {
      sh(`git worktree remove --force ${WT}`);
    } catch {
      rmSync(WT, { recursive: true, force: true });
      sh('git worktree prune');
    }
  }

  sh('git fetch -q origin gh-pages');
  sh(`git worktree add --detach --force ${WT} origin/gh-pages`);

  // dist 全量覆盖到 worktree：force 覆盖同名 + 新增缺失。
  // 发布循环只增不删，overlay 安全；CNAME/历史文件在 detached 检出中已就位，不丢。
  cpSync(DIST, WT, { recursive: true, force: true });

  sh(`git -C ${WT} add -A`);
  sh(`git -C ${WT} commit -m "pages: publish ${s}" --allow-empty`);
  // detached 状态无本地 gh-pages 分支：推送 HEAD 到远端 gh-pages
  sh(`git -C ${WT} push origin HEAD:gh-pages`);

  // 本地 gh-pages ref 快进对齐（仅当本地 ref 是远端祖先时；非破坏性，避免本地 ref 落后）
  try {
    sh(`git fetch -q origin gh-pages`);
    const isAncestor = sh(`git merge-base --is-ancestor gh-pages origin/gh-pages`);
    if (isAncestor === '') {
      sh(`git update-ref refs/heads/gh-pages origin/gh-pages`);
    }
  } catch { /* 本地 ref 同步失败不影响发布 */ }

  try {
    sh(`git worktree remove --force ${WT}`);
  } catch { /* 清理尽力而为 */ }
}
