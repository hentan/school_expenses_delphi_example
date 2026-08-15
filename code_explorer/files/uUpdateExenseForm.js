window.LEARN_FILES = window.LEARN_FILES || {};
window.LEARN_FILES['uUpdateExenseForm'] = {
  code: `﻿unit uUpdateExenseForm;

interface

uses
  System.SysUtils,
  Vcl.Dialogs,
  uBaseEditForm, Vcl.StdCtrls, System.Classes, Vcl.Controls,
  uRepositories;

type
  TuEditExpenseForm = class(TBaseEditForm)
    PupilCombo: TComboBox;
    PupilLabel: TLabel;
  protected
    procedure ApplyCaption; override;
    procedure ApplyHints; override;
    procedure ApplyLabels; override;
    function GetOperationType: string; override;
    function Validate: Boolean; override;
  public
    constructor Create(AOwner: TComponent; const ADate, APurpose, ASum: string;
      const AEntries: TPupilComboArray; ASelectedPupilId: Integer); reintroduce;
    destructor Destroy; override;
    function GetPupilId: Integer; override;
  end;

implementation

uses
  uUiHelpers;

{$R *.dfm}

constructor TuEditExpenseForm.Create(AOwner: TComponent;
  const ADate, APurpose, ASum: string; const AEntries: TPupilComboArray;
  ASelectedPupilId: Integer);
var
  I: Integer;
begin
  inherited Create(AOwner, ADate, APurpose, ASum);
  for I := 0 to High(AEntries) do
    AddPupilComboItem(PupilCombo, AEntries[I].DisplayName, AEntries[I].Id);
  SelectComboPupilId(PupilCombo, ASelectedPupilId);
end;

destructor TuEditExpenseForm.Destroy;
begin
  ClearComboObjects(PupilCombo);
  inherited Destroy;
end;

procedure TuEditExpenseForm.ApplyCaption;
begin
  Caption := 'Редактирование расхода';
end;

procedure TuEditExpenseForm.ApplyHints;
begin
  Edit1.TextHint := 'Дата расхода';
  Edit2.TextHint := 'На что потрачено';
  Edit3.TextHint := 'Потраченная сумма';
end;

procedure TuEditExpenseForm.ApplyLabels;
begin
  Label1.Caption := 'Дата расхода';
  Label2.Caption := 'На что потрачено';
  Label3.Caption := 'Потраченная сумма';
end;

function TuEditExpenseForm.GetOperationType: string;
begin
  Result := 'расход';
end;

function TuEditExpenseForm.Validate: Boolean;
begin
  // Расход: ученик + дата + назначение + сумма.
  Result := False;

  if GetPupilId <= 0 then
  begin
    ShowMessage('Выберите ученика');
    Exit;
  end;

  if not inherited Validate then
    Exit;

  Result := True;
end;

function TuEditExpenseForm.GetPupilId: Integer;
begin
  Result := GetComboPupilId(PupilCombo);
end;

end.
`,
  annotations: [
    {
      startLine: 1, endLine: 10,
      title: 'Заголовок модуля uUpdateExenseForm',
      explanation: 'Форма редактирования РАСХОДА. НАСЛЕДНИК TBaseEditForm. Обратите внимание на опечатку в имени файла: «Exense» вместо «Expense» — так исторически сложилось, используется везде (в .dpr, в фрейме). Расход, в отличие от платежа, использует ВСЕ три поля базы: дату, назначение и сумму, плюс добавляет PupilCombo. Обратите внимание на логику валидации.'
    },
    {
      startLine: 11, endLine: 26,
      title: 'Класс TuEditExpenseForm',
      explanation: 'Структура идентична TuEditPaymentForm: class(TBaseEditForm), добавлены PupilCombo + PupilLabel, переопределены 5 методов. Разница — в содержании Apply-методов (здесь все 3 поля используются) и в Validate (здесь вызывается inherited, проверяющий дату/назначение/сумму). Это пример того, как одна базовая структура адаптируется под две разные операции.'
    },
    {
      startLine: 35, endLine: 51,
      title: 'Конструктор и деструктор',
      explanation: 'Конструктор: inherited Create загружает .dfm и заполняет Edit’ы (дата, назначение, сумма — все три используются), затем заполняет PupilCombo списком учеников и выбирает текущего. Деструктор: ClearComboObjects освобождает объекты combo. Полная аналогия с формой платежа — отличие только в том, ЧТО попадает в Edit’ы.'
    },
    {
      startLine: 53, endLine: 70,
      title: 'Apply-методы — все поля активны',
      explanation: 'В отличие от формы платежа (где Edit1/Edit2 = «Не используется»), здесь все 3 поля задействованы: «Дата расхода», «На что потрачено», «Потраченная сумма». Это потому, что в таблице outlay есть все эти поля (date_purchaise, item_name, summ). Базовая форма была спроектирована под расход — платеж её «обрезает».'
    },
    {
      startLine: 72, endLine: 75,
      title: 'GetOperationType → «расход»',
      explanation: 'Уточнение для сообщения об ошибке: «Сумма для операции "расход" должна быть положительным числом». База вернула бы «операция», форма платежа — «платёж», здесь — «расход». Полиморфизм в действии.'
    },
    {
      startLine: 77, endLine: 92,
      title: 'Validate — ключевой override',
      explanation: 'РАСХОД требует максимум полей: ученик + дата + назначение + сумма. Логика: (1) проверить GetPupilId > 0 (ученик выбран); (2) вызвать inherited Validate — базовый метод проверит дату, назначение и сумму (ValidateSum). Это ОТЛИЧИЕ от формы платежа, где inherited НЕ вызывался (там дата/назначение не нужны). Здесь inherited переиспользуется — DRY. Если inherited Validate вернёт False — Exit, форма остаётся. Иначе Result := True.'
    },
    {
      startLine: 94, endLine: 97,
      title: 'GetPupilId',
      explanation: 'Та же реализация, что в форме платежа: GetComboPupilId(PupilCombo). Одинаковый код в двух наследниках — можно было бы вынести в базу, но сейчас дублирование минимально и осознанно (каждая форма самостоятельна).'
    }
  ]
};
