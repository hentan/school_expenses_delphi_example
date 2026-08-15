unit uUpdateExenseForm;

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
