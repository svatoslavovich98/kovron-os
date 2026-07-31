import type {
  User, Client, Car, Order, Transaction, Category,
  Account, OrderStatusConfig, AuditLogEntry, Notification,
  SeamstressPayment,
} from "./types";

// ── Users ──────────────────────────────────────────────
export const demoUsers: User[] = [
  { id: "u1", name: "Илья", login: "ilya", role: "admin", active: true, lastLogin: "2026-07-31T08:00:00", createdAt: "2026-01-01" },
  { id: "u2", name: "Артём", login: "artem", role: "editor", active: true, lastLogin: "2026-07-31T09:15:00", createdAt: "2026-01-01" },
  { id: "u3", name: "Ксюша", login: "ksyusha", role: "editor", active: true, lastLogin: "2026-07-31T10:30:00", createdAt: "2026-01-01" },
  { id: "u4", name: "Оксана", login: "oksana", role: "seamstress", active: true, lastLogin: "2026-07-31T07:45:00", createdAt: "2026-01-01" },
];

// Password: all demo accounts use "kovron2026"
export const demoPasswords: Record<string, string> = {
  ilya: "kovron2026",
  artem: "kovron2026",
  ksyusha: "kovron2026",
  oksana: "kovron2026",
};

// ── Order Statuses ─────────────────────────────────────
export const demoStatuses: OrderStatusConfig[] = [
  { id: "s1", key: "new", label: "Новая заявка", color: "#68A7FF", isFinal: false, order: 1 },
  { id: "s2", key: "pending_clarification", label: "Ожидает уточнения", color: "#F4B860", isFinal: false, order: 2 },
  { id: "s3", key: "pending_measurement", label: "Ожидает замера", color: "#F4B860", isFinal: false, order: 3 },
  { id: "s4", key: "measured", label: "Замер выполнен", color: "#68A7FF", isFinal: false, order: 4 },
  { id: "s5", key: "pending_prepayment", label: "Ожидает предоплату", color: "#F4B860", isFinal: false, order: 5 },
  { id: "s6", key: "pending_production", label: "Ожидает производства", color: "#9CA39A", isFinal: false, order: 6 },
  { id: "s7", key: "assigned", label: "Передан Оксане", color: "#ADD256", isFinal: false, order: 7 },
  { id: "s8", key: "in_progress", label: "В работе", color: "#ADD256", isFinal: false, order: 8 },
  { id: "s9", key: "paused", label: "Приостановлен", color: "#F4B860", isFinal: false, order: 9 },
  { id: "s10", key: "ready", label: "Готов", color: "#6FD08C", isFinal: false, order: 10 },
  { id: "s11", key: "pending_delivery", label: "Ожидает выдачи", color: "#6FD08C", isFinal: false, order: 11 },
  { id: "s12", key: "delivered", label: "Выдан", color: "#6FD08C", isFinal: true, order: 12 },
  { id: "s13", key: "completed", label: "Завершён", color: "#6FD08C", isFinal: true, order: 13 },
  { id: "s14", key: "cancelled", label: "Отменён", color: "#FF6B6B", isFinal: true, order: 14 },
];

// ── Accounts ───────────────────────────────────────────
export const demoAccounts: Account[] = [
  { id: "a1", name: "Наличные", type: "cash", icon: "Banknote", balance: 42500, initialBalance: 0, active: true, showInTotal: true, order: 1 },
  { id: "a2", name: "Карта PRINTILLA", type: "card", icon: "CreditCard", balance: 27800, initialBalance: 0, active: true, showInTotal: true, order: 2 },
  { id: "a3", name: "Расчётный счёт", type: "bank", icon: "Building2", balance: 66000, initialBalance: 0, active: true, showInTotal: true, order: 3 },
];

