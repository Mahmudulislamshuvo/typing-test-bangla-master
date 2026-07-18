# Bengali Unicode No-Marking Fix Bugfix Design

## Overview

The /no-marking typing mode currently fails to correctly render Bengali Unicode text due to two critical text processing issues: (1) vowel signs (মাত্রা) appearing in wrong positions, and (2) spurious hasanta characters (্) being inserted before consonants. These defects corrupt the displayed text, making the mode unusable for Bengali Unicode typing practice.

The fix will correct the text normalization and grapheme splitting logic to ensure Bengali Unicode text with vowel signs and consonants is properly handled while preserving existing correct behavior for English text, Bengali conjuncts, reph, and all other functionality.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when Bengali Unicode text containing vowel signs or specific consonant sequences is typed in /no-marking mode
- **Property (P)**: The desired behavior - Bengali Unicode text should be correctly normalized and rendered without position errors or spurious characters
- **Preservation**: Existing correct behavior for English text, Bengali conjuncts, reph rendering, and all non-buggy Bengali text that must remain unchanged
- **Vowel Sign (কার/মাত্রা)**: Bengali combining marks that attach to consonants (e.g., ি, া, ে, ো)
- **Hasanta (হসন্ত)**: The virama character (্) used in Bengali to form conjuncts and suppress inherent vowels
- **Grapheme Cluster**: A user-perceived character that may consist of a base character plus combining marks
- **splitBengaliGraphemes**: The function in `lib/unicode/grapheme-splitter.js` that splits Bengali text into grapheme clusters
- **normalizeText**: The function in `lib/unicode/text-normalizer.js` that normalizes text for display and comparison
- **isBengaliCombiningMark**: The function that identifies Bengali combining marks including vowel signs, hasanta, and ZWJ

## Bug Details

### Bug Condition

The bug manifests when Bengali Unicode text containing vowel signs (like ি, া, ে, ো) or specific consonant sequences is typed in /no-marking mode. The text processing functions are either incorrectly splitting vowel signs from their base consonants, mishandling the character sequence order, or incorrectly treating certain characters as combining marks that should be separate graphemes.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type string (user-typed text in /no-marking mode)
  OUTPUT: boolean
  
  RETURN containsBengaliUnicode(input)
         AND (containsVowelSigns(input) OR containsConsonantsWithSpecificSequences(input))
         AND (vowelSignsRenderedIncorrectly(input) OR spuriousHasantaAppears(input))
END FUNCTION

WHERE:
  containsBengaliUnicode(input) = input matches /[\u0980-\u09FF]/
  containsVowelSigns(input) = input contains vowel sign code points like \u09BF (ি)
  spuriousHasantaAppears(input) = rendered output contains hasanta (্) not present in normalized input
  vowelSignsRenderedIncorrectly(input) = vowel signs appear separated from their base consonants
