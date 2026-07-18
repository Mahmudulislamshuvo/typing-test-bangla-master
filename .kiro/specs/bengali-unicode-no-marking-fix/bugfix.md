# Bugfix Requirements Document

## Introduction

The /no-marking typing mode is experiencing incorrect rendering of Bengali Unicode text. Specifically, vowel signs (মাত্রা) are being misplaced and spurious hasanta characters (্) are appearing before consonants, corrupting the displayed text. This bug affects users trying to practice typing Bengali Unicode text in the /no-marking mode, which is supposed to support both Unicode Bengali and English input.

The bug manifests in two primary ways:
1. Vowel signs appearing in incorrect positions (e.g., "বই" becomes "ব্ই")
2. Extra hasanta characters appearing before consonants (e.g., "এক" becomes "্এক")

This bugfix ensures Bengali Unicode text is correctly processed, normalized, and displayed in /no-marking mode while preserving the existing correct behavior for English text.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN Bengali Unicode text containing vowel signs like "ি" (hrasva-i) is typed in /no-marking mode THEN the system incorrectly renders the vowel sign (e.g., "বই" displays as "ব্ই")

1.2 WHEN Bengali Unicode text containing consonants preceded by specific character sequences is typed in /no-marking mode THEN the system incorrectly inserts spurious hasanta characters before consonants (e.g., "এক" displays as "্এক")

1.3 WHEN Bengali Unicode text "একটি ভালো বই পড়া মানে অন্য এক জগতে প্রবেশ করা।" is typed in /no-marking mode THEN the system displays "্একটি ভালো ব্ই পড়া মানে অন্য ্এক জগতে প্রবেশ করা।" with multiple rendering errors

### Expected Behavior (Correct)

2.1 WHEN Bengali Unicode text containing vowel signs like "ি" (hrasva-i) is typed in /no-marking mode THEN the system SHALL correctly render the vowel sign in its proper position (e.g., "বই" displays as "বই")

2.2 WHEN Bengali Unicode text containing consonants is typed in /no-marking mode THEN the system SHALL NOT insert spurious hasanta characters (e.g., "এক" displays as "এক")

2.3 WHEN Bengali Unicode text "একটি ভালো বই পড়া মানে অন্য এক জগতে প্রবেশ করা।" is typed in /no-marking mode THEN the system SHALL display it correctly as "একটি ভালো বই পড়া মানে অন্য এক জগতে প্রবেশ করা।"

### Unchanged Behavior (Regression Prevention)

3.1 WHEN English text is typed in /no-marking mode THEN the system SHALL CONTINUE TO process and display English text correctly

3.2 WHEN Bengali Unicode text without vowel signs (only consonants and independent vowels) is typed in /no-marking mode THEN the system SHALL CONTINUE TO process and display such text correctly

3.3 WHEN Bengali Unicode text containing conjuncts (যুক্তাক্ষর) like "স্ক" is typed in /no-marking mode THEN the system SHALL CONTINUE TO handle conjunct formation correctly

3.4 WHEN Bengali Unicode text containing reph (র-ফলা) is typed in /no-marking mode THEN the system SHALL CONTINUE TO render reph correctly

3.5 WHEN users switch languages or duration settings in /no-marking mode THEN the system SHALL CONTINUE TO reload the typing source correctly

3.6 WHEN the typing test timer completes in /no-marking mode THEN the system SHALL CONTINUE TO calculate WPM and accuracy statistics correctly
