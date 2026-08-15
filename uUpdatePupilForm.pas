unit uUpdatePupilForm;

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
