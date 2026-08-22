unit uRepositoryTests;

{
  Интеграционные тесты репозиториев, миграций и TMainData на локальном
  SQL Server. Используется отдельная база foura_tests: она пересоздаётся
  при каждом запуске тестов, боевая база foura не затрагивается.
  Если сервер недоступен, фикстура вообще не регистрируется
  (SqlServerAvailable в секции initialization) и интеграционные тесты
  не запускаются.
}

interface

uses
  System.SysUtils,
  Data.DB,
  FireDAC.Comp.Client,
  DUnitX.TestFramework,
  uRepositories,
  uServices,
  uMigrations,
  uMainData;

type
  [TestFixture]
  TRepositoryIntegrationTests = class(TObject)
  private
    FConn: TFDConnection;
    function Scalar(const ASql: string): Variant;
    procedure Exec(const ASql: string);
    // Два ученика с платежами и двумя расходами:
    // сдано 2200, потрачено 400.00.
    procedure SeedBasicData;
  public
    [SetupFixture]
    procedure SetupFixture;
    [TearDownFixture]
    procedure TeardownFixture;

    [Setup]
    procedure CleanTables;

    [Test]
    procedure Migrate_TablesAndTriggersExist;
    [Test]
    procedure Migrate_SecondRun_Succeeds;
    [Test]
    procedure Pupil_UpdateDelete_ListForCombo;
    [Test]
    procedure Pupil_ListForCombo_BlankNameUsesFallback;
    [Test]
    procedure Payment_Total_EmptyIsZero;
    [Test]
    procedure Payment_Crud_UpdatesTotal;
    [Test]
    procedure Expense_Crud_AndTotal;
    [Test]
    procedure Expense_Total_PreservesKopecks;
    [Test]
    procedure Archive_Preview_CountersAndCarryOver;
    [Test]
    procedure Archive_ClosePeriod_MovesRowsToArcAndWritesCarryOver;
    [Test]
    procedure Archive_ClosePeriod_EmptyData_WritesNothing;
    [Test]
    procedure ArchiveService_ClosePeriod_EmptyData_RaisesValidation;
    [Test]
    procedure MainData_WrappersExposeCurrentRow;
    [Test]
    procedure MainData_ExpenseWithoutCustomer_HasNoJoinedName;
    [Test]
    procedure MainData_FieldLabelsConfigured;
  end;

{ Проверка доступности локального SQL Server.
  Вызывается в initialization до регистрации фикстуры: если сервера нет,
  интеграционные тесты не регистрируются и не запускаются вовсе. }
function SqlServerAvailable: Boolean;

implementation

const
  TestDatabaseName = 'foura_tests';

{ Служебные методы }

function TRepositoryIntegrationTests.Scalar(const ASql: string): Variant;
begin
  Result := FConn.ExecSQLScalar(ASql);
end;

procedure TRepositoryIntegrationTests.Exec(const ASql: string);
begin
  FConn.ExecSQL(ASql);
end;

procedure TRepositoryIntegrationTests.SeedBasicData;
begin
  Exec('INSERT INTO dbo.parents_and_children(id, children_name, parent_name, phone, after_lesson) VALUES ' +
       '(1, N''Иванов А.'', N''Иванов Б.В.'', ''+79001112233'', N''да''), ' +
       '(2, N''Петрова В.'', N''Сидорова Г.П.'', ''+79005556677'', N''нет'')');
  Exec('INSERT INTO dbo.money_from_parents(children_name, summ_to_first_november, id) VALUES ' +
       '(N''Иванов А.'', 1500, 1), ' +
       '(N''Петрова В.'', 700, 2)');
  Exec('INSERT INTO dbo.outlay(date_purchaise, item_name, customer, summ) VALUES ' +
       '(''20260901'', N''Тетради'', 1, 250.50), ' +
       '(''20260902'', N''Ручки'', 2, 149.50)');
end;

{ Жизненный цикл фикстуры }

function SqlServerAvailable: Boolean;
var
  Conn: TFDConnection;
