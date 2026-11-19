import { topicMatrix } from '../src/templates/topic-matrix.js';
import { generateArticle } from '../src/templates/content-generator.js';

console.log('Testing indices 113-120 (the flap-discs failures):');
for (let i = 113; i < 120; i++) {
  const topic = topicMatrix[i];
  console.log(`\n[${i}] ${topic.title} | ${topic.productFamily} | ${topic.industry} | ${topic.gccCountry} | ${topic.articleType}`);
  try {
    const article = generateArticle(topic);
    console.log('  SUCCESS');
  } catch (err) {
    console.error('  ERROR:', err instanceof Error ? err.message : err);
  }
}