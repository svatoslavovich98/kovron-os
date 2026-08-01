-- KOVRON OS — Дополнительные функции для Supabase
-- Запустить в SQL Editor ПОСЛЕ schema.sql

-- Управление сотрудниками из админки. Функция меняет профиль и данные входа
-- только после проверки роли текущего пользователя.
CREATE OR REPLACE FUNCTION public.admin_save_user(
  p_user_id UUID,
  p_name TEXT,
  p_login TEXT,
  p_role public.user_role,
  p_active BOOLEAN,
  p_password TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_id UUID;
  v_email TEXT;
  v_existing_role public.user_role;
  v_existing_active BOOLEAN;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Недостаточно прав'; END IF;

  p_name := BTRIM(p_name);
  p_login := LOWER(BTRIM(p_login));
  v_email := p_login || '@kovron.local';

  IF LENGTH(p_name) < 2 THEN RAISE EXCEPTION 'Имя слишком короткое'; END IF;
  IF p_login !~ '^[a-z0-9._-]{3,40}$' THEN
    RAISE EXCEPTION 'Логин: от 3 до 40 латинских букв, цифр, точек, дефисов или подчёркиваний';
  END IF;
  IF p_password IS NOT NULL AND LENGTH(p_password) < 6 THEN
    RAISE EXCEPTION 'Пароль должен содержать минимум 6 символов';
  END IF;

  IF p_user_id IS NULL THEN
    IF p_password IS NULL THEN RAISE EXCEPTION 'Для нового пользователя нужен пароль'; END IF;
    v_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change, email_change_token_new
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_id,
      'authenticated', 'authenticated', v_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      NOW(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', p_name), NOW(), NOW(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
      'email', NOW(), NOW(), NOW()
    );

    INSERT INTO public.profiles (id, name, login, role, active)
    VALUES (v_id, p_name, p_login, p_role, p_active);
  ELSE
    v_id := p_user_id;
    SELECT role, active INTO v_existing_role, v_existing_active
    FROM public.profiles WHERE id = v_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Пользователь не найден'; END IF;

    IF v_id = auth.uid() AND (p_role <> 'admin' OR NOT p_active) THEN
      RAISE EXCEPTION 'Нельзя снять права администратора или заблокировать собственную учётную запись';
    END IF;
    IF v_existing_role = 'admin' AND v_existing_active
       AND (p_role <> 'admin' OR NOT p_active)
       AND (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin' AND active) <= 1 THEN
      RAISE EXCEPTION 'В системе должен остаться хотя бы один активный администратор';
    END IF;

    UPDATE public.profiles
    SET name = p_name, login = p_login, role = p_role, active = p_active, updated_at = NOW()
    WHERE id = v_id;

    UPDATE auth.users
    SET email = v_email,
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('name', p_name),
        encrypted_password = CASE
          WHEN p_password IS NULL THEN encrypted_password
          ELSE extensions.crypt(p_password, extensions.gen_salt('bf'))
        END,
        updated_at = NOW()
    WHERE id = v_id;

    UPDATE auth.identities
    SET identity_data = COALESCE(identity_data, '{}'::jsonb) || jsonb_build_object('email', v_email),
        updated_at = NOW()
    WHERE user_id = v_id AND provider = 'email';
  END IF;

  INSERT INTO public.audit_log (user_id, user_name, action, details, entity_type, entity_id)
  VALUES (
    auth.uid(), (SELECT name FROM public.profiles WHERE id = auth.uid()),
    CASE WHEN p_user_id IS NULL THEN 'user_created' ELSE 'user_updated' END,
    CASE WHEN p_user_id IS NULL THEN 'Создан пользователь ' ELSE 'Изменён пользователь ' END || p_name,
    'user', v_id
  );

  RETURN v_id;
EXCEPTION
  WHEN unique_violation THEN RAISE EXCEPTION 'Такой логин уже используется';
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_user(UUID, TEXT, TEXT, public.user_role, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_save_user(UUID, TEXT, TEXT, public.user_role, BOOLEAN, TEXT) TO authenticated;

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

-- Упрощённый рабочий процесс: пять понятных статусов.
-- Старые промежуточные заказы переводятся в ближайший актуальный статус.
UPDATE public.orders
SET status = 'in_progress'
WHERE status IN ('pending_clarification', 'pending_measurement', 'measured', 'pending_prepayment', 'pending_production', 'assigned', 'paused');

UPDATE public.orders
SET status = 'completed'
WHERE status IN ('pending_delivery', 'delivered');

UPDATE public.order_statuses
SET active = key IN ('new', 'in_progress', 'ready', 'completed', 'cancelled');

UPDATE public.order_statuses SET label = 'Новая заявка', color = '#68A7FF', is_final = false, sort_order = 1, active = true WHERE key = 'new';
UPDATE public.order_statuses SET label = 'В работе', color = '#ADD256', is_final = false, sort_order = 2, active = true WHERE key = 'in_progress';
UPDATE public.order_statuses SET label = 'Готов', color = '#6FD08C', is_final = false, sort_order = 3, active = true WHERE key = 'ready';
UPDATE public.order_statuses SET label = 'Завершён', color = '#4FAF70', is_final = true, sort_order = 4, active = true WHERE key = 'completed';
UPDATE public.order_statuses SET label = 'Отменён', color = '#FF6B6B', is_final = true, sort_order = 5, active = true WHERE key = 'cancelled';
