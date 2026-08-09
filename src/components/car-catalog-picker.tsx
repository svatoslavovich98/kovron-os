"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check, CheckCircle2, ChevronDown, ChevronRight, Image as ImageIcon,
  ListFilter, Loader2, Maximize2, PencilLine, ScanLine, Search, X,
} from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";

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
  descriptionsRu: string[];
  detailsRu: Array<{ label: string; value: string }>;
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
  generation: string;
  year: string;
  body: string;
  onCarChange: (brand: string, model: string) => void;
  onDetailsChange: (details: { generation?: string; year?: string; body?: string }) => void;
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

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getBodyLabel(item: CatalogMatch) {
  const text = [...(item.descriptionsRu || []), ...(item.detailsRu || []).map(detail => detail.value)].join(" ");
  if (/3[- ]?двер|тр[её]хдвер|\b2\s*двер/iu.test(text)) return "3-дверный";
  if (/5[- ]?двер|пятидвер|\b4\s*двер/iu.test(text)) return "5-дверный";
  if (/кабриолет|convertible/iu.test(text)) return "Кабриолет";
  if (/купе|coupe/iu.test(text)) return "Купе";
  return item.detailsRu?.find(detail => detail.label === "Кузов")?.value || "";
}

function getVariantDetails(item: CatalogMatch) {
  const body = getBodyLabel(item);
  return unique((item.descriptionsRu || []).filter(value =>
    value !== item.yearLabel && value !== body && !/^\d{4}(?:-\d{4})?/u.test(value),
  )).slice(0, 2);
}

