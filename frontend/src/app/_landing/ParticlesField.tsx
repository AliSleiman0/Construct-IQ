'use client';

import { useEffect } from 'react';

export function ParticlesField() {
  useEffect(() => {
    const container = document.getElementById('particles');
    if (!container) return;
    const created: HTMLElement[] = [];
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 3 + 1;
      p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random() * 100}%;bottom:-10px;opacity:${
        Math.random() * 0.4 + 0.1
      };animation-duration:${Math.random() * 20 + 15}s;animation-delay:${Math.random() * -20}s;`;
      container.appendChild(p);
      created.push(p);
    }
    return () => created.forEach((p) => p.remove());
  }, []);
  return <div id="particles" />;
}
