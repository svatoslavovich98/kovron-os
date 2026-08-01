-- KOVRON OS — Создание профилей сотрудников
-- ═══════════════════════════════════════════
-- ВАЖНО: запускать ПОСЛЕ того, как:
--   1) выполнен schema.sql
--   2) выполнен functions.sql
--   3) в Supabase Dashboard → Authentication → Users созданы пользователи
--      с email-адресами (см. таблицу ниже) и включённым "Auto Confirm User".
--
-- Email-адреса для создания в Authentication → Add user:
--   ilya@kovron.local     (пароль на твой выбор) — Администратор
--   artem@kovron.local    (пароль на твой выбор) — Редактор
--   ksyusha@kovron.local  (пароль на твой выбор) — Редактор
--   oksana@kovron.local   (пароль на твой выбор) — Швея
--
-- Этот скрипт находит созданных пользователей по email и создаёт
-- для них профили с нужными ролями. Логин в приложении = часть
-- email до "@" (ilya, artem, ksyusha, oksana).
-- ═══════════════════════════════════════════

INSERT INTO profiles (id, name, login, role, active)
SELECT id, 'Илья', 'ilya', 'admin', true
FROM auth.users WHERE email = 'ilya@kovron.local'
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, login = EXCLUDED.login,
      role = EXCLUDED.role, active = EXCLUDED.active;

INSERT INTO profiles (id, name, login, role, active)
SELECT id, 'Артём', 'artem', 'editor', true
FROM auth.users WHERE email = 'artem@kovron.local'
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, login = EXCLUDED.login,
      role = EXCLUDED.role, active = EXCLUDED.active;

INSERT INTO profiles (id, name, login, role, active)
SELECT id, 'Ксюша', 'ksyusha', 'editor', true
FROM auth.users WHERE email = 'ksyusha@kovron.local'
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, login = EXCLUDED.login,
      role = EXCLUDED.role, active = EXCLUDED.active;

INSERT INTO profiles (id, name, login, role, active)
SELECT id, 'Оксана', 'oksana', 'seamstress', true
FROM auth.users WHERE email = 'oksana@kovron.local'
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, login = EXCLUDED.login,
      role = EXCLUDED.role, active = EXCLUDED.active;

-- Проверка: показать созданные профили
SELECT p.login, p.name, p.role, p.active, u.email
FROM profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY p.role;
