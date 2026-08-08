export interface CsjCatalogVehicle {
  id: number;
  code: string;
  makeZh: string;
  manufacturerZh: string;
  modelZh: string;
  yearLabel: string;
  years: number[];
  descriptions: string[];
  imageUrl: string;
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
  modelsRu: Record<string, string>;
  descriptionsRu: Record<string, string>;
};

export function getCsjBrandName(makeZh: string) {
  return csjBrandNames[makeZh]?.en || automaticTranslations.brandsEn[makeZh] || makeZh;
}

export function getCsjModelName(modelZh: string) {
  const withoutSeries = modelZh.replace(/系列$/u, "").trim();
  if (!/[\u3400-\u9fff]/u.test(withoutSeries)) return withoutSeries;
  if (/[\u3400-\u9fff]/u.test(modelZh)) {
    return automaticTranslations.modelsRu[modelZh] || modelZh;
  }
  return modelZh.trim();
}

export function getCsjDescription(descriptionZh: string) {
  return automaticTranslations.descriptionsRu[descriptionZh] || descriptionZh;
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
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("ru-RU");
}
import translationsJson from "@/data/csj-translations.json";
