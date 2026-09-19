unit uServices;

{
  Сервисный слой: бизнес-логика и валидация.
  Сервисы обёртывают репозитории и гарантируют корректность входных
  данных перед записью в БД. Формы и точка входа работают только с
  сервисами, а не с репозиториями напрямую.
}

interface

uses
  System.SysUtils,
  uRepositories;

type
  // Ошибка валидации бизнес-правил. Сообщение пригодно для показа
  // пользователю в UI (формы ловят его и показывают через ShowMessage).
  EValidationException = class(Exception);

const
  // Назначение итоговой строки сальдо, остающейся в outlay после архивации.
  CarryOverItemName = 'Сальдо на конец периода';

type
  // Сервис учеников: валидация + делегирование IPupilRepository.
  TPupilService = class
  private
    FRepository: IPupilRepository;
  public
    constructor Create(ARepository: IPupilRepository);
    procedure Add(const AChildrenName, AParentName, APhone, AAfterLesson: string);
    procedure Delete(AId: Integer);
    procedure Update(AId: Integer; const AChildrenName, AParentName,
                      APhone, AAfterLesson: string);
    function ListForCombo: TPupilComboArray;
  end;

  // Сервис поступлений: валидация суммы/ученика + делегирование IPaymentRepository.
  TPaymentService = class
  private
    FRepository: IPaymentRepository;
  public
    constructor Create(ARepository: IPaymentRepository);
    procedure Add(APupilId: Integer; const AChildrenName: string; ASum: Integer);
    procedure Delete(AId: Integer);
    procedure Update(AId: Integer; const AChildrenName: string; ASum: Integer);
    function Total: Currency;
  end;

  // Сервис расходов: валидация даты/назначения/суммы/ученика + делегирование IExpenseRepository.
  TExpenseService = class
  private
    FRepository: IExpenseRepository;
  public
    constructor Create(ARepository: IExpenseRepository);
    procedure Add(APupilId: Integer; const ADate, AItemName: string; ASum: Currency);
    procedure Delete(AId: Integer);
    procedure Update(AId, APupilId: Integer; const ADate, AItemName: string; ASum: Currency);
    function Total: Currency;
  end;

  // Считает баланс как разность поступлений и расходов.
  TBalanceService = class
  private
    FPayments: IPaymentRepository;
    FExpenses: IExpenseRepository;
  public
    constructor Create(APayments: IPaymentRepository; AExpenses: IExpenseRepository);
    function Balance: Currency;
  end;

  // Сервис архивации: закрывает период — текущие платежи и расходы
  // переносятся в архивные таблицы, в outlay остаётся строка сальдо.
  TArchiveService = class
  private
    FRepository: IArchiveRepository;
  public
    constructor Create(ARepository: IArchiveRepository);
    function Preview: TClosePeriodResult;
    function ClosePeriod: TClosePeriodResult;
  end;

implementation

{ TPupilService }

constructor TPupilService.Create(ARepository: IPupilRepository);
begin
  inherited Create;
  FRepository := ARepository;
end;

procedure TPupilService.Add(const AChildrenName, AParentName, APhone,
  AAfterLesson: string);
begin
  if Trim(AChildrenName) = '' then
    raise EValidationException.Create('ФИО ученика обязательно');
  FRepository.Add(AChildrenName, AParentName, APhone, AAfterLesson);
end;

procedure TPupilService.Delete(AId: Integer);
begin
  if AId <= 0 then
    raise EValidationException.Create('Выберите ученика');
  FRepository.Delete(AId);
end;

procedure TPupilService.Update(AId: Integer; const AChildrenName, AParentName,
  APhone, AAfterLesson: string);
begin
  if AId <= 0 then
    raise EValidationException.Create('Выберите ученика');
  if Trim(AChildrenName) = '' then
    raise EValidationException.Create('ФИО ученика обязательно');
  FRepository.Update(AId, AChildrenName, AParentName, APhone, AAfterLesson);
end;

