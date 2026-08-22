window.LEARN_FILES = window.LEARN_FILES || {};
window.LEARN_FILES['uMainForm'] = {
  code: `﻿unit uMainForm;

{
  Главная форма — тонкая оболочка.
  Содержит PageControl с четырьмя вкладками и StatusLabel с балансом.
  Вся логика вкладок вынесена в frame-ы (uPupilsFrame, uPaymentsFrame,
  uExpensesFrame, uArchiveFrame). Форма создаёт frame-ы, передаёт им
  зависимости через Init и оркестрирует общий refresh + статус.

  Форма не знает ни схемы БД, ни репозиториев — только сервисы и
  обёртки слоя данных (uMainData).
}

interface

uses
  System.SysUtils,
  System.Classes,
  Vcl.Controls,
  Vcl.ExtCtrls,
  Vcl.Forms,
  Vcl.StdCtrls,
  Vcl.ComCtrls,
  uMainData,
  uServices,
  uPupilsFrame,
  uPaymentsFrame,
  uExpensesFrame,
  uArchiveFrame;

type
  TMainForm = class(TForm)
    StatusLabel: TLabel;
    PageControl: TPageControl;
    PupilsTab: TTabSheet;
    PaymentsTab: TTabSheet;
    ExpensesTab: TTabSheet;
    ArchiveTab: TTabSheet;
    procedure MainFormClose(Sender: TObject; var Action: TCloseAction);
  private
    FPupilSvc: TPupilService;
    FPaymentSvc: TPaymentService;
    FExpenseSvc: TExpenseService;
    FBalance: TBalanceService;
    FArchiveSvc: TArchiveService;
    FMainData: TMainData;

    FPupilsFrame: TPupilsFrame;
    FPaymentsFrame: TPaymentsFrame;
    FExpensesFrame: TExpensesFrame;
    FArchiveFrame: TArchiveFrame;

    procedure CreateFrames;
    procedure RefreshData(Sender: TObject);
    procedure UpdateStatus;
  public
    procedure Init(APupilSvc: TPupilService; APaymentSvc: TPaymentService;
      AExpenseSvc: TExpenseService; ABalance: TBalanceService;
      AArchiveSvc: TArchiveService; AMainData: TMainData);
  end;

var
  MainForm: TMainForm;

implementation

{$R *.dfm}

procedure TMainForm.Init(APupilSvc: TPupilService; APaymentSvc: TPaymentService;
  AExpenseSvc: TExpenseService; ABalance: TBalanceService;
  AArchiveSvc: TArchiveService; AMainData: TMainData);
begin
  FPupilSvc := APupilSvc;
  FPaymentSvc := APaymentSvc;
  FExpenseSvc := AExpenseSvc;
  FBalance := ABalance;
  FArchiveSvc := AArchiveSvc;
  FMainData := AMainData;

  CreateFrames;
  RefreshData(nil);
end;

procedure TMainForm.CreateFrames;
begin
  FPupilsFrame := TPupilsFrame.Create(Self);
  FPupilsFrame.Parent := PupilsTab;
  FPupilsFrame.Align := alClient;
  FPupilsFrame.Init(FPupilSvc, FMainData, RefreshData);

  FPaymentsFrame := TPaymentsFrame.Create(Self);
  FPaymentsFrame.Parent := PaymentsTab;
  FPaymentsFrame.Align := alClient;
  FPaymentsFrame.Init(FPaymentSvc, FPupilSvc, FMainData, RefreshData);

  FExpensesFrame := TExpensesFrame.Create(Self);
  FExpensesFrame.Parent := ExpensesTab;
  FExpensesFrame.Align := alClient;
  FExpensesFrame.Init(FExpenseSvc, FPupilSvc, FMainData, RefreshData);

  FArchiveFrame := TArchiveFrame.Create(Self);
  FArchiveFrame.Parent := ArchiveTab;
  FArchiveFrame.Align := alClient;
  FArchiveFrame.Init(FArchiveSvc, FMainData, RefreshData);
end;

procedure TMainForm.RefreshData(Sender: TObject);
begin
  FMainData.RefreshData;
  FPupilsFrame.RefreshView;
  FPaymentsFrame.RefreshView;
  FExpensesFrame.RefreshView;
  FArchiveFrame.RefreshView;
  UpdateStatus;
end;

procedure TMainForm.UpdateStatus;
begin
  StatusLabel.Caption := Format(
    'Сдано: %m   Потрачено: %m   Баланс: %m',
    [FPaymentSvc.Total, FExpenseSvc.Total, FBalance.Balance]
  );
end;

procedure TMainForm.MainFormClose(Sender: TObject; var Action: TCloseAction);
begin
  Action := caFree;
end;

end.
`,
  annotations: [
    {
      startLine: 1, endLine: 12,
      title: 'Заголовок модуля uMainForm',
      explanation: 'Главная форма приложения — «тонкая оболочка». Содержит PageControl (вкладки) и StatusLabel (баланс). Вся логика вкладок вынесена в ОТДЕЛЬНЫЕ frame-модули. Форма только: (1) создаёт frame-ы, (2) передаёт им зависимости, (3) оркестрирует общий refresh. Это разделение ответственности: форма = компоновка, frame = конкретная вкладка. Главное правило: форма не знает ни схемы БД, ни репозиториев — только сервисы и uMainData.'
    },
    {
      startLine: 16, endLine: 29,
      title: 'interface uses',
      explanation: 'System.* (базовые типы), Vcl.* (визуальные компоненты: Controls, ExtCtrls, Forms, StdCtrls, ComCtrls — PageControl/TabSheet), uMainData (слой данных), uServices (сервисы), и 4 frame-модуля. Большой список uses — форма композитная, зависит от всех вкладок.'
    },
    {
      startLine: 31, endLine: 60,
      title: 'Класс TMainForm — поля и декларации',
      explanation: 'class(TForm). Поля StatusLabel, PageControl, 4 TTabSheet — компоненты из .dfm (визуально размещены в IDE). MainFormClose — обработчик закрытия. private: 6 ссылок на сервисы/данные, включая FArchiveSvc (получает через Init), и 4 ссылки на frame-ы. CreateFrames/RefreshData/UpdateStatus — приватные методы оркестрации. public: только Init — точка внедрения зависимостей.'
    },
    {
      startLine: 62, endLine: 63,
      title: 'global var MainForm',
      explanation: 'Глобальная переменная — ссылка на главную форму. Создаётся в .dpr через Application.CreateForm(TMainForm, MainForm). Глобальная видимость — для доступа из других мест (хотя в этом проекте почти не используется). Современный стиль Delphi — избегать globals, но для MainForm это традиционный приём.'
    },
    {
      startLine: 67, endLine: 67,
      title: '{$R *.dfm}',
      explanation: 'Директива компоновки .dfm: связывает uMainForm.pas с uMainForm.dfm (визуальное описание формы — позиция, размеры, свойства PageControl, TabSheet, StatusLabel). Без неё форма была бы пустой. Звёздочка = «имя текущего модуля».'
    },
    {
      startLine: 69, endLine: 82,
      title: 'Init — внедрение зависимостей',
      explanation: 'Форма НЕ создаёт сервисы/данные — она их ПОЛУЧАЕТ через Init. Все 6 параметров сохраняются в приватные поля. Затем CreateFrames (создать вкладки) и RefreshData(nil) (первичная загрузка данных). Почему Init, а не конструктор: главная форма создаётся через Application.CreateForm (особым образом), и её конструктор нельзя свободно переопределять. Поэтому зависимости передаются отдельным методом после создания.'
    },
    {
      startLine: 84, endLine: 105,
      title: 'CreateFrames — создание вкладок',
      explanation: 'Создаёт 4 frame-а (по одному на вкладку). Каждый frame: Create(Self) — владелец главная форма (освободится автоматически при закрытии). Parent := TabSheet — frame размещается на вкладке. Align := alClient — занимает всю площадь вкладки. Init(...) — frame получает свои зависимости и колбэк RefreshData. Обратите внимание: FPaymentsFrame и FExpensesFrame получают ДОПОЛНИТЕЛЬНО FPupilSvc — им нужен список учеников для combo. FArchiveFrame получает FArchiveSvc — у него есть кнопка закрытия периода, это полноценная операция, а не только просмотр.'
    },
    {
      startLine: 107, endLine: 115,
      title: 'RefreshData — колбэк обновления',
      explanation: 'Этот метод передаётся во frame-ы как FOnRefresh (TNotifyEvent). Frame вызывает его после любой мутации (добавил/удалил/изменил, закрыл период). RefreshData: (1) FMainData.RefreshData — перечитать данные из БД (все 5 запросов); (2) RefreshView каждого frame — обновить combo и пр.; (3) UpdateStatus — пересчитать баланс. Sender: TObject — стандартная сигнатура TNotifyEvent (кто вызвал).'
    },
    {
      startLine: 117, endLine: 123,
      title: 'UpdateStatus — строка баланса',
      explanation: 'Format с шаблоном ‘Сдано: %m ...’. %m — формат денежной величины (Currency), использует локаль Windows (для ru-RU будет «1 234,50 р.»). Три значения: Total платежей, Total расходов, Balance (разность). Вызывается после каждого refresh — баланс всегда актуален. Каждый Total делает SQL-запрос — для школьного класса нормально.'
    },
    {
      startLine: 125, endLine: 128,
      title: 'MainFormClose',
      explanation: 'Обработчик OnClose. Action := caFree — форма при закрытии освобождается (по умолчанию caHide, форма осталась бы в памяти). В этом проекте приложение завершается при закрытии главной формы, поэтому caFree корректно. var-параметр Action — стандартный паттерн VCL для управления поведением закрытия.'
    }
  ]
};
