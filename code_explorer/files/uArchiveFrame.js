window.LEARN_FILES = window.LEARN_FILES || {};
window.LEARN_FILES['uArchiveFrame'] = {
  code: `﻿unit uArchiveFrame;

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
`,
  annotations: [
    {
      startLine: 3, endLine: 9,
      title: 'Заголовок модуля uArchiveFrame',
      explanation: 'Вкладка «Архив» раньше была только просмотрщиком, теперь у неё есть настоящая операция — кнопка «Закрыть период». Она переносит расходы в архив, обнуляет платежи и оставляет в расходах итоговое сальдо. Обратите внимание на комментарий модуля: он сразу честно говорит, что здесь есть мутация данных, — так проще ориентироваться в проекте.'
    },
    {
      startLine: 12, endLine: 22,
      title: 'interface uses',
      explanation: 'Список «зависимостей» модуля — что нужно подключить, чтобы код скомпилировался. Сюда входят uMainData (источники данных для гридов), uServices (TArchiveService — сервис архивации) и uRepositories (TClosePeriodResult — запись-отчёт о результате операции). Правило проекта: фрейм работает с сервисами, но никогда не пишет SQL сам.'
    },
    {
      startLine: 24, endLine: 40,
      title: 'Класс TArchiveFrame',
      explanation: 'TFrame — «кирпичик» окна, который встраивается в главную форму. Компоненты в первой части объявления (Panel, Button, два TDBGrid, TSplitter) появились визуальным редактором и связаны с .dfm. В private храним то, что фрейм запомнил при Init: сервис архивации, данные и FOnRefresh — «обратный вызов» (ссылку на метод главной формы), который нужно дёрнуть после успешной операции, чтобы обновились все вкладки.'
    },
    {
      startLine: 44, endLine: 44,
      title: '{$R *.dfm}',
      explanation: 'Директива компилятору: «пришей» к модулю его .dfm-файл — чертёж с расположением кнопок и гридов. Без неё компоненты из class(TFrame) останутся пустыми.'
    },
    {
      startLine: 46, endLine: 48,
      title: 'Второй uses в implementation',
      explanation: 'В Delphi можно подключать модули двумя списками. Первый (в interface) видят все, кто использует ваш модуль. Второй (в implementation) — внутренний: он нужен только вашему коду. Vcl.Dialogs (ShowMessage) и uUiHelpers (ConfirmDelete, ShowException) — детали реализации, наружу их выставлять незачем.'
    },
    {
      startLine: 50, endLine: 59,
      title: 'Init — получить зависимости и привязать гриды',
      explanation: 'Конструктор фрейма создаёт VCL-механика, а «внедрение зависимостей» делается отдельным методом Init: форма-хозяин после создания передаёт сервис, данные и колбэк. Дальше — знакомая привязка: DataSource -> TDBGrid, и гриды сами показывают всё, что вернут запросы. AMainData запоминаем в поле, потому что он нужен и позже.'
    },
    {
      startLine: 61, endLine: 64,
      title: 'RefreshView — пустой',
      explanation: 'Гриды обновляются сами через TDataSource при RefreshData, поэтому метод пустой. Он существует для единообразия: главная форма вызывает RefreshView у всех вкладок одинаково, не задумываясь, каким фреймам что нужно. Это приём «null object»: лучше пустой метод, чем if-ы по всем вкладкам.'
    },
    {
      startLine: 66, endLine: 82,
      title: 'Клик по кнопке: сначала посчитать, потом спрашивать',
      explanation: 'Порядок действий — образец аккуратной работы с опасной операцией. Шаг 1: FArchiveSvc.Preview возвращает TClosePeriodResult — снимок «что произойдёт» (сколько платежей обнулится, сколько расходов уйдёт в архив, каким будет сальдо), ничего не меняя. Шаг 2: если архивировать нечего — просто сообщаем и выходим (Exit). Шаг 3: ConfirmDelete показывает диалог с ТОЧНЫМИ цифрами (Format подставляет %d — целые числа, %m — деньги с валютой). Пользователь нажал «Отмена» — ничего не случилось.'
    },
    {
      startLine: 84, endLine: 94,
      title: 'Клик по кнопке: выполнить и отчитаться',
      explanation: 'Только теперь — настоящая операция FArchiveSvc.ClosePeriod, обёрнутая в try..except: если база ответит ошибкой, ShowException покажет её по-человечески, а программа не рухнет. После успеха — итоговое сообщение и вызов FOnRefresh(Self): проверка Assigned обязательна, потому что колбэк мог не быть установлен. Главная форма в этом колбэке обновит все вкладки — баланс после обнуления платежей изменится везде.'
    }
  ]
};
