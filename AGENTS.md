# Agents — School Expenses (Delphi)

Руководство для AI-агентов, работающих с проектом `SchoolExpensesDemo`.

## Контекст проекта

VCL-приложение на Delphi для учёта школьных расходов: поступления денег от
родителей и траты класса. Подключается к Microsoft SQL Server (база `foura`)
через FireDAC. Подробное описание архитектуры — в [`architecture.md`](architecture.md).

## Ключевые правила

### Кодировка файлов
- **Все `.pas` и `.dfm` файлы — UTF-8 с BOM.**
- Delphi без BOM читает исходники как Windows-1251 → кириллица ломается.
- При создании новых файлов или перезаписи существующих **всегда** добавляйте BOM.
- После правок через `write_to_file` проверяйте/добавляйте BOM через PowerShell:
  ```powershell
  $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  [System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($true)))
  ```

### SQL Server / T-SQL
- `CREATE TRIGGER` **не может** быть в одном батче с `IF OBJECT_ID ... IS NULL`.
  Используйте `CREATE OR ALTER TRIGGER` (SQL Server 2016 SP1+).
- Для таблиц — `IF OBJECT_ID(N'...', N'U') IS NULL CREATE TABLE ...`.
- FireDAC `ExecSQL` выполняет один батч за раз.
- Кириллические строковые литералы в SQL — с префиксом `N` (например `N'ФИО'`).

### Схема БД (база foura)
Не используйте старую нормализованную схему (`pupils`/`payments`/`expenses`/
`operations_archive`). Текущая схема дампа:
- `parents_and_children` — ученики (id, children_name, parent_name, phone, after_lesson)
- `money_from_parents` — поступления (id = id ученика, children_name, summ_to_first_november)
- `outlay` — расходы (id IDENTITY, date_purchaise, item_name, customer, summ)
- `*_arc` — архивные таблицы (заполняются триггерами)

### Структура слоёв
- **Формы** (`uMainForm`, `uUpdate*Form`) — только презентация и вызов сервисов.
  Формы не знают ни схемы БД, ни репозиториев. Доступ к полям гридов — через
  обёртки `TMainData` (`CurrentPupilId`, `CurrentPaymentSum` и т.п.), не через
  `FieldByName` напрямую.
- **uMainData** — запросы для гридов и `TDataSource`; инкапсулирует имена полей БД.
- **uRepositories** — CRUD к конкретным таблицам через интерфейсы
  (`IPupilRepository`/`IPaymentRepository`/`IExpenseRepository`). Только запись/чтение,
  без валидации и UI-текстов. Базовый класс `TRepository` хранит `FConnection`.
- **uServices** — бизнес-логика и валидация (`TPupilService`/`TPaymentService`/
  `TExpenseService`/`TBalanceService`). Бросают `EValidationException` с сообщением
  для пользователя. Сервисы зависят от интерфейсов репозиториев, не от классов.
- **uDb / uMigrations** — подключение и миграции (DDL в одной транзакции).
- **Composition root** — `SchoolExpensesDemo.dpr`: создаёт весь граф зависимостей
  (БД → репозитории → сервисы → MainData → форма) и передаёт в форму через конструктор.
Не смешивайте SQL-запросы между слоями.

### Денежные типы
- Все суммы — `Currency` (не `Integer`): `outlay.summ` — `DECIMAL(7,2)`, копейки
  не должны теряться. В UI — `TryStrToCurr`, в статусе — формат `%m`.

### Формы редактирования
- `uBaseEditForm` — базовая форма с 3 Edit + кнопки, виртуальные `Validate`,
  `ValidateSum`, `GetPupilId` (наследники с `PupilCombo` переопределяют).
- `uUpdatePaymentForm` и `uUpdateExenseForm` — наследники с `PupilCombo`
  (выпадающий список учеников). Список заполняется через `PopulateCombo` в
  `uMainForm` (источник данных — `TPupilService.ListForCombo`), id выбранного
  ученика читается через `GetComboPupilId`/`EditForm.GetPupilId`.
- `uUpdatePupilForm` — независимая `TForm` (не наследник `TBaseEditForm`).
- При добавлении нового поля в форму-наследник объявляйте компонент в `.pas`
  и добавляйте его в `.dfm` (с `inherited` для существующих).