begin
  Conn := TFDConnection.Create(nil);
  try
    Conn.LoginPrompt := False;
    Conn.Params.Clear;
    Conn.Params.Values['DriverID'] := 'MSSQL';
    Conn.Params.Values['Server'] := 'localhost';
    Conn.Params.Values['OSAuthent'] := 'Yes';
    try
      Conn.Connected := True;
      Result := True;
    except
      on E: Exception do
        Result := False;
    end;
  finally
    Conn.Free;
  end;
end;

procedure TRepositoryIntegrationTests.SetupFixture;
begin
  FConn := nil;
  FConn := TFDConnection.Create(nil);
  FConn.LoginPrompt := False;
  FConn.Params.Clear;
  FConn.Params.Values['DriverID'] := 'MSSQL';
  FConn.Params.Values['Server'] := 'localhost';
  FConn.Params.Values['OSAuthent'] := 'Yes';
  FConn.Connected := True;

  // Свежая база на каждый прогон.
  Exec('IF DB_ID(N''' + TestDatabaseName + ''') IS NOT NULL ' +
       'BEGIN ' +
       'ALTER DATABASE [' + TestDatabaseName + '] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; ' +
       'DROP DATABASE [' + TestDatabaseName + ']; ' +
       'END');
  Exec('CREATE DATABASE [' + TestDatabaseName + ']');

  FConn.Connected := False;
  FConn.Params.Values['Database'] := TestDatabaseName;
  FConn.Connected := True;

  TSchoolDbMigrator.Migrate(FConn);
end;

procedure TRepositoryIntegrationTests.TeardownFixture;
begin
  FreeAndNil(FConn);
end;

procedure TRepositoryIntegrationTests.CleanTables;
begin
  if FConn = nil then
    Exit;

  // Порядок важен: DELETE по рабочим таблицам наполняет архивные
  // триггерами, поэтому архивы чистятся ещё раз в конце.
  Exec('DELETE FROM dbo.outlay_arc');
  Exec('DELETE FROM dbo.money_from_parents_arc');
  Exec('DELETE FROM dbo.outlay');
  Exec('DELETE FROM dbo.money_from_parents');
  Exec('DELETE FROM dbo.parents_and_children');
  Exec('DELETE FROM dbo.outlay_arc');
  Exec('DELETE FROM dbo.money_from_parents_arc');
end;

{ Миграции }

procedure TRepositoryIntegrationTests.Migrate_TablesAndTriggersExist;
begin
  Assert.AreEqual(5, Integer(Scalar(
    'SELECT COUNT(*) FROM sys.tables WHERE name IN ' +
    '(''parents_and_children'', ''money_from_parents'', ''money_from_parents_arc'', ' +
    '''outlay'', ''outlay_arc'')')), 'Все таблицы схемы должны существовать');

  Assert.AreEqual(3, Integer(Scalar(
    'SELECT COUNT(*) FROM sys.triggers WHERE name IN ' +
    '(''money_from_parents_delete'', ''money_from_parents_update'', ''delete_from_outlay'')')),
    'Все триггеры архива должны существовать');
end;

procedure TRepositoryIntegrationTests.Migrate_SecondRun_Succeeds;
begin
  // Повторный запуск миграции идемпотентен и ничего не ломает.
  Assert.WillNotRaise(
    procedure begin TSchoolDbMigrator.Migrate(FConn); end);
end;

{ Ученики }

procedure TRepositoryIntegrationTests.Pupil_UpdateDelete_ListForCombo;
var
  Pupils: TPupilRepository;
  Entries: TPupilComboArray;
