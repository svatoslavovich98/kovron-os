-- KOVRON OS — Дополнительные функции для Supabase
-- Запустить в SQL Editor ПОСЛЕ schema.sql

-- Функция для обновления баланса счёта
CREATE OR REPLACE FUNCTION increment_balance(acc_id UUID, val NUMERIC)
RETURNS void AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Недостаточно прав'; END IF;
  UPDATE accounts SET balance = balance + val WHERE id = acc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Атомарное получение оплаты по заказу: операция, касса и заказ меняются вместе.
CREATE OR REPLACE FUNCTION public.receive_order_payment(
  p_order_id UUID,
  p_amount NUMERIC,
  p_account_id UUID,
  p_method TEXT,
  p_comment TEXT DEFAULT NULL,
  p_receipt_photo TEXT DEFAULT NULL,
  p_mark_delivered BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_transaction_id UUID;
  v_paid NUMERIC;
  v_status TEXT;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Недостаточно прав'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Сумма должна быть больше нуля'; END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Заказ не найден'; END IF;
  IF p_amount > v_order.remaining THEN RAISE EXCEPTION 'Сумма превышает остаток по заказу'; END IF;

  INSERT INTO transactions (
    type, amount, account_id, order_id, client_id, payment_type,
    description, receipt_photo, user_id, user_name
  ) VALUES (
    'income', p_amount, p_account_id, p_order_id, v_order.client_id, 'additional',
    CONCAT(p_method, CASE WHEN p_comment IS NULL OR p_comment = '' THEN '' ELSE ' · ' || p_comment END),
    p_receipt_photo, auth.uid(), (SELECT name FROM profiles WHERE id = auth.uid())
  ) RETURNING id INTO v_transaction_id;

  UPDATE accounts SET balance = balance + p_amount WHERE id = p_account_id;
  v_paid := v_order.paid + p_amount;
  v_status := v_order.status;

  IF v_order.status IN ('new', 'pending_prepayment') THEN
    v_status := CASE WHEN v_order.assignee_id IS NULL THEN 'pending_production' ELSE 'assigned' END;
  END IF;
  IF p_mark_delivered AND v_paid >= v_order.total_price THEN v_status := 'completed'; END IF;

  UPDATE orders SET paid = v_paid, status = v_status, updated_at = NOW() WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'paid', v_paid,
    'remaining', v_order.total_price - v_paid,
    'status', v_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.receive_order_payment(UUID, NUMERIC, UUID, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

-- Финансовые настройки счетов меняет только администратор.
DROP POLICY IF EXISTS accounts_write ON public.accounts;
CREATE POLICY accounts_write ON public.accounts FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS audit_read ON public.audit_log;
CREATE POLICY audit_read ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_staff());

-- Функция для подсчёта оплаченных сумм по заказу
CREATE OR REPLACE FUNCTION recalc_order_paid(ord_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE orders SET paid = (
    SELECT COALESCE(SUM(amount), 0)
    FROM transactions
    WHERE order_id = ord_id AND type = 'income'
  ) WHERE id = ord_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
