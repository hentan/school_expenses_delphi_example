# Architecture — School Expenses (Delphi)

Обзор архитектуры проекта `SchoolExpensesDemo` — VCL-приложения для учёта
школьных расходов (поступления от родителей и траты класса).

## Технологический стек

- **Язык:** Object Pascal (Delphi)
- **GUI:** VCL (Visual Component Library)
- **Доступ к данным:** FireDAC (драйвер `MSSQL`)
- **СУБД:** Microsoft SQL Server (локальный, `localhost`)
- **Целевая платформа:** Win64

## Схема базы данных

Приложение подключается к базе **`foura`** (см. [`localhost_sqlserver.sql`](localhost_sqlserver.sql:1)).
Создание таблиц и триггеров выполняется миграцией при старте приложения.

### Таблицы

| Таблица | Назначение | Ключевые поля |
|---|---|---|
| `parents_and_children` | Справочник учеников и родителей | `id` (PK), `children_name`, `parent_name`, `phone`, `after_lesson` |
| `money_from_parents` | Поступления денег от родителей | `id` (= id ученика), `children_name`, `summ_to_first_november` |
| `money_from_parents_arc` | Архив поступлений (после DELETE/UPDATE) | `children_name`, `summ_to_first_november`, `id`, `date_ins` (DEFAULT GETDATE()) |
| `outlay` | Расходы | `id` (IDENTITY PK), `date_purchaise`, `item_name`, `customer` (→ id ученика), `summ` |
| `outlay_arc` | Архив расходов (после DELETE) | `id`, `date_purchaise`, `item_name`, `customer`, `summ` |

### Триггеры

| Триггер | Событие | Действие |
|---|---|---|
| `money_from_parents_delete` | AFTER DELETE | Копирует удалённую строку в `money_from_parents_arc` |
| `money_from_parents_update` | AFTER UPDATE | Копирует старую версию строки в `money_from_parents_arc` |
| `delete_from_outlay` | AFTER DELETE | Копирует удалённую строку в `outlay_arc` |

> Триггеры создаются через `CREATE OR ALTER TRIGGER` (SQL Server 2016 SP1+),
> т.к. `CREATE TRIGGER` не может быть в одном батче с `IF`.

## Слои приложения

```
┌─────────────────────────────────────────────┐
│  VCL-формы (presentation)                    │
│  uMainForm, uUpdatePupilForm,                │
│  uUpdatePaymentForm, uUpdateExenseForm,      │
│  uBaseEditForm                               │
├─────────────────────────────────────────────┤
│  Данные грида (query layer)                  │
│  uMainData                                   │
├─────────────────────────────────────────────┤
│  Репозитории (business data access)          │
│  uRepositories                               │
├─────────────────────────────────────────────┤
│  Сервисы (business logic)                    │
│  uServices                                   │
├─────────────────────────────────────────────┤
│  БД + миграции (infrastructure)              │
│  uDb, uMigrations                            │
└─────────────────────────────────────────────┘
```

### uDb
[`uDb.pas`](uDb.pas:1) — класс `TSchoolDb`. Создаёт `TFDConnection`,
подключается к SQL Server (Windows-аутентификация, `OSAuthent=Yes`).
Порядок подключения: сначала соединение без указания `Database` (к `master`),
затем `IF DB_ID(...) IS NULL CREATE DATABASE`, затем переподключение к `foura`.
После — запускает миграцию.

### uMigrations
[`uMigrations.pas`](uMigrations.pas:1) — `TSchoolDbMigrator.Migrate`.
Создаёт таблицы и триггеры (идемпотентно: `IF OBJECT_ID ... IS NULL` для таблиц,
`CREATE OR ALTER` для триггеров). Весь набор DDL обёрнут в одну транзакцию:
при ошибке откат, чтобы схема не осталась в промежуточном состоянии.

### uRepositories
[`uRepositories.pas`](uRepositories.pas:1) — репозитории CRUD. Базовый класс
`TRepository` хранит `FConnection`. Каждый репозиторий реализует интерфейс
(`IPupilRepository` / `IPaymentRepository` / `IExpenseRepository`), что позволяет
сервисам зависеть от абстракций, а не от конкретных классов.
- `TPupilRepository` → `parents_and_children` (+ `ListForCombo` для выпадающих списков)
- `TPaymentRepository` → `money_from_parents` (+ `Total: Currency`)
- `TExpenseRepository` → `outlay` (+ `Total: Currency`, `Update` меняет `customer`)

Репозитории выполняют **только запись/чтение** — без валидации и UI-текстов.
Бизнес-правила и валидация живут в сервисном слое. Денежные суммы — `Currency`
(копейки не теряются, `outlay.summ` — `DECIMAL(7,2)`).

### uServices
[`uServices.pas`](uServices.pas:1) — сервисный слой бизнес-логики.
- `EValidationException` — доменное исключение с сообщением для пользователя.
- `TPupilService` / `TPaymentService` / `TExpenseService` — обёртки над
  интерфейсами репозиториев: валидируют входные данные (`AId > 0`, непустые
  строки, сумма `> 0`), при нарушении бросают `EValidationException`, затем
  делегируют репозиторию.