begin
  // TPupilRepository.Add не передаёт id, а колонка создана без IDENTITY —
  // известное ограничение схемы (architecture.md, «Известные ограничения»,
  // п.1). Строку создаём прямым INSERT с явным id и проверяем остальные
  // операции репозитория.
  Exec('INSERT INTO dbo.parents_and_children(id, children_name, parent_name, phone, after_lesson) ' +
       'VALUES (1, N''Иванов А.'', N''Иванов Б.В.'', ''+79001112233'', N''да'')');

  Pupils := TPupilRepository.Create(FConn);
  try
    Entries := Pupils.ListForCombo;
    Assert.AreEqual<Integer>(1, Length(Entries));
    Assert.AreEqual('Иванов А.', Entries[0].DisplayName);

    Pupils.Update(Entries[0].Id, 'Иванов А. обновлён', 'Родитель', '', 'нет');
    Entries := Pupils.ListForCombo;
    Assert.AreEqual('Иванов А. обновлён', Entries[0].DisplayName);

    Pupils.Delete(Entries[0].Id);
    Entries := Pupils.ListForCombo;
    Assert.AreEqual<Integer>(0, Length(Entries));
  finally
    Pupils.Free;
  end;
end;

procedure TRepositoryIntegrationTests.Pupil_ListForCombo_BlankNameUsesFallback;
var
  Pupils: TPupilRepository;
  Entries: TPupilComboArray;
begin
  Exec('INSERT INTO dbo.parents_and_children(id, children_name, parent_name, phone, after_lesson) ' +
       'VALUES (3, '''', N''Родитель'', '''', '''')');

  Pupils := TPupilRepository.Create(FConn);
  try
    Entries := Pupils.ListForCombo;

    Assert.AreEqual<Integer>(1, Length(Entries));
    Assert.AreEqual(3, Entries[0].Id);
    Assert.AreEqual('Ученик 3', Entries[0].DisplayName,
      'Пустое имя заменяется заглушкой «Ученик %d»');
  finally
    Pupils.Free;
  end;
end;

{ Поступления }

procedure TRepositoryIntegrationTests.Payment_Total_EmptyIsZero;
var
  Payments: TPaymentRepository;
begin
  Payments := TPaymentRepository.Create(FConn);
  try
    Assert.IsTrue(Payments.Total = 0, 'На пустой таблице Total = 0');
  finally
    Payments.Free;
  end;
end;

procedure TRepositoryIntegrationTests.Payment_Crud_UpdatesTotal;
var
  Payments: TPaymentRepository;
begin
  Payments := TPaymentRepository.Create(FConn);
  try
    Payments.Add(1, 'Иванов А.', 1500);
    Payments.Add(2, 'Петрова В.', 700);
    Assert.IsTrue(Payments.Total = 2200);

    Payments.Update(1, 'Иванов А.', 2000);
    Assert.IsTrue(Payments.Total = 2700);

    Payments.Delete(2);
    Assert.IsTrue(Payments.Total = 2000);
  finally
    Payments.Free;
  end;
end;

{ Расходы }

procedure TRepositoryIntegrationTests.Expense_Crud_AndTotal;
var
  Expenses: TExpenseRepository;
  Id: Integer;
begin
  Expenses := TExpenseRepository.Create(FConn);
  try
    Expenses.Add(1, '20260901', 'Тетради', 250.50);
    Assert.IsTrue(Expenses.Total = 250.50);

    Id := Integer(Scalar('SELECT MAX(id) FROM dbo.outlay'));
    Expenses.Update(Id, 2, '20260902', 'Ручки', 100);
    Assert.IsTrue(Expenses.Total = 100);
    Assert.AreEqual('Ручки', string(Scalar(
      'SELECT item_name FROM dbo.outlay WHERE id = ' + IntToStr(Id))));

    Expenses.Delete(Id);
    Assert.IsTrue(Expenses.Total = 0);
  finally
    Expenses.Free;
  end;
end;

procedure TRepositoryIntegrationTests.Expense_Total_PreservesKopecks;
var
  Expenses: TExpenseRepository;
begin
  Expenses := TExpenseRepository.Create(FConn);
  try
    Expenses.Add(1, '20260901', 'Тетради', 10.55);
    Expenses.Add(2, '20260902', 'Ручки', 0.45);

    Assert.IsTrue(Expenses.Total = 11.00, 'Копейки не должны теряться (DECIMAL(7,2))');
  finally
    Expenses.Free;
  end;
end;

{ Архивация }

procedure TRepositoryIntegrationTests.Archive_Preview_CountersAndCarryOver;
var
  Archive: TArchiveRepository;
  Snapshot: TClosePeriodResult;
begin
  SeedBasicData;

  Archive := TArchiveRepository.Create(FConn);
  try
    Snapshot := Archive.Preview;

    Assert.AreEqual(2, Snapshot.ResetPayments, 'Два ненулевых платежа');
    Assert.AreEqual(2, Snapshot.ArchivedExpenses, 'Две строки расходов');
    // Сальдо = потрачено - сдано = 400 - 2200 = -1800.
    Assert.IsTrue(Snapshot.CarryOverSum = -1800,
      'Preview не должен менять данные, только считать');
  finally
    Archive.Free;
  end;
end;

procedure TRepositoryIntegrationTests.Archive_ClosePeriod_MovesRowsToArcAndWritesCarryOver;
var
  Archive: TArchiveRepository;
  Result_: TClosePeriodResult;
begin
  SeedBasicData;

  Archive := TArchiveRepository.Create(FConn);
  try
    Result_ := Archive.ClosePeriod('Сальдо на конец периода');

    Assert.AreEqual(2, Result_.ResetPayments);
    Assert.AreEqual(2, Result_.ArchivedExpenses);
    Assert.IsTrue(Result_.CarryOverSum = -1800);

    // Платежи обнулены, но строки остались.
    Assert.AreEqual(2, Integer(Scalar('SELECT COUNT(*) FROM dbo.money_from_parents')));
    Assert.AreEqual(0, Integer(Scalar(
      'SELECT COUNT(*) FROM dbo.money_from_parents WHERE summ_to_first_november <> 0')));

    // Старые суммы попали в архив поступлений.
    Assert.AreEqual(2, Integer(Scalar('SELECT COUNT(*) FROM dbo.money_from_parents_arc')));
    Assert.AreEqual(2200, Integer(Scalar(
      'SELECT COALESCE(SUM(summ_to_first_november), 0) FROM dbo.money_from_parents_arc')));

    // Расходы переехали в архив расходов.
    Assert.AreEqual(1, Integer(Scalar(
      'SELECT COUNT(*) FROM dbo.outlay_arc WHERE item_name = N''Тетради''')),
      'Строка «Тетради» должна быть в архиве');
    Assert.AreEqual(2, Integer(Scalar('SELECT COUNT(*) FROM dbo.outlay_arc')));

    // В рабочих расходах осталась только строка сальдо.
    Assert.AreEqual(1, Integer(Scalar('SELECT COUNT(*) FROM dbo.outlay')));
    Assert.AreEqual('Сальдо на конец периода',
      string(Scalar('SELECT TOP 1 item_name FROM dbo.outlay')));
    Assert.IsTrue(Currency(Scalar('SELECT SUM(summ) FROM dbo.outlay')) = -1800,
      'Остаток денег уходит в outlay с минусом');
  finally
    Archive.Free;
  end;
