window.LEARN_FILES = window.LEARN_FILES || {};
window.LEARN_FILES['uBaseEditForm'] = {
  code: `﻿unit uBaseEditForm;

interface

uses
  Winapi.Windows, Winapi.Messages, System.SysUtils, System.Variants, System.Classes, Vcl.Graphics,
  Vcl.Controls, Vcl.Forms, Vcl.Dialogs, Vcl.StdCtrls;

type
  TBaseEditForm = class(TForm)
    Edit1: TEdit;
    Edit2: TEdit;
    Edit3: TEdit;
    Button1: TButton;
    Button2: TButton;
    Label1: TLabel;
    Label2: TLabel;
    Label3: TLabel;
    procedure Button1Click(Sender: TObject);
  protected
    procedure ApplyCaption; virtual;
    procedure ApplyHints; virtual;
    procedure ApplyLabels; virtual;
    function Validate: Boolean; virtual;
    function ValidateSum: Boolean; virtual;
    function GetOperationType: string; virtual;
    // Возвращает id выбранного в PupilCombo ученика или 0.
    // Базовый класс не имеет комбобокса — наследники с PupilCombo
    // переопределяют этот метод.
    function GetPupilId: Integer; virtual;
  public
    constructor Create(AOwner: TComponent; const Adate, Apurpose, ASum: string); reintroduce;
    function GetDate: string;
    function GetPurpose: string;
    function GetSum: Currency;
  end;

implementation

uses
  uUiHelpers;

{$R *.dfm}

constructor TBaseEditForm.Create(AOwner: TComponent;
  const ADate, APurpose, ASum: string);
begin
  inherited Create(AOwner);
  Edit1.Text := ADate;
  Edit2.Text := APurpose;
  Edit3.Text := ASum;
  ApplyCaption;
  ApplyHints;
  ApplyLabels;
end;

procedure TBaseEditForm.ApplyCaption;
begin
  Caption := 'Редактирование';
end;

procedure TBaseEditForm.ApplyHints;
begin
  Edit1.TextHint := 'Дата (ГГГГ-ММ-ДД)';
  Edit2.TextHint := 'Назначение';
  Edit3.TextHint := 'Сумма';
end;

procedure TBaseEditForm.ApplyLabels;
begin
  Label1.Caption := 'Дата';
  Label2.Caption := 'Назначение';
  Label3.Caption := 'Сумма';
end;

function TBaseEditForm.GetOperationType: string;
begin
  Result := 'операция';
end;

function TBaseEditForm.GetPupilId: Integer;
begin
  Result := 0;
end;

function TBaseEditForm.Validate: Boolean;
begin
  Result := False;

  if Trim(Edit1.Text) = '' then
  begin
    ShowMessage('Дата обязательна для заполнения');
    Exit;
  end;

  if Trim(Edit2.Text) = '' then
  begin
    ShowMessage('Назначение обязательно для заполнения');
    Exit;
  end;

  if not ValidateSum then
    Exit;

  Result := True;
end;

function TBaseEditForm.ValidateSum: Boolean;
var
  SumValue: Currency;
begin
  Result := False;

  if Trim(Edit3.Text) = '' then
  begin
    ShowMessage('Сумма обязательна для заполнения');
    Exit;
  end;

  if not TryStrToCurr(Trim(Edit3.Text), SumValue) or (SumValue <= 0) then
  begin
    ShowMessage(Format('Сумма для операции "%s" должна быть положительным числом',
      [GetOperationType]));
    Exit;
  end;

  Result := True;
end;

procedure TBaseEditForm.Button1Click(Sender: TObject);
begin
  if Validate then
    ModalResult := mrOk;
end;

function TBaseEditForm.GetDate: string;
begin
  Result := Edit1.Text;
end;

function TBaseEditForm.GetPurpose: string;
begin
  Result := Edit2.Text;
end;

function TBaseEditForm.GetSum: Currency;
begin
  if not TryStrToCurr(Trim(Edit3.Text), Result) then
    Result := 0;
end;

end.
`,
  annotations: [
    {
      startLine: 1, endLine: 8,
      title: 'Заголовок модуля uBaseEditForm',
      explanation: 'БАЗОВАЯ форма редактирования — родитель для форм платежа и расхода. Это визуальное наследование форм (form inheritance): компоненты и布局 объявляются в .dfm базовой формы, наследники переопределяют виртуальные методы. Шаблонный метод (template method pattern): базовый класс задаёт скелет (3 Edit + 2 Button + валидация), наследники настраивают детали. uUpdatePupilForm НЕ наследник этой формы — у него своя структура.'
    },
    {
      startLine: 5, endLine: 7,
      title: 'uses — стандартные VCL-модули',
      explanation: 'Winapi.Windows/Messages (API Windows), System.* (базовые типы), Vcl.* (визуальные компоненты: Graphics, Controls, Forms, Dialogs, StdCtrls). Это типичный набор для любой VCL-формы — генерируется IDE автоматически при создании формы.'
    },
    {
      startLine: 9, endLine: 36,
      title: 'Класс TBaseEditForm — декларация',
      explanation: 'class(TForm) — наследник стандартной формы. Поля Edit1-3, Button1-2, Label1-3 объявлены прямо в классе (как поля) — это компоненты, размещённые в .dfm. IDE автоматически генерирует такие поля при визуальном редактировании. Button1Click — обработчик нажатия. protected-секция содержит ВИРТУАЛЬНЫЕ методы (virtual) — наследники их переопределяют (override). public: конструктор и геттеры.'
    },
    {
      startLine: 32, endLine: 32,
      title: 'constructor ... reintroduce',
      explanation: 'reintroduce — ключевое слово Delphi: «скрыть унаследованный конструктор с другой сигнатурой». У TForm.Create есть конструктор CreateNew(AOwner) и Create(AOwner). Здесь объявлен свой Create с параметрами (Adate, Apurpose, ASum) — другая сигнатура. Без reintroduce компилятор предупредил бы о сокрытии. reintroduce говорит «я намеренно прячуть старый конструктор».'
    },
    {
      startLine: 40, endLine: 42,
      title: 'implementation uses + {$R *.dfm}',
      explanation: 'uUiHelpers нужен для Trim/ShowMessage (на самом деле ShowMessage в Vcl.Dialogs, который уже в interface uses). {$R *.dfm} — директива компоновки ресурсов: связывает .pas с одноимённым .dfm (описание формы: позиция, размеры, свойства компонентов). Без неё форма не получит визуальное описание. Звёздочка = «имя модуля» (uBaseEditForm.dfm).'
    },
    {
      startLine: 45, endLine: 55,
      title: 'Конструктор Create',
      explanation: 'inherited Create(AOwner) — вызывает конструктор предка (TForm), который инициализирует форму и загружает .dfm (создаёт компоненты). ПОСЛЕ этого можно обращаться к Edit1/Label1 — они уже существуют. Заполняет поля ввода переданными значениями, затем вызывает три виртуальных Apply-метода. Это и есть template method: базовый конструктор вызывает виртуальные, а наследники их переопределяют.'
    },
    {
      startLine: 57, endLine: 74,
      title: 'Apply-методы (виртуальные хуки)',
      explanation: 'ApplyCaption — заголовок окна. ApplyHints — подсказки в пустых полях (TextHint показывается серым, когда Edit пуст). ApplyLabels — подписи Label над полями. База задаёт значения по умолчанию, наследники override’ят под свою операцию (платёж/расход). Это настройка ВИЗУАЛЬНОГО оформления, не логики.'
    },
    {
      startLine: 76, endLine: 84,
      title: 'GetOperationType и GetPupilId — заглушки',
      explanation: 'GetOperationType возвращает «операция» — слово для сообщения об ошибке валидации суммы. Наследники возвращают «платёж»/«расход» для точности. GetPupilId возвращает 0 — у базы нет combo учеников. Наследники с PupilCombo переопределяют, возвращая реальный id. Это «null object» по умолчанию.'
    },
    {
      startLine: 86, endLine: 106,
      title: 'Validate — валидация формы',
      explanation: 'Проверяет поля: дата не пуста, назначение не пуста, сумма валидна (ValidateSum). Если что-то не так — ShowMessage и Exit, Result остаётся False. Если всё ок — Result := True. ВАЖНО: это ВИРТУАЛЬНЫЙ метод — наследники могут переопределить (TuEditPaymentForm.Validate пропускает дату/назначение, TuEditExpenseForm.Validate добавляет проверку ученика и вызывает inherited).'
    },
    {
      startLine: 108, endLine: 128,
      title: 'ValidateSum — валидация суммы',
      explanation: 'Отдельный метод для суммы, т.к. её логика сложнее (парсинг в число). Trim(Edit3.Text) = \'\' — пусто. TryStrToCurr — попытка разбора строки в Currency; если не число или <= 0 — ошибка с форматной строкой (GetOperationType подставляет «платёж»/«расход»). Вынесен отдельно, чтобы наследник TuEditPaymentForm мог вызвать только ValidateSum, пропуская дату/назначение.'
    },
    {
      startLine: 130, endLine: 134,
      title: 'Button1Click — кнопка ОК',
      explanation: 'Вызывает Validate. Если True — ModalResult := mrOk. ModalResult = mrOk закрывает модальную форму с результатом «ОК». Вызывающий код (ShowModal = mrOk) проверяет это и сохраняет изменения. Если Validate = False — форма остаётся открытой (ModalResult не установлен), пользователь исправляет ошибки.'
    },
    {
      startLine: 136, endLine: 150,
      title: 'Геттеры GetDate/GetPurpose/GetSum',
      explanation: 'Возвращает значения полей ввода. GetSum парсит строку в Currency, при ошибке возвращает 0 (мягкая обработка — но Validate уже гарантировал корректность). Вызывающий код (фреймы) вызывает эти геттеры после ShowModal = mrOk, чтобы получить введённые значения и передать в сервис.'
    }
  ]
};
