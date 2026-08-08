import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "http://www.csj918.com";
const CATEGORY_IDS = [20, 28, 32];
const PAGE_SIZE = 500;
const OUTPUT_FILE = path.resolve("src/data/csj-catalog.json");

const headers = {
  Accept: "application/json, text/javascript, */*; q=0.01",
  Referer: `${BASE_URL}/index.php/vehicle_model/index/nid/2.html`,
  "User-Agent": "KOVRON-OS catalog indexer (personal internal search)",
  "X-Requested-With": "XMLHttpRequest",
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await wait(500 * attempt);
    }
  }

  throw lastError;
}

function cleanName(value = "") {
  return String(value).replace(/\s+\(\d+\)$/u, "").trim();
}

function flattenBrandNodes(nodes) {
  const makes = [];
  const models = [];

  function visit(node, ancestors = []) {
    if (!node || typeof node !== "object" || !node.id) return;
    const name = cleanName(node.name || node.title);
    const nextAncestors = [...ancestors, name];

    if (node.type === 0) {
      makes.push({
        id: Number(node.id),
        nameZh: name,
        aliases: cleanName(node.as_title || "")
          .split("|")
          .map((item) => item.trim())
          .filter(Boolean),
        firstLetter: node.first_letter || "",
        logoUrl: node.logo ? `${BASE_URL}/manage/${node.logo}` : "",
        carType: Number(node.car_type || 0),
      });
    }

    if (node.type === 2) {
      models.push({
        id: Number(node.id),
        makeZh: ancestors[0] || "",
        manufacturerZh: ancestors[1] || ancestors[0] || "",
        modelZh: name,
        aliases: cleanName(node.as_title || "")
          .split("|")
          .map((item) => item.trim())
          .filter(Boolean),
        carType: Number(node.car_type || 0),
      });
    }

    for (const child of node.children || []) visit(child, nextAncestors);
  }

  for (const node of Object.values(nodes || {})) visit(node);
  return { makes, models };
}

function normalizeVehicle(row) {
  const pathParts = String(row.brand_title_path || "")
    .split("/")
    .map(cleanName)
    .filter(Boolean);

  return {
    id: Number(row.id),
    code: String(row.number || ""),
    makeZh: pathParts[0] || "",
    manufacturerZh: pathParts[1] || pathParts[0] || "",
    modelZh: pathParts.at(-1) || cleanName(row.brand_title),
    yearLabel: String(row.year || "").trim(),
    years: String(row.years || "")
      .split(",")
      .map((year) => Number(year.trim()))
      .filter(Number.isFinite),
    descriptions: [1, 2, 3, 4, 5, 6]
      .map((index) => String(row[`description_${index}`] || "").trim())
      .filter(Boolean),
    imageUrl: row.show_img ? `${BASE_URL}/manage/${row.show_img}` : "",
    sourceUrl: `${BASE_URL}/index.php/vehicle_model/show/nid/2/number/${encodeURIComponent(row.number || "")}`,
    downloads: Number(row.download || 0),
    categoryId: Number(row.product_classify_id),
    categoryZh: String(row.product_classify_title || ""),
    createdAt: row.create_time
      ? new Date(Number(row.create_time) * 1000).toISOString()
      : null,
  };
}

async function loadBrandTree(carType) {
  const url = `${BASE_URL}/index.php/Information_center/pc_barnd_list?car_type=${carType}`;
  const payload = await fetchJson(url);
  return flattenBrandNodes(payload.nodes);
}

async function loadVehicles(categoryId) {
  const vehicles = [];
  let start = 0;
  let total = Infinity;

  while (start < total) {
    const url = new URL(`${BASE_URL}/index.php/Information_center/vehicle_model_list2`);
    url.searchParams.set("cid", String(categoryId));
    url.searchParams.set("bid", "0");
    url.searchParams.set("start", String(start));
    url.searchParams.set("limit", String(PAGE_SIZE));

    const payload = await fetchJson(url);
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    total = Number(payload.result_count || rows.length);
    vehicles.push(...rows.map(normalizeVehicle));

    process.stdout.write(`\rКатегория ${categoryId}: получено ${vehicles.length} из ${total}`);
    if (!rows.length) break;
    start += rows.length;
    await wait(200);
  }

  process.stdout.write("\n");
  return { vehicles, expected: total };
}

async function main() {
  const categoriesPayload = await fetchJson(
    `${BASE_URL}/index.php/Information_center/product_classify_list`,
  );
  const categories = (categoriesPayload.rows || [])
    .filter((item) => CATEGORY_IDS.includes(Number(item.id)))
    .map((item) => ({
      id: Number(item.id),
      nameZh: item.title,
      nameRu:
        Number(item.id) === 28
          ? "Коврики 360°"
          : Number(item.id) === 32
            ? "Коврики с полным покрытием"
            : "Коврики с полным охватом",
    }));

  const [passengerTree, commercialTree] = await Promise.all([
    loadBrandTree(0),
    loadBrandTree(1),
  ]);

  const categoryResults = [];
  for (const categoryId of CATEGORY_IDS) {
    categoryResults.push({ categoryId, ...(await loadVehicles(categoryId)) });
  }
  const vehicles = categoryResults.flatMap((item) => item.vehicles);

  const makesById = new Map();
  for (const make of [...passengerTree.makes, ...commercialTree.makes]) {
    makesById.set(make.id, make);
  }

  const modelsById = new Map();
  for (const model of [...passengerTree.models, ...commercialTree.models]) {
    modelsById.set(model.id, model);
  }

  const catalog = {
    generatedAt: new Date().toISOString(),
    source: BASE_URL,
    categories,
    totals: {
      makes: makesById.size,
      models: modelsById.size,
      patterns: vehicles.length,
      patternsByCategory: Object.fromEntries(
        categoryResults.map((item) => [item.categoryId, item.vehicles.length]),
      ),
      expectedByCategory: Object.fromEntries(
        categoryResults.map((item) => [item.categoryId, item.expected]),
      ),
    },
    makes: [...makesById.values()].sort((a, b) =>
      a.firstLetter.localeCompare(b.firstLetter) || a.nameZh.localeCompare(b.nameZh),
    ),
    models: [...modelsById.values()].sort((a, b) =>
      a.makeZh.localeCompare(b.makeZh) || a.modelZh.localeCompare(b.modelZh),
    ),
    vehicles: vehicles.sort((a, b) =>
      a.makeZh.localeCompare(b.makeZh) ||
      a.modelZh.localeCompare(b.modelZh) ||
      a.yearLabel.localeCompare(b.yearLabel),
    ),
  };

  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(catalog)}\n`, "utf8");

  console.log(
    `Сохранено: ${catalog.totals.makes} марок, ${catalog.totals.models} моделей, ` +
      `${catalog.totals.patterns} вариантов лекал в ${categories.length} категориях`,
  );
  console.log(OUTPUT_FILE);
}

main().catch((error) => {
  console.error("Не удалось обновить каталог:", error);
  process.exitCode = 1;
});
