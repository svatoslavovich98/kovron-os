"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type {
  User, Client, Car, Order, Transaction, Category,
  Account, OrderStatusConfig, AuditLogEntry, Notification,
  SeamstressPayment, TemplateItem, TemplatesByBrand, PeriodFilter, OrderStatus,
  TransactionType, KitType,
} from "./types";
import {
  demoUsers, demoStatuses, demoAccounts,
  demoExpenseCategories, demoIncomeCategories, demoClients,
  demoCars, demoOrders, demoTransactions, demoSeamstressPayments,
  demoAuditLog, demoNotifications, demoTemplates, kitLabels, materialColors,
  edgeColors, stitchColors, clientSources,
} from "./demo-data";
import { getSupabase, isSupabaseMode } from "./supabase";
import { useAuth } from "./auth-context";

const legacyStatusKeys = new Set([
  "pending_clarification", "pending_measurement", "measured", "pending_prepayment",
  "pending_production", "assigned", "paused", "pending_delivery", "delivered",
]);

export interface AdminMutationResult {
  success: boolean;
  error?: string;
}

export interface AdminUserInput {
  name: string;
  login: string;
  role: User["role"];
  active: boolean;
  password?: string;
}

export interface AdminStatusInput {
  key: string;
  label: string;
  color: string;
  isFinal: boolean;
  order: number;
}

export interface AdminCategoryInput {
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
  active: boolean;
  order: number;
  includeInProfit: boolean;
  canLinkOrder: boolean;
  requireComment: boolean;
  requireReceipt: boolean;
}

export interface AdminAccountInput {
  name: string;
  type: string;
  icon: string;
  active: boolean;
  showInTotal: boolean;
  order: number;
}

// ── Data shape ─────────────────────────────────────────
export interface AppData {
  users: User[];
  statuses: OrderStatusConfig[];
  accounts: Account[];
  expenseCategories: Category[];
  incomeCategories: Category[];
  clients: Client[];
  cars: Car[];
  orders: Order[];
  transactions: Transaction[];
  seamstressPayments: SeamstressPayment[];
  auditLog: AuditLogEntry[];
  notifications: Notification[];
  templates: TemplatesByBrand;
  loading: boolean;
  error: string | null;

  // Mutations
  createOrder: (order: Partial<Order>) => Promise<Order | null>;
  /**
   * Создаёт заказ и, если указана оплата, проводит её одной неделимой
   * серверной операцией: заказ + транзакция + баланс счёта + журнал.
   * Заказ не может остаться с оплатой без финансовой операции.
   */
  createOrderWithPayment: (
    order: Partial<Order>,
    payment?: { amount: number; accountId: string; method: string; comment?: string }
  ) => Promise<Order | null>;
  /**
   * Клиент + автомобиль + заказ + предоплата одним запросом к серверу.
   * Раньше это были три последовательных обращения — отсюда долгое
   * сохранение и «половинки» при обрыве связи.
   */
  /**
   * Сохраняет клиента, автомобиль и заказ одним запросом.
   * Возвращает обновлённый заказ — полная перезагрузка данных не нужна.
   */
  updateFullOrder: (input: {
    orderId: string;
    client?: { name: string; phone: string; phone2?: string; messenger?: string; comment?: string; source?: string };
    car?: { brand: string; model: string; generation?: string; year?: number; body?: string; plateNumber?: string; comment?: string };
    order?: Partial<Order>;
  }) => Promise<boolean>;
  createFullOrder: (input: {
    client: { id?: string; name: string; phone: string; phone2?: string; messenger?: string; comment?: string; source?: string };
    car: { id?: string; brand: string; model: string; generation?: string; year?: number; body?: string; plateNumber?: string; comment?: string };
    order: Partial<Order>;
    payment?: { amount: number; accountId: string; method: string };
  }) => Promise<{ id: string; number: string; clientId: string; carId: string } | null>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<boolean>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<boolean>;
  /** Удаляет ошибочно созданный заказ без оплат и сохраняет его копию в корзине. */
  deleteOrder: (id: string, reason: string) => Promise<{ ok: boolean; error?: string }>;
  createClient: (client: Partial<Client>) => Promise<Client | null>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<boolean>;
  createTransaction: (tx: Partial<Transaction>) => Promise<Transaction | null>;
  /** Удалить ошибочную операцию. Баланс и оплата заказа пересчитаются. */
  deleteTransaction: (id: string, reason?: string) => Promise<{ ok: boolean; error?: string }>;
  /** Изменить сумму, счёт, категорию или комментарий операции. */
  updateTransaction: (id: string, patch: {
    amount?: number; accountId?: string; categoryId?: string; description?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  createCar: (car: Partial<Car>) => Promise<Car | null>;
  updateCar: (id: string, updates: Partial<Car>) => Promise<boolean>;
  addTemplate: (tpl: TemplateItem) => Promise<boolean>;
  markNotificationRead: (id: string) => Promise<boolean>;
  markAllNotificationsRead: () => Promise<boolean>;
  receiveOrderPayment: (input: {
    orderId: string; amount: number; accountId: string; method: string;
    comment?: string; receiptPhoto?: string; markDelivered?: boolean;
  }) => Promise<boolean>;
  /**
   * Отмена заказа. Если по нему были получены деньги, они автоматически
   * возвращаются клиенту: создаётся расход в категории «Возвраты»,
   * касса уменьшается, полученное по заказу обнуляется.
   */
  /**
   * Полные фотографии заказа. В общий список они не входят —
   * тяжёлые снимки грузятся только когда открывают карточку.
   */
  loadOrderMedia: (orderId: string) => Promise<{ photos: string[]; layoutImage: string | null } | null>;
  cancelOrder: (orderId: string, options?: {
    accountId?: string;
    reason?: string;
    /** Что всё же выплачиваем, несмотря на отмену */
    keepSeamstress?: number;
    keepChinese?: number;
    keepMaterial?: number;
  }) => Promise<{ ok: boolean; refunded: number; error?: string }>;
  recordOrderAudit: (orderId: string, details: string) => Promise<void>;
  saveAdminUser: (id: string | null, input: AdminUserInput) => Promise<AdminMutationResult>;
  saveAdminStatus: (id: string | null, input: AdminStatusInput) => Promise<AdminMutationResult>;
  saveAdminCategory: (id: string | null, input: AdminCategoryInput) => Promise<AdminMutationResult>;
  saveAdminAccount: (id: string | null, input: AdminAccountInput) => Promise<AdminMutationResult>;
  refresh: () => Promise<void>;
}

const DataContext = createContext<AppData | null>(null);

const orderFieldLabels: Partial<Record<keyof Order, string>> = {
  clientId: "клиент", carId: "автомобиль", status: "статус", kitTypes: "комплект",
  assigneeId: "исполнитель", priority: "приоритет", desiredDate: "срок",
  totalPrice: "стоимость", prepayment: "предоплата", paid: "оплаченная сумма", remaining: "остаток долга",
  seamstressPayment: "оплата Оксане", chineseCost: "оплата китайцам",
  materialCost: "расходы на материалы", otherCosts: "прочие расходы",
  seamstressComment: "комментарий для Оксаны", layoutImage: "раскладка", photos: "фотографии",
};

function describeOrderUpdates(updates: Partial<Order>) {
  return Object.keys(updates).map(key => orderFieldLabels[key as keyof Order] || key).join(", ");
}

function mapClientRow(c: Record<string, any>): Client {
  return {
    id: c.id, name: c.name, phone: c.phone, phone2: c.phone2,
    messenger: c.messenger, comment: c.comment, source: c.source,
    createdAt: c.created_at,
  };
}

function mapCarRow(c: Record<string, any>): Car {
  return {
    id: c.id, clientId: c.client_id, brand: c.brand, model: c.model,
    generation: c.generation, year: c.year, body: c.body,
    trim: c.trim, rows: c.rows, plateNumber: c.plate_number,
    comment: c.comment,
  };
}

function mapOrderRow(o: Record<string, any>): Order {
  return {
    id: o.id, number: o.number, clientId: o.client_id, carId: o.car_id,
    status: o.status, kitTypes: o.kit_types || [],
    materialColor: o.material_color || "", bottomColor: o.bottom_color,
    edgeColor: o.edge_color || "", stitchColor: o.stitch_color || "",
    stitchType: o.stitch_type, logo: o.logo,
    heelPadPosition: o.heel_pad_position, extras: o.extras,
    seamstressComment: o.seamstress_comment,
    layoutImage: o.layout_image, photos: o.photos || [],
    assigneeId: o.assignee_id, priority: o.priority || "normal",
    createdById: o.created_by,
    createdAt: o.created_at, desiredDate: o.desired_date,
    deliveryDate: o.delivery_date,
    totalPrice: Number(o.total_price || 0),
    prepayment: Number(o.prepayment || 0),
    paid: Number(o.paid || 0),
    remaining: Number(o.remaining || 0),
    seamstressPayment: Number(o.seamstress_payment || 0),
    seamstressPaymentStatus: o.seamstress_payment_status || "planned",
    chineseCost: Number(o.chinese_cost || 0),
    materialCost: Number(o.material_cost || 0),
    otherCosts: Number(o.other_costs || 0),
    plannedProfit: Number(o.planned_profit || 0),
    statusHistory: (o.order_status_history || []).map((h: Record<string, any>) => ({
      id: h.id, userId: h.user_id, userName: h.user_name || "",
      oldStatus: h.old_status, newStatus: h.new_status,
      timestamp: h.created_at,
    })),
  } as Order;
}

const financeOutboxKey = "kovron_finance_outbox_v1";

function mapTransactionRow(t: Record<string, any>): Transaction {
  return {
    id: t.id, type: t.type, amount: Number(t.amount),
    categoryId: t.category_id ?? t.categoryId, accountId: t.account_id ?? t.accountId,
    toAccountId: t.to_account_id ?? t.toAccountId, orderId: t.order_id ?? t.orderId,
    clientId: t.client_id ?? t.clientId, paymentType: t.payment_type ?? t.paymentType,
    description: t.description, receiptPhoto: t.receipt_photo ?? t.receiptPhoto,
    userId: t.user_id ?? t.userId, userName: t.user_name ?? t.userName ?? "",
    createdAt: t.created_at ?? t.createdAt,
  } as Transaction;
}

/** Сколько держим неотправленную операцию, прежде чем считать её застрявшей. */
const OUTBOX_MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Очередь операций, которые не успели уйти на сервер.
 * Записи старше часа отбрасываем: за это время было много попыток,
 * и «вечная» запись начинает показываться рядом с настоящей операцией,
 * задваивая суммы на экране.
 */
function readFinanceOutbox(): Transaction[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(financeOutboxKey) || "[]");
    if (!Array.isArray(value)) return [];
    const now = Date.now();
    const fresh = (value as Transaction[]).filter(item => {
      const age = now - new Date(item.createdAt).getTime();
      return Number.isFinite(age) && age < OUTBOX_MAX_AGE_MS;
    });
    if (fresh.length !== value.length) writeFinanceOutbox(fresh);
    return fresh;
  } catch {
    return [];
  }
}