export function CarCatalogPicker({
  brand, model, generation, year, body, onCarChange, onDetailsChange, onMediaFound,
}: CarCatalogPickerProps) {
  const [mode, setMode] = useState<"search" | "lists" | "manual">("search");
  const [query, setQuery] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CatalogMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [makes, setMakes] = useState<CatalogOption[]>([]);
  const [models, setModels] = useState<CatalogOption[]>([]);
  const [makeZh, setMakeZh] = useState("");
  const [modelZh, setModelZh] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [variants, setVariants] = useState<CatalogMatch[]>([]);
  const [match, setMatch] = useState<CatalogMatch | null>(null);
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null);
  const selectedCodeRef = useRef("");
  const onMediaFoundRef = useRef(onMediaFound);
  onMediaFoundRef.current = onMediaFound;

  const publishMedia = (item: CatalogMatch | null) => {
    onMediaFoundRef.current(item ? {
      carImageUrl: item.imagePath ? imageUrl(item.imagePath, "carview") : undefined,
      technologyImageUrl: item.technologyImagePaths?.[0] ? imageUrl(item.technologyImagePaths[0]) : undefined,
      code: item.code,
      yearLabel: item.yearLabel,
      sourceUrl: item.sourceUrl,
    } : null);
  };

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
    if (trimmed && trimmed === committedQuery) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ q: trimmed, limit: "30" });
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
  }, [query, committedQuery]);

  const groupedSearchResults = useMemo(() => {
    const groups = new Map<string, CatalogMatch>();
    for (const item of searchResults) {
      const key = `${item.makeZh}|${item.modelZh}`;
      if (!groups.has(key)) groups.set(key, item);
    }
    return Array.from(groups.values()).slice(0, 10);
  }, [searchResults]);

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
      setVariants([]);
      setMatch(null);
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      setLoadingMatch(true);
      try {
        const params = new URLSearchParams({ make: makeZh, model: modelZh, limit: "60" });
        const response = await fetch(`/api/csj-catalog?${params}`, { signal: controller.signal });
        const data = await response.json() as { results?: CatalogMatch[] };
        const results = data.results || [];
        setVariants(results);
        const preferred = results.find(item => item.code.trim() === selectedCodeRef.current.trim())
          || results.find(item => year && item.years.includes(Number(year)) && (!body || getBodyLabel(item) === body))
          || [...results].sort((a, b) =>
            Number(Boolean(b.technologyImagePaths?.length)) - Number(Boolean(a.technologyImagePaths?.length))
            || Number(Boolean(b.imagePath)) - Number(Boolean(a.imagePath)),
          )[0]
          || null;
        setMatch(preferred);
        publishMedia(preferred);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setVariants([]);
          setMatch(null);
          publishMedia(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoadingMatch(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [makeZh, modelZh]);

  const applyVariant = (item: CatalogMatch, suggestedYear?: number) => {
    selectedCodeRef.current = item.code;
    setMatch(item);
    setMakeZh(item.makeZh);
    setModelZh(item.modelZh);
    setVariantsOpen(false);
    onCarChange(item.make, item.modelEn);
    onDetailsChange({
      generation: item.yearLabel || generation,
      year: suggestedYear ? String(suggestedYear) : item.years.length === 1 && item.years[0] > 1900 ? String(item.years[0]) : year,
      body: getBodyLabel(item) || body,
    });
    publishMedia(item);
  };

  const selectMake = (value: string) => {
    setMakeZh(value);
    setModelZh("");
    setVariants([]);
    setMatch(null);
    selectedCodeRef.current = "";
    const selected = makes.find(item => item.value === value);
    onCarChange(selected?.label || "", "");
    publishMedia(null);
  };

  const selectModel = (value: string) => {
    setModelZh(value);
    selectedCodeRef.current = "";
    setVariantsOpen(Boolean(value));
    const selectedMake = makes.find(item => item.value === makeZh);
    const selectedModel = models.find(item => item.value === value);
    onCarChange(selectedMake?.label || brand, selectedModel?.label || "");
  };

  const selectSearchResult = (result: CatalogMatch) => {
    const requestedYear = Number(query.match(/\b(?:19|20)\d{2}\b/u)?.[0] || 0);
    selectedCodeRef.current = result.code;
    const nextQuery = `${result.make} ${result.modelEn}${requestedYear ? ` ${requestedYear}` : ""}`;
    setCommittedQuery(nextQuery);
    setQuery(nextQuery);
    setSearchResults([]);
    setVariantsOpen(true);
    applyVariant(result, requestedYear && result.years.includes(requestedYear) ? requestedYear : undefined);
  };

  const generationOptions = useMemo(() => unique(variants.map(item => item.yearLabel)), [variants]);
  const yearOptions = useMemo(() => unique((match?.years || []).filter(value => value > 1900).map(String)), [match]);
  const bodyOptions = useMemo(() => unique(
    variants.filter(item => !generation || item.yearLabel === generation).map(getBodyLabel),
  ), [variants, generation]);
  const sortedVariants = useMemo(() => [...variants].sort((a, b) =>
    Number(b.code.trim() === match?.code.trim()) - Number(a.code.trim() === match?.code.trim())
    || getBodyLabel(a).localeCompare(getBodyLabel(b), "ru")
    || a.yearLabel.localeCompare(b.yearLabel, "ru"),
  ), [variants, match]);

  const chooseGeneration = (value: string) => {
    const next = variants.find(item => item.yearLabel === value && (!body || getBodyLabel(item) === body))
      || variants.find(item => item.yearLabel === value);
    if (next) applyVariant(next, next.years.includes(Number(year)) ? Number(year) : undefined);
    else onDetailsChange({ generation: value });
  };

  const chooseBody = (value: string) => {
    const next = variants.find(item => getBodyLabel(item) === value && (!generation || item.yearLabel === generation))
      || variants.find(item => getBodyLabel(item) === value);
    if (next) applyVariant(next, next.years.includes(Number(year)) ? Number(year) : undefined);
    else onDetailsChange({ body: value });
  };

  const switchToManual = () => {
    setMode("manual");
    setMakeZh("");
    setModelZh("");
    setVariants([]);
    setMatch(null);
    publishMedia(null);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-background p-1">
        <button type="button" onClick={() => setMode("search")} className={`flex min-h-11 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold transition-colors ${mode === "search" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
          <Search className="h-4 w-4" />Поиск
        </button>
        <button type="button" onClick={() => setMode("lists")} className={`flex min-h-11 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold transition-colors ${mode === "lists" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
          <ListFilter className="h-4 w-4" />Из списка
        </button>
        <button type="button" onClick={switchToManual} className={`flex min-h-11 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold transition-colors ${mode === "manual" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
          <PencilLine className="h-4 w-4" />Вручную
        </button>
      </div>

      {mode === "search" && (
        <div className="relative">
          <label className="block">
            <span className="mb-1 block text-sm text-muted-foreground">Марка, модель, год или тип кузова</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={query} onChange={event => { setCommittedQuery(""); setQuery(event.target.value); }} placeholder="Например: Evoque 3 двери 2012" autoComplete="off" className="h-12 w-full rounded-md border border-border bg-background pl-10 pr-10 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
              {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />}
            </div>
          </label>
          {query.trim().length >= 2 && !searching && groupedSearchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[min(420px,52dvh)] overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-2xl">
              {groupedSearchResults.map(result => (
                <button type="button" key={`${result.makeZh}-${result.modelZh}`} onClick={() => selectSearchResult(result)} className="flex w-full items-center gap-3 rounded-md p-2.5 text-left transition-colors hover:bg-background active:bg-primary/10">
                  <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-white">
                    {result.imagePath ? <img src={imageUrl(result.imagePath)} alt="" className="h-full w-full object-contain" /> : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{result.make} {result.modelEn}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Нажмите, чтобы выбрать год, кузов и точный вариант</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
          {query.trim().length >= 2 && !searching && groupedSearchResults.length === 0 && <p className="mt-2 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">Не нашли автомобиль. Проверьте написание или выберите «Вручную» — заказ всё равно можно создать.</p>}
          {query.trim().length < 2 && <p className="mt-2 text-[11px] text-muted-foreground">Можно искать так: «Range Rover Evoque», «Evoque 3 двери» или «Evoque 2012».</p>}
        </div>
      )}

      {mode === "lists" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-sm text-muted-foreground">Марка</span><select value={makeZh} onChange={event => selectMake(event.target.value)} disabled={loadingOptions} className="h-12 w-full rounded-md border border-border bg-background px-3 text-sm font-semibold outline-none focus:border-primary disabled:opacity-60"><option value="">{loadingOptions ? "Загрузка марок…" : "Выберите марку"}</option>{makes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="block"><span className="mb-1 block text-sm text-muted-foreground">Модель</span><select value={modelZh} onChange={event => selectModel(event.target.value)} disabled={!makeZh || !models.length} className="h-12 w-full rounded-md border border-border bg-background px-3 text-sm font-semibold outline-none focus:border-primary disabled:opacity-60"><option value="">{makeZh ? "Выберите модель" : "Сначала выберите марку"}</option>{models.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        </div>
      )}

      {mode === "manual" && (
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="mb-3 text-sm font-semibold">Свой автомобиль — без каталога</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label><span className="mb-1 block text-xs text-muted-foreground">Марка *</span><input value={brand} onChange={event => onCarChange(event.target.value, model)} placeholder="Например, Land Rover" className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-primary" /></label>
            <label><span className="mb-1 block text-xs text-muted-foreground">Модель *</span><input value={model} onChange={event => onCarChange(brand, event.target.value)} placeholder="Например, Evoque" className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-primary" /></label>
            <label><span className="mb-1 block text-xs text-muted-foreground">Поколение</span><input value={generation} onChange={event => onDetailsChange({ generation: event.target.value })} placeholder="Например, I поколение" className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-primary" /></label>
            <label><span className="mb-1 block text-xs text-muted-foreground">Год</span><input type="number" inputMode="numeric" value={year} onChange={event => onDetailsChange({ year: event.target.value })} placeholder="2012" className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-primary" /></label>
            <label className="sm:col-span-2"><span className="mb-1 block text-xs text-muted-foreground">Кузов</span><input value={body} onChange={event => onDetailsChange({ body: event.target.value })} placeholder="Например, 3-дверный" className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-primary" /></label>
          </div>
        </div>
      )}

      {loadingMatch && <div className="flex items-center gap-2 rounded-md bg-secondary/50 p-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Загружаем варианты, фотографии и чертежи…</div>}

      {!loadingMatch && variants.length > 0 && mode !== "manual" && (
        <div className="space-y-3 rounded-lg border border-primary/25 bg-primary/5 p-3">
          <button type="button" onClick={() => setVariantsOpen(value => !value)} className="flex w-full items-center gap-3 text-left">
            <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white">
              {match?.imagePath ? <img src={imageUrl(match.imagePath)} alt="" className="h-full w-full object-contain" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1"><p className="text-sm font-bold">{match ? `${match.make} ${match.modelEn}` : "Выберите точный вариант"}</p><p className="mt-1 text-xs text-muted-foreground">{match ? [match.yearLabel, getBodyLabel(match), `код ${match.code.trim()}`].filter(Boolean).join(" · ") : `${variants.length} вариантов`}</p></div>
            <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${variantsOpen ? "rotate-180" : ""}`} />
          </button>

          {variantsOpen && (
            <div className="max-h-[min(520px,55dvh)] space-y-2 overflow-y-auto rounded-md border border-border bg-card p-2">
              <p className="px-1 pb-1 text-xs font-semibold text-muted-foreground">Выберите по фотографии, году и кузову</p>
              {sortedVariants.map(item => {
                const selected = item.code.trim() === match?.code.trim();
                const details = getVariantDetails(item);
                return <div key={`${item.code}-${item.category}`} className={`flex gap-2 rounded-md border p-2 ${selected ? "border-primary bg-primary/5" : "border-border"}`}>
                  <button type="button" onClick={() => item.imagePath && setPreview({ url: imageUrl(item.imagePath), title: `${item.make} ${item.modelEn} ${item.yearLabel}` })} className="relative flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-white">
                    {item.imagePath ? <img src={imageUrl(item.imagePath)} alt="" className="h-full w-full object-contain" /> : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
                    {item.imagePath && <span className="absolute bottom-1 right-1 rounded bg-black/65 p-1 text-white"><Maximize2 className="h-3 w-3" /></span>}
                  </button>
                  <button type="button" onClick={() => applyVariant(item)} className="min-w-0 flex-1 text-left">
                    <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="text-sm font-bold">{item.yearLabel || "Годы не указаны"}</p><p className="mt-0.5 text-xs font-semibold text-primary">{getBodyLabel(item) || "Стандартный кузов"}</p></div>{selected && <Check className="h-5 w-5 shrink-0 text-primary" />}</div>
                    {!!details.length && <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{details.join(" · ")}</p>}
                    <p className="mt-1 text-[10px] text-muted-foreground">{item.category} · код {item.code.trim()}</p>
                  </button>
                </div>;
              })}
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label><span className="mb-1 block text-xs text-muted-foreground">Поколение / период</span><select value={generation} onChange={event => chooseGeneration(event.target.value)} className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm"><option value="">Выберите</option>{generation && !generationOptions.includes(generation) && <option value={generation}>{generation}</option>}{generationOptions.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
            <label><span className="mb-1 block text-xs text-muted-foreground">Год выпуска</span><select value={year} onChange={event => onDetailsChange({ year: event.target.value })} className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm"><option value="">Выберите</option>{year && !yearOptions.includes(year) && <option value={year}>{year}</option>}{yearOptions.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
            <label><span className="mb-1 block text-xs text-muted-foreground">Кузов</span><select value={body} onChange={event => chooseBody(event.target.value)} className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm"><option value="">Выберите</option>{body && !bodyOptions.includes(body) && <option value={body}>{body}</option>}{bodyOptions.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          </div>

          {match && <div className="flex flex-wrap gap-2 text-[11px]"><span className="flex items-center gap-1 rounded-full bg-card px-2 py-1"><CheckCircle2 className="h-3 w-3 text-primary" />Вариант выбран</span><span className="flex items-center gap-1 rounded-full bg-card px-2 py-1"><ImageIcon className="h-3 w-3" />{match.imagePath ? "Фото добавлено" : "Фото нет"}</span><span className="flex items-center gap-1 rounded-full bg-card px-2 py-1"><ScanLine className="h-3 w-3" />{match.technologyImagePaths?.length ? "Чертёж добавлен" : "Чертежа нет"}</span></div>}
        </div>
      )}

      {(brand || model) && !makeZh && mode !== "manual" && <p className="rounded-md bg-secondary/50 p-2.5 text-xs text-muted-foreground">Текущий автомобиль: <span className="font-semibold text-foreground">{brand} {model}</span>. Если его нет в каталоге, выберите «Вручную».</p>}
      <p className="text-[11px] text-muted-foreground">Английские названия видит пользователь; китайские ключи используются только внутри для связи с исходным лекалом.</p>

      {preview && <ModalPortal><div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/90 p-3" onClick={() => setPreview(null)}><button type="button" onClick={() => setPreview(null)} className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] rounded-full bg-black/60 p-3 text-white"><X className="h-5 w-5" /></button><div className="max-h-[92dvh] max-w-4xl" onClick={event => event.stopPropagation()}><img src={preview.url} alt={preview.title} className="max-h-[85dvh] max-w-full rounded-lg object-contain" /><p className="mt-2 text-center text-sm font-medium text-white">{preview.title}</p></div></div></ModalPortal>}
    </div>
  );
}
