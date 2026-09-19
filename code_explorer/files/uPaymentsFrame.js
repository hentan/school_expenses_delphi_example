window.LEARN_FILES = window.LEARN_FILES || {};
window.LEARN_FILES['uPaymentsFrame'] = {
  code: `﻿unit uPaymentsFrame;

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
`,
  annotations: [
    {
      startLine: 1, endLine: 8,
      title: 'Заголовок модуля uPaymentsFrame',
      explanation: 'Вкладка «Сданные деньги». Панель ввода: выпадающий список учеников (combo) + сумма. Грид платежей. Мутации через TPaymentService. Список учеников для combo заполняется через TPupilService.ListForCombo (а не напрямую из БД) — это использование «соседнего» сервиса. Главная фишка: combo хранит id ученика в Objects (TPupilComboItem), текст — имя.'
    },
    {
      startLine: 12, endLine: 22,
      title: 'interface uses',
      explanation: 'Vcl.* (визуальные компоненты), uMainData (данные), uServices (TPaymentService + TPupilService), uRepositories (TPupilComboArray — тип для заполнения combo). Зависимость от ДВУХ сервисов: платёжного (мутации) и ученического (список для combo).'
    },
    {
      startLine: 24, endLine: 51,
      title: 'Класс TPaymentsFrame',
      explanation: 'class(TFrame). Компоненты: PaymentsPanel, Label’ы, PaymentPupilCombo (TComboBox), PaymentSumEdit (TEdit), 3 Button, PaymentsGrid (TDBGrid). private: FPaymentSvc, FPupilSvc (ДВА сервиса!), FMainData, FOnRefresh. PopulateCombo (заполнить список), SelectedPupilName (имя выбранного). Destroy override — для очистки combo. Сильнее связан, чем PupilsFrame — имеет combo и два сервиса.'
    },
    {
      startLine: 62, endLine: 72,
      title: 'Init — привязка и первичное заполнение',
      explanation: 'Сохраняет 2 сервиса + данные + колбэк. PaymentsGrid.DataSource := PaymentsSource — привязка грида. PopulateCombo(0) — первое заполнение combo (0 = никто не выбран). Главная форма передаёт сюда FPupilSvc, чтобы фрейм мог получить список учеников для combo.'
    },
    {
      startLine: 74, endLine: 78,
      title: 'Destroy — очистка combo',
      explanation: 'ClearComboObjects(PaymentPupilCombo) — освобождает TPupilComboItem из combo перед уничтожением фрейма. Без этого утечка памяти (Objects не освобождаются автоматически). inherited Destroy — стандартный вызов. override обязателен для виртуального Destroy.'
    },
    {
      startLine: 80, endLine: 90,
      title: 'PopulateCombo — заполнение списка',
      explanation: 'Сначала ClearComboObjects (очистить старое + освободить объекты). Затем Entries := FPupilSvc.ListForCombo — получить свежий список учеников (через сервис → репозиторий → SELECT). Цикл AddPupilComboItem — добавить каждого в combo. SelectComboPupilId(ASelectedId) — выбрать указанного (для сохранения выбора при обновлении).'
    },
    {
      startLine: 92, endLine: 95,
      title: 'SelectedPupilName',
      explanation: 'Возвращает ИМЯ выбранного ученика. GetComboPupilId (uUiHelpers) читает id из combo, затем FMainData.PupilNameById ищет имя по id в наборе данных. Зачем так: combo показывает имя, но сервису Add нужно и имя, и id — поэтому имя извлекается через MainData, а не читается из combo напрямую (могло бы быть некорректным при рассинхронизации).'
    },
    {
      startLine: 97, endLine: 100,
      title: 'RefreshView',
      explanation: 'В отличие от PupilsFrame, здесь RefreshView НЕ пустой — перезаполняет combo, СОХРАНЯЯ текущий выбор (GetComboPupilId возвращает выбранный id, передаётся в PopulateCombo). Зачем: после добавления/удаления ученика список в combo мог устареть. Грид обновляется сам через DataSource, а combo — вручную.'
    },
    {
      startLine: 102, endLine: 122,
      title: 'AddPaymentClick — добавление платежа',
      explanation: 'ParseIntSum (uUiHelpers) проверяет сумму: Trim + TryStrToInt + > 0. Платежи хранятся в целых рублях, поэтому дробные значения и нечисловой ввод отклоняются. Если невалидна — ShowMessage и Exit (раньше сервиса, чтобы не бросать исключение). FPaymentSvc.Add(id ученика из combo, имя из SelectedPupilName, сумма). После успеха — очистить поле суммы и FOnRefresh. try/except ловит EValidationException (например, ученик не выбран → id=0 → «Выберите ученика»).'
    },
    {
      startLine: 124, endLine: 135,
      title: 'DeletePaymentClick',
      explanation: 'ConfirmDelete (диалог) → если Да, FPaymentSvc.Delete(CurrentPaymentId) и FOnRefresh. ВАЖНО: CurrentPaymentId здесь = id ученика (особенность схемы money_from_parents). try/except ловит EValidationException (например, платёж не выбран → id=0 → сервис бросит «Выберите платёж») и показывает через ShowException.'
    },
    {
      startLine: 137, endLine: 169,
      title: 'PaymentGridDbClick — редактирование',
      explanation: 'Двойной клик → форма TuEditPaymentForm. Передаёт: имя ученика (в Edit1, но он «Не используется»), пустую строку (назначение, не используется), сумму (Edit3), список учеников для combo, id текущего ученика (для выбора). ShowModal = mrOk → Sum := Trunc(EditForm.GetSum), затем FPaymentSvc.Update(PaymentId, имя нового ученика через PupilNameById(GetPupilId), Sum). Trunc безопасен, потому что форма платежа проверяет, что сумма целая. try/finally освобождает форму, внутренний try/except ловит ошибки.'
    },
    {
      startLine: 171, endLine: 175,
      title: 'RefreshClick',
      explanation: 'Кнопка «Обновить» — вызывает FOnRefresh главной формы. Аналогично другим фреймам.'
    }
  ]
};
