"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronRight, Image as ImageIcon, ListFilter, Loader2, ScanLine, Search } from "lucide-react";

interface CatalogOption {
  value: string;
  label: string;
  labelZh: string;
}

interface CatalogMatch {
  code: string;
  make: string;
  modelEn: string;
  makeZh: string;
  modelZh: string;
  yearLabel: string;
  years: number[];
  imagePath: string;
  technologyImagePaths: string[];
  sourceUrl: string;
  category: string;
  powertrain?: string;
}

export interface CatalogMediaMatch {
  carImageUrl?: string;
  technologyImageUrl?: string;
  code: string;
  yearLabel: string;
  sourceUrl: string;
}

interface CarCatalogPickerProps {
  brand: string;
  model: string;
  year?: string;
  onCarChange: (brand: string, model: string, suggestedYear?: number) => void;
  onMediaFound: (match: CatalogMediaMatch | null) => void;
}

function imageUrl(path: string, kind?: "carview") {
  if (!path) return "";
  const params = new URLSearchParams({ path });
  if (kind) params.set("kovron-kind", kind);
  return `/api/csj-image?${params.toString()}`;
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/gu, "");
}

export function CarCatalogPicker({ brand, model, year, onCarChange, onMediaFound }: CarCatalogPickerProps) {
  const [mode, setMode] = useState<"search" | "lists">("search");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CatalogMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [makes, setMakes] = useState<CatalogOption[]>([]);
  const [models, setModels] = useState<CatalogOption[]>([]);
  const [makeZh, setMakeZh] = useState("");
  const [modelZh, setModelZh] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [match, setMatch] = useState<CatalogMatch | null>(null);
  const onMediaFoundRef = useRef(onMediaFound);
  onMediaFoundRef.current = onMediaFound;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/csj-catalog?options=1", { signal: controller.signal })
      .then(response => response.json())
      .then((data: { makes?: CatalogOption[] }) => setMakes(data.makes || []))
      .finally(() => setLoadingOptions(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ q: trimmed, limit: "12" });
        const response = await fetch(`/api/csj-catalog?${params}`, { signal: controller.signal });
        const data = await response.json() as { results?: CatalogMatch[] };
        setSearchResults(data.results || []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    if (!makes.length || makeZh || !brand) return;
    const current = makes.find(item => normalize(item.label) === normalize(brand));
    if (current) setMakeZh(current.value);
  }, [makes, makeZh, brand]);

  useEffect(() => {
    if (!makeZh) {
      setModels([]);
      setModelZh("");
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams({ options: "1", make: makeZh });
    fetch(`/api/csj-catalog?${params}`, { signal: controller.signal })
      .then(response => response.json())
      .then((data: { models?: CatalogOption[] }) => setModels(data.models || []));
    return () => controller.abort();
  }, [makeZh]);

  useEffect(() => {
    if (!models.length || modelZh || !model) return;
    const current = models.find(item => normalize(item.label) === normalize(model));
    if (current) setModelZh(current.value);
  }, [models, modelZh, model]);

  useEffect(() => {
    if (!makeZh || !modelZh) {
      setMatch(null);
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      setLoadingMatch(true);
      const buildParams = (includeYear: boolean) => {
        const params = new URLSearchParams({ make: makeZh, model: modelZh, limit: "60" });
        if (includeYear && /^\d{4}$/u.test(year || "")) params.set("year", year!);
        return params;
      };
      try {
        let response = await fetch(`/api/csj-catalog?${buildParams(true)}`, { signal: controller.signal });
        let data = await response.json() as { results?: CatalogMatch[] };
        if (!data.results?.length && year) {
          response = await fetch(`/api/csj-catalog?${buildParams(false)}`, { signal: controller.signal });
          data = await response.json() as { results?: CatalogMatch[] };
        }
        const best = [...(data.results || [])].sort((a, b) =>
          Number(Boolean(b.technologyImagePaths?.length)) - Number(Boolean(a.technologyImagePaths?.length))
          || Number(Boolean(b.imagePath)) - Number(Boolean(a.imagePath)),
        )[0] || null;
        setMatch(best);
        onMediaFoundRef.current(best ? {
          carImageUrl: best.imagePath ? imageUrl(best.imagePath, "carview") : undefined,
          technologyImageUrl: best.technologyImagePaths?.[0] ? imageUrl(best.technologyImagePaths[0]) : undefined,
          code: best.code,
          yearLabel: best.yearLabel,
          sourceUrl: best.sourceUrl,
        } : null);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setMatch(null);
          onMediaFoundRef.current(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoadingMatch(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [makeZh, modelZh, year]);

  const selectMake = (value: string) => {
    setMakeZh(value);
    setModelZh("");
    setMatch(null);
    const selected = makes.find(item => item.value === value);
    onCarChange(selected?.label || "", "");
    onMediaFoundRef.current(null);
  };

  const selectModel = (value: string) => {
    setModelZh(value);
    const selectedMake = makes.find(item => item.value === makeZh);
    const selectedModel = models.find(item => item.value === value);
    onCarChange(selectedMake?.label || brand, selectedModel?.label || "");
  };

  const selectSearchResult = (result: CatalogMatch) => {
    const requestedYear = Number(query.match(/\b(?:19|20)\d{2}\b/u)?.[0] || 0);
    const suggestedYear = requestedYear && result.years.includes(requestedYear)
      ? requestedYear
      : result.years.length === 1 ? result.years[0] : undefined;
    setMakeZh(result.makeZh);
    setModelZh(result.modelZh);
    setMatch(result);
    setQuery(`${result.make} ${result.modelEn}${suggestedYear ? ` ${suggestedYear}` : ""}`);
    setSearchResults([]);
    onCarChange(result.make, result.modelEn, suggestedYear);
    onMediaFoundRef.current({
      carImageUrl: result.imagePath ? imageUrl(result.imagePath, "carview") : undefined,
      technologyImageUrl: result.technologyImagePaths?.[0] ? imageUrl(result.technologyImagePaths[0]) : undefined,
      code: result.code,
      yearLabel: result.yearLabel,
      sourceUrl: result.sourceUrl,
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-background p-1">
        <button type="button" onClick={() => setMode("search")} className={`flex h-10 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors ${mode === "search" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
          <Search className="h-4 w-4" />Быстрый поиск
        </button>
        <button type="button" onClick={() => setMode("lists")} className={`flex h-10 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors ${mode === "lists" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
          <ListFilter className="h-4 w-4" />Из списка
        </button>
      </div>

      {mode === "search" && (
        <div className="relative">
          <label className="block">
            <span className="mb-1 block text-sm text-muted-foreground">Начните вводить марку, модель или год</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Например: Lexus GX 2019"
                autoComplete="off"
                className="h-12 w-full rounded-md border border-border bg-background pl-10 pr-10 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
              {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />}
            </div>
          </label>
          {query.trim().length >= 2 && !searching && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[min(360px,45dvh)] overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-2xl">
              {searchResults.map(result => (
                <button
                  type="button"
                  key={`${result.code}-${result.yearLabel}`}
                  onClick={() => selectSearchResult(result)}
                  className="flex w-full items-center gap-3 rounded-md p-2.5 text-left transition-colors hover:bg-background active:bg-primary/10"
                >
                  <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-white">
                    {result.imagePath ? <img src={imageUrl(result.imagePath)} alt="" className="h-full w-full object-contain" /> : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{result.make} {result.modelEn}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{result.yearLabel || "Годы не указаны"}{result.powertrain ? ` · ${result.powertrain}` : ""}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
          {query.trim().length >= 2 && !searching && searchResults.length === 0 && (
            <p className="mt-2 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">Совпадений пока нет. Проверьте написание или выберите автомобиль через списки.</p>
          )}
          {query.trim().length < 2 && <p className="mt-2 text-[11px] text-muted-foreground">Поиск понимает английские названия и год выпуска. Введите хотя бы две буквы.</p>}
        </div>
      )}

      {mode === "lists" && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-muted-foreground">Марка</span>
          <select value={makeZh} onChange={event => selectMake(event.target.value)} disabled={loadingOptions} className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm font-medium outline-none focus:border-primary disabled:opacity-60">
            <option value="">{loadingOptions ? "Загрузка марок…" : "Выберите марку"}</option>
            {makes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted-foreground">Модель</span>
          <select value={modelZh} onChange={event => selectModel(event.target.value)} disabled={!makeZh || !models.length} className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm font-medium outline-none focus:border-primary disabled:opacity-60">
            <option value="">{makeZh ? "Выберите модель" : "Сначала выберите марку"}</option>
            {models.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </div>}

      {(brand || model) && !makeZh && (
        <p className="rounded-md bg-secondary/50 p-2.5 text-xs text-muted-foreground">Текущий автомобиль: <span className="font-semibold text-foreground">{brand} {model}</span>. Выберите его из каталога, только если хотите изменить данные.</p>
      )}

      {loadingMatch && <div className="flex items-center gap-2 rounded-md bg-secondary/50 p-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Ищем фотографию и чертёж…</div>}
      {!loadingMatch && modelZh && match && (
        <div className="grid grid-cols-[92px_1fr] gap-3 rounded-lg border border-primary/25 bg-primary/5 p-3">
          <div className="flex h-20 items-center justify-center overflow-hidden rounded-md border border-border bg-white">
            {match.imagePath ? <img src={imageUrl(match.imagePath)} alt={`${brand} ${model}`} className="h-full w-full object-contain" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-primary"><CheckCircle2 className="h-4 w-4" />Автомобиль найден в базе</p>
            <p className="mt-1 text-xs text-muted-foreground">{match.yearLabel || "Годы не указаны"} · код {match.code}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              <span className="flex items-center gap-1 rounded-full bg-background px-2 py-1"><ImageIcon className="h-3 w-3" />Фото добавлено</span>
              <span className="flex items-center gap-1 rounded-full bg-background px-2 py-1"><ScanLine className="h-3 w-3" />{match.technologyImagePaths?.length ? "Чертёж добавлен" : "Чертежа нет"}</span>
            </div>
          </div>
        </div>
      )}
      {!loadingMatch && modelZh && !match && <p className="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">Эта модель есть в списке, но подходящее лекало с фотографией пока не найдено.</p>}
      <p className="text-[11px] text-muted-foreground">В списках используются только международные английские названия. Китайское название хранится внутри каталога и в заказ не записывается.</p>
    </div>
  );
}