// ── Expense Categories ─────────────────────────────────
export const demoExpenseCategories: Category[] = [
  { id: "ec1", name: "Материалы", type: "expense", icon: "Scissors", color: "#68A7FF", active: true, order: 1, includeInProfit: true, canLinkOrder: true, requireComment: false, requireReceipt: false },
  { id: "ec2", name: "Оплата Оксане", type: "expense", icon: "UserCheck", color: "#ADD256", active: true, order: 2, includeInProfit: true, canLinkOrder: true, requireComment: false, requireReceipt: false },
  { id: "ec3", name: "Реклама", type: "expense", icon: "Megaphone", color: "#F4B860", active: true, order: 3, includeInProfit: true, canLinkOrder: false, requireComment: false, requireReceipt: false },
  { id: "ec4", name: "Аренда", type: "expense", icon: "Home", color: "#FF6B6B", active: true, order: 4, includeInProfit: true, canLinkOrder: false, requireComment: false, requireReceipt: false },
  { id: "ec5", name: "Оборудование", type: "expense", icon: "Wrench", color: "#9CA39A", active: true, order: 5, includeInProfit: true, canLinkOrder: false, requireComment: false, requireReceipt: true },
  { id: "ec6", name: "Инструменты", type: "expense", icon: "Hammer", color: "#9CA39A", active: true, order: 6, includeInProfit: true, canLinkOrder: false, requireComment: false, requireReceipt: false },
  { id: "ec7", name: "Доставка", type: "expense", icon: "Truck", color: "#68A7FF", active: true, order: 7, includeInProfit: true, canLinkOrder: true, requireComment: false, requireReceipt: false },
  { id: "ec8", name: "Налоги", type: "expense", icon: "Receipt", color: "#FF6B6B", active: true, order: 8, includeInProfit: false, canLinkOrder: false, requireComment: false, requireReceipt: true },
  { id: "ec9", name: "Ремонт", type: "expense", icon: "Settings", color: "#F4B860", active: true, order: 9, includeInProfit: true, canLinkOrder: false, requireComment: true, requireReceipt: false },
  { id: "ec10", name: "Возвраты", type: "expense", icon: "RotateCcw", color: "#FF6B6B", active: true, order: 10, includeInProfit: true, canLinkOrder: true, requireComment: true, requireReceipt: false },
  { id: "ec11", name: "Связь", type: "expense", icon: "Phone", color: "#68A7FF", active: true, order: 11, includeInProfit: true, canLinkOrder: false, requireComment: false, requireReceipt: false },
  { id: "ec12", name: "Прочее", type: "expense", icon: "MoreHorizontal", color: "#9CA39A", active: true, order: 12, includeInProfit: true, canLinkOrder: false, requireComment: true, requireReceipt: false },
];

// ── Income Categories ──────────────────────────────────
export const demoIncomeCategories: Category[] = [
  { id: "ic1", name: "Оплата заказа", type: "income", icon: "ShoppingBag", color: "#6FD08C", active: true, order: 1, includeInProfit: true, canLinkOrder: true, requireComment: false, requireReceipt: false },
  { id: "ic2", name: "Прочий доход", type: "income", icon: "TrendingUp", color: "#ADD256", active: true, order: 2, includeInProfit: true, canLinkOrder: false, requireComment: true, requireReceipt: false },
];

// ── Clients ────────────────────────────────────────────
export const demoClients: Client[] = [
  { id: "c1", name: "Алексей Петров", phone: "+7 913 111 22 33", source: "Авито", createdAt: "2026-06-15" },
  { id: "c2", name: "Марина Сидорова", phone: "+7 913 222 33 44", messenger: "WhatsApp", source: "Instagram", createdAt: "2026-07-01" },
  { id: "c3", name: "Дмитрий Козлов", phone: "+7 923 333 44 55", source: "Рекомендация", createdAt: "2026-07-10" },
  { id: "c4", name: "Анна Волкова", phone: "+7 913 444 55 66", messenger: "Telegram", source: "Авито", createdAt: "2026-07-20" },
  { id: "c5", name: "Сергей Иванов", phone: "+7 923 555 66 77", source: "2ГИС", createdAt: "2026-07-25" },
];

// ── Cars ───────────────────────────────────────────────
export const demoCars: Car[] = [
  { id: "car1", clientId: "c1", brand: "Toyota", model: "Camry", generation: "70 (XV70)", year: 2021, body: "Седан" },
  { id: "car2", clientId: "c2", brand: "Lexus", model: "GX", generation: "460", year: 2020, body: "Внедорожник" },
  { id: "car3", clientId: "c3", brand: "Kia", model: "K5", generation: "DL3", year: 2023, body: "Седан" },
  { id: "car4", clientId: "c4", brand: "Hyundai", model: "Tucson", generation: "NX4", year: 2022, body: "Кроссовер" },
  { id: "car5", clientId: "c5", brand: "BMW", model: "X5", generation: "G05", year: 2024, body: "Кроссовер" },
];

