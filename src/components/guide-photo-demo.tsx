"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Car, Camera, Ruler, Check } from "lucide-react";

type Kind = "carview" | "salon" | "layout";

const виды: { key: Kind; title: string; count: string; icon: typeof Car; hint: string }[] = [
  { key: "carview", title: "Вид машины", count: "1 фото", icon: Car,
    hint: "Становится обложкой заказа в списке — узнаёте заказ с одного взгляда" },
  { key: "salon", title: "Пол салона", count: "до 4 фото", icon: Camera,
    hint: "Для швеи: что именно шить и в каком состоянии салон" },
  { key: "layout", title: "Раскладка лекал", count: "1 картинка", icon: Ruler,
    hint: "Открывается кнопкой «Посмотреть лекала» на весь экран" },
];

/** Наглядно: какие фотографии куда и зачем. */
export function GuidePhotoDemo() {
  const [active, setActive] = useState<Kind>("carview");
  const текущий = виды.find(v => v.key === active)!;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="border-b border-border bg-background/50 p-3">
        <p className="text-sm font-semibold">Нажмите, чтобы понять зачем</p>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        {виды.map(({ key, title, count, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={cn("p-3 text-center transition-colors",
              active === key ? "bg-primary/10" : "hover:bg-background/60")}
          >
            <Icon className={cn("mx-auto h-5 w-5",
              active === key ? "text-primary" : "text-muted-foreground")} />
            <p className={cn("mt-1.5 text-[11px] font-medium leading-tight",
              active === key && "text-primary")}>{title}</p>
            <p className="text-[10px] text-muted-foreground">{count}</p>
          </button>
        ))}
      </div>

      <div className="p-3">
        <p className="text-sm text-muted-foreground leading-relaxed">{текущий.hint}</p>

        {/* Как это выглядит в списке заказов */}
        {active === "carview" && (
          <div className="mt-3 rounded-md border border-border bg-background p-2.5">
            <p className="mb-2 text-[11px] text-muted-foreground">Так заказ выглядит в списке:</p>
            <div className="flex items-center gap-2.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">№ 0808-114</p>
                <p className="text-sm font-bold leading-tight">Lexus GX 460</p>
                <p className="text-[11px] text-muted-foreground">Алексей</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 flex items-start gap-2 rounded-md border border-income/25 bg-income/5 p-2.5">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-income" />
          <p className="text-xs text-muted-foreground">
            Фото сжимается прямо в телефоне: снимок на 8 МБ превращается в 300 КБ.
            Поэтому загрузка быстрая даже с мобильного интернета.
          </p>
        </div>
      </div>
    </div>
  );
}