function writeFinanceOutbox(items: Transaction[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(financeOutboxKey, JSON.stringify(items));
  } catch {
    // Saving can still continue if local storage is unavailable.
  }
}

function transactionPayload(tx: Transaction) {
  return {
    id: tx.id,
    type: tx.type, amount: tx.amount, category_id: tx.categoryId,
    account_id: tx.accountId, to_account_id: tx.toAccountId,
    order_id: tx.orderId, client_id: tx.clientId,
    payment_type: tx.paymentType, description: tx.description,
    receipt_photo: tx.receiptPhoto,
    user_id: tx.userId, user_name: tx.userName,
    created_at: tx.createdAt,
  };
}

function applyLedgerBalances(accounts: Account[], transactions: Transaction[]) {
  return accounts.map(account => {
    const balance = transactions.reduce((sum, tx) => {
      if (tx.type === "income" && tx.accountId === account.id) return sum + tx.amount;
      if (tx.type === "expense" && tx.accountId === account.id) return sum - tx.amount;
      if (tx.type === "transfer" && tx.accountId === account.id) return sum - tx.amount;
      if (tx.type === "transfer" && tx.toAccountId === account.id) return sum + tx.amount;
      return sum;
    }, account.initialBalance);
    return { ...account, balance };
  });
}

function getAdminErrorMessage(error: { message?: string; details?: string } | null) {
  const message = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  if (message.includes("duplicate") || message.includes("unique")) return "Такой логин или системный ключ уже используется";
  if (message.includes("admin_save_user") || message.includes("function") && message.includes("does not exist")) return "Функции управления пользователями ещё не установлены в Supabase";
  if (message.includes("permission") || message.includes("недостаточно прав")) return "Недостаточно прав для этого изменения";
  return error?.message || "Не удалось сохранить изменения";
}

// ── Period filter helper ───────────────────────────────
function isInPeriod(dateStr: string, period: PeriodFilter): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  switch (period.type) {
    case "today": return d.toDateString() === now.toDateString();
    case "week": { const w = new Date(now); w.setDate(w.getDate() - 7); return d >= w && d <= now; }
    case "month": return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    case "year": return d.getFullYear() === now.getFullYear();
    case "custom": {
      if (period.from && period.to) return d >= new Date(period.from) && d <= new Date(period.to);
      return true;
    }
    default: return true;
  }
}

