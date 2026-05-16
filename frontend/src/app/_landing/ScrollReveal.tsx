'use client';

import { useEffect } from 'react';

export function ScrollReveal() {
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    const revealObs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            revealObs.unobserve(e.target);
          }
        }),
      { threshold: 0.1 },
    );
    revealEls.forEach((el) => revealObs.observe(el));
    observers.push(revealObs);

    const bars = document.querySelectorAll('.bar-fill');
    const barObs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('filled');
            barObs.unobserve(e.target);
          }
        }),
      { threshold: 0.5 },
    );
    bars.forEach((b) => barObs.observe(b));
    observers.push(barObs);

    function animateCount(el: Element, target: number, suffix: string, duration: number) {
      let start: number | null = null;
      const step = (ts: number) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const val = Math.floor(eased * target);
        el.textContent = suffix === '.9%' ? `${val}.9%` : `${val}${suffix}`;
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = suffix === '.9%' ? `${target}.9%` : `${target}${suffix}`;
      };
      requestAnimationFrame(step);
    }
    const statEls = document.querySelectorAll('.stat-val');
    const statObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement;
            animateCount(el, parseInt(el.dataset.count ?? '0'), el.dataset.suffix ?? '', 1800);
            statObs.unobserve(el);
          }
        });
      },
      { threshold: 0.5 },
    );
    statEls.forEach((el) => statObs.observe(el));
    observers.push(statObs);

    // Dashboard counters fire once on mount, no scroll trigger (matches old behavior)
    function dashCount(id: string, target: number, suffix: string, duration: number) {
      const el = document.getElementById(id);
      if (!el) return;
      let start: number | null = null;
      const step = (ts: number) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        const v = Math.floor((1 - Math.pow(1 - p, 3)) * target);
        el.textContent = suffix ? `${v}${suffix}` : String(v);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = `${target}${suffix}`;
      };
      setTimeout(() => requestAnimationFrame(step), 600);
    }
    dashCount('dash-projects', 14, '', 1400);
    dashCount('dash-tasks', 237, '', 1600);
    dashCount('dash-budget', 68, '%', 1500);

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return null;
}
