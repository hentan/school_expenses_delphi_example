# Архитектура SchoolExpensesDemo

Актуальная карта проекта `SchoolExpensesDemo` на Delphi/VCL. Описание сверено с
исходниками в корне проекта и с учебным просмотрщиком `code_explorer`.

Главная мысль: это локальное Windows-приложение без web-сервера. Пользователь
нажимает кнопку в VCL-интерфейсе, код проходит через сервис и репозиторий,
FireDAC отправляет SQL в SQL Server, а результат возвращается через `TFDQuery`,
`TDataSource` и `TDBGrid`.

## 1. Общая схема

```text
                         SchoolExpensesDemo.dpr
                         composition root
                  создаёт и связывает все объекты
                                  |
          +-----------------------+------------------------+
          |                       |                        |
          v                       v                        v
  TSchoolDb + миграции     Репозитории              Сервисы
  uDb/uMigrations          uRepositories             uServices
          |                       |                        |
          |                       +----------+-------------+
          |                                  |
          +--------------------+-------------+
                               v
                       TFDConnection
                               |
                               v
                    Microsoft SQL Server / foura

  Для чтения списков есть отдельная ветка:

  SQL Server -> TFDQuery -> TDataSource -> TDBGrid
                    ^             ^
                    |             |
                 uMainData    UI-фреймы

  Для записи есть другая ветка:

  Кнопка/двойной клик -> Frame -> Service -> Repository -> ExecSQL -> SQL Server
```

У проекта два разных потока работы с данными:

1. **Изменение данных** идёт через `Frame -> Service -> Repository`.
2. **Отображение списков** идёт через `uMainData` и его `TFDQuery`.

Это не ошибка: репозитории отвечают за CRUD-операции, а `uMainData` готовит
наборы данных именно для гридов. Но важно понимать, что `uMainData` не вызывает
репозитории для чтения, а работает с тем же `TFDConnection` напрямую.

## 2. Что такое code_explorer

Каталог `code_explorer` — не часть выполняемого Delphi-приложения и не ещё один
backend. Это статический учебный просмотрщик исходников в браузере.

```text
code_explorer/index.html
          |
          +--> Prism.js: подсветка Pascal-кода
          +--> files/uDb.js, files/uServices.js, ...
          |       в каждом JS-файле хранится Pascal-код как строка
          |       и список пояснений annotations
          +--> app.js: меню, строки, подсказки при наведении
```

`index.html` подключает файлы из `code_explorer/files`, а каждый такой файл
регистрирует данные в `window.LEARN_FILES`. `app.js` берёт эти данные, строит
меню в порядке `uDb -> uMigrations -> uRepositories -> uServices -> ...`,
подсвечивает код и показывает пояснение для выделенного блока.

Исходники, которые реально компилируются, находятся в корне проекта:
`uDb.pas`, `uMigrations.pas`, `uRepositories.pas` и остальные `.pas`. В
`code_explorer` лежит их учебная копия. Если Pascal-файл изменить, JavaScript-
копия сама не обновится.

## 3. Слои и правила зависимостей

```text
┌────────────────────────────────────────────────────────────┐
│ Точка сборки: SchoolExpensesDemo.dpr                       │
│ Создаёт объекты, связывает их и управляет временем жизни.   │
├────────────────────────────────────────────────────────────┤
│ Презентация: uMainForm, *Frame, *Update*Form, uUiHelpers    │
│ Кнопки, поля, гриды, модальные окна, сообщения пользователю. │
├────────────────────────────────────────────────────────────┤
│ Чтение для экранов: uMainData                              │
│ 5 TFDQuery, 5 TDataSource, SELECT и Current*-обёртки.       │
├────────────────────────────────────────────────────────────┤
│ Бизнес-логика: uServices                                   │
│ Проверки, EValidationException, расчёт баланса.             │
├────────────────────────────────────────────────────────────┤
│ Доступ к данным: uRepositories                             │
│ SQL INSERT/UPDATE/DELETE/SELECT для конкретных таблиц.     │
├────────────────────────────────────────────────────────────┤
│ Инфраструктура: uDb, uMigrations, FireDAC                  │
│ Соединение, создание базы, таблицы и триггеры.              │
├────────────────────────────────────────────────────────────┤
│ Microsoft SQL Server: база foura                          │
└────────────────────────────────────────────────────────────┘
```

