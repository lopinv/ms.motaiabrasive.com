import { topicMatrix } from '../src/templates/topic-matrix.js';
import { generateArticle } from '../src/templates/content-generator.js';

// Find sanding-sponges failures
const sandingSpongesTopics = topicMatrix.filter(t => t.productFamily === 'sanding-sponges');
console.log(`Total sanding-sponges topics: ${sandingSpongesTopics.length}`);
console.log('First 5 sanding-sponges topics:');
sandingSpongesTopics.slice(0, 5).forEach((t, idx) => {
  console.log(`  [${topicMatrix.indexOf(t)}] ${t.title} | ${t.industry} | ${t.gccCountry} | ${t.articleType}`);
});

// Test generating all sanding-sponges
console.log('\nTesting generation for all sanding-sponges...');
let success = 0;
let failed = 0;
for (const topic of sandingSpongesTopics) {
  try {
    const article = generateArticle(topic);
    success++;
  } catch (err) {
    failed++;
    console.error(`FAILED: ${topic.title}`);
    console.error('  Error:', err instanceof Error ? err.message : err);
    console.error('  Stack:', err instanceof Error ? err.stack : '');
  }
}
console.log(`\nSanding-sponges: ${success} success, ${failed} failed`);