// ── Demo data provider ─────────────────────────────────
function useDemoData(): AppData {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([...demoOrders]);
  const [clients, setClients] = useState<Client[]>([...demoClients]);
  const [cars, setCars] = useState<Car[]>([...demoCars]);
  const [transactions, setTransactions] = useState<Transaction[]>([...demoTransactions]);
  const [users, setUsers] = useState<User[]>([...demoUsers]);
  const [statuses, setStatuses] = useState<OrderStatusConfig[]>(demoStatuses.filter(item => !legacyStatusKeys.has(item.key)));
  const [accounts, setAccounts] = useState<Account[]>([...demoAccounts]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([...demoExpenseCategories]);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([...demoIncomeCategories]);
  const [notifications, setNotifications] = useState<Notification[]>([...demoNotifications]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([...demoAuditLog]);
  const [templates, setTemplates] = useState<TemplatesByBrand>({ ...demoTemplates });

  const createOrder = useCallback(async (o: Partial<Order>) => {
    const order = {
      ...o,
      id: `order_${Date.now()}`,
      number: `${new Date().getDate().toString().padStart(2,"0")}${(new Date().getMonth()+1).toString().padStart(2,"0")}-${Math.floor(Math.random()*900)+100}`,
      status: "new" as OrderStatus,
      priority: o.priority || "normal",
      createdById: o.createdById || user?.id,
      createdAt: new Date().toISOString(),
      paid: o.prepayment || 0,
      remaining: (o.totalPrice || 0) - (o.prepayment || 0),
      chineseCost: o.chineseCost || 0,
      plannedProfit: (o.totalPrice || 0) - (o.materialCost || 0) - (o.otherCosts || 0) - (o.seamstressPayment || 0) - (o.chineseCost || 0),
      statusHistory: [],
      photos: o.photos || [],
      kitTypes: o.kitTypes || [],
    } as Order;
    setOrders(prev => [order, ...prev]);
    return order;
  }, [user]);

  // Демо-режим: та же логика, но без сервера — оплата всегда создаёт операцию
  const createOrderWithPayment = useCallback(async (
    o: Partial<Order>,
    payment?: { amount: number; accountId: string; method: string; comment?: string }
  ) => {
    const amount = payment?.amount || 0;
    const order = {
      ...o,
      id: o.id || `order_${Date.now()}`,
      number: o.number || `${new Date().getDate().toString().padStart(2,"0")}${(new Date().getMonth()+1).toString().padStart(2,"0")}-${Math.floor(Math.random()*900)+100}`,
      status: "new" as OrderStatus,
      priority: o.priority || "normal",
      createdById: o.createdById || user?.id,
      createdAt: new Date().toISOString(),
      paid: amount,
      remaining: (o.totalPrice || 0) - amount,
      chineseCost: o.chineseCost || 0,
      plannedProfit: (o.totalPrice || 0) - (o.materialCost || 0) - (o.otherCosts || 0) - (o.seamstressPayment || 0) - (o.chineseCost || 0),
      statusHistory: [],
      photos: o.photos || [],
      kitTypes: o.kitTypes || [],
    } as Order;
    setOrders(prev => [order, ...prev]);

    if (amount > 0 && payment) {
      setTransactions(prev => [{
        id: `tx_${Date.now()}`,
        type: "income",
        amount,
        accountId: payment.accountId,
        orderId: order.id,
        clientId: order.clientId,
        paymentType: amount >= (o.totalPrice || 0) ? "full" : "prepayment",
        description: `${payment.method}${payment.comment ? ` · ${payment.comment}` : ""}`,
        userId: user?.id || "",
        userName: user?.name || "",
        createdAt: new Date().toISOString(),
      } as Transaction, ...prev]);
    }
    return order;
  }, [user]);

  const createFullOrder = useCallback(async (input: {
    client: { id?: string; name: string; phone: string; phone2?: string; messenger?: string; comment?: string; source?: string };
    car: { id?: string; brand: string; model: string; generation?: string; year?: number; body?: string; plateNumber?: string; comment?: string };
    order: Partial<Order>;
    payment?: { amount: number; accountId: string; method: string };
  }) => {
    const clientId = input.client.id || `client_${Date.now()}`;
    const carId = input.car.id || `car_${Date.now()}`;
    const orderId = input.order.id || `order_${Date.now()}`;
    const number = input.order.number
      || `${new Date().getDate().toString().padStart(2,"0")}${(new Date().getMonth()+1).toString().padStart(2,"0")}-${Math.floor(Math.random()*900)+100}`;
    const amount = input.payment?.amount || 0;

    if (!input.client.id) {
      setClients(prev => [{ ...input.client, id: clientId, createdAt: new Date().toISOString() } as Client, ...prev]);
    }
    if (!input.car.id) {
      setCars(prev => [{ ...input.car, id: carId, clientId } as Car, ...prev]);
    }
    const total = input.order.totalPrice || 0;
    setOrders(prev => [{
      ...input.order,
      id: orderId, number, clientId, carId,
      status: "new" as OrderStatus,
      priority: input.order.priority || "normal",
      createdById: user?.id,
      createdAt: new Date().toISOString(),
      paid: amount,
      remaining: total - amount,
      chineseCost: input.order.chineseCost || 0,
      plannedProfit: total - (input.order.materialCost || 0) - (input.order.otherCosts || 0)
        - (input.order.seamstressPayment || 0) - (input.order.chineseCost || 0),
      statusHistory: [], photos: input.order.photos || [], kitTypes: input.order.kitTypes || [],
    } as Order, ...prev]);

    if (amount > 0 && input.payment) {
      setTransactions(prev => [{
        id: `tx_${Date.now()}`, type: "income", amount,
        accountId: input.payment!.accountId, orderId, clientId,
        paymentType: amount >= total ? "full" : "prepayment",
        description: `${input.payment!.method} · Предоплата при создании заказа`,
        userId: user?.id || "", userName: user?.name || "",
        createdAt: new Date().toISOString(),
      } as Transaction, ...prev]);
    }
    return { id: orderId, number, clientId, carId };
  }, [user]);

  // Демо-режим: то же самое, но локально
  const updateFullOrder = useCallback(async (input: {
    orderId: string;
    client?: { name: string; phone: string; phone2?: string; messenger?: string; comment?: string; source?: string };
    car?: { brand: string; model: string; generation?: string; year?: number; body?: string; plateNumber?: string; comment?: string };
    order?: Partial<Order>;
  }) => {
    if (input.order) {
      setOrders(prev => prev.map(o => o.id === input.orderId ? { ...o, ...input.order } : o));
    }
    if (input.client) {
      setClients(prev => prev.map(c => c.id === input.orderId ? c : c));
    }
    return true;
  }, []);

  const updateOrder = useCallback(async (id: string, updates: Partial<Order>) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    if (user) {
      setAuditLog(prev => [{
        id: `audit_${Date.now()}`,
        userId: user.id,
        userName: user.name,
        action: "order_updated",
        details: `Изменены: ${describeOrderUpdates(updates)}`,
        entityType: "order",
        entityId: id,
        timestamp: new Date().toISOString(),
      }, ...prev]);
    }
    return true;
  }, [user]);

  // Демо-режим: удаление и правка операций локально
  const deleteTransaction = useCallback(async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    return { ok: true };
  }, []);

  const updateTransaction = useCallback(async (id: string, patch: {
    amount?: number; accountId?: string; categoryId?: string; description?: string;
  }) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    return { ok: true };
  }, []);

  // Демо-режим: фото уже лежат в самом заказе
  const loadOrderMedia = useCallback(async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return null;
    return { photos: order.photos || [], layoutImage: order.layoutImage ?? null };
  }, [orders]);

  // Демо-режим: возврат клиенту, выплаты подрядчикам — по выбору
  const cancelOrder = useCallback(async (orderId: string, options?: {
    accountId?: string; reason?: string;
    keepSeamstress?: number; keepChinese?: number; keepMaterial?: number;
  }) => {
    let refunded = 0;
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      refunded = o.paid;
      return {
        ...o,
        status: "cancelled" as OrderStatus,
        paid: 0,
        remaining: o.totalPrice,
        seamstressPayment: Math.min(options?.keepSeamstress || 0, o.seamstressPayment),
        chineseCost: Math.min(options?.keepChinese || 0, o.chineseCost || 0),
        materialCost: Math.min(options?.keepMaterial || 0, o.materialCost),
      };
    }));
    return { ok: true, refunded };
  }, []);

  const updateOrderStatus = useCallback(async (id: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    return true;
  }, []);

  const deleteOrder = useCallback(async (id: string, reason: string) => {
    const order = orders.find(item => item.id === id);
    if (!order) return { ok: false, error: "Заказ не найден" };
    if (order.paid > 0 || transactions.some(item => item.orderId === id)) {
      return { ok: false, error: "У заказа есть финансовые операции. Сначала оформите возврат или удалите ошибочную оплату." };
    }
    setOrders(prev => prev.filter(item => item.id !== id));
    if (user) {
      setAuditLog(prev => [{
        id: `audit_${Date.now()}`, userId: user.id, userName: user.name,
        action: "order_deleted", details: `Удалён заказ №${order.number}. Причина: ${reason}`,
        entityType: "order", entityId: id, timestamp: new Date().toISOString(),
      }, ...prev]);
    }
    return { ok: true };
  }, [orders, transactions, user]);

  const createClient = useCallback(async (c: Partial<Client>) => {
    const client = { ...c, id: `client_${Date.now()}`, createdAt: new Date().toISOString() } as Client;
    setClients(prev => [client, ...prev]);
    return client;
  }, []);

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    return true;
  }, []);

  const createTransaction = useCallback(async (tx: Partial<Transaction>) => {
    const t = { ...tx, id: `tx_${Date.now()}`, createdAt: new Date().toISOString() } as Transaction;
    setTransactions(prev => [t, ...prev]);
    return t;
  }, []);

  const createCar = useCallback(async (c: Partial<Car>) => {
    const car = { ...c, id: `car_${Date.now()}` } as Car;
    setCars(prev => [car, ...prev]);
    return car;
  }, []);

  const updateCar = useCallback(async (id: string, updates: Partial<Car>) => {
    setCars(prev => prev.map(car => car.id === id ? { ...car, ...updates } : car));
    return true;
  }, []);

  const addTemplate = useCallback(async (tpl: TemplateItem) => {
    setTemplates(prev => {
      const next = { ...prev };
      if (!next[tpl.brand]) next[tpl.brand] = [];
      next[tpl.brand] = [...next[tpl.brand], tpl];
      return next;
    });
    return true;
  }, []);

  const refresh = useCallback(async () => {}, []);
  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    return true;
  }, []);
  const markAllNotificationsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    return true;
  }, []);
  const receiveOrderPayment = useCallback(async (input: {
    orderId: string; amount: number; accountId: string; method: string;
    comment?: string; receiptPhoto?: string; markDelivered?: boolean;
  }) => {
    const order = orders.find(item => item.id === input.orderId);
    if (!order || input.amount <= 0 || input.amount > order.remaining) return false;
    const paid = order.paid + input.amount;
    const status: OrderStatus = input.markDelivered && paid >= order.totalPrice ? "completed" : order.status;
    setOrders(prev => prev.map(item => item.id === order.id ? { ...item, paid, remaining: item.totalPrice - paid, status } : item));
    setAccounts(prev => prev.map(item => item.id === input.accountId ? { ...item, balance: item.balance + input.amount } : item));
    setTransactions(prev => [{
      id: `tx_${Date.now()}`, type: "income", amount: input.amount, accountId: input.accountId,
      orderId: order.id, clientId: order.clientId, paymentType: "additional",
      description: `${input.method}${input.comment ? ` · ${input.comment}` : ""}`,
      receiptPhoto: input.receiptPhoto, userId: user?.id || "", userName: user?.name || "",
      createdAt: new Date().toISOString(),
    }, ...prev] as Transaction[]);
    return true;
  }, [orders, user]);
  const recordOrderAudit = useCallback(async (orderId: string, details: string) => {
    if (!user) return;
    setAuditLog(prev => [{ id: `audit_${Date.now()}`, userId: user.id, userName: user.name, action: "order_updated", details, entityType: "order", entityId: orderId, timestamp: new Date().toISOString() }, ...prev]);
  }, [user]);

  const saveAdminUser = useCallback(async (id: string | null, input: AdminUserInput): Promise<AdminMutationResult> => {
    const nextUser: User = {
      id: id || `user_${Date.now()}`,
      name: input.name,
      login: input.login,
      role: input.role,
      active: input.active,
      createdAt: users.find(item => item.id === id)?.createdAt || new Date().toISOString(),
      lastLogin: users.find(item => item.id === id)?.lastLogin,
    };
    setUsers(prev => id ? prev.map(item => item.id === id ? nextUser : item) : [...prev, nextUser]);
    return { success: true };
  }, [users]);

  const saveAdminStatus = useCallback(async (id: string | null, input: AdminStatusInput): Promise<AdminMutationResult> => {
    const nextStatus: OrderStatusConfig = { id: id || `status_${Date.now()}`, key: input.key as OrderStatus, label: input.label, color: input.color, isFinal: input.isFinal, order: input.order };
    setStatuses(prev => (id ? prev.map(item => item.id === id ? nextStatus : item) : [...prev, nextStatus]).sort((a, b) => a.order - b.order));
    return { success: true };
  }, []);

  const saveAdminCategory = useCallback(async (id: string | null, input: AdminCategoryInput): Promise<AdminMutationResult> => {
    const nextCategory: Category = { id: id || `category_${Date.now()}`, ...input };
    const setter = input.type === "expense" ? setExpenseCategories : setIncomeCategories;
    setter(prev => (id ? prev.map(item => item.id === id ? nextCategory : item) : [...prev, nextCategory]).sort((a, b) => a.order - b.order));
    return { success: true };
  }, []);

  const saveAdminAccount = useCallback(async (id: string | null, input: AdminAccountInput): Promise<AdminMutationResult> => {
    const previous = accounts.find(item => item.id === id);
    const nextAccount: Account = {
      id: id || `account_${Date.now()}`,
      ...input,
      balance: previous?.balance || 0,
      initialBalance: previous?.initialBalance || 0,
    };
    setAccounts(prev => (id ? prev.map(item => item.id === id ? nextAccount : item) : [...prev, nextAccount]).sort((a, b) => a.order - b.order));
    return { success: true };
  }, [accounts]);

  return {
    users,
    statuses,
    accounts,
    expenseCategories,
    incomeCategories,
    clients,
    cars,
    orders,
    transactions,
    seamstressPayments: demoSeamstressPayments,
    auditLog,
    notifications,
    templates,
    loading: false,
    error: null,
    createOrder, createOrderWithPayment, createFullOrder, updateFullOrder,
    updateOrder, updateOrderStatus, deleteOrder,
    createClient, updateClient, createTransaction,
    deleteTransaction, updateTransaction, loadOrderMedia,
    createCar, updateCar, addTemplate, refresh,
    markNotificationRead, markAllNotificationsRead,
    receiveOrderPayment, cancelOrder,
    recordOrderAudit,
    saveAdminUser, saveAdminStatus, saveAdminCategory, saveAdminAccount,
  };
}

