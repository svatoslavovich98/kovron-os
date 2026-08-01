-- KOVRON OS — Supabase Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- ═══════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════

CREATE TYPE user_role AS ENUM ('admin', 'editor', 'seamstress');
CREATE TYPE order_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE payment_type AS ENUM ('prepayment', 'additional', 'full', 'other');
CREATE TYPE seamstress_payment_status AS ENUM ('planned', 'accrued', 'paid');

-- ═══════════════════════════════════════════
-- PROFILES (extends auth.users)
-- ═══════════════════════════════════════════

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  login TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'editor',
  active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  last_login TIMESTAMPTZ,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- ORDER STATUSES (configurable by admin)
-- ═══════════════════════════════════════════

CREATE TABLE order_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#9CA39A',
  is_final BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- ACCOUNTS
-- ═══════════════════════════════════════════

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'cash',
  icon TEXT DEFAULT 'Wallet',
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  initial_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  show_in_total BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- CATEGORIES (income & expense)
-- ═══════════════════════════════════════════

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type transaction_type NOT NULL,
  icon TEXT DEFAULT 'Tag',
  color TEXT NOT NULL DEFAULT '#9CA39A',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  include_in_profit BOOLEAN NOT NULL DEFAULT true,
  can_link_order BOOLEAN NOT NULL DEFAULT false,
  require_comment BOOLEAN NOT NULL DEFAULT false,
  require_receipt BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- CLIENTS
-- ═══════════════════════════════════════════

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone2 TEXT,
  messenger TEXT,
  comment TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_clients_phone ON clients(phone);

-- ═══════════════════════════════════════════
-- CARS
-- ═══════════════════════════════════════════

CREATE TABLE cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  generation TEXT,
  year INTEGER,
  body TEXT,
  trim TEXT,
  rows INTEGER,
  plate_number TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- ORDERS
-- ═══════════════════════════════════════════

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT UNIQUE NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id),
  car_id UUID NOT NULL REFERENCES cars(id),
  status TEXT NOT NULL DEFAULT 'new',
  kit_types TEXT[] NOT NULL DEFAULT '{}',
  material_color TEXT,
  bottom_color TEXT,
  edge_color TEXT,
  stitch_color TEXT,
  stitch_type TEXT,
  logo TEXT,
  heel_pad_position TEXT,
  extras TEXT,
  seamstress_comment TEXT,
  layout_image TEXT,
  photos TEXT[] DEFAULT '{}',
  assignee_id UUID REFERENCES profiles(id),
  priority order_priority NOT NULL DEFAULT 'normal',
  desired_date DATE,
  delivery_date DATE,
  total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  prepayment DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  remaining DECIMAL(12,2) GENERATED ALWAYS AS (total_price - paid) STORED,
  seamstress_payment DECIMAL(12,2) NOT NULL DEFAULT 0,
  seamstress_payment_status seamstress_payment_status NOT NULL DEFAULT 'planned',
  chinese_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  material_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  other_costs DECIMAL(12,2) NOT NULL DEFAULT 0,
  planned_profit DECIMAL(12,2) GENERATED ALWAYS AS (total_price - seamstress_payment - chinese_cost - material_cost - other_costs) STORED,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- ORDER STATUS HISTORY
-- ═══════════════════════════════════════════

CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  user_name TEXT,
  old_status TEXT,
  new_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- TRANSACTIONS
-- ═══════════════════════════════════════════

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type transaction_type NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category_id UUID REFERENCES categories(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  to_account_id UUID REFERENCES accounts(id),
  order_id UUID REFERENCES orders(id),
  client_id UUID REFERENCES clients(id),
  payment_type payment_type,
  description TEXT,
  receipt_photo TEXT,
  user_id UUID NOT NULL REFERENCES profiles(id),
  user_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- SEAMSTRESS PAYMENTS
-- ═══════════════════════════════════════════

CREATE TABLE seamstress_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  amount DECIMAL(12,2) NOT NULL,
  status seamstress_payment_status NOT NULL DEFAULT 'planned',
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES profiles(id),
  account_id UUID REFERENCES accounts(id),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- AUDIT LOG
-- ═══════════════════════════════════════════

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  user_name TEXT,
  action TEXT NOT NULL,
  details TEXT,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);

-- ═══════════════════════════════════════════
-- NOTIFICATIONS
-- ═══════════════════════════════════════════

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  user_id UUID NOT NULL REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read, created_at DESC);

-- ═══════════════════════════════════════════
-- TEMPLATES CATALOG (lekala)
-- ═══════════════════════════════════════════

CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'pol', -- pol, bag, rh
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_brand ON templates(brand);

-- ═══════════════════════════════════════════
-- DELETED RECORDS (soft delete / trash)
-- ═══════════════════════════════════════════

CREATE TABLE deleted_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  data JSONB NOT NULL,
  deleted_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- GRANTS (обязательно! RLS-политик недостаточно —
-- без GRANT роль authenticated получает "permission denied")
-- ═══════════════════════════════════════════

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE                        ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO authenticated;

-- ═══════════════════════════════════════════
-- ROLE HELPERS (SECURITY DEFINER — обходят RLS,
-- иначе политика на profiles рекурсивно вызывает саму себя)
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT COALESCE((SELECT role = 'admin' FROM public.profiles
                   WHERE id = auth.uid() AND active LIMIT 1), false);
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT COALESCE((SELECT role IN ('admin','editor') FROM public.profiles
                   WHERE id = auth.uid() AND active LIMIT 1), false);
$$;

CREATE OR REPLACE FUNCTION public.is_authed()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND active);
$$;

GRANT EXECUTE ON FUNCTION public.is_admin()  TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff()  TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authed() TO authenticated;

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════

ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE seamstress_payments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_statuses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deleted_records      ENABLE ROW LEVEL SECURITY;

