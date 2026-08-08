export interface CsjCatalogVehicle {
  id: number;
  code: string;
  makeZh: string;
  manufacturerZh: string;
  modelZh: string;
  yearLabel: string;
  years: number[];
  descriptions: string[];
  details: {
    body: string;
    drive: string;
    transmission: string;
    engine: string;
    version: string;
    emissions: string;
    property: string;
  };
  imageUrl: string;
  technologyImages: string[];
  sourceUrl: string;
  downloads: number;
  categoryId: number;
  categoryZh: string;
  createdAt: string | null;
}

export interface CsjCatalogModel {
  id: number;
  makeZh: string;
  manufacturerZh: string;
  modelZh: string;
  aliases: string[];
  carType: number;
}

export interface CsjCatalogData {
  generatedAt: string;
  source: string;
  totals: {
    makes: number;
    models: number;
    patterns: number;
    patternsByCategory: Record<string, number>;
    expectedByCategory: Record<string, number>;
  };
  categories: Array<{ id: number; nameZh: string; nameRu: string }>;
  models: CsjCatalogModel[];
  vehicles: CsjCatalogVehicle[];
}

type BrandName = {
  en: string;
  aliases?: string[];
};

/**
 * Official or commonly accepted international brand names.
 * The Chinese source value always remains available alongside this label.
 */
