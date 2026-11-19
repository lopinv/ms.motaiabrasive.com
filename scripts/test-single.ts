import { topicMatrix } from '../src/templates/topic-matrix.js';
import { generateArticle } from '../src/templates/content-generator.js';

const topic = topicMatrix[550];
console.log('Topic:', topic.title, topic.productFamily);
try {
  const article = generateArticle(topic);
  console.log('SUCCESS');
} catch (err) {
  console.error('ERROR:', err instanceof Error ? err.message : err);
}