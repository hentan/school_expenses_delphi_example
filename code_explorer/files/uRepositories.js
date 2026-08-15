window.LEARN_FILES = window.LEARN_FILES || {};
window.LEARN_FILES['uRepositories'] = {
  code: `﻿unit uRepositories;

{
  Модуль доступа к данным (CRUD-репозитории).
  Содержит репозитории для учеников (parents_and_children),
  поступлений (money_from_parents) и расходов (outlay).

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
    procedure Add(APupilId: Integer; const AChildrenName: string; ASum: Currency);
    procedure Delete(AId: Integer);
    procedure Update(AId: Integer; const AChildrenName: string; ASum: Currency);
    function Total: Currency;
  end;

  IExpenseRepository = interface
    ['{F5A1C2E0-1111-4A11-9A11-000000000003}']
    procedure Add(APupilId: Integer; const ADate, AItemName: string; ASum: Currency);
    procedure Delete(AId: Integer);
    procedure Update(AId, APupilId: Integer; const ADate, AItemName: string; ASum: Currency);
    function Total: Currency;
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
    procedure Add(APupilId: Integer; const AChildrenName: string; ASum: Currency);
    procedure Delete(AId: Integer);
    procedure Update(AId: Integer; const AChildrenName: string; ASum: Currency);
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
  ASum: Currency);
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
  ASum: Currency);
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

end.
`,
  annotations: [
    {
      startLine: 1, endLine: 11,
      title: 'Заголовок модуля uRepositories',
      explanation: 'Слой доступа к данным (Data Access Layer). Три репозитория — по одному на каждую таблицу мутаций (ученики, поступления, расходы). Главное правило: репозитории НЕ валидируют данные — только выполняют SQL. Валидация живёт в uServices. Это разделение ответственности: репозиторий = «как записать», сервис = «что можно записать».'
    },
    {
      startLine: 13, endLine: 18,
      title: 'interface + uses',
      explanation: 'System.SysUtils (базовые утилиты), Winapi.Windows (для некоторых типов), FireDAC.Comp.Client (TFDConnection и TFDQuery). Data.DB подключается в implementation — он нужен только для FieldByName/AsInteger при чтении.'
    },
    {
      startLine: 20, endLine: 33,
      title: 'TRepository — базовый класс с IInterface',
      explanation: 'Родитель всех репозиториев. Хранит FConnection (соединение с БД). Наследуется от TObject И реализует IInterface. IInterface требует три метода: QueryInterface, _AddRef, _Release — их stub-реализация без подсчёта ссылок (возвращает -1). Зачем это: сервисы хранят репозитории через интерфейсные ссылки (IPupilRepository и т.п.). В Delphi интерфейсная ссылка обычно увеличивает счётчик и освобождает объект, когда ссылка выходит из области. Но здесь время жизни управляется вручную (Free в .dpr), поэтому stub-реализация отключает авто-освобождение — объект не уничтожится преждевременно. Это стандартный трюк, как у TComponent.'
    },
    {
      startLine: 35, endLine: 40,
      title: 'TPupilComboEntry — запись для combo',
      explanation: 'record (значимый тип) хранит id ученика и отображаемое имя. Используется для заполнения выпадающих списков (TComboBox) на формах платежей и расходов. TPupilComboArray = array of — динамический массив таких записей.'
    },
    {
      startLine: 42, endLine: 49,
      title: 'IPupilRepository — интерфейс репозитория учеников',
      explanation: 'Чистый интерфейс (контракт) без реализации. GUID в квадратных скобках — нужен для QueryInterface/GetInterface. Методы: Add (добавить), Delete (удалить по id), Update (изменить), ListForCombo (список для выпадающего списка). Сервисы зависят от интерфейса, а не от класса TPupilRepository — это позволяет подменять реализацию (например, моком в тестах) и не связывает слои жёстко.'
    },
    {
      startLine: 51, endLine: 57,
      title: 'IPaymentRepository',
      explanation: 'Контракт репозитория поступлений. Включает метод Total — сумма всех поступлений (для расчёта баланса). Обратите внимание: Add принимает APupilId и AChildrenName — id и имя передаются вместе (денормализованно, в духе схемы money_from_parents).'
    },
    {
      startLine: 59, endLine: 65,
      title: 'IExpenseRepository',
      explanation: 'Контракт репозитория расходов. Update принимает и AId (какой расход менять) и APupilId (кто платил) — два id. Тоже есть Total для баланса.'
    },
    {
      startLine: 67, endLine: 93,
      title: 'Классы-реализации TPupil/TPayment/TExpenseRepository',
      explanation: 'Конкретные репозитории. Каждый наследует TRepository (получает FConnection) и реализует свой интерфейс. class(TRepository, IPupilRepository) — множественное наследование: один класс-родитель + интерфейсы. В implementation каждый метод просто выполняет параметризованный SQL через FConnection.ExecSQL.'
    },
    {
      startLine: 100, endLine: 104,
      title: 'TRepository.Create',
      explanation: 'Принимает соединение и сохраняет в FConnection. inherited Create инициализирует TObject. Все репозитории-наследники используют этот конструктор (не переопределяют его).'
    },
    {
      startLine: 106, endLine: 122,
      title: 'Stub-реализация IInterface',
      explanation: 'QueryInterface — через GetInterface возвращает интерфейс по GUID (S_OK если найден, E_NOINTERFACE иначе). _AddRef/_Release возвращают -1 — это отключает подсчёт ссылок. Если бы они считали ссылки, интерфейсная ссылка в сервисе при выходе из области вызвала бы _Release, счётчик стал бы 0, и объект уничтожился бы сам — но мы управляем им вручную через .dpr. Stub-возврат -1 («неуправляемый») предотвращает это. ВАЖНО: возвращать нужно именно -1 (а не 0), иначе Delphi всё равно может освободить объект.'
    },
    {
      startLine: 126, endLine: 134,
      title: 'TPupilRepository.Add',
      explanation: 'Выполняет INSERT. Синтаксис :children_name — именованный параметр FireDAC. Значения передаются массивом [AChildrenName, AParentName, APhone, AAfterLesson] — FireDAC сопоставляет их параметрам по порядку. Параметризация защищает от SQL-инъекций (значения не вставляются в текст SQL, а передаются отдельно).'
    },
    {
      startLine: 136, endLine: 142,
      title: 'TPupilRepository.Delete',
      explanation: 'DELETE WHERE id = :id. Удаление по первичному ключу. Триггер archive не срабатывает (нет триггера на удаление учеников) — только деньги/расходы архивируются.'
    },
    {
      startLine: 144, endLine: 153,
      title: 'TPupilRepository.Update',
      explanation: 'UPDATE всех полей ученика по id. Параметры в массиве идут в порядке появления в SQL: children_name, parent_name, phone, after_lesson, id. Важно соблюдать этот порядок — FireDAC сопоставляет по позиции.'
    },
    {
      startLine: 155, endLine: 181,
      title: 'TPupilRepository.ListForCombo',
      explanation: 'Единственный метод с ЧТЕНИЕМ (остальные — запись). Создаёт TFDQuery, открывает SELECT, в цикле читает строки и собирает массив TPupilComboArray. try/finally гарантирует освобождение Reader даже при ошибке. SetLength(Result, Count+1) — динамическое растягивание массива (неэффективно для больших списков, но для школьного класса достаточно). Trim убирает пробелы; если имя пустое — подставляется «Ученик <id>».'
    },
    {
      startLine: 185, endLine: 193,
      title: 'TPaymentRepository.Add',
      explanation: 'INSERT в money_from_children. Заметьте: id — это id ученика (APupilId), а не отдельный PK. В этой схеме один ученик = одна запись о платеже. ASum: Currency — денежный тип, копейки не теряются.'
    },
    {
      startLine: 195, endLine: 211,
      title: 'TPaymentRepository Delete/Update',
      explanation: 'Delete — по id (= id ученика). Update — меняет имя и сумму. В обоих случаях :id — это id ученика, потому что в money_from_parents.id хранится именно он.'
    },
    {
      startLine: 213, endLine: 218,
      title: 'TPaymentRepository.Total',
      explanation: 'ExecSQLScalar — выполняет запрос и возвращает одно значение (первый столбец первой строки). COALESCE(SUM(...), 0) — если строк нет, SUM вернёт NULL, COALESCE заменит его на 0. Используется для расчёта баланса в TBalanceService.'
    },
    {
      startLine: 222, endLine: 248,
      title: 'TExpenseRepository: Add/Delete/Update',
      explanation: 'Аналогично платежам, но для таблицы outlay. Add вставляет дату, на что потрачено, id покупателя (customer = APupilId) и сумму. Update принимает и AId (расхода) и APupilId (покупателя) — расход идентифицируется своим id, а покупатель отдельным полем. Поля :customer и :summ — параметры.'
    },
    {
      startLine: 250, endLine: 255,
      title: 'TExpenseRepository.Total',
      explanation: 'Сумма всех расходов из outlay. Используется в TBalanceService.Balance = Total(платежи) − Total(расходы). COALESCE защищает от пустой таблицы.'
    }
  ]
};
