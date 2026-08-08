import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CATALOG_FILE = path.resolve("src/data/csj-catalog.json");
const OUTPUT_FILE = path.resolve("src/data/csj-translations.json");
const MAX_BATCH_CHARS = 2400;
const MAX_BATCH_LINES = 50;
const BATCH_SEPARATOR = "9918273645";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const hasChinese = (value) => /[\u3400-\u9fff]/u.test(value);

async function loadJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

function makeBatches(values) {
  const batches = [];
  let current = [];
  let chars = 0;

  for (const value of values) {
    if (
      current.length &&
      (current.length >= MAX_BATCH_LINES || chars + value.length + 1 > MAX_BATCH_CHARS)
    ) {
      batches.push(current);
      current = [];
      chars = 0;
    }

    current.push(value);
    chars += value.length + 1;
  }

  if (current.length) batches.push(current);
  return batches;
}

async function requestTranslation(lines, targetLanguage, attempts = 3) {
  const source = lines.join(`\n${BATCH_SEPARATOR}\n`);
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "zh-CN");
  url.searchParams.set("tl", targetLanguage);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", source);

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "KOVRON-OS catalog translator" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const translated = (payload?.[0] || [])
        .map((part) => part?.[0] || "")
        .join("")
        .split(new RegExp(`\\s*${BATCH_SEPARATOR}\\s*`, "u"))
        .map((item) => item.trim());

      if (translated.length !== lines.length) {
        throw new Error(
          `Количество строк не совпало: ${lines.length} → ${translated.length}`,
        );
      }

      return translated;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await wait(attempt * 800);
    }
  }

  if (lines.length > 1) {
    const translated = [];
    for (const line of lines) {
      translated.push((await requestTranslation([line], targetLanguage))[0]);
      await wait(120);
    }
    return translated;
  }

  throw lastError;
}

async function translateMissing(values, targetLanguage, cache, label) {
  const missing = [...new Set(values)]
    .filter(Boolean)
    .filter(hasChinese)
    .filter((value) => !cache[value]);
  const batches = makeBatches(missing);
  let completed = 0;

  for (const batch of batches) {
    const translated = await requestTranslation(batch, targetLanguage);
    batch.forEach((source, index) => {
      cache[source] = translated[index] || source;
    });
    completed += batch.length;
    process.stdout.write(`\r${label}: ${completed} из ${missing.length}`);
    await wait(250);
  }

  if (missing.length) process.stdout.write("\n");
}

async function main() {
  const catalog = await loadJson(CATALOG_FILE, null);
  if (!catalog) throw new Error("Сначала выполните sync-csj-catalog.mjs");

  const translations = await loadJson(OUTPUT_FILE, {
    generatedAt: null,
    sourceLanguage: "zh-CN",
    brandsEn: {},
    modelsRu: {},
    descriptionsRu: {},
  });

  const makes = catalog.makes.map((make) => make.nameZh);
  const models = catalog.models.map((model) => model.modelZh);
  const descriptions = catalog.vehicles.flatMap((vehicle) => vehicle.descriptions || []);

  await translateMissing(makes, "en", translations.brandsEn, "Марки → EN");
  await translateMissing(models, "ru", translations.modelsRu, "Модели → RU");
  await translateMissing(
    descriptions,
    "ru",
    translations.descriptionsRu,
    "Описания → RU",
  );

  translations.generatedAt = new Date().toISOString();
  await writeFile(OUTPUT_FILE, `${JSON.stringify(translations)}\n`, "utf8");

  console.log(
    `Сохранено переводов: ${Object.keys(translations.brandsEn).length} марок, ` +
      `${Object.keys(translations.modelsRu).length} моделей, ` +
      `${Object.keys(translations.descriptionsRu).length} описаний`,
  );
  console.log(OUTPUT_FILE);
}

main().catch((error) => {
  console.error("Не удалось перевести каталог:", error);
  process.exitCode = 1;
});