// ── Orders ─────────────────────────────────────────────
export const demoOrders: Order[] = [
  {
    id: "o1", number: "2607-154", clientId: "c1", carId: "car1",
    status: "in_progress", kitTypes: ["full"],
    materialColor: "Чёрный", edgeColor: "Зелёный", stitchColor: "Зелёный",
    photos: [], assigneeId: "u4", priority: "normal",
    createdAt: "2026-07-26T10:00:00", desiredDate: "2026-08-05",
    totalPrice: 12000, prepayment: 5000, paid: 5000, remaining: 7000,
    seamstressPayment: 1200, seamstressPaymentStatus: "planned",
    materialCost: 2500, otherCosts: 0, plannedProfit: 3300,
    statusHistory: [
      { id: "sh1", userId: "u3", userName: "Ксюша", oldStatus: "new", newStatus: "pending_prepayment", timestamp: "2026-07-26T10:05:00" },
      { id: "sh2", userId: "u3", userName: "Ксюша", oldStatus: "pending_prepayment", newStatus: "assigned", timestamp: "2026-07-26T14:00:00" },
      { id: "sh3", userId: "u4", userName: "Оксана", oldStatus: "assigned", newStatus: "in_progress", timestamp: "2026-07-28T08:30:00" },
    ],
  },
  {
    id: "o2", number: "2607-155", clientId: "c2", carId: "car2",
    status: "ready", kitTypes: ["full", "trunk"],
    materialColor: "Серый", edgeColor: "Чёрный", stitchColor: "Серый",
    photos: [], assigneeId: "u4", priority: "high",
    createdAt: "2026-07-22T09:00:00", desiredDate: "2026-07-30",
    totalPrice: 18000, prepayment: 10000, paid: 10000, remaining: 8000,
    seamstressPayment: 2000, seamstressPaymentStatus: "accrued",
    materialCost: 3500, otherCosts: 500, plannedProfit: 2000,
    statusHistory: [],
  },
  {
    id: "o3", number: "2607-156", clientId: "c3", carId: "car3",
    status: "pending_prepayment", kitTypes: ["full"],
    materialColor: "Бежевый", edgeColor: "Коричневый", stitchColor: "Бежевый",
    photos: [], priority: "normal",
    createdAt: "2026-07-29T11:00:00", desiredDate: "2026-08-10",
    totalPrice: 10000, prepayment: 0, paid: 0, remaining: 10000,
    seamstressPayment: 1000, seamstressPaymentStatus: "planned",
    materialCost: 2000, otherCosts: 0, plannedProfit: 7000,
    statusHistory: [],
  },
  {
    id: "o4", number: "2607-157", clientId: "c4", carId: "car4",
    status: "pending_delivery", kitTypes: ["full"],
    materialColor: "Чёрный", edgeColor: "Красный", stitchColor: "Красный",
    photos: [], assigneeId: "u4", priority: "normal",
    createdAt: "2026-07-15T14:00:00", desiredDate: "2026-07-28",
    totalPrice: 11000, prepayment: 5500, paid: 11000, remaining: 0,
    seamstressPayment: 1100, seamstressPaymentStatus: "accrued",
    materialCost: 2200, otherCosts: 0, plannedProfit: 6700,
    statusHistory: [],
  },
  {
    id: "o5", number: "2607-158", clientId: "c5", carId: "car5",
    status: "new", kitTypes: ["full", "trunk"],
    materialColor: "Чёрный", edgeColor: "Чёрный", stitchColor: "Синий",
    photos: [], priority: "high",
    createdAt: "2026-07-31T08:00:00", desiredDate: "2026-08-15",
    totalPrice: 22000, prepayment: 0, paid: 0, remaining: 22000,
    seamstressPayment: 2500, seamstressPaymentStatus: "planned",
    materialCost: 4000, otherCosts: 0, plannedProfit: 15500,
    statusHistory: [],
  },
];