```

### Examples

**Vowel Sign Misplacement:**
- Input: "বই" (book)
- Expected: "বই" (with ই positioned correctly)
- Actual: "ব্ই" (hasanta appears, vowel sign separated)

**Spurious Hasanta Before Consonants:**
- Input: "এক" (one)
- Expected: "এক"
- Actual: "্এক" (hasanta incorrectly inserted before এ)

**Multiple Errors in Sentence:**
- Input: "একটি ভালো বই পড়া মানে অন্য এক জগতে প্রবেশ করা।"
- Expected: "একটি ভালো বই পড়া মানে অন্য এক জগতে প্রবেশ করা।"
- Actual: "্একটি ভালো ব্ই পড়া মানে অন্য ্এক জগতে প্রবেশ করা।"

**Edge Case - Text Without Vowel Signs:**
- Input: "ক খ গ" (consonants only)
- Expected: Should render correctly (preservation case)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- English text processing and display must continue to work correctly in /no-marking mode
- Bengali Unicode text without vowel signs (only consonants and independent vowels) must continue to display correctly
- Bengali Unicode conjuncts (যুক্তাক্ষর) like "স্ক", "ন্ত", "ক্ষ" must continue to be rendered correctly
- Bengali reph (র-ফলা) rendering must continue to work correctly (e.g., "বর্তমান", "ধর্ম")
- Language switching (English ↔ Bengali) must continue to function correctly
- Duration selection and source reloading must continue to work correctly
- Timer, WPM calculation, and accuracy statistics must continue to work correctly
- All other typing test functionality (ticker mode, passage mode, custom typing) must remain unaffected

**Scope:**
All inputs that do NOT involve Bengali Unicode text with vowel signs or the specific consonant sequences triggering spurious hasanta should be completely unaffected by this fix. This includes:
- All English text input
- Bengali text without vowel signs
- Bengali conjuncts and reph (which already work correctly)
- Non-text UI interactions (button clicks, settings changes)

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Incorrect Combining Mark Detection**: The `isBengaliCombiningMark` function in `grapheme-splitter.js` may be incorrectly classifying certain vowel signs or failing to properly handle their code point ranges, causing vowel signs to be split from their base consonants.

2. **Grapheme Splitting Logic Error**: The `splitBengaliGraphemes` function may have incorrect logic for collecting combining marks after a base character, potentially:
   - Stopping collection too early for vowel signs
   - Incorrectly treating independent vowels as combining marks
   - Failing to handle the ordering of certain vowel signs

3. **Text Normalization Issue**: The `normalizeText` function may be applying transformations that corrupt Bengali text:
   - Incorrectly removing or adding ZWJ characters that affect vowel sign positioning
   - Applying NFC normalization in a way that reorders vowel signs incorrectly
   - Converting certain character sequences that should remain unchanged

4. **Character Sequence Handling**: The bug condition suggests that certain consonant sequences trigger spurious hasanta insertion, indicating:
   - The grapheme splitter may be inserting hasanta during cluster formation
   - The normalization process may be treating certain character sequences as requiring hasanta
   - Display logic may be adding hasanta when rendering incomplete clusters

## Correctness Properties

Property 1: Bug Condition - Correct Bengali Unicode Rendering

_For any_ Bengali Unicode text containing vowel signs or consonants, when typed in /no-marking mode, the fixed text processing functions SHALL correctly normalize and split the text such that vowel signs remain attached to their base consonants and no spurious hasanta characters are inserted, resulting in accurate display matching the user's input.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Non-Buggy Input Behavior

_For any_ text that does NOT trigger the bug condition (English text, Bengali text without vowel signs, Bengali conjuncts with reph), the fixed text processing functions SHALL produce exactly the same normalization and grapheme splitting results as the original functions, preserving all existing correct functionality for timer operation, WPM calculation, accuracy statistics, language switching, and mode selection.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct, the fix will focus on the text processing functions:

**Primary File**: `lib/unicode/grapheme-splitter.js`

**Function**: `isBengaliCombiningMark` and `splitBengaliGraphemes`

**Specific Changes**:

1. **Review and Correct Combining Mark Detection**:
   - Verify that vowel sign code point ranges in `isBengaliCombiningMark` are complete and accurate
   - Ensure independent vowels (U+0985-U+0994) are NOT treated as combining marks
   - Verify that vowel signs (U+09BE-U+09C8, U+09CB-U+09CC) ARE correctly identified as combining marks
   - Confirm hasanta (U+09CD) is correctly handled in conjunct context but not spuriously added

2. **Fix Grapheme Cluster Formation Logic**:
   - Review the while loop in `splitBengaliGraphemes` that collects combining marks
   - Ensure it correctly groups all vowel signs with their base consonant in a single cluster
   - Verify that the loop doesn't terminate prematurely when encountering certain vowel signs
   - Ensure the base character selection correctly identifies consonants vs independent vowels

3. **Verify Text Normalization Behavior**:
   - Confirm `normalizeText` in `text-normalizer.js` correctly preserves ZWJ for reph conjuncts
   - Verify NFC normalization doesn't reorder vowel signs incorrectly
   - Ensure no transformations add or remove characters that affect vowel sign positioning

4. **Test Character Sequence Handling**:
   - Identify which consonant sequences trigger spurious hasanta (e.g., words starting with independent vowels like "এক")
   - Determine if the issue is in grapheme splitting or display rendering
   - Fix the logic that incorrectly treats these sequences as requiring hasanta

**Secondary File**: `lib/unicode/text-normalizer.js`

**Function**: `normalizeText`

**Specific Changes**:
1. Review ZWJ handling for Bengali text - ensure preservation is working correctly
2. Verify NFC normalization doesn't corrupt vowel sign sequences
3. Confirm danda normalization doesn't interfere with vowel signs

**Tertiary File**: `lib/unicode/bengali-normalizer.js`

**Function**: `normalizeUnicodeBengaliForComparison`

**Specific Changes**:
1. Verify that comparison normalization preserves vowel sign integrity
2. Ensure reph normalization doesn't affect vowel signs
3. Confirm the function correctly handles text with multiple vowel signs

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that process Bengali Unicode text with vowel signs and consonant sequences through the normalization and grapheme splitting functions. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Vowel Sign Test**: Process "বই" and verify grapheme splitting keeps "ব" and "ই" together (will fail on unfixed code - likely splits incorrectly)
2. **Spurious Hasanta Test**: Process "এক" and verify no hasanta appears in output (will fail on unfixed code - hasanta appears)
3. **Full Sentence Test**: Process "একটি ভালো বই পড়া মানে অন্য এক জগতে প্রবেশ করা।" and verify correct rendering (will fail on unfixed code - multiple errors)
4. **Edge Case - Conjunct Test**: Process "স্কুল" to verify conjuncts still work (should pass on unfixed code - this is preservation)

**Expected Counterexamples**:
- Vowel signs being split from their base consonants into separate grapheme clusters
- Hasanta characters appearing in normalized or split text where they don't exist in input
- Possible causes: incorrect code point ranges in `isBengaliCombiningMark`, premature loop termination in `splitBengaliGraphemes`, incorrect NFC normalization, character sequence mishandling

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  normalizedText := normalizeText_fixed(input, "bn", false)
  graphemes := splitBengaliGraphemes_fixed(normalizedText)
  ASSERT vowelSignsAttachedCorrectly(graphemes)
  ASSERT noSpuriousHasanta(graphemes)
  ASSERT displayRendersCorrectly(graphemes)
END FOR
```

