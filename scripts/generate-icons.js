/**
 * Генерация PNG-иконок из SVG для PWA.
 * Установите sharp: npm install -D sharp
 * Запуск: node scripts/generate-icons.js
 */

const fs = require("fs");
const path = require("path");

async function generate() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.log("Установите sharp: npm install -D sharp");
    console.log("Или создайте PNG-иконки вручную из public/icons/icon.svg");
    return;
  }

  const svgPath = path.join(__dirname, "../public/icons/icon.svg");
  const svg = fs.readFileSync(svgPath);

  for (const size of [192, 512]) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, `../public/icons/icon-${size}.png`));
    console.log(`Created icon-${size}.png`);
  }

  // favicon
  await sharp(svg)
    .resize(32, 32)
    .png()
    .toFile(path.join(__dirname, "../public/favicon.png"));
  console.log("Created favicon.png");
}

generate().catch(console.error);