Практические правила проекта:

- форма и фрейм не пишут SQL;
- форма и фрейм не должны обращаться к `FieldByName` напрямую, если для этого
  есть метод `TMainData.Current...`;
- сервисы зависят от интерфейсов репозиториев, а не от конкретных классов;
- репозитории не показывают `ShowMessage` и не знают текстов UI;
- `uDb` отвечает за соединение, а `uMigrations` — за структуру базы;
- один объект `TFDConnection` передаётся всем репозиториям и `TMainData`;
- после успешной записи фрейм просит главную форму выполнить общий refresh.

Граф зависимостей в терминах модулей:

```text
SchoolExpensesDemo.dpr
  |
  +--> uDb --------------------> FireDAC --> SQL Server
  |      |
  |      +--> uMigrations
  |
  +--> uRepositories ----------> FireDAC --> SQL Server
  |       ^
  |       | интерфейсы
  +--> uServices
  |
  +--> uMainData --------------> FireDAC --> SQL Server
  |
  +--> uMainForm
          |
          +--> uPupilsFrame ------> TPupilService + TMainData
          +--> uPaymentsFrame ----> TPaymentService + TPupilService + TMainData
          +--> uExpensesFrame ----> TExpenseService + TPupilService + TMainData
          +--> uArchiveFrame -----> TMainData
          +--> uUpdate*Form ------> UI; данные и TPupilComboArray входят через Create
```

## 4. Запуск приложения

Точка входа находится в `SchoolExpensesDemo.dpr`. Важная особенность текущей
версии: главная форма **не создаёт** подключение, репозитории и сервисы в своём
конструкторе. Всё создаётся снаружи, в `.dpr`, а затем передаётся в форму через
`MainForm.Init(...)`.

Фактический порядок:

```text
1. Application.Initialize
2. TSchoolDb.Create
3. Db.Connect
   3.1 открыть соединение с localhost без Database
   3.2 создать foura, если базы нет
   3.3 переподключиться уже к foura
4. Db.Migrate
   4.1 транзакция
   4.2 CREATE TABLE IF NOT EXISTS-подобные проверки
   4.3 CREATE OR ALTER TRIGGER
   4.4 Commit или Rollback
5. Создать три репозитория с Db.Connection
6. Создать четыре сервиса
7. Создать TMainData с Db.Connection
8. Application.CreateForm(TMainForm, MainForm)
9. MainForm.Init(...)
   9.1 создать четыре frame-а
   9.2 привязать гриды к TDataSource
   9.3 выполнить первый RefreshData
10. Application.Run
    цикл событий VCL ждёт клики, двойные клики и закрытие окна
```

Схема старта:

```text
TObject / VCL Application
          |
          v
TSchoolDb.Create
          |
          +--> TFDConnection.Create
          |
          +--> Connect --> SQL Server master --> CREATE DATABASE foura
          |                                  \-> reconnect to foura
          |
          +--> Migrate --> tables + triggers in one transaction
          |
          +--> TPupilRepository, TPaymentRepository, TExpenseRepository
          |
          +--> TPupilService, TPaymentService, TExpenseService,
          |    TBalanceService
          |
          +--> TMainData
          |
          +--> TMainForm.Init
                    |
                    +--> TPupilsFrame
                    +--> TPaymentsFrame
                    +--> TExpensesFrame
                    +--> TArchiveFrame
```

Редактирующие формы не создаются при старте. Они создаются только после
двойного клика по строке и открываются через `ShowModal`.

## 5. `uDb`: соединение с SQL Server

`TSchoolDb` — небольшая обёртка над `TFDConnection`.

В `uDb.pas` заданы:

- сервер: `localhost`;
- база: `foura`;
- драйвер FireDAC: `MSSQL`;
- аутентификация: Windows (`OSAuthent = Yes`);
- `LoginPrompt = False`, поэтому FireDAC не показывает окно логина.

