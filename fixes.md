# Исправления для всплывающего окна редактирования ученика

> Создано: 2026-07-19  
> Статус: не применено

## Обзор

Форма `uUpdatePupilForm` создана через IDE, но есть 6 проблем в 5 файлах, которые мешают компиляции и работе.

---

## 1. `SchoolExpensesDemo.dpr` — опечатки и лишний CreateForm

**Файл:** [`SchoolExpensesDemo.dpr`](SchoolExpensesDemo.dpr)

### Что не так

Строки 24–26 содержат три опечатки:

```pascal
  AApplication.CreateForm(TMainForm, MainForm);      // ← лишняя 'A'
  AApplication.CreateForm(TuEditPupilForm, uEditPupilForm);  // ← лишняя 'A' + лишняя строка
  plication.Run;                                     // ← съелось 'Ap'
```

### Как должно быть

```pascal
  Application.CreateForm(TMainForm, MainForm);
  Application.Run;
```

**Важно:** строка `Application.CreateForm(TuEditPupilForm, uEditPupilForm)` удалена полностью. Модальный диалог не должен создаваться при старте приложения — он создаётся вручную в `PupilsGridDbClick`.

---

## 2. `uUpdatePupilForm.pas` — нет конструктора и обработчика ОК

**Файл:** [`uUpdatePupilForm.pas`](uUpdatePupilForm.pas)

### Что не так

IDE создала пустой класс `TuEditPupilForm` с компонентами, но без логики.

### Соответствие компонентов

| Компонент | Поле БД |
|-----------|---------|
| `Edit1` | surname (Фамилия) |
| `Edit2` | name (Имя) |
| `Edit3` | parent_name (Родитель) |
| `Edit4` | parent_phone (Телефон) |
| `Button1` | ОК |
| `Button2` | Отмена |

### Как должно быть

```pascal
unit uUpdatePupilForm;

interface

uses
  Winapi.Windows, Winapi.Messages, System.SysUtils, System.Variants,
  System.Classes, Vcl.Graphics, Vcl.Controls, Vcl.Forms, Vcl.Dialogs,
  Vcl.StdCtrls;

type
  TuEditPupilForm = class(TForm)
    Edit1: TEdit;   // Фамилия
    Edit2: TEdit;   // Имя
    Edit3: TEdit;   // Родитель
    Edit4: TEdit;   // Телефон
    Button1: TButton;  // ОК
    Button2: TButton;  // Отмена
    procedure Button1Click(Sender: TObject);
  public
    constructor Create(AOwner: TComponent; const ASurname, AName,
      AParentName, AParentPhone: string);
  end;

var
  uEditPupilForm: TuEditPupilForm;

implementation

{$R *.dfm}

constructor TuEditPupilForm.Create(AOwner: TComponent; const ASurname, AName,
  AParentName, AParentPhone: string);
begin
  inherited Create(AOwner);
  Edit1.Text := ASurname;
  Edit2.Text := AName;
  Edit3.Text := AParentName;
  Edit4.Text := AParentPhone;
end;

procedure TuEditPupilForm.Button1Click(Sender: TObject);
begin
  if Trim(Edit1.Text) = '' then
  begin
    ShowMessage('Фамилия обязательна');
    Exit;
  end;
  ModalResult := mrOk;
end;

end.
```

---

## 3. `uUpdatePupilForm.dfm` — нет событий на кнопках

**Файл:** [`uUpdatePupilForm.dfm`](uUpdatePupilForm.dfm)

### Что не так

`Button1` без `OnClick`, `Button2` без `ModalResult`.

### Как должно быть

В блоке `Button1` добавить `OnClick = Button1Click`:

```dfm
  object Button1: TButton
    Left = 8
    Top = 208
    Width = 75
    Height = 25
    Caption = #1054#1082
    TabOrder = 4
    OnClick = Button1Click
  end
```

В блоке `Button2` добавить `ModalResult = 2`:

```dfm
  object Button2: TButton
    Left = 112
    Top = 208
    Width = 75
    Height = 25
    Caption = #1054#1090#1084#1077#1085#1072
    TabOrder = 5
    ModalResult = 2
  end
```

---

