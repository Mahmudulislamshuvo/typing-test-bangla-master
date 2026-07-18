/**
 * Bug Condition Exploration Test
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3**
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
 * DO NOT attempt to fix the test or the code when it fails.
 * 
 * This test encodes the expected behavior - it will validate the fix when it passes after implementation.
 * 
 * GOAL: Surface counterexamples that demonstrate:
 * - Vowel signs being incorrectly split from their base consonants
 * - Spurious hasanta characters appearing in output
 * - The exact nature and location of rendering errors
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { normalizeText } from './text-normalizer.js';
import { splitBengaliGraphemes } from './grapheme-splitter.js';

describe('Bug Condition Exploration - Bengali Unicode Vowel Sign and Hasanta Rendering', () => {
  /**
   * Property 1: Bug Condition - Bengali Unicode Vowel Sign and Hasanta Rendering
   * 
   * For any Bengali Unicode text containing vowel signs, when normalized and split into graphemes:
   * 1. Vowel signs MUST remain attached to their base consonants (not split into separate clusters)
   * 2. No spurious hasanta (্) characters should appear in the output
   * 3. The final display should match the expected output
   * 
   * **Scoped PBT Approach**: Testing with concrete failing cases to ensure reproducibility
   */
  
  describe('Property 1: Bug Condition - Vowel Sign Attachment and Hasanta Handling', () => {
    it('should keep vowel sign ই attached to base consonant ব in "বই" (book)', () => {
      const input = 'বই';
      const normalizedText = normalizeText(input, 'bn', false);
      const graphemes = splitBengaliGraphemes(normalizedText);
      
      // EXPECTED: The ই vowel should be part of a grapheme cluster with ব
      // The word should be split as either ["বই"] or ["ব", "ই"] where ই is treated properly
      // SHOULD NOT contain spurious hasanta (্)
      
      const result = graphemes.join('');
      
      // Check no spurious hasanta appears
      const inputHasantaCount = (input.match(/্/g) || []).length;
      const resultHasantaCount = (result.match(/্/g) || []).length;
      
      expect(resultHasantaCount).toBe(inputHasantaCount);
      expect(result).not.toContain('ব্ই'); // Should NOT become "ব্ই"
      expect(result).toBe('বই'); // Should remain "বই"
      
      // Log for debugging the bug
      console.log('Input:', input);
      console.log('Normalized:', normalizedText);
      console.log('Graphemes:', graphemes);
      console.log('Result:', result);
    });

    it('should NOT insert spurious hasanta before এ in "এক" (one)', () => {
      const input = 'এক';
      const normalizedText = normalizeText(input, 'bn', false);
      const graphemes = splitBengaliGraphemes(normalizedText);
      
      const result = graphemes.join('');
      
      // Check no spurious hasanta appears
      const inputHasantaCount = (input.match(/্/g) || []).length;
      const resultHasantaCount = (result.match(/্/g) || []).length;
      
      expect(resultHasantaCount).toBe(inputHasantaCount);
      expect(result).not.toContain('্এ'); // Should NOT contain ্এ
      expect(result).toBe('এক'); // Should remain "এক"
      
      console.log('Input:', input);
      console.log('Normalized:', normalizedText);
      console.log('Graphemes:', graphemes);
      console.log('Result:', result);
    });

    it('should correctly process full sentence with multiple vowel signs', () => {
      const input = 'একটি ভালো বই পড়া মানে অন্য এক জগতে প্রবেশ করা।';
      const normalizedText = normalizeText(input, 'bn', false);
      const graphemes = splitBengaliGraphemes(normalizedText);
      
      const result = graphemes.join('');
      
      // Check no spurious hasanta appears
      const inputHasantaCount = (input.match(/্/g) || []).length;
      const resultHasantaCount = (result.match(/্/g) || []).length;
      
      expect(resultHasantaCount).toBe(inputHasantaCount);
      
      // Should NOT contain these incorrect forms
      expect(result).not.toContain('্এক'); // Spurious hasanta before এক
      expect(result).not.toContain('ব্ই');  // Vowel sign split from ব
      
      // Should match expected output
      expect(result).toBe('একটি ভালো বই পড়া মানে অন্য এক জগতে প্রবেশ করা।');
      
      console.log('Input:', input);
      console.log('Normalized:', normalizedText);
      console.log('Graphemes:', graphemes);
      console.log('Result:', result);
      console.log('Input hasanta count:', inputHasantaCount);
      console.log('Result hasanta count:', resultHasantaCount);
    });

    it('should handle various vowel signs (ি, া, ে, ো, ু, ূ) correctly', () => {
      // Test cases with different vowel signs
      const testCases = [
        { input: 'কি', vowelSign: 'ি (hrasva-i)' },
        { input: 'কা', vowelSign: 'া (dirghho-a)' },
        { input: 'কে', vowelSign: 'ে (hrasva-e)' },
        { input: 'কো', vowelSign: 'ো (hrasva-o)' },
        { input: 'কু', vowelSign: 'ু (hrasva-u)' },
        { input: 'কূ', vowelSign: 'ূ (dirghho-u)' },
      ];
      
      testCases.forEach(({ input, vowelSign }) => {
        const normalizedText = normalizeText(input, 'bn', false);
        const graphemes = splitBengaliGraphemes(normalizedText);
        const result = graphemes.join('');
        
        // No spurious hasanta should appear
        expect(result).not.toContain('্');
        
        // Result should match input
        expect(result).toBe(input);
        
        console.log(`Vowel sign ${vowelSign}:`, { input, normalized: normalizedText, graphemes, result });
      });
    });
  });

  describe('Edge Case - Preservation of Correct Behavior', () => {
    it('should correctly handle conjuncts (যুক্তাক্ষর) like "স্কুল" (school)', () => {
      const input = 'স্কুল';
      const normalizedText = normalizeText(input, 'bn', false);
      const graphemes = splitBengaliGraphemes(normalizedText);
      const result = graphemes.join('');
      
      // Conjuncts should work correctly (this is a preservation case)
      // The hasanta here is legitimate, part of the conjunct স্ক
      expect(result).toBe('স্কুল');
      
      console.log('Conjunct test:', { input, normalized: normalizedText, graphemes, result });
    });
  });

  describe('Property-Based Testing - Vowel Sign Attachment', () => {
    /**
     * Property: For any Bengali consonant followed by a vowel sign,
     * the vowel sign should remain attached to the consonant after normalization and splitting.
     */
    it('should keep vowel signs attached to their base consonants', () => {
      // Bengali consonants (ক to হ)
      const bengaliConsonants = fc.integer({ min: 0x0995, max: 0x09B9 }).map(cp => String.fromCodePoint(cp));
      
      // Common Bengali vowel signs
      const bengaliVowelSigns = fc.constantFrom(
        '\u09BF', // ি (hrasva-i)
        '\u09C0', // ী (dirghho-i)
        '\u09BE', // া (dirghho-a)
        '\u09C7', // ে (hrasva-e)
        '\u09C8', // ৈ (dirghho-e)
        '\u09CB', // ো (hrasva-o)
        '\u09CC', // ৌ (dirghho-o)
        '\u09C1', // ু (hrasva-u)
        '\u09C2', // ূ (dirghho-u)
      );
      
      fc.assert(
        fc.property(bengaliConsonants, bengaliVowelSigns, (consonant, vowelSign) => {
          const input = consonant + vowelSign;
          const normalizedText = normalizeText(input, 'bn', false);
          const graphemes = splitBengaliGraphemes(normalizedText);
          const result = graphemes.join('');
          
          // No spurious hasanta should appear (unless it was in the input)
          const inputHasantaCount = (input.match(/্/g) || []).length;
          const resultHasantaCount = (result.match(/্/g) || []).length;
          
          expect(resultHasantaCount).toBe(inputHasantaCount);
          
          // Result should match input after round-trip
          expect(result).toBe(input);
        }),
        { numRuns: 100 }
      );
    });
  });
});
