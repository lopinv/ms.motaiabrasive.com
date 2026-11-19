import { topicMatrix } from '../src/templates/topic-matrix.js';
import { generateArticle } from '../src/templates/content-generator.js';

// Find flap-discs topics
const flapDiscsTopics = topicMatrix.filter(t => t.productFamily === 'flap-discs');
console.log(`Total flap-discs topics: ${flapDiscsTopics.length}`);

// Test generating all flap-discs
console.log('\nTesting generation for all flap-discs...');
let success = 0;
let failed = 0;
for (const topic of flapDiscsTopics) {
  try {
    const article = generateArticle(topic);
    success++;
  } catch (err) {
    failed++;
    console.error(`FAILED: ${topic.title}`);
    console.error('  Error:', err instanceof Error ? err.message : err);
  }
}
console.log(`\nFlap-discs: ${success} success, ${failed} failed`);