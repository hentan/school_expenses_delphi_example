unit uRepositories;

{
  Модуль доступа к данным (CRUD-репозитории).
  Содержит репозитории для учеников (parents_and_children),
  поступлений (money_from_parents), расходов (outlay)
  и закрытия периода — архивации (TArchiveRepository).

  Репозитории выполняют только запись/чтение в БД. Валидация и
  бизнес-правила живут в сервисном слое (uServices) — репозитории
  доверяют входным данным, т.к. сервисы гарантируют корректность.
}

interface

uses
  System.SysUtils,
  Winapi.Windows,
  FireDAC.Comp.Client;

type
  // Базовый класс: хранит ссылку на соединение для всех репозиториев.
  // Реализует IInterface заглушками без подсчёта ссылок (как TComponent) —
  // время жизни репозиториев управляется вручную через Free в composition root
  // (SchoolExpensesDemo.dpr), интерфейсные ссылки сервисов не владеют объектами.
  TRepository = class(TObject, IInterface)
  protected
    FConnection: TFDConnection;
    function QueryInterface(const IID: TGUID; out Obj): HResult; stdcall;
    function _AddRef: Integer; stdcall;
    function _Release: Integer; stdcall;
  public
    constructor Create(AConnection: TFDConnection);
  end;

  // Список учеников для заполнения выпадающих списков UI.
  TPupilComboEntry = record
    Id: Integer;
    DisplayName: string;
  end;
  TPupilComboArray = array of TPupilComboEntry;

  IPupilRepository = interface
    ['{F5A1C2E0-1111-4A11-9A11-000000000001}']
    procedure Add(const AChildrenName, AParentName, APhone, AAfterLesson: string);
    procedure Delete(AId: Integer);
    procedure Update(AId: Integer; const AChildrenName, AParentName,
                      APhone, AAfterLesson: string);
    function ListForCombo: TPupilComboArray;
  end;

  IPaymentRepository = interface
    ['{F5A1C2E0-1111-4A11-9A11-000000000002}']
    procedure Add(APupilId: Integer; const AChildrenName: string; ASum: Integer);
    procedure Delete(AId: Integer);
    procedure Update(AId: Integer; const AChildrenName: string; ASum: Integer);
    function Total: Currency;
  end;

  IExpenseRepository = interface
    ['{F5A1C2E0-1111-4A11-9A11-000000000003}']
    procedure Add(APupilId: Integer; const ADate, AItemName: string; ASum: Currency);
    procedure Delete(AId: Integer);
    procedure Update(AId, APupilId: Integer; const ADate, AItemName: string; ASum: Currency);
    function Total: Currency;
  end;

  // Результат закрытия периода (архивации).
  TClosePeriodResult = record
    ResetPayments: Integer;    // платежей обнулено (старые суммы уходят
                               // в money_from_parents_arc через триггер UPDATE)
    ArchivedExpenses: Integer; // расходов перенесено в outlay_arc
    CarryOverSum: Currency;    // сальдо, записанное в outlay (остаток — с минусом)
  end;

  IArchiveRepository = interface
    ['{F5A1C2E0-1111-4A11-9A11-000000000004}']
    // Снимок данных перед архивацией: счётчики строк и сальдо, без изменений в БД.
    function Preview: TClosePeriodResult;
    // Атомарно переносит текущие платежи и расходы в архивные таблицы
    // (через триггеры) и пишет итоговую строку сальдо в outlay.
    function ClosePeriod(const ACarryOverItemName: string): TClosePeriodResult;
  end;

  // Добавляет/изменяет/удаляет учеников.
  TPupilRepository = class(TRepository, IPupilRepository)
  public
    procedure Add(const AChildrenName, AParentName, APhone, AAfterLesson: string);
    procedure Delete(AId: Integer);
    procedure Update(AId: Integer; const AChildrenName, AParentName,
                      APhone, AAfterLesson: string);
    function ListForCombo: TPupilComboArray;
  end;

  // Добавляет поступления денег и считает общую сумму поступлений.
  TPaymentRepository = class(TRepository, IPaymentRepository)
  public
    procedure Add(APupilId: Integer; const AChildrenName: string; ASum: Integer);
    procedure Delete(AId: Integer);
    procedure Update(AId: Integer; const AChildrenName: string; ASum: Integer);
    function Total: Currency;
  end;

  // Добавляет расходы и считает общую сумму расходов.
  TExpenseRepository = class(TRepository, IExpenseRepository)
  public
    procedure Add(APupilId: Integer; const ADate, AItemName: string; ASum: Currency);
    procedure Delete(AId: Integer);
    procedure Update(AId, APupilId: Integer; const ADate, AItemName: string; ASum: Currency);
    function Total: Currency;
  end;

  // Закрытие периода: расходы — в архив, платежи — обнуляются.
  TArchiveRepository = class(TRepository, IArchiveRepository)
  private
    function SubmittedTotal: Currency;
    function SpentTotal: Currency;
    function NonZeroPaymentsCount: Integer;
    function ExpensesCount: Integer;
  public
    function Preview: TClosePeriodResult;
    function ClosePeriod(const ACarryOverItemName: string): TClosePeriodResult;
  end;

