"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  CarFront,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Database,
  ExternalLink,
  Globe2,
  ImageOff,
  Search,
  ScanLine,
  X,
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
  detailsRu: Array<{ label: string; value: string }>;
  powertrain: string;
  imagePath: string;
  technologyImagePaths: string[];
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

interface CatalogOption {
  value: string;
  label: string;
  labelZh: string;
}

interface SearchFilters {
  query: string;
  year: string;
  category: number;
  make: string;
  model: string;
}

const initialFilters: SearchFilters = {
  query: "",
  year: "",
  category: 0,
  make: "",
  model: "",
};

const categories = [
  { id: 0, label: "Все коврики" },
  { id: 20, label: "Полный охват" },
  { id: 28, label: "360°" },
  { id: 32, label: "Полное покрытие" },
];

interface ImageViewerState {
  title: string;
  paths: string[];
  index: number;
}

function CatalogThumbnail({ path, alt, onOpen }: { path: string; alt: string; onOpen: () => void }) {
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
    <button type="button" onClick={onOpen} className="group relative h-full w-full cursor-zoom-in" title="Открыть фотографию">
      <img
        src={`/api/csj-image?path=${encodeURIComponent(path)}`}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-contain bg-white transition-transform group-hover:scale-[1.03]"
      />
      <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/65 px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
        Увеличить
      </span>
    </button>
  );
}

