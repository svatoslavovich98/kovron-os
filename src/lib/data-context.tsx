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
  updateOrder: (id: string, updates: Partial<Order>) => Promise<boolean>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<boolean>;
  createClient: (client: Partial<Client>) => Promise<Client | null>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<boolean>;
  createTransaction: (tx: Partial<Transaction>) => Promise<Transaction | null>;
  createCar: (car: Partial<Car>) => Promise<Car | null>;
  updateCar: (id: string, updates: Partial<Car>) => Promise<boolean>;
  addTemplate: (tpl: TemplateItem) => Promise<boolean>;
  markNotificationRead: (id: string) => Promise<boolean>;
  markAllNotificationsRead: () => Promise<boolean>;
  receiveOrderPayment: (input: {
    orderId: string; amount: number; accountId: string; method: string;
    comment?: string; receiptPhoto?: string; markDelivered?: boolean;
  }) => Promise<boolean>;
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

  const updateOrderStatus = useCallback(async (id: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    return true;
  }, []);

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
    createOrder, updateOrder, updateOrderStatus,
    createClient, updateClient, createTransaction,
    createCar, updateCar, addTemplate, refresh,
    markNotificationRead, markAllNotificationsRead,
    receiveOrderPayment,
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
      ] = await Promise.all([
        user.role === "admin" ? sb.from("profiles").select("*").order("created_at") : sb.from("profiles").select("*").eq("active", true),
        sb.from("order_statuses").select("*").order("sort_order"),
        sb.from("accounts").select("*").order("sort_order"),
        sb.from("categories").select("*").order("sort_order"),
        sb.from("clients").select("*").order("created_at", { ascending: false }),
        sb.from("cars").select("*"),
        sb.from("orders").select("*, order_status_history(*)").order("created_at", { ascending: false }),
        sb.from("transactions").select("*").order("created_at", { ascending: false }).limit(500),
        sb.from("seamstress_payments").select("*"),
        sb.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200),
        sb.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      ]);

      setData({
        users: (profiles || []).map(p => ({
          id: p.id, name: p.name, login: p.login, role: p.role,
          active: p.active, avatar: p.avatar_url, lastLogin: p.last_login,
          createdAt: p.created_at,
        })),
        statuses: (statuses || []).filter(s => !legacyStatusKeys.has(s.key)).map(s => ({
          id: s.id, key: s.key, label: s.label, color: s.color,
          isFinal: s.is_final, order: s.sort_order,
        })),
        accounts: (accounts || []).map(a => ({
          id: a.id, name: a.name, type: a.type, icon: a.icon || "💳",
          balance: Number(a.balance), initialBalance: Number(a.initial_balance),
          active: a.active, showInTotal: a.show_in_total, order: a.sort_order,
        })),
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
        clients: (clients || []).map(c => ({
          id: c.id, name: c.name, phone: c.phone, phone2: c.phone2,
          messenger: c.messenger, comment: c.comment, source: c.source,
          createdAt: c.created_at,
        })),
        cars: (cars || []).map(c => ({
          id: c.id, clientId: c.client_id, brand: c.brand, model: c.model,
          generation: c.generation, year: c.year, body: c.body,
          trim: c.trim, rows: c.rows, plateNumber: c.plate_number,
          comment: c.comment,
        })),
        orders: (rawOrders || []).map(o => ({
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
          statusHistory: (o.order_status_history || []).map((h: any) => ({
            id: h.id, userId: h.user_id, userName: h.user_name || "",
            oldStatus: h.old_status, newStatus: h.new_status,
            timestamp: h.created_at,
          })),
        })),
        transactions: (transactions || []).map(t => ({
          id: t.id, type: t.type, amount: Number(t.amount),
          categoryId: t.category_id, accountId: t.account_id,
          toAccountId: t.to_account_id, orderId: t.order_id,
          clientId: t.client_id, paymentType: t.payment_type,
          description: t.description, receiptPhoto: t.receipt_photo,
          userId: t.user_id, userName: t.user_name || "",
          createdAt: t.created_at,
        })),
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

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  // ── Mutations ──────────────────────────────────────────
  const createOrder = useCallback(async (o: Partial<Order>): Promise<Order | null> => {
    const sb = getSupabase();
    if (!sb) return null;

    const num = `${new Date().getDate().toString().padStart(2,"0")}${(new Date().getMonth()+1).toString().padStart(2,"0")}-${Math.floor(Math.random()*900)+100}`;
    const initialStatus: OrderStatus = "new";

    const { data: created, error } = await sb.from("orders").insert({
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
    }).select().single();

    if (error || !created) { console.error("Create order error:", error); return null; }
    const order: Order = {
      ...o,
      id: created.id,
      number: created.number,
      clientId: created.client_id,
      carId: created.car_id,
      status: created.status,
      kitTypes: created.kit_types || [],
      materialColor: created.material_color || "",
      edgeColor: created.edge_color || "",
      stitchColor: created.stitch_color || "",
      extras: created.extras || undefined,
      layoutImage: created.layout_image || undefined,
      photos: created.photos || [],
      assigneeId: created.assignee_id,
      priority: created.priority || "normal",
      createdById: created.created_by,
      createdAt: created.created_at,
      desiredDate: created.desired_date,
      totalPrice: Number(created.total_price || 0),
      prepayment: Number(created.prepayment || 0),
      paid: Number(created.paid || 0),
      remaining: Number(created.remaining || 0),
      seamstressPayment: Number(created.seamstress_payment || 0),
      seamstressPaymentStatus: created.seamstress_payment_status || "planned",
      chineseCost: Number(created.chinese_cost || 0),
      materialCost: Number(created.material_cost || 0),
      otherCosts: Number(created.other_costs || 0),
      plannedProfit: Number(created.planned_profit || 0),
      statusHistory: [],
    } as Order;
    setData(prev => ({ ...prev, orders: [order, ...prev.orders] }));
    return order;
  }, [user]);

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

  const createClient = useCallback(async (c: Partial<Client>): Promise<Client | null> => {
    const sb = getSupabase();
    if (!sb) return null;

    const { data: created, error } = await sb.from("clients").insert({
      name: c.name, phone: c.phone, phone2: c.phone2,
      messenger: c.messenger, comment: c.comment, source: c.source,
    }).select().single();

    if (error || !created) { console.error("Create client error:", error); return null; }
    const client = { ...c, id: created.id, createdAt: created.created_at } as Client;
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

    const { data: created, error } = await sb.from("transactions").insert({
      type: tx.type, amount: tx.amount, category_id: tx.categoryId,
      account_id: tx.accountId, to_account_id: tx.toAccountId,
      order_id: tx.orderId, client_id: tx.clientId,
      payment_type: tx.paymentType, description: tx.description,
      user_id: tx.userId, user_name: tx.userName,
    }).select().single();

    if (error) { console.error("Create transaction error:", error); return null; }

    // Update account balance
    if (tx.accountId && tx.amount) {
      if (tx.type === "income") {
        await sb.rpc("increment_balance", { acc_id: tx.accountId, val: tx.amount });
      } else if (tx.type === "expense") {
        await sb.rpc("increment_balance", { acc_id: tx.accountId, val: -tx.amount });
      } else if (tx.type === "transfer" && tx.toAccountId) {
        await sb.rpc("increment_balance", { acc_id: tx.accountId, val: -tx.amount });
        await sb.rpc("increment_balance", { acc_id: tx.toAccountId, val: tx.amount });
      }
    }

    const transaction = {
      ...tx,
      id: created.id,
      createdAt: created.created_at || new Date().toISOString(),
    } as Transaction;
    setData(prev => ({
      ...prev,
      transactions: [transaction, ...prev.transactions],
      accounts: prev.accounts.map(account => {
        if (!tx.amount) return account;
        if (account.id === tx.accountId) {
          const delta = tx.type === "income" ? tx.amount : -tx.amount;
          return { ...account, balance: account.balance + delta };
        }
        if (tx.type === "transfer" && account.id === tx.toAccountId) {
          return { ...account, balance: account.balance + tx.amount };
        }
        return account;
      }),
    }));
    return transaction;
  }, []);

  const createCar = useCallback(async (c: Partial<Car>): Promise<Car | null> => {
    const sb = getSupabase();
    if (!sb) return null;

    const { data: created, error } = await sb.from("cars").insert({
      client_id: c.clientId, brand: c.brand, model: c.model,
      generation: c.generation, year: c.year, body: c.body,
      plate_number: c.plateNumber, comment: c.comment,
    }).select().single();

    if (error || !created) { console.error("Create car error:", error); return null; }
    const car = { ...c, id: created.id } as Car;
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
    createOrder, updateOrder, updateOrderStatus,
    createClient, updateClient, createTransaction,
    createCar, updateCar, addTemplate, refresh: fetchAll,
    markNotificationRead, markAllNotificationsRead,
    receiveOrderPayment,
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
