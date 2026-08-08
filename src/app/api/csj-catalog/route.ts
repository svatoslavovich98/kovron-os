import { NextRequest, NextResponse } from "next/server";
import catalogJson from "@/data/csj-catalog.json";
import {
  getCsjBrandName,
  getCsjDescription,
  getCsjModelName,
  getCsjSearchText,
  type CsjCatalogData,
  type CsjCatalogVehicle,
} from "@/lib/csj-catalog";

export const dynamic = "force-dynamic";

const catalog = catalogJson as CsjCatalogData;
const prepared = catalog.vehicles.map((vehicle) => ({
  vehicle,
  searchText: getCsjSearchText(vehicle),
}));
const modelsWithPatterns = new Set(
  catalog.vehicles.map((vehicle) => `${vehicle.makeZh}|${vehicle.modelZh}`),
);
const modelsWithPatternsByCategory = new Map<number, Set<string>>();
for (const vehicle of catalog.vehicles) {
  const categoryModels = modelsWithPatternsByCategory.get(vehicle.categoryId) || new Set<string>();
  categoryModels.add(`${vehicle.makeZh}|${vehicle.modelZh}`);
  modelsWithPatternsByCategory.set(vehicle.categoryId, categoryModels);
}
const preparedModels = catalog.models.map((model) => ({
  model,
  searchText: [
    getCsjBrandName(model.makeZh),
    model.makeZh,
    model.manufacturerZh,
    getCsjModelName(model.modelZh),
    model.modelZh,
    ...(model.aliases || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("ru-RU"),
}));

function normalizeQuery(value: string) {
  return value.trim().toLocaleLowerCase("ru-RU");
}

function toResult(vehicle: CsjCatalogVehicle) {
  return {
    id: vehicle.id,
    code: vehicle.code,
    make: getCsjBrandName(vehicle.makeZh),
    makeZh: vehicle.makeZh,
    model: getCsjModelName(vehicle.modelZh),
    modelZh: vehicle.modelZh,
    manufacturerZh: vehicle.manufacturerZh,
    yearLabel: vehicle.yearLabel,
    years: vehicle.years,
    descriptions: vehicle.descriptions,
    descriptionsRu: vehicle.descriptions.map(getCsjDescription),
    imagePath: vehicle.imageUrl.replace(/^https?:\/\/www\.csj918\.com\/manage\//i, ""),
    sourceUrl: vehicle.sourceUrl,
    downloads: vehicle.downloads,
    categoryId: vehicle.categoryId,
    category: catalog.categories.find((item) => item.id === vehicle.categoryId)?.nameRu || "Автомобильные коврики",
    categoryZh: vehicle.categoryZh,
  };
}

export async function GET(request: NextRequest) {
  const query = normalizeQuery(request.nextUrl.searchParams.get("q") || "");
  const year = Number(request.nextUrl.searchParams.get("year") || 0);
  const categoryId = Number(request.nextUrl.searchParams.get("category") || 0);
  const offset = Math.max(0, Number(request.nextUrl.searchParams.get("offset") || 0));
  const limit = Math.min(60, Math.max(1, Number(request.nextUrl.searchParams.get("limit") || 30)));
  const tokens = query.split(/\s+/u).filter(Boolean);

  let matches = prepared.filter(({ vehicle, searchText }) => {
    if (year && !vehicle.years.includes(year)) return false;
    if (categoryId && vehicle.categoryId !== categoryId) return false;
    return tokens.every((token) => searchText.includes(token));
  });

  if (!query && !year) {
    matches = [...matches].sort((a, b) =>
      String(b.vehicle.createdAt || "").localeCompare(String(a.vehicle.createdAt || "")),
    );
  } else {
    matches = [...matches].sort((a, b) =>
      b.vehicle.downloads - a.vehicle.downloads ||
      a.vehicle.code.localeCompare(b.vehicle.code),
    );
  }

  const modelsWithoutPatterns = query
    ? preparedModels
        .filter(({ model, searchText }) =>
          !(categoryId
            ? modelsWithPatternsByCategory.get(categoryId)?.has(`${model.makeZh}|${model.modelZh}`)
            : modelsWithPatterns.has(`${model.makeZh}|${model.modelZh}`)) &&
          tokens.every((token) => searchText.includes(token)),
        )
        .slice(0, 20)
        .map(({ model }) => ({
          id: model.id,
          make: getCsjBrandName(model.makeZh),
          makeZh: model.makeZh,
          model: getCsjModelName(model.modelZh),
          modelZh: model.modelZh,
        }))
    : [];

  return NextResponse.json(
    {
      generatedAt: catalog.generatedAt,
      totals: catalog.totals,
      total: matches.length,
      offset,
      results: matches.slice(offset, offset + limit).map(({ vehicle }) => toResult(vehicle)),
      modelsWithoutPatterns,
    },
    {
      headers: {
        "Cache-Control": query || year
          ? "public, s-maxage=300, stale-while-revalidate=3600"
          : "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