export const csjBrandNames: Record<string, BrandName> = {
  "大众": { en: "Volkswagen", aliases: ["VW", "Фольксваген"] },
  "奔驰": { en: "Mercedes-Benz", aliases: ["Mercedes", "Мерседес"] },
  "丰田": { en: "Toyota", aliases: ["Тойота"] },
  "宝马": { en: "BMW", aliases: ["БМВ"] },
  "比亚迪": { en: "BYD" },
  "奥迪": { en: "Audi", aliases: ["Ауди"] },
  "奥迪AUDI": { en: "Audi", aliases: ["Ауди"] },
  "五菱汽车": { en: "Wuling" },
  "奇瑞": { en: "Chery", aliases: ["Чери"] },
  "东风风行": { en: "Dongfeng Forthing", aliases: ["Forthing", "Донгфенг"] },
  "吉利": { en: "Geely", aliases: ["Джили"] },
  "吉利银河": { en: "Geely Galaxy" },
  "上汽MAXUS": { en: "Maxus" },
  "上汽大通": { en: "Maxus" },
  "本田": { en: "Honda", aliases: ["Хонда"] },
  "江淮汽车": { en: "JAC" },
  "福特": { en: "Ford", aliases: ["Форд"] },
  "现代": { en: "Hyundai", aliases: ["Хендай", "Хундай"] },
  "长安": { en: "Changan", aliases: ["Чанган"] },
  "长安欧尚": { en: "Changan Oshan", aliases: ["Oshan"] },
  "长安凯程": { en: "Changan Kaicene", aliases: ["Kaicene"] },
  "长安启源": { en: "Changan Qiyuan", aliases: ["Qiyuan"] },
  "长安轻型车": { en: "Changan Light Truck" },
  "长安跨越": { en: "Changan Kuayue" },
  "别克": { en: "Buick", aliases: ["Бьюик"] },
  "路虎": { en: "Land Rover", aliases: ["Ленд Ровер"] },
  "广汽传祺": { en: "GAC Trumpchi", aliases: ["GAC", "Trumpchi"] },
  "捷途": { en: "Jetour", aliases: ["Джетур"] },
  "日产": { en: "Nissan", aliases: ["Ниссан"] },
  "雷克萨斯": { en: "Lexus", aliases: ["Лексус"] },
  "起亚": { en: "Kia", aliases: ["Киа"] },
  "哈弗": { en: "Haval", aliases: ["Хавал"] },
  "宝骏": { en: "Baojun" },
  "沃尔沃": { en: "Volvo", aliases: ["Вольво"] },
  "红旗": { en: "Hongqi", aliases: ["Хончи"] },
  "一汽红旗": { en: "Hongqi", aliases: ["FAW Hongqi"] },
  "荣威": { en: "Roewe" },
  "雪佛兰": { en: "Chevrolet", aliases: ["Шевроле"] },
  "北汽制造": { en: "BAW", aliases: ["Beijing Auto Works"] },
  "东风风光": { en: "Dongfeng Fengon", aliases: ["Fengon", "DFSK"] },
  "福田": { en: "Foton" },
  "领克": { en: "Lynk & Co", aliases: ["Lynk"] },
  "保时捷": { en: "Porsche", aliases: ["Порше"] },
  "马自达": { en: "Mazda", aliases: ["Мазда"] },
  "林肯": { en: "Lincoln", aliases: ["Линкольн"] },
  "海马": { en: "Haima" },
  "长城": { en: "Great Wall", aliases: ["GWM"] },
  "三菱": { en: "Mitsubishi", aliases: ["Митсубиси"] },
  "金杯": { en: "Jinbei" },
  "东风": { en: "Dongfeng", aliases: ["Донгфенг"] },
  "名爵": { en: "MG" },
  "英菲尼迪": { en: "Infiniti", aliases: ["Инфинити"] },
  "星途": { en: "Exeed", aliases: ["Эксид"] },
  "铃木": { en: "Suzuki", aliases: ["Сузуки"] },
  "斯柯达": { en: "Skoda", aliases: ["Шкода"] },
  "标致": { en: "Peugeot", aliases: ["Пежо"] },
  "凯迪拉克": { en: "Cadillac", aliases: ["Кадиллак"] },
  "雪铁龙": { en: "Citroen", aliases: ["Ситроен"] },
  "JEEP吉普": { en: "Jeep", aliases: ["Джип"] },
  "蔚来": { en: "Nio" },
  "广汽埃安": { en: "GAC Aion", aliases: ["Aion"] },
  "江铃": { en: "JMC" },
  "东风风神": { en: "Dongfeng Aeolus", aliases: ["Aeolus"] },
  "五十铃": { en: "Isuzu", aliases: ["Исузу"] },
  "东南": { en: "Soueast" },
  "捷豹": { en: "Jaguar", aliases: ["Ягуар"] },
  "斯巴鲁": { en: "Subaru", aliases: ["Субару"] },
  "极氪": { en: "Zeekr", aliases: ["Зикр"] },
  "凯翼": { en: "Cowin", aliases: ["Kaiyi"] },
  "启辰": { en: "Venucia" },
  "特斯拉": { en: "Tesla", aliases: ["Тесла"] },
  "零跑": { en: "Leapmotor" },
  "零跑汽车": { en: "Leapmotor" },
  "雷诺": { en: "Renault", aliases: ["Рено"] },
  "坦克": { en: "Tank", aliases: ["Танк"] },
  "ARCFOX极狐": { en: "Arcfox" },
  "小鹏汽车": { en: "XPeng", aliases: ["Xpeng"] },
  "宾利": { en: "Bentley", aliases: ["Бентли"] },
  "玛莎拉蒂": { en: "Maserati", aliases: ["Мазерати"] },
  "腾势": { en: "Denza" },
  "讴歌": { en: "Acura", aliases: ["Акура"] },
  "双龙": { en: "KGM", aliases: ["SsangYong", "СсангЙонг"] },
  "理想": { en: "Li Auto", aliases: ["Lixiang"] },
  "菲亚特": { en: "Fiat", aliases: ["Фиат"] },
  "DS": { en: "DS Automobiles" },
  "岚图汽车": { en: "Voyah", aliases: ["Воя"] },
  "智己汽车": { en: "IM Motors" },
  "阿维塔": { en: "Avatr", aliases: ["Аватр"] },
  "Smart": { en: "Smart" },
  "捷尼赛思": { en: "Genesis", aliases: ["Генезис"] },
  "克莱斯勒": { en: "Chrysler", aliases: ["Крайслер"] },
  "劳斯莱斯": { en: "Rolls-Royce", aliases: ["Роллс-Ройс"] },
  "道奇": { en: "Dodge", aliases: ["Додж"] },
  "欧宝": { en: "Opel", aliases: ["Опель"] },
  "欧拉": { en: "Ora" },
  "阿斯顿·马丁": { en: "Aston Martin", aliases: ["Астон Мартин"] },
  "依维柯": { en: "Iveco", aliases: ["Ивеко"] },
  "莲花": { en: "Lotus", aliases: ["Лотус"] },
  "路特斯": { en: "Lotus", aliases: ["Лотус"] },
  "Polestar": { en: "Polestar" },
  "兰博基尼": { en: "Lamborghini", aliases: ["Ламборгини"] },
  "阿尔法.罗密欧": { en: "Alfa Romeo", aliases: ["Альфа Ромео"] },
  "AITO": { en: "Aito" },
  "悍马": { en: "Hummer", aliases: ["Хаммер"] },
  "法拉利": { en: "Ferrari", aliases: ["Феррари"] },
  "小米汽车": { en: "Xiaomi Auto", aliases: ["Xiaomi"] },
};