Метод `Connect` специально подключается сначала без `Database`. Это позволяет
обратиться к серверу и выполнить:

```sql
IF DB_ID(N'foura') IS NULL
    CREATE DATABASE [foura]
```

После этого соединение закрывается, в параметры добавляется `Database = foura`,
и оно открывается снова. `CREATE DATABASE` вынесен из миграции: создание базы
выполняется отдельно от транзакции DDL таблиц.

`TSchoolDb` владеет `FConnection`: создаёт его в `Create` и освобождает в
`Destroy`. Остальные объекты получают ссылку на это соединение, но не
освобождают его.

## 6. `uMigrations`: структура базы

`TSchoolDbMigrator.Migrate` — `class procedure`, поэтому отдельный объект
мигратор не нужен. Ему передают уже открытый `TFDConnection`.

Весь код обёрнут в:

```pascal
AConnection.StartTransaction;
try
  // CREATE TABLE и CREATE OR ALTER TRIGGER
  AConnection.Commit;
except
  AConnection.Rollback;
  raise;
end;
```

Это означает: если одна часть DDL завершилась ошибкой, миграция пытается
откатить весь набор изменений.

Для таблиц используется проверка `OBJECT_ID(..., 'U') IS NULL`. Для триггеров
используется `CREATE OR ALTER TRIGGER`, потому что обычный `CREATE TRIGGER` нельзя
надежно объединить с условием `IF` в одном T-SQL-батче.

Важно: текущая миграция — это создание отсутствующих объектов, а не полноценная
система версий схемы. Если таблица уже существует, её колонки и ограничения
автоматически не сравниваются и не исправляются.

## 7. Схема базы данных

Приложение использует базу `foura` и следующие рабочие таблицы:

| Таблица | Что хранит | Важные поля |
|---|---|---|
| `parents_and_children` | учеников и родителей | `id`, `children_name`, `parent_name`, `phone`, `after_lesson` |
| `money_from_parents` | поступления | `id`, `children_name`, `summ_to_first_november` |
| `outlay` | расходы | `id`, `date_purchaise`, `item_name`, `customer`, `summ` |

Архивные таблицы:

| Таблица | Когда заполняется |
|---|---|
| `money_from_parents_arc` | после удаления платежа или после изменения, сохраняя старую версию |
| `outlay_arc` | после удаления расхода |

Логические связи в текущей исторической схеме выглядят так:

```text
parents_and_children.id
       |\
       | +--> money_from_parents.id
       |
       +----> outlay.customer
```

Это логическое совпадение чисел. В миграции нет явно объявленных внешних ключей
между этими таблицами.

### 7.1. Необычный `id` платежа

В `money_from_parents` нет отдельного `payment_id`. Поле `id` означает id
ученика. Поэтому в приложении:

- `CurrentPaymentId` и `CurrentPaymentPupilId` возвращают одно и то же поле;
- удаление платежа выполняется по id ученика;
- при добавлении передаются и id ученика, и сохранённое имя ученика.

Это наследие исходного дампа, а не обычная нормализованная модель платежей.

### 7.2. Денежные типы

В интерфейсах Delphi суммы **расходов** передаются как `Currency`, а суммы
**платежей** — как `Integer`. В `outlay.summ` миграция использует `DECIMAL(7,2)`,
поэтому расходы рассчитаны на копейки. В `money_from_parents.summ_to_first_november`
миграция использует `INT`, потому что платежи учитываются в целых рублях. Типы
согласованы: дробная часть платежа не имеет места хранения и не вводится в UI.

### 7.3. Архивные триггеры

```text
DELETE money_from_parents
        |
        +--> money_from_parents_delete
                --> копия deleted в money_from_parents_arc

UPDATE money_from_parents
        |
        +--> money_from_parents_update
                --> старая версия из deleted в money_from_parents_arc

DELETE outlay
        |
        +--> delete_from_outlay
                --> копия deleted в outlay_arc
```

