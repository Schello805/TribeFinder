'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TagSeeder() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSeed = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/seed-tags', {
        method: 'POST',
      });
      
      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error('Error seeding tags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleSeed}
      disabled={isLoading}
      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
    >
      {isLoading ? 'Importiere...' : 'Oriental/Tribal Tags importieren'}
    </button>
  );
}
