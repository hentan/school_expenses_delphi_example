# SchoolExpensesDemo

Минимальный пример Delphi/VCL-приложения для учета школьных расходов без REST API.
Данные хранятся в SQL Server, приложение ходит в базу напрямую через FireDAC.

## Что внутри

- `SchoolExpensesDemo.dpr` - точка входа VCL-приложения.
- `uDb.pas` - подключение FireDAC к SQL Server, создание базы и таблиц.
- `uRepositories.pas` - простые классы для добавления учеников, оплат, расходов и расчета баланса.
- `uMainForm.pas` - главная форма, собранная из Pascal-кода без `.dfm`.

## Подключение

По умолчанию используется:

```pascal
SqlServerName = '(localdb)\MSSQLLocalDB';
SqlDatabaseName = 'SchoolExpenses';
```

Если у тебя `SQLEXPRESS`, замени в `uDb.pas`:

```pascal
SqlServerName = '.\SQLEXPRESS';
```

Если нужна SQL-аутентификация вместо Windows-аутентификации, в `TSchoolDb.Connect`
замени:

```pascal
FConnection.Params.Values['OSAuthent'] := 'Yes';
```

на:

```pascal
FConnection.Params.Values['User_Name'] := 'sa';
FConnection.Params.Values['Password'] := 'your_password';
```

## Как запустить

1. Создай новый VCL Forms Application в Delphi.
2. Добавь эти `.pas` файлы в проект.
3. Замени `.dpr` на `SchoolExpensesDemo.dpr` или перенеси из него `uses`.
4. Убедись, что установлен SQL Server LocalDB/SQLEXPRESS и доступны FireDAC MSSQL units.
5. Запусти приложение.

При первом запуске приложение создаст базу `SchoolExpenses`, таблицы и триггеры архива.

## Логика

Баланс считается так:

```sql
SUM(payments.summ) - SUM(expenses.summ)
```

Это desktop-вариант: формы напрямую работают с SQL Server через FireDAC, без HTTP, REST и отдельного backend.
