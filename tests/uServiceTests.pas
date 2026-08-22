unit uServiceTests;

{
  Юнит-тесты сервисного слоя (uServices).
  Репозитории заменены моками (uTestMocks): проверяются правила
  валидации и передача аргументов в репозиторий, без БД.
}

interface

uses
  System.SysUtils,
  DUnitX.TestFramework,
  uRepositories,
  uServices,
  uTestMocks;

type
  [TestFixture]
  TPupilServiceTests = class(TObject)
  private
    FRepo: TMockPupilRepo;
    FSvc: TPupilService;
  public
    [Setup]
    procedure Setup;
    [Teardown]
    procedure Teardown;

    [Test]
    procedure Add_Valid_PassesAllFieldsToRepository;
    [Test]
    procedure Add_BlankName_RaisesValidation;
    [Test]
    procedure Delete_Valid_DelegatesToRepository;
    [Test]
    procedure Delete_InvalidId_RaisesValidation;
    [Test]
    procedure Update_Valid_PassesAllFieldsToRepository;
    [Test]
    procedure Update_BlankName_RaisesValidation;
    [Test]
    procedure Update_InvalidId_RaisesValidation;
    [Test]
    procedure ListForCombo_ReturnsRepositoryData;
  end;

  [TestFixture]
  TPaymentServiceTests = class(TObject)
  private
    FRepo: TMockPaymentRepo;
    FSvc: TPaymentService;
  public
    [Setup]
    procedure Setup;
    [Teardown]
    procedure Teardown;

    [Test]
    procedure Add_Valid_PassesArgumentsToRepository;
    [Test]
    procedure Add_WithoutPupil_RaisesValidation;
    [Test]
    procedure Add_ZeroSum_RaisesValidation;
    [Test]
    procedure Add_NegativeSum_RaisesValidation;
    [Test]
    procedure Update_Valid_PassesArgumentsToRepository;
    [Test]
    procedure Update_InvalidId_RaisesValidation;
    [Test]
    procedure Update_ZeroSum_RaisesValidation;
    [Test]
    procedure Delete_Valid_DelegatesToRepository;
    [Test]
    procedure Delete_InvalidId_RaisesValidation;
    [Test]
    procedure Total_PassesThroughRepositoryValue;
  end;

  [TestFixture]
  TExpenseServiceTests = class(TObject)
  private
    FRepo: TMockExpenseRepo;
    FSvc: TExpenseService;
  public
    [Setup]
    procedure Setup;
    [Teardown]
    procedure Teardown;

    [Test]
    procedure Add_Valid_PassesArgumentsToRepository;
    [Test]
    procedure Add_WithoutPupil_RaisesValidation;
    [Test]
    procedure Add_BlankDate_RaisesValidation;
    [Test]
    procedure Add_BlankItem_RaisesValidation;
    [Test]
    procedure Add_ZeroSum_RaisesValidation;
    [Test]
    procedure Update_Valid_PassesArgumentsToRepository;
    [Test]
    procedure Update_InvalidId_RaisesValidation;
    [Test]
    procedure Update_BlankItem_RaisesValidation;
    [Test]
    procedure Delete_Valid_DelegatesToRepository;
    [Test]
    procedure Total_PassesThroughRepositoryValue;
  end;

  [TestFixture]
  TBalanceServiceTests = class(TObject)
  private
    FPayments: TMockPaymentRepo;
    FExpenses: TMockExpenseRepo;
    FSvc: TBalanceService;
  public
    [Setup]
    procedure Setup;
    [Teardown]
    procedure Teardown;

    [Test]
    procedure Balance_ComputesDifference;
    [Test]
    procedure Balance_NoData_IsZero;
    [Test]
    procedure Balance_Overspend_IsNegative;
  end;

  [TestFixture]
  TArchiveServiceTests = class(TObject)
  private
    FRepo: TMockArchiveRepo;
    FSvc: TArchiveService;
  public
    [Setup]
    procedure Setup;
    [Teardown]
    procedure Teardown;

    [Test]
    procedure Preview_ReturnsRepositorySnapshot;
    [Test]
    procedure ClosePeriod_PassesStandardCarryOverName;
    [Test]
    procedure ClosePeriod_ReturnsRepositoryResult;
    [Test]
    procedure ClosePeriod_NothingToArchive_RaisesValidation;
  end;