`inserted` и `deleted` — специальные псевдотаблицы SQL Server внутри триггера.
Для старой версии при `UPDATE` нужен набор `deleted`.

У расходов есть `Update` в репозитории, но отдельного триггера архивирования
обновлений расходов нет. Поэтому архив расходов в текущем коде сохраняет
удаления, а не историю изменений.

## 8. Репозитории: запись в базу

`uRepositories.pas` содержит интерфейсы и конкретные классы:

| Интерфейс | Реализация | Таблица |
|---|---|---|
| `IPupilRepository` | `TPupilRepository` | `parents_and_children` |
| `IPaymentRepository` | `TPaymentRepository` | `money_from_parents` |
| `IExpenseRepository` | `TExpenseRepository` | `outlay` |

Методы репозиториев — это преимущественно `Add`, `Update`, `Delete`, а для
платежей и расходов ещё `Total`. Для значений используется параметризация:

```pascal
FConnection.ExecSQL(
  'DELETE FROM dbo.outlay WHERE id = :id',
  [AId]
);
```

Значение `AId` не склеивается в SQL-строку. FireDAC передаёт его как параметр.
Так меньше проблем с кавычками, типами и SQL-инъекциями.

Репозиторий учеников также выполняет `SELECT id, children_name` в
`ListForCombo`, превращая строки БД в динамический массив `TPupilComboArray`.
Этот массив потом используется фреймами для заполнения комбобоксов.

### Интерфейсы и время жизни

Сервисы хранят репозитории через `IPupilRepository`, `IPaymentRepository` и
`IExpenseRepository`. Это позволяет сервису знать только контракт: «у объекта
есть Add/Update/Delete/Total», но не зависеть от конкретного класса.

Конкретный `TRepository` реализует `IInterface`, однако `_AddRef` и `_Release`
возвращают `-1`. Это отключает автоматическое подсчёт ссылок. Поэтому объекты
репозиториев вручную освобождаются в `.dpr` через `Free`.

```text
.dpr владеет объектами:

Db
 +-- Connection
 +-- PupilRepository
 +-- PaymentRepository
 +-- ExpenseRepository
      +-- интерфейсные ссылки в сервисах не освобождают объект автоматически
```

Это рабочий, но требующий аккуратности вариант управления временем жизни.

## 9. Сервисы: бизнес-правила

`uServices.pas` — слой между UI и репозиториями.

| Сервис | Ответственность |
|---|---|
| `TPupilService` | проверка id и ФИО, вызов репозитория учеников |
| `TPaymentService` | проверка ученика и положительной суммы, CRUD платежей |
| `TExpenseService` | проверка ученика, даты, назначения и суммы, CRUD расходов |
| `TBalanceService` | `поступления - расходы` |

Пример правила:

```pascal
if ASum <= 0 then
  raise EValidationException.Create('Сумма должна быть больше нуля');
FRepository.Add(APupilId, AChildrenName, ASum);
```

`EValidationException` отличается от обычной ошибки БД. UI показывает её
сообщение как понятную подсказку пользователю. Ошибки соединения или SQL
получают общий префикс `Ошибка: `.

Проверка выполняется на двух уровнях:

- UI заранее разбирает строку суммы и проверяет поля формы;
- сервис повторяет важные правила, чтобы они не зависели только от конкретной
  формы.

`TBalanceService.Balance` не хранит баланс в отдельном поле:

```pascal
Result := FPayments.Total - FExpenses.Total;
```

Каждый `Total` выполняет `SELECT COALESCE(SUM(...), 0)` в SQL Server.

## 10. `uMainData`: чтение для гридов

`TMainData` — объект для отображения списков. Он хранит пять пар:

| Query | DataSource | Содержимое |
|---|---|---|
| `PupilsQuery` | `PupilsSource` | ученики |
| `PaymentsQuery` | `PaymentsSource` | поступления |
| `ExpensesQuery` | `ExpensesSource` | расходы + имя ученика |
| `PaymentsArcQuery` | `PaymentsArcSource` | архив платежей |
| `ExpensesArcQuery` | `ExpensesArcSource` | архив расходов |

