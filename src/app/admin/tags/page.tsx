'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import AdminNav from '@/components/admin/AdminNav';
import AdminEmbedMode from '@/components/admin/AdminEmbedMode';
import AdminTagsManager from '@/components/admin/AdminTagsManager';

export default function AdminTagsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get('embed') === '1';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);
  if (status === 'loading') {
    return <div className="p-8 text-center text-gray-900 dark:text-gray-100">Laden...</div>;
  }

  if (session?.user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <AdminEmbedMode />
      {!isEmbed ? (
        <>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Tag Verwaltung</h1>

          <div className="mb-6">
            <AdminNav />
          </div>
        </>
      ) : null}

      <AdminTagsManager />
    </div>
  );
}