implementation

// Проверяет, что действие бросает EValidationException с точным сообщением.
procedure ExpectValidationError(AAction: TProc; const AExpectedMessage: string);
var
  Raised: Boolean;
begin
  Raised := False;
  try
    AAction();
  except
    on E: EValidationException do
    begin
      Raised := True;
      Assert.AreEqual(AExpectedMessage, E.Message);
    end;
  end;
  Assert.IsTrue(Raised,
    'Ожидалось исключение EValidationException: ' + AExpectedMessage);
end;

{ TPupilServiceTests }

procedure TPupilServiceTests.Setup;
begin
  FRepo := TMockPupilRepo.Create;
  FSvc := TPupilService.Create(FRepo);
end;

procedure TPupilServiceTests.Teardown;
begin
  FSvc.Free;
  FRepo.Free;
end;

procedure TPupilServiceTests.Add_Valid_PassesAllFieldsToRepository;
begin
  FSvc.Add('Иванов А.', 'Иванов Б.В.', '+79001112233', 'да');

  Assert.AreEqual(1, FRepo.AddCount);
  Assert.AreEqual('Иванов А.', FRepo.LastAddedName);
  Assert.AreEqual('Иванов Б.В.', FRepo.LastAddedParent);
  Assert.AreEqual('+79001112233', FRepo.LastAddedPhone);
  Assert.AreEqual('да', FRepo.LastAddedAfterLesson);
end;

procedure TPupilServiceTests.Add_BlankName_RaisesValidation;
begin
  ExpectValidationError(
    procedure begin FSvc.Add('   ', 'Родитель', '', '') end,
    'ФИО ученика обязательно');
  Assert.AreEqual(0, FRepo.AddCount, 'Репозиторий не должен вызываться');
end;

procedure TPupilServiceTests.Delete_Valid_DelegatesToRepository;
begin
  FSvc.Delete(42);

  Assert.AreEqual(1, FRepo.DeleteCount);
  Assert.AreEqual(42, FRepo.LastDeletedId);
end;

procedure TPupilServiceTests.Delete_InvalidId_RaisesValidation;
begin
  ExpectValidationError(procedure begin FSvc.Delete(0) end, 'Выберите ученика');
  ExpectValidationError(procedure begin FSvc.Delete(-5) end, 'Выберите ученика');
  Assert.AreEqual(0, FRepo.DeleteCount, 'Репозиторий не должен вызываться');
end;

procedure TPupilServiceTests.Update_Valid_PassesAllFieldsToRepository;
begin
  FSvc.Update(7, 'Петрова В.', 'Сидорова Г.П.', '+79005556677', 'нет');

  Assert.AreEqual(1, FRepo.UpdateCount);
  Assert.AreEqual(7, FRepo.LastUpdatedId);
  Assert.AreEqual('Петрова В.', FRepo.LastUpdatedName);
  Assert.AreEqual('Сидорова Г.П.', FRepo.LastUpdatedParent);
  Assert.AreEqual('+79005556677', FRepo.LastUpdatedPhone);
  Assert.AreEqual('нет', FRepo.LastUpdatedAfterLesson);
end;

procedure TPupilServiceTests.Update_BlankName_RaisesValidation;
begin
  ExpectValidationError(
    procedure begin FSvc.Update(7, '', 'Родитель', '', '') end,
    'ФИО ученика обязательно');
  Assert.AreEqual(0, FRepo.UpdateCount, 'Репозиторий не должен вызываться');
end;

procedure TPupilServiceTests.Update_InvalidId_RaisesValidation;
begin
  ExpectValidationError(
    procedure begin FSvc.Update(0, 'Имя', '', '', '') end,
    'Выберите ученика');
  Assert.AreEqual(0, FRepo.UpdateCount, 'Репозиторий не должен вызываться');
end;

procedure TPupilServiceTests.ListForCombo_ReturnsRepositoryData;
var
  Actual: TPupilComboArray;
