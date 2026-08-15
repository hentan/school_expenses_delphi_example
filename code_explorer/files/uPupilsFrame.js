window.LEARN_FILES = window.LEARN_FILES || {};
window.LEARN_FILES['uPupilsFrame'] = {
  code: `﻿unit uPupilsFrame;

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
`,
  annotations: [
    {
      startLine: 1, endLine: 8,
      title: 'Заголовок модуля uPupilsFrame',
      explanation: 'Вкладка «Ученики» главной формы. Это TFrame (фрейм) — контейнер с визуальными компонентами, который размещается на TTabSheet. Фрейм содержит панель ввода (4 поля) и грид (таблица) учеников. Мутации (добавить/удалить/изменить) через TPupilService, данные грида — через TMainData. После любой мутации вызывает FOnRefresh — колбэк главной формы для перечитывания всех данных.'
    },
    {
      startLine: 12, endLine: 21,
      title: 'interface uses',
      explanation: 'System.* (базовые), Vcl.* (Controls, StdCtrls — Edit/Button, ExtCtrls — Panel, DBGrids — TDBGrid, Forms — TFrame), uMainData (данные грида), uServices (TPupilService). Фрейм зависит от сервиса и слоя данных — но НЕ от репозиториев напрямую.'
    },
    {
      startLine: 23, endLine: 50,
      title: 'Класс TPupilsFrame — декларация',
      explanation: 'class(TFrame). Поля: PupilsPanel (панель ввода), 4 Label + 4 Edit (ФИО, родитель, телефон, после уроков), 3 Button (Add/Delete/Refresh), PupilsGrid (TDBGrid — таблица). 4 обработчика событий. private: FPupilSvc, FMainData, FOnRefresh (колбэк). public: Init (внедрение зависимостей) и RefreshView. Поля-компоненты объявлены в .dfm фрейма.'
    },
    {
      startLine: 54, endLine: 58,
      title: 'implementation uses + {$R}',
      explanation: 'uUiHelpers (ShowException, ConfirmDelete), uUpdatePupilForm (форма редактирования ученика). {$R *.dfm} — связывает с uPupilsFrame.dfm. В implementation uses — то, что нужно только для реализации, не для интерфейса класса.'
    },
    {
      startLine: 60, endLine: 68,
      title: 'Init — привязка данных',
      explanation: 'Сохраняет сервис, данные и колбэк в приватные поля. Ключевая строка: PupilsGrid.DataSource := FMainData.PupilsSource — привязывает грид к источнику данных. После этого грид АВТОМАТИЧЕКИ отображает данные из запроса и обновляется при RefreshData. TDBGrid + TDataSource — data binding VCL, ручной синхронизации не нужно.'
    },
    {
      startLine: 70, endLine: 73,
      title: 'RefreshView — пустой',
      explanation: 'У фрейма учеников НЕТ combo для заполнения, поэтому RefreshView пустой. Грид обновляется сам через TDataSource. Метод существует для единообразия с другими фреймами (главная форма вызывает RefreshView у всех одинаково). Это «null object» — заглушка для согласованности интерфейса.'
    },
    {
      startLine: 75, endLine: 93,
      title: 'AddPupilClick — добавление',
      explanation: 'Читает 4 поля ввода, вызывает FPupilSvc.Add (сервис провалидирует и запишет). После успеха — очищает поля (Clear) и вызывает FOnRefresh (перечитать данные). try/except: если сервис бросит EValidationException (например, ФИО пусто) — ShowException покажет сообщение, форма останется рабочей. Это паттерн для всех мутаций: действие → refresh → обработка ошибок.'
    },
    {
      startLine: 95, endLine: 106,
      title: 'DeletePupilClick — удаление',
      explanation: 'Сначала ConfirmDelete (диалог «Удалить ученика?») — защита от случайного нажатия. Если Нет — Exit. Если Да — FPupilSvc.Delete(FMainData.CurrentPupilId) (id текущей записи грида) и FOnRefresh. try/except ловит ошибки (например, ученик не выбран → id=0 → сервис бросит «Выберите ученика»).'
    },
    {
      startLine: 108, endLine: 141,
      title: 'PupilsGridDbClick — редактирование',
      explanation: 'Двойной клик по строке грида открывает форму редактирования. PupilsEmpty — защита (если строк нет). PupilId := CurrentPupilId (id текущей записи). Создаёт TuEditPupilForm, передавая ТЕКУЩИЕ значения полей (для предзаполнения). try/finally — освобождение формы. Внутри try: ShowModal = mrOk → если ОК, вызвать FPupilSvc.Update с отредактированными значениями (из геттеров формы) и FOnRefresh. Вложенный try/except ловит ошибки Update.'
    },
    {
      startLine: 143, endLine: 147,
      title: 'RefreshClick',
      explanation: 'Кнопка «Обновить» — просто вызывает FOnRefresh. Полезно, если данные менялись внешне (в другой программе). Sender: TObject — стандартный TNotifyEvent, передаёт кнопку как источник события.'
    }
  ]
};
