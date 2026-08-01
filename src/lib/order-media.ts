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

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Не удалось прочитать фотографию"));
    reader.readAsDataURL(file);
  });
}

function tagDataUrl(url: string, kind: OrderMediaKind) {
  return url.replace(/^data:([^;,]+)/, `data:$1;kovron-kind=${kind}`);
}

async function imageToCompactDataUrl(file: File, kind: OrderMediaKind): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1400;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Не удалось подготовить фотографию");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error("Не удалось уменьшить фотографию")), "image/jpeg", 0.72);
    });
    return tagDataUrl(await fileToDataUrl(blob), kind);
  } catch {
    if (file.size > 2 * 1024 * 1024) {
      throw new Error("Не удалось подготовить фотографию. Выберите изображение размером до 2 МБ");
    }
    return tagDataUrl(await fileToDataUrl(file), kind);
  }
}

export async function uploadOrderMedia(file: File, kind: OrderMediaKind, orderId?: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Можно загружать только изображения");
  if (file.size > 12 * 1024 * 1024) throw new Error("Размер фотографии не должен превышать 12 МБ");

  if (!isSupabaseMode) return imageToCompactDataUrl(file, kind);

  const sb = getSupabase();
  if (!sb) throw new Error("Хранилище фотографий недоступно");
  const owner = orderId || `draft-${Date.now()}`;
  const path = `${owner}/${kind}/${crypto.randomUUID()}.${safeExtension(file)}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) return imageToCompactDataUrl(file, kind);
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function isSalonPhoto(url: string) {
  return url.includes("/salon/") || url.includes("kovron-kind=salon");
}

export function isFinishedPhoto(url: string) {
  return url.includes("/finished/") || url.includes("kovron-kind=finished");
}