## 4. `uMainForm.pas` — нет uses и stub не дописан

**Файл:** [`uMainForm.pas`](uMainForm.pas)

### 4a. Добавить `uUpdatePupilForm` в uses (строка 24)

```pascal
  uUiHelpers,
  uUpdatePupilForm,    // ← добавить
  Data.DB, Vcl.Grids;
```

### 4b. Заменить stub `PupilsGridDbClick` (строки 276–288)

```pascal
procedure TMainForm.PupilsGridDbClick(Sender: TObject);
var
  PupilId: Integer;
  EditForm: TuEditPupilForm;
begin
  if FMainData.PupilsQuery.IsEmpty then
    Exit;

  PupilId := FMainData.PupilsQuery.FieldByName('id').AsInteger;
  if PupilId <= 0 then
    Exit;

  EditForm := TuEditPupilForm.Create(Self,
    FMainData.PupilsQuery.FieldByName('surname').AsString,
    FMainData.PupilsQuery.FieldByName('name').AsString,
    FMainData.PupilsQuery.FieldByName('parent_name').AsString,
    FMainData.PupilsQuery.FieldByName('parent_phone').AsString);
  try
    if EditForm.ShowModal = mrOk then
    begin
      FPupils.Update(PupilId,
        EditForm.Edit1.Text,
        EditForm.Edit2.Text,
        EditForm.Edit3.Text,
        EditForm.Edit4.Text);
      RefreshData;
    end;
  finally
    EditForm.Free;
  end;
end;
```

---

## 5. `uMainForm.dfm` — нет OnDblClick у PupilsGrid

**Файл:** [`uMainForm.dfm`](uMainForm.dfm)

### Что не так

Блок `PupilsGrid` (строка 162) не содержит события `OnDblClick`.

### Как должно быть

```dfm
    object PupilsGrid: TDBGrid
      Left = 0
      Top = 106
      Width = 1024
      Height = 483
      Align = alClient
      TabOrder = 1
      OnDblClick = PupilsGridDbClick
      TitleFont.Charset = DEFAULT_CHARSET
      TitleFont.Color = clWindowText
      TitleFont.Height = -13
      TitleFont.Name = 'Tahoma'
      TitleFont.Style = []
    end
```

---

## 6. `uRepositories.pas` — нет метода Update

**Файл:** [`uRepositories.pas`](uRepositories.pas)

### 6a. Объявление в классе `TPupilRepository` (после `Add`, перед `Delete`)

```pascal
    procedure Add(const ASurname, AName, AParentName, AParentPhone: string);
    procedure Update(AId: Integer; const ASurname, AName, AParentName,
      AParentPhone: string);
    procedure Delete(AId: Integer);
```

### 6b. Реализация (после `Add`, перед `Delete`)

```pascal
procedure TPupilRepository.Update(AId: Integer; const ASurname, AName,
  AParentName, AParentPhone: string);
begin
  if AId <= 0 then
    raise Exception.Create('Выберите ученика');
  if Trim(ASurname) = '' then
    raise Exception.Create('Фамилия ученика обязательна');

  FConnection.ExecSQL(
    'UPDATE dbo.pupils SET surname = :surname, name = :name, ' +
    'parent_name = :parent_name, parent_phone = :parent_phone WHERE id = :id',
    [ASurname, AName, AParentName, AParentPhone, AId]
  );
end;
```

---

## Порядок применения

| # | Файл | Действие |
|---|------|----------|
| 1 | `SchoolExpensesDemo.dpr` | Исправить опечатки, удалить лишний `CreateForm` |
| 2 | `uUpdatePupilForm.pas` | Добавить конструктор и `Button1Click` |
| 3 | `uUpdatePupilForm.dfm` | Добавить `OnClick` и `ModalResult` |
| 4 | `uMainForm.pas` | Добавить `uses`, дописать `PupilsGridDbClick` |
| 5 | `uMainForm.dfm` | Добавить `OnDblClick = PupilsGridDbClick` |
| 6 | `uRepositories.pas` | Добавить метод `Update` |

После всех правок двойной клик по строке в `PupilsGrid` откроет модальный диалог с данными ученика, ОК сохранит изменения через `UPDATE dbo.pupils`, грид обновится.