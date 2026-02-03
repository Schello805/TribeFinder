'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ein Fehler ist aufgetreten');
      }

      setStatus('success');
      setMessage(data.message);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--foreground)] py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-[var(--surface)] text-[var(--foreground)] p-8 rounded-xl shadow-lg border border-[var(--border)]"
      >
        <div>
          <h2 className="tf-display mt-6 text-center text-3xl font-extrabold text-[var(--foreground)]">
            Passwort vergessen?
          </h2>
          <p className="mt-2 text-center text-sm text-[var(--muted)]">
            Gib deine Email-Adresse ein und wir senden dir einen Link zum Zurücksetzen.
          </p>
        </div>
        
        {status === 'success' ? (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Email gesendet</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>{message}</p>
                </div>
                <div className="mt-4">
                  <Link href="/auth/signin" className="text-sm font-medium text-green-800 hover:text-green-700">
                    Zurück zum Login &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <input type="hidden" name="remember" value="true" />
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">Email Addresse</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-[var(--border)] placeholder:text-[var(--muted)] text-[var(--foreground)] bg-[var(--surface)] focus:outline-none focus:ring-[var(--primary)] focus:border-[var(--primary)] focus:z-10 sm:text-sm"
                  placeholder="Email Addresse"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {status === 'error' && (
              <div className="text-red-500 text-sm text-center">
                {message}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-[var(--primary-foreground)] bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50"
              >
                {status === 'loading' ? 'Sende...' : 'Link anfordern'}
              </button>
            </div>
            
            <div className="text-center">
              <Link href="/auth/signin" className="font-medium text-[var(--link)] hover:underline">
                Zurück zum Login
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
