unit uBaseEditForm;

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
