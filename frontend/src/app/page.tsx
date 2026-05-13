'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import './landing.css';

interface ChatMsg {
  id: number;
  type: 'user' | 'ai' | 'typing';
  text?: string;
  html?: string;
}

const CHAT_DATA = [
  { type: 'user' as const, text: 'What issues were flagged on Riverside Tower this week?' },
  {
    type: 'ai' as const,
    html: '<span style="font-weight:600;color:#fff">3 open issues</span> were flagged this week:<br/><br/><span style="color:#fbbf24">⚠ Concrete pour delay</span> — Phase 3, Deck B<br/><span style="color:#f87171">✗ Missing rebar inspection</span> — Zone 4<br/><span style="color:#fbbf24">⚠ Subcontractor no-show</span> — Electrical<br/><br/>Want me to draft a summary for the PM?',
  },
  { type: 'user' as const, text: 'Yes, include budget impact estimates' },
  {
    type: 'ai' as const,
    html: 'The estimated cost impact is <span style="color:#fbbf24;font-weight:600">$18,400</span> if issues are unresolved by end of week. I\'ve drafted a PM summary — shall I send it?',
  },
];

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const chatTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const chatIdxRef = useRef(0);
  const chatStartedRef = useRef(false);

  // Nav scroll
  useEffect(() => {
    const nav = document.getElementById('nav');
    const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } }),
      { threshold: 0.1 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Progress bars
  useEffect(() => {
    const bars = document.querySelectorAll('.bar-fill');
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('filled'); obs.unobserve(e.target); } }),
      { threshold: 0.5 }
    );
    bars.forEach((b) => obs.observe(b));
    return () => obs.disconnect();
  }, []);

  // Typewriter
  useEffect(() => {
    const words = ['progress', 'control', 'clarity', 'momentum'];
    let wi = 0, ci = 0, deleting = false;
    const tw = document.getElementById('typewriter-target');
    let timer: ReturnType<typeof setTimeout>;
    function step() {
      if (!tw) return;
      const word = words[wi];
      if (!deleting) {
        tw.textContent = word.slice(0, ++ci);
        if (ci === word.length) { deleting = true; timer = setTimeout(step, 1800); return; }
        timer = setTimeout(step, 90);
      } else {
        tw.textContent = word.slice(0, --ci);
        if (ci === 0) { deleting = false; wi = (wi + 1) % words.length; timer = setTimeout(step, 300); return; }
        timer = setTimeout(step, 55);
      }
    }
    timer = setTimeout(step, 800);
    return () => clearTimeout(timer);
  }, []);

  // Stat counters
  useEffect(() => {
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
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const el = e.target as HTMLElement;
          animateCount(el, parseInt(el.dataset.count ?? '0'), el.dataset.suffix ?? '', 1800);
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    statEls.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Dashboard counters
  useEffect(() => {
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
  }, []);

  // Feature card mouse glow
  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>('.feature-card');
    const handlers: Array<[HTMLElement, (e: MouseEvent) => void]> = [];
    cards.forEach((card) => {
      const handler = (e: MouseEvent) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${((e.clientX - r.left) / r.width * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`);
      };
      card.addEventListener('mousemove', handler);
      handlers.push([card, handler]);
    });
    return () => handlers.forEach(([card, h]) => card.removeEventListener('mousemove', h));
  }, []);

  // Particles
  useEffect(() => {
    const container = document.getElementById('particles');
    if (!container) return;
    const created: HTMLElement[] = [];
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 3 + 1;
      p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;bottom:-10px;opacity:${Math.random()*0.4+0.1};animation-duration:${Math.random()*20+15}s;animation-delay:${Math.random()*-20}s;`;
      container.appendChild(p);
      created.push(p);
    }
    return () => created.forEach((p) => p.remove());
  }, []);

  // Chat show class
  useEffect(() => {
    document.querySelectorAll('.chat-msg:not(.show)').forEach((m) =>
      requestAnimationFrame(() => m.classList.add('show'))
    );
  }, [chatMsgs]);

  // AI chat autoplay
  useEffect(() => {
    function runChat() {
      if (chatIdxRef.current >= CHAT_DATA.length) {
        chatTimerRef.current = setTimeout(() => {
          setChatMsgs([]);
          chatIdxRef.current = 0;
          chatTimerRef.current = setTimeout(runChat, 200);
        }, 4000);
        return;
      }
      const msg = CHAT_DATA[chatIdxRef.current++];
      if (msg.type === 'ai') {
        setChatMsgs((prev) => [...prev, { id: Date.now(), type: 'typing' }]);
        chatTimerRef.current = setTimeout(() => {
          setChatMsgs((prev) => [
            ...prev.filter((m) => m.type !== 'typing'),
            { id: Date.now(), type: 'ai', html: msg.html },
          ]);
          chatTimerRef.current = setTimeout(runChat, 1600);
        }, 1400);
      } else {
        setChatMsgs((prev) => [...prev, { id: Date.now(), type: 'user', text: msg.text }]);
        chatTimerRef.current = setTimeout(runChat, 900);
      }
    }

    const aiSection = document.getElementById('ai');
    if (!aiSection) return;
    const aiObs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !chatStartedRef.current) {
        chatStartedRef.current = true;
        runChat();
        aiObs.disconnect();
      }
    }, { threshold: 0.3 });
    aiObs.observe(aiSection);
    return () => {
      aiObs.disconnect();
      if (chatTimerRef.current) clearTimeout(chatTimerRef.current);
    };
  }, []);

  const logoBlock = (shape: React.ReactNode, name: string) => (
    <div className="logo-shimmer flex items-center gap-2.5 opacity-50 hover:opacity-80 transition-opacity rounded-lg px-4 py-2">
      {shape}
      <span className="text-sm font-bold tracking-tight whitespace-nowrap">{name}</span>
    </div>
  );

  const logos = (
    <>
      {logoBlock(<div className="w-6 h-6 rounded bg-white/25" />, 'MERIDIAN BUILD')}
      {logoBlock(<div className="w-6 h-6 rounded-full bg-white/25" />, 'APEX STRUCTURES')}
      {logoBlock(<div className="w-5 h-6 bg-white/25" style={{ clipPath: 'polygon(50% 0%,100% 100%,0% 100%)' }} />, 'DELTA CONTRACTING')}
      {logoBlock(<div className="w-6 h-6 rotate-45 rounded-sm bg-white/25" />, 'IRONWORKS CO.')}
      {logoBlock(<div className="w-6 h-6 rounded-full border-2 border-white/30" />, 'SKYLINE PROJECTS')}
      {logoBlock(<div className="w-8 h-4 rounded bg-white/25" />, 'FOUNDRY GROUP')}
    </>
  );

  const aiAvatar = (
    <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
      <svg width="12" height="12" fill="#42a5f5" viewBox="0 0 16 16"><path d="M8 1a7 7 0 100 14A7 7 0 008 1z"/></svg>
    </div>
  );

  return (
    <div className="landing-page">
      {/* ── NAV ── */}
      <nav id="nav" className="nav-glass fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(25,118,210,0.6)]">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="10" width="5" height="6" rx="1" fill="white"/>
                <rect x="9" y="6" width="5" height="10" rx="1" fill="white"/>
                <rect x="2" y="2" width="5" height="6" rx="1" fill="rgba(255,255,255,0.5)"/>
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">Construct<span className="text-blue-400">IQ</span></span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            {['features','how-it-works','pricing','testimonials'].map((id) => (
              <a key={id} href={`#${id}`} className="hover:text-white transition-colors relative group capitalize">
                {id.replace('-',' ')}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-blue-400 group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors px-4 py-2">Sign In</Link>
            <Link href="/login" className="btn-amber text-sm font-bold bg-amber-500 text-navy-900 px-5 py-2.5 rounded-xl">Get Started Free</Link>
          </div>
          <button className="md:hidden text-white/60 hover:text-white p-1" onClick={() => setMobileOpen((o) => !o)}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
        <div className={`${mobileOpen ? 'flex' : 'hidden'} flex-col gap-4 px-6 pb-5 border-t border-white/5`}>
          {['features','how-it-works','pricing'].map((id) => (
            <a key={id} href={`#${id}`} className="text-sm text-white/60 hover:text-white block pt-2 capitalize" onClick={() => setMobileOpen(false)}>{id.replace('-',' ')}</a>
          ))}
          <div className="flex gap-3 pt-1">
            <Link href="/login" className="text-sm border border-white/20 px-4 py-2 rounded-lg text-white/70">Sign In</Link>
            <Link href="/login" className="btn-amber text-sm font-bold bg-amber-500 text-navy-900 px-4 py-2 rounded-lg">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-24 overflow-hidden bg-navy-900">
        <div id="particles" />
        <div className="hero-mesh" />
        <div className="hero-grid" />
        <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />

        <div className="relative max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="relative inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-7">
              <div className="pulse-badge absolute inset-0 rounded-full" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="relative">Construction Management Platform</span>
            </div>
            <h1 className="text-5xl lg:text-[3.6rem] font-extrabold leading-[1.1] tracking-tight mb-6">
              Less chaos.<br/>
              More&nbsp;<span className="accent-line" id="typewriter-target" /><span className="caret" /><br/>
              on every site.
            </h1>
            <p className="text-lg text-white/55 leading-relaxed mb-10 max-w-lg">
              ConstructIQ gives your field teams and office staff one place to manage projects, track budgets, file daily reports, and get AI-powered answers — from ground-break to handover.
            </p>
            <div className="flex gap-8 mb-10">
              <div>
                <div className="stat-number text-3xl font-extrabold stat-val" data-count="47" data-suffix="%">0%</div>
                <div className="text-xs text-white/40 mt-0.5">Less reporting time</div>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <div className="stat-number text-3xl font-extrabold stat-val" data-count="600" data-suffix="+">0+</div>
                <div className="text-xs text-white/40 mt-0.5">Sites managed</div>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <div className="stat-number text-3xl font-extrabold stat-val" data-count="99" data-suffix=".9%">0%</div>
                <div className="text-xs text-white/40 mt-0.5">Uptime SLA</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link href="/login" className="btn-amber inline-flex items-center gap-2 bg-amber-500 text-navy-900 font-bold px-7 py-3.5 rounded-xl text-sm">
                Get Started Free
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 7.5h11M9 3.5l4 4-4 4"/></svg>
              </Link>
              <a href="#features" className="btn-outline inline-flex items-center gap-2 border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl text-sm">
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7"/><path d="M6 5.5l5 2.5-5 2.5V5.5z" fill="currentColor" stroke="none"/></svg>
                See Features
              </a>
            </div>
            <p className="mt-5 text-xs text-white/30">No credit card required · 14-day free trial · Cancel anytime</p>
          </div>

          {/* Dashboard mockup */}
          <div className="relative flex items-center justify-center">
            <div className="dash-float w-full max-w-md">
              <div className="rounded-2xl border border-white/10 bg-navy-950/90 backdrop-blur shadow-[0_30px_80px_rgba(0,0,0,0.6)] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/50"/><span className="w-3 h-3 rounded-full bg-amber-500/50"/><span className="w-3 h-3 rounded-full bg-emerald-500/50"/>
                  </div>
                  <div className="w-36 h-2.5 rounded-full bg-white/[0.06]"/>
                  <div className="w-14 h-2.5 rounded-full bg-blue-500/25"/>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { label:'Active Projects', id:'dash-projects', badge:'↑ 2 this week', badgeClass:'text-emerald-400' },
                      { label:'Tasks Open', id:'dash-tasks', badge:'12 overdue', badgeClass:'text-amber-400' },
                      { label:'Budget Used', id:'dash-budget', badge:'On track', badgeClass:'text-blue-400' },
                    ].map(({ label, id, badge, badgeClass }) => (
                      <div key={id} className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.05]">
                        <div className="text-[10px] text-white/35 mb-1">{label}</div>
                        <div className="text-xl font-bold" id={id}>0{id==='dash-budget'?'%':''}</div>
                        <div className={`text-[10px] mt-0.5 ${badgeClass}`}>{badge}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-white/25 uppercase tracking-widest mb-2">Recent Projects</div>
                    {[
                      { name:'Riverside Tower — Phase 3', pct:'72%', fill:'72%', color:'bg-emerald-400/70', dot:'bg-emerald-400' },
                      { name:'Southgate Commercial Hub', pct:'41%', fill:'41%', color:'bg-amber-400/70', dot:'bg-amber-400' },
                      { name:'Hillcrest Residential Block A', pct:'19%', fill:'19%', color:'bg-blue-400/70', dot:'bg-blue-400' },
                    ].map(({ name, pct, fill, color, dot }) => (
                      <div key={name} className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.05] rounded-lg px-3 py-2">
                        <span className={`w-2 h-2 rounded-full ${dot} flex-shrink-0`}/>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-medium truncate">{name}</div>
                          <div className="h-1 bg-white/[0.08] rounded-full mt-1 overflow-hidden">
                            <div className={`bar-fill h-full ${color} rounded-full`} style={{ '--fill': fill } as React.CSSProperties}/>
                          </div>
                        </div>
                        <div className="text-[10px] text-white/30 flex-shrink-0">{pct}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(25,118,210,0.5)]">
                      <svg width="12" height="12" fill="white" viewBox="0 0 16 16"><path d="M8 1a7 7 0 100 14A7 7 0 008 1z"/></svg>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-blue-300 mb-0.5">AI Assistant</div>
                      <div className="text-[11px] text-white/55 leading-relaxed">Riverside Tower has 3 unresolved issues in today&apos;s report. Want a summary?</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-3 -left-4 flex items-center gap-2 bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg animate-bounce" style={{ animationDuration: '3s' }}>
                ✓ 3 field reports filed
              </div>
              <div className="absolute -top-3 -right-4 flex items-center gap-2 bg-navy-900 border border-white/10 text-[11px] px-3 py-1.5 rounded-full shadow-lg" style={{ animation: 'dashFloat 4s 1s ease-in-out infinite' }}>
                <span className="w-2 h-2 rounded-full bg-amber-400"/>
                Budget alert: 68%
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20 text-xs">
          <div className="w-5 h-8 rounded-full border border-white/15 flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-white/30" style={{ animation: 'scrollDot 1.5s ease-in-out infinite' }}/>
          </div>
        </div>
      </section>

      {/* ── TRUSTED BY ── */}
      <section className="py-12 bg-navy-950 border-y border-white/5">
        <p className="text-center text-[11px] font-semibold text-white/25 uppercase tracking-[0.18em] mb-8">
          Trusted by construction companies across North America
        </p>
        <div className="marquee-wrap">
          <div className="marquee-track">
            {logos}{logos}
          </div>
        </div>
      </section>

      {/* ── PROBLEMS ── */}
      <section className="py-32 bg-navy-900" id="problems">
        <div className="max-w-6xl mx-auto px-6">
          {/* Heading */}
          <div className="mb-20 reveal">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <h2 className="text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight max-w-xl">
                Construction runs<br/>on chaos.<br/>
                <em className="not-italic" style={{ color: 'rgba(255,255,255,0.3)' }}>It doesn&apos;t have to.</em>
              </h2>
              <p className="text-white/40 max-w-xs text-sm leading-relaxed lg:text-right lg:pb-2">
                Most sites are still run via spreadsheets, WhatsApp groups, and guesswork. Here&apos;s the cost.
              </p>
            </div>
          </div>
          {/* Rows */}
          <div>
            {/* Row 1 */}
            <div className="prob-row reveal delay-1 grid grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_1fr] gap-x-8 lg:gap-x-16 items-start py-10 cursor-default">
              <div className="prob-num row-span-2 lg:row-span-1 pr-4 lg:pr-0">01</div>
              <div className="lg:col-span-1">
                <p className="text-xs text-red-400/70 font-semibold uppercase tracking-widest mb-3">The problem</p>
                <h3 className="text-2xl lg:text-3xl font-bold mb-3 leading-snug">
                  <span className="prob-strike">No single source of truth.</span>
                </h3>
                <p className="text-white/40 text-sm leading-relaxed max-w-sm">Project data lives across email threads, shared drives, and disconnected apps. Nobody knows the real status until something breaks.</p>
              </div>
              <div className="col-start-2 lg:col-start-auto mt-6 lg:mt-0 flex flex-col justify-start">
                <div className="flex items-center gap-3 mb-3">
                  <div className="prob-arrow">
                    <svg width="14" height="14" fill="none" stroke="rgba(52,211,153,0.7)" strokeWidth="2"><path d="M2 7h10M8 3l4 4-4 4"/></svg>
                  </div>
                  <div className="fix-tag">ConstructIQ fixes this</div>
                </div>
                <p className="fix-text">One unified platform — projects, tasks, budgets, and docs — visible in real-time to everyone with the right permissions.</p>
              </div>
            </div>
            {/* Row 2 */}
            <div className="prob-row reveal delay-2 grid grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_1fr] gap-x-8 lg:gap-x-16 items-start py-10 cursor-default">
              <div className="prob-num row-span-2 lg:row-span-1 pr-4 lg:pr-0">02</div>
              <div className="lg:col-span-1">
                <p className="text-xs text-red-400/70 font-semibold uppercase tracking-widest mb-3">The problem</p>
                <h3 className="text-2xl lg:text-3xl font-bold mb-3 leading-snug">
                  <span className="prob-strike">Reporting eats half the day.</span>
                </h3>
                <p className="text-white/40 text-sm leading-relaxed max-w-sm">Site supervisors spend 30–60 minutes filling out daily logs and chasing updates — time that belongs on the site, not in spreadsheets.</p>
              </div>
              <div className="col-start-2 lg:col-start-auto mt-6 lg:mt-0 flex flex-col justify-start">
                <div className="flex items-center gap-3 mb-3">
                  <div className="prob-arrow">
                    <svg width="14" height="14" fill="none" stroke="rgba(52,211,153,0.7)" strokeWidth="2"><path d="M2 7h10M8 3l4 4-4 4"/></svg>
                  </div>
                  <div className="fix-tag">ConstructIQ fixes this</div>
                </div>
                <p className="fix-text">Structured report forms that auto-populate from task updates. AI summarizes everything for management — in seconds, not hours.</p>
              </div>
            </div>
            {/* Row 3 */}
            <div className="prob-row reveal delay-3 grid grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_1fr] gap-x-8 lg:gap-x-16 items-start py-10 cursor-default">
              <div className="prob-num row-span-2 lg:row-span-1 pr-4 lg:pr-0">03</div>
              <div className="lg:col-span-1">
                <p className="text-xs text-red-400/70 font-semibold uppercase tracking-widest mb-3">The problem</p>
                <h3 className="text-2xl lg:text-3xl font-bold mb-3 leading-snug">
                  <span className="prob-strike">Overruns blindside you.</span>
                </h3>
                <p className="text-white/40 text-sm leading-relaxed max-w-sm">By the time a cost overrun shows up in a report, the damage is done. Purchase orders get approved with no budget context at all.</p>
              </div>
              <div className="col-start-2 lg:col-start-auto mt-6 lg:mt-0 flex flex-col justify-start">
                <div className="flex items-center gap-3 mb-3">
                  <div className="prob-arrow">
                    <svg width="14" height="14" fill="none" stroke="rgba(52,211,153,0.7)" strokeWidth="2"><path d="M2 7h10M8 3l4 4-4 4"/></svg>
                  </div>
                  <div className="fix-tag">ConstructIQ fixes this</div>
                </div>
                <p className="fix-text">Live budget tracking against every phase and PO. Alerts fire before costs spiral — with a full audit trail behind every approval.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="divider max-w-5xl mx-auto"/>

      {/* ── FEATURES ── */}
      <section className="py-32 bg-navy-800" id="features">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 reveal">
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-5">Everything your crew needs.<br/>Nothing they don&apos;t.</h2>
            <p className="text-white/45 max-w-lg mx-auto text-lg">Purpose-built for how construction teams actually work.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { delay:'delay-1', icon:<svg width="20" height="20" fill="none" stroke="#42a5f5" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>, title:'Project & Phase Management', desc:'Track projects, phases, and milestones end-to-end. Real-time completion status at a glance.' },
              { delay:'delay-2', icon:<svg width="20" height="20" fill="none" stroke="#42a5f5" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>, title:'Task & Dependency Tracking', desc:'Assign work, set dependencies, and surface blockers before they delay the schedule.' },
              { delay:'delay-3', icon:<svg width="20" height="20" fill="none" stroke="#42a5f5" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>, title:'Daily Reports & Issues', desc:'Field teams submit structured daily logs. Issues flagged, tracked, and resolved in one place.' },
              { delay:'delay-4', icon:<svg width="20" height="20" fill="none" stroke="#42a5f5" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg>, title:'Budget & Procurement', desc:'Manage POs, track costs by phase, and catch overruns before they compound.' },
              { delay:'delay-5', icon:<svg width="20" height="20" fill="none" stroke="#42a5f5" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>, title:'Document Management', desc:'Centralized storage for drawings, specs, permits — version-controlled and always accessible.' },
            ].map(({ delay, icon, title, desc }) => (
              <div key={title} className={`feature-card reveal ${delay} rounded-2xl p-6 cursor-default`}>
                <div className="icon-wrap w-11 h-11 rounded-xl bg-blue-500/15 flex items-center justify-center mb-5">{icon}</div>
                <h3 className="text-base font-bold mb-2">{title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{desc}</p>
              </div>
            ))}
            <div className="feature-card animated-border reveal delay-6 rounded-2xl p-6 cursor-default" style={{ background:'rgba(25,118,210,0.08)', borderColor:'rgba(25,118,210,0.25)' }}>
              <div className="icon-wrap w-11 h-11 rounded-xl bg-blue-500/25 flex items-center justify-center mb-5" style={{ boxShadow:'0 0 20px rgba(25,118,210,0.3)' }}>
                <svg width="20" height="20" fill="#42a5f5" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-base font-bold">AI Assistant</h3>
                <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">New</span>
              </div>
              <p className="text-sm text-blue-200/55 leading-relaxed">Ask in plain English. Navigate the app, summarize reports, surface insights instantly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI SPOTLIGHT ── */}
      <section className="py-32 bg-navy-950 relative overflow-hidden" id="ai">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div style={{ width:700, height:700, background:'radial-gradient(circle,rgba(25,118,210,0.12) 0%,transparent 70%)', borderRadius:'50%' }}/>
        </div>
        <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center">
          <div className="reveal-left">
            <div className="inline-block bg-blue-500/10 text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-500/20 mb-6">AI Assistant</div>
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-6 leading-tight">Ask your data<br/>anything.<br/><span className="text-blue-400">Navigate in seconds.</span></h2>
            <p className="text-white/50 mb-8 text-lg leading-relaxed">Stop hunting through tabs. ConstructIQ&apos;s AI knows your projects, your team, your site — just ask.</p>
            <ul className="space-y-4">
              {[
                'Summarize field reports across all active sites in one click',
                'Navigate directly to any project, phase, or document by asking naturally',
                'Context carries across the conversation — no repeating yourself',
                'Surface budget risks and overdue tasks before they escalate',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 group">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5 flex-shrink-0 transition-all group-hover:bg-blue-500/40 group-hover:scale-110">
                    <svg width="10" height="10" fill="none" stroke="#42a5f5" strokeWidth="2.5" viewBox="0 0 10 8"><path d="M1 4l2.5 3L9 1"/></svg>
                  </div>
                  <span className="text-sm text-white/65 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="reveal-right">
            <div className="bg-navy-800 border border-white/10 rounded-2xl overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.08] bg-navy-900/60">
                <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center shadow-[0_0_16px_rgba(25,118,210,0.5)]">
                  <svg width="14" height="14" fill="white" viewBox="0 0 16 16"><path d="M8 1a7 7 0 100 14A7 7 0 008 1z"/></svg>
                </div>
                <div>
                  <div className="text-xs font-bold">ConstructIQ AI</div>
                  <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/><span className="text-[11px] text-emerald-400">Online</span></div>
                </div>
              </div>
              <div id="chat-messages" className="p-4 space-y-3 min-h-[220px]">
                {chatMsgs.map((msg) => {
                  if (msg.type === 'typing') return (
                    <div key={msg.id} className="chat-msg flex gap-2.5 items-start">
                      {aiAvatar}
                      <div className="bg-white/[0.06] border border-white/[0.08] px-4 py-3 rounded-2xl rounded-tl-sm">
                        <span className="dot" style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:'#42a5f5' }}/>
                        <span className="dot" style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:'#42a5f5', margin:'0 3px' }}/>
                        <span className="dot" style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:'#42a5f5' }}/>
                      </div>
                    </div>
                  );
                  if (msg.type === 'user') return (
                    <div key={msg.id} className="chat-msg flex justify-end">
                      <div className="bg-blue-500 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[75%] text-xs leading-relaxed">{msg.text}</div>
                    </div>
                  );
                  return (
                    <div key={msg.id} className="chat-msg flex gap-2.5 items-start">
                      {aiAvatar}
                      <div className="bg-white/[0.06] border border-white/[0.08] px-4 py-3 rounded-2xl rounded-tl-sm max-w-[75%] text-xs text-white/75 leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.html ?? '' }}/>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5">
                  <span className="flex-1 text-xs text-white/30">Ask anything about your projects…</span>
                  <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
                    <svg width="12" height="12" fill="none" stroke="white" strokeWidth="2"><path d="M2 6h8M7 3l3 3-3 3"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-32 bg-navy-900" id="how-it-works">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-20 reveal">
            <div className="inline-block bg-amber-500/10 text-amber-400 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-500/20 mb-5">Getting Started</div>
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-4">Up and running in a day.</h2>
            <p className="text-white/45 text-lg">Three steps to full project visibility.</p>
          </div>
          <div className="relative grid md:grid-cols-3 gap-8">
            <div className="hidden md:block absolute top-10 left-[calc(16.66%+40px)] right-[calc(16.66%+40px)] h-px" style={{ background:'linear-gradient(90deg,rgba(25,118,210,0.6),rgba(25,118,210,0.1),rgba(25,118,210,0.6))' }}/>
            {[
              { n:'1', delay:'delay-1', title:'Set up your org & team', desc:'Invite project managers, site supervisors, and subcontractors. Assign roles and permissions in minutes.' },
              { n:'2', delay:'delay-2', title:'Run your projects', desc:'Create projects and phases, assign tasks, track budgets, and collect daily field reports — all in one place.' },
              { n:'3', delay:'delay-3', title:'Get AI-powered insights', desc:'Let the AI surface risks, summarize reports, and answer questions about your projects in natural language.' },
            ].map(({ n, delay, title, desc }) => (
              <div key={n} className={`reveal ${delay} text-center`}>
                <div className="relative w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6 transition-all duration-300 hover:bg-blue-500/20 hover:scale-110 hover:shadow-[0_0_30px_rgba(25,118,210,0.3)] cursor-default">
                  <span className="text-3xl font-extrabold text-blue-400">{n}</span>
                </div>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="py-32 bg-navy-950" id="pricing">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20 reveal">
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-4">Simple, transparent pricing.</h2>
            <p className="text-white/45 text-lg">Scale as you grow. No hidden fees, no surprises.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="pricing-card reveal delay-1 bg-white/[0.03] border border-white/10 rounded-2xl p-8">
              <div className="text-sm font-semibold text-white/35 mb-1">Starter</div>
              <div className="text-5xl font-extrabold mb-1">$49<span className="text-xl font-normal text-white/35">/mo</span></div>
              <div className="text-xs text-white/30 mb-7">Up to 5 users · 3 active projects</div>
              <ul className="space-y-3 text-sm mb-8">
                {['Project & phase management','Task tracking','Daily reports','5 GB document storage'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-white/65"><span className="text-emerald-400 font-bold">✓</span> {f}</li>
                ))}
                {['Budget & procurement','AI Assistant'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-white/25"><span>✗</span> {f}</li>
                ))}
              </ul>
              <Link href="/login" className="block text-center text-sm font-semibold border border-white/15 hover:border-white/35 text-white py-3 rounded-xl transition-all">Start Free Trial</Link>
            </div>

            <div className="pricing-card featured reveal delay-2 rounded-2xl p-8 relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-[0_0_20px_rgba(25,118,210,0.5)]">Most Popular</div>
              <div className="text-sm font-semibold text-blue-400 mb-1">Pro</div>
              <div className="text-5xl font-extrabold mb-1">$149<span className="text-xl font-normal text-white/35">/mo</span></div>
              <div className="text-xs text-white/30 mb-7">Up to 25 users · Unlimited projects</div>
              <ul className="space-y-3 text-sm mb-8">
                {['Everything in Starter','Budget & procurement','AI Assistant','50 GB document storage','Role-based access control','Priority support'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-white/80"><span className="text-emerald-400 font-bold">✓</span> {f}</li>
                ))}
              </ul>
              <Link href="/login" className="btn-amber block text-center text-sm font-bold bg-amber-500 text-navy-900 py-3 rounded-xl">Start Free Trial</Link>
            </div>

            <div className="pricing-card reveal delay-3 bg-white/[0.03] border border-white/10 rounded-2xl p-8">
              <div className="text-sm font-semibold text-white/35 mb-1">Enterprise</div>
              <div className="text-5xl font-extrabold mb-1">Custom</div>
              <div className="text-xs text-white/30 mb-7">Unlimited users &amp; projects</div>
              <ul className="space-y-3 text-sm mb-8">
                {['Everything in Pro','Custom integrations & SSO','Dedicated account manager','SLA guarantees','On-premise option','Custom AI training'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-white/65"><span className="text-emerald-400 font-bold">✓</span> {f}</li>
                ))}
              </ul>
              <a href="mailto:sales@constructiq.com" className="block text-center text-sm font-semibold border border-white/15 hover:border-white/35 text-white py-3 rounded-xl transition-all">Contact Sales</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-32 bg-navy-800" id="testimonials">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 reveal">
            <h2 className="text-4xl lg:text-5xl font-extrabold">What project managers are saying.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { delay:'delay-1', quote:'"We cut weekly reporting time in half. The AI summary feature alone saves me 90 minutes every Monday morning. I don\'t know how we managed without it."', initials:'DK', name:'D. Kowalski', role:'Senior PM · Meridian Build', color:'bg-blue-500/20 text-blue-300' },
              { delay:'delay-2', quote:'"Budget overruns used to blindside us. Now we get alerts at 70% spend and course-correct in real time. The procurement module paid for itself in month one."', initials:'SL', name:'S. Lindqvist', role:'Operations Director · Apex Structures', color:'bg-amber-500/20 text-amber-300' },
              { delay:'delay-3', quote:'"My crews were skeptical at first. Now they won\'t go back — daily reports take 10 minutes, issues get flagged instantly, nothing falls through the cracks."', initials:'RC', name:'R. Chen', role:'Site Supervisor · Delta Contracting', color:'bg-emerald-500/20 text-emerald-300' },
            ].map(({ delay, quote, initials, name, role, color }) => (
              <div key={name} className={`testimonial-card reveal ${delay} bg-white/[0.03] border border-white/[0.08] rounded-2xl p-7`}>
                <div className="text-amber-400 text-base mb-5">★★★★★</div>
                <p className="text-sm text-white/65 leading-relaxed mb-7">{quote}</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${color}`}>{initials}</div>
                  <div>
                    <div className="text-sm font-semibold">{name}</div>
                    <div className="text-xs text-white/35">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-32 overflow-hidden" style={{ background:'linear-gradient(135deg,#0f1623 0%,#1a2840 40%,#0f1623 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ position:'absolute', inset:'-50%', background:'radial-gradient(ellipse 50% 60% at 30% 50%,rgba(25,118,210,0.2),transparent 70%),radial-gradient(ellipse 40% 50% at 70% 50%,rgba(66,165,245,0.08),transparent 70%)', animation:'meshShift 15s ease-in-out infinite alternate' }}/>
          <div className="hero-grid" style={{ opacity:0.5 }}/>
        </div>
        <div className="relative max-w-4xl mx-auto px-6 text-center reveal">
          <h2 className="text-5xl lg:text-6xl font-extrabold mb-6 leading-tight">
            Ready to take control of<br/>your construction projects?
          </h2>
          <p className="text-xl text-white/45 mb-12 max-w-2xl mx-auto leading-relaxed">
            Join hundreds of construction teams who&apos;ve replaced spreadsheet chaos with one intelligent platform.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/login" className="btn-amber inline-flex items-center gap-2.5 bg-amber-500 text-navy-900 font-extrabold px-9 py-4 rounded-xl text-base">
              Start Free Trial
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 8h12M10 4l4 4-4 4"/></svg>
            </Link>
            <a href="#features" className="btn-outline inline-flex items-center gap-2.5 border border-white/20 text-white font-semibold px-9 py-4 rounded-xl text-base">
              See Features
            </a>
          </div>
          <p className="mt-6 text-sm text-white/25">14-day free trial · No credit card · Cancel anytime</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-navy-950 border-t border-white/5 pt-16 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div>
              <a href="#" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="2" y="10" width="5" height="6" rx="1" fill="white"/>
                    <rect x="9" y="6" width="5" height="10" rx="1" fill="white"/>
                    <rect x="2" y="2" width="5" height="6" rx="1" fill="rgba(255,255,255,0.5)"/>
                  </svg>
                </div>
                <span className="text-base font-bold">Construct<span className="text-blue-400">IQ</span></span>
              </a>
              <p className="text-xs text-white/35 leading-relaxed mb-5">Construction management software built for the modern job site.</p>
              <div className="flex gap-2">
                <a href="#" className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/10 flex items-center justify-center transition-colors">
                  <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16" className="text-white/40"><path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z"/></svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/10 flex items-center justify-center transition-colors">
                  <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16" className="text-white/40"><path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z"/></svg>
                </a>
              </div>
            </div>
            {[
              { title:'Product', links:[{label:'Features',href:'#features'},{label:'Pricing',href:'#pricing'},{label:'Integrations',href:'#'},{label:'Changelog',href:'#'}] },
              { title:'Company', links:[{label:'About',href:'#'},{label:'Blog',href:'#'},{label:'Careers',href:'#'},{label:'Contact',href:'#'}] },
              { title:'Legal', links:[{label:'Privacy Policy',href:'#'},{label:'Terms of Service',href:'#'},{label:'Security',href:'#'},{label:'Cookie Policy',href:'#'}] },
            ].map(({ title, links }) => (
              <div key={title}>
                <div className="text-xs font-semibold text-white/25 uppercase tracking-widest mb-4">{title}</div>
                <ul className="space-y-2.5">
                  {links.map(({ label, href }) => (
                    <li key={label}><a href={href} className="text-sm text-white/45 hover:text-white transition-colors">{label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-white/20">© 2026 ConstructIQ Inc. All rights reserved.</p>
            <p className="text-xs text-white/20">Built for the builders.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
