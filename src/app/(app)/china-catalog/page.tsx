"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CarFront,
  Database,
  ExternalLink,
  Globe2,
  ImageOff,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CatalogResult {
  id: number;
  code: string;
  make: string;
  makeZh: string;
  model: string;
  modelZh: string;
  manufacturerZh: string;
  yearLabel: string;
  years: number[];
  descriptions: string[];
  descriptionsRu: string[];
  imagePath: string;
  sourceUrl: string;
  downloads: number;
  categoryId: number;
  category: string;
  categoryZh: string;
}

interface CatalogResponse {
  generatedAt: string;
  totals: {
    makes: number;
    models: number;
    patterns: number;
    patternsByCategory: Record<string, number>;
  };
  total: number;
  results: CatalogResult[];
  modelsWithoutPatterns: Array<{
    id: number;
    make: string;
    makeZh: string;
    model: string;
    modelZh: string;
  }>;
}

const categories = [
  { id: 0, label: "Все коврики" },
  { id: 20, label: "Полный охват" },
  { id: 28, label: "360°" },
  { id: 32, label: "Полное покрытие" },
];

function CatalogThumbnail({ path, alt }: { path: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!path || failed) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-muted-foreground bg-secondary/40">
        <ImageOff className="h-7 w-7" />
        <span className="text-[10px]">Нет фотографии</span>
      </div>
    );
  }

  return (
    <img
      src={`/api/csj-image?path=${encodeURIComponent(path)}`}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-contain bg-white"
    />
  );
}

export default function ChinaCatalogPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [year, setYear] = useState("");
  const [category, setCategory] = useState(0);
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query), 280);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: "36" });
    if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
    if (/^\d{4}$/u.test(year)) params.set("year", year);
    if (category) params.set("category", String(category));

    setLoading(true);
    setError("");
    fetch(`/api/csj-catalog?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Каталог временно недоступен");
        return response.json() as Promise<CatalogResponse>;
      })
      .then(setData)
      .catch((reason) => {
        if (reason?.name !== "AbortError") {
          setError(reason instanceof Error ? reason.message : "Не удалось загрузить каталог");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery, year, category]);

  const updatedAt = useMemo(() => {
    if (!data?.generatedAt) return "";
    return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(
      new Date(data.generatedAt),
    );
  }, [data?.generatedAt]);

  return (
    <div className="p-4 lg:p-6 max-w-[1500px] mx-auto space-y-5">
      <section className="rounded-xl border border-border bg-card p-4 lg:p-6 overflow-hidden relative">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-2">
              <Globe2 className="h-4 w-4" />
              База csj918.com
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold">Китайский каталог автомобилей</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              Поиск лекал для ковриков с полным покрытием, полным охватом и 360°. Марки показаны на английском, остальные данные переведены на русский.
            </p>
          </div>
          <a href="http://www.csj918.com" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full lg:w-auto">
              <ExternalLink className="h-4 w-4 mr-2" />Открыть исходный сайт
            </Button>
          </a>
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-3 mt-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Например: Lexus GX 2012 или Changan UNI-Z"
              className="pl-10 h-12 bg-background"
            />
          </div>
          <Input
            value={year}
            onChange={(event) => setYear(event.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            placeholder="Год выпуска"
            className="h-12 bg-background"
          />
        </div>

        <div className="relative flex gap-2 mt-3 overflow-x-auto pb-1">
          {categories.map((item) => (
            <button
              key={item.id}
              onClick={() => setCategory(item.id)}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors ${
                category === item.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {data && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ["Марок", data.totals.makes],
            ["Моделей", data.totals.models],
            ["Лекал", data.totals.patterns],
            ["Найдено", data.total],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold mt-0.5">{Number(value).toLocaleString("ru-RU")}</p>
            </div>
          ))}
        </section>
      )}

      {!!data?.modelsWithoutPatterns?.length && (
        <section className="rounded-xl border border-border bg-card p-4 lg:p-5">
          <h2 className="font-semibold">Автомобили без лекал выбранных типов</h2>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            Эти модели присутствуют на китайском сайте, но для полного покрытия и 360° подходящих лекал не найдено.
          </p>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {data.modelsWithoutPatterns.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
                <div className="h-9 w-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
                  <CarFront className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.make} {item.model}</p>
                  <p className="text-[10px] text-muted-foreground truncate">На сайте: {item.makeZh} · {item.modelZh}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {error && (
        <div className="rounded-lg border border-expense/30 bg-expense/10 p-4 text-sm text-expense">
          {error}. Проверьте интернет и попробуйте ещё раз.
        </div>
      )}

      {loading && !data ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-56 rounded-xl border border-border bg-card skeleton" />
          ))}
        </div>
      ) : data?.results.length ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.results.map((item) => (
            <article key={`${item.categoryId}-${item.id}`} className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors">
              <div className="grid grid-cols-[128px_1fr] min-h-[150px]">
                <div className="border-r border-border p-2 bg-white">
                  <CatalogThumbnail path={item.imagePath} alt={`${item.make} ${item.model}`} />
                </div>
                <div className="p-4 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="font-bold text-base leading-tight truncate">{item.make} {item.model}</h2>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        На сайте: {item.makeZh} · {item.modelZh}
                      </p>
                    </div>
                    <span className="shrink-0 h-2.5 w-2.5 rounded-full bg-primary mt-1" title="Лекало найдено" />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="rounded-full bg-primary/10 text-primary px-2 py-1 text-[10px] font-semibold">{item.category}</span>
                    <span className="rounded-full bg-secondary px-2 py-1 text-[10px]">{item.yearLabel || "Год не указан"}</span>
                  </div>
                  <p className="text-xs mt-3"><span className="text-muted-foreground">Код лекала:</span> <span className="font-mono font-semibold">{item.code}</span></p>
                </div>
              </div>

              <div className="border-t border-border p-4 space-y-3">
                {item.descriptionsRu.length > 0 && (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {item.descriptionsRu.slice(0, 3).map((description, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="text-primary">•</span><span>{description}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />Открыть лекало на сайте
                  </Button>
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <CarFront className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-semibold">Подходящих лекал не найдено</h2>
          <p className="text-sm text-muted-foreground mt-1">Попробуйте указать только марку и модель или убрать фильтр года.</p>
        </div>
      )}

      {data && (
        <footer className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-secondary/50 px-4 py-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-2"><Database className="h-4 w-4" />Последняя синхронизация: {updatedAt}</span>
          <span>Перевод автоматический, оригинальные китайские названия сохранены</span>
        </footer>
      )}
    </div>
  );
}
