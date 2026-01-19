"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { usePosts } from "@/lib/hooks";

export default function CommunityFeed() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const { posts, isLoading: loading, createPost, deletePost } = usePosts();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploading(true);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload fehlgeschlagen');
      }

      const data = await res.json();
      setImageUrl(data.url);
      showToast('Bild hochgeladen', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Fehler beim Bild-Upload', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const success = await createPost(content, imageUrl || undefined);
      if (success) {
        setContent("");
        setImageUrl("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Möchtest du diesen Beitrag wirklich löschen?")) return;

    const success = await deletePost(postId);
    if (success) {
      showToast('Beitrag gelöscht', 'success');
    } else {
      showToast('Fehler beim Löschen', 'error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📌 Schwarzes Brett</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">Neues aus der Community</span>
      </div>

      {/* Create Post Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-8">
        {session ? (
          <form onSubmit={handleSubmit}>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                {session.user?.image ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={session.user.image} alt={session.user.name || "User"} className="w-10 h-10 rounded-full object-cover" />
                  </>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-500 dark:text-indigo-300 font-bold">
                    {session.user?.name?.charAt(0) || "U"}
                  </div>
                )}
              </div>
              <div className="flex-grow">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Was gibt's Neues? (Suche Mitfahrgelegenheit, Kostümverkauf, etc.)"
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white resize-none h-24"
                  maxLength={500}
                />
                
                {imageUrl && (
                  <div className="mt-2 relative inline-block">
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="Preview" className="h-20 w-auto rounded-md object-cover border border-gray-200" />
                    </>
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-2">
                    <label className={`cursor-pointer p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                      📷
                    </label>
                    <span className="text-xs text-gray-400">{content.length}/500</span>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || !content.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition disabled:opacity-50 text-sm font-medium"
                  >
                    {isSubmitting ? "Sende..." : "Posten"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="text-center py-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400 mb-2">Möchtest du etwas posten?</p>
            <Link href="/auth/signin" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
              Melde dich an
            </Link>
          </div>
        )}
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Lade Beiträge...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
            <p className="text-gray-500">Noch keine Beiträge vorhanden. Sei der Erste!</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow relative group">
              {session?.user?.id === post.authorId && (
                <button
                  onClick={() => handleDelete(post.id)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Löschen"
                >
                  🗑️
                </button>
              )}
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {post.author.image ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={post.author.image} alt={post.author.name || "User"} className="w-10 h-10 rounded-full object-cover" />
                    </>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-500 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                      {post.author.name?.charAt(0) || "?"}
                    </div>
                  )}
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-gray-900 dark:text-white block">{post.author.name || "Unbekannt"}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        vor {formatDistanceToNow(new Date(post.createdAt), { locale: de, addSuffix: false })}
                      </span>
                    </div>
                  </div>
                  
                  <p className="mt-2 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{post.content}</p>
                  
                  {post.image && (
                    <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={post.image} alt="Post bild" className="max-h-64 w-full object-cover" />
                      </>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
