window.LEARN_FILES = window.LEARN_FILES || {};
window.LEARN_FILES['uUpdatePaymentForm'] = {
  code: `﻿unit uUpdatePaymentForm;

interface

uses
  System.SysUtils,
  Vcl.Dialogs,
  uBaseEditForm, Vcl.StdCtrls, System.Classes, Vcl.Controls,
  uRepositories;

type
  TuEditPaymentForm = class(TBaseEditForm)
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

constructor TuEditPaymentForm.Create(AOwner: TComponent;
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

destructor TuEditPaymentForm.Destroy;
begin
  ClearComboObjects(PupilCombo);
  inherited Destroy;
end;

procedure TuEditPaymentForm.ApplyCaption;
begin
  Caption := 'Редактирование платежа';
end;

procedure TuEditPaymentForm.ApplyHints;
begin
  Edit1.TextHint := 'Не используется';
  Edit2.TextHint := 'Не используется';
  Edit3.TextHint := 'Сданная сумма';
end;

procedure TuEditPaymentForm.ApplyLabels;
begin
  Label1.Caption := 'Не используется';
  Label2.Caption := 'Не используется';
  Label3.Caption := 'Сданная сумма';
end;

function TuEditPaymentForm.GetOperationType: string;
begin
  Result := 'платёж';
end;

function TuEditPaymentForm.Validate: Boolean;
var
  SumValue: Currency;
begin
  // Платёж в схеме дампа: ученик выбирается из списка + целая сумма в рублях.
  Result := False;

  if GetPupilId <= 0 then
  begin
    ShowMessage('Выберите ученика');
    Exit;
  end;

  if not ValidateSum then
    Exit;

  SumValue := GetSum;
  if SumValue <> Trunc(SumValue) then
  begin
    ShowMessage('Сумма платежа должна быть целым числом рублей');
    Exit;
  end;

  Result := True;
end;

function TuEditPaymentForm.GetPupilId: Integer;
begin
  Result := GetComboPupilId(PupilCombo);
end;

end.
`,
  annotations: [
    {
      startLine: 1, endLine: 10,
      title: 'Заголовок модуля uUpdatePaymentForm',
      explanation: 'Форма редактирования платежа. НАСЛЕДНИК TBaseEditForm (visual form inheritance). Назначение: добавить поле PupilCombo (выпадающий список учеников), которого нет в базе. Переопределяет виртуальные методы под специфику платежа: у платежа НЕТ даты и назначения (в схеме money_from_parents только имя + сумма), поэтому эти поля помечены «Не используется».'
    },
    {
      startLine: 5, endLine: 9,
      title: 'uses — зависимости формы',
      explanation: 'System.SysUtils, Vcl.Dialogs (ShowMessage), uBaseEditForm (родительская форма), Vcl.StdCtrls (TComboBox, TLabel), uRepositories (TPupilComboArray — тип параметра конструктора). System.Classes/Vcl.Controls — базовые типы VCL.'
    },
    {
      startLine: 11, endLine: 26,
      title: 'Класс TuEditPaymentForm',
      explanation: 'class(TBaseEditForm) — наследник базовой формы. Поля Edit1-3, Button1-2, Label1-3 УНАСЛЕДОВАНЫ (не объявлены здесь, берутся из .dfm базы). Добавлены свои: PupilCombo (TComboBox) и PupilLabel. override на 5 методах — переопределение виртуальных хуков. constructor reintroduce — расширенная сигнатура (добавлен список учеников).'
    },
    {
      startLine: 35, endLine: 45,
      title: 'Конструктор Create',
      explanation: 'inherited Create(AOwner, ADate, APurpose, ASum) — сначала вызывает конструктор предка, тот загружает .dfm и заполняет Edit’ы. ЗАТЕМ заполняет PupilCombo: цикл по AEntries, AddPupilComboItem добавляет пункт в combo. SelectComboPupilId выбирает текущего ученика (ASelectedPupilId). Порядок важен: combo должно существовать (через inherited) перед заполнением.'
    },
    {
      startLine: 47, endLine: 51,
      title: 'Деструктор Destroy',
      explanation: 'ClearComboObjects(PupilCombo) — освобождает TPupilComboItem из combo (иначе утечка памяти). inherited Destroy — стандартный вызов. override нужен, т.к. Destroy виртуальный. Порядок: сначала свои объекты, потом inherited.'
    },
    {
      startLine: 53, endLine: 70,
      title: 'Apply-переопределения: «Не используется»',
      explanation: 'ApplyCaption — «Редактирование платежа». ApplyHints/ApplyLabels — Edit1 и Edit2 (дата, назначение) помечаются «Не используется», т.к. в схеме money_from_parents этих полей нет. Edit3 — «Сданная сумма». Это пример переопределения хуков: базовая форма задаёт общий скелет, наследник адаптирует под свою операцию. Поля не удаляются (они объявлены в базе), только скрываются визуально через подписи.'
    },
    {
      startLine: 72, endLine: 75,
      title: 'GetOperationType → «платёж»',
      explanation: 'Переопределение для сообщения об ошибке валидации суммы: «Сумма для операции "платёж" должна быть положительным числом». База вернула бы «операция», наследник уточняет. Маленькая деталь UX — точное слово в ошибке.'
    },
    {
      startLine: 77, endLine: 92,
      title: 'Validate — переопределение для платежа',
      explanation: 'ПЛАТЁЖ отличается от базы: нужна только сумма и ученик, без даты/назначения. Поэтому Validate полностью переопределён (не вызывает inherited). Проверяет: GetPupilId > 0 (ученик выбран), ValidateSum (сумма валидна) и дополнительно — что сумма целая (SumValue <> Trunc(SumValue)), потому что в схеме money_from_parents платежи хранятся в рублях без копеек. ValidateSum — унаследован без изменений, вызывается прямо. Это переиспользование части базовой логики.'
    },
    {
      startLine: 94, endLine: 97,
      title: 'GetPupilId — реализация для combo',
      explanation: 'Переопределение базовой заглушки. База возвращала 0, здесь возвращается реальный id из PupilCombo через GetComboPupilId (uUiHelpers). Это полиморфизм: TuEditExpenseForm.GetPupilId и TuEditPaymentForm.GetPupilId работают одинаково снаружи, но читают свой combo. Validate и конструктор базы используют этот метод, не зная, есть combo или нет.'
    }
  ]
};