begin
  SetLength(FRepo.ComboToReturn, 2);
  FRepo.ComboToReturn[0] := MakeComboEntry(1, 'Иванов А.');
  FRepo.ComboToReturn[1] := MakeComboEntry(2, 'Петрова В.');

  Actual := FSvc.ListForCombo;

  Assert.AreEqual<Integer>(2, Length(Actual));
  Assert.AreEqual(1, Actual[0].Id);
  Assert.AreEqual('Иванов А.', Actual[0].DisplayName);
  Assert.AreEqual(2, Actual[1].Id);
  Assert.AreEqual('Петрова В.', Actual[1].DisplayName);
end;

{ TPaymentServiceTests }

procedure TPaymentServiceTests.Setup;
begin
  FRepo := TMockPaymentRepo.Create;
  FSvc := TPaymentService.Create(FRepo);
end;

procedure TPaymentServiceTests.Teardown;
begin
  FSvc.Free;
  FRepo.Free;
end;

procedure TPaymentServiceTests.Add_Valid_PassesArgumentsToRepository;
begin
  FSvc.Add(3, 'Иванов А.', 1500);

  Assert.AreEqual(1, FRepo.AddCount);
  Assert.AreEqual(3, FRepo.LastAddedPupilId);
  Assert.AreEqual('Иванов А.', FRepo.LastAddedName);
  Assert.IsTrue(FRepo.LastAddedSum = 1500, 'Сумма должна передаваться в репозиторий');
end;

procedure TPaymentServiceTests.Add_WithoutPupil_RaisesValidation;
begin
  ExpectValidationError(
    procedure begin FSvc.Add(0, 'Иванов А.', 100) end,
    'Выберите ученика');
  Assert.AreEqual(0, FRepo.AddCount, 'Репозиторий не должен вызываться');
end;

procedure TPaymentServiceTests.Add_ZeroSum_RaisesValidation;
begin
  ExpectValidationError(
    procedure begin FSvc.Add(3, 'Иванов А.', 0) end,
    'Сумма должна быть больше нуля');
  Assert.AreEqual(0, FRepo.AddCount, 'Репозиторий не должен вызываться');
end;

procedure TPaymentServiceTests.Add_NegativeSum_RaisesValidation;
begin
  ExpectValidationError(
    procedure begin FSvc.Add(3, 'Иванов А.', -50) end,
    'Сумма должна быть больше нуля');
  Assert.AreEqual(0, FRepo.AddCount, 'Репозиторий не должен вызываться');
end;

procedure TPaymentServiceTests.Update_Valid_PassesArgumentsToRepository;
begin
  FSvc.Update(3, 'Иванов А.', 2000);

  Assert.AreEqual(1, FRepo.UpdateCount);
  Assert.AreEqual(3, FRepo.LastUpdatedId);
  Assert.AreEqual('Иванов А.', FRepo.LastUpdatedName);
  Assert.IsTrue(FRepo.LastUpdatedSum = 2000, 'Сумма должна передаваться в репозиторий');
end;

procedure TPaymentServiceTests.Update_InvalidId_RaisesValidation;
begin
  ExpectValidationError(
    procedure begin FSvc.Update(0, 'Иванов А.', 100) end,
    'Выберите платёж');
  Assert.AreEqual(0, FRepo.UpdateCount, 'Репозиторий не должен вызываться');
end;

procedure TPaymentServiceTests.Update_ZeroSum_RaisesValidation;
begin
  ExpectValidationError(
    procedure begin FSvc.Update(3, 'Иванов А.', 0) end,
    'Сумма должна быть больше нуля');
  Assert.AreEqual(0, FRepo.UpdateCount, 'Репозиторий не должен вызываться');
end;

procedure TPaymentServiceTests.Delete_Valid_DelegatesToRepository;
begin
  FSvc.Delete(9);

  Assert.AreEqual(1, FRepo.DeleteCount);
  Assert.AreEqual(9, FRepo.LastDeletedId);
end;

procedure TPaymentServiceTests.Delete_InvalidId_RaisesValidation;
begin
  ExpectValidationError(procedure begin FSvc.Delete(-1) end, 'Выберите платёж');
  Assert.AreEqual(0, FRepo.DeleteCount, 'Репозиторий не должен вызываться');
end;

procedure TPaymentServiceTests.Total_PassesThroughRepositoryValue;
begin
  FRepo.TotalToReturn := 4321.25;

  Assert.IsTrue(FSvc.Total = 4321.25);
