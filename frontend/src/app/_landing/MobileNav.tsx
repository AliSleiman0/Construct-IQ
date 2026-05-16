'use client';

import Link from 'next/link';
import { useState } from 'react';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="md:hidden text-white/60 hover:text-white p-1"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle menu"
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <div className={`${open ? 'flex' : 'hidden'} flex-col gap-4 px-6 pb-5 border-t border-white/5`}>
        {['features', 'how-it-works', 'pricing'].map((id) => (
          <a
            key={id}
            href={`#${id}`}
            className="text-sm text-white/60 hover:text-white block pt-2 capitalize"
            onClick={() => setOpen(false)}
          >
            {id.replace('-', ' ')}
          </a>
        ))}
        <div className="flex gap-3 pt-1">
          <Link href="/login" className="text-sm border border-white/20 px-4 py-2 rounded-lg text-white/70">
            Sign In
          </Link>
          <Link
            href="/login"
            className="btn-amber text-sm font-bold bg-amber-500 text-navy-900 px-4 py-2 rounded-lg"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </>
  );
}