Связь визуального грида с базой:

```text
TFDQuery
   |
   v
TDataSource
   |
   v
TDBGrid
```

Например, фрейм делает:

```pascal
PupilsGrid.DataSource := FMainData.PupilsSource;
```

После этого `TDBGrid` сам показывает текущий набор данных. `RefreshData`
закрывает и снова открывает все пять запросов, затем задаёт русские заголовки и
ширины полей через `SetFieldLayout`.

Запрос расходов использует `LEFT JOIN`:

```sql
FROM outlay o
LEFT JOIN parents_and_children p ON p.id = o.customer
```

Поэтому в гриде есть и технический id плательщика (`customer`), и его имя
(`children_name`). `LEFT JOIN` позволяет показать расход даже если ученик был
удалён из справочника.

Методы `CurrentPupilId`, `CurrentExpenseSum` и подобные прячут от фреймов
`FieldByName`. Если структура полей изменится, точка адаптации находится в
`uMainData.pas`.

## 11. UI: главная форма и фреймы

### `uMainForm`

`TMainForm` содержит только общую оболочку:

- `TPageControl`;
- четыре `TTabSheet`;
- `StatusLabel`;
- ссылки на сервисы, `TMainData` и четыре фрейма.

`Init` сохраняет переданные зависимости, вызывает `CreateFrames`, а затем
`RefreshData`.

`CreateFrames` создаёт:

```text
PupilsTab   <- TPupilsFrame
PaymentsTab <- TPaymentsFrame
ExpensesTab <- TExpensesFrame
ArchiveTab  <- TArchiveFrame
```

Общий callback `RefreshData` передаётся в фреймы. После операции любой фрейм
вызывает его, и главная форма выполняет одинаковый порядок:

```text
FMainData.RefreshData
        |
        +--> FPupilsFrame.RefreshView
        +--> FPaymentsFrame.RefreshView
        +--> FExpensesFrame.RefreshView
        +--> FArchiveFrame.RefreshView
        +--> UpdateStatus
```

Так гриды, комбобоксы и строка баланса обновляются согласованно.

### `uPupilsFrame`

Отвечает за вкладку учеников:

```text
поля ФИО/родитель/телефон/после уроков
                 |
                 v
          TPupilService
                 |
                 v
       TPupilRepository -> INSERT/UPDATE/DELETE
```

Грид получает `PupilsSource`. Двойной клик создаёт `TuEditPupilForm`, форма
возвращает значения через геттеры, после чего фрейм вызывает `FPupilSvc.Update`.

### `uPaymentsFrame`

Отвечает за платежи. Использует два сервиса:

- `TPaymentService` — добавить, изменить, удалить платеж;
- `TPupilService` — получить список учеников для комбобокса.

Комбобокс показывает имя, но хранит id в объекте `TPupilComboItem`, добавленном
через `Items.AddObject`. `GetComboPupilId` извлекает этот id.

### `uExpensesFrame`

Отвечает за расходы. Поля:

- ученик;
- дата;
- назначение;
- сумма.

Дата при создании фрейма заполняется `TodayIso`. После добавления очищаются
назначение и сумма, а дата остаётся, чтобы было удобно вводить несколько
расходов за один день.

### `uArchiveFrame`

Ничего не изменяет. Он только подключает два `TDBGrid` к двум источникам
архивных запросов. Архив заполняется не кодом фрейма, а триггерами в SQL Server.

## 12. Формы редактирования и наследование

```text
TForm
├── TuEditPupilForm
│   └── 4 Edit: ученик, родитель, телефон, после уроков
│
└── TBaseEditForm
    ├── TuEditPaymentForm
    │   └── + PupilCombo; дата/назначение не используются
    └── TuEditExpenseForm
        └── + PupilCombo; дата/назначение/сумма используются
```

`TBaseEditForm` содержит общий каркас из трёх `TEdit`, двух кнопок и трёх
подписей. Виртуальные методы `ApplyCaption`, `ApplyHints`, `ApplyLabels`,
`Validate`, `GetOperationType`, `GetPupilId` позволяют наследникам изменить
детали.