// ── Transactions ───────────────────────────────────────
export const demoTransactions: Transaction[] = [
  { id: "t1", type: "income", amount: 5000, categoryId: "ic1", accountId: "a3", orderId: "o1", paymentType: "prepayment", userId: "u3", userName: "Ксюша", createdAt: "2026-07-26T14:10:00", description: "Предоплата заказ №154" },
  { id: "t2", type: "income", amount: 10000, categoryId: "ic1", accountId: "a2", orderId: "o2", paymentType: "prepayment", userId: "u2", userName: "Артём", createdAt: "2026-07-22T09:30:00", description: "Предоплата заказ №155" },
  { id: "t3", type: "income", amount: 5500, categoryId: "ic1", accountId: "a1", orderId: "o4", paymentType: "prepayment", userId: "u3", userName: "Ксюша", createdAt: "2026-07-15T14:30:00" },
  { id: "t4", type: "income", amount: 5500, categoryId: "ic1", accountId: "a1", orderId: "o4", paymentType: "additional", userId: "u2", userName: "Артём", createdAt: "2026-07-28T16:00:00", description: "Доплата" },
  { id: "t5", type: "expense", amount: 7500, categoryId: "ec1", accountId: "a2", userId: "u2", userName: "Артём", createdAt: "2026-07-30T14:25:00", description: "Материалы для заказов" },
  { id: "t6", type: "expense", amount: 15000, categoryId: "ec4", accountId: "a3", userId: "u1", userName: "Илья", createdAt: "2026-07-01T10:00:00", description: "Аренда мастерской" },
  { id: "t7", type: "expense", amount: 3000, categoryId: "ec3", accountId: "a2", userId: "u1", userName: "Илья", createdAt: "2026-07-10T12:00:00", description: "Реклама Авито" },
  { id: "t8", type: "transfer", amount: 10000, accountId: "a1", toAccountId: "a2", userId: "u1", userName: "Илья", createdAt: "2026-07-20T11:00:00", description: "Пополнение карты" },
];

// ── Seamstress Payments ────────────────────────────────
export const demoSeamstressPayments: SeamstressPayment[] = [
  { id: "sp1", orderId: "o1", amount: 1200, status: "planned" },
  { id: "sp2", orderId: "o2", amount: 2000, status: "accrued" },
  { id: "sp3", orderId: "o4", amount: 1100, status: "accrued" },
];

// ── Audit Log ──────────────────────────────────────────
export const demoAuditLog: AuditLogEntry[] = [
  { id: "al1", userId: "u3", userName: "Ксюша", action: "payment_received", details: "Получена предоплата 5 000 ₽ за заказ №154", entityType: "order", entityId: "o1", timestamp: "2026-07-31T16:22:00" },
  { id: "al2", userId: "u4", userName: "Оксана", action: "order_completed", details: "Завершила заказ №155", entityType: "order", entityId: "o2", timestamp: "2026-07-31T18:10:00" },
  { id: "al3", userId: "u1", userName: "Илья", action: "seamstress_paid", details: "Выплатил Оксане 1 200 ₽ (наличные)", entityType: "payment", entityId: "sp1", timestamp: "2026-07-31T18:25:00" },
  { id: "al4", userId: "u2", userName: "Артём", action: "expense_added", details: "Расход: Материалы 7 500 ₽", entityType: "transaction", entityId: "t5", timestamp: "2026-07-30T14:25:00" },
  { id: "al5", userId: "u1", userName: "Илья", action: "login", details: "Вход в систему", timestamp: "2026-07-31T08:00:00" },
];

// ── Notifications ──────────────────────────────────────
export const demoNotifications: Notification[] = [
  { id: "n1", type: "order_ready", title: "Заказ готов", message: "Заказ №155 (Lexus GX) готов к выдаче", read: false, userId: "u1", createdAt: "2026-07-31T18:10:00", orderId: "o2" },
  { id: "n2", type: "payment_due", title: "Ожидает оплаты", message: "Клиент Алексей Петров — остаток 7 000 ₽ по заказу №154", read: false, userId: "u1", createdAt: "2026-07-31T12:00:00", orderId: "o1" },
  { id: "n3", type: "deadline_approaching", title: "Приближается срок", message: "Заказ №154 — срок 5 августа", read: true, userId: "u1", createdAt: "2026-07-30T09:00:00", orderId: "o1" },
];

// ── Kit labels ─────────────────────────────────────────
export const kitLabels: Record<string, string> = {
  full: "Полный комплект салона",
  front: "Передние коврики",
  bottom: "Нижние коврики",
  trunk: "Багажник",
  bottom_only: "Только низ",
  custom: "Индивидуальный",
};

// ── Client Sources ─────────────────────────────────────
export const clientSources = [
  "Авито", "Instagram", "2ГИС", "Рекомендация", "Сайт", "Повторный клиент", "Прочее",
];

// ── Colors catalog ─────────────────────────────────────
export const materialColors = [
  { name: "Чёрный", hex: "#1a1a1a" },
  { name: "Серый", hex: "#6b6b6b" },
  { name: "Бежевый", hex: "#d4b896" },
  { name: "Коричневый", hex: "#6b4226" },
  { name: "Синий", hex: "#2a4494" },
  { name: "Красный", hex: "#b82020" },
  { name: "Зелёный", hex: "#2d6b3f" },
  { name: "Белый", hex: "#f0f0f0" },
];

export const edgeColors = [...materialColors];
export const stitchColors = [...materialColors];
