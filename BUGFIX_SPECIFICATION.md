# Typing Test Bangla - Bug Fix & Code Refactoring Specification

**তারিখ:** 2024
**প্রজেক্ট:** Bilingual Typing Test (English + Bengali)
**সমস্যার ধরন:** Unicode Bengali Reph (র-ফলা) Rendering Bug + Code Organization

---

## 🔴 মূল সমস্যা (Critical Bug)

### সমস্যার বর্ণনা
শুধুমাত্র **Unicode mode** এ বাংলা টাইপ করার সময় **রেফ (র-ফলা)** সঠিকভাবে রেন্ডার হচ্ছে না।

#### উদাহরণ:
- **টাইপ করলে:** `বর্তমান` (র-ফলা সহ)
- **UI তে দেখায়:** `বরমান` (র-ফলা হারিয়ে যায়)
- **কপি করে দেখলে:** `বব্তমান` (ভুল ক্যারেক্টার)

#### সমস্যার কারণ:
1. **NFC Normalization সমস্যা**: র-ফলা (্র) সঠিকভাবে normalize হচ্ছে না
2. **Grapheme Segmentation সমস্যা**: `Intl.Segmenter` Bengali conjunct characters (যুক্তাক্ষর) কে ভুলভাবে ভাঙছে
3. **Zero-Width Joiner (ZWJ) handling**: র-ফলার জন্য প্রয়োজনীয় ZWJ characters মুছে ফেলা হচ্ছে

---

## 📂 প্রজেক্ট স্ট্রাকচার বিশ্লেষণ

### Routes এবং তাদের কাজ

#### 1. **`/` (Home Route)** - `app/page.js`
- **Purpose**: মূল টাইপিং টেস্ট পেজ
- **Input Mode**: Unicode (Default)
- **Languages**: English + বাংলা
- **Features**: 
  - Remote data source (JSON files থেকে passages লোড)
  - Timer-based tests (1-20 minutes)
  - WPM, Accuracy tracking
  - Target text visible

#### 2. **`/custom-typing`** - `app/custom-typing/page.js`
- **Purpose**: কাস্টম টেক্সট দিয়ে টাইপিং অনুশীলন
- **Input Mode**: Unicode
- **Languages**: Auto-detect (English/বাংলা)
- **Features**:
  - User provides custom text
  - Target text hidden during typing
  - Unlimited duration option
  - Pass/Fail result

#### 3. **`/classic`** - `app/classic/page.js`
- **Purpose**: Bijoy Classic (SutonnyMJ) input support
- **Input Mode**: Bijoy Classic (ANSI-based)
- **Languages**: শুধুমাত্র বাংলা
- **Features**:
  - ANSI to Unicode conversion
  - Classic font support
  - Custom text input
  - Special normalization for Bijoy artifacts

#### 4. **`/disappearing`** - `app/disappearing/page.js`
- **Purpose**: Disappearing text mode (hard difficulty)
- **Input Mode**: Unicode
- **Languages**: English + বাংলা
- **Features**:
  - Text disappears after showing briefly
  - Memory-based typing

#### 5. **`/no-marking`** - `app/no-marking/page.js`
- **Purpose**: No real-time feedback mode
- **Input Mode**: Unicode
- **Features**:
  - Hide target highlights
  - Results shown only after completion

---

## 🐛 সমস্যার বিস্তারিত বিশ্লেষণ

### Code Locations যেখানে Bug আছে:

#### 1. **`components/typing-test-client.js`** (Lines 23-41)
```javascript
function normalizeText(text, lang, isClassic = false) {
  let normalized = (text || "").normalize("NFC");
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, ""); // ❌ PROBLEM: ZWJ মুছে ফেলছে
  normalized = normalized.replace(/[\u00A0\u202F]/g, " ");
  // ...
}
```

**সমস্যা:** 
- `\u200B-\u200D` range এ `\u200D` (Zero-Width Joiner) আছে যা র-ফলার জন্য প্রয়োজনীয়
- এটি মুছে ফেলায় `র্` (র + হসন্ত) আলাদা হয়ে যাচ্ছে

#### 2. **`components/typing-test-client.js`** (Lines 47-56)
```javascript
function normalizeUnicodeBengaliForComparison(text) {
  const normalized = normalizeText(text, "bn", false);
  if (!normalized) return "";
  return normalized
    .replace(/\u09AF\u09BC/g, "\u09DF") // য + ় → য়
    .replace(/\u09A1\u09BC/g, "\u09DC") // ড + ় → ড়
    .replace(/\u09A2\u09BC/g, "\u09DD"); // ঢ + ় → ঢ়
  // ❌ MISSING: র-ফলা normalization নেই
}
```

