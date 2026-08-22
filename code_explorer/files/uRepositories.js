window.LEARN_FILES = window.LEARN_FILES || {};
window.LEARN_FILES['uRepositories'] = {
  code: `﻿unit uRepositories;

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
`,
  annotations: [
    {
      startLine: 3, endLine: 11,
      title: 'Заголовок модуля uRepositories',
      explanation: 'Слой доступа к данным (Data Access Layer). Четыре репозитория — по одному на каждую операцию записи: ученики, поступления, расходы и закрытие периода (архивация). Главное правило: репозитории НЕ валидируют данные — только выполняют SQL. Валидация живёт в uServices. Разделение ответственности: репозиторий = «как записать», сервис = «что можно записать».'
    },
    {
      startLine: 15, endLine: 18,
      title: 'interface + uses',
      explanation: 'System.SysUtils (базовые утилиты и тип Currency), Winapi.Windows (типы вроде HResult), FireDAC.Comp.Client (TFDConnection и TFDQuery). Модуль Data.DB подключается ниже, в implementation, — он нужен только внутри для FieldByName при чтении списков.'
    },
    {
      startLine: 20, endLine: 33,
      title: 'TRepository — базовый класс с IInterface',
      explanation: 'Родитель всех репозиториев. Хранит FConnection (соединение с БД) и реализует IInterface — «спускаемый крючок» Delphi-интерфейсов: QueryInterface, _AddRef, _Release. Здесь они заглушки (_AddRef/_Release возвращают -1), потому что временем жизни объектов управляет человек через Free в .dpr, а не счётчик ссылок. Без этого объект мог бы уничтожиться сам в момент, когда сервис отпускает интерфейсную ссылку.'
    },
    {
      startLine: 35, endLine: 40,
      title: 'TPupilComboEntry — запись для combo',
      explanation: 'record — составной тип-«коробочка» без методов: Id ученика и DisplayName (что показать в списке). TPupilComboArray = array of ... — динамический массив таких коробочек. Эти записи заполняют выпадающие списки на формах платежей и расходов.'
    },
    {
      startLine: 42, endLine: 49,
      title: 'IPupilRepository — контракт репозитория учеников',
      explanation: 'interface — это чистый «контракт»: список методов без кода. GUID в квадратных скобках нужен механизму QueryInterface. Сервисы зависят от контракта, а не от конкретного класса — поэтому в тестах вместо базы можно подставить мок с тем же контрактом. Это и есть слабая связанность слоёв.'
    },
    {
      startLine: 51, endLine: 57,
      title: 'IPaymentRepository',
      explanation: 'Контракт поступлений. Обратите внимание на Total — сумма всех поступлений для баланса. И на то, что Add принимает APupilId и AChildrenName вместе: схема таблицы денормализована, имя хранится прямо в строке платежа рядом с id ученика.'
    },
    {
      startLine: 59, endLine: 65,
      title: 'IExpenseRepository',
      explanation: 'Контракт расходов. У Update два разных id: AId (какой расход менять) и APupilId (кто покупал) — у расхода есть собственный ключ, в отличие от платежей. Total тоже нужен балансу.'
    },
    {
      startLine: 67, endLine: 73,
      title: 'TClosePeriodResult — отчёт об архивации',
      explanation: 'Ещё одна запись-«коробочка»: сколько платежей обнулено, сколько расходов ушло в архив и какое сальдо записано. Сервис и форма используют её дважды: сначала чтобы показать пользователю точные цифры ДО операции, потом чтобы отчитаться о результате. Комментарии у полей объясняют физику: старые суммы попадают в архивный триггер, а сальдо пишется со знаком минус.'
    },
    {
      startLine: 75, endLine: 82,
      title: 'IArchiveRepository — контракт архивации',
      explanation: 'Два метода — классический безопасный паттерн. Preview только считает («что будет, если?»), ClosePeriod делает. Пользователь сначала видит цифры из Preview в диалоге подтверждения, и лишь после «ОК» выполняется настоящая операция. Слово «атомарно» в комментарии значит: все изменения пройдут вместе или не пройдут вовсе — за это отвечает транзакция в реализации.'
    },
    {
      startLine: 84, endLine: 110,
      title: 'Классы-реализации трёх репозиториев',
      explanation: 'Конкретные исполнители контрактов. Запись class(TRepository, IPupilRepository) читается так: родитель — TRepository (даёт FConnection), плюс обещание выполнить контракт IPupilRepository. Сами методы — простые параметризованные SQL-команды, смотрим их в implementation.'
    },
    {
      startLine: 112, endLine: 122,
      title: 'TArchiveRepository — четвёртый репозиторий',
      explanation: 'Объявление репозитория архивации. В private спрятаны четыре вспомогательные функции-счётчика (сколько сдано, потрачено, сколько ненулевых платежей и расходов) — наружу торчат только Preview и ClosePeriod. Правило «private для внутренностей, public для контракта» делает класс понятным с первого взгляда.'
    },
    {
      startLine: 129, endLine: 133,
      title: 'TRepository.Create',
      explanation: 'Конструктор принимает соединение и сохраняет его в поле. inherited Create вызывает конструктор родителя (TObject). Наследники не переопределяют конструктор — всем нужно одно и то же.'
    },
    {
      startLine: 135, endLine: 151,
      title: 'Заглушки IInterface',
      explanation: 'QueryInterface через GetInterface ищет у объекта нужный интерфейс по GUID (S_OK — нашёл, E_NOINTERFACE — нет). _AddRef/_Release возвращают -1 — сигнал «не считай ссылки, объектом владеют вручную». Возвращать нужно именно -1: ноль означал бы «ссылок нет», и Delphi мог бы уничтожить объект при первом же выходе интерфейсной переменной из области видимости.'
    },
    {
      startLine: 155, endLine: 163,
      title: 'TPupilRepository.Add',
      explanation: 'INSERT с именованными параметрами (:children_name и т.д.) — значения передаются отдельным массивом, FireDAC сопоставляет их по порядку появления в SQL. Параметризация защищает от SQL-инъекций: даже если в имени ученика окажется апостроф или кусок SQL, он останется просто текстом.'
    },
    {
      startLine: 165, endLine: 171,
      title: 'TPupilRepository.Delete',
      explanation: 'Удаление по первичному ключу id. Триггеров на удаление учеников в схеме нет, поэтому архив этот запрос не наполняет.'
    },
    {
      startLine: 173, endLine: 182,
      title: 'TPupilRepository.Update',
      explanation: 'UPDATE всех полей по id. Порядок значений в массиве должен совпадать с порядком параметров в SQL: children_name, parent_name, phone, after_lesson, id. Перепутаете порядок — данные молча встанут не в те колонки, поэтому здесь важно быть внимательным.'
    },
    {
      startLine: 184, endLine: 210,
      title: 'TPupilRepository.ListForCombo',
      explanation: 'Единственный метод с чтением строк (остальные только пишут или возвращают одно число). Создаётся временный TFDQuery, SELECT открывается, цикл while not Eof собирает массив записей. try/finally гарантирует Free даже при ошибке. Если имя пустое — подставляется заглушка «Ученик <id>», чтобы в выпадающем списке не было пустых строк.'
    },
    {
      startLine: 214, endLine: 222,
      title: 'TPaymentRepository.Add',
      explanation: 'INSERT в money_from_parents. Ключевой момент схемы: id — это id ученика (APupilId), а не отдельный номер платежа. Один ученик = одна строка о деньгах. ASum имеет тип Currency — денежный тип с двумя знаками после запятой, копейки не теряются.'
    },
    {
      startLine: 224, endLine: 240,
      title: 'TPaymentRepository Delete/Update',
      explanation: 'Delete и Update работают по id, который здесь совпадает с id ученика. Update меняет имя и сумму, но не может сменить самого ученика — для этого пришлось бы менять первичный ключ строки.'
    },
    {
      startLine: 242, endLine: 247,
      title: 'TPaymentRepository.Total',
      explanation: 'ExecSQLScalar выполняет запрос и возвращает одно-единственное значение (первый столбец первой строки). COALESCE(SUM(...), 0): если таблица пуста, SUM вернёт NULL, а COALESCE подменит его нулём — иначе Delphi получил бы ошибку приведения типа.'
    },
    {
      startLine: 251, endLine: 284,
      title: 'TExpenseRepository: Add/Delete/Update/Total',
      explanation: 'Работа с таблицей outlay устроена так же, как у платежей, но у расхода есть собственный id (колонка IDENTITY — база нумерует сама), а customer хранит id покупателя отдельно. Total суммирует расходы для баланса: Balance = Total(платежи) − Total(расходы).'
    },
    {
      startLine: 286, endLine: 311,
      title: 'Четыре счётчика для архивации',
      explanation: 'Вспомогательные функции TArchiveRepository: сколько сдано (SubmittedTotal), сколько потрачено (SpentTotal), сколько ненулевых платежей и сколько расходов. Каждая — один ExecSQLScalar. Ненулевые важны: обнулять уже пустые строки бессмысленно, они и так не участвуют в балансе. Мелкие частные функции вместо одного гигантского запроса — способ сделать код читаемым.'
    },
    {
      startLine: 313, endLine: 320,
      title: 'Preview — снимок «что произойдёт»',
      explanation: 'Preview ничего не меняет в базе: только заполняет TClosePeriodResult счётчиками и сальдо (SpentTotal − SubmittedTotal). Знак объяснён в комментарии: если денег осталось больше, чем потрачено, сальдо уйдёт в расходы с минусом. Этот метод вызывается перед показом диалога подтверждения.'
    },
    {
      startLine: 322, endLine: 354,
      title: 'ClosePeriod — главная операция в транзакции',
      explanation: 'StartTransaction открывает транзакцию — «всё или ничего»: либо выполнятся все три команды, либо база вернётся к исходному состоянию через Rollback. Внутри: Preview пересчитывает цифры уже внутри транзакции; UPDATE обнуляет ненулевые платежи (строки остаются, старые суммы улавливает триггер и пишет в архив); DELETE сносит расходы (триггер копирует их в outlay_arc); INSERT добавляет строку сальдо c customer = 0 — «без ученика». Commit фиксирует изменения. except..Rollback..raise — откатить и пробросить ошибку выше, чтобы UI показал её пользователю.'
    }
  ]
};
