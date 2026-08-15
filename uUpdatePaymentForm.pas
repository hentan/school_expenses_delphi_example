unit uUpdatePaymentForm;

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
begin
  // Платёж в схеме дампа: ученик выбирается из списка + сумма.
  Result := False;

  if GetPupilId <= 0 then
  begin
    ShowMessage('Выберите ученика');
    Exit;
  end;

  if not ValidateSum then
    Exit;

  Result := True;
end;

function TuEditPaymentForm.GetPupilId: Integer;
begin
  Result := GetComboPupilId(PupilCombo);
end;

end.
