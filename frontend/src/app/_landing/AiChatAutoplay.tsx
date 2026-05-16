'use client';

import { useEffect, useRef, useState } from 'react';

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

const aiAvatar = (
  <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
    <svg width="12" height="12" fill="#42a5f5" viewBox="0 0 16 16">
      <path d="M8 1a7 7 0 100 14A7 7 0 008 1z" />
    </svg>
  </div>
);

export function AiChatAutoplay() {
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const chatTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const chatIdxRef = useRef(0);
  const chatStartedRef = useRef(false);

  useEffect(() => {
    document.querySelectorAll('.chat-msg:not(.show)').forEach((m) =>
      requestAnimationFrame(() => m.classList.add('show')),
    );
  }, [chatMsgs]);

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
    const aiObs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !chatStartedRef.current) {
          chatStartedRef.current = true;
          runChat();
          aiObs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    aiObs.observe(aiSection);
    return () => {
      aiObs.disconnect();
      if (chatTimerRef.current) clearTimeout(chatTimerRef.current);
    };
  }, []);

  return (
    <div id="chat-messages" className="p-4 space-y-3 min-h-[220px]">
      {chatMsgs.map((msg) => {
        if (msg.type === 'typing')
          return (
            <div key={msg.id} className="chat-msg flex gap-2.5 items-start">
              {aiAvatar}
              <div className="bg-white/[0.06] border border-white/[0.08] px-4 py-3 rounded-2xl rounded-tl-sm">
                <span
                  className="dot"
                  style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#42a5f5' }}
                />
                <span
                  className="dot"
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#42a5f5',
                    margin: '0 3px',
                  }}
                />
                <span
                  className="dot"
                  style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#42a5f5' }}
                />
              </div>
            </div>
          );
        if (msg.type === 'user')
          return (
            <div key={msg.id} className="chat-msg flex justify-end">
              <div className="bg-blue-500 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[75%] text-xs leading-relaxed">
                {msg.text}
              </div>
            </div>
          );
        return (
          <div key={msg.id} className="chat-msg flex gap-2.5 items-start">
            {aiAvatar}
            <div
              className="bg-white/[0.06] border border-white/[0.08] px-4 py-3 rounded-2xl rounded-tl-sm max-w-[75%] text-xs text-white/75 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: msg.html ?? '' }}
            />
          </div>
        );
      })}
    </div>
  );
}
