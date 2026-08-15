window.LEARN_FILES = window.LEARN_FILES || {};
window.LEARN_FILES['uExpensesFrame'] = {
  code: `﻿unit uExpensesFrame;

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
`,
  annotations: [
    {
      startLine: 1, endLine: 8,
      title: 'Заголовок модуля uExpensesFrame',
      explanation: 'Вкладка «Потраченные деньги». Самый сложный фрейм по вводу: combo ученика + дата + назначение + сумма (4 поля). Мутации через TExpenseService, combo через TPupilService. Структура очень близка к uPaymentsFrame — отличие в большем числе полей ввода (расход имеет дату и назначение, платёж — нет) и в форме редактирования (TuEditExpenseForm).'
    },
    {
      startLine: 24, endLine: 54,
      title: 'Класс TExpensesFrame',
      explanation: 'class(TFrame). Компоненты: ExpensesPanel, 4 Label, ExpensePupilCombo (TComboBox), ExpenseDateEdit, ExpensePurposeEdit, ExpenseSumEdit (3 TEdit), 3 Button, ExpensesGrid. private: FExpenseSvc, FPupilSvc, FMainData, FOnRefresh, PopulateCombo. Структура зеркальна TPaymentsFrame, но полей ввода больше.'
    },
    {
      startLine: 65, endLine: 76,
      title: 'Init — привязка и предзаполнение даты',
      explanation: 'Сохраняет 2 сервиса + данные + колбэк. Привязывает грид к ExpensesSource. ВАЖНО: ExpenseDateEdit.Text := TodayIso — предзаполняет поле даты текущей датой (ISO формат). Это UX: чаще всего расход вносится «по факту», дата = сегодня. PopulateCombo(0) — заполнить список учеников. У PaymentsFrame такой строки нет (там даты не бывает).'
    },
    {
      startLine: 78, endLine: 82,
      title: 'Destroy',
      explanation: 'ClearComboObjects(ExpensePupilCombo) — освободить TPupilComboItem из combo. inherited Destroy. Стандартный паттерн, идентичен PaymentsFrame.'
    },
    {
      startLine: 84, endLine: 99,
      title: 'PopulateCombo и RefreshView',
      explanation: 'PopulateCombo: очистить → получить список через FPupilSvc.ListForCombo → заполнить → выбрать указанного. RefreshView: PopulateCombo(текущий выбранный id) — обновить список, сохранив выбор. Идентично PaymentsFrame — общий паттерн для фреймов с combo.'
    },
    {
      startLine: 101, endLine: 123,
      title: 'AddExpenseClick — добавление расхода',
      explanation: 'ParseSum проверяет сумму. FExpenseSvc.Add(id ученика, дата, назначение, сумма) — 4 параметра (самый «толстый» вызов). После успеха — очистить назначение и сумму (дату НЕ очищать — она остаётся сегодня, удобно для серии расходов). FOnRefresh. try/except ловит EValidationException (сервис проверит все 4 поля).'
    },
    {
      startLine: 125, endLine: 136,
      title: 'DeleteExpenseClick',
      explanation: 'ConfirmDelete → FExpenseSvc.Delete(CurrentExpenseId) → FOnRefresh. try/except ловит ошибки и показывает через ShowException. CurrentExpenseId — настоящий PK расхода (поле id), не id ученика — в отличие от платежей, где id = id ученика.'
    },
    {
      startLine: 138, endLine: 172,
      title: 'ExpenseGridDbClick — редактирование',
      explanation: 'Двойной клик → TuEditExpenseForm. Передаёт: дату (Edit1), назначение (Edit2), сумму (Edit3), список combo, id покупателя (CurrentExpenseCustomerId — для выбора в combo). ShowModal = mrOk → FExpenseSvc.Update(ExpenseId, новый id ученика, дата, назначение, сумма). Обратите внимание: Update принимает id из формы (GetPupilId), а не из MainData — пользователь мог выбрать ДРУГОГО ученика. try/finally + вложенный try/except.'
    },
    {
      startLine: 174, endLine: 178,
      title: 'RefreshClick',
      explanation: 'Кнопка «Обновить» — вызывает FOnRefresh. Стандарт для всех фреймов.'
    }
  ]
};
