'use client';

import { useState } from 'react';

export default function AdminEmailTest({ currentUserEmail }: { currentUserEmail: string }) {
  const [email, setEmail] = useState(currentUserEmail);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleTest = async () => {
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/admin/email-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const detailsMessage = typeof data?.details?.message === 'string' ? data.details.message : '';
        const responseCode = typeof data?.details?.responseCode === 'number' ? data.details.responseCode : '';
        const code = typeof data?.details?.code === 'string' ? data.details.code : '';
        const retryAfter = typeof data?.retryAfter === 'number' ? data.retryAfter : null;

        const parts = [
          typeof data?.error === 'string' ? data.error : null,
          detailsMessage ? detailsMessage : null,
          responseCode ? `SMTP ${responseCode}` : null,
          code ? code : null,
          retryAfter !== null ? `Bitte warte ${retryAfter}s und versuche es erneut.` : null,
        ].filter(Boolean);

        throw new Error(parts.join(' · ') || 'Fehler');
      }
      
      setStatus('success');
      setMessage(typeof data?.message === 'string' ? data.message : 'Email erfolgreich gesendet!');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    }
  };

  return (
    <div className="max-w-md space-y-2">
      <div className="flex gap-2 items-center">
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-sm text-black placeholder-gray-600 bg-white"
          placeholder="Empfänger Email"
        />
        <button
          onClick={handleTest}
          disabled={status === 'loading'}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {status === 'loading' ? 'Sende...' : 'Senden'}
        </button>
        {status === 'success' && <span className="text-green-600 text-sm">✓</span>}
        {status === 'error' && <span className="text-red-600 text-sm">✗</span>}
      </div>

      {status === 'error' && message ? (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {message}
        </div>
      ) : null}
      {status === 'success' && message ? (
        <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          {message}
        </div>
      ) : null}
    </div>
  );
}
