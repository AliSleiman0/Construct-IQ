'use client';

import { useEffect } from 'react';

const WORDS = ['progress', 'control', 'clarity', 'momentum'];

export function Typewriter() {
  useEffect(() => {
    const tw = document.getElementById('typewriter-target');
    if (!tw) return;
    let wi = 0,
      ci = 0,
      deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    function step() {
      if (!tw) return;
      const word = WORDS[wi];
      if (!deleting) {
        tw.textContent = word.slice(0, ++ci);
        if (ci === word.length) {
          deleting = true;
          timer = setTimeout(step, 1800);
          return;
        }
        timer = setTimeout(step, 90);
      } else {
        tw.textContent = word.slice(0, --ci);
        if (ci === 0) {
          deleting = false;
          wi = (wi + 1) % WORDS.length;
          timer = setTimeout(step, 300);
          return;
        }
        timer = setTimeout(step, 55);
      }
    }
    timer = setTimeout(step, 800);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
