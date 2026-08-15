# Список ошибок в проекте SchoolExpensesDemo

## 1. 🔴 CRITICAL — Необъявленная переменная `AId`

**Файл:** [`uMainForm.pas`](uMainForm.pas:201)

В методе [`DeletePaymentClick`](uMainForm.pas:199) используется переменная `AId`, которая нигде не объявлена:

```pascal
procedure TMainForm.DeletePaymentClick(Sender: TObject);
begin
  FPayments.Delete(AId);  // <-- AId не объявлен
```

**Следствие:** Код не скомпилируется. Необходимо получить ID выбранного платежа из [`PaymentsGrid`](uMainForm.pas:55) (например, через `PaymentsGrid.DataSource.DataSet.FieldByName('id').AsInteger`).

---

## 2. 🔴 CRITICAL — Отсутствует привязка `OnClick` для кнопки удаления

**Файл:** [`uMainForm.dfm`](uMainForm.dfm:161)

Кнопка [`DeletePaymentButton`](uMainForm.dfm:161) не имеет назначенного обработчика `OnClick`:

```pascal
object DeletePaymentButton: TButton
  Left = 858
  Top = 12
  Width = 120
  Height = 26
  Caption = #1059#1076#1072#1083#1080#1090#1100
  TabOrder = 5
  // OnClick отсутствует!
end
```

**Следствие:** Даже после исправления ошибки №1, нажатие на кнопку «Удалить» не вызовет [`DeletePaymentClick`](uMainForm.pas:199). Нужно добавить `OnClick = DeletePaymentClick`.

---

## 3. 🔴 CRITICAL — Логическая ошибка подключения к БД

**Файл:** [`uDb.pas`](uDb.pas:59)

Метод [`Connect`](uDb.pas:59) сначала подключается к базе `delphi-test`, а затем проверяет её существование:

```pascal
FConnection.Params.Values['Database'] := SqlDatabaseName;  // 'delphi-test'
FConnection.Connected := True;  // ошибка, если БД не существует!

FConnection.ExecSQL(
  'IF DB_ID(N''' + SqlDatabaseName + ''') IS NULL ' +
  'CREATE DATABASE [' + SqlDatabaseName + ']'
);
```

**Следствие:** Если база `delphi-test` не существует, [`FConnection.Connected := True`](uDb.pas:67) выбросит исключение ещё до выполнения `CREATE DATABASE`. Необходимо сначала подключиться к `master`, создать БД при необходимости, затем переподключиться к `delphi-test`.

---

## 4. 🟠 HIGH — Повреждённая кодировка строковых констант

**Файл:** [`uMainData.pas`](uMainData.pas:54)

Все кириллические константы отображаются как знаки вопроса (mojibake):

```pascal
const
  LabelSurname = '???????';   // должно быть 'Фамилия'
  LabelName = '???';           // должно быть 'Имя'
  LabelParent = '????????';    // должно быть 'Родитель'
  LabelPhone = '???????';      // должно быть 'Телефон'
  LabelDate = '????';          // должно быть 'Дата'
  LabelPurpose = '??????????'; // должно быть 'Назначение'
  LabelPupilId = 'ID ???????'; // должно быть 'ID ученика'
  LabelSum = '?????';          // должно быть 'Сумма'
  LabelGiftFor = '?? ??? ?????????'; // должно быть 'На что потратили'
  LabelArchivedAt = '?????';   // должно быть 'Дата'
  LabelTable = '???????';      // должно быть 'Таблица'
  LabelOperation = '????????'; // должно быть 'Операция'
  LabelSourceId = 'ID ???????'; // должно быть 'ID источника'
```

**Следствие:** Заголовки колонок в [`ConfigureFields`](uMainData.pas:132) будут отображаться как `???????` вместо читаемого текста. Файл сохранён в неправильной кодировке (вероятно, ANSI вместо UTF-8).

---

## 5. 🟡 MEDIUM — Избыточный `uses`

**Файл:** [`uMainForm.pas`](uMainForm.pas:24)

В секции `uses` подключён модуль `Vcl.Grids`, который не используется:

```pascal
uses
  ...
  uUiHelpers, Data.DB, Vcl.Grids;  // Vcl.Grids не нужен
```

**Следствие:** Не влияет на работоспособность, но загрязняет область видимости. `Vcl.DBGrids` уже содержит всё необходимое для [`TDBGrid`](uMainForm.pas:54).

---

## 6. 🟡 MEDIUM — Удаление без подтверждения

**Файл:** [`uMainForm.pas`](uMainForm.pas:199)

Метод [`DeletePaymentClick`](uMainForm.pas:199) удаляет платёж без диалога подтверждения:

```pascal
procedure TMainForm.DeletePaymentClick(Sender: TObject);
begin
  FPayments.Delete(AId);  // мгновенное удаление без подтверждения
```

**Следствие:** Случайное нажатие кнопки «Удалить» безвозвратно удалит запись. Рекомендуется добавить `MessageDlg` с подтверждением.

---

## 7. 🟢 LOW — Избыточный вызов `Application.Terminate`

**Файл:** [`uMainForm.pas`](uMainForm.pas:227)

В обработчике [`MainFormClose`](uMainForm.pas:227) после `Action := caFree` вызывается `Application.Terminate`:

```pascal
procedure TMainForm.MainFormClose(Sender: TObject; var Action: TCloseAction);
begin
  Action := caFree;
  Application.Terminate;  // избыточно при caFree
end;
```

**Следствие:** `caFree` уже освобождает форму и завершает приложение, если это главная форма. `Application.Terminate` здесь избыточен и может вызвать повторное срабатывание `OnClose`.

---

## Итого

| Приоритет | Количество |
|-----------|------------|
| 🔴 CRITICAL | 3 |
| 🟠 HIGH | 1 |
| 🟡 MEDIUM | 2 |
| 🟢 LOW | 1 |
| **Всего** | **7** |