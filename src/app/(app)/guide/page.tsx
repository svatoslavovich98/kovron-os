"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { GuideSimulator } from "@/components/guide-simulator";
import {
  BookOpen, Wallet, HandCoins, ShoppingBag, XCircle, ShieldCheck,
  AlertTriangle, LifeBuoy, ChevronDown, Users, DatabaseBackup,
  Search, Check, X, Sparkles,
} from "lucide-react";

type Key =
  | "payout" | "create" | "receive" | "cancel"
  | "finance" | "limits" | "mistakes" | "roles" | "admin";

const STORAGE = "kovron-guide-read";

const meta: { key: Key; title: string; sub: string; icon: typeof BookOpen; accent?: boolean; words: string }[] = [
  { key: "payout", title: "Как платить Оксане и китайцам", sub: "Самое важное", icon: HandCoins, accent: true,
    words: "выплатить оксане китайцам подрядчик расчёт доплатить деньги списать" },
  { key: "create", title: "Как создать заказ", sub: "Семь шагов", icon: ShoppingBag,
    words: "новый заказ клиент автомобиль комплект фото предоплата стоимость" },
  { key: "receive", title: "Как принять деньги от клиента", sub: "Оплата и остаток", icon: Wallet,
    words: "получить оплату предоплата остаток клиент заплатил касса" },
  { key: "cancel", title: "Как отменить заказ", sub: "Возврат и выплаты", icon: XCircle,
    words: "отмена отменить возврат вернуть деньги клиенту" },
  { key: "finance", title: "Что означают цифры в финансах", sub: "Разбор показателей", icon: Wallet,
    words: "финансы баланс касса прибыль заработали долг обязательства" },
  { key: "limits", title: "Чего программа не даст сделать", sub: "Защита от ошибок", icon: ShieldCheck,
    words: "ошибка запрет нельзя минус защита блокировка" },
  { key: "mistakes", title: "Частые ошибки", sub: "Что делать, если", icon: AlertTriangle,
    words: "не сохраняется не грузится фото минусовая прибыль проблема" },
  { key: "roles", title: "Кто что может", sub: "Права сотрудников", icon: Users,
    words: "права роли илья артём ксюша оксана админ редактор" },
  { key: "admin", title: "Проверка и резервные копии", sub: "Только для админа", icon: DatabaseBackup,
    words: "резервная копия бэкап восстановление проверка целостность" },
];