end;

procedure TRepositoryIntegrationTests.Archive_ClosePeriod_EmptyData_WritesNothing;
var
  Archive: TArchiveRepository;
  Result_: TClosePeriodResult;
begin
  Archive := TArchiveRepository.Create(FConn);
  try
    Result_ := Archive.ClosePeriod('Сальдо на конец периода');

    Assert.AreEqual(0, Result_.ResetPayments);
    Assert.AreEqual(0, Result_.ArchivedExpenses);
    Assert.IsTrue(Result_.CarryOverSum = 0);
    Assert.AreEqual(0, Integer(Scalar('SELECT COUNT(*) FROM dbo.outlay')),
      'На пустых данных строка сальдо не пишется');
  finally
    Archive.Free;
  end;
end;

procedure TRepositoryIntegrationTests.ArchiveService_ClosePeriod_EmptyData_RaisesValidation;
var
  Repo: TArchiveRepository;
  Svc: TArchiveService;
  Raised: Boolean;
begin
  Repo := TArchiveRepository.Create(FConn);
  Svc := TArchiveService.Create(Repo);
  try
    Raised := False;
    try
      Svc.ClosePeriod;
    except
      on E: EValidationException do
      begin
        Raised := True;
        Assert.AreEqual('Нет данных для архивации', E.Message);
      end;
    end;
    Assert.IsTrue(Raised, 'Пустые данные должны давать ошибку валидации');
  finally
    Svc.Free;
    Repo.Free;
  end;
