unit uArchiveFrame;

{
  Вкладка «Архив».
  Два readonly-грида архивных таблиц и кнопка закрытия периода:
  расходы переносятся в архив, платежи обнуляются (через TArchiveService),
  в расходах остаётся итоговое сальдо. После мутации вызывается FOnRefresh.
}

interface

uses
  System.SysUtils,
  System.Classes,
  Vcl.Controls,
  Vcl.ExtCtrls,
  Vcl.StdCtrls,
  Vcl.DBGrids,
  Vcl.Forms,
  uMainData,
  uServices,
  uRepositories;

type
  TArchiveFrame = class(TFrame)
    ArcPanel: TPanel;
    ClosePeriodButton: TButton;
    PaymentsArcGrid: TDBGrid;
    ArcSplitter: TSplitter;
    ExpensesArcGrid: TDBGrid;
    procedure ClosePeriodButtonClick(Sender: TObject);
  private
    FArchiveSvc: TArchiveService;
    FMainData: TMainData;
    FOnRefresh: TNotifyEvent;
  public
    procedure Init(AArchiveSvc: TArchiveService; AMainData: TMainData;
      AOnRefresh: TNotifyEvent);
    procedure RefreshView;
  end;

implementation

{$R *.dfm}

uses
  Vcl.Dialogs,
  uUiHelpers;

procedure TArchiveFrame.Init(AArchiveSvc: TArchiveService; AMainData: TMainData;
  AOnRefresh: TNotifyEvent);
begin
  FArchiveSvc := AArchiveSvc;
  FMainData := AMainData;
  FOnRefresh := AOnRefresh;

  PaymentsArcGrid.DataSource := AMainData.PaymentsArcSource;
  ExpensesArcGrid.DataSource := AMainData.ExpensesArcSource;
end;

procedure TArchiveFrame.RefreshView;
begin
  // Гриды привязаны к TDataSource и обновляются автоматически.
end;

procedure TArchiveFrame.ClosePeriodButtonClick(Sender: TObject);
var
  Res: TClosePeriodResult;
begin
  // Снимок данных до операции: показываем точные цифры в подтверждении.
  Res := FArchiveSvc.Preview;
  if (Res.ResetPayments = 0) and (Res.ArchivedExpenses = 0) then
  begin
    ShowMessage('Нет данных для архивации');
    Exit;
  end;

  if not ConfirmDelete(Format(
      'Заархивировать период? Расходов в архив — %d, платежей будет обнулено — %d. ' +
      'В расходах останется сальдо периода: %m',
      [Res.ArchivedExpenses, Res.ResetPayments, Res.CarryOverSum])) then
    Exit;

  try
    Res := FArchiveSvc.ClosePeriod;
    ShowMessage(Format(
      'Период закрыт: расходов заархивировано — %d, платежей обнулено — %d. Сальдо периода: %m.',
      [Res.ArchivedExpenses, Res.ResetPayments, Res.CarryOverSum]));
    if Assigned(FOnRefresh) then
      FOnRefresh(Self);
  except
    on E: Exception do ShowException(E);
  end;
end;

end.