**সমস্যা:**
- র-ফলা (্র) এর জন্য কোনো normalization rule নেই
- `\u09B0\u09CD` (র + হসন্ত) → রেফ conversion handling নেই

#### 3. **`components/typing-test-client.js`** (Lines 133-140)
```javascript
function splitGraphemes(text, locale, isClassic = false) {
  const cleanText = normalizeText(text, locale, isClassic);
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(locale, { granularity: "grapheme" });
    return Array.from(segmenter.segment(cleanText), (x) => x.segment);
  }
  return Array.from(cleanText);
}
```

**সমস্যা:**
- `Intl.Segmenter` Bengali র-ফলা কে সঠিকভাবে একটা grapheme হিসেবে চিনতে পারছে না
- Fallback `Array.from()` ও যুক্তাক্ষর ভাঙছে

#### 4. **`lib/typing-utils.js`** (Duplicate code)
- Same functions duplicated here
- No centralized Unicode handling

---

## 🔧 প্রয়োজনীয় পরিবর্তন

### Priority 1: র-ফলা Bug Fix (CRITICAL)

#### Changes in `components/typing-test-client.js`:

**1. Fix `normalizeText()` function:**
```javascript
function normalizeText(text, lang, isClassic = false) {
  let normalized = (text || "").normalize("NFC");
  
  // ✅ FIX: Don't remove ZWJ for Bengali
  if (lang === "bn" || /[\u0980-\u09FF]/.test(normalized)) {
    // Keep ZWJ (\u200D) for Bengali conjuncts
    normalized = normalized.replace(/[\u200B\u200C\uFEFF]/g, "");
  } else {
    normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, "");
  }
  
  normalized = normalized.replace(/[\u00A0\u202F]/g, " ");
  if (isClassic) return normalized;
  normalized = normalized.replace(/[\u2018\u2019\u201B\u2032]/g, "'");
  normalized = normalized.replace(/[\u201C\u201D\u2033]/g, '"');
  normalized = normalized.replace(/[\u2012\u2013\u2014\u2212]/g, "-");
  normalized = normalized.replace(/\u2026/g, "...");
  
  if (lang === "bn" || /[\u0980-\u09FF]/.test(normalized)) {
    return normalized
      .replace(/\|/g, "।")
      .replace(/\\/g, "।")
      .replace(/\u0965/g, "।");
  }
  return normalized;
}
```

**2. Add Reph handling in `normalizeUnicodeBengaliForComparison()`:**
```javascript
function normalizeUnicodeBengaliForComparison(text) {
  const normalized = normalizeText(text, "bn", false);
  if (!normalized) return "";
  
  // ✅ NEW: Handle র-ফলা (reph) properly
  // র + হসন্ত before consonant = reph (shows above)
  // Ensure consistent representation
  let result = normalized
    .replace(/\u09AF\u09BC/g, "\u09DF") // য + ় → য়
    .replace(/\u09A1\u09BC/g, "\u09DC") // ড + ় → ড়
    .replace(/\u09A2\u09BC/g, "\u09DD"); // ঢ + ় → ঢ়
  
  // ✅ NEW: Normalize different reph representations
  // Method 1: র্ + consonant (র + hasanta + consonant)
  // Method 2: consonant + reph mark (\u09B0\u09CD before = reph after in display)
  // Keep them as-is but ensure NFC composition
  result = result.normalize("NFC");
  
  return result;
}
```