export default function GuidePage() {
  const [open, setOpen] = useState<Key | null>(null);
  const [read, setRead] = useState<Set<Key>>(new Set());
  const [query, setQuery] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) || "[]") as Key[];
      setRead(new Set(saved));
    } catch { /* первый запуск */ }
  }, []);

  const markRead = (key: Key) => {
    setRead(prev => {
      const next = new Set(prev);
      next.add(key);
      try { localStorage.setItem(STORAGE, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const toggle = (key: Key) => {
    setOpen(prev => {
      if (prev === key) return null;
      markRead(key);
      return key;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return meta;
    return meta.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.sub.toLowerCase().includes(q) ||
      m.words.includes(q)
    );
  }, [query]);

  const progress = Math.round((read.size / meta.length) * 100);

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4 pb-12">
      {/* Шапка */}
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold leading-tight">Инструкция</h1>
          <p className="text-sm text-muted-foreground">Как пользоваться программой</p>
        </div>
      </div>

      {/* Прогресс изучения */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Изучено разделов</span>
          <span className="font-semibold tabular-nums">{read.size} из {meta.length}</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-background overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-500"
               style={{ width: `${progress}%` }} />
        </div>
        {progress === 100 && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-income">
            <Sparkles className="h-3.5 w-3.5" />
            Вы прочитали всю инструкцию
          </p>
        )}
      </div>

      {/* Главное правило */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
        <CardContent className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Главное правило</p>
          <p className="mt-2 text-lg font-bold leading-snug">
            Деньги двигаются в программе только тогда,<br className="hidden sm:block" />
            когда они двигаются в жизни
          </p>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Записали в заказ «китайцам 6 000» — это <b className="text-foreground">план</b>,
            деньги ещё у вас. Спишутся, только когда нажмёте «Выплатить».
            То же с клиентом: пока не нажали «Получить оплату» — денег в кассе нет.
          </p>
        </CardContent>
      </Card>

      {/* Живой пример */}
      <GuideSimulator />

      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Найти в инструкции…" value={query}
               onChange={e => setQuery(e.target.value)} className="pl-10 pr-10" />
        {query && (
          <button onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Разделы */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">Ничего не нашлось</p>
          <p className="mt-1 text-xs text-muted-foreground">Попробуйте другое слово</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(({ key, title, sub, icon: Icon, accent }) => {
            const isOpen = open === key;
            const isRead = read.has(key);
            return (
              <Card key={key} className={cn(
                "overflow-hidden transition-colors",
                accent && !isOpen && "border-primary/30",
                isOpen && "border-primary/50"
              )}>
                <button onClick={() => toggle(key)} className="w-full flex items-center gap-3 p-4 text-left">
                  <div className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                    isOpen ? "bg-primary/15" : accent ? "bg-primary/10" : "bg-background"
                  )}>
                    <Icon className={cn("h-4.5 w-4.5", accent || isOpen ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold truncate">{title}</span>
                      {isRead && <Check className="h-3.5 w-3.5 text-income shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )} />
                </button>
                {isOpen && (
                  <CardContent className="px-4 pb-4 pt-0">
                    <div className="border-t border-border pt-3 animate-fade-in">{content[key]}</div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardContent className="p-4 flex gap-3">
          <LifeBuoy className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Если что-то пошло не так</p>
            <ul className="mt-1.5 space-y-1 text-muted-foreground">
              <li>Не удаляйте заказы и операции — сначала разберитесь</li>
              <li>Ошибочную оплату исправляют <b>возвратом</b>, а не удалением</li>
              <li>Записали не на тот счёт — сделайте перевод между счетами</li>
              <li>Все действия видны в админке → Журнал действий</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Вспомогательные блоки ─────────────────────────── */

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>;
}
function H({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold mt-4 first:mt-0">{children}</p>;
}
function Note({ tone = "info", children }: { tone?: "info" | "warn" | "ok"; children: React.ReactNode }) {
  return (
    <div className={cn(
      "mt-3 rounded-md border p-3 text-sm leading-relaxed",
      tone === "warn" ? "border-warning/40 bg-warning/5"
        : tone === "ok" ? "border-income/30 bg-income/5"
        : "border-border bg-background"
    )}>{children}</div>
  );
}
function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="mt-2 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm">
          <span className="h-5 w-5 shrink-0 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center">
            {i + 1}
          </span>
          <span className="text-muted-foreground leading-relaxed">{item}</span>
        </li>
      ))}
    </ol>
  );
}
function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
          <span className="mt-[7px] h-1 w-1 rounded-full bg-primary shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const content: Record<Key, React.ReactNode> = {
  payout: (
    <>
      <P>
        В карточке заказа есть блок <b className="text-foreground">«Выплаты подрядчикам»</b>.
        Видно, сколько начислено и сколько уже отдано по каждой строке.
      </P>

      <div className="mt-3 rounded-md border border-border bg-background p-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <p className="text-sm flex items-center gap-1.5">Оксане <Check className="h-3.5 w-3.5 text-income" /></p>
            <p className="text-[11px] text-muted-foreground">начислено 1 000 · выплачено 1 000</p>
          </div>
          <span className="text-sm text-muted-foreground">—</span>
          <span className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground">Доплатить</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <p className="text-sm">Китайцам</p>
            <p className="text-[11px] text-muted-foreground">начислено 6 000</p>
          </div>
          <span className="text-sm font-semibold">6 000 ₽</span>
          <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">Выплатить</span>
        </div>
      </div>

      <H>Порядок действий</H>
      <Steps items={[
        "Отдали деньги живьём",
        "Зашли в заказ, нашли строку подрядчика",
        <>Нажали <b className="text-foreground">«Выплатить»</b></>,
        "Проверили сумму — её можно изменить, если платите частями",
        <>Выбрали, <b className="text-foreground">с какого счёта</b> платите</>,
        "Подтвердили",
      ]} />

      <Note tone="ok">
        После выплаты кнопка <b>гаснет и появляется галочка</b> — по этой строке
        рассчитались. Нажать её всё равно можно, если понадобится доплатить.
      </Note>

      <H>Если строк с долгом несколько</H>
      <P>
        Снизу появится кнопка <b className="text-foreground">«Рассчитаться полностью»</b> —
        проводит все выплаты сразу. Так надёжнее: не забудете про вторую.
      </P>

      <H>Важные моменты</H>
      <Bullets items={[
        <><b className="text-foreground">Платить можно до того, как заплатил клиент.</b> Оксана
          сшила — платите, даже если клиент ещё не рассчитался. Программа только напомнит.</>,
        <><b className="text-foreground">Иногда вы никому не платите</b> — просто не нажимайте
          кнопку. Само ничего не спишется.</>,
        <><b className="text-foreground">Доплата сверх начисленного</b> — программа спросит
          подтверждение и поднимет начисление по заказу. Иначе отчёты по прибыли разъедутся.</>,
      ]} />
    </>
  ),

  create: (
    <>
      <P>Кнопка «Новый заказ» — семь шагов.</P>
      <Steps items={[
        <><b className="text-foreground">Клиент.</b> Сначала ищите по телефону. Есть такой — выберите
          его, не создавайте второго.</>,
        <><b className="text-foreground">Автомобиль.</b> У клиента может быть несколько машин.</>,
        <><b className="text-foreground">Комплект.</b> Салон, багажник, верхние коврики.</>,
        <><b className="text-foreground">Фотографии.</b> Вид машины (станет обложкой в списке),
          пол салона до четырёх, раскладка лекал. Не обязательно — можно позже.</>,
        <><b className="text-foreground">Параметры.</b> Комментарий для швеи.</>,
        <><b className="text-foreground">Сроки.</b> Дата, исполнитель, приоритет.</>,
        <><b className="text-foreground">Финансы.</b> Самое важное — ниже.</>,
      ]} />

      <H>Шаг «Финансы»</H>
      <P>Все поля пустые. Заполняйте только то, что есть. Пустое поле = ноль.</P>
      <Bullets items={[
        <><b className="text-foreground">Стоимость заказа</b> — сколько платит клиент всего</>,
        <><b className="text-foreground">Предоплата</b> — сколько отдал прямо сейчас. Не отдал — оставьте пустым</>,
        <><b className="text-foreground">Оксане</b> и <b className="text-foreground">китайцам</b> — сколько им причитается</>,
        <><b className="text-foreground">Материалы, другие расходы</b> — если были</>,
      ]} />

      <Note>
        <b>Предоплата попадёт на счёт сразу</b> — выберите куда.
        Суммы Оксане и китайцам <b>никуда не уйдут</b>: запомнятся как обязательство.
      </Note>
      <Note tone="warn">
        Плановая прибыль внизу отрицательная — проверьте цифры,
        скорее всего забыли указать стоимость.
      </Note>
    </>
  ),

  receive: (
    <>
      <P>Заказ → карточка → кнопка <b className="text-foreground">«Получить оплату»</b>.</P>
      <Bullets items={[
        "Указываете сумму и выбираете счёт",
        "Деньги сразу появляются в кассе и в отчётах",
        "Принимать можно частями",
        "Больше стоимости заказа программа принять не даст",
      ]} />
      <Note tone="warn">
        Менять полученную сумму вручную в заказе нельзя — только через эту кнопку.
        Иначе касса разойдётся с заказами.
      </Note>
    </>
  ),

  cancel: (
    <>
      <P>Заказ → статус → <b className="text-foreground">«Отменён»</b>. Появится окно с двумя вещами:</P>
      <Bullets items={[
        <><b className="text-foreground">Возврат клиенту</b> — вся полученная сумма вернётся автоматически</>,
        <><b className="text-foreground">«Кому всё равно платим?»</b> — галочки на Оксану и китайцев</>,
      ]} />
      <Note>
        Отмечайте только тех, кому реально отдали деньги. Оксана успела сшить —
        ставите галочку на неё, китайцам не ставите. Неотмеченное вернётся в кассу.
      </Note>
    </>
  ),

  finance: (
    <>
      <H>Сейчас есть на руках</H>
      <P>Реальные деньги по счетам. Обязательства подрядчикам сюда <b className="text-foreground">не входят</b>.</P>

      <H>Фактическое движение за период</H>
      <Bullets items={[
        <><b className="text-foreground">Поступило</b> — реально полученные деньги</>,
        <><b className="text-foreground">Потрачено</b> — реально отданные</>,
        <><b className="text-foreground">Заработали</b> — разница</>,
      ]} />

      <H>Ожидания по заказам</H>
      <P>Это ещё <b className="text-foreground">не деньги</b>: сумма заказов, долг клиентов, получено по заказам.</P>

      <H>Предстоит отдать подрядчикам</H>
      <P>Сколько ещё должны Оксане и китайцам. Строка «Останется» — итог, если все рассчитаются.</P>
      <Note>Отменённые заказы из расчётов исключены.</Note>

      <H>Ручные доходы и расходы</H>
      <P>
        Финансы → «Доход», «Расход», «Перевод». Сюда вносится всё, что не связано
        с заказами: аренда, реклама, ремонт, налоги, связь. Обязательно выбирайте
        категорию — иначе расход не попадёт в аналитику.
      </P>
    </>
  ),

  limits: (
    <>
      <P>Заблокировано на уровне базы — не получится, даже если очень захотеть:</P>
      <Bullets items={[
        "Принять с клиента больше стоимости заказа",
        "Выплатить подрядчику больше начисленного без подтверждения",
        "Вернуть клиенту больше, чем он заплатил",
        "Уйти в минус по счёту",
        "Записать отрицательную или нулевую сумму",
        "Снизить стоимость заказа ниже уже полученного",
        "Снизить начисление ниже уже выплаченного",
        "Перевести деньги со счёта на него же",
      ]} />
      <Note tone="ok">
        Увидели ошибку — программа не сломалась, она защищает цифры.
        Прочитайте текст, там написано, что именно не так.
      </Note>
    </>
  ),

  mistakes: (
    <>
      <H>«Записал расход китайцам, а деньги не списались»</H>
      <P>Так и должно быть. Сумма в заказе — это план. Нажмите «Выплатить».</P>
      <H>«Изменил предоплату в заказе, а в финансах ничего»</H>
      <P>Предоплата меняется только через «Получить оплату».</P>
      <H>«Создал заказ, а прибыль минусовая»</H>
      <P>Проверьте стоимость — скорее всего, забыли её указать.</P>
      <H>«Не сохраняется заказ»</H>
      <P>
        Черновик не пропадёт. Проверьте интернет и нажмите «Создать заказ» ещё раз —
        дубля не будет, программа узнает заказ по черновику.
      </P>
      <H>«Фотография не грузится»</H>
      <P>
        Подождите — файл сжимается. Если через 25 секунд ошибка, проверьте связь.
        Заказ сохранится и без фото.
      </P>
    </>
  ),

  roles: (
    <Bullets items={[
      <><b className="text-foreground">Илья</b> — всё: заказы, финансы, сотрудники, настройки, резервные копии</>,
      <><b className="text-foreground">Артём, Ксюша</b> — заказы, клиенты, финансы, приём оплат и выплаты</>,
      <><b className="text-foreground">Оксана</b> — вход закрыт, но остаётся исполнителем в заказах для расчётов</>,
    ]} />
  ),

  admin: (
    <>
      <P>Доступно только Илье.</P>
      <H>Проверка финансов</H>
      <P>
        Админка → Настройки. Сверяет заказы с кассой и выплаты с начислениями.
        Должно быть «Расхождений нет».
      </P>
      <H>Резервные копии</H>
      <P>
        Админка → Резервные копии. Копия снимается автоматически каждый день в 03:30.
        Хранятся 30 последних, все ручные и по одной на каждый месяц.
      </P>
      <Note>
        Перед восстановлением программа сама сохраняет текущее состояние —
        восстановили не то, откатите обратно.
      </Note>
    </>
  ),
};