// ── Supabase data provider ─────────────────────────────
function useSupabaseData(): AppData {
  const { user } = useAuth();
  const [data, setData] = useState<{
    users: User[];
    statuses: OrderStatusConfig[];
    accounts: Account[];
    expenseCategories: Category[];
    incomeCategories: Category[];
    clients: Client[];
    cars: Car[];
    orders: Order[];
    transactions: Transaction[];
    seamstressPayments: SeamstressPayment[];
    auditLog: AuditLogEntry[];
    notifications: Notification[];
    templates: TemplatesByBrand;
  }>({
    users: [], statuses: [], accounts: [],
    expenseCategories: [], incomeCategories: [],
    clients: [], cars: [], orders: [],
    transactions: [], seamstressPayments: [],
    auditLog: [], notifications: [], templates: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const syncingCoreData = useRef(false);

  const fetchAll = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) { setLoading(false); return; }
    setLoading(true);

    try {
      const [
        { data: profiles },
        { data: statuses },
        { data: accounts },
        { data: categories },
        { data: clients },
        { data: cars },
        { data: rawOrders },
        { data: transactions },
        { data: seamstressPayments },
        { data: auditLog },
        { data: notifications },
      ] = await (async (): Promise<{ data: any[] }[]> => {
        // Один запрос вместо одиннадцати. При удалённой базе каждое
        // обращение стоит сотни миллисекунд, поэтому важно не количество
        // данных, а количество поездок до сервера.
        const { data: bundle, error: bundleError } = await sb.rpc("get_app_data");
        if (bundleError) throw new Error(bundleError.message);
        const b = (bundle || {}) as Record<string, any[]>;
        return [
          { data: b.profiles || [] },
          { data: b.statuses || [] },
          { data: b.accounts || [] },
          { data: b.categories || [] },
          { data: b.clients || [] },
          { data: b.cars || [] },
          { data: b.orders || [] },
          { data: b.transactions || [] },
          { data: b.seamstress_payments || [] },
          { data: b.audit_log || [] },
          { data: b.notifications || [] },
        ];
      })();

      const remoteTransactions = (transactions || []).map(mapTransactionRow);
      const remoteTransactionIds = new Set(remoteTransactions.map(item => item.id));
      const pendingTransactions = readFinanceOutbox().filter(item => !remoteTransactionIds.has(item.id));
      const allTransactions = [...pendingTransactions, ...remoteTransactions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const rawAccounts: Account[] = (accounts || []).map(a => ({
        id: a.id, name: a.name, type: a.type, icon: a.icon || "💳",
        balance: Number(a.balance), initialBalance: Number(a.initial_balance),
        active: a.active, showInTotal: a.show_in_total, order: a.sort_order,
      }));

      setData({
        users: (profiles || []).map(p => ({
          id: p.id, name: p.name, login: p.login, role: p.role,
          active: p.active, avatar: p.avatar_url, lastLogin: p.last_login,
          createdAt: p.created_at,
        })),
        // Источник правды — флаг active в базе, а не список ключей в коде.
        // Так статусы, добавленные через админку, сразу видны, а отключённые
        // не всплывают в канбане и фильтрах.
        statuses: (statuses || [])
          .filter(s => s.active !== false)
          .map(s => ({
            id: s.id, key: s.key, label: s.label, color: s.color,
            isFinal: s.is_final, order: s.sort_order,
          })),
        accounts: applyLedgerBalances(rawAccounts, allTransactions),
        expenseCategories: (categories || []).filter(c => c.type === "expense").map(c => ({
          id: c.id, name: c.name, type: c.type as "expense", icon: c.icon || "📦",
          color: c.color || "#9CA39A", active: c.active, order: c.sort_order,
          includeInProfit: c.include_in_profit ?? true,
          canLinkOrder: c.can_link_order ?? false,
          requireComment: c.require_comment ?? false,
          requireReceipt: c.require_receipt ?? false,
        })),
        incomeCategories: (categories || []).filter(c => c.type === "income").map(c => ({
          id: c.id, name: c.name, type: c.type as "income", icon: c.icon || "💰",
          color: c.color || "#ADD256", active: c.active, order: c.sort_order,
          includeInProfit: c.include_in_profit ?? true,
          canLinkOrder: c.can_link_order ?? false,
          requireComment: c.require_comment ?? false,
          requireReceipt: c.require_receipt ?? false,
        })),
        clients: (clients || []).map(mapClientRow),
        cars: (cars || []).map(mapCarRow),
        orders: (rawOrders || []).map(mapOrderRow),
        transactions: allTransactions,
        seamstressPayments: (seamstressPayments || []).map(sp => ({
          id: sp.id, orderId: sp.order_id, amount: Number(sp.amount),
          status: sp.status, paidAt: sp.paid_at, paidBy: sp.paid_by,
          accountId: sp.account_id, comment: sp.comment,
        })),
        auditLog: (auditLog || []).map(a => ({
          id: a.id, userId: a.user_id, userName: a.user_name || "",
          action: a.action, details: a.details,
          entityType: a.entity_type, entityId: a.entity_id,
          timestamp: a.created_at,
        })),
        notifications: (notifications || []).map(n => ({
          id: n.id, type: n.type || "info", title: n.title,
          message: n.message, read: n.read, userId: n.user_id,
          createdAt: n.created_at, orderId: n.order_id,
        })),
        // The real 5,723-item catalog is hosted separately and loaded only on /templates.
        // Keeping it out of the global provider avoids downloading it on every page.
        templates: {},
      });

      setError(null);
    } catch (err: any) {
      setError(err.message || "Ошибка загрузки данных");
      console.error("Data fetch error:", err);
    }

    setLoading(false);
  }, [user]);

  const syncCoreData = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user || syncingCoreData.current) return;
    syncingCoreData.current = true;
    try {
      // Фоновая синхронизация тоже одним запросом
      const { data: bundle, error: bundleError } = await sb.rpc("get_app_data");
      if (bundleError) throw bundleError;
      const b = bundle || {};
      const remoteTransactions = (b.transactions || []).map(mapTransactionRow);
      const remoteIds = new Set(remoteTransactions.map((t: Transaction) => t.id));
      const pending = readFinanceOutbox().filter(item => !remoteIds.has(item.id));
      const allTransactions = [...pending, ...remoteTransactions]
        .sort((a, b2) => new Date(b2.createdAt).getTime() - new Date(a.createdAt).getTime());

      setData(prev => ({
        ...prev,
        clients: (b.clients || []).map(mapClientRow),
        cars: (b.cars || []).map(mapCarRow),
        orders: (b.orders || []).map(mapOrderRow),
        transactions: allTransactions,
        accounts: applyLedgerBalances(
          (b.accounts || []).map((a: any) => ({
            id: a.id, name: a.name, type: a.type, icon: a.icon || "💳",
            balance: Number(a.balance), initialBalance: Number(a.initial_balance),
            active: a.active, showInTotal: a.show_in_total, order: a.sort_order,
          })),
          allTransactions
        ),
      }));
      setError(null);
    } catch (syncError) {
      console.error("Background data sync error:", syncError);
    } finally {
      syncingCoreData.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  useEffect(() => {
    if (!user) return;
    const sb = getSupabase();
    let debounceTimer: number | undefined;
    const scheduleSync = () => {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => void syncCoreData(), 350);
    };
    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") scheduleSync();
    };

    window.addEventListener("focus", scheduleSync);
    window.addEventListener("online", scheduleSync);
    document.addEventListener("visibilitychange", syncWhenVisible);
    const interval = window.setInterval(syncWhenVisible, 30000);
    const channel = sb?.channel(`kovron-core-sync-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, scheduleSync)
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, scheduleSync)
      .on("postgres_changes", { event: "*", schema: "public", table: "cars" }, scheduleSync)
      .subscribe();

    return () => {
      window.clearTimeout(debounceTimer);
      window.clearInterval(interval);
      window.removeEventListener("focus", scheduleSync);
      window.removeEventListener("online", scheduleSync);
      document.removeEventListener("visibilitychange", syncWhenVisible);
      if (channel && sb) void sb.removeChannel(channel);
    };
  }, [user, syncCoreData]);

  // ── Mutations ──────────────────────────────────────────
  const createOrder = useCallback(async (o: Partial<Order>): Promise<Order | null> => {
    const sb = getSupabase();
    if (!sb) return null;

    const num = o.number?.trim() || `${new Date().getDate().toString().padStart(2,"0")}${(new Date().getMonth()+1).toString().padStart(2,"0")}-${Math.floor(Math.random()*900)+100}`;
    const orderId = o.id || crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const initialStatus: OrderStatus = "new";

    const { error } = await sb.from("orders").insert({
      id: orderId,
      number: num,
      client_id: o.clientId,
      car_id: o.carId,
      status: initialStatus,
      kit_types: o.kitTypes || [],
      material_color: o.materialColor || "",
      bottom_color: o.bottomColor,
      edge_color: o.edgeColor || "",
      stitch_color: o.stitchColor || "",
      stitch_type: o.stitchType,
      extras: o.extras,
      seamstress_comment: o.seamstressComment,
      layout_image: o.layoutImage || null,
      photos: o.photos || [],
      assignee_id: o.assigneeId || null,
      priority: o.priority || "normal",
      desired_date: o.desiredDate || null,
      total_price: o.totalPrice || 0,
      prepayment: o.prepayment || 0,
      paid: o.prepayment || 0,
      seamstress_payment: o.seamstressPayment || 0,
      seamstress_payment_status: "planned",
      chinese_cost: o.chineseCost || 0,
      material_cost: o.materialCost || 0,
      other_costs: o.otherCosts || 0,
      created_by: user?.id || null,
    });

    if (error) {
      if (error.code === "23505") {
        const { data: existing } = await sb.from("orders").select("*").eq("number", num).maybeSingle();
        if (existing) return mapOrderRow({ ...existing, order_status_history: [] });
      }
      console.error("Create order error:", error);
      throw new Error(error.message || "Не удалось создать заказ");
    }
    const order: Order = {
      ...o,
      id: orderId,
      number: num,
      clientId: o.clientId!,
      carId: o.carId!,
      status: initialStatus,
      kitTypes: o.kitTypes || [],
      materialColor: o.materialColor || "",
      edgeColor: o.edgeColor || "",
      stitchColor: o.stitchColor || "",
      photos: o.photos || [],
      priority: o.priority || "normal",
      createdById: user?.id,
      createdAt,
      totalPrice: Number(o.totalPrice || 0),
      prepayment: Number(o.prepayment || 0),
      paid: Number(o.prepayment || 0),
      remaining: Number(o.totalPrice || 0) - Number(o.prepayment || 0),
      seamstressPayment: Number(o.seamstressPayment || 0),
      seamstressPaymentStatus: "planned",
      chineseCost: Number(o.chineseCost || 0),
      materialCost: Number(o.materialCost || 0),
      otherCosts: Number(o.otherCosts || 0),
      plannedProfit: Number(o.totalPrice || 0) - Number(o.seamstressPayment || 0) - Number(o.chineseCost || 0) - Number(o.materialCost || 0) - Number(o.otherCosts || 0),
      statusHistory: [],
    } as Order;
    setData(prev => ({ ...prev, orders: [order, ...prev.orders] }));
    return order;
  }, [user]);

  const createOrderWithPayment = useCallback(async (
    o: Partial<Order>,
    payment?: { amount: number; accountId: string; method: string; comment?: string }
  ): Promise<Order | null> => {
    const sb = getSupabase();
    if (!sb) return null;

    const orderId = o.id || crypto.randomUUID();

    const { data: result, error } = await sb.rpc("create_order_with_payment", {
      p_order: {
        id: orderId,
        number: o.number?.trim() || null,
        client_id: o.clientId,
        car_id: o.carId,
        status: "new",
        kit_types: o.kitTypes || [],
        material_color: o.materialColor || "",
        bottom_color: o.bottomColor || null,
        edge_color: o.edgeColor || "",
        stitch_color: o.stitchColor || "",
        stitch_type: o.stitchType || null,
        extras: o.extras || null,
        seamstress_comment: o.seamstressComment || null,
        layout_image: o.layoutImage || null,
        photos: o.photos || [],
        assignee_id: o.assigneeId || null,
        priority: o.priority || "normal",
        desired_date: o.desiredDate || null,
        total_price: o.totalPrice || 0,
        prepayment: o.prepayment || 0,
        seamstress_payment: o.seamstressPayment || 0,
        chinese_cost: o.chineseCost || 0,
        material_cost: o.materialCost || 0,
        other_costs: o.otherCosts || 0,
      },
      p_amount: payment?.amount || 0,
      p_account_id: payment?.accountId || null,
      p_method: payment?.method || null,
      p_comment: payment?.comment || null,
    });

    if (error) {
      console.error("Create order with payment error:", error);
      throw new Error(error.message || "Не удалось создать заказ");
    }

    // Перечитываем данные с сервера — там уже посчитаны paid, remaining
    // и плановая прибыль, поэтому локально их не дублируем.
    await fetchAll();

    const paid = Number(result?.paid ?? 0);
    return {
      ...o,
      id: result?.id || orderId,
      number: result?.number || o.number,
      status: "new" as OrderStatus,
      paid,
      remaining: Number(o.totalPrice || 0) - paid,
      photos: o.photos || [],
      kitTypes: o.kitTypes || [],
      statusHistory: [],
    } as Order;
  }, [fetchAll]);

  const createFullOrder = useCallback(async (input: {
    client: { id?: string; name: string; phone: string; phone2?: string; messenger?: string; comment?: string; source?: string };
    car: { id?: string; brand: string; model: string; generation?: string; year?: number; body?: string; plateNumber?: string; comment?: string };
    order: Partial<Order>;
    payment?: { amount: number; accountId: string; method: string };
  }) => {
    const sb = getSupabase();
    if (!sb) return null;
    const o = input.order;

    const { data: result, error } = await sb.rpc("create_full_order", {
      p_client: {
        id: input.client.id || null,
        name: input.client.name,
        phone: input.client.phone,
        phone2: input.client.phone2 || null,
        messenger: input.client.messenger || null,
        comment: input.client.comment || null,
        source: input.client.source || null,
      },
      p_car: {
        id: input.car.id || null,
        brand: input.car.brand,
        model: input.car.model,
        generation: input.car.generation || null,
        year: input.car.year ? String(input.car.year) : null,
        body: input.car.body || null,
        plate_number: input.car.plateNumber || null,
        comment: input.car.comment || null,
      },
      p_order: {
        id: o.id || null,
        number: o.number || null,
        status: "new",
        kit_types: o.kitTypes || [],
        material_color: o.materialColor || "",
        edge_color: o.edgeColor || "",
        stitch_color: o.stitchColor || "",
        seamstress_comment: o.seamstressComment || null,
        layout_image: o.layoutImage || null,
        photos: o.photos || [],
        assignee_id: o.assigneeId || null,
        priority: o.priority || "normal",
        desired_date: o.desiredDate || null,
        total_price: o.totalPrice || 0,
        seamstress_payment: o.seamstressPayment || 0,
        chinese_cost: o.chineseCost || 0,
        material_cost: o.materialCost || 0,
        other_costs: o.otherCosts || 0,
      },
      p_amount: input.payment?.amount || 0,
      p_account_id: input.payment?.accountId || null,
      p_method: input.payment?.method || null,
    });

    if (error) {
      console.error("create_full_order error:", error);
      throw new Error(error.message || "Не удалось сохранить заказ");
    }

    // Данные подтягиваем в фоне — пользователь не ждёт полной перезагрузки
    void fetchAll();

    return {
      id: result.id as string,
      number: result.number as string,
      clientId: result.client_id as string,
      carId: result.car_id as string,
    };
  }, [fetchAll]);

  const updateOrder = useCallback(async (id: string, updates: Partial<Order>): Promise<boolean> => {
    const sb = getSupabase();
    if (!sb) return false;

    const previous = data.orders.find(o => o.id === id);
    const effectiveUpdates = updates;
    const dbUpdates: Record<string, any> = {};
    if (effectiveUpdates.status !== undefined) dbUpdates.status = effectiveUpdates.status;
    if (updates.totalPrice !== undefined) dbUpdates.total_price = updates.totalPrice;
    if (updates.prepayment !== undefined) dbUpdates.prepayment = updates.prepayment;
    if (updates.paid !== undefined) dbUpdates.paid = updates.paid;
    if (updates.assigneeId !== undefined) dbUpdates.assignee_id = updates.assigneeId;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.desiredDate !== undefined) dbUpdates.desired_date = updates.desiredDate;
    if (updates.deliveryDate !== undefined) dbUpdates.delivery_date = updates.deliveryDate;
    if (updates.seamstressPayment !== undefined) dbUpdates.seamstress_payment = updates.seamstressPayment;
    if (updates.seamstressPaymentStatus !== undefined) dbUpdates.seamstress_payment_status = updates.seamstressPaymentStatus;
    if (updates.chineseCost !== undefined) dbUpdates.chinese_cost = updates.chineseCost;
    if (updates.materialCost !== undefined) dbUpdates.material_cost = updates.materialCost;
    if (updates.otherCosts !== undefined) dbUpdates.other_costs = updates.otherCosts;
    if (updates.seamstressComment !== undefined) dbUpdates.seamstress_comment = updates.seamstressComment;
    if (updates.layoutImage !== undefined) dbUpdates.layout_image = updates.layoutImage || null;
    if (updates.photos !== undefined) dbUpdates.photos = updates.photos;
    if (updates.kitTypes !== undefined) dbUpdates.kit_types = updates.kitTypes;
    if (updates.materialColor !== undefined) dbUpdates.material_color = updates.materialColor;
    if (updates.edgeColor !== undefined) dbUpdates.edge_color = updates.edgeColor;
    if (updates.stitchColor !== undefined) dbUpdates.stitch_color = updates.stitchColor;
    if (updates.extras !== undefined) dbUpdates.extras = updates.extras;

    setData(prev => ({ ...prev, orders: prev.orders.map(o => o.id === id ? { ...o, ...effectiveUpdates } : o) }));
    const { error } = await sb.from("orders").update(dbUpdates).eq("id", id);
    if (error) {
      console.error("Update order error:", error);
      if (previous) setData(prev => ({ ...prev, orders: prev.orders.map(o => o.id === id ? previous : o) }));
      return false;
    }
    if (user) {
      const details = `Изменены: ${describeOrderUpdates(updates)}`;
      const { data: audit } = await sb.from("audit_log").insert({
        user_id: user.id,
        user_name: user.name,
        action: "order_updated",
        details,
        entity_type: "order",
        entity_id: id,
      }).select().single();
      if (audit) {
        setData(prev => ({
          ...prev,
          auditLog: [{
            id: audit.id,
            userId: audit.user_id,
            userName: audit.user_name,
            action: audit.action,
            details: audit.details,
            entityType: audit.entity_type,
            entityId: audit.entity_id,
            timestamp: audit.created_at,
          }, ...prev.auditLog],
        }));
      }
    }
    return true;
  }, [data.orders, user]);

  const updateFullOrder = useCallback(async (input: {
    orderId: string;
    client?: { name: string; phone: string; phone2?: string; messenger?: string; comment?: string; source?: string };
    car?: { brand: string; model: string; generation?: string; year?: number; body?: string; plateNumber?: string; comment?: string };
    order?: Partial<Order>;
  }): Promise<boolean> => {
    const sb = getSupabase();
    if (!sb) return false;
    const o = input.order;

    const { data: row, error } = await sb.rpc("update_full_order", {
      p_order_id: input.orderId,
      p_client: input.client ? {
        name: input.client.name,
        phone: input.client.phone,
        phone2: input.client.phone2 || null,
        messenger: input.client.messenger || null,
        comment: input.client.comment || null,
        source: input.client.source || null,
      } : null,
      p_car: input.car ? {
        brand: input.car.brand,
        model: input.car.model,
        generation: input.car.generation || null,
        year: input.car.year ? String(input.car.year) : null,
        body: input.car.body || null,
        plate_number: input.car.plateNumber || null,
        comment: input.car.comment || null,
      } : null,
      p_order: o ? {
        kit_types: o.kitTypes || [],
        assignee_id: o.assigneeId || null,
        desired_date: o.desiredDate || null,
        priority: o.priority || null,
        total_price: o.totalPrice ?? null,
        seamstress_payment: o.seamstressPayment ?? null,
        chinese_cost: o.chineseCost ?? null,
        material_cost: o.materialCost ?? null,
        other_costs: o.otherCosts ?? null,
        seamstress_comment: o.seamstressComment ?? "",
        layout_image: o.layoutImage ?? "",
        photos: o.photos || [],
      } : null,
    });

    if (error) {
      console.error("update_full_order error:", error);
      throw new Error(error.message || "Не удалось сохранить изменения");
    }

    // Обновляем заказ локально из ответа сервера —
    // перезагружать все данные не нужно
    if (row) {
      const updated = mapOrderRow({ ...row, order_status_history: [] });
      setData(prev => ({
        ...prev,
        orders: prev.orders.map(item =>
          item.id === input.orderId
            ? { ...updated, statusHistory: item.statusHistory }
            : item
        ),
        clients: input.client
          ? prev.clients.map(c => c.id === updated.clientId ? { ...c, ...input.client } : c)
          : prev.clients,
        cars: input.car
          ? prev.cars.map(c => c.id === updated.carId ? { ...c, ...input.car } : c)
          : prev.cars,
      }));
    }
    return true;
  }, []);

  const updateOrderStatus = useCallback(async (id: string, status: OrderStatus): Promise<boolean> => {
    const sb = getSupabase();
    if (!sb || !user) return false;

    const order = data.orders.find(o => o.id === id);
    const oldStatus = order?.status || "new";
    if (!order || oldStatus === status) return true;

    setData(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === id ? { ...o, status } : o),
    }));

    const { error: statusError } = await sb.from("orders").update({ status }).eq("id", id);

    if (statusError) {
      console.error("Status update error:", statusError);
      setData(prev => ({
        ...prev,
        orders: prev.orders.map(o => o.id === id ? { ...o, status: oldStatus } : o),
      }));
      return false;
    }

    const { error: historyError } = await sb.from("order_status_history").insert({
      order_id: id, user_id: user.id, user_name: user.name,
      old_status: oldStatus, new_status: status,
    });
    if (historyError) console.error("Status history error:", historyError);
    const historyEntry = {
      id: `local_${Date.now()}`,
      userId: user.id,
      userName: user.name,
      oldStatus,
      newStatus: status,
      timestamp: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === id
        ? { ...o, statusHistory: [historyEntry, ...o.statusHistory] }
        : o),
    }));
    return true;
  }, [user, data.orders]);

  const deleteOrder = useCallback(async (id: string, reason: string) => {
    const sb = getSupabase();
    if (!sb || !user) return { ok: false, error: "Нет соединения с базой" };
    const order = data.orders.find(item => item.id === id);
    if (!order) return { ok: false, error: "Заказ не найден" };
    if (order.paid > 0 || data.transactions.some(item => item.orderId === id)) {
      return { ok: false, error: "У заказа есть финансовые операции. Сначала оформите возврат или удалите ошибочную оплату." };
    }

    const { error: rpcError } = await sb.rpc("delete_order", {
      p_order_id: id,
      p_reason: reason.trim() || "Ошибочно созданный заказ",
    });

    if (rpcError && !/function .*delete_order.* does not exist|schema cache/i.test(rpcError.message || "")) {
      return { ok: false, error: rpcError.message };
    }

    // Совместимость с базой, где новая серверная функция ещё не установлена:
    // для заказа без денег безопасно удаляем зависимые производственные записи.
    if (rpcError) {
      const client = data.clients.find(item => item.id === order.clientId);
      const car = data.cars.find(item => item.id === order.carId);
      // У администратора эта копия попадёт в корзину. Для редактора политика
      // базы может запретить архивирование — удалению пустого заказа это не мешает.
      await sb.from("deleted_records").insert({
        entity_type: "order", entity_id: id,
        data: { order, client, car }, deleted_by: user.id,
        reason: reason.trim() || "Ошибочно созданный заказ",
      });
      await sb.from("notifications").update({ order_id: null }).eq("order_id", id);
      const { error: paymentError } = await sb.from("seamstress_payments").delete().eq("order_id", id);
      if (paymentError) return { ok: false, error: paymentError.message };
      const { error: deleteError } = await sb.from("orders").delete().eq("id", id);
      if (deleteError) return { ok: false, error: deleteError.message };
      await sb.from("audit_log").insert({
        user_id: user.id, user_name: user.name, action: "order_deleted",
        details: `Удалён заказ №${order.number}. Причина: ${reason.trim() || "не указана"}`,
        entity_type: "order", entity_id: id,
      });
    }

    setData(prev => ({
      ...prev,
      orders: prev.orders.filter(item => item.id !== id),
      seamstressPayments: prev.seamstressPayments.filter(item => item.orderId !== id),
      notifications: prev.notifications.map(item => item.orderId === id ? { ...item, orderId: undefined } : item),
    }));
    return { ok: true };
  }, [data.orders, data.transactions, data.clients, data.cars, user]);

  const createClient = useCallback(async (c: Partial<Client>): Promise<Client | null> => {
    const sb = getSupabase();
    if (!sb) return null;
    const clientId = c.id || crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const { error } = await sb.from("clients").insert({
      id: clientId,
      name: c.name, phone: c.phone, phone2: c.phone2,
      messenger: c.messenger, comment: c.comment, source: c.source,
    });

    if (error) {
      if (error.code === "23505") {
        const { data: existingById } = await sb.from("clients").select("*").eq("id", clientId).maybeSingle();
        if (existingById) return mapClientRow(existingById);
        const { data: existingByPhone } = await sb.from("clients").select("*").eq("phone", c.phone).maybeSingle();
        if (existingByPhone) return mapClientRow(existingByPhone);
      }
      console.error("Create client error:", error);
      throw new Error(error.message || "Не удалось создать клиента");
    }
    const client = { ...c, id: clientId, createdAt } as Client;
    setData(prev => ({ ...prev, clients: [client, ...prev.clients] }));
    return client;
  }, []);

  const updateClient = useCallback(async (id: string, updates: Partial<Client>): Promise<boolean> => {
    const sb = getSupabase();
    if (!sb) return false;
    const previous = data.clients.find(c => c.id === id);
    setData(prev => ({ ...prev, clients: prev.clients.map(c => c.id === id ? { ...c, ...updates } : c) }));
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.phone2 !== undefined) dbUpdates.phone2 = updates.phone2;
    if (updates.messenger !== undefined) dbUpdates.messenger = updates.messenger;
    if (updates.comment !== undefined) dbUpdates.comment = updates.comment;
    if (updates.source !== undefined) dbUpdates.source = updates.source;
    const { error } = await sb.from("clients").update(dbUpdates).eq("id", id);
    if (error) {
      if (previous) setData(prev => ({ ...prev, clients: prev.clients.map(c => c.id === id ? previous : c) }));
      return false;
    }
    return true;
  }, [data.clients]);

  const createTransaction = useCallback(async (tx: Partial<Transaction>): Promise<Transaction | null> => {
    const sb = getSupabase();
    if (!sb) return null;
    if (!tx.type || !tx.amount || !tx.accountId) return null;

    const transaction = {
      ...tx,
      id: tx.id || crypto.randomUUID(),
      createdAt: tx.createdAt || new Date().toISOString(),
    } as Transaction;

    const queued = readFinanceOutbox();
    if (!queued.some(item => item.id === transaction.id)) {
      writeFinanceOutbox([...queued, transaction]);
    }

    // Показываем сразу. Баланс НЕ трогаем вручную: он всегда
    // пересчитывается из списка операций через applyLedgerBalances.
    // Ручная правка приводила к двойному вычитанию и минусу на счёте.
    setData(prev => {
      const already = prev.transactions.some(item => item.id === transaction.id);
      const nextTransactions = already
        ? prev.transactions
        : [transaction, ...prev.transactions];
      return {
        ...prev,
        transactions: nextTransactions,
        accounts: applyLedgerBalances(prev.accounts, nextTransactions),
      };
    });

    // The transaction ledger is the source of truth for balances. This is one
    // request instead of insert + one or two sequential balance mutations.
    const { error } = await sb.from("transactions").upsert(
      transactionPayload(transaction),
      { onConflict: "id", ignoreDuplicates: true },
    );

    if (error) {
      console.error("Create transaction error; queued for retry:", error);
      return transaction;
    }

    writeFinanceOutbox(readFinanceOutbox().filter(item => item.id !== transaction.id));
    return transaction;
  }, []);

  useEffect(() => {
    if (!user) return;
    const flush = async () => {
      const sb = getSupabase();
      const pending = readFinanceOutbox();
      if (!sb || !pending.length) return;
      const savedIds: string[] = [];
      for (const transaction of pending) {
        const { error } = await sb.from("transactions").upsert(
          transactionPayload(transaction),
          { onConflict: "id", ignoreDuplicates: true },
        );
        if (!error) savedIds.push(transaction.id);
      }
      if (savedIds.length) {
        writeFinanceOutbox(readFinanceOutbox().filter(item => !savedIds.includes(item.id)));
      }
    };
    const retry = () => void flush();
    void flush();
    window.addEventListener("online", retry);
    window.addEventListener("focus", retry);
    const interval = window.setInterval(retry, 30000);
    return () => {
      window.removeEventListener("online", retry);
      window.removeEventListener("focus", retry);
      window.clearInterval(interval);
    };
  }, [user]);

  const createCar = useCallback(async (c: Partial<Car>): Promise<Car | null> => {
    const sb = getSupabase();
    if (!sb) return null;
    const carId = c.id || crypto.randomUUID();

    const { error } = await sb.from("cars").insert({
      id: carId,
      client_id: c.clientId, brand: c.brand, model: c.model,
      generation: c.generation, year: c.year, body: c.body,
      plate_number: c.plateNumber, comment: c.comment,
    });

    if (error) {
      if (error.code === "23505") {
        const { data: existing } = await sb.from("cars").select("*").eq("id", carId).maybeSingle();
        if (existing) return mapCarRow(existing);
      }
      console.error("Create car error:", error);
      throw new Error(error.message || "Не удалось создать автомобиль");
    }
    const car = { ...c, id: carId } as Car;
    setData(prev => ({ ...prev, cars: [car, ...prev.cars] }));
    return car;
  }, []);

  const updateCar = useCallback(async (id: string, updates: Partial<Car>): Promise<boolean> => {
    const sb = getSupabase();
    if (!sb) return false;
    const previous = data.cars.find(car => car.id === id);
    setData(prev => ({ ...prev, cars: prev.cars.map(car => car.id === id ? { ...car, ...updates } : car) }));
    const dbUpdates: Record<string, unknown> = {};
    if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
    if (updates.model !== undefined) dbUpdates.model = updates.model;
    if (updates.generation !== undefined) dbUpdates.generation = updates.generation;
    if (updates.year !== undefined) dbUpdates.year = updates.year;
    if (updates.body !== undefined) dbUpdates.body = updates.body;
    if (updates.plateNumber !== undefined) dbUpdates.plate_number = updates.plateNumber;
    if (updates.comment !== undefined) dbUpdates.comment = updates.comment;
    const { error } = await sb.from("cars").update(dbUpdates).eq("id", id);
    if (error) {
      if (previous) setData(prev => ({ ...prev, cars: prev.cars.map(car => car.id === id ? previous : car) }));
      return false;
    }
    return true;
  }, [data.cars]);

  const addTemplate = useCallback(async (tpl: TemplateItem): Promise<boolean> => {
    const sb = getSupabase();
    if (!sb) return false;
    const { error } = await sb.from("templates").insert({
      brand: tpl.brand, name: tpl.name, type: tpl.type, image_url: tpl.img,
    });
    if (error) { console.error("Add template error:", error); return false; }
    setData(prev => ({
      ...prev,
      templates: {
        ...prev.templates,
        [tpl.brand]: [...(prev.templates[tpl.brand] || []), tpl],
      },
    }));
    return true;
  }, []);

  const markNotificationRead = useCallback(async (id: string): Promise<boolean> => {
    const sb = getSupabase();
    if (!sb) return false;
    setData(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    }));
    const { error } = await sb.from("notifications").update({ read: true }).eq("id", id);
    if (error) {
      setData(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => n.id === id ? { ...n, read: false } : n),
      }));
      return false;
    }
    return true;
  }, []);

  const markAllNotificationsRead = useCallback(async (): Promise<boolean> => {
    const sb = getSupabase();
    if (!sb || !user) return false;
    const previous = data.notifications;
    setData(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true })),
    }));
    const { error } = await sb.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    if (error) {
      setData(prev => ({ ...prev, notifications: previous }));
      return false;
    }
    return true;
  }, [user, data.notifications]);

  const receiveOrderPayment = useCallback(async (input: {
    orderId: string; amount: number; accountId: string; method: string;
    comment?: string; receiptPhoto?: string; markDelivered?: boolean;
  }): Promise<boolean> => {
    const sb = getSupabase();
    if (!sb || !user) return false;
    const order = data.orders.find(item => item.id === input.orderId);
    if (!order) return false;

    const { data: result, error } = await sb.rpc("receive_order_payment", {
      p_order_id: input.orderId,
      p_amount: input.amount,
      p_account_id: input.accountId,
      p_method: input.method,
      p_comment: input.comment || null,
      p_receipt_photo: input.receiptPhoto || null,
      p_mark_delivered: input.markDelivered || false,
    });
    if (error) {
      console.error("Receive payment error:", error);
      return false;
    }

    const paid = Number(result?.paid ?? order.paid + input.amount);
    const remaining = Number(result?.remaining ?? Math.max(0, order.totalPrice - paid));
    const status = (result?.status || order.status) as OrderStatus;
    const transaction: Transaction = {
      id: result?.transaction_id || `tx_${Date.now()}`,
      type: "income", amount: input.amount, accountId: input.accountId,
      orderId: order.id, clientId: order.clientId, paymentType: "additional",
      description: `${input.method}${input.comment ? ` · ${input.comment}` : ""}`,
      receiptPhoto: input.receiptPhoto, userId: user.id, userName: user.name,
      createdAt: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      orders: prev.orders.map(item => item.id === order.id ? { ...item, paid, remaining, status } : item),
      accounts: prev.accounts.map(item => item.id === input.accountId ? { ...item, balance: item.balance + input.amount } : item),
      transactions: [transaction, ...prev.transactions],
    }));
    return true;
  }, [user, data.orders]);

  const deleteTransaction = useCallback(async (id: string, reason?: string) => {
    const sb = getSupabase();
    if (!sb) return { ok: false, error: "Нет соединения" };
    const { error } = await sb.rpc("delete_transaction", { p_id: id, p_reason: reason || null });
    if (error) return { ok: false, error: error.message };
    // Убираем и из очереди, чтобы удалённая операция не вернулась
    writeFinanceOutbox(readFinanceOutbox().filter(item => item.id !== id));
    setData(prev => {
      const nextTransactions = prev.transactions.filter(t => t.id !== id);
      return {
        ...prev,
        transactions: nextTransactions,
        accounts: applyLedgerBalances(prev.accounts, nextTransactions),
      };
    });
    return { ok: true };
  }, []);

  const updateTransaction = useCallback(async (id: string, patch: {
    amount?: number; accountId?: string; categoryId?: string; description?: string;
  }) => {
    const sb = getSupabase();
    if (!sb) return { ok: false, error: "Нет соединения" };
    const { error } = await sb.rpc("update_transaction", {
      p_id: id,
      p_amount: patch.amount ?? null,
      p_account_id: patch.accountId ?? null,
      p_category_id: patch.categoryId ?? null,
      p_description: patch.description ?? null,
    });
    if (error) return { ok: false, error: error.message };
    setData(prev => {
      const nextTransactions = prev.transactions.map(t => t.id === id ? {
        ...t,
        amount: patch.amount ?? t.amount,
        accountId: patch.accountId ?? t.accountId,
        categoryId: patch.categoryId ?? t.categoryId,
        description: patch.description ?? t.description,
      } : t);
      return {
        ...prev,
        transactions: nextTransactions,
        accounts: applyLedgerBalances(prev.accounts, nextTransactions),
      };
    });
    return { ok: true };
  }, []);

  const loadOrderMedia = useCallback(async (orderId: string) => {
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error } = await sb.rpc("get_order_media", { p_order_id: orderId });
    if (error) {
      console.error("get_order_media error:", error);
      return null;
    }
    return {
      photos: (data?.photos || []) as string[],
      layoutImage: (data?.layout_image ?? null) as string | null,
    };
  }, []);

  const cancelOrder = useCallback(async (orderId: string, options?: {
    accountId?: string; reason?: string;
    keepSeamstress?: number; keepChinese?: number; keepMaterial?: number;
  }) => {
    const sb = getSupabase();
    if (!sb) return { ok: false, refunded: 0, error: "Нет соединения с базой" };
    const { data: result, error } = await sb.rpc("cancel_order", {
      p_order_id: orderId,
      p_account_id: options?.accountId || null,
      p_reason: options?.reason || null,
      p_keep_seamstress: options?.keepSeamstress || 0,
      p_keep_chinese: options?.keepChinese || 0,
      p_keep_material: options?.keepMaterial || 0,
    });
    if (error) {
      console.error("cancel_order error:", error);
      return { ok: false, refunded: 0, error: error.message };
    }
    await fetchAll();
    return { ok: true, refunded: Number(result?.refunded || 0) };
  }, [fetchAll]);

  const recordOrderAudit = useCallback(async (orderId: string, details: string) => {
    const sb = getSupabase();
    if (!sb || !user) return;
    const { data: audit } = await sb.from("audit_log").insert({
      user_id: user.id, user_name: user.name, action: "order_updated",
      details, entity_type: "order", entity_id: orderId,
    }).select().single();
    if (audit) setData(prev => ({ ...prev, auditLog: [{ id: audit.id, userId: audit.user_id, userName: audit.user_name, action: audit.action, details: audit.details, entityType: audit.entity_type, entityId: audit.entity_id, timestamp: audit.created_at }, ...prev.auditLog] }));
  }, [user]);

  const saveAdminUser = useCallback(async (id: string | null, input: AdminUserInput): Promise<AdminMutationResult> => {
    const sb = getSupabase();
    if (!sb || !user || user.role !== "admin") return { success: false, error: "Доступно только администратору" };
    const { error } = await sb.rpc("admin_save_user", {
      p_user_id: id,
      p_name: input.name.trim(),
      p_login: input.login.trim().toLowerCase(),
      p_role: input.role,
      p_active: input.active,
      p_password: input.password?.trim() || null,
    });
    if (error) return { success: false, error: getAdminErrorMessage(error) };
    await fetchAll();
    return { success: true };
  }, [user, fetchAll]);

  const saveAdminStatus = useCallback(async (id: string | null, input: AdminStatusInput): Promise<AdminMutationResult> => {
    const sb = getSupabase();
    if (!sb || !user || user.role !== "admin") return { success: false, error: "Доступно только администратору" };
    const payload = { key: input.key.trim().toLowerCase(), label: input.label.trim(), color: input.color, is_final: input.isFinal, sort_order: input.order };
    const query = id ? sb.from("order_statuses").update(payload).eq("id", id) : sb.from("order_statuses").insert(payload);
    const { error } = await query;
    if (error) return { success: false, error: getAdminErrorMessage(error) };
    await sb.from("audit_log").insert({ user_id: user.id, user_name: user.name, action: id ? "status_updated" : "status_created", details: `${id ? "Изменён" : "Создан"} статус «${input.label}»`, entity_type: "order_status", entity_id: id });
    await fetchAll();
    return { success: true };
  }, [user, fetchAll]);

  const saveAdminCategory = useCallback(async (id: string | null, input: AdminCategoryInput): Promise<AdminMutationResult> => {
    const sb = getSupabase();
    if (!sb || !user || user.role !== "admin") return { success: false, error: "Доступно только администратору" };
    const payload = {
      name: input.name.trim(), type: input.type, icon: input.icon, color: input.color,
      active: input.active, sort_order: input.order, include_in_profit: input.includeInProfit,
      can_link_order: input.canLinkOrder, require_comment: input.requireComment, require_receipt: input.requireReceipt,
    };
    const query = id ? sb.from("categories").update(payload).eq("id", id) : sb.from("categories").insert(payload);
    const { error } = await query;
    if (error) return { success: false, error: getAdminErrorMessage(error) };
    await sb.from("audit_log").insert({ user_id: user.id, user_name: user.name, action: id ? "category_updated" : "category_created", details: `${id ? "Изменена" : "Создана"} категория «${input.name}»`, entity_type: "category", entity_id: id });
    await fetchAll();
    return { success: true };
  }, [user, fetchAll]);

  const saveAdminAccount = useCallback(async (id: string | null, input: AdminAccountInput): Promise<AdminMutationResult> => {
    const sb = getSupabase();
    if (!sb || !user || user.role !== "admin") return { success: false, error: "Доступно только администратору" };
    const payload = { name: input.name.trim(), type: input.type, icon: input.icon, active: input.active, show_in_total: input.showInTotal, sort_order: input.order };
    const query = id ? sb.from("accounts").update(payload).eq("id", id) : sb.from("accounts").insert({ ...payload, balance: 0, initial_balance: 0 });
    const { error } = await query;
    if (error) return { success: false, error: getAdminErrorMessage(error) };
    await sb.from("audit_log").insert({ user_id: user.id, user_name: user.name, action: id ? "account_updated" : "account_created", details: `${id ? "Изменён" : "Создан"} счёт «${input.name}»`, entity_type: "account", entity_id: id });
    await fetchAll();
    return { success: true };
  }, [user, fetchAll]);

  return {
    ...data,
    loading,
    error,
    createOrder, createOrderWithPayment, createFullOrder, updateFullOrder,
    updateOrder, updateOrderStatus, deleteOrder,
    createClient, updateClient, createTransaction,
    deleteTransaction, updateTransaction, loadOrderMedia,
    createCar, updateCar, addTemplate, refresh: syncCoreData,
    markNotificationRead, markAllNotificationsRead,
    receiveOrderPayment, cancelOrder,
    recordOrderAudit,
    saveAdminUser, saveAdminStatus, saveAdminCategory, saveAdminAccount,
  };
}

// ── Provider ───────────────────────────────────────────
// Split into two components so hooks are never called conditionally
// (isSupabaseMode is a build-time constant, so only one path renders).
function DemoDataProvider({ children }: { children: React.ReactNode }) {
  const data = useDemoData();
  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
}

function SupabaseDataProvider({ children }: { children: React.ReactNode }) {
  const data = useSupabaseData();
  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  return isSupabaseMode ? (
    <SupabaseDataProvider>{children}</SupabaseDataProvider>
  ) : (
    <DemoDataProvider>{children}</DemoDataProvider>
  );
}

export function useData(): AppData {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be inside DataProvider");
  return ctx;
}
