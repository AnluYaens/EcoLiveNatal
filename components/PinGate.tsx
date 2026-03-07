'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';

const SESSION_KEY = 'ecln_pin';
const ACCOUNT_ID_KEY = 'ecln_account_id';

interface PinGateProps {
  onVerified: (pin: string) => void;
}

export default function PinGate({ onVerified }: PinGateProps) {
  const t = useTranslations('pinGate');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [lockMessage, setLockMessage] = useState('');

  const ref0 = useRef<HTMLInputElement>(null);
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);
  const ref3 = useRef<HTMLInputElement>(null);
  const ref4 = useRef<HTMLInputElement>(null);
  const ref5 = useRef<HTMLInputElement>(null);
  const inputRefs = [ref0, ref1, ref2, ref3, ref4, ref5];

  const pin = digits.join('');

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (error) setError(false);
    if (digit && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
    if (e.key === 'Enter' && pin.length === 6) {
      handleSubmit(pin);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    const nextFocus = Math.min(pasted.length, 5);
    inputRefs[nextFocus].current?.focus();
  };

  const handleSubmit = (currentPin?: string) => {
    const code = currentPin ?? pin;
    if (code.length !== 6) return;

    fetch('/api/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: code }),
    })
      .then(async (res) => {
        if (res.ok) {
          const data = (await res.json()) as { ok: boolean; accountId: string };
          sessionStorage.setItem(SESSION_KEY, code);
          sessionStorage.setItem(ACCOUNT_ID_KEY, data.accountId);
          onVerified(code);
        } else if (res.status === 429) {
          const data = (await res.json()) as { error: string; minutes: number };
          setLockMessage(t('accountLocked', { minutes: data.minutes }));
          setError(true);
          setShake(true);
          setTimeout(() => setShake(false), 400);
        } else {
          setLockMessage('');
          setError(true);
          setDigits(['', '', '', '', '', '']);
          setShake(true);
          setTimeout(() => setShake(false), 400);
          ref0.current?.focus();
        }
      })
      .catch(() => {
        setLockMessage('');
        setError(true);
        setShake(true);
        setTimeout(() => setShake(false), 400);
      });
  };

  return (
    <>
      <style>{`
        @keyframes pin-shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-10px); }
          40%       { transform: translateX(10px); }
          60%       { transform: translateX(-8px); }
          80%       { transform: translateX(6px); }
        }
        .pin-shake { animation: pin-shake 0.4s ease-in-out; }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center gap-6">

          {/* Logo badge with baby SVG */}
          <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center">
            <svg className="w-8 h-8 text-accent" fill="currentColor" viewBox="0 0 64 64">
              <ellipse cx="32" cy="22" rx="13" ry="14" />
              <path d="M32 38c-10 0-19 5-19 11v3h38v-3c0-6-9-11-19-11z" />
              <circle cx="20" cy="14" r="4" />
              <circle cx="44" cy="14" r="4" />
            </svg>
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>
            <p className="text-sm text-text-secondary">{t('subtitle')}</p>
          </div>

          {/* PIN circles */}
          <div
            className={`flex gap-2 ${shake ? 'pin-shake' : ''}`}
            onPaste={handlePaste}
          >
            {digits.map((digit, i) => (
              <div key={i} className="relative w-11 h-11">
                <input
                  ref={inputRefs[i]}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  autoFocus={i === 0}
                  aria-label={t('digitLabel', { n: i + 1 })}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div
                  className={[
                    'w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 border-2',
                    error
                      ? 'bg-red-50 border-red-300'
                      : digit
                      ? 'bg-accent border-accent'
                      : 'bg-gray-100 border-transparent',
                  ].join(' ')}
                >
                  {digit && (
                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p className="text-red-500 text-sm -mt-2">
              {lockMessage || t('error')}
            </p>
          )}

          <button
            type="button"
            disabled={pin.length !== 6}
            onClick={() => handleSubmit()}
            className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-4 rounded-full transition-all duration-200 disabled:opacity-40"
          >
            {t('button')}
          </button>

          <button
            type="button"
            className="text-sm text-accent font-medium hover:opacity-70 transition-opacity -mt-2"
          >
            {t('noCode')}
          </button>
        </div>
      </div>
    </>
  );
}

export { SESSION_KEY, ACCOUNT_ID_KEY };