- `TBalanceService.Balance: Currency` = `payments.Total - expenses.Total`.

Формы работают только с сервисами, а не с репозиториями напрямую.

### uMainData
[`uMainData.pas`](uMainData.pas:1) — `TMainData`. Хранит 5 `TFDQuery`
(ученики, поступления, расходы, архив поступлений, архив расходов) и
`TDataSource` для каждого. Архив разделён на два отдельных запроса
(раньше был `UNION ALL` с heterogeneous данными). Имена полей БД
инкапсулированы: форма обращается к данным через методы-обёртки
(`CurrentPupilId`, `CurrentPaymentSum`, `PupilNameById` и т.п.), не зная
схемы напрямую.

### uUiHelpers
[`uUiHelpers.pas`](uUiHelpers.pas:1) — вспомогательные функции:
`TodayIso` (формат `yyyy-mm-dd`), работа с комбобоксами учеников
(`AddPupilComboItem`, `GetComboPupilId`, `SelectComboPupilId`),
`SetFieldLayout`, `DisconnectQuery`.

## Формы

### uMainForm
[`uMainForm.pas`](uMainForm.pas:1) — главная форма с `TPageControl`:
- **Ученики** — грид + панель добавления (ФИО, после уроков, родитель, телефон)
- **Сданные деньги** — грид + панель (ученик из списка + сумма)
- **Потраченные деньги** — грид + панель (ученик, дата, назначение, сумма)
- **Архив** — два грида (архив поступлений + архив расходов) со сплиттером

Форма не создаёт зависимости сама — все сервисы и `TMainData` передаются через
метод `Init` после создания формы в точке входа (composition root в `.dpr`). В
обработчиках кликов вызовы сервисов обёрнуты в `try/except`: `EValidationException`
показывает локализованное сообщение, прочие исключения — с префиксом «Ошибка: ».
Удаления требуют подтверждения через `MessageDlg`. Статус-строка показывает суммы в
денежном формате (`%m`).

Двойной клик по гриду открывает форму редактирования.

### uBaseEditForm
[`uBaseEditForm.pas`](uBaseEditForm.pas:1) — базовая форма с 3 Edit,
кнопками ОК/Отмена, виртуальными методами `ApplyCaption/ApplyHints/ApplyLabels`,
`Validate`, `ValidateSum`, `GetPupilId` (виртуальный — наследники с `PupilCombo`
переопределяют). Сумма — `Currency` (через `TryStrToCurr`).

### uUpdatePupilForm
[`uUpdatePupilForm.pas`](uUpdatePupilForm.pas:1) — независимая форма (`TForm`):
4 поля: ФИО ученика, родитель, телефон, после уроков.

### uUpdatePaymentForm
[`uUpdatePaymentForm.pas`](uUpdatePaymentForm.pas:1) — наследник `TBaseEditForm`.
Добавлен `PupilCombo` (выпадающий список учеников). Edit1/Edit2 скрыты.
`Validate` и `GetPupilId` переопределены.

### uUpdateExenseForm
[`uUpdateExenseForm.pas`](uUpdateExenseForm.pas:1) — наследник `TBaseEditForm`.
Добавлен `PupilCombo` (кто платил). Поля: дата покупки, на что потрачено, сумма.
`Validate` переопределён: проверяет выбор ученика + inherited (дата/назначение/сумма).

## Composition root

Точка входа [`SchoolExpensesDemo.dpr`](SchoolExpensesDemo.dpr:1) создаёт весь
граф зависимостей: `TSchoolDb` → репозитории → сервисы → `TMainData`, затем
`Application.CreateForm(TMainForm, MainForm)` и `MainForm.Init(PupilSvc, ...)`.
Владельцем всех зависимостей является `.dpr` (освобождение в `finally` после
`Application.Run`), форма их не освобождает.

`TRepository` наследуется от `TObject` и реализует `IInterface` заглушками
`QueryInterface`/`_AddRef`/`_Release` без подсчёта ссылок (как `TComponent`) —
время жизни репозиториев управляется вручную через `Free` в `.dpr`, интерфейсные
ссылки сервисов не владеют объектами.

## Поток данных при редактировании

1. Двойной клик по гриду → создаётся форма редактирования
2. `PopulateCombo` заполняет выпадающий список через `TPupilService.ListForCombo`
3. `SelectComboPupilId` выбирает текущего плательщика
4. После ОК форма возвращает выбранное ФИО/id → сервис валидирует и
   делегирует репозиторию `UPDATE`

## Кодировка файлов

Все `.pas` и `.dfm` файлы сохранены в **UTF-8 с BOM**.
Delphi без BOM интерпретирует исходники в системной ANSI-кодировке (Windows-1251),
что ломает кириллицу. При создании новых файлов обязательно добавляйте BOM.

## Сборка

- Открыть `SchoolExpensesDemo.dproj` в Delphi IDE (Rad Studio 12.2 / 23.0)
- Конфигурация: Debug, платформа Win64
- Запуск (F9) — при старте подключается к `foura` и выполняет миграцию