**3. Improve `splitGraphemes()` for Bengali:**
```javascript
function splitGraphemes(text, locale, isClassic = false) {
  const cleanText = normalizeText(text, locale, isClassic);
  
  // ✅ ENHANCED: Better Bengali grapheme handling
  if ((locale === "bn" || /[\u0980-\u09FF]/.test(cleanText)) && !isClassic) {
    // Custom Bengali grapheme cluster splitting
    return splitBengaliGraphemes(cleanText);
  }
  
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(locale, { granularity: "grapheme" });
    return Array.from(segmenter.segment(cleanText), (x) => x.segment);
  }
  return Array.from(cleanText);
}

// ✅ NEW: Custom Bengali grapheme splitter
function splitBengaliGraphemes(text) {
  const graphemes = [];
  let i = 0;
  
  while (i < text.length) {
    let cluster = text[i];
    i++;
    
    // Collect combining marks (vowel signs, hasanta, etc.)
    while (i < text.length && isBengaliCombiningMark(text.codePointAt(i))) {
      cluster += text[i];
      i++;
    }
    
    graphemes.push(cluster);
  }
  
  return graphemes;
}

// ✅ NEW: Check if character is Bengali combining mark
function isBengaliCombiningMark(codePoint) {
  return (
    (codePoint >= 0x09BC && codePoint <= 0x09CD) || // nukta, hasanta
    (codePoint >= 0x09D7 && codePoint <= 0x09D7) || // au length mark
    (codePoint >= 0x09BE && codePoint <= 0x09C4) || // vowel signs
    (codePoint >= 0x09C7 && codePoint <= 0x09C8) || // e, ai
    (codePoint >= 0x09CB && codePoint <= 0x09CC) || // o, au
    (codePoint >= 0x09E2 && codePoint <= 0x09E3) || // vocalic l, ll
    codePoint === 0x200D // ZWJ for conjuncts
  );
}
```

### Priority 2: Code Organization & Refactoring

#### Issues:
1. **Duplicate Code**: Same functions in `components/typing-test-client.js` and `lib/typing-utils.js`
2. **Large File**: `typing-test-client.js` is 2141 lines - needs splitting
3. **Mixed Concerns**: Unicode handling, UI logic, state management all mixed

#### Refactoring Plan:

**Create new file structure:**

```
lib/
├── unicode/
│   ├── bengali-normalizer.js      (Bengali Unicode handling)
│   ├── grapheme-splitter.js       (Grapheme segmentation)
│   └── text-normalizer.js         (General text normalization)
├── classic/
│   ├── bijoy-converter.js         (Bijoy ANSI → Unicode)
│   └── classic-normalizer.js      (Classic mode normalization)
├── comparison/
│   ├── word-aligner.js            (Edit distance algorithm)
│   └── word-comparator.js         (Word comparison logic)
└── typing-utils.js                (Re-exports from above)

components/
├── typing/
│   ├── TypingTestCore.js          (Main logic, state management)
│   ├── TypingInput.js             (Input field component)
│   ├── TypingDisplay.js           (Target text display)
│   ├── TypingStats.js             (WPM, Accuracy display)
│   └── TypingReport.js            (Final report)
└── typing-test-client.js          (Wrapper, combines above)
```

**Benefits:**
1. ✅ প্রতিটি file ছোট এবং focused
2. ✅ Duplicate code eliminated
3. ✅ Easy to test individual functions
4. ✅ Clear separation of concerns
5. ✅ Reusable modules

---

## 🧪 Testing Requirements

### Test Cases for র-ফলা Bug:

#### Test 1: Basic Reph Rendering
```javascript
Input:  "বর্তমান"
Expected Display: "বর্তমান" (with reph visible)
Expected Copy: "বর্তমান" (same as display)
```

#### Test 2: Multiple Rephs
```javascript
Input:  "কর্ম কর্তা বর্জন"
Expected: All rephs rendered correctly
```

#### Test 3: Reph vs Ref Distinction
```javascript
Input (Reph):  "কর্ম" (র before ক, shows as reph above ক)
Input (Ref):   "ক্র" (র after ক, shows as leg below ক)
Expected: Both rendered distinctly and correctly
```

#### Test 4: Comparison Accuracy
```javascript
Typed:  "বর্তমান"
Target: "বর্তমান"
Expected: Marked as CORRECT (not incorrect due to normalization mismatch)
```

### Test Cases for Each Route:

**1. Main Route (`/`) - Unicode Mode**
- English typing works
- Bengali typing works (including র-ফলা)
- Language switching works
- Duration options work
- Data loads from JSON

**2. Custom Typing (`/custom-typing`)**
- Custom Bengali text with র-ফলা displays correctly
- Language auto-detection works
- Hidden target text during typing
- Pass/Fail result accurate

**3. Classic Route (`/classic`)**
- Bijoy input converts correctly
- SutonnyMJ font displays
- ANSI artifacts handled
- No interference with Unicode র-ফলা logic

**4. Disappearing Mode (`/disappearing`)**
- Bengali র-ফলা visible during brief display
- Comparison after typing accurate

---

