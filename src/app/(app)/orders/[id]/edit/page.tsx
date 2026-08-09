"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OrderPhotoPicker } from "@/components/order-photo-picker";
import { CarCatalogPicker, type CatalogMediaMatch } from "@/components/car-catalog-picker";
import { ReceivePaymentDialog } from "@/components/receive-payment-dialog";
import { PayContractorDialog } from "@/components/pay-contractor-dialog";
import { useData } from "@/lib/data-context";
import { kitLabels } from "@/lib/demo-data";
import { cn, formatCurrency } from "@/lib/utils";
import { isFinishedPhoto, isCarViewPhoto } from "@/lib/order-media";
import type { KitType } from "@/lib/types";
import { ModalPortal } from "@/components/ui/modal-portal";

function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Сохранение заняло слишком много времени")), milliseconds);
    promise.then(value => {
      window.clearTimeout(timer);
      resolve(value);
    }, error => {
      window.clearTimeout(timer);
      reject(error);
    });
  });
}

export default function EditOrderPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { orders, clients, cars, users, loading, updateFullOrder } = useData();
  const order = orders.find(item => item.id === params.id);
  const client = order ? clients.find(item => item.id === order.clientId) : undefined;
  const car = order ? cars.find(item => item.id === order.carId) : undefined;
  const finishedPhotos = useMemo(() => order?.photos.filter(isFinishedPhoto) || [], [order]);
  const initialCarViewPhotos = useMemo(() => order?.photos.filter(isCarViewPhoto) || [], [order]);
  const initialSalonPhotos = useMemo(
    () => order?.photos.filter(url => !isFinishedPhoto(url) && !isCarViewPhoto(url)) || [],
    [order]
  );

  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [savingLabel, setSavingLabel] = useState("Сохраняем изменения…");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const initializedOrderId = useRef<string | null>(null);
  const [form, setForm] = useState({
    clientName: "", clientPhone: "", clientPhone2: "", clientMessenger: "", clientComment: "", clientSource: "",
    carBrand: "", carModel: "", carGeneration: "", carYear: "", carBody: "", carPlateNumber: "", carComment: "",
    kitTypes: [] as KitType[], assigneeId: "", desiredDate: "", priority: "normal",
    totalPrice: "", prepayment: "", seamstressPayment: "", chineseCost: "", materialCost: "", otherCosts: "",
    seamstressComment: "", layoutPhotos: [] as string[], salonPhotos: [] as string[],
    carViewPhotos: [] as string[],
  });

  useEffect(() => {
    if (!order || !client || !car) return;
    if (initializedOrderId.current === order.id) return;
    initializedOrderId.current = order.id;
    const serverForm = {
      clientName: client.name || "", clientPhone: client.phone || "", clientPhone2: client.phone2 || "",
      clientMessenger: client.messenger || "", clientComment: client.comment || "", clientSource: client.source || "",
      carBrand: car.brand || "", carModel: car.model || "", carGeneration: car.generation || "",
      carYear: car.year ? String(car.year) : "", carBody: car.body || "", carPlateNumber: car.plateNumber || "", carComment: car.comment || "",
      kitTypes: order.kitTypes, assigneeId: order.assigneeId || "", desiredDate: order.desiredDate || "", priority: order.priority,
      totalPrice: String(order.totalPrice || ""), prepayment: String(order.prepayment || ""),
      seamstressPayment: String(order.seamstressPayment || ""),
      chineseCost: String(order.chineseCost || ""), materialCost: String(order.materialCost || ""), otherCosts: String(order.otherCosts || ""),
      seamstressComment: order.seamstressComment || "", layoutPhotos: order.layoutImage ? [order.layoutImage] : [],
      salonPhotos: initialSalonPhotos, carViewPhotos: initialCarViewPhotos,
    };
    try {
      const savedDraft = window.localStorage.getItem(`kovron-order-draft-${order.id}`);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft) as { form?: Partial<typeof serverForm> };
        setForm({ ...serverForm, ...(parsed.form || {}) });
        setDirty(true);
        setDraftRestored(true);
        return;
      }
    } catch {
      window.localStorage.removeItem(`kovron-order-draft-${order.id}`);
    }
    setForm(serverForm);
    setDirty(false);
    setDraftRestored(false);
  }, [order?.id, client?.id, car?.id, initialSalonPhotos]);

  useEffect(() => {
    if (!dirty || !order) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(`kovron-order-draft-${order.id}`, JSON.stringify({ form, updatedAt: new Date().toISOString() }));
      } catch {
        // The server save remains available even if the browser has no room for a local draft.
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [dirty, form, order]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty && !saving) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saving]);

  const update = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
    setMessage(null);
  };

  const applyCatalogCar = (brand: string, model: string) => {
    setForm(prev => ({ ...prev, carBrand: brand, carModel: model }));
    setDirty(true);
    setMessage(null);
  };

  const applyCatalogDetails = (details: { generation?: string; year?: string; body?: string }) => {
    setForm(prev => ({
      ...prev,
      carGeneration: details.generation ?? prev.carGeneration,
      carYear: details.year ?? prev.carYear,
      carBody: details.body ?? prev.carBody,
    }));
    setDirty(true);
    setMessage(null);
  };

  const applyCatalogMedia = (match: CatalogMediaMatch | null) => {
    setForm(prev => ({
      ...prev,
      carViewPhotos: match?.carImageUrl
        ? (!prev.carViewPhotos.length || prev.carViewPhotos[0].includes("/api/csj-image") ? [match.carImageUrl] : prev.carViewPhotos)
        : prev.carViewPhotos.filter(url => !url.includes("/api/csj-image")),
      layoutPhotos: match?.technologyImageUrl
        ? (!prev.layoutPhotos.length || prev.layoutPhotos[0].includes("/api/csj-image") ? [match.technologyImageUrl] : prev.layoutPhotos)
        : prev.layoutPhotos.filter(url => !url.includes("/api/csj-image")),
    }));
    setDirty(true);
  };

  const toggleKit = (kit: KitType) => update("kitTypes", form.kitTypes.includes(kit)
    ? form.kitTypes.filter(item => item !== kit)
    : [...form.kitTypes, kit]);

  const save = async () => {
    if (!order || !client || !car || saving) return;
    if (!form.clientName.trim() || !form.clientPhone.trim() || !form.carBrand.trim() || !form.carModel.trim()) {
      setMessage("Заполните имя и телефон клиента, марку и модель автомобиля");
      return;
    }
    const totalPrice = Number(form.totalPrice) || 0;
    if (totalPrice < 0) {
      setMessage("Стоимость не может быть отрицательной");
      return;
    }
    // Полученные деньги здесь не редактируются: они меняются только
    // через «Получить оплату», которая создаёт финансовую операцию.
    if (totalPrice < order.paid) {
      setMessage(`Стоимость не может быть меньше уже полученных ${order.paid.toLocaleString("ru-RU")} ₽. Сначала оформите возврат.`);
      return;
    }
    setSaving(true);
    setSavingLabel("Сохраняем изменения…");
    setMessage(null);
    const clientChanged = form.clientName.trim() !== client.name || form.clientPhone.trim() !== client.phone || form.clientPhone2 !== (client.phone2 || "") || form.clientMessenger !== (client.messenger || "") || form.clientComment !== (client.comment || "") || form.clientSource !== (client.source || "");
    const carChanged = form.carBrand.trim() !== car.brand || form.carModel.trim() !== car.model || form.carGeneration !== (car.generation || "") || form.carYear !== (car.year ? String(car.year) : "") || form.carBody !== (car.body || "") || form.carPlateNumber !== (car.plateNumber || "") || form.carComment !== (car.comment || "");
    try {
      // Один запрос к серверу: клиент, автомобиль, заказ и журнал.
      // Данные о заказе возвращаются сразу — перезагружать всё не нужно.
      const ok = await withTimeout(updateFullOrder({
        orderId: order.id,
        client: clientChanged ? {
          name: form.clientName.trim(),
          phone: form.clientPhone.trim(),
          phone2: form.clientPhone2 || undefined,
          messenger: form.clientMessenger || undefined,
          comment: form.clientComment || undefined,
          source: form.clientSource || undefined,
        } : undefined,
        car: carChanged ? {
          brand: form.carBrand.trim(),
          model: form.carModel.trim(),
          generation: form.carGeneration || undefined,
          year: form.carYear ? Number(form.carYear) : undefined,
          body: form.carBody || undefined,
          plateNumber: form.carPlateNumber || undefined,
          comment: form.carComment || undefined,
        } : undefined,
        order: {
          kitTypes: form.kitTypes,
          assigneeId: form.assigneeId || null,
          desiredDate: form.desiredDate || null,
          priority: form.priority as typeof order.priority,
          totalPrice,
          seamstressPayment: Number(form.seamstressPayment) || 0,
          chineseCost: Number(form.chineseCost) || 0,
          materialCost: Number(form.materialCost) || 0,
          otherCosts: Number(form.otherCosts) || 0,
          seamstressComment: form.seamstressComment,
          layoutImage: form.layoutPhotos[0] || null,
          photos: [...form.carViewPhotos, ...form.salonPhotos, ...finishedPhotos],
        },
      }), 20000);

      if (ok) {
        window.localStorage.removeItem(`kovron-order-draft-${order.id}`);
        setDirty(false);
        setDraftRestored(false);
        router.push(`/orders/${order.id}`);
        return;
      }
      setMessage("Не удалось сохранить. Черновик сохранён — проверьте соединение и повторите.");
      setSaving(false);
    } catch (error) {
      console.error("Save order error:", error);
      const details = error instanceof Error ? error.message : "";
      setMessage(
        /слишком много времени/i.test(details)
          ? "Сервер не ответил вовремя. Черновик сохранён — нажмите «Сохранить» ещё раз."
          : `Не удалось сохранить.${details ? ` ${details}` : " Черновик сохранён."}`
      );
      setSaving(false);
    }
  };

  const requestExit = () => {
    if (saving) return;
    if (dirty) setShowLeaveConfirm(true);
    else router.push(`/orders/${params.id}`);
  };

  const leaveWithDraft = () => {
    setDirty(false);
    setShowLeaveConfirm(false);
    router.push(`/orders/${params.id}`);
  };

  if (loading || !order || !client || !car) {
    return <div className="p-8 text-center text-sm text-muted-foreground">{loading ? "Загрузка заказа…" : "Заказ не найден"}</div>;
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-4 pb-36 lg:pb-28">
      <div className="flex items-center gap-3">
        <button type="button" onClick={requestExit} className="p-2 rounded-sm hover:bg-card" aria-label="Вернуться к заказу"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Редактирование заказа №{order.number}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Изменения будут записаны в журнал действий</p>
        </div>
      </div>

      {message && <div className="rounded-md border border-expense/30 bg-expense/10 p-3 text-sm text-expense">{message}</div>}
      {draftRestored && <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm"><p className="font-medium text-primary">Черновик восстановлен</p><p className="text-xs text-muted-foreground mt-0.5">Ваши несохранённые изменения сохранились на этом устройстве.</p></div>}

      <Card><CardContent className="p-4 space-y-3">
        <h2 className="font-semibold">Клиент</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Имя"><Input value={form.clientName} onChange={e => update("clientName", e.target.value)} /></Field>
          <Field label="Телефон"><Input value={form.clientPhone} onChange={e => update("clientPhone", e.target.value)} /></Field>
          <Field label="Дополнительный телефон"><Input value={form.clientPhone2} onChange={e => update("clientPhone2", e.target.value)} /></Field>
          <Field label="Мессенджер"><Input value={form.clientMessenger} onChange={e => update("clientMessenger", e.target.value)} /></Field>
          <Field label="Источник"><Input value={form.clientSource} onChange={e => update("clientSource", e.target.value)} /></Field>
          <Field label="Комментарий"><Input value={form.clientComment} onChange={e => update("clientComment", e.target.value)} /></Field>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-4 space-y-3">
        <h2 className="font-semibold">Автомобиль</h2>
        <CarCatalogPicker
          brand={form.carBrand}
          model={form.carModel}
          generation={form.carGeneration}
          year={form.carYear}
          body={form.carBody}
          onCarChange={applyCatalogCar}
          onDetailsChange={applyCatalogDetails}
          onMediaFound={applyCatalogMedia}
        />
        <Field label="Госномер"><Input value={form.carPlateNumber} onChange={e => update("carPlateNumber", e.target.value)} /></Field>
      </CardContent></Card>

      <Card><CardContent className="p-4 space-y-4">
        <h2 className="font-semibold">Заказ и производство</h2>
        <div>
          <p className="text-sm text-muted-foreground mb-2">Комплект</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(kitLabels).map(([key, label]) => (
              <button type="button" key={key} onClick={() => toggleKit(key as KitType)} className={cn(
                "p-3 rounded-md border text-left text-sm transition-colors",
                form.kitTypes.includes(key as KitType) ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
              )}>
                {form.kitTypes.includes(key as KitType) && <Check className="h-4 w-4 text-primary mb-1" />}{label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Исполнитель"><select className="w-full h-10 rounded-sm border border-border bg-background px-3 text-sm" value={form.assigneeId} onChange={e => update("assigneeId", e.target.value)}><option value="">Не назначен</option>{users.filter(item => item.role === "seamstress").map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          <Field label="Срок"><Input type="date" value={form.desiredDate} onChange={e => update("desiredDate", e.target.value)} /></Field>
          <Field label="Приоритет"><select className="w-full h-10 rounded-sm border border-border bg-background px-3 text-sm" value={form.priority} onChange={e => update("priority", e.target.value)}><option value="low">Низкий</option><option value="normal">Обычный</option><option value="high">Высокий</option><option value="urgent">Срочный</option></select></Field>
        </div>
        <Field label="Комментарий для Оксаны"><Input value={form.seamstressComment} onChange={e => update("seamstressComment", e.target.value)} /></Field>
      </CardContent></Card>

      <Card><CardContent className="p-4 space-y-6">
        <h2 className="font-semibold">Фотографии</h2>
        <OrderPhotoPicker label="Вид машины" hint="Одна фотография — обложка заказа в списке" kind="carview" orderId={order.id} urls={form.carViewPhotos} onChange={urls => update("carViewPhotos", urls)} max={1} />
        <OrderPhotoPicker label="Пол салона" hint="До четырёх фотографий" kind="salon" orderId={order.id} urls={form.salonPhotos} onChange={urls => update("salonPhotos", urls)} max={4} />
        <OrderPhotoPicker label="Раскладка лекал" hint="Одна картинка" kind="layout" orderId={order.id} urls={form.layoutPhotos} onChange={urls => update("layoutPhotos", urls)} max={1} />
      </CardContent></Card>

      <Card><CardContent className="p-4 space-y-3">
        <h2 className="font-semibold">Финансы</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Стоимость заказа"><Input type="number" value={form.totalPrice} onChange={e => update("totalPrice", e.target.value)} /></Field>
          <Field label="Оплата Оксане"><Input type="number" value={form.seamstressPayment} onChange={e => update("seamstressPayment", e.target.value)} /></Field>
          <Field label="Оплата китайцам"><Input type="number" value={form.chineseCost} onChange={e => update("chineseCost", e.target.value)} /></Field>
          <Field label="Материалы"><Input type="number" value={form.materialCost} onChange={e => update("materialCost", e.target.value)} /></Field>
          <Field label="Другие расходы"><Input type="number" value={form.otherCosts} onChange={e => update("otherCosts", e.target.value)} /></Field>
        </div>

        {/* Деньги меняются только через проводку, иначе касса разойдётся с заказами */}
        <div className="rounded-md border border-border bg-background p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Предоплата и другие поступления</span>
            <span className="font-semibold text-income">{formatCurrency(order.paid)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Осталось получить с клиента</span>
            <span className={`font-semibold ${order.remaining > 0 ? "text-expense" : "text-income"}`}>
              {formatCurrency(order.remaining)}
            </span>
          </div>
          {order.remaining > 0 && (
            <ReceivePaymentDialog order={order} />
          )}
          <p className="text-xs text-muted-foreground">
            Деньги зачисляются на счёт только через «Получить оплату» — так заказ
            и касса всегда совпадают.
          </p>
        </div>

        {/* Выплаты подрядчикам — только вручную */}
        <PayContractorDialog order={order} />
      </CardContent></Card>

      <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:bottom-4 left-4 right-4 lg:left-auto z-40 flex justify-end pointer-events-none">
        <Button onClick={() => void save()} disabled={saving || !dirty} className="pointer-events-auto shadow-xl min-w-44">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {saving ? "Сохранение…" : dirty ? "Сохранить" : "Сохранено"}
        </Button>
      </div>

      {showLeaveConfirm && (
        <ModalPortal><div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLeaveConfirm(false)} />
          <div className="app-dialog-height relative w-full overflow-y-auto sm:max-w-md rounded-t-lg sm:rounded-lg border border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl">
            <h2 className="text-lg font-bold">Изменения ещё не сохранены</h2>
            <p className="text-sm text-muted-foreground mt-2">Если выйти, введённые данные останутся черновиком на этом устройстве. Вы сможете вернуться и продолжить.</p>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <Button variant="outline" onClick={leaveWithDraft}>Выйти</Button>
              <Button onClick={() => setShowLeaveConfirm(false)}>Остаться</Button>
            </div>
          </div>
        </div></ModalPortal>
      )}

      {saving && (
        <ModalPortal><div className="fixed inset-0 z-[500] flex items-center justify-center bg-background/85 backdrop-blur-sm p-6">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center shadow-2xl">
            <Loader2 className="h-9 w-9 mx-auto animate-spin text-primary" />
            <p className="font-semibold mt-4">{savingLabel}</p>
            <p className="text-sm text-muted-foreground mt-2">Не закрывайте страницу. Обычно это занимает несколько секунд.</p>
          </div>
        </div></ModalPortal>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm text-muted-foreground mb-1 block">{label}</span>{children}</label>;
}
