import { getSupabase, isSupabaseMode } from "./supabase";

export type OrderMediaKind = "carview" | "layout" | "salon" | "finished" | "receipt";

const BUCKET = "order-media";

/** Больше этого размера по длинной стороне фотографии не нужны. */
const MAX_SIDE = 1600;
/** Качество WebP: визуально неотличимо, вес в разы меньше. */
const WEBP_QUALITY = 0.82;
/** Сколько ждём ответа хранилища, прежде чем считать загрузку неудачной. */
const UPLOAD_TIMEOUT_MS = 25000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}: сервер не ответил за ${Math.round(ms / 1000)} секунд`)), ms)
    ),
  ]);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Не удалось прочитать фотографию"));
    reader.readAsDataURL(blob);
  });
}

function tagDataUrl(url: string, kind: OrderMediaKind) {
  return url.replace(/^data:([^;,]+)/, `data:$1;kovron-kind=${kind}`);
}

/** Безопасное расширение файла для имени в хранилище. */
function safeExtension(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (ext && ext.length <= 5) return ext;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

/** Поддерживает ли браузер сохранение в WebP. */
let webpSupported: boolean | null = null;
function supportsWebp(): boolean {
  if (webpSupported !== null) return webpSupported;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    webpSupported = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    webpSupported = false;
  }
  return webpSupported;
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* HEIC и некоторые форматы не читаются так — пробуем через <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Не удалось открыть изображение"));
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}

/**
 * Уменьшает фотографию и переводит её в WebP.
 * Возвращает готовый файл и расширение. Если браузер не умеет
 * WebP — сохраняет в JPEG, качество и размер остаются приемлемыми.
 */
async function compressImage(file: File): Promise<{ blob: Blob; ext: string; type: string }> {
  const source = await loadBitmap(file);
  const width = "width" in source ? source.width : 0;
  const height = "height" in source ? source.height : 0;
  if (!width || !height) throw new Error("Не удалось определить размер изображения");

  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Не удалось подготовить фотографию");
  context.drawImage(source as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  if ("close" in source && typeof source.close === "function") source.close();

  const useWebp = supportsWebp();
  const type = useWebp ? "image/webp" : "image/jpeg";
  const ext = useWebp ? "webp" : "jpg";

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      result => (result ? resolve(result) : reject(new Error("Не удалось сжать фотографию"))),
      type,
      WEBP_QUALITY
    );
  });

  return { blob, ext, type };
}

export async function uploadOrderMedia(
  file: File,
  kind: OrderMediaKind,
  orderId?: string
): Promise<string> {
  if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
    throw new Error("Можно загружать только изображения");
  }
  if (file.size > 25 * 1024 * 1024) {
    throw new Error("Фотография больше 25 МБ. Выберите файл поменьше");
  }

  // Сжимаем всегда — в хранилище летят сотни килобайт вместо десятков мегабайт.
  // Если браузер не смог обработать файл (необычный формат с телефона),
  // отправляем оригинал: лучше тяжёлое фото, чем никакого.
  let prepared: { blob: Blob; ext: string; type: string };
  try {
    prepared = await compressImage(file);
  } catch (err) {
    console.warn("Сжатие не удалось, отправляем оригинал:", err);
    if (file.size > 12 * 1024 * 1024) {
      throw new Error("Фотография слишком большая и не сжимается. Выберите файл до 12 МБ");
    }
    prepared = {
      blob: file,
      ext: safeExtension(file),
      type: file.type || "image/jpeg",
    };
  }

  if (!isSupabaseMode) {
    return tagDataUrl(await blobToDataUrl(prepared.blob), kind);
  }

  const sb = getSupabase();
  if (!sb) throw new Error("Хранилище фотографий недоступно");

  const owner = orderId || `draft-${Date.now()}`;
  const path = `${owner}/${kind}/${crypto.randomUUID()}.${prepared.ext}`;

  try {
    const { error } = await withTimeout(
      sb.storage.from(BUCKET).upload(path, prepared.blob, {
        cacheControl: "31536000",
        contentType: prepared.type,
        upsert: false,
      }),
      UPLOAD_TIMEOUT_MS,
      "Загрузка фотографии"
    );

    if (error) {
      console.error("Storage upload error:", error);
      throw new Error(`Не удалось загрузить фотографию: ${error.message}`);
    }

    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error("Не удалось получить ссылку на фотографию");
    return data.publicUrl;
  } catch (err) {
    // Раньше здесь фотография молча сохранялась в саму базу текстом.
    // Одна такая весила до полумегабайта и тормозила всё приложение.
    // Теперь честно сообщаем об ошибке — заказ сохранится и без фото.
    const reason = err instanceof Error ? err.message : "нет связи с хранилищем";
    throw new Error(`${reason}. Заказ можно сохранить без фотографии и добавить её позже.`);
  }
}

export function isSalonPhoto(url: string) {
  return url.includes("/salon/") || url.includes("kovron-kind=salon");
}

export function isFinishedPhoto(url: string) {
  return url.includes("/finished/") || url.includes("kovron-kind=finished");
}

/** Фотография «Вид машины» — она же обложка заказа в списке. */
export function isCarViewPhoto(url: string) {
  return url.includes("/carview/") || url.includes("kovron-kind=carview");
}

/**
 * Метка вместо фотографии. Тяжёлые фото, лежащие в базе текстом,
 * не отправляются в общий список — вместо них приходит такая метка.
 */
export function isPhotoPlaceholder(url?: string | null) {
  return !!url && url.startsWith("inline:");
}

/** Можно ли показать это как картинку. */
export function isDisplayableImage(url?: string | null) {
  return !!url && !isPhotoPlaceholder(url);
}

/** Обложка заказа: вид машины, а если его нет — первое подходящее фото. */
export function orderCoverPhoto(photos: string[] = [], layoutImage?: string | null) {
  const usable = photos.filter(isDisplayableImage);
  return usable.find(isCarViewPhoto)
    || usable.find(url => !isFinishedPhoto(url))
    || (isDisplayableImage(layoutImage) ? layoutImage! : undefined);
}

/** Есть ли у заказа фотографии вообще — включая те, что лежат в базе. */
export function orderHasPhotos(photos: string[] = [], layoutImage?: string | null) {
  return photos.length > 0 || !!layoutImage;
}