const automaticTranslations = translationsJson as {
  brandsEn: Record<string, string>;
  modelsEn?: Record<string, string>;
  modelsRu: Record<string, string>;
  descriptionsRu: Record<string, string>;
};

const csjModelNames: Record<string, string> = {
  "INSPIRE/英仕派": "INSPIRE",
  "INSPIRE/英仕派 新能源": "INSPIRE",
  "UNI-Z新能源": "UNI-Z",
};

/** Официальные международные названия моделей, которые машинный перевод искажает. */
const csjOfficialModelNames: Record<string, string> = {
  "亚洲龙": "Avalon", "亚洲狮": "Allion", "佳美": "Camry", "凯美瑞": "Camry",
  "卡罗拉": "Corolla", "卡罗拉双擎E+（新能源）": "Corolla PHEV", "卡罗拉锐放": "Corolla Cross",
  "兰德酷路泽(陆地巡洋舰)": "Land Cruiser", "凌放HARRIER": "Harrier", "汉兰达": "Highlander",
  "海拉克斯": "Hilux", "皇冠": "Crown", "皇冠陆放": "Crown Kluger", "红杉": "Sequoia",
  "坦途": "Tundra", "埃尔法": "Alphard", "塞纳": "Sienna", "赛那SIENNA": "Sienna",
  "威尔法": "Vellfire", "威兰达": "Wildlander", "威兰达新能源": "Wildlander PHEV",
  "威飒": "Venza", "威驰": "Vios", "普拉多(霸道)": "Land Cruiser Prado", "霸道": "Land Cruiser Prado",
  "普锐斯": "Prius", "普瑞维亚(大霸王)": "Previa", "锐志": "Mark X", "雅力士": "Yaris",
  "雷凌": "Levin", "花冠": "Corolla EX", "锋兰达": "Frontlander", "FJ酷路泽": "FJ Cruiser",
  "RAV4荣放": "RAV4", "RAV4荣放双擎E+": "RAV4 PHEV",
  "4Runner（超霸）": "4Runner", "丰田BZ3": "bZ3", "一汽丰田BZ4X": "bZ4X", "丰田BZ4X": "bZ4X",
  "丰田BZ5": "bZ5", "铂智3X": "bZ3X", "铂智4X": "bZ4X", "铂智7": "bZ7",
  "超霸": "4Runner", "86": "86", "卡罗拉双擎E+": "Corolla PHEV",
  "雷凌双擎E+": "Levin PHEV", "雷凌双擎E+（新能源）": "Levin PHEV",
  "Model 3": "Model 3", "MODEL 3": "Model 3",
  "E级": "E-Class", "E级新能源": "E-Class Hybrid", "E系列": "E-Series",
  "eπ007": "eπ007", "eπ008": "eπ008", "e爱丽舍": "e-Elysée",
  "雷克萨斯GX": "GX", "雷克萨斯LX": "LX", "雷克萨斯RX": "RX",
  "逸动": "Eado", "逸动PLUS": "Eado Plus", "长安CS35": "CS35", "长安CS55": "CS55",
  "长安CS75": "CS75", "长安CS95": "CS95", "深蓝S7": "Deepal S7", "深蓝SL03": "Deepal SL03",
  "宋PLUS新能源": "Song Plus", "宋Pro新能源": "Song Pro", "秦PLUS": "Qin Plus",
  "唐新能源": "Tang", "汉": "Han", "元PLUS": "Atto 3", "海豚": "Dolphin", "海豹": "Seal",
  "星越L": "Monjaro", "缤越": "Coolray", "博越": "Atlas", "帝豪": "Emgrand",
  "瑞虎7": "Tiggo 7", "瑞虎8": "Tiggo 8", "瑞虎9": "Tiggo 9",
};