end;

{ TExpenseServiceTests }

procedure TExpenseServiceTests.Setup;
begin
  FRepo := TMockExpenseRepo.Create;
  FSvc := TExpenseService.Create(FRepo);
end;

procedure TExpenseServiceTests.Teardown;
begin
  FSvc.Free;
  FRepo.Free;
end;

procedure TExpenseServiceTests.Add_Valid_PassesArgumentsToRepository;
begin
  FSvc.Add(2, '2026-09-01', 'Тетради', 250.50);

  Assert.AreEqual(1, FRepo.AddCount);
  Assert.AreEqual(2, FRepo.LastAddedPupilId);
  Assert.AreEqual('2026-09-01', FRepo.LastAddedDate);
  Assert.AreEqual('Тетради', FRepo.LastAddedItem);
  Assert.IsTrue(FRepo.LastAddedSum = 250.50, 'Сумма должна передаваться в репозиторий');
end;

procedure TExpenseServiceTests.Add_WithoutPupil_RaisesValidation;
begin
  ExpectValidationError(
    procedure begin FSvc.Add(0, '2026-09-01', 'Тетради', 10) end,
    'Выберите ученика');
  Assert.AreEqual(0, FRepo.AddCount, 'Репозиторий не должен вызываться');
end;

procedure TExpenseServiceTests.Add_BlankDate_RaisesValidation;
begin
  ExpectValidationError(
    procedure begin FSvc.Add(2, '  ', 'Тетради', 10) end,
    'Дата обязательна для заполнения');
  Assert.AreEqual(0, FRepo.AddCount, 'Репозиторий не должен вызываться');
end;

procedure TExpenseServiceTests.Add_BlankItem_RaisesValidation;
begin
  ExpectValidationError(
    procedure begin FSvc.Add(2, '2026-09-01', '', 10) end,
    'Назначение обязательно для заполнения');
  Assert.AreEqual(0, FRepo.AddCount, 'Репозиторий не должен вызываться');
end;

procedure TExpenseServiceTests.Add_ZeroSum_RaisesValidation;
begin
  ExpectValidationError(
    procedure begin FSvc.Add(2, '2026-09-01', 'Тетради', 0) end,
    'Сумма должна быть больше нуля');
  Assert.AreEqual(0, FRepo.AddCount, 'Репозиторий не должен вызываться');
end;

procedure TExpenseServiceTests.Update_Valid_PassesArgumentsToRepository;
begin
  FSvc.Update(11, 2, '2026-09-02', 'Ручки', 149.50);

  Assert.AreEqual(1, FRepo.UpdateCount);
  Assert.AreEqual(11, FRepo.LastUpdatedId);
  Assert.AreEqual(2, FRepo.LastUpdatedPupilId);
  Assert.AreEqual('2026-09-02', FRepo.LastUpdatedDate);
  Assert.AreEqual('Ручки', FRepo.LastUpdatedItem);
  Assert.IsTrue(FRepo.LastUpdatedSum = 149.50, 'Сумма должна передаваться в репозиторий');
end;

procedure TExpenseServiceTests.Update_InvalidId_RaisesValidation;
begin
  ExpectValidationError(
    procedure begin FSvc.Update(0, 2, '2026-09-02', 'Ручки', 10) end,
    'Выберите расход');
  Assert.AreEqual(0, FRepo.UpdateCount, 'Репозиторий не должен вызываться');
end;

procedure TExpenseServiceTests.Update_BlankItem_RaisesValidation;
begin
  ExpectValidationError(
    procedure begin FSvc.Update(11, 2, '2026-09-02', ' ', 10) end,
    'Назначение обязательно для заполнения');
  Assert.AreEqual(0, FRepo.UpdateCount, 'Репозиторий не должен вызываться');
end;

procedure TExpenseServiceTests.Delete_Valid_DelegatesToRepository;
begin
  FSvc.Delete(11);

  Assert.AreEqual(1, FRepo.DeleteCount);
  Assert.AreEqual(11, FRepo.LastDeletedId);
end;

procedure TExpenseServiceTests.Total_PassesThroughRepositoryValue;
begin
  FRepo.TotalToReturn := 998.75;

  Assert.IsTrue(FSvc.Total = 998.75);
