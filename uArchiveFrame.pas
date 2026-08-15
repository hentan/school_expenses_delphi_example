unit uArchiveFrame;

{
  Вкладка «Архив».
  Два readonly-грида архивных таблиц. Логики мутаций нет —
  только привязка источников данных.
}

interface

uses
  System.Classes,
  Vcl.Controls,
  Vcl.ExtCtrls,
  Vcl.DBGrids,
  Vcl.Forms,
  uMainData;

type
  TArchiveFrame = class(TFrame)
    PaymentsArcGrid: TDBGrid;
    ArcSplitter: TSplitter;
    ExpensesArcGrid: TDBGrid;
  public
    procedure Init(AMainData: TMainData);
    procedure RefreshView;
  end;

implementation

{$R *.dfm}

procedure TArchiveFrame.Init(AMainData: TMainData);
begin
  PaymentsArcGrid.DataSource := AMainData.PaymentsArcSource;
  ExpensesArcGrid.DataSource := AMainData.ExpensesArcSource;
end;

procedure TArchiveFrame.RefreshView;
begin
  // Гриды привязаны к TDataSource и обновляются автоматически.
end;

end.