const exactAutomotiveTranslations: Record<string, string> = {
  "纯油版": "Бензин",
  "燃油版": "Бензин",
  "汽油版": "Бензин",
  "非混动版": "Бензин",
  "非混合动力": "Бензин",
  "混动版": "Гибрид",
  "混合动力": "Гибрид",
  "油电混合": "Гибрид",
  "双擎": "Гибрид",
  "轻混版": "Мягкий гибрид",
  "插电式混合动力": "Подключаемый гибрид",
  "插混版": "Подключаемый гибрид",
  "纯电动": "Электро",
  "纯电版": "Электро",
  "柴油版": "Дизель",
};

function improveAutomotiveRussian(value: string) {
  return value
    .replace(/версия с чистым маслом|версия для чистого масла|чисто масляная версия/giu, "бензиновая версия")
    .replace(/негибридная версия|не гибридная версия/giu, "бензиновая версия")
    .replace(/чисто электрическая версия|чистая электрическая версия/giu, "электро")
    .replace(/легкая гибридная версия|облегченная гибридная версия/giu, "мягкий гибрид")
    .replace(/7-битн(?:ая|ый) машин(?:а|ы)/giu, "7-местный автомобиль")
    .replace(/компьютерн(?:ый|ая) (?:ящик|бокс|коробка)/giu, "электронный блок")
    .replace(/главный водитель|основной водитель/giu, "водитель")
    .replace(/второй пилот/giu, "передний пассажир")
    .replace(/дроссельная заслонка/giu, "педаль газа")
    .replace(/нет слайдера под задними сиденьями/giu, "под задними сиденьями нет направляющих")
    .replace(/резиновая оболочка/giu, "пластиковый кожух")
    .replace(/интерфейс питания/giu, "разъём питания")
    .trim();
}

export function getCsjBrandName(makeZh: string) {
  return csjBrandNames[makeZh]?.en || automaticTranslations.brandsEn[makeZh] || makeZh;
}

export function getCsjModelName(modelZh: string) {
  if (csjModelNames[modelZh]) return csjModelNames[modelZh];
  const withoutSeries = modelZh.replace(/系列$/u, "").trim();
  if (/^[a-zA-Z0-9]/u.test(withoutSeries) && /[\u3400-\u9fff]/u.test(withoutSeries)) {
    const latinParts = withoutSeries
      .split(/[\u3400-\u9fff（）()，、]+/u)
      .map((part) => part.replace(/^\/+|\/+$/gu, "").trim())
      .filter((part) => /^[a-zA-Z0-9]/u.test(part));
    if (latinParts.length) {
      const latinModel = latinParts.join(" ").replace(/\s+/gu, " ");
      return /新能源/u.test(withoutSeries)
        ? `${latinModel} (гибрид/электро)`
        : latinModel;
    }
  }
  const latinName = withoutSeries
    .replace(/[（(][\u3400-\u9fff\s]+[）)]/gu, "")
    .replace(/\/[\u3400-\u9fff]+$/u, "")
    .trim();
  if (/^[a-zA-Z0-9]/u.test(latinName) && !/[\u3400-\u9fff]/u.test(latinName)) {
    return latinName;
  }
  if (!/[\u3400-\u9fff]/u.test(withoutSeries)) return withoutSeries;
  if (/[\u3400-\u9fff]/u.test(modelZh)) {
    return automaticTranslations.modelsRu[modelZh] || modelZh;
  }
  return modelZh.trim();
}

