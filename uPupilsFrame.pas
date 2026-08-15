unit uPupilsFrame;

{
  Вкладка «Ученики».
  Содержит панель ввода (ФИО, родитель, телефон, после уроков) и грид.
  Мутации выполняются через TPupilService, данные грида — через TMainData.
  После мутаций вызывается колбэк обновления главной формы (FOnRefresh).
}

interface

uses
  System.SysUtils,
  System.Classes,
  Vcl.Controls,
  Vcl.StdCtrls,
  Vcl.ExtCtrls,
  Vcl.DBGrids,
  Vcl.Forms,
  uMainData,
  uServices;

type
  TPupilsFrame = class(TFrame)
    PupilsPanel: TPanel;
    Label5: TLabel;
    Label6: TLabel;
    Label7: TLabel;
    Label8: TLabel;
    PupilFullNameEdit: TEdit;
    AfterLessonEdit: TEdit;
    ParentNameEdit: TEdit;
    ParentPhoneEdit: TEdit;
    AddPupilButton: TButton;
    RefreshButton: TButton;
    DeletePupilButton: TButton;
    PupilsGrid: TDBGrid;
    procedure AddPupilClick(Sender: TObject);
    procedure DeletePupilClick(Sender: TObject);
    procedure PupilsGridDbClick(Sender: TObject);
    procedure RefreshClick(Sender: TObject);
  private
    FPupilSvc: TPupilService;
    FMainData: TMainData;
    FOnRefresh: TNotifyEvent;
  public
    procedure Init(APupilSvc: TPupilService; AMainData: TMainData;
      AOnRefresh: TNotifyEvent);
    procedure RefreshView;
  end;

implementation

uses
  uUiHelpers,
  uUpdatePupilForm;

{$R *.dfm}

procedure TPupilsFrame.Init(APupilSvc: TPupilService; AMainData: TMainData;
  AOnRefresh: TNotifyEvent);
begin
  FPupilSvc := APupilSvc;
  FMainData := AMainData;
  FOnRefresh := AOnRefresh;

  PupilsGrid.DataSource := FMainData.PupilsSource;
end;

procedure TPupilsFrame.RefreshView;
begin
  // Грид привязан к TDataSource и обновляется автоматически.
end;

procedure TPupilsFrame.AddPupilClick(Sender: TObject);
begin
  try
    FPupilSvc.Add(
      PupilFullNameEdit.Text,
      ParentNameEdit.Text,
      ParentPhoneEdit.Text,
      AfterLessonEdit.Text);

    PupilFullNameEdit.Clear;
    AfterLessonEdit.Clear;
    ParentNameEdit.Clear;
    ParentPhoneEdit.Clear;
    if Assigned(FOnRefresh) then
      FOnRefresh(Self);
  except
    on E: Exception do ShowException(E);
  end;
end;

procedure TPupilsFrame.DeletePupilClick(Sender: TObject);
begin
  if not ConfirmDelete('Удалить ученика?') then
    Exit;
  try
    FPupilSvc.Delete(FMainData.CurrentPupilId);
    if Assigned(FOnRefresh) then
      FOnRefresh(Self);
  except
    on E: Exception do ShowException(E);
  end;
end;

procedure TPupilsFrame.PupilsGridDbClick(Sender: TObject);
var
  PupilId: Integer;
  EditForm: TuEditPupilForm;
begin
  if FMainData.PupilsEmpty then
    Exit;

  PupilId := FMainData.CurrentPupilId;
  if PupilId <= 0 then
    Exit;

  EditForm := TuEditPupilForm.Create(Self,
    FMainData.CurrentPupilName,
    FMainData.CurrentPupilParentName,
    FMainData.CurrentPupilPhone,
    FMainData.CurrentPupilAfterLesson);
  try
    if EditForm.ShowModal = mrOk then
    try
      FPupilSvc.Update(PupilId,
        EditForm.GetFullName,
        EditForm.GetParentName,
        EditForm.GetPhone,
        EditForm.GetAfterLesson);
      if Assigned(FOnRefresh) then
        FOnRefresh(Self);
    except
      on E: Exception do ShowException(E);
    end;
  finally
    EditForm.Free;
  end;
end;

procedure TPupilsFrame.RefreshClick(Sender: TObject);
begin
  if Assigned(FOnRefresh) then
    FOnRefresh(Self);
end;

end.
