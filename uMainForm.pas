unit uMainForm;

{
  Главная форма — тонкая оболочка.
  Содержит PageControl с четырьмя вкладками и StatusLabel с балансом.
  Вся логика вкладок вынесена в frame-ы (uPupilsFrame, uPaymentsFrame,
  uExpensesFrame, uArchiveFrame). Форма создаёт frame-ы, передаёт им
  зависимости через Init и оркестрирует общий refresh + статус.

  Форма не знает ни схемы БД, ни репозиториев — только сервисы и
  обёртки слоя данных (uMainData).
}

interface

uses
  System.SysUtils,
  System.Classes,
  Vcl.Controls,
  Vcl.ExtCtrls,
  Vcl.Forms,
  Vcl.StdCtrls,
  Vcl.ComCtrls,
  uMainData,
  uServices,
  uPupilsFrame,
  uPaymentsFrame,
  uExpensesFrame,
  uArchiveFrame;

type
  TMainForm = class(TForm)
    StatusLabel: TLabel;
    PageControl: TPageControl;
    PupilsTab: TTabSheet;
    PaymentsTab: TTabSheet;
    ExpensesTab: TTabSheet;
    ArchiveTab: TTabSheet;
    procedure MainFormClose(Sender: TObject; var Action: TCloseAction);
  private
    FPupilSvc: TPupilService;
    FPaymentSvc: TPaymentService;
    FExpenseSvc: TExpenseService;
    FBalance: TBalanceService;
    FMainData: TMainData;

    FPupilsFrame: TPupilsFrame;
    FPaymentsFrame: TPaymentsFrame;
    FExpensesFrame: TExpensesFrame;
    FArchiveFrame: TArchiveFrame;

    procedure CreateFrames;
    procedure RefreshData(Sender: TObject);
    procedure UpdateStatus;
  public
    procedure Init(APupilSvc: TPupilService; APaymentSvc: TPaymentService;
      AExpenseSvc: TExpenseService; ABalance: TBalanceService;
      AMainData: TMainData);
  end;

var
  MainForm: TMainForm;

implementation

{$R *.dfm}

procedure TMainForm.Init(APupilSvc: TPupilService; APaymentSvc: TPaymentService;
  AExpenseSvc: TExpenseService; ABalance: TBalanceService;
  AMainData: TMainData);
begin
  FPupilSvc := APupilSvc;
  FPaymentSvc := APaymentSvc;
  FExpenseSvc := AExpenseSvc;
  FBalance := ABalance;
  FMainData := AMainData;

  CreateFrames;
  RefreshData(nil);
end;

procedure TMainForm.CreateFrames;
begin
  FPupilsFrame := TPupilsFrame.Create(Self);
  FPupilsFrame.Parent := PupilsTab;
  FPupilsFrame.Align := alClient;
  FPupilsFrame.Init(FPupilSvc, FMainData, RefreshData);

  FPaymentsFrame := TPaymentsFrame.Create(Self);
  FPaymentsFrame.Parent := PaymentsTab;
  FPaymentsFrame.Align := alClient;
  FPaymentsFrame.Init(FPaymentSvc, FPupilSvc, FMainData, RefreshData);

  FExpensesFrame := TExpensesFrame.Create(Self);
  FExpensesFrame.Parent := ExpensesTab;
  FExpensesFrame.Align := alClient;
  FExpensesFrame.Init(FExpenseSvc, FPupilSvc, FMainData, RefreshData);

  FArchiveFrame := TArchiveFrame.Create(Self);
  FArchiveFrame.Parent := ArchiveTab;
  FArchiveFrame.Align := alClient;
  FArchiveFrame.Init(FMainData);
end;

procedure TMainForm.RefreshData(Sender: TObject);
begin
  FMainData.RefreshData;
  FPupilsFrame.RefreshView;
  FPaymentsFrame.RefreshView;
  FExpensesFrame.RefreshView;
  FArchiveFrame.RefreshView;
  UpdateStatus;
end;

procedure TMainForm.UpdateStatus;
begin
  StatusLabel.Caption := Format(
    'Сдано: %m   Потрачено: %m   Баланс: %m',
    [FPaymentSvc.Total, FExpenseSvc.Total, FBalance.Balance]
  );
end;

procedure TMainForm.MainFormClose(Sender: TObject; var Action: TCloseAction);
begin
  Action := caFree;
end;

end.