implementation

uses
  Data.DB;

constructor TRepository.Create(AConnection: TFDConnection);
begin
  inherited Create;
  FConnection := AConnection;
end;

function TRepository.QueryInterface(const IID: TGUID; out Obj): HResult;
begin
  if GetInterface(IID, Obj) then
    Result := S_OK
  else
    Result := E_NOINTERFACE;
end;

function TRepository._AddRef: Integer;
begin
  Result := -1;
end;

function TRepository._Release: Integer;
begin
  Result := -1;
end;

{ TPupilRepository }

procedure TPupilRepository.Add(
  const AChildrenName, AParentName, APhone, AAfterLesson: string);
begin
  FConnection.ExecSQL(
    'INSERT INTO parents_and_children(children_name, parent_name, phone, after_lesson) ' +
    'VALUES (:children_name, :parent_name, :phone, :after_lesson)',
    [AChildrenName, AParentName, APhone, AAfterLesson]
  );
end;

procedure TPupilRepository.Delete(AId: Integer);
begin
  FConnection.ExecSQL(
    'DELETE FROM dbo.parents_and_children WHERE id = :id',
    [AId]
  );
end;

procedure TPupilRepository.Update(AId: Integer; const AChildrenName: string;
  const AParentName: string; const APhone: string; const AAfterLesson: string);
begin
  FConnection.ExecSQL(
    'UPDATE dbo.parents_and_children SET children_name = :children_name, ' +
    'parent_name = :parent_name, phone = :phone, after_lesson = :after_lesson ' +
    'WHERE id = :id',
    [AChildrenName, AParentName, APhone, AAfterLesson, AId]
  );
end;

function TPupilRepository.ListForCombo: TPupilComboArray;
var
  Reader: TFDQuery;
  Entry: TPupilComboEntry;
  Count: Integer;
begin
  Reader := TFDQuery.Create(nil);
  try
    Reader.Connection := FConnection;
    Reader.Open('SELECT id, children_name FROM dbo.parents_and_children ORDER BY children_name');
    Count := 0;
    SetLength(Result, 0);
    while not Reader.Eof do
    begin
      Entry.Id := Reader.FieldByName('id').AsInteger;
      Entry.DisplayName := Trim(Reader.FieldByName('children_name').AsString);
      if Entry.DisplayName = '' then
        Entry.DisplayName := Format('Ученик %d', [Entry.Id]);
      SetLength(Result, Count + 1);
      Result[Count] := Entry;
      Inc(Count);
      Reader.Next;
    end;
  finally
    Reader.Free;
  end;
end;

{ TPaymentRepository }

procedure TPaymentRepository.Add(APupilId: Integer; const AChildrenName: string;
  ASum: Integer);
begin
  FConnection.ExecSQL(
    'INSERT INTO money_from_parents(children_name, summ_to_first_november, id) ' +
    'VALUES (:children_name, :summ, :id)',
    [AChildrenName, ASum, APupilId]
  );
end;

procedure TPaymentRepository.Delete(AId: Integer);
begin
  FConnection.ExecSQL(
    'DELETE FROM dbo.money_from_parents WHERE id = :id',
    [AId]
  );
end;

procedure TPaymentRepository.Update(AId: Integer; const AChildrenName: string;
  ASum: Integer);
begin
  FConnection.ExecSQL(
    'UPDATE dbo.money_from_parents SET children_name = :children_name, ' +
    'summ_to_first_november = :summ WHERE id = :id',
    [AChildrenName, ASum, AId]
  );
