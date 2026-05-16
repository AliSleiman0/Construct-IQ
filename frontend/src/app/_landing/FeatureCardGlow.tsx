'use client';

import { useEffect } from 'react';

export function FeatureCardGlow() {
  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>('.feature-card');
    const handlers: Array<[HTMLElement, (e: MouseEvent) => void]> = [];
    cards.forEach((card) => {
      const handler = (e: MouseEvent) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
      };
      card.addEventListener('mousemove', handler);
      handlers.push([card, handler]);
    });
    return () => handlers.forEach(([card, h]) => card.removeEventListener('mousemove', h));
  }, []);
  return null;
}
