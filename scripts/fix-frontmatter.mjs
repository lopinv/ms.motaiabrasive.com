// 修复 .mdx frontmatter 中未加引号且含冒号的 YAML 标量值
// 用法：node scripts/fix-frontmatter.mjs [--check]
//   默认修复并写回；--check 仅检测不写回
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

const checkOnly = process.argv.includes('--check');
const dir = path.resolve('src/content/articles');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mdx'));

function extractFrontmatterLines(text) {
  const lines = text.split('\n');
  if (lines[0].trim() !== '---') return null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') return { lines, start: 1, end: i }; // end 行为闭合 ---
  }
  return null;
}

// 对单行做修复：给未加引号、且值内含 "冒号+空格" 或以冒号结尾的标量加双引号
function fixLine(line) {
  // key: value（value 未加引号），key 允许列表标记 "- " 前缀
  const m = line.match(/^(\s*(?:- )?[^\s:#][^:]*:)(\s+)(\S.*)$/);
  if (!m) return { line, changed: false };
  const value = m[3];
  if (/^["']/.test(value)) return { line, changed: false };
  // 值内含 "冒号+空格" 或 "冒号+行尾" 时，YAML plain scalar 会解析失败
  if (/:(\s|$)/.test(value)) {
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return { line: `${m[1]} "${escaped}"`, changed: true };
  }
  return { line, changed: false };
}

let fixedFiles = 0;
let fixedLines = 0;
const failures = [];

for (const file of files) {
  const p = path.join(dir, file);
  const original = fs.readFileSync(p, 'utf8');
  let text = original;
  let changed = false;

  // 多轮修复：每轮解析 frontmatter，定位报错行加引号
  for (let iter = 0; iter < 20; iter++) {
    const fm = extractFrontmatterLines(text);
    if (!fm) { failures.push(`${file}: 缺少 frontmatter`); break; }
    const fmText = fm.lines.slice(fm.start, fm.end).join('\n');
    let err = null;
    try { parse(fmText); } catch (e) { err = e; }
    if (!err) break;
    // yaml 错误信息含 "at line N, column M"（N 为 1 基，相对 frontmatter 文本）
    const msgLine = Number(err.message.match(/at line (\d+), column \d+/)?.[1] ?? 0);
    if (!msgLine || msgLine > fm.end - fm.start) {
      failures.push(`${file}: 无法定位错误行: ${err.message.split('\n')[0]}`);
      break;
    }
    const idx = fm.start + msgLine - 1;
    const fixed = fixLine(fm.lines[idx]);
    if (!fixed.changed) {
      failures.push(`${file}: 第 ${idx + 1} 行无法自动修复: ${fm.lines[idx].slice(0, 80)}`);
      break;
    }
    fm.lines[idx] = fixed.line;
    text = fm.lines.slice(0, fm.start).concat(fm.lines.slice(fm.start, fm.end + 1), fm.lines.slice(fm.end + 1)).join('\n');
    changed = true;
    fixedLines++;
  }

  if (changed) {
    // 写回前最终校验
    const fm = extractFrontmatterLines(text);
    try { parse(fm.lines.slice(fm.start, fm.end).join('\n')); }
    catch (e) { failures.push(`${file}: 修复后仍失败: ${e.message.split('\n')[0]}`); continue; }
    if (!checkOnly) fs.writeFileSync(p, text);
    fixedFiles++;
  }
}

console.log(`${checkOnly ? '[check] ' : ''}待修复文件: ${fixedFiles}, 修复行: ${fixedLines}, 无法修复: ${failures.length}`);
failures.slice(0, 30).forEach((f) => console.log('  ✗ ' + f));
if (!failures.length) console.log('✓ 全部 frontmatter YAML 解析通过');
