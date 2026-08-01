import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file) {
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index > 0) out[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return out;
}

const env = loadEnv(path.resolve(".env.local"));
const login = process.env.KOVRON_IMPORT_LOGIN;
const password = process.env.KOVRON_IMPORT_PASSWORD;
if (!login || !password) throw new Error("Set KOVRON_IMPORT_LOGIN and KOVRON_IMPORT_PASSWORD");

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: auth, error: authError } = await sb.auth.signInWithPassword({
  email: login.includes("@") ? login : `${login}@kovron.local`,
  password,
});
if (authError || !auth.user) throw new Error(`Login failed: ${authError?.message || "unknown"}`);

const { data: profile, error: profileError } = await sb.from("profiles").select("id,name,role").eq("id", auth.user.id).single();
if (profileError || !profile || !["admin", "editor"].includes(profile.role)) throw new Error("Import user is not staff");

const { data: seamstresses, error: seamstressError } = await sb.from("profiles").select("id,name").eq("role", "seamstress").eq("active", true);
if (seamstressError) throw seamstressError;
const oksana = seamstresses?.find(item => item.name.toLowerCase().includes("оксан")) || seamstresses?.[0];
if (!oksana) throw new Error("Active seamstress not found");

const rows = [
  {
    number: "K-260728-01", createdAt: "2026-07-28T12:00:00+07:00",
    client: { name: "Алексей", phone: "89021400000", comment: "Отделочник", source: "Сарафан" },
    car: { brand: "Lexus", model: "GX 460", year: 2010, rows: 2 },
    kitTypes: ["full"], kitComment: "2 ряда полных", total: 11500, chinese: 6000, seamstress: 1000,
    paid: 0, paymentMethod: null, status: "completed", comment: "1000 Оксане",
  },
  {
    number: "K-260728-02", createdAt: "2026-07-28T12:10:00+07:00",
    client: { name: "Антон Наимов", phone: "телефон не указан · Антон Наимов", source: "Артём" },
    car: { brand: "Volkswagen", model: "Touareg", generation: "2006–2007", year: 2006, rows: 2 },
    kitTypes: ["full"], kitComment: "2 ряда полных", total: 8000, chinese: 6000, seamstress: 1000,
    paid: 8000, paymentMethod: "Наличные", status: "completed", comment: "1000 Оксане",
  },
  {
    number: "K-250730-01", createdAt: "2025-07-30T12:00:00+07:00",
    client: { name: "Василий", phone: "89237219811", source: "Авито" },
    car: { brand: "Infiniti", model: "M35", year: 2008, rows: 2 },
    kitTypes: ["full"], kitComment: "2 ряда полных", total: 12000, chinese: 6000, seamstress: 1000,
    paid: 12000, paymentMethod: "Наличные", status: "new", comment: "1000 Оксане",
  },
  {
    number: "K-250730-02", createdAt: "2025-07-30T12:10:00+07:00",
    client: { name: "Клиент 89059272222", phone: "89059272222" },
    car: { brand: "Changan", model: "Q05 II", generation: "Куань", year: 2026, rows: 2 },
    kitTypes: ["full"], kitComment: "2 ряда полных", total: 5000, chinese: 6000, seamstress: 0,
    paid: 5000, paymentMethod: "Наличные", status: "new", comment: "1000 Оксане",
  },
  {
    number: "K-250730-03", createdAt: "2025-07-30T12:20:00+07:00",
    client: { name: "Сергей", phone: "89609577160", source: "Авито" },
    car: { brand: "Без автомобиля", model: "—", comment: "Автомобиль не указан" },
    kitTypes: ["custom"], kitComment: "Подпятники 3 шт. (2 наши, 1 сшить клиента)", total: 2000, chinese: 500, seamstress: 500,
    paid: 2000, paymentMethod: "Наличные", status: "completed", comment: "Оксане 500",
  },
];