end;

{ TBalanceServiceTests }

procedure TBalanceServiceTests.Setup;
begin
  FPayments := TMockPaymentRepo.Create;
  FExpenses := TMockExpenseRepo.Create;
  FSvc := TBalanceService.Create(FPayments, FExpenses);
end;

procedure TBalanceServiceTests.Teardown;
begin
  FSvc.Free;
  FPayments.Free;
  FExpenses.Free;
end;

procedure TBalanceServiceTests.Balance_ComputesDifference;
begin
  FPayments.TotalToReturn := 2200;
  FExpenses.TotalToReturn := 400;

  Assert.IsTrue(FSvc.Balance = 1800, 'Баланс = поступления - расходы');
end;

procedure TBalanceServiceTests.Balance_NoData_IsZero;
begin
  Assert.IsTrue(FSvc.Balance = 0);
end;

procedure TBalanceServiceTests.Balance_Overspend_IsNegative;
begin
  FPayments.TotalToReturn := 100;
  FExpenses.TotalToReturn := 350;

  Assert.IsTrue(FSvc.Balance = -250, 'При перерасходе баланс отрицательный');
end;

{ TArchiveServiceTests }

procedure TArchiveServiceTests.Setup;
begin
  FRepo := TMockArchiveRepo.Create;
  FSvc := TArchiveService.Create(FRepo);
end;

procedure TArchiveServiceTests.Teardown;
begin
  FSvc.Free;
  FRepo.Free;
end;

procedure TArchiveServiceTests.Preview_ReturnsRepositorySnapshot;
var
  Snapshot: TClosePeriodResult;
  Actual: TClosePeriodResult;
begin
  Snapshot.ResetPayments := 3;
  Snapshot.ArchivedExpenses := 7;
  Snapshot.CarryOverSum := -1234.56;
  FRepo.PreviewToReturn := Snapshot;

  Actual := FSvc.Preview;

  Assert.AreEqual(1, FRepo.PreviewCalls);
  Assert.AreEqual(Snapshot.ResetPayments, Actual.ResetPayments);
  Assert.AreEqual(Snapshot.ArchivedExpenses, Actual.ArchivedExpenses);
  Assert.IsTrue(Actual.CarryOverSum = Snapshot.CarryOverSum);
end;

procedure TArchiveServiceTests.ClosePeriod_PassesStandardCarryOverName;
begin
  FRepo.ClosePeriodToReturn.ResetPayments := 1;
  FRepo.ClosePeriodToReturn.ArchivedExpenses := 1;

  FSvc.ClosePeriod;

  Assert.AreEqual(1, FRepo.ClosePeriodCalls);
  Assert.AreEqual(CarryOverItemName, FRepo.LastCarryOverItemName);
end;

procedure TArchiveServiceTests.ClosePeriod_ReturnsRepositoryResult;
var
  Actual: TClosePeriodResult;
begin
  FRepo.ClosePeriodToReturn.ResetPayments := 2;
  FRepo.ClosePeriodToReturn.ArchivedExpenses := 5;
  FRepo.ClosePeriodToReturn.CarryOverSum := -800;

  Actual := FSvc.ClosePeriod;

  Assert.AreEqual(2, Actual.ResetPayments);
  Assert.AreEqual(5, Actual.ArchivedExpenses);
  Assert.IsTrue(Actual.CarryOverSum = -800);
end;

procedure TArchiveServiceTests.ClosePeriod_NothingToArchive_RaisesValidation;
begin
  // Нулевые счётчики — архивировать было нечего.
  FRepo.ClosePeriodToReturn.ResetPayments := 0;
  FRepo.ClosePeriodToReturn.ArchivedExpenses := 0;

  ExpectValidationError(
    procedure begin FSvc.ClosePeriod end,
    'Нет данных для архивации');
end;

initialization
  TDUnitX.RegisterTestFixture(TPupilServiceTests);
  TDUnitX.RegisterTestFixture(TPaymentServiceTests);
  TDUnitX.RegisterTestFixture(TExpenseServiceTests);
  TDUnitX.RegisterTestFixture(TBalanceServiceTests);
  TDUnitX.RegisterTestFixture(TArchiveServiceTests);

end.
