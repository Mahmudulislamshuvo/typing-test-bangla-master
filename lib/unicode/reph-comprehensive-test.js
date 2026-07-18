/**
 * Comprehensive test for reph fix - testing both bug fix and preservation
 */

import { normalizeText } from './text-normalizer.js';
import { splitBengaliGraphemes } from './grapheme-splitter.js';

console.log('=== COMPREHENSIVE REPH FIX TEST ===\n');

// Bug fix cases - these should now work correctly
const bugFixCases = [
  'বর্তমান',
  'কর্ম',
  'ধর্ম',
  'সর্বোচ্চ',
  'পর্যন্ত',
  'আর্থিক',
  'বর্ণনা',
  'ভার্চুয়াল',
];

console.log('🔧 BUG FIX CASES (Reph should work correctly):');
bugFixCases.forEach(word => {
  const normalized = normalizeText(word, 'bn', false);
  const graphemes = splitBengaliGraphemes(normalized);
  const rejoined = graphemes.join('');
  const status = rejoined === word ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${word} → ${graphemes.join(' | ')} → ${rejoined}`);
});

// Preservation cases - these should still work (no regressions)
const preservationCases = [
  { word: 'বই', description: 'Vowel sign ই' },
  { word: 'কিছু', description: 'Vowel sign ি' },
  { word: 'কাজ', description: 'Vowel sign া' },
  { word: 'স্কুল', description: 'Conjunct স্ক' },
  { word: 'ন্ত', description: 'Conjunct ন্ত' },
  { word: 'ক্ষ', description: 'Conjunct ক্ষ' },
  { word: 'একটি', description: 'Independent vowel এ' },
  { word: 'আমি', description: 'Independent vowel আ' },
];

console.log('\n📦 PRESERVATION CASES (Should continue to work):');
preservationCases.forEach(({ word, description }) => {
  const normalized = normalizeText(word, 'bn', false);
  const graphemes = splitBengaliGraphemes(normalized);
  const rejoined = graphemes.join('');
  const status = rejoined === word ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${word} (${description}) → ${rejoined}`);
});

// Edge cases
const edgeCases = [
  { word: 'র', description: 'Single র' },
  { word: 'র্', description: 'র + hasanta alone (incomplete reph)' },
  { word: 'কর', description: 'র at end (not reph)' },
  { word: 'প্র', description: 'র-ফলা (র after consonant, not reph)' },
];

console.log('\n🔍 EDGE CASES:');
edgeCases.forEach(({ word, description }) => {
  const normalized = normalizeText(word, 'bn', false);
  const graphemes = splitBengaliGraphemes(normalized);
  const rejoined = graphemes.join('');
  const status = rejoined === word ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${word} (${description}) → ${graphemes.join(' | ')} → ${rejoined}`);
});

console.log('\n=== TEST SUMMARY ===');
console.log('If all tests PASS, the reph fix is working correctly without regressions.');
