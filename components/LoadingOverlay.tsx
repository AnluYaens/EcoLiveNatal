'use client';

import { useState, useEffect } from 'react';

interface LoadingOverlayProps {
  visible: boolean;
  messages: string[];
  estimatedTimeLabel: string;
}

export default function LoadingOverlay({
  visible,
  messages,
  estimatedTimeLabel,
}: LoadingOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!visible) {
      setMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % messages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [visible, messages.length]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-50 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-10 shadow-2xl flex flex-col items-center gap-6 mx-4 w-full max-w-xs border border-gray-100">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-accent/10" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-accent animate-spin" />
          <div className="absolute inset-3 rounded-full bg-accent/5 flex items-center justify-center">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <p
          key={messageIndex}
          className="text-lg font-semibold text-text-primary text-center"
        >
          {messages[messageIndex]}
        </p>
        <p className="text-sm text-text-secondary/70">{estimatedTimeLabel}</p>
      </div>
    </div>
  );
}
