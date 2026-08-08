"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency, cn } from "@/lib/utils";
import { useData } from "@/lib/data-context";
import { useAuth } from "@/lib/auth-context";
import { kitLabels, clientSources } from "@/lib/demo-data";
import { OrderPhotoPicker } from "@/components/order-photo-picker";
import { CarCatalogPicker, type CatalogMediaMatch } from "@/components/car-catalog-picker";
import type { Car as ClientCar, Client } from "@/lib/types";
import {
  ArrowLeft, User, Car, Package, ImagePlus, MessageSquare,
  Calendar, Wallet, ChevronRight, Check, Search, Plus, X,
} from "lucide-react";
import Link from "next/link";

const steps = [
  { key: "client", label: "Клиент", icon: User },
  { key: "car", label: "Автомобиль", icon: Car },
  { key: "kit", label: "Комплект", icon: Package },
  { key: "images", label: "Фотографии", icon: ImagePlus },
  { key: "details", label: "Комментарий", icon: MessageSquare },
  { key: "dates", label: "Сроки", icon: Calendar },
  { key: "finance", label: "Финансы", icon: Wallet },
];

const kitOptions = Object.entries(kitLabels);

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8")) ? digits.slice(1) : digits;
}

function createDraftOrderNumber() {
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}${now.getSeconds().toString().padStart(2, "0")}`;
  const suffix = Math.floor(Math.random() * 90 + 10);
  return `${now.getDate().toString().padStart(2, "0")}${(now.getMonth() + 1).toString().padStart(2, "0")}-${time}-${suffix}`;
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number, stage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${stage} заняло слишком много времени`)), milliseconds);
    promise.then(value => {
      window.clearTimeout(timer);
      resolve(value);
    }, error => {
      window.clearTimeout(timer);
      reject(error);
    });
  });
}

