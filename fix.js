const fs = require('fs');
let content = fs.readFileSync('components/typing-test-client.js', 'utf8');

const original = "    setWordTimings((prev) => {
      let next = [...prev];
      if (newCount > prevCount) {
        const completed = wordsNow.slice(prevCount, newCount);
        const startTime = wordStartTimeRef.current ?? now;
        const entries = completed.map((word) => ({
          word,
          durationMs: Math.max(0, now - startTime),
          endTime: now,
        }));
        next = [...next, ...entries];
      } else if (newCount < prevCount) {
        next = next.slice(0, newCount);
      }

      for (let i = 0; i < newCount; i++) {
        if (next[i] && next[i].word !== wordsNow[i]) {
          next[i] = { ...next[i], word: wordsNow[i] };
        }
      }
      return next;
    });

    if (newCount !== prevCount) {
      wordStartTimeRef.current = now;
    }";

const updated = "    setWordTimings((prev) => {
      let next = [...prev];
      if (newCount > prevCount) {
        const completed = wordsNow.slice(prevCount, newCount);
        const entries = completed.map((word) => ({
          word,
          startTime: wordStartTimeRef.current ?? now,
          durationMs: Math.max(0, now - (wordStartTimeRef.current ?? now)),
          endTime: now,
        }));
        next = [...next, ...entries];
      } else if (newCount < prevCount) {
        next = next.slice(0, newCount);
      }

      for (let i = 0; i < newCount; i++) {
        if (next[i]) {
          if (next[i].word !== wordsNow[i]) {
            next[i] = { ...next[i], word: wordsNow[i] };
          }
          if (i === newCount - 1) {
            const start = next[i].startTime ?? wordStartTimeRef.current ?? now;
            next[i].durationMs = Math.max(0, now - start);
            next[i].endTime = now;
          }
        }
      }
      return next;
    });

    if (newCount !== prevCount) {
      wordStartTimeRef.current = now;
    }";

if (content.includes(original)) {
    content = content.replace(original, updated);
    fs.writeFileSync('components/typing-test-client.js', content);
    console.log('Successfully replaced block.');
} else {
    console.log('Original block not found, check whitespace!');
}