### DFM-файлы
- Формы-наследники используют `inherited` для компонентов базовой формы.
- Кириллица в DFM — в виде `#1040#1085...` (числовые коды символов Unicode)
  или напрямую UTF-8 текстом — оба варианта работают при наличии BOM.
- При скрытии неиспользуемого поля ставьте `Visible = False`, не удаляйте компонент
  (он объявлен в базовом классе).

## Типичные задачи

### Добавить новое поле в таблицу
1. `uMigrations.pas` — добавить колонку в `CREATE TABLE` (или `ALTER TABLE`).
2. `uRepositories.pas` — обновить `INSERT`/`UPDATE` интерфейса и параметры.
3. `uServices.pas` — обновить сигнатуры сервиса и валидацию при необходимости.
4. `uMainData.pas` — обновить `SELECT`, `SetFieldLayout` и обёртки `Current*`.
5. Форма ввода/редактирования — добавить Edit/Combo + обработку.
6. `tests/uTestMocks.pas` — обновить мок изменённого интерфейса, при
   необходимости дополнить тесты.

### Добавить новый справочник
1. Миграция: `CREATE TABLE` + триггеры архива при необходимости.
2. Интерфейс + репозиторий в `uRepositories.pas`.
3. Сервис в `uServices.pas`.
4. Запрос + DataSource + обёртки в `uMainData.pas`.
5. Вкладка/грид в `uMainForm` (`.dfm` + `.pas`).
6. Создание репозитория/сервиса в composition root (`SchoolExpensesDemo.dpr`).
7. Мок в `tests/uTestMocks.pas` + тесты сервиса/репозитория.

### Изменить подключение к БД
- Параметры в `uDb.pas`: `SqlServerName`, `SqlDatabaseName`.
- Windows-аутентификация (`OSAuthent=Yes`). Для SQL-логина добавить
  `User_Name`/`Password` и убрать `OSAuthent`.

## Сборка и проверка

- Компилятор `dcc64` обычно не на PATH. Сборка — из Delphi IDE (Rad Studio 12.2)
  или из командной строки.
- Для сборки из CLI (Git Bash/PowerShell) — полный путь к компилятору
  Studio 37.0:
  ```bash
  cd "/c/Users/hentan/Documents/learn delfi/school_expenses_delphi_example"
  DCC="C:\\Program Files (x86)\\Embarcadero\\Studio\\37.0\\bin\\dcc64.exe"
  "$DCC" -B SchoolExpensesDemo.dpr
  ```
  Ключ `-B` — полная пересборка. Переменные окружения (`BDS`, пути к библиотекам)
  подхватываются из `dcc64.cfg` рядом с компилятором, отдельный `rsvars.bat`
  не нужен. Вывод компилятора (ошибки `E*`, предупреждения `W*`, подсказки `H*`)
  идёт в stdout, читается напрямую.
- После правок `.pas` с новыми идентификаторами (`Trim`, `ShowMessage`, `MessageDlg`
  и т.п.) проверяйте, что нужные модули (`System.SysUtils`, `Vcl.Dialogs`,
  `System.UITypes` для `MessageDlg`) есть в `uses`.
- Ошибки `E2003 Undeclared identifier` = пропущен `uses` (например,
  `TPupilComboArray` объявлен в `uRepositories` — подключите модуль в uses).
- Ошибки `E2291 Missing implementation of interface method IInterface.*` =
  класс реализует интерфейс, но не наследует реализацию `IInterface`
  (`TInterfacedObject` или вручную через `TComponent`-подобные заглушки
  `QueryInterface`/`_AddRef`/`_Release`).
- Ошибки `E2362 Cannot access protected symbol` = метод в секции `protected`,
  а вызывается извне — перенесите объявление в `public` (или повысьте видимость
  через `override` в `public`-секции наследника).
- Ошибки `E2129 Cannot assign to a read-only property` для `Application.MainForm` =
  MainForm назначается только через `Application.CreateForm`, ручное присвоение
  невозможно. Передавайте зависимости через отдельный метод `Init`, а не через
  конструктор формы.
- Ошибки `E2169 Field definition not allowed after methods or properties` =
  некорректная комбинация директив метода (например, `virtual; reintroduce`
  через пробел). Используйте `reintroduce` отдельно, без `virtual`, если нужно
  скрыть конструктор базового класса.