export default function ChinaCatalogPage() {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(initialFilters);
  const [makeOptions, setMakeOptions] = useState<CatalogOption[]>([]);
  const [modelOptions, setModelOptions] = useState<CatalogOption[]>([]);
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedName, setCopiedName] = useState("");
  const [viewer, setViewer] = useState<ImageViewerState | null>(null);

  useEffect(() => {
    if (!viewer) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewer(null);
      if (event.key === "ArrowLeft") {
        setViewer((current) => current && ({ ...current, index: (current.index - 1 + current.paths.length) % current.paths.length }));
      }
      if (event.key === "ArrowRight") {
        setViewer((current) => current && ({ ...current, index: (current.index + 1) % current.paths.length }));
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [viewer]);

  useEffect(() => {
    fetch("/api/csj-catalog?options=1")
      .then((response) => response.json())
      .then((options: { makes: CatalogOption[] }) => setMakeOptions(options.makes || []))
      .catch(() => setMakeOptions([]));
  }, []);

  useEffect(() => {
    if (!filters.make) {
      setModelOptions([]);
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams({ options: "1", make: filters.make });
    fetch(`/api/csj-catalog?${params}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((options: { models: CatalogOption[] }) => setModelOptions(options.models || []))
      .catch((reason) => {
        if (reason?.name !== "AbortError") setModelOptions([]);
      });
    return () => controller.abort();
  }, [filters.make]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: "36" });
    if (appliedFilters.query.trim()) params.set("q", appliedFilters.query.trim());
    if (/^\d{4}$/u.test(appliedFilters.year)) params.set("year", appliedFilters.year);
    if (appliedFilters.category) params.set("category", String(appliedFilters.category));
    if (appliedFilters.make) params.set("make", appliedFilters.make);
    if (appliedFilters.model) params.set("model", appliedFilters.model);

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
  }, [appliedFilters]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setAppliedFilters({ ...filters });
  };

  const copySourceName = async (makeZh: string, modelZh: string) => {
    const value = `${makeZh} ${modelZh}`.trim();
    try {
      await navigator.clipboard.writeText(value);
      setCopiedName(value);
      window.setTimeout(() => setCopiedName((current) => current === value ? "" : current), 1800);
    } catch {
      setError("Не удалось скопировать название. Разрешите доступ к буферу обмена и попробуйте ещё раз");
    }
  };

  const openViewer = (title: string, paths: string[]) => {
    if (paths.length) setViewer({ title, paths, index: 0 });
  };

  const resetSearch = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setModelOptions([]);
  };

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

        <form onSubmit={submitSearch} className="relative space-y-3 mt-5">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={filters.query}
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              placeholder="Например: Lexus GX 2012 или Changan UNI-Z"
              className="pl-10 h-12 bg-background"
            />
          </div>
          <Input
            value={filters.year}
            onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value.replace(/\D/g, "").slice(0, 4) }))}
            inputMode="numeric"
            placeholder="Год выпуска"
            className="h-12 bg-background"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={filters.make}
            onChange={(event) => setFilters((current) => ({ ...current, make: event.target.value, model: "" }))}
            className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Все марки</option>
            {makeOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <select
            value={filters.model}
            onChange={(event) => setFilters((current) => ({ ...current, model: event.target.value }))}
            disabled={!filters.make}
            className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{filters.make ? "Все модели" : "Сначала выберите марку"}</option>
            {modelOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilters((current) => ({ ...current, category: item.id }))}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors ${
                filters.category === item.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button type="button" variant="outline" onClick={resetSearch}>Сбросить</Button>
          <Button type="submit" disabled={loading}>
            <Search className="h-4 w-4 mr-2" />{loading ? "Ищем…" : "Найти лекала"}
          </Button>
        </div>
        </form>
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
                  <p className="text-base font-semibold truncate">{item.make} {item.model}</p>
                  <button
                    type="button"
                    onClick={() => copySourceName(item.makeZh, item.modelZh)}
                    className="mt-0.5 flex max-w-full items-center gap-1 text-left text-xs text-muted-foreground hover:text-primary"
                    title="Скопировать китайское название"
                  >
                    {copiedName === `${item.makeZh} ${item.modelZh}`.trim() ? <Check className="h-3 w-3 shrink-0" /> : <Copy className="h-3 w-3 shrink-0" />}
                    <span className="truncate">{copiedName === `${item.makeZh} ${item.modelZh}`.trim() ? "Скопировано" : `На сайте: ${item.makeZh} · ${item.modelZh}`}</span>
                  </button>
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
              <div className="grid grid-cols-[132px_1fr] sm:grid-cols-[148px_1fr] min-h-[168px]">
                <div className="border-r border-border p-2 bg-white">
                  <CatalogThumbnail
                    path={item.imagePath}
                    alt={`${item.make} ${item.model}`}
                    onOpen={() => openViewer(`${item.make} ${item.model}`, [item.imagePath].filter(Boolean))}
                  />
                </div>
                <div className="p-4 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="font-bold text-lg leading-tight">{item.make} {item.model}</h2>
                      <button
                        type="button"
                        onClick={() => copySourceName(item.makeZh, item.modelZh)}
                        className="mt-1 flex max-w-full items-center gap-1 text-left text-xs text-muted-foreground hover:text-primary"
                        title="Скопировать китайское название для поиска на сайте"
                      >
                        {copiedName === `${item.makeZh} ${item.modelZh}`.trim() ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
                        <span className="truncate">{copiedName === `${item.makeZh} ${item.modelZh}`.trim() ? "Скопировано" : `На сайте: ${item.makeZh} · ${item.modelZh}`}</span>
                      </button>
                    </div>
                    <span className="shrink-0 h-2.5 w-2.5 rounded-full bg-primary mt-1" title="Лекало найдено" />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-semibold">{item.category}</span>
                    {item.powertrain && <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground">{item.powertrain}</span>}
                  </div>
                  <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Годы выпуска</p>
                  <p className="mt-0.5 text-lg sm:text-xl font-extrabold leading-tight text-foreground">{item.yearLabel || "Не указаны"}</p>
                  <p className="text-sm mt-3"><span className="text-muted-foreground">Код лекала:</span> <span className="font-mono font-bold text-foreground">{item.code}</span></p>
                </div>
              </div>

              <div className="border-t border-border p-4 space-y-3">
                {item.detailsRu.length > 0 && (
                  <dl className="grid grid-cols-1 gap-2 rounded-lg bg-secondary/45 p-3 text-sm">
                    {item.detailsRu.map((detail) => (
                      <div key={`${detail.label}-${detail.value}`} className="grid grid-cols-[120px_1fr] gap-2">
                        <dt className="font-medium text-muted-foreground">{detail.label}</dt>
                        <dd className="font-semibold text-foreground">{detail.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {item.descriptionsRu.length > 0 && (
                  <ul className="space-y-1.5 text-sm text-foreground/85">
                    {item.descriptionsRu.slice(0, 6).map((description, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="text-primary">•</span><span>{description}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!item.technologyImagePaths.length}
                  onClick={() => openViewer(`Технологический чертёж · ${item.code}`, item.technologyImagePaths)}
                  className="w-full"
                >
                  <ScanLine className="h-4 w-4 mr-2" />
                  {item.technologyImagePaths.length ? "Открыть технологический чертёж" : "Чертёж отсутствует"}
                </Button>
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

      {viewer && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/90 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={viewer.title}
          onClick={() => setViewer(null)}
        >
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 text-white">
            <div className="min-w-0">
              <p className="truncate text-base font-bold sm:text-xl">{viewer.title}</p>
              {viewer.paths.length > 1 && <p className="text-sm text-white/70">Изображение {viewer.index + 1} из {viewer.paths.length}</p>}
            </div>
            <button type="button" onClick={() => setViewer(null)} className="rounded-full bg-white/10 p-3 hover:bg-white/20" aria-label="Закрыть">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="relative mx-auto mt-3 flex min-h-0 w-full max-w-6xl flex-1 items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <img
              src={`/api/csj-image?path=${encodeURIComponent(viewer.paths[viewer.index])}`}
              alt={viewer.title}
              className="max-h-full max-w-full rounded-lg bg-white object-contain shadow-2xl"
            />
            {viewer.paths.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setViewer((current) => current && ({ ...current, index: (current.index - 1 + current.paths.length) % current.paths.length }))}
                  className="absolute left-1 rounded-full bg-black/60 p-3 text-white hover:bg-black/80 sm:left-4"
                  aria-label="Предыдущее изображение"
                >
                  <ChevronLeft className="h-7 w-7" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewer((current) => current && ({ ...current, index: (current.index + 1) % current.paths.length }))}
                  className="absolute right-1 rounded-full bg-black/60 p-3 text-white hover:bg-black/80 sm:right-4"
                  aria-label="Следующее изображение"
                >
                  <ChevronRight className="h-7 w-7" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