Платёж переопределяет `Validate`, потому что ему нужны только ученик и сумма.
Расход проверяет ученика, а затем вызывает `inherited Validate`, чтобы повторно
использовать проверку даты, назначения и суммы.

`uUpdatePupilForm` не наследуется от `TBaseEditForm`, потому что у ученика
другая структура из четырёх полей.

## 13. Типовой поток добавления расхода

```text
Пользователь нажал «Добавить»
              |
              v
TExpensesFrame.AddExpenseClick
              |
              +--> ParseSum: строка -> Currency, сумма > 0?
              |
              +--> GetComboPupilId: выбранный текст -> id ученика
              |
              +--> TExpenseService.Add
                      |
                      +--> проверка id, даты, назначения, суммы
                      |
                               +--> IExpenseRepository.Add
                              |
                              +--> TExpenseRepository.Add
                                      |
                                      +--> TFDConnection.ExecSQL(INSERT)
                                              |
                                              v
                                      SQL Server: outlay
              |
              +--> FOnRefresh(Self)
                      |
                      +--> MainForm.RefreshData
                              |
                              +--> 5 SELECT заново
                              +--> обновление combo
                              +--> новый баланс в StatusLabel
```

Если SQL-операция завершилась ошибкой, управление идёт в `except`, вызывается
`ShowException`, а общий refresh после неуспешной операции не выполняется.

## 14. Управление памятью

Большинство объектов создаётся с владельцем `nil`, поэтому их нужно явно
освободить. Важные правила:

- `TSchoolDb.Destroy` освобождает `TFDConnection`;
- `TMainData.Destroy` сначала закрывает и отвязывает запросы, затем освобождает
  `TDataSource` и `TFDQuery`;
- фреймы с комбобоксами вызывают `ClearComboObjects`, потому что `TComboBox`
  сам не освобождает объекты, добавленные через `Items.AddObject`;
- модальные формы освобождаются в `try...finally`;
- `.dpr` освобождает сервисы, репозитории и базу в обратном порядке.

Главная форма владеет созданными фреймами через `Create(Self)`. При закрытии
главной формы `Action := caFree`, а после завершения `Application.Run` `.dpr`
освобождает инфраструктурные объекты.

## 15. Известные ограничения текущего кода

Этот раздел нужен, чтобы архитектурное описание не создавало впечатление, что
все части уже идеальны.

1. **Добавление ученика и обязательный `id`.** Миграция создаёт
   `parents_and_children.id INT NOT NULL` с первичным ключом, но
   `TPupilRepository.Add` вставляет только текстовые поля и не передаёт `id`.
   На чистой базе добавление ученика, вероятно, завершится ошибкой. Нужно
   отдельно выбрать стратегию: генерировать id в приложении или сделать поле
   `IDENTITY` и не полагаться на историческую схему. Интеграционный тест это
   ограничение учитывает: строку ученика он создаёт прямым INSERT с явным id
   (см. `tests/uRepositoryTests.pas`, комментарий к
   `Pupil_UpdateDelete_ListForCombo`).
2. **Расхождение дампа и миграции.** В секции `foura` файла
   `localhost_sqlserver.sql` таблица учеников также не получает `IDENTITY`, а
   её первичный ключ явно не объявлен. Если такая таблица уже существует,
   `IF OBJECT_ID IS NULL` не изменит её. Поэтому миграция не исправляет старую
   несовместимую схему автоматически.
3. ~~**Тип суммы платежа.**~~ Исправлено: код Delphi для платежей теперь
   использует `Integer`, что соответствует колонке
   `money_from_parents.summ_to_first_november` (`INT`). Расходы по-прежнему
   используют `Currency` / `DECIMAL(7,2)`.
4. **Связи таблиц.** `money_from_parents.id` и `outlay.customer` логически
   ссылаются на ученика, но миграция не объявляет внешние ключи. Удаление
   ученика может оставить расходы с отсутствующим именем.