- Ошибки `Неправильный синтаксис около "TRIGGER"` = `CREATE TRIGGER` в одном
  батче с `IF` — замените на `CREATE OR ALTER TRIGGER`.
- В тестах связка `E2003 Undeclared identifier: 'OneTimeSetup'` + `E2065
  Unsatisfied forward or external declaration` = имя реализации метода фикстуры
  не совпадает с объявлением в классе (метод должен называться как в объявлении,
  а не как атрибут DUnitX: `[SetupFixture]` — это атрибут, имя метода любое).
- `E2003 Undeclared identifier: 'Ignore'` в тестах = в этой версии DUnitX нет
  `Assert.Ignore`. Пропуск тестов делайте условной регистрацией фикстуры:
  `if SqlServerAvailable then TDUnitX.RegisterTestFixture(...)` в `initialization`.
- Ошибка VCL `Control ... has no parent window` в тестах = визуальному
  компоненту нужен родитель для создания handle. Заводите форму-хост:
  `FHost := TForm.Create(nil); FCombo.Parent := FHost;`.

## Тесты

- Проект тестов — `tests/SchoolExpensesTests.dpr`: консольный раннер DUnitX,
  собирается отдельно от основного приложения. Сборка и запуск из каталога
  `tests`:
  ```bash
  cd "/c/Users/hentan/Documents/learn delfi/school_expenses_delphi_example/tests"
  DCC="C:\\Program Files (x86)\\Embarcadero\\Studio\\37.0\\bin\\dcc64.exe"
  "$DCC" -B SchoolExpensesTests.dpr
  ./SchoolExpensesTests.exe
  ```
- Код возврата: `0` — все тесты прошли, `1` — есть провалы/ошибки, `2` — упал
  сам раннер.
- Модульные тесты (`uServiceTests`, `uUiHelperTests`) работают без БД — на
  моках из `tests/uTestMocks.pas`.
- Интеграционные тесты (`uRepositoryTests`) требуют SQL Server на `localhost`:
  пересоздают отдельную базу `foura_tests`, боевая база `foura` не затрагивается.
  Если сервер недоступен, фикстура не регистрируется (проверка
  `SqlServerAvailable` в секции `initialization`) и прогон остаётся зелёным.
- При изменении интерфейсов репозиториев правьте и моки в `uTestMocks.pas`,
  иначе тестовый проект перестанет компилироваться.
- Известное ограничение схемы №1 (см. architecture.md): интеграционный тест не
  вызывает `TPupilRepository.Add`, т.к. колонка `parents_and_children.id`
  создана без `IDENTITY` — строка ученика создаётся прямым INSERT с явным id.

## Файлы проекта

| Файл | Назначение |
|---|---|
| `SchoolExpensesDemo.dpr` | Точка входа |
| `SchoolExpensesDemo.dproj` | Проект MSBuild |
| `uDb.pas` | Подключение к SQL Server |
| `uMigrations.pas` | Создание таблиц и триггеров |
| `uRepositories.pas` | CRUD-репозитории |
| `uServices.pas` | Бизнес-логика (баланс) |
| `uMainData.pas` | Запросы и DataSource для гридов |
| `uMainForm.pas` / `.dfm` | Главная форма |
| `uBaseEditForm.pas` / `.dfm` | Базовая форма редактирования |
| `uUpdatePupilForm.pas` / `.dfm` | Форма ученика |
| `uUpdatePaymentForm.pas` / `.dfm` | Форма платежа |
| `uUpdateExenseForm.pas` / `.dfm` | Форма расхода |
| `uUiHelpers.pas` | UI-вспомогательные функции |
| `tests/SchoolExpensesTests.dpr` | Консольный раннер тестов DUnitX |
| `tests/uTestMocks.pas` | Моки репозиториев для модульных тестов |
| `tests/uServiceTests.pas` | Модульные тесты сервисов (без БД) |
| `tests/uUiHelperTests.pas` | Модульные тесты uUiHelpers (без БД) |
| `tests/uRepositoryTests.pas` | Интеграционные тесты на SQL Server (база foura_tests) |
| `localhost_sqlserver.sql` | Дамп схемы и данных (БД foura/seconda/trirda) |
| `architecture.md` | Описание архитектуры |
| `agents.md` | Это руководство |
