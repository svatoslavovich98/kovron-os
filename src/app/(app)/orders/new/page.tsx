"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency, cn } from "@/lib/utils";
import { demoUsers, materialColors, edgeColors, stitchColors, kitLabels, clientSources, demoClients } from "@/lib/demo-data";
import {
  ArrowLeft, User, Car, Package, Palette, Camera,
  Calendar, Wallet, ChevronRight, Check, Search,
} from "lucide-react";
import Link from "next/link";

const steps = [
  { key: "client", label: "Клиент", icon: User },
  { key: "car", label: "Автомобиль", icon: Car },
  { key: "kit", label: "Комплект", icon: Package },
  { key: "production", label: "Параметры", icon: Palette },
  { key: "images", label: "Изображения", icon: Camera },
  { key: "dates", label: "Сроки", icon: Calendar },
  { key: "finance", label: "Финансы", icon: Wallet },
];

const kitOptions = Object.entries(kitLabels);

export default function NewOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [existingClient, setExistingClient] = useState<typeof demoClients[0] | null>(null);

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
    kitTypes: [] as string[],
    materialColor: "",
    bottomColor: "",
    edgeColor: "",
    stitchColor: "",
    stitchType: "",
    logo: "",
    heelPad: "",
    extras: "",
    seamstressComment: "",
    desiredDate: "",
    assigneeId: "",
    priority: "normal",
    totalPrice: "",
    prepayment: "",
    prepaymentAccount: "",
    seamstressPayment: "",
    materialCost: "",
    otherCosts: "",
  });

  const updateForm = (field: string, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleKit = (kit: string) => {
    setForm((prev) => ({
      ...prev,
      kitTypes: prev.kitTypes.includes(kit)
        ? prev.kitTypes.filter((k) => k !== kit)
        : [...prev.kitTypes, kit],
    }));
  };

  const checkExistingClient = (phoneVal: string) => {
    setPhone(phoneVal);
    updateForm("clientPhone", phoneVal);
    const found = demoClients.find((c) => c.phone === phoneVal);
    if (found) {
      setExistingClient(found);
      updateForm("clientName", found.name);
    } else {
      setExistingClient(null);
    }
  };

  const totalPrice = parseFloat(form.totalPrice) || 0;
  const prepayment = parseFloat(form.prepayment) || 0;
  const seamstressPayment = parseFloat(form.seamstressPayment) || 0;
  const materialCost = parseFloat(form.materialCost) || 0;
  const otherCosts = parseFloat(form.otherCosts) || 0;
  const remaining = totalPrice - prepayment;
  const totalCosts = seamstressPayment + materialCost + otherCosts;
  const plannedProfit = totalPrice - totalCosts;

  const handleSave = () => {
    // In production, save to Supabase
    alert("Заказ создан! (демо-режим)");
    router.push("/orders");
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
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Телефон</label>
                  <Input
                    placeholder="+7 913 111 22 33"
                    value={form.clientPhone}
                    onChange={(e) => checkExistingClient(e.target.value)}
                  />
                  {existingClient && (
                    <p className="text-xs text-income mt-1">
                      Найден клиент: {existingClient.name}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Имя</label>
                  <Input
                    placeholder="Имя клиента"
                    value={form.clientName}
                    onChange={(e) => updateForm("clientName", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Мессенджер</label>
                  <Input
                    placeholder="WhatsApp, Telegram..."
                    value={form.clientMessenger}
                    onChange={(e) => updateForm("clientMessenger", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Источник</label>
                  <div className="flex flex-wrap gap-2">
                    {clientSources.map((src) => (
                      <button
                        key={src}
                        onClick={() => updateForm("clientSource", src)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                          form.clientSource === src
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        {src}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Комментарий</label>
                  <Input
                    placeholder="Комментарий..."
                    value={form.clientComment}
                    onChange={(e) => updateForm("clientComment", e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="font-semibold text-lg">Автомобиль</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Марка</label>
                    <Input placeholder="Toyota" value={form.carBrand} onChange={(e) => updateForm("carBrand", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Модель</label>
                    <Input placeholder="Camry" value={form.carModel} onChange={(e) => updateForm("carModel", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Поколение</label>
                    <Input placeholder="XV70" value={form.carGeneration} onChange={(e) => updateForm("carGeneration", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Год выпуска</label>
                    <Input placeholder="2021" type="number" value={form.carYear} onChange={(e) => updateForm("carYear", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Кузов</label>
                    <Input placeholder="Седан" value={form.carBody} onChange={(e) => updateForm("carBody", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Гос. номер</label>
                    <Input placeholder="А777АА22" value={form.carPlateNumber} onChange={(e) => updateForm("carPlateNumber", e.target.value)} />
                  </div>
                </div>
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
              <h2 className="font-semibold text-lg">Производственные параметры</h2>
              <div className="space-y-4">
                {[
                  { label: "Цвет основного материала", field: "materialColor", colors: materialColors },
                  { label: "Цвет окантовки", field: "edgeColor", colors: edgeColors },
                  { label: "Цвет строчки", field: "stitchColor", colors: stitchColors },
                ].map((section) => (
                  <div key={section.field}>
                    <label className="text-sm text-muted-foreground mb-2 block">{section.label}</label>
                    <div className="flex flex-wrap gap-2">
                      {section.colors.map((c) => (
                        <button
                          key={c.name}
                          onClick={() => updateForm(section.field, c.name)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-sm border text-sm transition-all",
                            form[section.field as keyof typeof form] === c.name
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/30"
                          )}
                        >
                          <div className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: c.hex }} />
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Комментарий для Оксаны</label>
                  <Input
                    placeholder="Особые пожелания..."
                    value={form.seamstressComment}
                    onChange={(e) => updateForm("seamstressComment", e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="font-semibold text-lg">Изображения</h2>
              <p className="text-sm text-muted-foreground">
                В демо-режиме загрузка изображений недоступна. Подключите Supabase Storage для работы с файлами.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {["Раскладка", "Фото салона", "Фото автомобиля", "Фото замера"].map((label) => (
                  <div
                    key={label}
                    className="aspect-square rounded-md border-2 border-dashed border-border flex items-center justify-center hover:border-primary/30 transition-colors cursor-pointer"
                  >
                    <div className="text-center">
                      <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                  </div>
                ))}
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
                    {demoUsers.filter((u) => u.role === "seamstress").map((u) => (
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
                  <Input type="number" placeholder="12000" value={form.totalPrice} onChange={(e) => updateForm("totalPrice", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Предоплата</label>
                  <Input type="number" placeholder="5000" value={form.prepayment} onChange={(e) => updateForm("prepayment", e.target.value)} />
                </div>
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
                    placeholder="1200"
                    value={form.seamstressPayment}
                    onChange={(e) => updateForm("seamstressPayment", e.target.value)}
                    className={form.assigneeId && !form.seamstressPayment ? "border-expense" : ""}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Расходы на материалы</label>
                    <Input type="number" placeholder="2500" value={form.materialCost} onChange={(e) => updateForm("materialCost", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Другие расходы</label>
                    <Input type="number" placeholder="0" value={form.otherCosts} onChange={(e) => updateForm("otherCosts", e.target.value)} />
                  </div>
                </div>

                <div className="p-4 rounded-md bg-primary/5 border border-primary/20 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Общие расходы</span>
                    <span className="font-semibold">{formatCurrency(totalCosts)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Плановая прибыль</span>
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
          <Button onClick={handleSave} className="flex-1">
            <Check className="h-4 w-4 mr-1" />
            Создать заказ
          </Button>
        )}
      </div>
    </div>
  );
}