end;

function TPaymentRepository.Total: Currency;
begin
  Result := FConnection.ExecSQLScalar(
    'SELECT COALESCE(SUM(summ_to_first_november), 0) FROM dbo.money_from_parents'
  );
end;

{ TExpenseRepository }

procedure TExpenseRepository.Add(APupilId: Integer; const ADate, AItemName: string;
  ASum: Currency);
begin
  FConnection.ExecSQL(
    'INSERT INTO outlay(date_purchaise, item_name, customer, summ) ' +
    'VALUES (:date_purchaise, :item_name, :customer, :summ)',
    [ADate, AItemName, APupilId, ASum]
  );
end;

procedure TExpenseRepository.Delete(AId: Integer);
begin
  FConnection.ExecSQL(
    'DELETE FROM dbo.outlay WHERE id = :id',
    [AId]
  );
end;

procedure TExpenseRepository.Update(AId, APupilId: Integer; const ADate, AItemName: string;
  ASum: Currency);
begin
  FConnection.ExecSQL(
    'UPDATE dbo.outlay SET date_purchaise = :date_purchaise, item_name = :item_name, ' +
    'customer = :customer, summ = :summ WHERE id = :id',
    [ADate, AItemName, APupilId, ASum, AId]
  );
end;

function TExpenseRepository.Total: Currency;
begin
  Result := FConnection.ExecSQLScalar(
    'SELECT COALESCE(SUM(summ), 0) FROM dbo.outlay'
  );
end;

{ TArchiveRepository }

function TArchiveRepository.SubmittedTotal: Currency;
begin
  Result := FConnection.ExecSQLScalar(
    'SELECT COALESCE(SUM(summ_to_first_november), 0) FROM dbo.money_from_parents');
end;

function TArchiveRepository.SpentTotal: Currency;
begin
  Result := FConnection.ExecSQLScalar(
    'SELECT COALESCE(SUM(summ), 0) FROM dbo.outlay');
end;

function TArchiveRepository.NonZeroPaymentsCount: Integer;
begin
  // Только ненулевые суммы — нулевые строки обнулять и архивировать не нужно.
  Result := FConnection.ExecSQLScalar(
    'SELECT COUNT(*) FROM dbo.money_from_parents WHERE summ_to_first_november <> 0');
end;

function TArchiveRepository.ExpensesCount: Integer;
begin
  Result := FConnection.ExecSQLScalar(
    'SELECT COUNT(*) FROM dbo.outlay');
end;

function TArchiveRepository.Preview: TClosePeriodResult;
begin
  Result.ResetPayments := NonZeroPaymentsCount;
  Result.ArchivedExpenses := ExpensesCount;
  // Сальдо = потрачено − сдано: при остатке денег уйдёт в outlay с минусом,
  // при перерасходе — с плюсом.
  Result.CarryOverSum := SpentTotal - SubmittedTotal;
end;

function TArchiveRepository.ClosePeriod(
  const ACarryOverItemName: string): TClosePeriodResult;
begin
  FConnection.StartTransaction;
  try
    Result := Preview;

    if (Result.ResetPayments > 0) or (Result.ArchivedExpenses > 0) then
    begin
      // Платежи не удаляются, а обнуляются: список учеников остаётся заполненным,
      // старые суммы попадают в архив через триггер money_from_parents_update.
      FConnection.ExecSQL(
        'UPDATE dbo.money_from_parents SET summ_to_first_november = 0 ' +
        'WHERE summ_to_first_november <> 0');

      // Удалённые расходы уходят в архив через триггер delete_from_outlay.
      FConnection.ExecSQL('DELETE FROM dbo.outlay');

      // Итоговая строка сальдо остаётся в рабочих данных. customer = 0 —
      // «без ученика», в гриде расходов имя будет пустым (LEFT JOIN).
      FConnection.ExecSQL(
        'INSERT INTO dbo.outlay(date_purchaise, item_name, customer, summ) ' +
        'VALUES (:date_purchaise, :item_name, 0, :summ)',
        [FormatDateTime('yyyy-mm-dd', Date), ACarryOverItemName, Result.CarryOverSum]
      );
    end;

    FConnection.Commit;
  except
    FConnection.Rollback;
    raise;
  end;
end;

end.
