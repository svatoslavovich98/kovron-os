"use client";

import { useState, useEffect, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { formatDateTime, getRoleLabel, cn } from "@/lib/utils";
import type { Account, Category, OrderStatusConfig, User, UserRole } from "@/lib/types";
import type { AdminAccountInput, AdminCategoryInput, AdminStatusInput, AdminUserInput } from "@/lib/data-context";
import { useData } from "@/lib/data-context";
import { kitLabels } from "@/lib/demo-data";
import { isSupabaseMode } from "@/lib/supabase";
import {
  Users, Tag, CreditCard, Palette, Package, Settings, Clock, Plus,
  Edit2, AlertTriangle, Download, X, Loader2, CheckCircle2, ShieldCheck,
  DatabaseBackup, RotateCcw, Save,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";

type AdminSection = "users" | "statuses" | "categories" | "accounts" | "catalogs" | "audit" | "backups" | "settings";
type EditorState =
  | { kind: "user"; item: User | null }
  | { kind: "status"; item: OrderStatusConfig | null }
  | { kind: "category"; item: Category | null; categoryType: "income" | "expense" }
  | { kind: "account"; item: Account | null };

const sections: { key: AdminSection; label: string; icon: typeof Users }[] = [
  { key: "users", label: "Пользователи", icon: Users },
  { key: "statuses", label: "Статусы заказов", icon: Tag },
  { key: "categories", label: "Категории", icon: Package },
  { key: "accounts", label: "Счета", icon: CreditCard },
  { key: "catalogs", label: "Каталоги", icon: Palette },
  { key: "audit", label: "Журнал действий", icon: Clock },
  { key: "backups", label: "Резервные копии", icon: DatabaseBackup },
  { key: "settings", label: "Настройки", icon: Settings },
];

export default function AdminPage() {
  const { user } = useAuth();
  const appData = useData();
  const [activeSection, setActiveSection] = useState<AdminSection>("users");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [notice, setNotice] = useState("");

  if (!user || user.role !== "admin") {
    return <div className="p-6 text-center"><AlertTriangle className="h-12 w-12 text-expense mx-auto mb-3" /><p className="text-lg font-semibold">Доступ запрещён</p><p className="text-sm text-muted-foreground mt-1">Раздел доступен только администратору</p></div>;
  }

  const downloadBackup = () => {
    const backup = {
      exportedAt: new Date().toISOString(), version: 1,
      users: appData.users, statuses: appData.statuses, accounts: appData.accounts,
      expenseCategories: appData.expenseCategories, incomeCategories: appData.incomeCategories,
      clients: appData.clients, cars: appData.cars, orders: appData.orders,
      transactions: appData.transactions, seamstressPayments: appData.seamstressPayments,
      auditLog: appData.auditLog,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `kovron-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3"><div><h1 className="text-xl font-bold">Админка</h1><p className="mt-0.5 text-xs text-muted-foreground">Настройки применяются сразу для всех сотрудников</p></div><Button variant="outline" size="sm" onClick={downloadBackup}><Download className="h-4 w-4 mr-1" />Резервная копия</Button></div>

      {notice && <div className="flex items-center gap-2 rounded-md border border-income/30 bg-income/10 px-3 py-2 text-sm text-income"><CheckCircle2 className="h-4 w-4" />{notice}<button className="ml-auto" onClick={() => setNotice("")}><X className="h-4 w-4" /></button></div>}

      <div className="flex lg:gap-6">
        <nav className="hidden lg:block w-56 shrink-0 space-y-1">
          {sections.map((section) => <button key={section.key} onClick={() => setActiveSection(section.key)} className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-sm text-left transition-all", activeSection === section.key ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-card")}><section.icon className="h-4 w-4 shrink-0" />{section.label}</button>)}
        </nav>
        <div className="flex-1 min-w-0">
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
            {sections.map((section) => <button key={section.key} onClick={() => setActiveSection(section.key)} className={cn("shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border", activeSection === section.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground")}>{section.label}</button>)}
          </div>
          <AdminContent section={activeSection} openEditor={setEditor} />
        </div>
      </div>

      {editor && <AdminEditor key={`${editor.kind}-${editor.item?.id || "new"}`} editor={editor} currentUserId={user.id} onClose={() => setEditor(null)} onSaved={(message) => { setEditor(null); setNotice(message); }} />}
    </div>
  );
}

function AdminContent({ section, openEditor }: { section: AdminSection; openEditor: (state: EditorState) => void }) {
  const { users, statuses, expenseCategories, incomeCategories, accounts, auditLog } = useData();

  if (section === "users") return <div className="space-y-3"><SectionHeader title="Пользователи" action="Добавить" onAction={() => openEditor({ kind: "user", item: null })} />{users.map((item) => <Card key={item.id}><CardContent className="p-4 flex items-center gap-3"><Avatar name={item.name} /><div className="min-w-0 flex-1"><p className="font-semibold truncate">{item.name}</p><p className="text-xs text-muted-foreground truncate">@{item.login} · {getRoleLabel(item.role as UserRole)}</p>{item.lastLogin && <p className="text-[10px] text-muted-foreground mt-0.5">Последний вход: {formatDateTime(item.lastLogin)}</p>}</div><Badge variant={item.active ? "default" : "muted"} className="hidden sm:inline-flex">{item.active ? "Активен" : "Заблокирован"}</Badge><EditButton label={`Редактировать ${item.name}`} onClick={() => openEditor({ kind: "user", item })} /></CardContent></Card>)}</div>;

  if (section === "statuses") return <div className="space-y-3"><SectionHeader title="Статусы заказов" action="Новый статус" onAction={() => openEditor({ kind: "status", item: null })} />{[...statuses].sort((a, b) => a.order - b.order).map((item) => <div key={item.id} className="flex items-center gap-3 p-3 rounded-md bg-card border border-border"><div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: item.color }} /><div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{item.label}</p><p className="text-[10px] text-muted-foreground">Ключ: {item.key}</p></div>{item.isFinal && <Badge variant="muted" className="text-[10px]">Финальный</Badge>}<span className="text-xs text-muted-foreground">#{item.order}</span><EditButton label={`Редактировать статус ${item.label}`} onClick={() => openEditor({ kind: "status", item })} /></div>)}</div>;

  if (section === "categories") return <div className="space-y-6"><CategoryGroup title="Категории расходов" type="expense" items={expenseCategories} openEditor={openEditor} /><CategoryGroup title="Категории доходов" type="income" items={incomeCategories} openEditor={openEditor} /></div>;

  if (section === "accounts") return <div className="space-y-3"><SectionHeader title="Счета и кошельки" action="Новый счёт" onAction={() => openEditor({ kind: "account", item: null })} />{accounts.map((item) => <Card key={item.id}><CardContent className="p-4 flex items-center gap-3"><div className="min-w-0 flex-1"><p className="font-semibold truncate">{item.name}</p><p className="text-xs text-muted-foreground">{item.type} · порядок #{item.order}</p></div><Badge variant={item.active ? "default" : "muted"}>{item.active ? "Активен" : "Архив"}</Badge><EditButton label={`Редактировать счёт ${item.name}`} onClick={() => openEditor({ kind: "account", item })} /></CardContent></Card>)}</div>;

  if (section === "catalogs") return <div className="space-y-4"><h2 className="text-lg font-semibold">Каталоги</h2><Card><CardContent className="p-4"><h3 className="text-sm font-semibold mb-3">Виды комплектов</h3><div className="flex flex-wrap gap-2">{Object.values(kitLabels).map((label) => <Badge key={label} variant="outline">{label}</Badge>)}</div><p className="mt-3 text-xs text-muted-foreground">Это системные виды комплектов. Цвета материала, окантовки и строчки удалены из заказов по вашей настройке.</p></CardContent></Card></div>;

  if (section === "audit") return <div className="space-y-3"><h2 className="text-lg font-semibold">Журнал действий</h2>{auditLog.length === 0 ? <EmptyState text="Действий пока нет" /> : auditLog.map((entry) => <div key={entry.id} className="flex items-start gap-3 p-3 rounded-md bg-card border border-border"><div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><span className="text-xs font-bold text-primary">{entry.userName[0]}</span></div><div className="flex-1 min-w-0"><p className="text-sm">{entry.details}</p><p className="text-[10px] text-muted-foreground mt-0.5">{entry.userName} · {formatDateTime(entry.timestamp)}</p></div></div>)}</div>;

  if (section === "backups") return <BackupsSection />;

  return <div className="space-y-4"><h2 className="text-lg font-semibold">Настройки</h2><IntegrityCheck /><Card><CardContent className="p-4 space-y-4"><SettingRow label="Режим данных" value={isSupabaseMode ? "Рабочая база Supabase" : "Демо-данные"} /><SettingRow label="Часовой пояс" value="UTC+7 (Барнаул)" /><SettingRow label="Валюта" value="Российский рубль (₽)" /><SettingRow label="Формат даты" value="ДД.ММ.ГГГГ" /></CardContent></Card><div className="rounded-md border border-primary/20 bg-primary/5 p-4 text-sm"><div className="flex gap-2"><ShieldCheck className="h-5 w-5 shrink-0 text-primary" /><div><p className="font-semibold">Изменения защищены правами администратора</p><p className="mt-1 text-xs text-muted-foreground">Менеджеры и Оксана не могут менять пользователей, статусы, категории и счета.</p></div></div></div></div>;
}

type BackupRow = {
  id: string;
  created_at: string;
  kind: string;
  note: string | null;
  row_counts: Record<string, number>;
  size_bytes: number | null;
};

type IntegrityRow = { проблема: string; деталь: string; серьёзность: string };

/** Постоянная проверка: находит любые расхождения в деньгах. */
function IntegrityCheck() {
  const [rows, setRows] = useState<IntegrityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const run = async () => {
    const sb = getSupabase();
    if (!sb) { setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await sb.rpc("check_finance_integrity");
    if (err) setError(err.message);
    else { setRows((data || []) as IntegrityRow[]); setError(""); }
    setLoading(false);
  };

  useEffect(() => { void run(); }, []);

  const critical = rows.filter(r => r.серьёзность === "критично");
  const warnings = rows.filter(r => r.серьёзность !== "критично");

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Проверка финансов</h3>
            <p className="text-xs text-muted-foreground">
              Сверяет заказы, кассу и выплаты между собой
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void run()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Проверить"}
          </Button>
        </div>

        {error && <p className="mt-3 text-sm text-expense">{error}</p>}

        {!loading && !error && rows.length === 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-income/30 bg-income/10 p-3">
            <CheckCircle2 className="h-5 w-5 text-income shrink-0" />
            <p className="text-sm text-income">Расхождений нет — всё сходится</p>
          </div>
        )}

        {critical.length > 0 && (
          <div className="mt-3 space-y-2">
            {critical.map((r, i) => (
              <div key={i} className="rounded-md border border-expense/40 bg-expense/5 p-3">
                <p className="text-sm font-semibold text-expense">{r.проблема}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.деталь}</p>
              </div>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mt-3 space-y-2">
            {warnings.map((r, i) => (
              <div key={i} className="rounded-md border border-warning/40 bg-warning/5 p-3">
                <p className="text-sm font-semibold">{r.проблема}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.деталь}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BackupsSection() {
  const [items, setItems] = useState<BackupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = async () => {
    const sb = getSupabase();
    if (!sb) { setLoading(false); return; }
    const { data, error } = await sb.rpc("admin_list_backups");
    if (error) setMessage({ tone: "err", text: error.message });
    else setItems((data || []) as BackupRow[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const createNow = async () => {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true); setMessage(null);
    const { error } = await sb.rpc("admin_create_backup", { p_note: "Копия вручную из админки" });
    setBusy(false);
    if (error) setMessage({ tone: "err", text: error.message });
    else { setMessage({ tone: "ok", text: "Копия создана" }); void load(); }
  };

  const restore = async (id: string) => {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true); setMessage(null); setConfirmId(null);
    const { error } = await sb.rpc("admin_restore_backup", { p_snapshot: id });
    setBusy(false);
    if (error) { setMessage({ tone: "err", text: error.message }); return; }
    setMessage({ tone: "ok", text: "Данные восстановлены. Перезагрузите страницу." });
    void load();
  };

  const kindLabel = (k: string) =>
    k === "auto" ? "Автоматическая" : k === "manual" ? "Вручную" : "Перед восстановлением";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Резервные копии</h2>
          <p className="text-sm text-muted-foreground">
            Копия снимается автоматически каждый день в 03:30
          </p>
        </div>
        <Button size="sm" onClick={() => void createNow()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Создать сейчас
        </Button>
      </div>

      {message && (
        <div className={cn("rounded-md border p-3 text-sm",
          message.tone === "ok" ? "border-income/30 bg-income/10 text-income" : "border-expense/30 bg-expense/10 text-expense")}>
          {message.text}
        </div>
      )}

      <div className="rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
        Хранятся 30 последних ежедневных копий, все ручные и по одной на каждый месяц.
        При восстановлении текущее состояние сохраняется отдельной копией — откатить можно и само восстановление.
      </div>

      {loading ? (
        <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <EmptyState text="Копий пока нет" />
      ) : (
        <div className="space-y-2">
          {items.map((b) => (
            <div key={b.id} className="rounded-md border border-border bg-card p-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{formatDateTime(b.created_at)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {kindLabel(b.kind)}
                    {b.row_counts && ` · ${b.row_counts.orders} заказов, ${b.row_counts.clients} клиентов, ${b.row_counts.transactions} операций`}
                    {b.size_bytes ? ` · ${Math.max(1, Math.round(b.size_bytes / 1024))} КБ` : ""}
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => setConfirmId(b.id)}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Восстановить
                </Button>
              </div>

              {confirmId === b.id && (
                <div className="mt-3 rounded-md border border-expense/40 bg-expense/5 p-3">
                  <div className="flex gap-2">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-expense" />
                    <div className="text-sm">
                      <p className="font-semibold">Заменить текущие данные копией от {formatDateTime(b.created_at)}?</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Заказы, клиенты, автомобили и финансы будут заменены. Сотрудники и настройки не затрагиваются.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmId(null)}>Отмена</Button>
                    <Button size="sm" className="flex-1 bg-expense text-white hover:bg-expense/90"
                            disabled={busy} onClick={() => void restore(b.id)}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Восстановить"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryGroup({ title, type, items, openEditor }: { title: string; type: "income" | "expense"; items: Category[]; openEditor: (state: EditorState) => void }) {
  return <div><SectionHeader title={title} action="Добавить" onAction={() => openEditor({ kind: "category", item: null, categoryType: type })} /><div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">{items.map((item) => <div key={item.id} className={cn("flex items-center gap-2 p-3 rounded-md bg-card border", item.active ? "border-border" : "border-dashed border-border opacity-60")}><div className="h-8 w-8 rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: `${item.color}20`, color: item.color }}>{item.name[0]}</div><div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{item.name}</p><p className="text-[10px] text-muted-foreground">{item.active ? "Активна" : "Отключена"} · #{item.order}</p></div><EditButton label={`Редактировать категорию ${item.name}`} onClick={() => openEditor({ kind: "category", item, categoryType: type })} /></div>)}</div></div>;
}

function AdminEditor({ editor, currentUserId, onClose, onSaved }: { editor: EditorState; currentUserId: string; onClose: () => void; onSaved: (message: string) => void }) {
  const data = useData();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isNew = !editor.item;

  const userItem = editor.kind === "user" ? editor.item : null;
  const statusItem = editor.kind === "status" ? editor.item : null;
  const categoryItem = editor.kind === "category" ? editor.item : null;
  const accountItem = editor.kind === "account" ? editor.item : null;

  const [userForm, setUserForm] = useState<AdminUserInput>({ name: userItem?.name || "", login: userItem?.login || "", role: userItem?.role || "editor", active: userItem?.active ?? true, password: "" });
  const [statusForm, setStatusForm] = useState<AdminStatusInput>({ key: statusItem?.key || "", label: statusItem?.label || "", color: statusItem?.color || "#9CA39A", isFinal: statusItem?.isFinal ?? false, order: statusItem?.order || data.statuses.length + 1 });
  const [categoryForm, setCategoryForm] = useState<AdminCategoryInput>({ name: categoryItem?.name || "", type: editor.kind === "category" ? editor.categoryType : "expense", icon: categoryItem?.icon || "Tag", color: categoryItem?.color || "#9CA39A", active: categoryItem?.active ?? true, order: categoryItem?.order || (editor.kind === "category" ? (editor.categoryType === "expense" ? data.expenseCategories.length : data.incomeCategories.length) + 1 : 1), includeInProfit: categoryItem?.includeInProfit ?? true, canLinkOrder: categoryItem?.canLinkOrder ?? false, requireComment: categoryItem?.requireComment ?? false, requireReceipt: categoryItem?.requireReceipt ?? false });
  const [accountForm, setAccountForm] = useState<AdminAccountInput>({ name: accountItem?.name || "", type: accountItem?.type || "cash", icon: accountItem?.icon || "Wallet", active: accountItem?.active ?? true, showInTotal: accountItem?.showInTotal ?? true, order: accountItem?.order || data.accounts.length + 1 });

  const title = editor.kind === "user" ? `${isNew ? "Добавить" : "Редактировать"} пользователя` : editor.kind === "status" ? `${isNew ? "Создать" : "Редактировать"} статус` : editor.kind === "category" ? `${isNew ? "Добавить" : "Редактировать"} категорию` : `${isNew ? "Создать" : "Редактировать"} счёт`;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    let result;
    if (editor.kind === "user") result = await data.saveAdminUser(editor.item?.id || null, userForm);
    else if (editor.kind === "status") result = await data.saveAdminStatus(editor.item?.id || null, statusForm);
    else if (editor.kind === "category") result = await data.saveAdminCategory(editor.item?.id || null, categoryForm);
    else result = await data.saveAdminAccount(editor.item?.id || null, accountForm);
    setSaving(false);
    if (!result.success) return setError(result.error || "Не удалось сохранить");
    onSaved(`${title}: сохранено`);
  };

  return <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"><button className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-label="Закрыть окно" /><form onSubmit={submit} className="relative max-h-[92vh] w-full sm:max-w-lg overflow-y-auto rounded-t-2xl sm:rounded-xl border border-border bg-card p-5 pb-24 sm:pb-5 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">Управление KOVRON OS</p><h2 className="text-xl font-bold">{title}</h2></div><button type="button" onClick={onClose} className="p-2 text-muted-foreground" aria-label="Закрыть редактор"><X className="h-5 w-5" /></button></div><div className="mt-5 space-y-4">{editor.kind === "user" && <UserFields value={userForm} onChange={setUserForm} isNew={isNew} isSelf={editor.item?.id === currentUserId} />}{editor.kind === "status" && <StatusFields value={statusForm} onChange={setStatusForm} isNew={isNew} />}{editor.kind === "category" && <CategoryFields value={categoryForm} onChange={setCategoryForm} />}{editor.kind === "account" && <AccountFields value={accountForm} onChange={setAccountForm} />}</div>{error && <div className="mt-4 rounded-md border border-expense/30 bg-expense/10 p-3 text-sm text-expense">{error}</div>}<div className="mt-5 flex gap-2"><Button type="button" variant="outline" className="flex-1" onClick={onClose}>Отмена</Button><Button type="submit" className="flex-1" disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Сохранение…</> : "Сохранить"}</Button></div></form></div>;
}

function UserFields({ value, onChange, isNew, isSelf }: { value: AdminUserInput; onChange: (value: AdminUserInput) => void; isNew: boolean; isSelf: boolean }) {
  return <><Field label="Имя сотрудника"><Input required minLength={2} value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} /></Field><Field label="Логин"><Input required minLength={3} autoCapitalize="none" value={value.login} onChange={(event) => onChange({ ...value, login: event.target.value.replace(/\s/g, "").toLowerCase() })} /><p className="mt-1 text-[11px] text-muted-foreground">Латинские буквы и цифры, например oksana</p></Field><Field label="Пароль"><Input required={isNew} minLength={6} type="password" autoComplete="new-password" placeholder={isNew ? "Минимум 6 символов" : "Оставьте пустым, чтобы не менять"} value={value.password || ""} onChange={(event) => onChange({ ...value, password: event.target.value })} /></Field><Field label="Роль"><select disabled={isSelf} value={value.role} onChange={(event) => onChange({ ...value, role: event.target.value as UserRole })} className="h-12 w-full rounded-sm border border-border bg-background px-3 text-sm"><option value="admin">Администратор — полный доступ</option><option value="editor">Менеджер — заказы и клиенты</option><option value="seamstress">Швея — только своё производство</option></select></Field><SwitchRow label="Учётная запись активна" description={isSelf ? "Свою учётную запись нельзя заблокировать" : "Отключённый сотрудник не сможет войти"} checked={value.active} disabled={isSelf} onChange={(active) => onChange({ ...value, active })} /></>;
}

function StatusFields({ value, onChange, isNew }: { value: AdminStatusInput; onChange: (value: AdminStatusInput) => void; isNew: boolean }) {
  return <><Field label="Название"><Input required value={value.label} onChange={(event) => onChange({ ...value, label: event.target.value })} /></Field><Field label="Системный ключ"><Input required disabled={!isNew} value={value.key} placeholder="например: quality_check" onChange={(event) => onChange({ ...value, key: event.target.value.replace(/[^a-z0-9_]/g, "").toLowerCase() })} /><p className="mt-1 text-[11px] text-muted-foreground">После создания ключ не меняется, чтобы не повредить заказы</p></Field><div className="grid grid-cols-2 gap-3"><Field label="Цвет"><Input type="color" className="p-2" value={value.color} onChange={(event) => onChange({ ...value, color: event.target.value })} /></Field><Field label="Порядок"><Input required min={1} type="number" value={value.order} onChange={(event) => onChange({ ...value, order: Number(event.target.value) })} /></Field></div><SwitchRow label="Финальный статус" description="Не показывать заказы с этим статусом среди активных" checked={value.isFinal} onChange={(isFinal) => onChange({ ...value, isFinal })} /></>;
}

function CategoryFields({ value, onChange }: { value: AdminCategoryInput; onChange: (value: AdminCategoryInput) => void }) {
  return <><Field label="Название"><Input required value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Тип"><select value={value.type} onChange={(event) => onChange({ ...value, type: event.target.value as "income" | "expense" })} className="h-12 w-full rounded-sm border border-border bg-background px-3 text-sm"><option value="expense">Расход</option><option value="income">Доход</option></select></Field><Field label="Порядок"><Input required min={1} type="number" value={value.order} onChange={(event) => onChange({ ...value, order: Number(event.target.value) })} /></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Значок"><Input value={value.icon} onChange={(event) => onChange({ ...value, icon: event.target.value })} /></Field><Field label="Цвет"><Input type="color" className="p-2" value={value.color} onChange={(event) => onChange({ ...value, color: event.target.value })} /></Field></div><SwitchRow label="Категория активна" checked={value.active} onChange={(active) => onChange({ ...value, active })} /><SwitchRow label="Учитывать в прибыли" checked={value.includeInProfit} onChange={(includeInProfit) => onChange({ ...value, includeInProfit })} /><SwitchRow label="Можно привязать к заказу" checked={value.canLinkOrder} onChange={(canLinkOrder) => onChange({ ...value, canLinkOrder })} /><SwitchRow label="Комментарий обязателен" checked={value.requireComment} onChange={(requireComment) => onChange({ ...value, requireComment })} /><SwitchRow label="Чек обязателен" checked={value.requireReceipt} onChange={(requireReceipt) => onChange({ ...value, requireReceipt })} /></>;
}

function AccountFields({ value, onChange }: { value: AdminAccountInput; onChange: (value: AdminAccountInput) => void }) {
  return <><Field label="Название счёта"><Input required value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Тип"><select value={value.type} onChange={(event) => onChange({ ...value, type: event.target.value })} className="h-12 w-full rounded-sm border border-border bg-background px-3 text-sm"><option value="cash">Наличные</option><option value="card">Карта</option><option value="bank">Расчётный счёт</option><option value="other">Другой</option></select></Field><Field label="Порядок"><Input required min={1} type="number" value={value.order} onChange={(event) => onChange({ ...value, order: Number(event.target.value) })} /></Field></div><Field label="Значок"><Input value={value.icon} onChange={(event) => onChange({ ...value, icon: event.target.value })} /></Field><SwitchRow label="Счёт активен" checked={value.active} onChange={(active) => onChange({ ...value, active })} /><SwitchRow label="Показывать в общей сумме" checked={value.showInTotal} onChange={(showInTotal) => onChange({ ...value, showInTotal })} /><p className="rounded-md bg-background p-3 text-xs text-muted-foreground">Баланс счёта меняется только финансовыми операциями, поэтому вручную здесь не редактируется.</p></>;
}

function SectionHeader({ title, action, onAction }: { title: string; action: string; onAction: () => void }) { return <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{title}</h2><Button size="sm" onClick={onAction}><Plus className="h-4 w-4 mr-1" />{action}</Button></div>; }
function EditButton({ label, onClick }: { label: string; onClick: () => void }) { return <button onClick={onClick} className="p-2 hover:bg-background rounded-sm transition-colors" aria-label={label}><Edit2 className="h-4 w-4 text-muted-foreground" /></button>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>{children}</label>; }
function SwitchRow({ label, description, checked, disabled, onChange }: { label: string; description?: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) { return <button type="button" disabled={disabled} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-background p-3 text-left disabled:opacity-60"><div><p className="text-sm font-semibold">{label}</p>{description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}</div><span className={cn("flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors", checked ? "bg-primary" : "bg-muted")}><span className={cn("h-5 w-5 rounded-full bg-white shadow transition-transform", checked && "translate-x-5")} /></span></button>; }
function SettingRow({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground text-right">{value}</p></div>; }
function EmptyState({ text }: { text: string }) { return <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{text}</div>; }
