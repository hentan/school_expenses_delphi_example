unit uTestMocks;

{
  Моки репозиториев для тестов сервисного слоя.
  Не обращаются к БД: факты вызовов записываются в публичные поля,
  возвращаемые значения задаются тестом напрямую.

  Как и боевые репозитории (TRepository), реализуют IInterface без
  подсчёта ссылок: время жизни моков управляет сам тест через Free
  в TearDown, интерфейсные ссылки сервисов мок не разрушают.
}

interface

uses
  System.SysUtils,
  Winapi.Windows,
  uRepositories;

type
  // Базовый класс моков: IInterface-заглушки без подсчёта ссылок.
  TManualLifetimeObject = class(TObject, IInterface)
  protected
    function QueryInterface(const IID: TGUID; out Obj): HResult; stdcall;
    function _AddRef: Integer; stdcall;
    function _Release: Integer; stdcall;
  end;

  // Запоминает последний вызов каждого метода IPupilRepository.
  TMockPupilRepo = class(TManualLifetimeObject, IPupilRepository)
  public
    AddCount: Integer;
    DeleteCount: Integer;
    UpdateCount: Integer;
    LastAddedName: string;
    LastAddedParent: string;
    LastAddedPhone: string;
    LastAddedAfterLesson: string;
    LastDeletedId: Integer;
    LastUpdatedId: Integer;
    LastUpdatedName: string;
    LastUpdatedParent: string;
    LastUpdatedPhone: string;
    LastUpdatedAfterLesson: string;
    ComboToReturn: TPupilComboArray;
    procedure Add(const AChildrenName, AParentName, APhone,
      AAfterLesson: string);
    procedure Delete(AId: Integer);
    procedure Update(AId: Integer; const AChildrenName, AParentName,
      APhone, AAfterLesson: string);
    function ListForCombo: TPupilComboArray;
  end;

  // Запоминает последний вызов каждого метода IPaymentRepository.
  TMockPaymentRepo = class(TManualLifetimeObject, IPaymentRepository)
  public
    AddCount: Integer;
    DeleteCount: Integer;
    UpdateCount: Integer;
    LastAddedPupilId: Integer;
    LastAddedName: string;
    LastAddedSum: Integer;
    LastDeletedId: Integer;
    LastUpdatedId: Integer;
    LastUpdatedName: string;
    LastUpdatedSum: Integer;
    TotalToReturn: Currency;
    procedure Add(APupilId: Integer; const AChildrenName: string; ASum: Integer);
    procedure Delete(AId: Integer);
    procedure Update(AId: Integer; const AChildrenName: string; ASum: Integer);
    function Total: Currency;
  end;

  // Запоминает последний вызов каждого метода IExpenseRepository.
  TMockExpenseRepo = class(TManualLifetimeObject, IExpenseRepository)
  public
    AddCount: Integer;
    DeleteCount: Integer;
    UpdateCount: Integer;
    LastAddedPupilId: Integer;
    LastAddedDate: string;
    LastAddedItem: string;
    LastAddedSum: Currency;
    LastDeletedId: Integer;
    LastUpdatedId: Integer;
    LastUpdatedPupilId: Integer;
    LastUpdatedDate: string;
    LastUpdatedItem: string;
    LastUpdatedSum: Currency;
    TotalToReturn: Currency;
    procedure Add(APupilId: Integer; const ADate, AItemName: string;
      ASum: Currency);
    procedure Delete(AId: Integer);
    procedure Update(AId, APupilId: Integer; const ADate, AItemName: string;
      ASum: Currency);
    function Total: Currency;
  end;

  // Возвращает заранее заданные результаты Preview/ClosePeriod.
  TMockArchiveRepo = class(TManualLifetimeObject, IArchiveRepository)
  public
    PreviewCalls: Integer;
    ClosePeriodCalls: Integer;
    LastCarryOverItemName: string;
    PreviewToReturn: TClosePeriodResult;
    ClosePeriodToReturn: TClosePeriodResult;
    function Preview: TClosePeriodResult;
    function ClosePeriod(const ACarryOverItemName: string): TClosePeriodResult;
  end;

