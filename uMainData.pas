unit uMainData;

{
  Слой данных для главной формы.
  Хранит запросы, источники данных и настройки колонок гридов
  по схеме дампа (parents_and_children, money_from_parents, outlay, архивы).

  Имена полей БД инкапсулированы здесь: форма обращается к данным через
  методы-обёртки (CurrentPupil* и т.п.), не зная схемы напрямую.
}

interface

uses
  Data.DB,
  FireDAC.DApt,
  FireDAC.Comp.Client;

type
  TMainData = class
  private
    FConnection: TFDConnection;

    FPupilsQuery: TFDQuery;
    FPaymentsQuery: TFDQuery;
    FExpensesQuery: TFDQuery;
    FPaymentsArcQuery: TFDQuery;
    FExpensesArcQuery: TFDQuery;

    FPupilsSource: TDataSource;
    FPaymentsSource: TDataSource;
    FExpensesSource: TDataSource;
    FPaymentsArcSource: TDataSource;
    FExpensesArcSource: TDataSource;

    function CreateQuery(const ASql: string): TFDQuery;
    procedure ConfigureFields;
  public
    constructor Create(AConnection: TFDConnection);
    destructor Destroy; override;

    procedure RefreshData;

    property PupilsQuery: TFDQuery read FPupilsQuery;
    property PaymentsQuery: TFDQuery read FPaymentsQuery;
    property ExpensesQuery: TFDQuery read FExpensesQuery;
    property PaymentsArcQuery: TFDQuery read FPaymentsArcQuery;
    property ExpensesArcQuery: TFDQuery read FExpensesArcQuery;

    property PupilsSource: TDataSource read FPupilsSource;
    property PaymentsSource: TDataSource read FPaymentsSource;
    property ExpensesSource: TDataSource read FExpensesSource;
    property PaymentsArcSource: TDataSource read FPaymentsArcSource;
    property ExpensesArcSource: TDataSource read FExpensesArcSource;

    // Текущая запись грида учеников.
    function PupilsEmpty: Boolean;
    function CurrentPupilId: Integer;
    function CurrentPupilName: string;
    function CurrentPupilParentName: string;
    function CurrentPupilPhone: string;
    function CurrentPupilAfterLesson: string;
    function PupilNameById(APupilId: Integer): string;

    // Текущая запись грида поступлений.
    function PaymentsEmpty: Boolean;
    function CurrentPaymentId: Integer;
    function CurrentPaymentPupilId: Integer;
    function CurrentPaymentPupilName: string;
    function CurrentPaymentSum: string;

    // Текущая запись грида расходов.
    function ExpensesEmpty: Boolean;
    function CurrentExpenseId: Integer;
    function CurrentExpenseCustomerId: Integer;
    function CurrentExpenseDate: string;
    function CurrentExpenseItem: string;
    function CurrentExpenseSum: string;
  end;

implementation

uses
  uUiHelpers;

const
  LabelChildren = 'ФИО ученика';
  LabelParent = 'Родитель';
  LabelPhone = 'Телефон';
  LabelAfterLesson = 'После уроков';
  LabelSum = 'Сумма';
  LabelDate = 'Дата';
  LabelItem = 'На что потрачено';
  LabelCustomer = 'Кто платил';
  LabelArchivedAt = 'Дата архива';

constructor TMainData.Create(AConnection: TFDConnection);
begin
  inherited Create;
  FConnection := AConnection;

  FPupilsQuery := CreateQuery(
    'SELECT id, children_name, parent_name, phone, after_lesson ' +
    'FROM parents_and_children ORDER BY children_name'
  );
  FPaymentsQuery := CreateQuery(
    'SELECT id, children_name, summ_to_first_november ' +
    'FROM money_from_parents ORDER BY children_name'
  );
  FExpensesQuery := CreateQuery(
    'SELECT o.id, o.date_purchaise, o.item_name, o.customer, ' +
    'p.children_name, o.summ ' +
    'FROM outlay o LEFT JOIN parents_and_children p ON p.id = o.customer ' +
    'ORDER BY o.date_purchaise DESC, o.id DESC'
  );
  FPaymentsArcQuery := CreateQuery(
    'SELECT id, date_ins, children_name, summ_to_first_november ' +
    'FROM money_from_parents_arc ' +
    'ORDER BY date_ins DESC, id DESC'
  );
  FExpensesArcQuery := CreateQuery(
    'SELECT id, date_purchaise, item_name, customer, summ ' +
    'FROM outlay_arc ' +
    'ORDER BY id DESC'
  );

  FPupilsSource := TDataSource.Create(nil);
  FPupilsSource.DataSet := FPupilsQuery;

  FPaymentsSource := TDataSource.Create(nil);
  FPaymentsSource.DataSet := FPaymentsQuery;

  FExpensesSource := TDataSource.Create(nil);
  FExpensesSource.DataSet := FExpensesQuery;

  FPaymentsArcSource := TDataSource.Create(nil);
  FPaymentsArcSource.DataSet := FPaymentsArcQuery;

  FExpensesArcSource := TDataSource.Create(nil);
  FExpensesArcSource.DataSet := FExpensesArcQuery;
end;

destructor TMainData.Destroy;
begin
  DisconnectQuery(FPupilsQuery);
  DisconnectQuery(FPaymentsQuery);
  DisconnectQuery(FExpensesQuery);
  DisconnectQuery(FPaymentsArcQuery);
  DisconnectQuery(FExpensesArcQuery);

  FExpensesArcSource.Free;
  FPaymentsArcSource.Free;
  FExpensesSource.Free;
  FPaymentsSource.Free;
  FPupilsSource.Free;

  FExpensesArcQuery.Free;
  FPaymentsArcQuery.Free;
  FExpensesQuery.Free;
  FPaymentsQuery.Free;
  FPupilsQuery.Free;

  inherited Destroy;
