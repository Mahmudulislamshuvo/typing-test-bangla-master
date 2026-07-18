# Bugfix Requirements Document

## Introduction

This bugfix addresses critical Unicode rendering issues in the Bengali/English typing test application. The primary bug involves incorrect handling of Bengali ref (র-ফলা) characters, where complex conjuncts (যুক্তাক্ষর) are not rendered correctly. When users type words containing ref/reph characters (such as "বর্তমান"), the display shows incorrect character placement, breaking visual accuracy and comparison logic.

**Impact:**

- Bengali Unicode words with ref (্র) are displayed incorrectly in the UI
- When copied, the same words show different incorrect forms
- The ref character (্র) placement is broken - typing র্ + base character shows only র্ instead of the base character with ref on top
- Bijoy Classic mode also exhibits rendering issues for certain words
- This affects all routes: `/` (Unicode mode), `/custom-typing`, `/disappearing`, and `/classic` (Bijoy Classic mode)

**Root Cause:**
The normalization functions (`normalizeUnicodeBengaliForComparison`, `normalizeText`) do not properly handle Bengali complex conjuncts that involve reordering modifiers (ref, reph, and other combining marks). The current implementation only handles basic Unicode equivalences but fails to normalize grapheme clusters that require positional reordering.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user types a Bengali Unicode word containing ref (্র) such as "বর্তমান" (bartoman) in Unicode mode (`/`, `/custom-typing`, `/disappearing` routes) THEN the system displays it incorrectly as "বরমান" in the UI

1.2 WHEN a user copies the incorrectly displayed word "বরমান" from the UI THEN the system shows it as "বব্তমান" in the clipboard

1.3 WHEN a user types র্ followed by a base consonant (e.g., র্ + ত to form র্ত) in Unicode mode THEN the system displays only "র্" instead of the base character with ref on top (should show "ত্র")

1.4 WHEN a user types Bengali words in Bijoy Classic mode (`/classic` route) THEN some words render incorrectly due to improper handling of ANSI-to-Unicode conversion artifacts combined with complex conjunct issues

1.5 WHEN the system compares typed Bengali Unicode text against target words using `normalizeUnicodeBengaliForComparison()` THEN complex conjuncts with ref/reph are incorrectly normalized, causing false mismatches

1.6 WHEN the system uses `splitGraphemes()` with `Intl.Segmenter` on Bengali text containing complex conjuncts THEN it may split grapheme clusters incorrectly, breaking visual comparison

1.7 WHEN Bengali words are displayed in passage mode with per-character highlighting THEN complex conjuncts (যুক্তাক্ষর) like "র্চ" in "ভার্চুয়াল" break across `<span>` boundaries, preventing proper OpenType shaping

1.8 WHEN a user types in Unicode mode with words containing য়, ড়, ঢ় (nukta characters) THEN the normalization may fail to canonicalize decomposed forms (য+়) to composed forms (য়)

### Expected Behavior (Correct)

2.1 WHEN a user types "বর্তমান" (bartoman) in Unicode mode THEN the system SHALL display it correctly as "বর্তমান" with the ref character (্র) properly placed on top of ত

2.2 WHEN a user copies the word "বর্তমান" from the UI THEN the system SHALL preserve the correct Unicode sequence so the clipboard contains "বর্তমান"

2.3 WHEN a user types র্ followed by a base consonant (e.g., র্ + ত) in Unicode mode THEN the system SHALL display the correct conjunct form with the base character visible and ref positioned on top (র্ত)

2.4 WHEN a user types Bengali words in Bijoy Classic mode THEN the system SHALL correctly convert ANSI to Unicode AND properly normalize complex conjuncts, displaying all words accurately

2.5 WHEN the system compares typed Bengali Unicode text against target words THEN the system SHALL apply proper Unicode normalization that handles complex conjuncts (যুক্তাক্ষর) including ref (্র), reph (র্), and other reordering marks correctly

2.6 WHEN the system uses `splitGraphemes()` on Bengali text THEN it SHALL treat complex conjuncts as single grapheme clusters, preserving visual integrity for comparison and rendering

2.7 WHEN Bengali words are displayed in passage mode THEN the system SHALL keep entire words within single `<span>` elements to allow proper OpenType font shaping for complex conjuncts

2.8 WHEN a user types nukta characters (য়, ড়, ঢ়) THEN the system SHALL normalize both composed (য়) and decomposed (য+়) forms to the canonical composed form for accurate comparison

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user types simple Bengali Unicode words WITHOUT complex conjuncts (e.g., "বাংলা", "আমি", "তুমি") in Unicode mode THEN the system SHALL CONTINUE TO display and compare them correctly as before

3.2 WHEN a user types English text in any mode THEN the system SHALL CONTINUE TO process it correctly without being affected by Bengali normalization changes

3.3 WHEN a user types Bengali text in Bijoy Classic mode using the SutonnyMJ font with ANSI-to-Unicode conversion for simple conjuncts THEN the system SHALL CONTINUE TO convert and display them correctly

3.4 WHEN the system calculates WPM, accuracy, correct/incorrect words, and stroke counts THEN the system SHALL CONTINUE TO use the same calculation logic without changes

3.5 WHEN the system displays the typing test UI, controls, stats, and reports THEN the system SHALL CONTINUE TO render all UI elements with the same styling and layout

3.6 WHEN a user switches between language options, duration settings, and display modes (passage/ticker) THEN the system SHALL CONTINUE TO handle these controls correctly

3.7 WHEN the system loads typing source data from JSON files (`public/data/bn-*.json`, `en-*.json`) THEN the system SHALL CONTINUE TO load and parse the data correctly

3.8 WHEN the system saves typing test reports to the database THEN the system SHALL CONTINUE TO store all report data fields correctly

3.9 WHEN a user uses the `/no-marking` route or other specialized routes THEN the system SHALL CONTINUE TO function correctly without being affected by normalization changes

3.10 WHEN the system handles zero-width characters (U+200B-U+200D, U+FEFF) and non-breaking spaces THEN the system SHALL CONTINUE TO remove or normalize them as currently implemented
