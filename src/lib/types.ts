export type UserRole = "admin" | "editor" | "seamstress";

export interface User {
  id: string;
  name: string;
  login: string;
  role: UserRole;
  active: boolean;
  avatar?: string;
  lastLogin?: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  phone2?: string;
  messenger?: string;
  comment?: string;
  source?: string;
  createdAt: string;
}

export interface Car {
  id: string;
  clientId: string;
  brand: string;
  model: string;
  generation?: string;
  year?: number;
  body?: string;
  trim?: string;
  rows?: number;
  plateNumber?: string;
  comment?: string;
}

export type OrderStatus =
  | "new"
  | "pending_clarification"
  | "pending_measurement"
  | "measured"
  | "pending_prepayment"
  | "pending_production"
  | "assigned"
  | "in_progress"
  | "paused"
  | "ready"
  | "pending_delivery"
  | "delivered"
  | "completed"
  | "cancelled";

export interface OrderStatusConfig {
  id: string;
  key: OrderStatus;
  label: string;
  color: string;
  isFinal: boolean;
  order: number;
}

export type KitType =
  | "full"
  | "front"
  | "bottom"
  | "trunk"
  | "bottom_only"
  | "custom";

export interface Order {
  id: string;
  number: string;
  clientId: string;
  client?: Client;
  carId: string;
  car?: Car;
  status: OrderStatus;
  kitTypes: KitType[];
  materialColor: string;
  bottomColor?: string;
  edgeColor: string;
  stitchColor: string;
  stitchType?: string;
  logo?: string;
  heelPadPosition?: string;
  extras?: string;
  seamstressComment?: string;
  layoutImage?: string | null;
  photos: string[];
  assigneeId?: string | null;
  assignee?: User;
  createdById?: string;
  creator?: User;
  priority: "low" | "normal" | "high" | "urgent";
  createdAt: string;
  desiredDate?: string | null;
  deliveryDate?: string;
  totalPrice: number;
  prepayment: number;
  paid: number;
  remaining: number;
  seamstressPayment: number;
  seamstressPaymentStatus: "planned" | "accrued" | "paid";
  chineseCost: number;
  materialCost: number;
  otherCosts: number;
  plannedProfit: number;
  statusHistory: StatusChange[];
}

export interface StatusChange {
  id: string;
  userId: string;
  userName: string;
  oldStatus: OrderStatus;
  newStatus: OrderStatus;
  timestamp: string;
}

export type TransactionType = "income" | "expense" | "transfer";
export type PaymentType = "prepayment" | "additional" | "full" | "other";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId?: string;
  category?: Category;
  accountId: string;
  account?: Account;
  toAccountId?: string;
  toAccount?: Account;
  orderId?: string;
  order?: Order;
  clientId?: string;
  paymentType?: PaymentType;
  description?: string;
  receiptPhoto?: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface Category {
  id: string;
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

export interface Account {
  id: string;
  name: string;
  type: string;
  icon: string;
  balance: number;
  initialBalance: number;
  active: boolean;
  showInTotal: boolean;
  order: number;
}

export interface SeamstressPayment {
  id: string;
  orderId: string;
  order?: Order;
  amount: number;
  status: "planned" | "accrued" | "paid";
  paidAt?: string;
  paidBy?: string;
  accountId?: string;
  comment?: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  entityType?: string;
  entityId?: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  userId: string;
  createdAt: string;
  orderId?: string;
}

export interface TemplateItem {
  brand: string;
  name: string;
  type: "pol" | "bag" | "rh";
  img?: string;
  hasImage?: boolean;
}

export type TemplatesByBrand = Record<string, TemplateItem[]>;

export interface PeriodFilter {
  type: "today" | "week" | "month" | "year" | "custom";
  from?: string;
  to?: string;
}