end;

function TMainData.CreateQuery(const ASql: string): TFDQuery;
begin
  Result := TFDQuery.Create(nil);
  Result.Connection := FConnection;
  Result.SQL.Text := ASql;
end;

procedure TMainData.ConfigureFields;
begin
  SetFieldLayout(FPupilsQuery, 'id', 'ID', 5);
  SetFieldLayout(FPupilsQuery, 'children_name', LabelChildren, 28);
  SetFieldLayout(FPupilsQuery, 'parent_name', LabelParent, 20);
  SetFieldLayout(FPupilsQuery, 'phone', LabelPhone, 16);
  SetFieldLayout(FPupilsQuery, 'after_lesson', LabelAfterLesson, 14);

  SetFieldLayout(FPaymentsQuery, 'id', 'ID', 5);
  SetFieldLayout(FPaymentsQuery, 'children_name', LabelChildren, 40);
  SetFieldLayout(FPaymentsQuery, 'summ_to_first_november', LabelSum, 12);

  SetFieldLayout(FExpensesQuery, 'id', 'ID', 5);
  SetFieldLayout(FExpensesQuery, 'date_purchaise', LabelDate, 12);
  SetFieldLayout(FExpensesQuery, 'item_name', LabelItem, 34);
  SetFieldLayout(FExpensesQuery, 'customer', LabelCustomer, 10);
  SetFieldLayout(FExpensesQuery, 'children_name', LabelChildren, 24);
  SetFieldLayout(FExpensesQuery, 'summ', LabelSum, 10);

  SetFieldLayout(FPaymentsArcQuery, 'id', 'ID', 5);
  SetFieldLayout(FPaymentsArcQuery, 'date_ins', LabelArchivedAt, 20);
  SetFieldLayout(FPaymentsArcQuery, 'children_name', LabelChildren, 34);
  SetFieldLayout(FPaymentsArcQuery, 'summ_to_first_november', LabelSum, 12);

  SetFieldLayout(FExpensesArcQuery, 'id', 'ID', 5);
  SetFieldLayout(FExpensesArcQuery, 'date_purchaise', LabelDate, 12);
  SetFieldLayout(FExpensesArcQuery, 'item_name', LabelItem, 34);
  SetFieldLayout(FExpensesArcQuery, 'customer', LabelCustomer, 10);
  SetFieldLayout(FExpensesArcQuery, 'summ', LabelSum, 10);
end;

procedure TMainData.RefreshData;
begin
  FPupilsQuery.Close;
  FPaymentsQuery.Close;
  FExpensesQuery.Close;
  FPaymentsArcQuery.Close;
  FExpensesArcQuery.Close;

  FPupilsQuery.Open;
  FPaymentsQuery.Open;
  FExpensesQuery.Open;
  FPaymentsArcQuery.Open;
  FExpensesArcQuery.Open;

  ConfigureFields;
end;

{ Обёртки текущих записей — скрывают имена полей БД от формы. }

function TMainData.PupilsEmpty: Boolean;
begin
  Result := FPupilsQuery.IsEmpty;
end;

function TMainData.CurrentPupilId: Integer;
begin
  Result := FPupilsQuery.FieldByName('id').AsInteger;
end;

function TMainData.CurrentPupilName: string;
begin
  Result := FPupilsQuery.FieldByName('children_name').AsString;
end;

function TMainData.CurrentPupilParentName: string;
begin
  Result := FPupilsQuery.FieldByName('parent_name').AsString;
end;

function TMainData.CurrentPupilPhone: string;
begin
  Result := FPupilsQuery.FieldByName('phone').AsString;
end;

function TMainData.CurrentPupilAfterLesson: string;
begin
  Result := FPupilsQuery.FieldByName('after_lesson').AsString;
end;

function TMainData.PupilNameById(APupilId: Integer): string;
begin
  Result := '';
  if APupilId <= 0 then
    Exit;
  if FPupilsQuery.Locate('id', APupilId, []) then
    Result := FPupilsQuery.FieldByName('children_name').AsString;
end;

function TMainData.PaymentsEmpty: Boolean;
begin
  Result := FPaymentsQuery.IsEmpty;
end;

function TMainData.CurrentPaymentId: Integer;
begin
  Result := FPaymentsQuery.FieldByName('id').AsInteger;
end;

function TMainData.CurrentPaymentPupilId: Integer;
begin
  // В схеме дампа money_from_parents.id — это id ученика (не отдельный
  // PK платежа), поэтому выбор ученика в combo делается по этому же id.
  Result := FPaymentsQuery.FieldByName('id').AsInteger;
end;

function TMainData.CurrentPaymentPupilName: string;
begin
  Result := FPaymentsQuery.FieldByName('children_name').AsString;
end;

function TMainData.CurrentPaymentSum: string;
begin
  Result := FPaymentsQuery.FieldByName('summ_to_first_november').AsString;
end;

function TMainData.ExpensesEmpty: Boolean;
begin
  Result := FExpensesQuery.IsEmpty;
end;

function TMainData.CurrentExpenseId: Integer;
begin
  Result := FExpensesQuery.FieldByName('id').AsInteger;
end;

function TMainData.CurrentExpenseCustomerId: Integer;
begin
  Result := FExpensesQuery.FieldByName('customer').AsInteger;
end;

function TMainData.CurrentExpenseDate: string;
begin
  Result := FExpensesQuery.FieldByName('date_purchaise').AsString;
end;

function TMainData.CurrentExpenseItem: string;
begin
  Result := FExpensesQuery.FieldByName('item_name').AsString;
end;

function TMainData.CurrentExpenseSum: string;
begin
  Result := FExpensesQuery.FieldByName('summ').AsString;
end;

end.
