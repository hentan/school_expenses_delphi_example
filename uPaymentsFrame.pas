unit uPaymentsFrame;

{
  Вкладка «Сданные деньги».
  Панель ввода: ученик (combo) + сумма. Грид платежей.
  Мутации — через TPaymentService, список учеников для combo — через
  TPupilService.ListForCombo. После мутаций вызывается колбэк FOnRefresh.
}

interface

uses
  System.SysUtils,
  System.Classes,
  Vcl.Controls,
  Vcl.StdCtrls,
  Vcl.ExtCtrls,
  Vcl.DBGrids,
  Vcl.Forms,
  uMainData,
  uServices,
  uRepositories;

type
  TPaymentsFrame = class(TFrame)
    PaymentsPanel: TPanel;
    Label9: TLabel;
    Label12: TLabel;
    PaymentPupilCombo: TComboBox;
    PaymentSumEdit: TEdit;
    AddPaymentButton: TButton;
    PaymentRefreshButton: TButton;
    DeletePaymentButton: TButton;
    PaymentsGrid: TDBGrid;
    procedure AddPaymentClick(Sender: TObject);
    procedure DeletePaymentClick(Sender: TObject);
    procedure PaymentGridDbClick(Sender: TObject);
    procedure RefreshClick(Sender: TObject);
  private
    FPaymentSvc: TPaymentService;
    FPupilSvc: TPupilService;
    FMainData: TMainData;
    FOnRefresh: TNotifyEvent;
    procedure PopulateCombo(ASelectedId: Integer);
    function SelectedPupilName: string;
  public
    procedure Init(APaymentSvc: TPaymentService; APupilSvc: TPupilService;
      AMainData: TMainData; AOnRefresh: TNotifyEvent);
    procedure RefreshView;
    destructor Destroy; override;
  end;

implementation

uses
  Vcl.Dialogs,
  uUiHelpers,
  uUpdatePaymentForm;

{$R *.dfm}

procedure TPaymentsFrame.Init(APaymentSvc: TPaymentService;
  APupilSvc: TPupilService; AMainData: TMainData; AOnRefresh: TNotifyEvent);
begin
  FPaymentSvc := APaymentSvc;
  FPupilSvc := APupilSvc;
  FMainData := AMainData;
  FOnRefresh := AOnRefresh;

  PaymentsGrid.DataSource := FMainData.PaymentsSource;
  PopulateCombo(0);
end;

destructor TPaymentsFrame.Destroy;
begin
  ClearComboObjects(PaymentPupilCombo);
  inherited Destroy;
end;

procedure TPaymentsFrame.PopulateCombo(ASelectedId: Integer);
var
  Entries: TPupilComboArray;
  I: Integer;
begin
  ClearComboObjects(PaymentPupilCombo);
  Entries := FPupilSvc.ListForCombo;
  for I := 0 to High(Entries) do
    AddPupilComboItem(PaymentPupilCombo, Entries[I].DisplayName, Entries[I].Id);
  SelectComboPupilId(PaymentPupilCombo, ASelectedId);
end;

function TPaymentsFrame.SelectedPupilName: string;
begin
  Result := FMainData.PupilNameById(GetComboPupilId(PaymentPupilCombo));
end;

procedure TPaymentsFrame.RefreshView;
begin
  PopulateCombo(GetComboPupilId(PaymentPupilCombo));
end;

procedure TPaymentsFrame.AddPaymentClick(Sender: TObject);
var
  Sum: Integer;
begin
  if not ParseIntSum(PaymentSumEdit.Text, Sum) then
  begin
    ShowMessage('Введите положительную целую сумму');
    Exit;
  end;
  try
    FPaymentSvc.Add(
      GetComboPupilId(PaymentPupilCombo),
      SelectedPupilName,
      Sum);
    PaymentSumEdit.Clear;
    if Assigned(FOnRefresh) then
      FOnRefresh(Self);
  except
    on E: Exception do ShowException(E);
  end;
end;

procedure TPaymentsFrame.DeletePaymentClick(Sender: TObject);
begin
  if not ConfirmDelete('Удалить платёж?') then
    Exit;
  try
    FPaymentSvc.Delete(FMainData.CurrentPaymentId);
    if Assigned(FOnRefresh) then
      FOnRefresh(Self);
  except
    on E: Exception do ShowException(E);
  end;
end;

procedure TPaymentsFrame.PaymentGridDbClick(Sender: TObject);
var
  PaymentId: Integer;
  Sum: Integer;
  EditForm: TuEditPaymentForm;
begin
  if FMainData.PaymentsEmpty then
    Exit;

  PaymentId := FMainData.CurrentPaymentId;
  if PaymentId <= 0 then
    Exit;

  EditForm := TuEditPaymentForm.Create(Self,
    FMainData.CurrentPaymentPupilName,
    '',
    FMainData.CurrentPaymentSum,
    FPupilSvc.ListForCombo,
    FMainData.CurrentPaymentPupilId);
  try
    if EditForm.ShowModal = mrOk then
    try
      Sum := Trunc(EditForm.GetSum);
      FPaymentSvc.Update(PaymentId,
        FMainData.PupilNameById(EditForm.GetPupilId),
        Sum);
      if Assigned(FOnRefresh) then
        FOnRefresh(Self);
    except
      on E: Exception do ShowException(E);
    end;
  finally
    EditForm.Free;
  end;
end;

procedure TPaymentsFrame.RefreshClick(Sender: TObject);
begin
  if Assigned(FOnRefresh) then
    FOnRefresh(Self);
end;

end.
