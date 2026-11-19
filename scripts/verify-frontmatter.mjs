// 校验所有 .mdx frontmatter 的 YAML 可解析性
import fs from 'node:fs';
import path from 'node:path';
import { parse, parseAllDocuments } from 'yaml';

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

let ok = 0;
const failures = [];
for (const file of files) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8');
  const fm = frontmatterOf(text);
  if (fm === null) {
    failures.push(`${file}: 无 frontmatter`);
    continue;
  }
  try {
    parseAllDocuments(fm, (d) => {
      if (d.errors.length) throw new Error(d.errors[0].message);
    });
    ok++;
  } catch (e) {
    failures.push(`${file}: ${e.message.split('\n')[0]}`);
  }
}

console.log(`总计 ${files.length}, 通过 ${ok}, 失败 ${failures.length}`);
failures.slice(0, 30).forEach((f) => console.log('  ' + f));
