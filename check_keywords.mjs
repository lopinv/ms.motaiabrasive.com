import fs from 'fs';
import path from 'path';

const CONTENT_DIR = path.resolve('./src/content/articles');
const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.mdx')).slice(0, 10);

for (const file of files) {
  const content = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const fm = fmMatch[1];
    const primaryMatch = fm.match(/primaryKeyword:\s*"([^"]+)"/);
    const longTailMatch = fm.match(/longTailKeywords:\s*\[([^\]]+)\]/);
    
    const primary = primaryMatch ? primaryMatch[1] : 'N/A';
    const longTail = longTailMatch ? longTailMatch[1] : 'N/A';
    
    // Count occurrences in body
    const body = content.split('---')[2] || '';
    const primaryRegex = new RegExp(primary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const primaryCount = (body.match(primaryRegex) || []).length;
    
    const firstLongTail = longTail.split(',')[0].trim().replace(/^"|"$/g, '');
    const longTailRegex = new RegExp(firstLongTail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const longTailCount = (body.match(longTailRegex) || []).length;
    
    console.log(`\n${file}:`);
    console.log(`  Primary: ${primary} (count: ${primaryCount})`);
    console.log(`  LongTail sample: ${firstLongTail}`);
    console.log(`  LongTail count: ${longTailCount}`);
  }
}