export default function NewOrderPage() {
  const { user } = useAuth();
  const {
    users, clients, cars, orders, accounts, incomeCategories,
    createOrder, createOrderWithPayment, createFullOrder, createClient, createCar, createTransaction,
  } = useData();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [clientSearch, setClientSearch] = useState("");
  const [creatingNewClient, setCreatingNewClient] = useState(false);
  const [existingClient, setExistingClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingStage, setSavingStage] = useState("Сохраняем заказ…");
  const [savedNumber, setSavedNumber] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const prefillApplied = useRef(false);
  const newDraftLoaded = useRef(false);
  const orderNumber = useRef(createDraftOrderNumber());
  const clientDraftId = useRef(crypto.randomUUID());
  const carDraftId = useRef(crypto.randomUUID());
  const orderDraftId = useRef(crypto.randomUUID());
  const paymentDraftId = useRef(crypto.randomUUID());

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty && !saving) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saving]);

  const [form, setForm] = useState({
    clientName: "",
    clientPhone: "",
    clientPhone2: "",
    clientMessenger: "",
    clientComment: "",
    clientSource: "",
    carBrand: "",
    carModel: "",
    carGeneration: "",
    carYear: "",
    carBody: "",
    carTrim: "",
    carRows: "",
    carPlateNumber: "",
    carComment: "",
    existingCarId: "",
    kitTypes: [] as string[],
    seamstressComment: "",
    desiredDate: "",
    assigneeId: "",
    priority: "normal",
    totalPrice: "",
    prepayment: "",
    prepaymentAccount: "",
    seamstressPayment: "",
    chineseCost: "",
    materialCost: "",
    otherCosts: "",
    carViewPhotos: [] as string[],
    layoutPhotos: [] as string[],
    salonPhotos: [] as string[],
  });

  useEffect(() => {
    if (form.prepaymentAccount || !accounts.length) return;
    const defaultAccount = accounts.find(item => item.active && item.type === "cash")
      || accounts.find(item => item.active);
    if (defaultAccount) {
      setForm(prev => ({ ...prev, prepaymentAccount: defaultAccount.id }));
    }
  }, [accounts, form.prepaymentAccount]);

  const updateForm = (field: string, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
    setSaveError(null);
  };

  const applyCatalogCar = (brand: string, model: string, suggestedYear?: number) => {
    setForm(prev => ({ ...prev, carBrand: brand, carModel: model, carYear: suggestedYear ? String(suggestedYear) : prev.carYear, existingCarId: "" }));
    setDirty(true);
    setSaveError(null);
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

  const toggleKit = (kit: string) => {
    setForm((prev) => ({
      ...prev,
      kitTypes: prev.kitTypes.includes(kit)
        ? prev.kitTypes.filter((k) => k !== kit)
        : [...prev.kitTypes, kit],
    }));
    setDirty(true);
    setSaveError(null);
  };

  const selectClient = (client: Client, markDirty = true) => {
    setExistingClient(client);
    setCreatingNewClient(false);
    setClientSearch("");
    setForm(prev => ({
      ...prev,
      clientName: client.name,
      clientPhone: client.phone,
      clientPhone2: client.phone2 || "",
      clientMessenger: client.messenger || "",
      clientComment: client.comment || "",
      clientSource: client.source || "",
      existingCarId: "",
      carBrand: "", carModel: "", carGeneration: "", carYear: "", carBody: "", carPlateNumber: "", carComment: "",
    }));
    if (markDirty) setDirty(true);
    setSaveError(null);
    carDraftId.current = crypto.randomUUID();
  };

  const selectCar = (car: ClientCar, markDirty = true) => {
    setForm(prev => ({
      ...prev,
      existingCarId: car.id,
      carBrand: car.brand,
      carModel: car.model,
      carGeneration: car.generation || "",
      carYear: car.year ? String(car.year) : "",
      carBody: car.body || "",
      carPlateNumber: car.plateNumber || "",
      carComment: car.comment || "",
    }));
    if (markDirty) setDirty(true);
    setSaveError(null);
  };

  const startNewCar = () => {
    carDraftId.current = crypto.randomUUID();
    setForm(prev => ({
      ...prev,
      existingCarId: "",
      carBrand: "", carModel: "", carGeneration: "", carYear: "", carBody: "", carPlateNumber: "", carComment: "",
    }));
    setDirty(true);
  };

  const matchingClients = useMemo(() => {
    const query = clientSearch.trim().toLocaleLowerCase("ru-RU");
    const phoneQuery = normalizePhone(clientSearch);
    if (query.length < 2 && phoneQuery.length < 3) return [];
    return clients.filter(client => {
      const matchesName = client.name.toLocaleLowerCase("ru-RU").includes(query);
      const matchesPhone = phoneQuery.length >= 3 && [client.phone, client.phone2 || ""].some(value => normalizePhone(value).includes(phoneQuery));
      return matchesName || matchesPhone;
    }).slice(0, 6);
  }, [clientSearch, clients]);

  useEffect(() => {
    if (prefillApplied.current || !clients.length) return;
    const params = new URLSearchParams(window.location.search);
    const repeatOrderId = params.get("repeatOrderId");
    const repeatOrder = repeatOrderId ? orders.find(order => order.id === repeatOrderId) : undefined;
    if (repeatOrderId && !repeatOrder) return;
    const selectedClient = clients.find(client => client.id === (repeatOrder?.clientId || params.get("clientId")));
    if (!selectedClient) return;
    const requestedCarId = repeatOrder?.carId || params.get("carId");
    if (requestedCarId && !cars.some(car => car.id === requestedCarId)) return;
    prefillApplied.current = true;
    selectClient(selectedClient, false);
    const selectedCar = cars.find(car => car.id === requestedCarId && car.clientId === selectedClient.id);
    if (selectedCar) selectCar(selectedCar, false);
    if (repeatOrder) {
      setForm(prev => ({
        ...prev,
        kitTypes: [...repeatOrder.kitTypes],
        assigneeId: repeatOrder.assigneeId || "",
        priority: "normal",
        seamstressComment: repeatOrder.seamstressComment || "",
        layoutPhotos: repeatOrder.layoutImage ? [repeatOrder.layoutImage] : [],
      }));
    }
  // Data arrays arrive asynchronously; this should run only once after the requested records exist.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, cars, orders]);

  useEffect(() => {
    if (newDraftLoaded.current || !user || !clients.length) return;
    newDraftLoaded.current = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get("clientId") || params.get("carId") || params.get("repeatOrderId")) return;
    try {
      const saved = window.localStorage.getItem(`kovron-new-order-draft-${user.id}`);
      if (!saved) return;
      const draft = JSON.parse(saved) as { form?: Partial<typeof form>; clientId?: string; step?: number; orderNumber?: string; clientDraftId?: string; carDraftId?: string; orderDraftId?: string; paymentDraftId?: string };
      setForm(prev => ({ ...prev, ...(draft.form || {}) }));
      const draftClient = clients.find(client => client.id === draft.clientId);
      if (draftClient) setExistingClient(draftClient);
      else setCreatingNewClient(true);
      if (typeof draft.step === "number") setStep(Math.min(Math.max(draft.step, 0), steps.length - 1));
      if (draft.orderNumber) orderNumber.current = draft.orderNumber;
      if (draft.clientDraftId) clientDraftId.current = draft.clientDraftId;
      if (draft.carDraftId) carDraftId.current = draft.carDraftId;
      if (draft.orderDraftId) orderDraftId.current = draft.orderDraftId;
      if (draft.paymentDraftId) paymentDraftId.current = draft.paymentDraftId;
      setDirty(true);
      setDraftRestored(true);
    } catch {
      window.localStorage.removeItem(`kovron-new-order-draft-${user.id}`);
    }
  }, [clients, user]);

  useEffect(() => {
    if (!dirty || !user) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(`kovron-new-order-draft-${user.id}`, JSON.stringify({
          form, clientId: existingClient?.id, step, orderNumber: orderNumber.current,
          clientDraftId: clientDraftId.current, carDraftId: carDraftId.current, orderDraftId: orderDraftId.current,
          paymentDraftId: paymentDraftId.current,
          updatedAt: new Date().toISOString(),
        }));
      } catch {
        // The order can still be saved to the server if local draft storage is full.
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [dirty, existingClient?.id, form, step, user]);

  const totalPrice = parseFloat(form.totalPrice) || 0;
  const prepayment = parseFloat(form.prepayment) || 0;
  const seamstressPayment = parseFloat(form.seamstressPayment) || 0;
  const chineseCost = parseFloat(form.chineseCost) || 0;
  const materialCost = parseFloat(form.materialCost) || 0;
  const otherCosts = parseFloat(form.otherCosts) || 0;
  const remaining = totalPrice - prepayment;
  const totalCosts = seamstressPayment + chineseCost + materialCost + otherCosts;
  const plannedProfit = totalPrice - totalCosts;

  const handleSave = async () => {
    if (saving) return;
    if (!existingClient && (!form.clientName.trim() || !form.clientPhone.trim())) {
      setStep(0);
      setCreatingNewClient(true);
      setSaveError("Выберите существующего клиента или заполните имя и телефон нового клиента.");
      return;
    }
    if (!existingClient) {
      const normalizedPhone = normalizePhone(form.clientPhone);
      const duplicate = normalizedPhone.length >= 5
        ? clients.find(client => [client.phone, client.phone2 || ""].some(value => normalizePhone(value) === normalizedPhone))
        : undefined;
      if (duplicate) {
        selectClient(duplicate);
        setStep(0);
        setSaveError(`Клиент с этим телефоном уже существует — выбран ${duplicate.name}. Проверьте данные и продолжите.`);
        return;
      }
    }
    if (!form.existingCarId && (!form.carBrand.trim() || !form.carModel.trim())) {
      setStep(1);
      setSaveError("Выберите автомобиль клиента или заполните марку и модель нового автомобиля.");
      return;
    }
    if (prepayment < 0 || prepayment > totalPrice) {
      setStep(6);
      setSaveError("Предоплата не может быть отрицательной или больше стоимости заказа.");
      return;
    }
    if (prepayment > 0 && !form.prepaymentAccount) {
      setStep(6);
      setSaveError("Выберите кассу или счёт, куда поступила оплата.");
      return;
    }
    setSaving(true);
    setSavingStage("Сохраняем заказ…");
    setSaveError(null);
    try {
      const paymentAccount = accounts.find(item => item.id === form.prepaymentAccount);
      const paymentMethod = paymentAccount?.type === "cash" ? "Наличные"
        : paymentAccount?.type === "card" ? "Карта" : "Перевод";

      // Один запрос к серверу: клиент, автомобиль, заказ и предоплата
      // сохраняются вместе. Повторное нажатие дубль не создаёт —
      // сервер узнаёт заказ по идентификатору черновика.
      const result = await withTimeout(createFullOrder({
        client: {
          id: existingClient?.id || clientDraftId.current,
          name: existingClient?.name || form.clientName.trim(),
          phone: existingClient?.phone || form.clientPhone.trim(),
          phone2: form.clientPhone2 || undefined,
          messenger: form.clientMessenger || undefined,
          comment: form.clientComment || undefined,
          source: form.clientSource || undefined,
        },
        car: {
          id: form.existingCarId || carDraftId.current,
          brand: form.carBrand.trim(),
          model: form.carModel.trim(),
          generation: form.carGeneration || undefined,
          year: form.carYear ? parseInt(form.carYear) : undefined,
          body: form.carBody || undefined,
          plateNumber: form.carPlateNumber || undefined,
          comment: form.carComment || undefined,
        },
        order: {
          id: orderDraftId.current,
          number: orderNumber.current,
          kitTypes: form.kitTypes as any,
          layoutImage: form.layoutPhotos[0],
          photos: [...form.carViewPhotos, ...form.salonPhotos],
          seamstressComment: form.seamstressComment || undefined,
          assigneeId: form.assigneeId || undefined,
          priority: form.priority as any,
          desiredDate: form.desiredDate || undefined,
          totalPrice,
          seamstressPayment,
          chineseCost,
          materialCost,
          otherCosts,
        },
        payment: prepayment > 0
          ? { amount: prepayment, accountId: form.prepaymentAccount, method: paymentMethod }
          : undefined,
      }), 30000, "Сохранение заказа");

      if (result) {
        setSavingStage("Заказ сохранён");
        setSavedNumber(result.number);
        if (user) window.localStorage.removeItem(`kovron-new-order-draft-${user.id}`);
        setDirty(false);
        setDraftRestored(false);
        // Короткая пауза, чтобы человек увидел подтверждение
        setTimeout(() => router.push("/orders"), 900);
        return;
      }
      setSaveError("Не удалось создать заказ. Проверьте соединение и повторите попытку.");
      setSaving(false);
    } catch (err) {
      console.error("Save error:", err);
      const details = err instanceof Error ? err.message : "";
      if (/row.level|permission|not authorized|jwt/i.test(details)) {
        setSaveError("У этого сотрудника нет прав на создание заказа. Проверьте роль в админке.");
      } else if (/слишком много времени/i.test(details)) {
        setSaveError("Сервер не ответил вовремя. Черновик сохранён — проверьте интернет и нажмите «Создать заказ» ещё раз, дубль не появится.");
      } else {
        setSaveError(`Не удалось сохранить заказ. Черновик сохранён.${details ? ` Причина: ${details}` : ""}`);
      }
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/orders" className="p-2 rounded-sm hover:bg-card transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Новый заказ</h1>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {steps.map((s, i) => (
          <button
            key={s.key}
            onClick={() => setStep(i)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-sm text-xs font-medium shrink-0 transition-all",
              i === step
                ? "bg-primary text-primary-foreground"
                : i < step
                ? "bg-income/10 text-income"
                : "bg-card text-muted-foreground"
            )}
          >
            {i < step ? <Check className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
            {s.label}
          </button>
        ))}
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="p-5 space-y-4">
          {step === 0 && (
            <>
              <h2 className="font-semibold text-lg">Клиент</h2>
              {existingClient ? (
                <div className="rounded-lg border border-primary/35 bg-primary/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold shrink-0">{existingClient.name[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{existingClient.name}</p>
                      <p className="text-sm text-muted-foreground">{existingClient.phone}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {cars.filter(car => car.clientId === existingClient.id).length} авто · {orders.filter(order => order.clientId === existingClient.id).length} заказов
                      </p>
                    </div>
                    <button type="button" onClick={() => {
                      setExistingClient(null);
                      setCreatingNewClient(false);
                      setClientSearch("");
                      clientDraftId.current = crypto.randomUUID();
                      carDraftId.current = crypto.randomUUID();
                      setForm(prev => ({ ...prev, clientName: "", clientPhone: "", clientPhone2: "", clientMessenger: "", clientComment: "", clientSource: "", existingCarId: "", carBrand: "", carModel: "", carGeneration: "", carYear: "", carBody: "", carPlateNumber: "", carComment: "" }));
                    }} className="p-2 rounded-sm hover:bg-background" aria-label="Выбрать другого клиента"><X className="h-4 w-4" /></button>
                  </div>
                  <p className="mt-3 text-xs text-income flex items-center gap-1.5"><Check className="h-3.5 w-3.5" />Заказ будет добавлен в историю этого клиента</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Найти существующего клиента</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9" placeholder="Телефон или имя" value={clientSearch} onChange={event => setClientSearch(event.target.value)} autoFocus />
                    </div>
                    {matchingClients.length > 0 && (
                      <div className="mt-2 rounded-md border border-border overflow-hidden">
                        {matchingClients.map(client => (
                          <button type="button" key={client.id} onClick={() => selectClient(client)} className="w-full flex items-center gap-3 p-3 text-left border-b border-border last:border-b-0 hover:bg-primary/5 transition-colors">
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">{client.name[0]}</div>
                            <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{client.name}</p><p className="text-xs text-muted-foreground">{client.phone}</p></div>
                            <span className="text-[11px] text-muted-foreground shrink-0">{cars.filter(car => car.clientId === client.id).length} авто</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    )}
                    {clientSearch.trim().length >= 2 && matchingClients.length === 0 && !creatingNewClient && <p className="text-xs text-muted-foreground mt-2">Совпадений не найдено</p>}
                  </div>

                  {!creatingNewClient ? (
                    <Button type="button" variant="outline" className="w-full" onClick={() => {
                      const value = clientSearch.trim();
                      const looksLikePhone = normalizePhone(value).length >= 5;
                      clientDraftId.current = crypto.randomUUID();
                      carDraftId.current = crypto.randomUUID();
                      setCreatingNewClient(true);
                      setForm(prev => ({ ...prev, clientName: looksLikePhone ? "" : value, clientPhone: looksLikePhone ? value : "" }));
                    }}><Plus className="h-4 w-4 mr-2" />Создать нового клиента</Button>
                  ) : (
                    <div className="rounded-lg border border-border p-4 space-y-3">
                      <div className="flex items-center justify-between"><p className="font-medium text-sm">Новый клиент</p><button type="button" className="text-xs text-primary hover:underline" onClick={() => setCreatingNewClient(false)}>Отмена</button></div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div><label className="text-sm text-muted-foreground mb-1 block">Телефон *</label><Input placeholder="+7 913 111 22 33" value={form.clientPhone} onChange={(e) => updateForm("clientPhone", e.target.value)} /></div>
                        <div><label className="text-sm text-muted-foreground mb-1 block">Имя *</label><Input placeholder="Имя клиента" value={form.clientName} onChange={(e) => updateForm("clientName", e.target.value)} /></div>
                      </div>
                      <div><label className="text-sm text-muted-foreground mb-1 block">Мессенджер</label><Input placeholder="WhatsApp, Telegram..." value={form.clientMessenger} onChange={(e) => updateForm("clientMessenger", e.target.value)} /></div>
                      <div><label className="text-sm text-muted-foreground mb-1 block">Источник</label><div className="flex flex-wrap gap-2">{clientSources.map((src) => <button type="button" key={src} onClick={() => updateForm("clientSource", src)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-all", form.clientSource === src ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/30")}>{src}</button>)}</div></div>
                      <div><label className="text-sm text-muted-foreground mb-1 block">Комментарий</label><Input placeholder="Предпочтения клиента..." value={form.clientComment} onChange={(e) => updateForm("clientComment", e.target.value)} /></div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="font-semibold text-lg">Автомобиль</h2>
              <div className="space-y-3">
                {existingClient && cars.some(car => car.clientId === existingClient.id) && (
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Автомобили клиента</label>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {cars.filter(car => car.clientId === existingClient.id).map(car => (
                        <button
                          type="button"
                          key={car.id}
                          onClick={() => selectCar(car)}
                          className={cn("p-3 rounded-md border text-left transition-colors", form.existingCarId === car.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40")}
                        >
                          <p className="text-sm font-medium">{car.brand} {car.model}</p>
                          <p className="text-xs text-muted-foreground">{[car.generation, car.year, car.plateNumber].filter(Boolean).join(" · ")}</p>
                        </button>
                      ))}
                    </div>
                    <Button type="button" variant="outline" onClick={startNewCar} className="w-full mt-3"><Plus className="h-4 w-4 mr-2" />Добавить другой автомобиль</Button>
                  </div>
                )}
                {!form.existingCarId && <>
                <p className="text-sm font-medium">{existingClient && cars.some(car => car.clientId === existingClient.id) ? "Новый автомобиль" : "Данные автомобиля"}</p>
                <CarCatalogPicker
                  brand={form.carBrand}
                  model={form.carModel}
                  year={form.carYear}
                  onCarChange={applyCatalogCar}
                  onMediaFound={applyCatalogMedia}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Поколение</label>
                    <Input placeholder="" value={form.carGeneration} onChange={(e) => updateForm("carGeneration", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Год выпуска</label>
                    <Input placeholder="" type="number" value={form.carYear} onChange={(e) => updateForm("carYear", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Кузов</label>
                    <Input placeholder="" value={form.carBody} onChange={(e) => updateForm("carBody", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Гос. номер</label>
                    <Input placeholder="" value={form.carPlateNumber} onChange={(e) => updateForm("carPlateNumber", e.target.value)} />
                  </div>
                </div>
                </>}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-semibold text-lg">Комплект</h2>
              <div className="grid grid-cols-2 gap-3">
                {kitOptions.map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => toggleKit(key)}
                    className={cn(
                      "p-4 rounded-md border text-left transition-all text-sm font-medium",
                      form.kitTypes.includes(key)
                        ? "bg-primary/10 border-primary text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    {form.kitTypes.includes(key) && <Check className="h-4 w-4 mb-1 text-primary" />}
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="font-semibold text-lg">Фотографии заказа</h2>
              <p className="text-sm text-muted-foreground">
                Эти фотографии будут доступны Оксане и сохранятся в карточке заказа.
              </p>
              <div className="space-y-6">
                <OrderPhotoPicker
                  label="Вид машины"
                  hint="Одна фотография — она же будет обложкой заказа в списке"
                  kind="carview"
                  urls={form.carViewPhotos}
                  onChange={(urls) => updateForm("carViewPhotos", urls)}
                  max={1}
                />
                <OrderPhotoPicker
                  label="Пол салона"
                  hint="До четырёх фотографий"
                  kind="salon"
                  urls={form.salonPhotos}
                  onChange={(urls) => updateForm("salonPhotos", urls)}
                  max={4}
                />
                <OrderPhotoPicker
                  label="Раскладка лекал"
                  hint="Одна картинка"
                  kind="layout"
                  urls={form.layoutPhotos}
                  onChange={(urls) => updateForm("layoutPhotos", urls)}
                  max={1}
                />
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="font-semibold text-lg">Комментарий</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Комментарий для Оксаны</label>
                  <Input
                    placeholder="Особые пожелания по заказу..."
                    value={form.seamstressComment}
                    onChange={(e) => updateForm("seamstressComment", e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <h2 className="font-semibold text-lg">Сроки и производство</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Желаемая дата готовности</label>
                  <Input type="date" value={form.desiredDate} onChange={(e) => updateForm("desiredDate", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Исполнитель</label>
                  <div className="flex gap-2">
                    {users.filter((u) => u.role === "seamstress").map((u) => (
                      <button
                        key={u.id}
                        onClick={() => updateForm("assigneeId", u.id)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-3 rounded-md border text-sm transition-all",
                          form.assigneeId === u.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                          {u.name[0]}
                        </div>
                        {u.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Приоритет</label>
                  <div className="flex gap-2">
                    {[
                      { key: "low", label: "Низкий" },
                      { key: "normal", label: "Обычный" },
                      { key: "high", label: "Высокий" },
                      { key: "urgent", label: "Срочный" },
                    ].map((p) => (
                      <button
                        key={p.key}
                        onClick={() => updateForm("priority", p.key)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                          form.priority === p.key
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 6 && (
            <>
              <h2 className="font-semibold text-lg">Финансы заказа</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Стоимость заказа</label>
                  <Input type="number" inputMode="numeric" placeholder="" value={form.totalPrice} onChange={(e) => updateForm("totalPrice", e.target.value)} />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <label className="text-sm font-medium">Предоплата</label>
                    {totalPrice > 0 && (
                      <button type="button" className="text-xs font-medium text-primary" onClick={() => updateForm("prepayment", String(totalPrice))}>
                        Вся сумма
                      </button>
                    )}
                  </div>
                  <Input type="number" placeholder="0" value={form.prepayment} onChange={(e) => updateForm("prepayment", e.target.value)} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Сколько клиент отдал прямо сейчас — эта сумма сразу попадёт на счёт.
                    Остаток примете позже кнопкой «Получить оплату» в карточке заказа.
                    Не платил — оставьте пустым.
                  </p>
                </div>
                {prepayment > 0 && (
                  <div className="rounded-md border border-primary/25 bg-primary/5 p-3">
                    <label className="mb-2 block text-sm font-medium">Куда поступили деньги</label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {accounts.filter(item => item.active).map(account => (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() => updateForm("prepaymentAccount", account.id)}
                          className={cn(
                            "rounded-md border p-3 text-left transition-colors",
                            form.prepaymentAccount === account.id
                              ? "border-primary bg-primary/10"
                              : "border-border bg-card hover:border-primary/40",
                          )}
                        >
                          <span className="block text-sm font-medium">{account.name}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">Баланс {formatCurrency(account.balance)}</span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">После создания заказа оплата сразу появится в балансе и истории финансов.</p>
                  </div>
                )}
                <div className="p-3 rounded-md bg-background">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Осталось получить</span>
                    <span className={remaining > 0 ? "text-expense font-semibold" : "text-income font-semibold"}>
                      {formatCurrency(remaining)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border pt-3">
                  <label className="text-sm text-warning font-medium mb-1 block">
                    Оплата Оксане {form.assigneeId ? "(обязательно)" : ""}
                  </label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder=""
                    value={form.seamstressPayment}
                    onChange={(e) => updateForm("seamstressPayment", e.target.value)}
                    className={form.assigneeId && !form.seamstressPayment ? "border-expense" : ""}
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Оплата китайцам</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder=""
                    value={form.chineseCost}
                    onChange={(e) => updateForm("chineseCost", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Расходы на материалы</label>
                    <Input type="number" inputMode="numeric" placeholder="" value={form.materialCost} onChange={(e) => updateForm("materialCost", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Другие расходы</label>
                    <Input type="number" inputMode="numeric" placeholder="" value={form.otherCosts} onChange={(e) => updateForm("otherCosts", e.target.value)} />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Пустое поле считается нулём. Заполняйте только то, что действительно
                  платите — эти суммы сразу спишутся из кассы.
                </p>

                <div className="p-4 rounded-md bg-primary/5 border border-primary/20 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Общие расходы</span>
                    <span className="font-semibold">{formatCurrency(totalCosts)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Плановая прибыль после полной оплаты</span>
                    <span className={`font-bold ${plannedProfit >= 0 ? "text-income" : "text-expense"}`}>
                      {formatCurrency(plannedProfit)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      {draftRestored && <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm"><p className="font-medium text-primary">Черновик заказа восстановлен</p><p className="text-xs text-muted-foreground mt-0.5">Можно продолжить с того места, где сохранение прервалось.</p></div>}
      {saveError && <div className="rounded-md border border-expense/30 bg-expense/10 p-3 text-sm text-expense">{saveError}</div>}
      <div className="flex gap-3">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
            Назад
          </Button>
        )}
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} className="flex-1">
            Далее
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            <Check className="h-4 w-4 mr-1" />
            {saving ? "Сохранение…" : "Создать заказ"}
          </Button>
        )}
      </div>

      {saving && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/85 backdrop-blur-sm p-6">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center shadow-2xl">
            {savedNumber ? (
              <>
                <div className="h-12 w-12 mx-auto rounded-full bg-income/15 flex items-center justify-center">
                  <Check className="h-7 w-7 text-income" />
                </div>
                <p className="font-semibold mt-4 text-income">Заказ сохранён</p>
                <p className="text-sm text-muted-foreground mt-1">№{savedNumber}</p>
                {prepayment > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Предоплата {formatCurrency(prepayment)} проведена в кассу
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-3">Открываем список заказов…</p>
              </>
            ) : (
              <>
                <div className="h-9 w-9 mx-auto rounded-full border-4 border-primary/25 border-t-primary animate-spin" />
                <p className="font-semibold mt-4">{savingStage}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Не закрывайте страницу. Если что-то пойдёт не так, черновик сохранится.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
