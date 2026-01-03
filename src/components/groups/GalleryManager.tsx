"use client";

import { useState, useEffect } from "react";
import ImageWithFallback from "@/components/ui/ImageWithFallback";

interface GalleryImage {
  id: string;
  url: string;
  caption: string | null;
  order: number;
}

interface GalleryManagerProps {
  groupId: string;
  canEdit: boolean;
}

export default function GalleryManager({ groupId, canEdit }: GalleryManagerProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}/gallery`);
        if (res.ok) {
          const data = await res.json();
          setImages(data.images || []);
        }
      } catch (error) {
        console.error("Failed to fetch gallery", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGallery();
  }, [groupId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      const { url } = await uploadRes.json();

      const addRes = await fetch(`/api/groups/${groupId}/gallery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (addRes.ok) {
        const newImage = await addRes.json();
        setImages((prev) => [...prev, newImage]);
      }
    } catch (error) {
      console.error("Gallery upload failed", error);
      alert("Fehler beim Hochladen");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm("Bild wirklich löschen?")) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/gallery/${imageId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setImages((prev) => prev.filter((img) => img.id !== imageId));
        setSelectedImage(null);
      }
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  if (isLoading) {
    return <p className="text-gray-500 dark:text-gray-400 text-sm">Lade Galerie...</p>;
  }

  return (
    <div className="space-y-4">
      {images.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-6 text-center border border-dashed border-gray-300 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Noch keine Bilder in der Galerie</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 cursor-pointer group"
              onClick={() => setSelectedImage(img)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <ImageWithFallback src={img.url} alt={img.caption || "Gallery"} className="w-full h-full object-cover" />
              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(img.id);
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && images.length < 5 && (
        <label className={`inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition cursor-pointer text-sm font-medium ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}>
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={isUploading} />
          {isUploading ? "Lade hoch..." : `📷 Bild hinzufügen (${images.length}/5)`}
        </label>
      )}

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <ImageWithFallback src={selectedImage.url} alt="" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl transition"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