end;

{ TMainData }

procedure TRepositoryIntegrationTests.MainData_WrappersExposeCurrentRow;
var
  MainData: TMainData;
  SumValue: Currency;
begin
  SeedBasicData;

  MainData := TMainData.Create(FConn);
  try
    MainData.RefreshData;

    // Гриды отсортированы по имени ученика / дате расхода по убыванию.
    Assert.IsFalse(MainData.PupilsEmpty);
    Assert.AreEqual(1, MainData.CurrentPupilId, 'Первый по алфавиту — Иванов');
    Assert.AreEqual('Иванов А.', MainData.CurrentPupilName);
    Assert.AreEqual('Иванов Б.В.', MainData.CurrentPupilParentName);
    Assert.AreEqual('+79001112233', MainData.CurrentPupilPhone);
    Assert.AreEqual('да', MainData.CurrentPupilAfterLesson);

    Assert.AreEqual('Петрова В.', MainData.PupilNameById(2));
    Assert.AreEqual('', MainData.PupilNameById(0), 'Некорректный id даёт пустое имя');

    Assert.IsFalse(MainData.PaymentsEmpty);
    Assert.AreEqual('1500', MainData.CurrentPaymentSum);
    Assert.AreEqual(1, MainData.CurrentPaymentPupilId);

    Assert.IsFalse(MainData.ExpensesEmpty);
    Assert.AreEqual('Ручки', MainData.CurrentExpenseItem);
    Assert.AreEqual(2, MainData.CurrentExpenseCustomerId);
    Assert.AreNotEqual('', MainData.CurrentExpenseDate);
    Assert.IsTrue(TryStrToCurr(MainData.CurrentExpenseSum, SumValue));
    Assert.IsTrue(SumValue = 149.50, 'Сумма расхода читается без потери копеек');
  finally
    MainData.Free;
  end;
end;

procedure TRepositoryIntegrationTests.MainData_ExpenseWithoutCustomer_HasNoJoinedName;
var
  MainData: TMainData;
begin
  // customer = 0 — строка сальдо после архивации, LEFT JOIN даёт NULL.
  Exec('INSERT INTO dbo.outlay(date_purchaise, item_name, customer, summ) ' +
       'VALUES (''20260903'', N''Сальдо на конец периода'', 0, -500)');

  MainData := TMainData.Create(FConn);
  try
    MainData.RefreshData;

    Assert.IsFalse(MainData.ExpensesEmpty);
    Assert.AreEqual(0, MainData.CurrentExpenseCustomerId);
    Assert.IsTrue(MainData.ExpensesQuery.FieldByName('children_name').IsNull,
      'Для расхода без ученика joined-имя пустое');
  finally
    MainData.Free;
  end;
end;

procedure TRepositoryIntegrationTests.MainData_FieldLabelsConfigured;
var
  MainData: TMainData;
begin
  MainData := TMainData.Create(FConn);
  try
    MainData.RefreshData;

    Assert.AreEqual('ФИО ученика',
      MainData.PupilsQuery.FieldByName('children_name').DisplayLabel);
    Assert.AreEqual(28, MainData.PupilsQuery.FieldByName('children_name').DisplayWidth);
    Assert.AreEqual('Сумма',
      MainData.PaymentsQuery.FieldByName('summ_to_first_november').DisplayLabel);
    Assert.AreEqual('Дата архива',
      MainData.PaymentsArcQuery.FieldByName('date_ins').DisplayLabel);
  finally
    MainData.Free;
  end;
end;

initialization
  if SqlServerAvailable then
    TDUnitX.RegisterTestFixture(TRepositoryIntegrationTests);

end.