-- Profiles: читают все вошедшие, себя правит сам, всех — админ
CREATE POLICY profiles_read  ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_self  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY profiles_admin ON profiles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Orders: админ/редактор — всё, швея — только свои
CREATE POLICY orders_staff ON orders FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY orders_seamstress_read ON orders FOR SELECT TO authenticated
  USING (assignee_id = auth.uid());
CREATE POLICY orders_seamstress_update ON orders FOR UPDATE TO authenticated
  USING (assignee_id = auth.uid()) WITH CHECK (assignee_id = auth.uid());

CREATE POLICY transactions_staff ON transactions FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY clients_staff ON clients FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY cars_staff ON cars FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY cars_seamstress_read ON cars FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.car_id = cars.id AND o.assignee_id = auth.uid()));

CREATE POLICY notifications_own ON notifications FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY sp_staff ON seamstress_payments FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY sp_seamstress_read ON seamstress_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM orders o
                 WHERE o.id = seamstress_payments.order_id AND o.assignee_id = auth.uid()));

CREATE POLICY audit_read   ON audit_log FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY audit_insert ON audit_log FOR INSERT TO authenticated WITH CHECK (public.is_authed());

CREATE POLICY templates_read  ON templates FOR SELECT TO authenticated USING (true);
CREATE POLICY templates_write ON templates FOR ALL    TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Справочники: читают все вошедшие
CREATE POLICY accounts_read  ON accounts FOR SELECT TO authenticated USING (public.is_authed());
CREATE POLICY accounts_write ON accounts FOR ALL    TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY categories_read  ON categories FOR SELECT TO authenticated USING (public.is_authed());
CREATE POLICY categories_write ON categories FOR ALL    TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY order_statuses_read  ON order_statuses FOR SELECT TO authenticated USING (public.is_authed());
CREATE POLICY order_statuses_write ON order_statuses FOR ALL    TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY osh_read   ON order_status_history FOR SELECT TO authenticated USING (public.is_authed());
CREATE POLICY osh_insert ON order_status_history FOR INSERT TO authenticated WITH CHECK (public.is_authed());

CREATE POLICY deleted_admin ON deleted_records FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ═══════════════════════════════════════════
-- TRIGGERS: auto-update updated_at
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_clients_updated_at BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_orders_updated_at BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════
-- SEED: initial statuses
-- ═══════════════════════════════════════════

INSERT INTO order_statuses (key, label, color, is_final, sort_order) VALUES
  ('new', 'Новая заявка', '#68A7FF', false, 1),
  ('pending_clarification', 'Ожидает уточнения', '#F4B860', false, 2),
  ('pending_measurement', 'Ожидает замера', '#F4B860', false, 3),
  ('measured', 'Замер выполнен', '#68A7FF', false, 4),
  ('pending_prepayment', 'Ожидает предоплату', '#F4B860', false, 5),
  ('pending_production', 'Ожидает производства', '#9CA39A', false, 6),
  ('assigned', 'Передан Оксане', '#ADD256', false, 7),
  ('in_progress', 'В работе', '#ADD256', false, 8),
  ('paused', 'Приостановлен', '#F4B860', false, 9),
  ('ready', 'Готов', '#6FD08C', false, 10),
  ('pending_delivery', 'Ожидает выдачи', '#6FD08C', false, 11),
  ('delivered', 'Выдан', '#6FD08C', true, 12),
  ('completed', 'Завершён', '#6FD08C', true, 13),
  ('cancelled', 'Отменён', '#FF6B6B', true, 14);

-- ═══════════════════════════════════════════
-- SEED: initial accounts
-- ═══════════════════════════════════════════

INSERT INTO accounts (name, type, icon, balance, initial_balance, sort_order) VALUES
  ('Наличные', 'cash', 'Banknote', 0, 0, 1),
  ('Карта PRINTILLA', 'card', 'CreditCard', 0, 0, 2),
  ('Расчётный счёт', 'bank', 'Building2', 0, 0, 3);

-- ═══════════════════════════════════════════
-- SEED: expense categories
-- ═══════════════════════════════════════════

INSERT INTO categories (name, type, icon, color, sort_order, include_in_profit, can_link_order) VALUES
  ('Материалы', 'expense', 'Scissors', '#68A7FF', 1, true, true),
  ('Оплата Оксане', 'expense', 'UserCheck', '#ADD256', 2, true, true),
  ('Реклама', 'expense', 'Megaphone', '#F4B860', 3, true, false),
  ('Аренда', 'expense', 'Home', '#FF6B6B', 4, true, false),
  ('Оборудование', 'expense', 'Wrench', '#9CA39A', 5, true, false),
  ('Инструменты', 'expense', 'Hammer', '#9CA39A', 6, true, false),
  ('Доставка', 'expense', 'Truck', '#68A7FF', 7, true, true),
  ('Налоги', 'expense', 'Receipt', '#FF6B6B', 8, false, false),
  ('Ремонт', 'expense', 'Settings', '#F4B860', 9, true, false),
  ('Возвраты', 'expense', 'RotateCcw', '#FF6B6B', 10, true, true),
  ('Связь', 'expense', 'Phone', '#68A7FF', 11, true, false),
  ('Прочее', 'expense', 'MoreHorizontal', '#9CA39A', 12, true, false);

INSERT INTO categories (name, type, icon, color, sort_order, include_in_profit, can_link_order) VALUES
  ('Оплата заказа', 'income', 'ShoppingBag', '#6FD08C', 1, true, true),
  ('Прочий доход', 'income', 'TrendingUp', '#ADD256', 2, true, false);