5. **Изменение ученика у платежа.** Форма платежа позволяет выбрать другого
   ученика, но `IPaymentRepository.Update` получает только старый `AId`, имя и
   сумму. Поле `money_from_parents.id` при таком изменении не обновляется, поэтому
   имя платежа может перестать соответствовать его id.
6. **Неполный аудит расходов.** Триггер архивирует удаление расхода, но не его
   обновление.
7. **Дублирование снимка кода.** `code_explorer/files/*.js` нужно считать
   учебной копией, а не автоматически синхронизируемым исходником.

## 16. Как читать проект

Для первого знакомства удобен такой порядок:

1. `SchoolExpensesDemo.dpr` — кто создаёт объекты и кто ими владеет.
2. `uDb.pas` — как появляется соединение.
3. `uMigrations.pas` — какие таблицы и триггеры создаются.
4. `uRepositories.pas` — как Pascal превращает вызов метода в SQL.
5. `uServices.pas` — зачем нужны интерфейсы и где проверяются правила.
6. `uMainData.pas` — как SQL-SELECT превращается в источник для грида.
7. `uMainForm.pas` — как собирается интерфейс из фреймов.
8. `uPupilsFrame.pas`, `uPaymentsFrame.pas`, `uExpensesFrame.pas` — реальные
   события кнопок и двойных кликов.
9. `uBaseEditForm.pas` и наследники — наследование форм.
10. `uArchiveFrame.pas` — самый простой пример data binding.
11. `tests/` — модульные и интеграционные тесты фиксируют ожидаемое поведение
    всех слоёв (см. раздел 17).

После этого те же файлы можно открыть через `code_explorer/index.html` и
прочитать пояснения блоков.

## 17. Тесты (`tests/`)

Проект `tests/SchoolExpensesTests.dpr` — консольный раннер DUnitX. Он собирается
отдельно от основного приложения тем же компилятором `dcc64` (см. AGENTS.md) и
завершается кодом `0`, когда все тесты прошли, `1` — когда есть провалы или
ошибки, `2` — когда упал сам раннер.

Тесты двух уровней.

### Модульные тесты (без базы данных)

| Файл | Что проверяет |
|---|---|
| `tests/uServiceTests.pas` | Сервисы: валидацию (`EValidationException`) и передачу аргументов дальше по слоям |
| `tests/uUiHelperTests.pas` | `ParseSum`, `TodayIso`, хелперы комбо-списков, `SetFieldLayout` |

Сервисы зависят от интерфейсов репозиториев, поэтому в модульных тестах
репозитории подменяются моками из `tests/uTestMocks.pas`. Мок записывает факт и
аргументы вызова (`AddCount`, `LastAddedName`, ...) и возвращает заранее
приготовленные данные (`ComboToReturn`, `TotalToReturn`,
`PreviewToReturn`/`ClosePeriodToReturn`). Так тест сервиса проверяет ровно один
слой: что правило сработало и правильные значения дошли до границы слоя.

Моки наследуют `TManualLifetimeObject`, который реализует `IInterface`
заглушками `_AddRef/_Release`: временем жизни управляет сам тест через `Free`
в `[Teardown]`, а не счётчик ссылок. Это осознанный выбор: сервис хранит
интерфейсную ссылку, но не должен продлевать жизнь моку после конца теста.

### Интеграционные тесты (на настоящем SQL Server)

`tests/uRepositoryTests.pas` проверяет связку «Pascal + SQL»: миграции, CRUD
репозиториев, триггеры архива, обёртки `TMainData`. Фикстура работает с
отдельной базой `foura_tests`: пересоздаёт её, выполняет
`TSchoolDbMigrator.Migrate`, а между тестами чистит таблицы (учитывая,
что DELETE по рабочим таблицам наполняет архивные через триггеры). Боевая база
`foura` не затрагивается.

Если SQL Server на `localhost` недоступен, интеграционная фикстура вообще не
регистрируется: функция `SqlServerAvailable` вызывается в секции
`initialization` модуля, и прогон остаётся зелёным без сервера. В этой версии
DUnitX нет `Assert.Ignore`, поэтому пропуск делается условной регистрацией, а
не исключением внутри теста.
