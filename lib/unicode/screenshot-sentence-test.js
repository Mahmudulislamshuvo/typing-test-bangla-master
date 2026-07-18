/**
 * Test the exact sentence from the user's screenshot
 */

import { normalizeText } from './text-normalizer.js';
import { splitBengaliGraphemes } from './grapheme-splitter.js';

// The sentence from screenshot: "বাগালের কোনায় ফুটে থাকা একটি ছোট ফুল। সুর আলো"
const targetSentence = 'বাগালের কোনায় ফুটে থাকা একটি ছোট ফুল। সুর আলো';
const typedSentence = 'বাগালের কোনায় ফুটে থাকা একটি ছোট ফুল। সুর আলো';

console.log('=== SCREENSHOT SENTENCE TEST ===\n');

console.log('Target sentence:', targetSentence);
console.log('\nProcessing:');

const normalized = normalizeText(targetSentence, 'bn', false);
console.log('After normalize:', normalized);

const graphemes = splitBengaliGraphemes(normalized);
console.log('\nGrapheme clusters:');
graphemes.forEach((g, i) => {
  console.log(`  [${i}]: "${g}"`);
});

const rejoined = graphemes.join('');
console.log('\nRejoined:', rejoined);
console.log('Match original?', rejoined === targetSentence ? '✅ YES' : '❌ NO');

// Test specific problematic words from the sentence
console.log('\n=== SPECIFIC WORDS ===');

const testWords = [
  'ফুটে',  // ু + ে vowel signs
  'থাকা',  // া vowel sign
  'একটি',  // এ independent vowel
  'ছোট',   // ো vowel sign
  'ফুল',   // ু vowel sign
  'সুর',   // ু vowel sign
];

testWords.forEach(word => {
  const norm = normalizeText(word, 'bn', false);
  const graph = splitBengaliGraphemes(norm);
  const rejoin = graph.join('');
  const status = rejoin === word ? '✅' : '❌';
  console.log(`${status} ${word} → ${graph.join(' | ')} → ${rejoin}`);
});

console.log('\n=== CONCLUSION ===');
console.log('If all tests pass, the /no-marking mode should now display Bengali text correctly!');