function TPupilService.ListForCombo: TPupilComboArray;
begin
  Result := FRepository.ListForCombo;
end;

{ TPaymentService }

constructor TPaymentService.Create(ARepository: IPaymentRepository);
begin
  inherited Create;
  FRepository := ARepository;
end;

procedure TPaymentService.Add(APupilId: Integer; const AChildrenName: string;
  ASum: Integer);
begin
  if APupilId <= 0 then
    raise EValidationException.Create('Выберите ученика');
  if ASum <= 0 then
    raise EValidationException.Create('Сумма должна быть больше нуля');
  FRepository.Add(APupilId, AChildrenName, ASum);
end;

procedure TPaymentService.Delete(AId: Integer);
begin
  if AId <= 0 then
    raise EValidationException.Create('Выберите платёж');
  FRepository.Delete(AId);
end;

procedure TPaymentService.Update(AId: Integer; const AChildrenName: string;
  ASum: Integer);
begin
  if AId <= 0 then
    raise EValidationException.Create('Выберите платёж');
  if ASum <= 0 then
    raise EValidationException.Create('Сумма должна быть больше нуля');
  FRepository.Update(AId, AChildrenName, ASum);
end;

function TPaymentService.Total: Currency;
begin
  Result := FRepository.Total;
end;

{ TExpenseService }

constructor TExpenseService.Create(ARepository: IExpenseRepository);
begin
  inherited Create;
  FRepository := ARepository;
end;

procedure TExpenseService.Add(APupilId: Integer; const ADate, AItemName: string;
  ASum: Currency);
begin
  if APupilId <= 0 then
    raise EValidationException.Create('Выберите ученика');
  if Trim(ADate) = '' then
    raise EValidationException.Create('Дата обязательна для заполнения');
  if Trim(AItemName) = '' then
    raise EValidationException.Create('Назначение обязательно для заполнения');
  if ASum <= 0 then
    raise EValidationException.Create('Сумма должна быть больше нуля');
  FRepository.Add(APupilId, ADate, AItemName, ASum);
end;

procedure TExpenseService.Delete(AId: Integer);
begin
  if AId <= 0 then
    raise EValidationException.Create('Выберите расход');
  FRepository.Delete(AId);
end;

procedure TExpenseService.Update(AId, APupilId: Integer; const ADate,
  AItemName: string; ASum: Currency);
begin
  if AId <= 0 then
    raise EValidationException.Create('Выберите расход');
  if APupilId <= 0 then
    raise EValidationException.Create('Выберите ученика');
  if Trim(ADate) = '' then
    raise EValidationException.Create('Дата обязательна для заполнения');
  if Trim(AItemName) = '' then
    raise EValidationException.Create('Назначение обязательно для заполнения');
  if ASum <= 0 then
    raise EValidationException.Create('Сумма должна быть больше нуля');
  FRepository.Update(AId, APupilId, ADate, AItemName, ASum);
end;

function TExpenseService.Total: Currency;
begin
  Result := FRepository.Total;
end;

{ TBalanceService }

constructor TBalanceService.Create(APayments: IPaymentRepository;
  AExpenses: IExpenseRepository);
begin
  inherited Create;
  FPayments := APayments;
  FExpenses := AExpenses;
end;

function TBalanceService.Balance: Currency;
begin
  Result := FPayments.Total - FExpenses.Total;
end;

{ TArchiveService }

constructor TArchiveService.Create(ARepository: IArchiveRepository);
begin
  inherited Create;
  FRepository := ARepository;
end;

function TArchiveService.Preview: TClosePeriodResult;
begin
  Result := FRepository.Preview;
end;

function TArchiveService.ClosePeriod: TClosePeriodResult;
begin
  Result := FRepository.ClosePeriod(CarryOverItemName);
  // Если обнулять и архивировать было нечего, репозиторий ничего не менял.
  if (Result.ResetPayments = 0) and (Result.ArchivedExpenses = 0) then
    raise EValidationException.Create('Нет данных для архивации');
end;

end.
