import { getSupabase, isSupabaseMode } from "./supabase";

export type OrderMediaKind = "layout" | "salon" | "finished" | "receipt";

const BUCKET = "order-media";

function safeExtension(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (ext && ext.length <= 5) return ext;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Не удалось прочитать фотографию"));
    reader.readAsDataURL(file);
  });
}

export async function uploadOrderMedia(file: File, kind: OrderMediaKind, orderId?: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Можно загружать только изображения");
  if (file.size > 12 * 1024 * 1024) throw new Error("Размер фотографии не должен превышать 12 МБ");

  if (!isSupabaseMode) return fileToDataUrl(file);

  const sb = getSupabase();
  if (!sb) throw new Error("Хранилище фотографий недоступно");
  const owner = orderId || `draft-${Date.now()}`;
  const path = `${owner}/${kind}/${crypto.randomUUID()}.${safeExtension(file)}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Не удалось загрузить фотографию: ${error.message}`);
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function isSalonPhoto(url: string) {
  return url.includes("/salon/");
}

export function isFinishedPhoto(url: string) {
  return url.includes("/finished/");
}
