# SchoolExpensesDemo

Учебное VCL-приложение на Delphi для учёта школьных поступлений и расходов.
Программа работает с Microsoft SQL Server напрямую через FireDAC, без HTTP,
REST API и отдельного backend-сервера.

## Текущая структура

```text
SchoolExpensesDemo.dpr
  -> uDb/uMigrations
  -> uRepositories
  -> uServices
  -> uMainData
  -> uMainForm + фреймы
```

`SchoolExpensesDemo.dpr` является composition root: он создаёт соединение,
репозитории, сервисы и объект данных, а затем передаёт их главной форме через
`MainForm.Init`.

Изменения данных проходят через фрейм, сервис и репозиторий. Данные для гридов
читаются через пять `TFDQuery` в `uMainData`.

Рядом живёт консольный проект тестов `tests/SchoolExpensesTests.dpr` (DUnitX):
модульные тесты на моках и интеграционные тесты на отдельной базе `foura_tests`.

## Основные файлы

- `SchoolExpensesDemo.dpr` — точка входа и сборка зависимостей.
- `uDb.pas` — соединение FireDAC с SQL Server.
- `uMigrations.pas` — создание таблиц и триггеров архива.
- `uRepositories.pas` — CRUD-репозитории и SQL-запросы.
- `uServices.pas` — валидация и расчёт баланса.
- `uMainData.pas` — SELECT-запросы и источники данных для гридов.
- `uMainForm.pas` — оболочка главного окна и создание вкладок-фреймов.
- `uPupilsFrame.pas` — вкладка учеников.
- `uPaymentsFrame.pas` — вкладка поступлений.
- `uExpensesFrame.pas` — вкладка расходов.
- `uArchiveFrame.pas` — просмотр архивов.
- `uBaseEditForm.pas` и `uUpdate*.pas` — модальные формы редактирования.
- `tests/SchoolExpensesTests.dpr` — консольный раннер тестов DUnitX.
- `tests/uTestMocks.pas` — моки репозиториев для модульных тестов.
- `tests/uServiceTests.pas`, `tests/uUiHelperTests.pas` — модульные тесты
  (работают без БД).
- `tests/uRepositoryTests.pas` — интеграционные тесты на отдельной базе
  `foura_tests`.
- `code_explorer/index.html` — учебный просмотрщик Pascal-кода в браузере.

## Подключение

По умолчанию `uDb.pas` использует:

```pascal
SqlServerName = 'localhost';
SqlDatabaseName = 'foura';
```

Используется Windows-аутентификация:

```pascal
FConnection.Params.Values['OSAuthent'] := 'Yes';
```

При запуске приложение сначала подключается к серверу без имени базы, создаёт
`foura`, если её нет, затем переподключается к этой базе и выполняет миграцию.

## Как запустить

1. Откройте `SchoolExpensesDemo.dproj` в Delphi/RAD Studio.
2. Убедитесь, что запущен SQL Server на `localhost` и доступен FireDAC-драйвер
   MSSQL.
3. Выберите Win64 или Win32 и запустите проект через F9.

Подробный порядок старта и потоки данных описаны в
[`how-it-works.md`](how-it-works.md). Краткая техническая схема находится в
[`architecture.md`](architecture.md).

## Как запустить тесты

Тесты — отдельный консольный проект, собираются из каталога `tests`
(путь к `dcc64` зависит от версии RAD Studio):

```powershell
cd tests
& "C:\Program Files (x86)\Embarcadero\Studio\37.0\bin\dcc64.exe" -B SchoolExpensesTests.dpr
.\SchoolExpensesTests.exe
```

- Модульные тесты (`uServiceTests`, `uUiHelperTests`) работают без SQL Server —
  репозитории подменяются моками из `uTestMocks.pas`.
- Интеграционные тесты (`uRepositoryTests`) требуют сервер на `localhost`:
  они пересоздают отдельную базу `foura_tests` и не трогают боевую `foura`.
  Если сервер выключен, эта фикстура просто не регистрируется.
- Код возврата: `0` — все тесты прошли, `1` — есть ошибки.

## Учебный просмотрщик

Откройте `code_explorer/index.html` в браузере. Файлы из
`code_explorer/files/*.js` содержат учебную копию Pascal-кода и пояснения по
диапазонам строк. Это статический просмотрщик, он не заменяет компиляцию
основного проекта и не синхронизируется с `.pas` автоматически.

## Ограничения текущей схемы

- `parents_and_children.id` обязателен, но текущий `TPupilRepository.Add` не
  передаёт его в `INSERT`; добавление ученика на чистой базе требует отдельного
  исправления модели id. Интеграционный тест обходит это ограничение явным
  INSERT (см. `tests/uRepositoryTests.pas`).
- Код использует `Currency`, а `money_from_parents.summ_to_first_november` в
  миграции объявлено как `INT`.
- Архивируется удаление расходов, но не их обновление.
- Логические связи `money_from_parents.id` и `outlay.customer` с учениками не
  оформлены внешними ключами в миграции.