const { data: accountRows } = await sb.from("accounts").select("id,name,type").eq("active", true).order("sort_order");
const cashAccount = accountRows?.find(item => item.type === "cash" || item.name.toLowerCase().includes("касс")) || accountRows?.[0];
const { data: categoryRows } = await sb.from("categories").select("id,name").eq("type", "income").eq("active", true).order("sort_order");
const orderIncomeCategory = categoryRows?.find(item => item.name.toLowerCase().includes("оплата заказа")) || categoryRows?.[0];

const result = { inserted: [], skipped: [], errors: [] };

for (const row of rows) {
  try {
    const { data: existingOrder } = await sb.from("orders").select("id,number").eq("number", row.number).maybeSingle();
    if (existingOrder) { result.skipped.push(row.number); continue; }

    let { data: client } = await sb.from("clients").select("*").eq("phone", row.client.phone).maybeSingle();
    if (!client) {
      const created = await sb.from("clients").insert(row.client).select().single();
      if (created.error) throw created.error;
      client = created.data;
    }

    let { data: car } = await sb.from("cars").select("*").eq("client_id", client.id).eq("brand", row.car.brand).eq("model", row.car.model).maybeSingle();
    if (!car) {
      const created = await sb.from("cars").insert({ client_id: client.id, ...row.car }).select().single();
      if (created.error) throw created.error;
      car = created.data;
    }

    const orderInsert = await sb.from("orders").insert({
      number: row.number, client_id: client.id, car_id: car.id, status: row.status,
      kit_types: row.kitTypes, extras: row.kitComment, seamstress_comment: row.comment,
      photos: [], assignee_id: oksana.id, priority: "normal",
      total_price: row.total, prepayment: row.paid, paid: row.paid,
      seamstress_payment: row.seamstress, seamstress_payment_status: "planned",
      chinese_cost: row.chinese, material_cost: 0, other_costs: 0,
      created_by: profile.id, created_at: row.createdAt,
    }).select("id,number,planned_profit,remaining").single();
    if (orderInsert.error) throw orderInsert.error;

    if (row.paid > 0 && row.paymentMethod && cashAccount) {
      const transaction = await sb.from("transactions").insert({
        type: "income", amount: row.paid, category_id: orderIncomeCategory?.id || null,
        account_id: cashAccount.id, order_id: orderInsert.data.id, client_id: client.id,
        payment_type: "full", description: `${row.paymentMethod} · импорт из таблицы`,
        user_id: profile.id, user_name: profile.name, created_at: row.createdAt,
      });
      if (transaction.error) throw transaction.error;
      const balance = await sb.rpc("increment_balance", { acc_id: cashAccount.id, val: row.paid });
      if (balance.error) throw balance.error;
    }

    result.inserted.push({ number: row.number, id: orderInsert.data.id, profit: Number(orderInsert.data.planned_profit), remaining: Number(orderInsert.data.remaining) });
  } catch (error) {
    result.errors.push({ number: row.number, message: error?.message || String(error) });
  }
}

// Keep the imported client details exact even when a client already existed by phone.
for (const row of rows) {
  const clientUpdates = { name: row.client.name };
  if ("source" in row.client) clientUpdates.source = row.client.source || null;
  if ("comment" in row.client) clientUpdates.comment = row.client.comment || null;
  const synced = await sb.from("clients").update(clientUpdates).eq("phone", row.client.phone);
  if (synced.error) result.errors.push({ number: `${row.number}:client`, message: synced.error.message });
}

const verification = await sb.from("orders")
  .select("number,status,created_at,total_price,paid,remaining,seamstress_payment,chinese_cost,planned_profit,seamstress_comment,extras,clients(name,phone,source,comment),cars(brand,model,year,rows)")
  .in("number", rows.map(row => row.number))
  .order("number");
if (verification.error) result.errors.push({ number: "verification", message: verification.error.message });
await sb.auth.signOut();
console.log(JSON.stringify({ ...result, verified: verification.data || [] }, null, 2));
if (result.errors.length) process.exitCode = 1;
