"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadOrderMedia, type OrderMediaKind } from "@/lib/order-media";

interface OrderPhotoPickerProps {
  label: string;
  hint?: string;
  kind: OrderMediaKind;
  urls: string[];
  onChange: (urls: string[]) => void;
  max: number;
  min?: number;
  orderId?: string;
  disabled?: boolean;
}

export function OrderPhotoPicker({
  label, hint, kind, urls, onChange, max, min = 0, orderId, disabled,
}: OrderPhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remaining = Math.max(0, max - urls.length);

  const selectFiles = async (files: FileList | null) => {
    if (!files?.length || !remaining) return;
    const selected = Array.from(files).slice(0, remaining);
    setUploading(true);
    setError(null);
    try {
      const uploaded = await Promise.all(selected.map(file => uploadOrderMedia(file, kind, orderId)));
      onChange([...urls, ...uploaded]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить фотографию");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {label}{min > 0 && <span className="text-expense ml-1">*</span>}
          </p>
          {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
        </div>
        <span className={cn("text-xs shrink-0", urls.length < min ? "text-expense" : "text-muted-foreground")}>
          {urls.length}/{max}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {urls.map((url, index) => (
          <div key={`${url}-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-md border border-border bg-background group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`${label} ${index + 1}`} className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(urls.filter((_, itemIndex) => itemIndex !== index))}
                className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/65 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                aria-label="Удалить фотографию"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}

        {!disabled && remaining > 0 && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="aspect-[4/3] rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : kind === "salon" ? <Camera className="h-6 w-6" /> : <ImagePlus className="h-6 w-6" />}
            <span className="text-xs">{uploading ? "Загрузка…" : "Добавить"}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={kind === "salon" || kind === "finished" ? "environment" : undefined}
        multiple={max > 1}
        className="hidden"
        onChange={event => void selectFiles(event.target.files)}
      />
      {error && <p className="text-xs text-expense">{error}</p>}
      {urls.length < min && <p className="text-xs text-expense">Нужно добавить ещё {min - urls.length}</p>}
    </div>
  );
}
