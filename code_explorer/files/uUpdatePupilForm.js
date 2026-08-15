window.LEARN_FILES = window.LEARN_FILES || {};
window.LEARN_FILES['uUpdatePupilForm'] = {
  code: `﻿unit uUpdatePupilForm;

interface

uses
  Winapi.Windows, Winapi.Messages, System.SysUtils, System.Variants,
  System.Classes, Vcl.Graphics, Vcl.Controls, Vcl.Forms, Vcl.Dialogs,
  Vcl.StdCtrls;

type
  TuEditPupilForm = class(TForm)
    Edit1: TEdit; // ФИО ученика
    Edit2: TEdit; // Родитель
    Edit3: TEdit; // Телефон
    Edit4: TEdit; // После уроков
    Button1: TButton; // ОК
    Button2: TButton; // Отмена
    Label1: TLabel;
    Label2: TLabel;
    Label3: TLabel;
    Label4: TLabel;
    procedure Button1Click(Sender: TObject);
  private
    { Private declarations }
  public
    constructor Create(AOwner: TComponent; const AChildrenName, AParentName,
      APhone, AAfterLesson: string); reintroduce;
    function GetFullName: string;
    function GetParentName: string;
    function GetPhone: string;
    function GetAfterLesson: string;
  end;

implementation

{$R *.dfm}

constructor TuEditPupilForm.Create(AOwner: TComponent;
  const AChildrenName, AParentName, APhone, AAfterLesson: string);
begin
  inherited Create(AOwner);
  Edit1.Text := AChildrenName;
  Edit2.Text := AParentName;
  Edit3.Text := APhone;
  Edit4.Text := AAfterLesson;
end;

procedure TuEditPupilForm.Button1Click(Sender: TObject);
begin
  if Trim(Edit1.Text) = '' then
  begin
    ShowMessage('ФИО ученика обязательно');
    Exit;
  end;
  ModalResult := mrOk;
end;

function TuEditPupilForm.GetFullName: string;
begin
  Result := Edit1.Text;
end;

function TuEditPupilForm.GetParentName: string;
begin
  Result := Edit2.Text;
end;

function TuEditPupilForm.GetPhone: string;
begin
  Result := Edit3.Text;
end;

function TuEditPupilForm.GetAfterLesson: string;
begin
  Result := Edit4.Text;
end;

end.
`,
  annotations: [
    {
      startLine: 1, endLine: 9,
      title: 'Заголовок модуля uUpdatePupilForm',
      explanation: 'Форма редактирования ученика. ВАЖНО: это НЕ наследник TBaseEditForm — самостоятельная TForm. Причина: у ученика 4 поля (ФИО, родитель, телефон, после уроков), а у TBaseEditForm — 3 Edit. Структура не совпадает, поэтому отдельная форма. Используется для добавления И редактирования — конструктор принимает текущие значения, форма их показывает, пользователь правит.'
    },
    {
      startLine: 5, endLine: 8,
      title: 'uses — стандартные VCL-модули',
      explanation: 'Типичный набор для VCL-формы. Никаких собственных модулей проекта — эта форма максимально независима, не знает ни о сервисах, ни о репозиториях. Вся интеграция происходит через конструктор (вход) и геттеры (выход). Это чистая презентация.'
    },
    {
      startLine: 10, endLine: 32,
      title: 'Класс TuEditPupilForm',
      explanation: 'class(TForm) — прямое наследование от стандартной формы, без TBaseEditForm. 4 Edit (по числу полей ученика), 2 Button (ОК/Отмена), 4 Label. Button1Click — обработчик ОК. constructor reintroduce — своя сигнатура с 4 строковыми параметрами (значения для предзаполнения). Геттеры возвращают значения полей после закрытия.'
    },
    {
      startLine: 36, endLine: 46,
      title: 'Конструктор Create',
      explanation: 'inherited Create(AOwner) создаёт форму и загружает .dfm. Затем 4 поля заполняются переданными значениями. Если это добавление — значения пустые (форма пустая). Если редактирование — текущие данные ученика. Этот конструктор вызывает фрейм учеников в PupilsGridDbClick.'
    },
    {
      startLine: 48, endLine: 56,
      title: 'Button1Click — валидация и ОК',
      explanation: 'Минимальная валидация: только ФИО обязательно (проверка на пустую строку через Trim). Остальные поля (родитель, телефон, после уроков) могут быть пустыми — бизнес-правило ученика. Если ФИО пусто — ShowMessage и Exit (форма остаётся). Иначе ModalResult := mrOk — закрывает форму с результатом ОК.'
    },
    {
      startLine: 58, endLine: 77,
      title: 'Геттеры полей',
      explanation: '4 геттера возвращают значения 4 Edit’ов. Фрейм вызывает их после ShowModal = mrOk, чтобы получить отредактированные значения и передать в TPupilService.Update. Простые функции — возвращают Edit.Text как есть.'
    }
  ]
};
