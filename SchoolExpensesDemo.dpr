program SchoolExpensesDemo;

{
  Точка входа приложения.
  Composition root: здесь создаётся весь граф зависимостей
  (БД → репозитории → сервисы → данные) и передаётся в главную форму.
  Форма не поднимает инфраструктуру сама.
}

uses
  Vcl.Forms,
  uMainForm in 'uMainForm.pas' {MainForm},
  uDb in 'uDb.pas',
  uMigrations in 'uMigrations.pas',
  uRepositories in 'uRepositories.pas',
  uServices in 'uServices.pas',
  uUiHelpers in 'uUiHelpers.pas',
  uMainData in 'uMainData.pas',
  uUpdatePupilForm in 'uUpdatePupilForm.pas' {uEditPupilForm},
  uUpdatePaymentForm in 'uUpdatePaymentForm.pas' {uEditPaymentForm},
  uUpdateExenseForm in 'uUpdateExenseForm.pas' {uEditExpenseForm},
  uPupilsFrame in 'uPupilsFrame.pas' {PupilsFrame},
  uPaymentsFrame in 'uPaymentsFrame.pas' {PaymentsFrame},
  uExpensesFrame in 'uExpensesFrame.pas' {ExpensesFrame},
  uArchiveFrame in 'uArchiveFrame.pas' {ArchiveFrame};

{$R *.res}

var
  Db: TSchoolDb;
  Pupils: TPupilRepository;
  Payments: TPaymentRepository;
  Expenses: TExpenseRepository;
  Archive: TArchiveRepository;
  PupilSvc: TPupilService;
  PaymentSvc: TPaymentService;
  ExpenseSvc: TExpenseService;
  Balance: TBalanceService;
  ArchiveSvc: TArchiveService;
  MainData: TMainData;

begin
  Application.Initialize;
  Application.MainFormOnTaskbar := True;

  Db := TSchoolDb.Create;
  try
    Db.Connect;
    Db.Migrate;

    Pupils := TPupilRepository.Create(Db.Connection);
    Payments := TPaymentRepository.Create(Db.Connection);
    Expenses := TExpenseRepository.Create(Db.Connection);
    Archive := TArchiveRepository.Create(Db.Connection);
    try
      PupilSvc := TPupilService.Create(Pupils);
      PaymentSvc := TPaymentService.Create(Payments);
      ExpenseSvc := TExpenseService.Create(Expenses);
      Balance := TBalanceService.Create(Payments, Expenses);
      ArchiveSvc := TArchiveService.Create(Archive);
      try
        MainData := TMainData.Create(Db.Connection);
        try
          Application.CreateForm(TMainForm, MainForm);
          MainForm.Init(PupilSvc, PaymentSvc, ExpenseSvc, Balance,
            ArchiveSvc, MainData);
          Application.Run;
        finally
          MainData.Free;
        end;
      finally
        ArchiveSvc.Free;
        Balance.Free;
        ExpenseSvc.Free;
        PaymentSvc.Free;
        PupilSvc.Free;
      end;
    finally
      Archive.Free;
      Expenses.Free;
      Payments.Free;
      Pupils.Free;
    end;
  finally
    Db.Free;
  end;
end.