**Test Cases**:
1. Verify "বই" renders as "বই" (no hasanta, vowel sign positioned correctly)
2. Verify "এক" renders as "এক" (no spurious hasanta)
3. Verify full sentence renders correctly without any position or hasanta errors
4. Verify various vowel signs (ি, া, ে, ো, ু, ূ) all render correctly with their consonants

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT normalizeText_original(input, lang, false) = normalizeText_fixed(input, lang, false)
  ASSERT splitGraphemes_original(input, lang, false) = splitGraphemes_fixed(input, lang, false)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for English text, Bengali conjuncts, and reph, then write property-based tests capturing that behavior.

**Test Cases**:
1. **English Text Preservation**: Observe that English text like "The quick brown fox" normalizes and splits correctly, then verify this continues after fix
2. **Bengali Conjunct Preservation**: Observe that "স্কুল", "ন্তু", "ক্ষ" render correctly on unfixed code, then verify preservation
3. **Reph Preservation**: Observe that "বর্তমান", "ধর্ম" render reph correctly on unfixed code, then verify preservation
4. **Independent Vowel Preservation**: Observe that "আ", "ই", "উ", "এ", "ও" render correctly on unfixed code, then verify preservation
5. **Timer and Stats Preservation**: Verify WPM, accuracy, and timer calculations remain unchanged

### Unit Tests

- Test `isBengaliCombiningMark` with all vowel sign code points to verify correct classification
- Test `splitBengaliGraphemes` with strings containing various vowel signs and verify clustering
- Test `normalizeText` with Bengali Unicode to verify NFC and ZWJ handling
- Test edge cases: empty strings, single characters, long sentences, mixed English-Bengali

### Property-Based Tests

- Generate random Bengali Unicode strings with vowel signs and verify correct grapheme splitting
- Generate random English strings and verify normalization/splitting is unchanged from original
- Generate random Bengali conjunct strings and verify preservation of existing behavior
- Test across many Unicode code points in Bengali range to ensure no regression

### Integration Tests

- Test full /no-marking typing flow with Bengali Unicode sentences containing vowel signs
- Test language switching between English and Bengali to verify no interference
- Test duration changes and source reloading with Bengali text
- Test ticker and passage display modes with corrected Bengali text
- Verify WPM and accuracy calculations remain correct after text processing fix
