'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

const SESSION_KEY = 'ecln_token';
const ACCOUNT_ID_KEY = 'ecln_account_id';
const DAILY_LIMIT_KEY = 'ecln_daily_limit';

interface PinGateProps {
  onVerified: (token: string) => void;
}

interface VerifyResponse {
  ok?: boolean;
  accountId?: string;
  dailyLimit?: number;
  error?: string;
  minutes?: number;
}

export default function PinGate({ onVerified }: PinGateProps) {
  const t = useTranslations('pinGate');
  const [token, setToken] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [lockMessage, setLockMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '';
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hola, quisiera solicitar un token de acceso para EcoLiveNatal')}`
    : '';

  const handleSubmit = async () => {
    const trimmed = token.trim();
    if (!trimmed) return;

    setError(false);
    setLockMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: trimmed }),
      });

      const data = (await res.json()) as VerifyResponse;

      if (res.ok && data.ok) {
        sessionStorage.setItem(SESSION_KEY, trimmed);
        sessionStorage.setItem(ACCOUNT_ID_KEY, data.accountId ?? '');
        sessionStorage.setItem(DAILY_LIMIT_KEY, String(data.dailyLimit ?? 0));
        onVerified(trimmed);
      } else if (res.status === 429 && data.minutes) {
        setLockMessage(t('accountLocked', { minutes: data.minutes }));
        setError(true);
        triggerShake();
      } else {
        setError(true);
        setToken('');
        triggerShake();
      }
    } catch {
      setError(true);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
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

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm px-4">
        <div className={`w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-6 border border-gray-100 ${shake ? 'pin-shake' : ''}`}>

          {/* Logo badge */}
          <div className="w-18 h-18 rounded-2xl bg-accent-light flex items-center justify-center p-4">
            <svg className="w-10 h-10 text-accent" fill="currentColor" viewBox="0 0 64 64">
              <ellipse cx="32" cy="22" rx="13" ry="14" />
              <path d="M32 38c-10 0-19 5-19 11v3h38v-3c0-6-9-11-19-11z" />
              <circle cx="20" cy="14" r="4" />
              <circle cx="44" cy="14" r="4" />
            </svg>
          </div>

          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>
            <p className="text-sm text-text-secondary leading-relaxed">{t('subtitle')}</p>
          </div>

          {/* Token input */}
          <div className="w-full space-y-2">
            <label htmlFor="token-input" className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
              {t('label')}
            </label>
            <input
              id="token-input"
              type="text"
              value={token}
              onChange={(e) => { setToken(e.target.value); if (error) setError(false); }}
              onKeyDown={handleKeyDown}
              placeholder={t('placeholder')}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              className={`w-full px-4 py-3.5 rounded-xl border-2 text-sm font-mono transition-all outline-none ${
                error
                  ? 'border-red-300 bg-red-50 ring-2 ring-red-100'
                  : 'border-gray-200 bg-gray-50 focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/10'
              }`}
            />
            <p className="text-[11px] text-text-secondary/50">{t('example')}</p>
          </div>

          {error && (
            <div className="w-full bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 -mt-2">
              <p className="text-red-600 text-sm font-medium text-center">
                {lockMessage || t('error')}
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={!token.trim() || loading}
            onClick={handleSubmit}
            className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-4 rounded-full transition-all duration-200 shadow-sm disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              t('button')
            )}
          </button>

          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent font-medium hover:opacity-70 transition-opacity -mt-2"
            >
              {t('noCode')}
            </a>
          ) : (
            <span className="text-sm text-accent font-medium -mt-2">
              {t('noCode')}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

export { SESSION_KEY, ACCOUNT_ID_KEY, DAILY_LIMIT_KEY };
