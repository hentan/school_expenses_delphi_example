window.LEARN_FILES = window.LEARN_FILES || {};
window.LEARN_FILES['uUiHelpers'] = {
  code: `﻿unit uUiHelpers;

{
  Small UI helpers that are not tied to the main form class.
}

interface

uses
  System.SysUtils,
  Data.DB,
  Vcl.StdCtrls,
  FireDAC.Comp.Client;

function TodayIso: string;
procedure AddPupilComboItem(ACombo: TComboBox; const ADisplayName: string;
  APupilId: Integer);
procedure ClearComboObjects(ACombo: TComboBox);
procedure DisconnectQuery(AQuery: TFDQuery);
function GetComboPupilId(ACombo: TComboBox): Integer;
procedure SelectComboPupilId(ACombo: TComboBox; APupilId: Integer);
procedure SetFieldLayout(ADataSet: TDataSet; const AFieldName: string;
  const ADisplayLabel: string; ADisplayWidth: Integer);

// Показать исключение сервисного слоя пользователю.
// EValidationException — сообщение как есть (текст для пользователя),
// прочие исключения — с префиксом "Ошибка: ".
procedure ShowException(E: Exception);

// Диалог подтверждения удаления. True, если пользователь выбрал "Да".
function ConfirmDelete(const APrompt: string): Boolean;

// Разобрать строку суммы: Trim + TryStrToCurr + значение > 0.
function ParseSum(const AText: string; out AValue: Currency): Boolean;

implementation

uses
  System.UITypes,
  Vcl.Dialogs,
  uServices;

type
  TPupilComboItem = class
  public
    Id: Integer;
    constructor Create(AId: Integer);
  end;

constructor TPupilComboItem.Create(AId: Integer);
begin
  inherited Create;
  Id := AId;
end;

function TodayIso: string;
begin
  Result := FormatDateTime('yyyy-mm-dd', Date);
end;

procedure AddPupilComboItem(ACombo: TComboBox; const ADisplayName: string;
  APupilId: Integer);
begin
  ACombo.Items.AddObject(ADisplayName, TPupilComboItem.Create(APupilId));
end;

procedure ClearComboObjects(ACombo: TComboBox);
var
  I: Integer;
begin
  if ACombo = nil then
    Exit;

  for I := 0 to ACombo.Items.Count - 1 do
    ACombo.Items.Objects[I].Free;

  ACombo.Items.Clear;
end;

procedure DisconnectQuery(AQuery: TFDQuery);
begin
  if AQuery = nil then
    Exit;

  AQuery.Close;
  AQuery.Connection := nil;
end;

function GetComboPupilId(ACombo: TComboBox): Integer;
var
  Item: TPupilComboItem;
begin
  Result := 0;
  if (ACombo = nil) or (ACombo.ItemIndex < 0) then
    Exit;

  Item := ACombo.Items.Objects[ACombo.ItemIndex] as TPupilComboItem;
  Result := Item.Id;
end;

procedure SelectComboPupilId(ACombo: TComboBox; APupilId: Integer);
var
  I: Integer;
  Item: TPupilComboItem;
begin
  if ACombo = nil then
    Exit;

  ACombo.ItemIndex := -1;
  for I := 0 to ACombo.Items.Count - 1 do
  begin
    Item := ACombo.Items.Objects[I] as TPupilComboItem;
    if Item.Id = APupilId then
    begin
      ACombo.ItemIndex := I;
      Exit;
    end;
  end;

  if (ACombo.ItemIndex < 0) and (ACombo.Items.Count > 0) then
    ACombo.ItemIndex := 0;
end;

procedure SetFieldLayout(ADataSet: TDataSet; const AFieldName: string;
  const ADisplayLabel: string; ADisplayWidth: Integer);
var
  Field: TField;
begin
  Field := ADataSet.FindField(AFieldName);
  if Field = nil then
    Exit;

  Field.DisplayLabel := ADisplayLabel;
  Field.DisplayWidth := ADisplayWidth;
end;

procedure ShowException(E: Exception);
begin
  if E is EValidationException then
    ShowMessage(E.Message)
  else
    ShowMessage('Ошибка: ' + E.Message);
end;

function ConfirmDelete(const APrompt: string): Boolean;
begin
  Result := MessageDlg(APrompt, mtConfirmation, [mbYes, mbNo], 0) = mrYes;
end;

function ParseSum(const AText: string; out AValue: Currency): Boolean;
begin
  Result := TryStrToCurr(Trim(AText), AValue) and (AValue > 0);
end;

end.
`,
  annotations: [
    {
      startLine: 1, endLine: 5,
      title: 'Заголовок модуля uUiHelpers',
      explanation: 'Набор свободных процедур и функций для UI, не привязанных к конкретной форме. В Delphi можно объявлять функции на уровне модуля (без класса) — это аналог статических хелперов. Используется из фреймов и форм редактирования. Назначение: убрать рутину (формат дат, парсинг сумм, диалоги) из кода форм.'
    },
    {
      startLine: 7, endLine: 13,
      title: 'interface + uses',
      explanation: 'System.SysUtils (Trim, TryStrToCurr, FormatDateTime), Data.DB (TDataSet, TField), Vcl.StdCtrls (TComboBox), FireDAC.Comp.Client (TFDQuery).'
    },
    {
      startLine: 15, endLine: 34,
      title: 'Объявления публичных функций',
      explanation: 'TodayIso — дата в формате ISO (для поля даты расхода). AddPupilComboItem/ClearComboObjects/GetComboPupilId/SelectComboPupilId — работа с выпадающим списком учеников (combo). DisconnectQuery — безопасное закрытие запроса. SetFieldLayout — настройка колонок грида. ShowException/ConfirmDelete/ParseSum — UI-утилиты для форм.'
    },
    {
      startLine: 36, endLine: 41,
      title: 'implementation uses',
      explanation: 'System.UITypes (коды кнопок MessageDlg: mbYes, mrYes), Vcl.Dialogs (ShowMessage, MessageDlg), uServices (EValidationException — для ShowException). implementation-секция, потому что это детали реализации, не нужные внешним вызывающим.'
    },
    {
      startLine: 43, endLine: 54,
      title: 'TPupilComboItem — хранитель id',
      explanation: 'Вспомогательный класс. TComboBox.Items может хранить ОБЪЕКТ для каждого пункта (свойство Objects[I]: TObject). Чтобы при выборе ученика получить его id, в Objects кладётся TPupilComboItem с этим id. Так комбобокс показывает имя (текст пункта), а код читает id через Objects. Это классический приём VCL. constructor Create просто сохраняет AId.'
    },
    {
      startLine: 56, endLine: 59,
      title: 'TodayIso',
      explanation: 'Возвращает текущую дату в формате yyyy-mm-dd (ISO 8601). FormatDateTime — стандартная функция Delphi. Date — текущая дата без времени. Используется для предзаполнения поля даты при добавлении расхода (ExpenseDateEdit.Text := TodayIso).'
    },
    {
      startLine: 61, endLine: 65,
      title: 'AddPupilComboItem',
      explanation: 'Добавляет пункт в комбобокс: текст = ADisplayName (имя ученика), объект = новый TPupilComboItem(APupilId). AddObject — метод TStrings, к которому относится Items. Объект создается здесь и должен быть освобождён позже (ClearComboObjects).'
    },
    {
      startLine: 67, endLine: 78,
      title: 'ClearComboObjects',
      explanation: 'Освобождает все TPupilComboItem перед очисткой комбобокса. Если просто вызвать Items.Clear без Free — объекты утекут (VCL не освобождает Objects автоматически). for по всем пунктам, Free каждого Objects[I], потом Clear. nil-проверка в начале — защита. Вызывается в Destroy фреймов и перед повторным заполнением.'
    },
    {
      startLine: 80, endLine: 87,
      title: 'DisconnectQuery',
      explanation: 'Безопасное отключение TFDQuery: Close (закрыть набор данных) и Connection := nil (отвязать от соединения). Используется в TMainData.Destroy перед Free — чтобы запрос не пытался обратиться к освобождённому соединению. nil-проверка — защита от двойного освобождения.'
    },
    {
      startLine: 89, endLine: 99,
      title: 'GetComboPupilId',
      explanation: 'Возвращает id выбранного в комбобоксе ученика. Если ничего не выбрано (ItemIndex < 0) — возвращает 0 (признак «не выбран»). as TPupilComboItem — приведение типа: Objects хранит TObject, а нам нужен TPupilComboItem. Если там не он — будет Access Violation, но по контракту туда кладём только TPupilComboItem.'
    },
    {
      startLine: 101, endLine: 122,
      title: 'SelectComboPupilId',
      explanation: 'Программно выбирает в комбобоксе пункт с нужным id. Линейный поиск по пунктам, сравнение Item.Id = APupilId. Если нашли — ItemIndex = I и выход. Если не нашли И есть пункты — выбираем первый (fallback, чтобы форма не была с пустым выбором). Используется при открытии формы редактирования: заранее выбрать текущего ученика.'
    },
    {
      startLine: 124, endLine: 135,
      title: 'SetFieldLayout',
      explanation: 'Находит поле по имени (FindField), если есть — задаёт DisplayLabel (заголовок колонки в гриде) и DisplayWidth (ширина в символах). FindField возвращает nil если поля нет — тогда просто выходим (мягкая обработка, не падать). Используется в TMainData.ConfigureFields для настройки всех 5 гридов.'
    },
    {
      startLine: 137, endLine: 143,
      title: 'ShowException',
      explanation: 'Централизованный показ ошибок. `E is EValidationException` — проверка типа: если это ошибка валидации (бросил сервис), показываем Message как есть (это человекочитаемое сообщение типа «ФИО обязательно»). Иначе добавляем префикс «Ошибка: » — чтобы пользователь понял, что это системный сбой, а не его опечатка. Все формы ловят исключения и вызывают эту функцию.'
    },
    {
      startLine: 145, endLine: 148,
      title: 'ConfirmDelete',
      explanation: 'Стандартный диалог «Да/Нет». MessageDlg — модальное окно с вопросом. mtConfirmation — иконка вопроса. [mbYes, mbNo] — кнопки. Возвращает True если mrYes. Используется во всех Delete-обработчиках перед удалением, чтобы защитить от случайного нажатия.'
    },
    {
      startLine: 150, endLine: 153,
      title: 'ParseSum',
      explanation: 'Разбор строки в Currency. TryStrToCurr пытается преобразовать (учитывая локаль — разделитель дроби), возвращает True при успехе. Дополнительная проверка AValue > 0 — сумма должна быть положительной. out-параметр AValue — результат. Используется в AddPaymentClick/AddExpenseClick перед вызовом сервиса.'
    }
  ]
};
