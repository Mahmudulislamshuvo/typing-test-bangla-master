const fs = require('fs');
const code = fs.readFileSync('components/typing-test-client.js', 'utf8');

const newFunc = unction handleTypingChange(event) {
    if (isFinished || isLoadingSource || loadError) return;

    let value = event.target.value.trimStart();
    const now = performance.now();

    let timeDelta = 0;
    if (lastTypingTimeRef.current !== null) {
      timeDelta = now - lastTypingTimeRef.current;
    }
    lastTypingTimeRef.current = now;

    if (!isRunning && value.length > 0) {
      setIsRunning(true);
    }

    const wordsNow = splitStrictWords(value, locale, false);
    const endsWithSpace = event.target.value.endsWith(" ");
    
    // Determine the currentIndex of the active word (consider if the input ends with a space).
    const targetLength =
      value === "" ? 0 : endsWithSpace ? wordsNow.length + 1 : wordsNow.length; 
    const currentIndex = targetLength > 0 ? targetLength - 1 : 0;

    setWordTimings((prev) => {
      let next = [...prev];

      // Expand the array to match the target length
      while (next.length < targetLength) {
        next.push({
          word: "",
          durationMs: 0,
        });
      }

      // Apply correct word strings to each completed block
      for (let i = 0; i < wordsNow.length; i++) {
        if (next[i]) {
          next[i].word = wordsNow[i];
        }
      }

      // Inside setWordTimings, simply accumulate the timeDelta into the active word's durationMs
      if (next[currentIndex] && !endsWithSpace) {
        next[currentIndex].durationMs += timeDelta;
      }

      // Important Backspace Handling: If the user backspaces and deletes entire words
      // loop through all indices after the currentIndex and reset their word to "" and durationMs to 0
      for (let i = currentIndex + 1; i < next.length; i++) {
        if (next[i]) {
          next[i].word = "";
          next[i].durationMs = 0;
        }
      }

      return next;
    });

    setTypedText(event.target.value);
  };

const oldFunc = fs.readFileSync('match.txt', 'utf8');

if (code.includes(oldFunc)) {
  const newCode = code.replace(oldFunc, newFunc);
  fs.writeFileSync('components/typing-test-client.js', newCode);
  console.log('Replaced successfully!');
} else {
  console.log('Failed to find oldFunc in code!');
}
