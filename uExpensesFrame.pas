unit uExpensesFrame;

{
  Вкладка «Потраченные деньги».
  Панель ввода: ученик (combo), дата, назначение, сумма. Грид расходов.
  Мутации — через TExpenseService, список учеников для combo — через
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
  TExpensesFrame = class(TFrame)
    ExpensesPanel: TPanel;
    Label1: TLabel;
    Label2: TLabel;
    Label3: TLabel;
    Label4: TLabel;
    ExpensePupilCombo: TComboBox;
    ExpenseDateEdit: TEdit;
    ExpensePurposeEdit: TEdit;
    ExpenseSumEdit: TEdit;
    AddExpenseButton: TButton;
    ExpenseRefreshButton: TButton;
    DeleteExpenseButton: TButton;
    ExpensesGrid: TDBGrid;
    procedure AddExpenseClick(Sender: TObject);
    procedure DeleteExpenseClick(Sender: TObject);
    procedure ExpenseGridDbClick(Sender: TObject);
    procedure RefreshClick(Sender: TObject);
  private
    FExpenseSvc: TExpenseService;
    FPupilSvc: TPupilService;
    FMainData: TMainData;
    FOnRefresh: TNotifyEvent;
    procedure PopulateCombo(ASelectedId: Integer);
  public
    procedure Init(AExpenseSvc: TExpenseService; APupilSvc: TPupilService;
      AMainData: TMainData; AOnRefresh: TNotifyEvent);
    procedure RefreshView;
    destructor Destroy; override;
  end;

implementation

uses
  Vcl.Dialogs,
  uUiHelpers,
  uUpdateExenseForm;

{$R *.dfm}

procedure TExpensesFrame.Init(AExpenseSvc: TExpenseService;
  APupilSvc: TPupilService; AMainData: TMainData; AOnRefresh: TNotifyEvent);
begin
  FExpenseSvc := AExpenseSvc;
  FPupilSvc := APupilSvc;
  FMainData := AMainData;
  FOnRefresh := AOnRefresh;

  ExpensesGrid.DataSource := FMainData.ExpensesSource;
  ExpenseDateEdit.Text := TodayIso;
  PopulateCombo(0);
end;

destructor TExpensesFrame.Destroy;
begin
  ClearComboObjects(ExpensePupilCombo);
  inherited Destroy;
end;

procedure TExpensesFrame.PopulateCombo(ASelectedId: Integer);
var
  Entries: TPupilComboArray;
  I: Integer;
begin
  ClearComboObjects(ExpensePupilCombo);
  Entries := FPupilSvc.ListForCombo;
  for I := 0 to High(Entries) do
    AddPupilComboItem(ExpensePupilCombo, Entries[I].DisplayName, Entries[I].Id);
  SelectComboPupilId(ExpensePupilCombo, ASelectedId);
end;

procedure TExpensesFrame.RefreshView;
begin
  PopulateCombo(GetComboPupilId(ExpensePupilCombo));
end;

procedure TExpensesFrame.AddExpenseClick(Sender: TObject);
var
  Sum: Currency;
begin
  if not ParseSum(ExpenseSumEdit.Text, Sum) then
  begin
    ShowMessage('Введите положительную сумму');
    Exit;
  end;
  try
    FExpenseSvc.Add(
      GetComboPupilId(ExpensePupilCombo),
      ExpenseDateEdit.Text,
      ExpensePurposeEdit.Text,
      Sum);
    ExpensePurposeEdit.Clear;
    ExpenseSumEdit.Clear;
    if Assigned(FOnRefresh) then
      FOnRefresh(Self);
  except
    on E: Exception do ShowException(E);
  end;
end;

procedure TExpensesFrame.DeleteExpenseClick(Sender: TObject);
begin
  if not ConfirmDelete('Удалить расход?') then
    Exit;
  try
    FExpenseSvc.Delete(FMainData.CurrentExpenseId);
    if Assigned(FOnRefresh) then
      FOnRefresh(Self);
  except
    on E: Exception do ShowException(E);
  end;
end;

procedure TExpensesFrame.ExpenseGridDbClick(Sender: TObject);
var
  ExpenseId: Integer;
  EditForm: TuEditExpenseForm;
begin
  if FMainData.ExpensesEmpty then
    Exit;

  ExpenseId := FMainData.CurrentExpenseId;
  if ExpenseId <= 0 then
    Exit;

  EditForm := TuEditExpenseForm.Create(Self,
    FMainData.CurrentExpenseDate,
    FMainData.CurrentExpenseItem,
    FMainData.CurrentExpenseSum,
    FPupilSvc.ListForCombo,
    FMainData.CurrentExpenseCustomerId);
  try
    if EditForm.ShowModal = mrOk then
    try
      FExpenseSvc.Update(ExpenseId,
        EditForm.GetPupilId,
        EditForm.GetDate,
        EditForm.GetPurpose,
        EditForm.GetSum);
      if Assigned(FOnRefresh) then
        FOnRefresh(Self);
    except
      on E: Exception do ShowException(E);
    end;
  finally
    EditForm.Free;
  end;
end;

procedure TExpensesFrame.RefreshClick(Sender: TObject);
begin
  if Assigned(FOnRefresh) then
    FOnRefresh(Self);
end;

end.
