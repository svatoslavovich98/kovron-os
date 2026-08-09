-- Безопасное удаление ошибочно созданного заказа вместе со связанными проводками.
-- Балансы касс пересчитываются в той же транзакции, поэтому частичного удаления быть не может.
CREATE OR REPLACE FUNCTION public.delete_order(
  p_order_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_snapshot JSONB;
  v_transaction public.transactions%ROWTYPE;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Недостаточно прав'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Заказ не найден'; END IF;

  v_snapshot := jsonb_build_object(
    'order', to_jsonb(v_order),
    'client', (SELECT to_jsonb(c) FROM public.clients c WHERE c.id = v_order.client_id),
    'car', (SELECT to_jsonb(c) FROM public.cars c WHERE c.id = v_order.car_id),
    'status_history', COALESCE((SELECT jsonb_agg(to_jsonb(h)) FROM public.order_status_history h WHERE h.order_id = p_order_id), '[]'::jsonb),
    'transactions', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.transactions t WHERE t.order_id = p_order_id), '[]'::jsonb)
  );

  INSERT INTO public.deleted_records(entity_type, entity_id, data, deleted_by, reason)
  VALUES ('order', p_order_id, v_snapshot, auth.uid(), NULLIF(BTRIM(p_reason), ''));

  FOR v_transaction IN
    SELECT * FROM public.transactions WHERE order_id = p_order_id FOR UPDATE
  LOOP
    IF v_transaction.type = 'income' THEN
      UPDATE public.accounts SET balance = balance - v_transaction.amount WHERE id = v_transaction.account_id;
    ELSIF v_transaction.type = 'expense' THEN
      UPDATE public.accounts SET balance = balance + v_transaction.amount WHERE id = v_transaction.account_id;
    ELSIF v_transaction.type = 'transfer' THEN
      UPDATE public.accounts SET balance = balance + v_transaction.amount WHERE id = v_transaction.account_id;
      UPDATE public.accounts SET balance = balance - v_transaction.amount WHERE id = v_transaction.to_account_id;
    END IF;
  END LOOP;

  DELETE FROM public.transactions WHERE order_id = p_order_id;

  UPDATE public.notifications SET order_id = NULL WHERE order_id = p_order_id;
  DELETE FROM public.seamstress_payments WHERE order_id = p_order_id;
  DELETE FROM public.orders WHERE id = p_order_id;

  INSERT INTO public.audit_log(user_id, user_name, action, details, entity_type, entity_id)
  VALUES (
    auth.uid(), (SELECT name FROM public.profiles WHERE id = auth.uid()),
    'order_deleted',
    'Удалён заказ №' || v_order.number || '. Причина: ' || COALESCE(NULLIF(BTRIM(p_reason), ''), 'не указана'),
    'order', p_order_id
  );

  RETURN jsonb_build_object('ok', true, 'number', v_order.number);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_order(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_order(UUID, TEXT) TO authenticated;