## 📝 Implementation Checklist

### Phase 1: Critical Bug Fix (র-ফলা)
- [ ] Update `normalizeText()` - preserve ZWJ for Bengali
- [ ] Add reph handling in `normalizeUnicodeBengaliForComparison()`
- [ ] Implement custom `splitBengaliGraphemes()`
- [ ] Add `isBengaliCombiningMark()` helper
- [ ] Test on all 5 routes
- [ ] Verify copy-paste shows correct text
- [ ] Verify comparison accuracy

### Phase 2: Code Refactoring
- [ ] Create `lib/unicode/` directory
- [ ] Extract Bengali normalization → `bengali-normalizer.js`
- [ ] Extract grapheme splitting → `grapheme-splitter.js`
- [ ] Extract text normalization → `text-normalizer.js`
- [ ] Create `lib/classic/` directory
- [ ] Extract Bijoy converter → `bijoy-converter.js`
- [ ] Create `lib/comparison/` directory
- [ ] Extract word alignment → `word-aligner.js`
- [ ] Update all imports
- [ ] Remove duplicate code from `lib/typing-utils.js`
- [ ] Split `typing-test-client.js` into smaller components
- [ ] Update all route files to use new imports

### Phase 3: Testing & Documentation
- [ ] Write unit tests for Bengali normalization
- [ ] Write unit tests for grapheme splitting
- [ ] Write integration tests for each route
- [ ] Update README.md with architecture
- [ ] Add inline code comments
- [ ] Document Unicode handling strategy
- [ ] Add troubleshooting guide

### Phase 4: Code Quality
- [ ] Run ESLint and fix warnings
- [ ] Format with Prettier
- [ ] Remove console.logs (or use proper logging)
- [ ] Add TypeScript types (optional but recommended)
- [ ] Performance optimization if needed

---

## 🎯 Expected Outcomes

### After Bug Fix:
✅ "বর্তমান" correctly displays and compares
✅ All Bengali conjuncts with র-ফলা work
✅ Copy-paste shows correct Unicode
✅ Typing accuracy calculation is correct

### After Refactoring:
✅ Codebase is organized and maintainable
✅ No duplicate code
✅ Each file has single responsibility
✅ Easy to add new features
✅ Easy to debug issues
✅ Clear code structure for new developers

---

## 🚨 Important Notes

### DO NOT:
❌ Remove NFC normalization (it's essential)
❌ Change Classic mode logic (it's separate concern)
❌ Break existing English typing functionality
❌ Change API routes or database schema
❌ Modify CSS/styling (unless needed for fix)

### DO:
✅ Preserve backward compatibility
✅ Test on multiple browsers
✅ Test on mobile devices
✅ Keep Classic and Unicode modes separate
✅ Document all Unicode edge cases
✅ Add comments explaining complex Unicode logic

---

## 📚 Reference Materials

### Bengali Unicode Resources:
- Bengali Unicode Range: `U+0980` - `U+09FF`
- Hasanta (Virama): `U+09CD`
- Zero-Width Joiner (ZWJ): `U+200D`
- Reph Formation Rules: র + ্ + consonant
- Ref Formation Rules: consonant + ্ + র

### Unicode Normalization:
- NFC: Canonical Composition (ব + ◌্ + র → ব্র)
- NFD: Canonical Decomposition (ব্র → ব + ◌্ + র)
- Use NFC for display and comparison

### Testing Tools:
- Unicode Inspector: unicode-table.com
- Bengali Typing: google.com/inputtools
- Shapecatcher: shapecatcher.com (identify unknown chars)

---

## 🎉 Summary

এই ডকুমেন্টে আপনার প্রজেক্টের:
1. **মূল বাগ** (র-ফলা rendering) এর কারণ ও সমাধান দেওয়া হয়েছে
2. **সব routes** এর কাজ ব্যাখ্যা করা হয়েছে
3. **Code organization** সমস্যা চিহ্নিত করা হয়েছে
4. **Step-by-step fix** প্রদান করা হয়েছে
5. **Testing checklist** দেওয়া হয়েছে
6. **Refactoring plan** তৈরি করা হয়েছে

এই ডকুমেন্ট z.ai বা যেকোনো AI agent কে দিয়ে সম্পূর্ণ fix করাতে পারবেন। প্রতিটি step স্পষ্টভাবে বর্ণনা করা আছে।

---

**ডকুমেন্ট শেষ** ✅
