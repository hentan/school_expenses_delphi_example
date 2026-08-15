unit uUiHelpers;

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