// Быстрое заполнение записи для выпадающего списка учеников.
function MakeComboEntry(AId: Integer; const ADisplayName: string): TPupilComboEntry;

implementation

{ TManualLifetimeObject }

function TManualLifetimeObject.QueryInterface(const IID: TGUID;
  out Obj): HResult;
begin
  if GetInterface(IID, Obj) then
    Result := S_OK
  else
    Result := E_NOINTERFACE;
end;

function TManualLifetimeObject._AddRef: Integer;
begin
  Result := -1;
end;

function TManualLifetimeObject._Release: Integer;
begin
  Result := -1;
end;

{ TMockPupilRepo }

procedure TMockPupilRepo.Add(const AChildrenName, AParentName, APhone,
  AAfterLesson: string);
begin
  Inc(AddCount);
  LastAddedName := AChildrenName;
  LastAddedParent := AParentName;
  LastAddedPhone := APhone;
  LastAddedAfterLesson := AAfterLesson;
end;

procedure TMockPupilRepo.Delete(AId: Integer);
begin
  Inc(DeleteCount);
  LastDeletedId := AId;
end;

procedure TMockPupilRepo.Update(AId: Integer; const AChildrenName, AParentName,
  APhone, AAfterLesson: string);
begin
  Inc(UpdateCount);
  LastUpdatedId := AId;
  LastUpdatedName := AChildrenName;
  LastUpdatedParent := AParentName;
  LastUpdatedPhone := APhone;
  LastUpdatedAfterLesson := AAfterLesson;
end;

function TMockPupilRepo.ListForCombo: TPupilComboArray;
begin
  Result := ComboToReturn;
end;

{ TMockPaymentRepo }

procedure TMockPaymentRepo.Add(APupilId: Integer; const AChildrenName: string;
  ASum: Integer);
begin
  Inc(AddCount);
  LastAddedPupilId := APupilId;
  LastAddedName := AChildrenName;
  LastAddedSum := ASum;
end;

procedure TMockPaymentRepo.Delete(AId: Integer);
begin
  Inc(DeleteCount);
  LastDeletedId := AId;
end;

procedure TMockPaymentRepo.Update(AId: Integer; const AChildrenName: string;
  ASum: Integer);
begin
  Inc(UpdateCount);
  LastUpdatedId := AId;
  LastUpdatedName := AChildrenName;
  LastUpdatedSum := ASum;
end;

function TMockPaymentRepo.Total: Currency;
begin
  Result := TotalToReturn;
end;

{ TMockExpenseRepo }

procedure TMockExpenseRepo.Add(APupilId: Integer; const ADate,
  AItemName: string; ASum: Currency);
begin
  Inc(AddCount);
  LastAddedPupilId := APupilId;
  LastAddedDate := ADate;
  LastAddedItem := AItemName;
  LastAddedSum := ASum;
end;

procedure TMockExpenseRepo.Delete(AId: Integer);
begin
  Inc(DeleteCount);
  LastDeletedId := AId;
end;

procedure TMockExpenseRepo.Update(AId, APupilId: Integer; const ADate,
  AItemName: string; ASum: Currency);
begin
  Inc(UpdateCount);
  LastUpdatedId := AId;
  LastUpdatedPupilId := APupilId;
  LastUpdatedDate := ADate;
  LastUpdatedItem := AItemName;
  LastUpdatedSum := ASum;
end;

function TMockExpenseRepo.Total: Currency;
begin
  Result := TotalToReturn;
end;

{ TMockArchiveRepo }

function TMockArchiveRepo.Preview: TClosePeriodResult;
begin
  Inc(PreviewCalls);
  Result := PreviewToReturn;
end;

function TMockArchiveRepo.ClosePeriod(
  const ACarryOverItemName: string): TClosePeriodResult;
begin
  Inc(ClosePeriodCalls);
  LastCarryOverItemName := ACarryOverItemName;
  Result := ClosePeriodToReturn;
end;

{ Служебные функции }

function MakeComboEntry(AId: Integer;
  const ADisplayName: string): TPupilComboEntry;
begin
  Result.Id := AId;
  Result.DisplayName := ADisplayName;
end;

end.
