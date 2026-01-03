'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  if (!token) {
    return (
      <div className="text-center text-red-500">
        Ungültiger Link. Bitte fordere einen neuen Link an.
        <br />
        <Link href="/auth/forgot-password" className="text-indigo-600 hover:text-indigo-500 mt-4 inline-block">
          Neuen Link anfordern
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwörter stimmen nicht überein');
      return;
    }

    if (password.length < 8) {
      setStatus('error');
      setMessage('Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ein Fehler ist aufgetreten');
      }

      setStatus('success');
      setMessage('Dein Passwort wurde erfolgreich geändert.');
      setTimeout(() => {
        router.push('/auth/signin');
      }, 3000);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg"
    >
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Neues Passwort festlegen
        </h2>
      </div>

      {status === 'success' ? (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Erfolg!</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>{message}</p>
                <p className="mt-2">Du wirst gleich zum Login weitergeleitet...</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Neues Passwort</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-600 text-black focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder-gray-400"
                placeholder="Neues Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">Passwort bestätigen</label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-600 text-black focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder-gray-400"
                placeholder="Passwort bestätigen"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {status === 'loading' ? 'Speichere...' : 'Passwort ändern'}
            </button>
          </div>
        </form>
      )}
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div>Laden...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
