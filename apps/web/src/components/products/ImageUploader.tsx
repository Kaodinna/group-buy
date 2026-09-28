"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { authFetch } from "@/lib/auth-fetch";
import { ApiError } from "@/lib/api-client";

const MAX_IMAGES = 6;

interface UploadedImage {
  url: string;
  publicId: string;
}

export function ImageUploader({
  images,
  onChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const result = await authFetch.upload<UploadedImage>("/products/upload-image", formData);
      onChange([...images, result.url]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not upload this image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Removes by position, not by URL value - two uploads can legitimately
  // resolve to the same URL (e.g. the same file picked twice), and filtering
  // by value would then delete every matching copy instead of just one.
  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-3">
        {images.map((url, index) => (
          <div
            key={`${index}-${url}`}
            className="group relative h-20 w-20 overflow-hidden rounded-lg border border-border bg-black/3 dark:bg-white/6"
          >
            <Image src={url} alt="" fill sizes="80px" className="object-cover" />
            {index === 0 && (
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-center text-[10px] font-medium text-white">
                Cover
              </span>
            )}
            <button
              type="button"
              onClick={() => handleRemove(index)}
              aria-label="Remove image"
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              &times;
            </button>
          </div>
        ))}

        {images.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted hover:border-primary hover:text-primary-dark disabled:opacity-60"
          >
            {uploading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
            ) : (
              <>
                <span className="text-lg leading-none">+</span>
                <span>Add photo</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && <p className="text-xs text-error">{error}</p>}
      <p className="text-xs text-muted">
        Up to {MAX_IMAGES} photos, 5MB each. The first photo is used as the cover image.
      </p>
    </div>
  );
}
