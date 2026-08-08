"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderPhotoPicker } from "@/components/order-photo-picker";
import { useData } from "@/lib/data-context";
import { isFinishedPhoto } from "@/lib/order-media";
import type { Order } from "@/lib/types";

export function CompleteWorkDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const { updateOrder, updateOrderStatus } = useData();
  const otherPhotos = useMemo(() => order.photos.filter(url => !isFinishedPhoto(url)), [order.photos]);
  const [photos, setPhotos] = useState(() => order.photos.filter(isFinishedPhoto));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const complete = async () => {
    setSaving(true);
    setError(null);
    const photosSaved = await updateOrder(order.id, { photos: [...otherPhotos, ...photos] });
    const statusSaved = photosSaved && await updateOrderStatus(order.id, "ready");
    setSaving(false);
    if (statusSaved) onClose();
    else setError("Не удалось завершить заказ. Проверьте соединение и повторите попытку.");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <div className="app-dialog-height relative w-full sm:max-w-lg overflow-y-auto rounded-t-lg sm:rounded-lg border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div><h2 className="text-lg font-bold">Завершение работы</h2><p className="text-sm text-muted-foreground">Фотографии готовых ковриков можно добавить по желанию</p></div>
          <button onClick={onClose} disabled={saving} className="p-2 rounded-sm hover:bg-background"><X className="h-4 w-4" /></button>
        </div>
        <OrderPhotoPicker label="Готовые коврики" hint="Необязательно, до четырёх фотографий" kind="finished" orderId={order.id} urls={photos} onChange={setPhotos} max={4} disabled={saving} />
        {error && <p className="text-sm text-expense mt-3">{error}</p>}
        <Button className="w-full h-12 mt-5 bg-income hover:bg-income/90 text-white" onClick={() => void complete()} disabled={saving}>
          {saving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
          {saving ? "Сохранение…" : "Работа завершена"}
        </Button>
      </div>
    </div>
  );
}
