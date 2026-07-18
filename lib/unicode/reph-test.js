/**
 * Test to investigate reph (র-ফলা) rendering issue in /no-marking mode
 */

import { normalizeText } from './text-normalizer.js';
import { splitBengaliGraphemes, splitGraphemes } from './grapheme-splitter.js';
import { normalizeUnicodeBengaliForComparison } from './bengali-normalizer.js';

// Test cases based on user's description
const testCases = [
  {
    name: 'বর্তমান (bartoman)',
    input: 'বর্তমান',
    description: 'User types: ব র্ ত ম া ন - reph should be on ত, not ম'
  },
  {
    name: 'বর্ত (partial)',
    input: 'বর্ত',
    description: 'First 3 characters - should show correctly'
  },
  {
    name: 'ধর্ম (dharma)',
    input: 'ধর্ম',
    description: 'Reph on ম - this should work correctly (preservation)'
  }
];

console.log('=== REPH (র-ফলা) RENDERING INVESTIGATION ===\n');

testCases.forEach(testCase => {
  console.log(`\n📝 Test: ${testCase.name}`);
  console.log(`Input: ${testCase.input}`);
  console.log(`Description: ${testCase.description}`);
  
  // Step 1: Normalize
  const normalized = normalizeText(testCase.input, 'bn', false);
  console.log(`\nAfter normalizeText: ${normalized}`);
  console.log(`Code points: ${Array.from(normalized).map(c => 
    `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`
  ).join(' ')}`);
  
  // Step 2: Split graphemes
  const graphemes = splitBengaliGraphemes(normalized);
  console.log(`\nAfter splitBengaliGraphemes:`);
  graphemes.forEach((g, i) => {
    const codes = Array.from(g).map(c => 
      `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`
    ).join(' ');
    console.log(`  [${i}]: "${g}" (${codes})`);
  });
  
  // Step 3: Join back
  const rejoined = graphemes.join('');
  console.log(`\nAfter joining back: ${rejoined}`);
  console.log(`Match original? ${rejoined === testCase.input}`);
  
  // Step 4: Bengali comparison normalization
  const comparisonNorm = normalizeUnicodeBengaliForComparison(testCase.input);
  console.log(`\nAfter comparison normalization: ${comparisonNorm}`);
  console.log(`Code points: ${Array.from(comparisonNorm).map(c => 
    `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`
  ).join(' ')}`);
  
  console.log('\n' + '─'.repeat(70));
});

console.log('\n\n=== ANALYSIS ===');
console.log('If graphemes are split incorrectly, the reph will be misplaced.');
console.log('Expected: র্ + ত should stay together as one grapheme cluster.');
console.log('If they split into separate clusters, display will be wrong.');
