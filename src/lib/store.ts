"use client";

import { createContext, useContext } from "react";
import type {
  User, Client, Car, Order, Transaction, Category,
  Account, OrderStatusConfig, AuditLogEntry, Notification,
  SeamstressPayment, OrderStatus, TransactionType, PeriodFilter,
} from "./types";
import {
  demoUsers, demoPasswords, demoStatuses, demoAccounts,
  demoExpenseCategories, demoIncomeCategories, demoClients,
  demoCars, demoOrders, demoTransactions, demoSeamstressPayments,
  demoAuditLog, demoNotifications,
} from "./demo-data";

// ── In-memory store (demo mode) ────────────────────────
// In production, replace with Supabase queries.

interface AppStore {
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
  currentUser: User | null;

  // Auth
  login: (username: string, password: string) => User | null;
  logout: () => void;

  // Orders
  getOrder: (id: string) => Order | undefined;
  getOrdersForSeamstress: (userId: string) => Order[];
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;

  // Clients
  getClient: (id: string) => Client | undefined;
  findClientByPhone: (phone: string) => Client | undefined;

  // Cars
  getCar: (id: string) => Car | undefined;

  // Transactions
  getTransactionsForPeriod: (period: PeriodFilter) => Transaction[];

  // Accounts
  getTotalBalance: () => number;

  // Stats
  getIncomeForPeriod: (period: PeriodFilter) => number;
  getExpenseForPeriod: (period: PeriodFilter) => number;
  getProfitForPeriod: (period: PeriodFilter) => number;
  getSeamstressEarnings: (userId: string) => { planned: number; accrued: number; paid: number; pending: number };
}

function isInPeriod(dateStr: string, period: PeriodFilter): boolean {
  const d = new Date(dateStr);
  const now = new Date();

  switch (period.type) {
    case "today":
      return d.toDateString() === now.toDateString();
    case "week": {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo && d <= now;
    }
    case "month": {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    case "year":
      return d.getFullYear() === now.getFullYear();
    case "custom":
      if (period.from && period.to) {
        return d >= new Date(period.from) && d <= new Date(period.to);
      }
      return true;
    default:
      return true;
  }
}

export function createAppStore(): AppStore {
  const store: AppStore = {
    users: [...demoUsers],
    statuses: [...demoStatuses],
    accounts: [...demoAccounts],
    expenseCategories: [...demoExpenseCategories],
    incomeCategories: [...demoIncomeCategories],
    clients: [...demoClients],
    cars: [...demoCars],
    orders: [...demoOrders],
    transactions: [...demoTransactions],
    seamstressPayments: [...demoSeamstressPayments],
    auditLog: [...demoAuditLog],
    notifications: [...demoNotifications],
    currentUser: null,

    login(username: string, password: string) {
      if (demoPasswords[username] === password) {
        const user = store.users.find((u) => u.login === username && u.active);
        if (user) {
          store.currentUser = user;
          return user;
        }
      }
      return null;
    },

    logout() {
      store.currentUser = null;
    },

    getOrder(id: string) {
      return store.orders.find((o) => o.id === id);
    },

    getOrdersForSeamstress(userId: string) {
      return store.orders.filter((o) => o.assigneeId === userId);
    },

    updateOrderStatus(orderId: string, status: OrderStatus) {
      const order = store.orders.find((o) => o.id === orderId);
      if (order) order.status = status;
    },

    getClient(id: string) {
      return store.clients.find((c) => c.id === id);
    },

    findClientByPhone(phone: string) {
      return store.clients.find((c) => c.phone === phone);
    },

    getCar(id: string) {
      return store.cars.find((c) => c.id === id);
    },

    getTransactionsForPeriod(period: PeriodFilter) {
      return store.transactions.filter((t) => isInPeriod(t.createdAt, period));
    },

    getTotalBalance() {
      return store.accounts.filter((a) => a.active && a.showInTotal).reduce((sum, a) => sum + a.balance, 0);
    },

    getIncomeForPeriod(period: PeriodFilter) {
      return store.transactions
        .filter((t) => t.type === "income" && isInPeriod(t.createdAt, period))
        .reduce((sum, t) => sum + t.amount, 0);
    },

    getExpenseForPeriod(period: PeriodFilter) {
      return store.transactions
        .filter((t) => t.type === "expense" && isInPeriod(t.createdAt, period))
        .reduce((sum, t) => sum + t.amount, 0);
    },

    getProfitForPeriod(period: PeriodFilter) {
      return store.getIncomeForPeriod(period) - store.getExpenseForPeriod(period);
    },

    getSeamstressEarnings(userId: string) {
      const orders = store.orders.filter((o) => o.assigneeId === userId);
      let planned = 0, accrued = 0, paid = 0;
      for (const o of orders) {
        switch (o.seamstressPaymentStatus) {
          case "planned": planned += o.seamstressPayment; break;
          case "accrued": accrued += o.seamstressPayment; break;
          case "paid": paid += o.seamstressPayment; break;
        }
      }
      return { planned, accrued, paid, pending: accrued };
    },
  };

  return store;
}

export const AppStoreContext = createContext<AppStore | null>(null);

export function useAppStore(): AppStore {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error("useAppStore must be used within AppStoreProvider");
  return store;
}