export function getCsjModelEnglishName(modelZh: string) {
  if (csjOfficialModelNames[modelZh]) return csjOfficialModelNames[modelZh];
  const normalized = modelZh.replace(/系列$/u, "").trim();
  if (/^[A-Za-z0-9]/u.test(normalized)) {
    const originalInternationalName = normalized
      .replace(/[\u3400-\u9fff]+/gu, " ")
      .replace(/[（）()]/gu, " ")
      .replace(/\s+/gu, " ")
      .trim();
    if (originalInternationalName.length > 1) return originalInternationalName;
  }
  const latinParts = normalized.match(/[A-Za-z0-9]*[A-Za-z][A-Za-z0-9+_.-]*/gu) || [];
  const latinLength = latinParts.join("").replace(/[^A-Za-z0-9]/gu, "").length;
  if (latinParts.length && (/^[A-Za-z0-9]/u.test(normalized) || latinLength >= 4)) {
    return Array.from(new Set(latinParts)).join(" ")
      .replace(/新能源/gu, "")
      .replace(/\s+/gu, " ")
      .trim();
  }
  const translated = automaticTranslations.modelsEn?.[modelZh]
    || `Model ${normalized.match(/\d+/u)?.[0] || ""}`;
  return translated
    .replace(/[\u3400-\u9fff（）()]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function getCsjDescription(descriptionZh: string) {
  const exact = exactAutomotiveTranslations[descriptionZh];
  if (exact) return exact;
  return improveAutomotiveRussian(
    automaticTranslations.descriptionsRu[descriptionZh] || descriptionZh,
  );
}

export function getCsjPowertrain(vehicle: CsjCatalogVehicle) {
  const source = [
    vehicle.modelZh,
    vehicle.yearLabel,
    ...(vehicle.descriptions || []),
    ...Object.values(vehicle.details || {}),
  ].join(" ");

  if (/柴油/u.test(source)) return "Дизель";
  if (/纯油|非混|燃油|汽油/u.test(source)) return "Бензин";
  if (/插电|插混|PHEV|DM-i|iDD|DHT/u.test(source)) return "Подключаемый гибрид";
  if (/轻混/u.test(source)) return "Мягкий гибрид";
  if (/混动|混合动力|油电|双擎|增程/u.test(source)) return "Гибрид";
  if (/纯电|BEV|电动车/u.test(source)) return "Электро";
  return "";
}

export function getCsjSearchText(vehicle: CsjCatalogVehicle) {
  const brand = csjBrandNames[vehicle.makeZh];
  return [
    vehicle.code,
    vehicle.makeZh,
    vehicle.manufacturerZh,
    vehicle.modelZh,
    getCsjModelName(vehicle.modelZh),
    vehicle.yearLabel,
    ...(vehicle.years || []).map(String),
    brand?.en,
    ...(brand?.aliases || []),
    ...vehicle.descriptions,
    ...vehicle.descriptions.map(getCsjDescription),
    ...Object.values(vehicle.details || {}),
    ...Object.values(vehicle.details || {}).map(getCsjDescription),
    getCsjPowertrain(vehicle),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("ru-RU");
}
import translationsJson from "@/data/csj-translations.json";
