window.LEARN_FILES = window.LEARN_FILES || {};
window.LEARN_FILES['uArchiveFrame'] = {
  code: `﻿unit uArchiveFrame;

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
`,
  annotations: [
    {
      startLine: 1, endLine: 6,
      title: 'Заголовок модуля uArchiveFrame',
      explanation: 'Вкладка «Архив» — самый простой фрейм. Два readonly-грида: архив платежей и архив расходов. Никаких мутаций, никаких кнопок, никаких сервисов — только отображение архивных таблиц (заполняются триггерами БД при удалении/изменении). Чистая презентация через data binding.'
    },
    {
      startLine: 8, endLine: 14,
      title: 'interface uses',
      explanation: 'Минимальный набор: System.Classes (TNotifyEvent, базовые типы), Vcl.* (Controls, ExtCtrls — TSplitter, DBGrids — TDBGrid, Forms — TFrame), uMainData (источники данных). НЕТ uServices, uRepositories — архив только читает, никаких сервисов не нужно. Это показывает: архив — пассивный просмотрщик.'
    },
    {
      startLine: 16, endLine: 27,
      title: 'Класс TArchiveFrame',
      explanation: 'class(TFrame). Три компонента: PaymentsArcGrid (TDBGrid — архив платежей), ArcSplitter (TSplitter — разделитель, пользователь может менять размер), ExpensesArcGrid (TDBGrid — архив расходов). Только два публичных метода: Init (привязка источников) и RefreshView (пустой). Никаких private-полей — фрейму не нужно ничего хранить.'
    },
    {
      startLine: 31, endLine: 31,
      title: '{$R *.dfm}',
      explanation: 'Связывает с uArchiveFrame.dfm — визуальное описание фрейма (два грида + splitter, их расположение).'
    },
    {
      startLine: 33, endLine: 37,
      title: 'Init — привязка двух источников',
      explanation: 'PaymentsArcGrid.DataSource := PaymentsArcSource — привязка грида архивных платежей. ExpensesArcGrid.DataSource := ExpensesArcSource — грид архивных расходов. После этого гриды автоматически отображают данные и обновляются при RefreshData. AMainData передаётся как параметр (не хранится) — достаточно один раз привязать.'
    },
    {
      startLine: 39, endLine: 43,
      title: 'RefreshView — пустой',
      explanation: 'Пустой метод. Гриды обновляются автоматически через TDataSource при RefreshData. RefreshView существует только для единообразия с другими фреймами — главная форма вызывает RefreshView у всех четырёх одинаково. «Null object» паттерн: согласованность интерфейса важнее экономии одной строки.'
    }
  ]
};
